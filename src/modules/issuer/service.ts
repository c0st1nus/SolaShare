import { PublicKey } from "@solana/web3.js";
import { and, count, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db";
import {
  assetDocuments,
  assetSaleTerms,
  assetStatusHistory,
  assets,
  auditLogs,
  revenueEpochs,
  shareMints,
  users,
  verificationDecisions,
  verificationRequests,
  walletBindings,
} from "../../db/schema";
import { ApiError } from "../../lib/api-error";
import {
  deriveAssetPDA,
  deriveShareMintPDA,
  deriveVaultPDA,
  getUsdcMintAddress,
  prepareAssetSetupTransaction,
  prepareRevenuePostTransaction,
  connection as solanaConnection,
  verifyAssetSetupTransaction,
} from "../../lib/solana";
import { resolveTokenProgramForMint, tokenProgramLabel } from "../../lib/solana/token-program";
import { toMoneyString, toNumber } from "../shared/utils";
import type {
  assetOnchainConfirmResponseSchema,
  assetOnchainSetupBodySchema,
  assetOnchainSetupConfirmBodySchema,
  assetOnchainSetupResponseSchema,
  issuerAssetBodySchema,
  issuerAssetDetailSchema,
  issuerAssetDocumentBodySchema,
  issuerAssetDocumentResponseSchema,
  issuerAssetListQuerySchema,
  issuerAssetListResponseSchema,
  issuerAssetResponseSchema,
  issuerAssetReviewFeedbackSchema,
  issuerAssetUpdateBodySchema,
  issuerSubmitResponseSchema,
  revenueEpochBodySchema,
  revenueEpochResponseSchema,
  revenuePostResponseSchema,
  saleTermsBodySchema,
  saleTermsResponseSchema,
} from "./contracts";

type IssuerAssetBody = z.infer<typeof issuerAssetBodySchema>;
type IssuerAssetResponse = z.infer<typeof issuerAssetResponseSchema>;
type IssuerAssetUpdateBody = z.infer<typeof issuerAssetUpdateBodySchema>;
type IssuerAssetListQuery = z.infer<typeof issuerAssetListQuerySchema>;
type IssuerAssetListResponse = z.infer<typeof issuerAssetListResponseSchema>;
type IssuerAssetDetailResponse = z.infer<typeof issuerAssetDetailSchema>;
type IssuerAssetDocumentBody = z.infer<typeof issuerAssetDocumentBodySchema>;
type IssuerAssetDocumentResponse = z.infer<typeof issuerAssetDocumentResponseSchema>;
type IssuerAssetReviewFeedback = z.infer<typeof issuerAssetReviewFeedbackSchema>;
type SaleTermsBody = z.infer<typeof saleTermsBodySchema>;
type SaleTermsResponse = z.infer<typeof saleTermsResponseSchema>;
type IssuerSubmitResponse = z.infer<typeof issuerSubmitResponseSchema>;
type RevenueEpochBody = z.infer<typeof revenueEpochBodySchema>;
type RevenueEpochResponse = z.infer<typeof revenueEpochResponseSchema>;
type RevenuePostResponse = z.infer<typeof revenuePostResponseSchema>;
type AssetOnchainSetupBody = z.infer<typeof assetOnchainSetupBodySchema>;
type AssetOnchainSetupConfirmBody = z.infer<typeof assetOnchainSetupConfirmBodySchema>;
type AssetOnchainSetupResponse = z.infer<typeof assetOnchainSetupResponseSchema>;
type AssetOnchainConfirmResponse = z.infer<typeof assetOnchainConfirmResponseSchema>;

type IssuerActor = {
  id: string;
};

const SHARES_PER_KW = 100;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const getOwnedAsset = async (assetId: string, issuerUserId: string) => {
  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.issuerUserId, issuerUserId)))
    .limit(1);

  if (!asset) {
    throw new ApiError(404, "ASSET_NOT_FOUND", "Asset not found");
  }

  return asset;
};

const assertEditableDraft = async (assetId: string, issuerUserId: string) => {
  const asset = await getOwnedAsset(assetId, issuerUserId);

  if (asset.status !== "draft") {
    throw new ApiError(
      409,
      "INVALID_ASSET_STATE",
      "Asset can only be modified while in draft status",
    );
  }

  return asset;
};

const deriveTotalShares = (capacityKw: number) =>
  Math.max(100, Math.round(capacityKw * SHARES_PER_KW));

const loadLatestReviewFeedback = async (
  assetId: string,
): Promise<IssuerAssetReviewFeedback | null> => {
  const [row] = await db
    .select({
      outcome: verificationDecisions.outcome,
      reason: verificationDecisions.reason,
      metadataJson: verificationDecisions.metadataJson,
      createdAt: verificationDecisions.createdAt,
    })
    .from(verificationDecisions)
    .innerJoin(
      verificationRequests,
      eq(verificationRequests.id, verificationDecisions.verificationRequestId),
    )
    .where(eq(verificationRequests.assetId, assetId))
    .orderBy(desc(verificationDecisions.createdAt))
    .limit(1);

  if (!row || row.outcome === "approved") {
    return null;
  }

  const metadata = (row.metadataJson ?? {}) as {
    issues?: IssuerAssetReviewFeedback["issues"];
  };

  return {
    outcome: row.outcome,
    reason: row.reason ?? null,
    created_at: row.createdAt.toISOString(),
    issues: metadata.issues ?? [],
  };
};

export class IssuerService {
  async prepareWithdrawal(
    issuer: { id: string },
    assetId: string,
    params: { amount_usdc: number },
  ) {
    const { prepareWithdrawTransaction } = await import("../../lib/solana/transactions");
    const asset = await getOwnedAsset(assetId, issuer.id);

    if (asset.status !== "active_sale" && asset.status !== "funded") {
      throw new ApiError(400, "INVALID_STATUS", "Asset must be in active_sale or funded status");
    }

    const [userWithWallet] = await db
      .select({
        user: users,
        walletBinding: walletBindings,
      })
      .from(users)
      .leftJoin(
        walletBindings,
        and(eq(walletBindings.userId, users.id), eq(walletBindings.status, "active")),
      )
      .where(eq(users.id, issuer.id))
      .limit(1);

    const activeWallet = userWithWallet?.walletBinding;

    if (!activeWallet) {
      throw new ApiError(400, "WALLET_NOT_BOUND", "Issuer must have an active wallet binding");
    }

    return prepareWithdrawTransaction({
      operationId: crypto.randomUUID(),
      assetId,
      issuerWalletAddress: activeWallet.walletAddress,
      amountUsdc: params.amount_usdc,
    });
  }

  async createAssetDraft(
    currentUser: IssuerActor,
    input: IssuerAssetBody,
  ): Promise<IssuerAssetResponse> {
    const assetId = crypto.randomUUID();
    const slugBase = slugify(input.title) || "asset";

    await db.transaction(async (tx) => {
      await tx.insert(assets).values({
        id: assetId,
        slug: `${slugBase}-${assetId.slice(0, 8)}`,
        title: input.title,
        shortDescription: input.short_description,
        fullDescription: input.full_description,
        energyType: input.energy_type,
        coverImageUrl: input.cover_image_url ?? null,
        issuerUserId: currentUser.id,
        locationCountry: input.location_country,
        locationRegion: input.location_region ?? null,
        locationCity: input.location_city ?? null,
        capacityKw: input.capacity_kw.toFixed(3),
      });

      await tx.insert(assetStatusHistory).values({
        assetId,
        oldStatus: null,
        newStatus: "draft",
        changedByUserId: currentUser.id,
        reason: "Asset draft created",
      });

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "asset",
        entityId: assetId,
        action: "asset.draft_created",
        payloadJson: {
          title: input.title,
          energy_type: input.energy_type,
        },
      });
    });

    return {
      asset_id: assetId,
      status: "draft",
    };
  }

  async updateAssetDraft(
    currentUser: IssuerActor,
    assetId: string,
    input: IssuerAssetUpdateBody,
  ): Promise<IssuerAssetResponse> {
    const asset = await assertEditableDraft(assetId, currentUser.id);
    const nextTitle = input.title ?? asset.title;

    await db.transaction(async (tx) => {
      await tx
        .update(assets)
        .set({
          ...(input.title
            ? {
                title: input.title,
                slug: `${slugify(nextTitle) || "asset"}-${assetId.slice(0, 8)}`,
              }
            : {}),
          ...(input.short_description ? { shortDescription: input.short_description } : {}),
          ...(input.full_description ? { fullDescription: input.full_description } : {}),
          ...(input.energy_type ? { energyType: input.energy_type } : {}),
          ...(input.cover_image_url !== undefined ? { coverImageUrl: input.cover_image_url } : {}),
          ...(input.location_country ? { locationCountry: input.location_country } : {}),
          ...(input.location_region !== undefined
            ? { locationRegion: input.location_region ?? null }
            : {}),
          ...(input.location_city !== undefined
            ? { locationCity: input.location_city ?? null }
            : {}),
          ...(input.capacity_kw !== undefined ? { capacityKw: input.capacity_kw.toFixed(3) } : {}),
          updatedAt: new Date(),
        })
        .where(eq(assets.id, assetId));

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "asset",
        entityId: assetId,
        action: "asset.draft_updated",
        payloadJson: input,
      });
    });

    return {
      asset_id: assetId,
      status: "draft",
    };
  }

  async listOwnedAssets(
    currentUser: IssuerActor,
    query: IssuerAssetListQuery,
  ): Promise<IssuerAssetListResponse> {
    const whereClause = and(
      eq(assets.issuerUserId, currentUser.id),
      query.status ? eq(assets.status, query.status) : undefined,
    );

    const [rows, totals] = await Promise.all([
      db
        .select({
          asset: assets,
          saleTerms: assetSaleTerms,
        })
        .from(assets)
        .leftJoin(assetSaleTerms, eq(assetSaleTerms.assetId, assets.id))
        .where(whereClause)
        .orderBy(desc(assets.updatedAt))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      db
        .select({ total: count(assets.id) })
        .from(assets)
        .where(whereClause),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.asset.id,
        slug: row.asset.slug,
        title: row.asset.title,
        energy_type: row.asset.energyType,
        capacity_kw: toNumber(row.asset.capacityKw),
        status: row.asset.status,
        location_city: row.asset.locationCity,
        location_country: row.asset.locationCountry,
        price_per_share_usdc: row.saleTerms ? toNumber(row.saleTerms.pricePerShareUsdc) : null,
        valuation_usdc: row.saleTerms ? toNumber(row.saleTerms.valuationUsdc) : null,
        total_shares: row.saleTerms?.totalShares ?? null,
        created_at: row.asset.createdAt.toISOString(),
        updated_at: row.asset.updatedAt.toISOString(),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totals[0]?.total ?? 0,
      },
    };
  }

  async getOwnedAssetDetails(
    currentUser: IssuerActor,
    assetId: string,
  ): Promise<IssuerAssetDetailResponse> {
    const [row, documents, reviewFeedback] = await Promise.all([
      db
        .select({
          asset: assets,
          issuer: users,
          saleTerms: assetSaleTerms,
        })
        .from(assets)
        .innerJoin(users, eq(users.id, assets.issuerUserId))
        .leftJoin(assetSaleTerms, eq(assetSaleTerms.assetId, assets.id))
        .where(and(eq(assets.id, assetId), eq(assets.issuerUserId, currentUser.id)))
        .limit(1),
      db
        .select()
        .from(assetDocuments)
        .where(eq(assetDocuments.assetId, assetId))
        .orderBy(desc(assetDocuments.createdAt)),
      loadLatestReviewFeedback(assetId),
    ]);

    const resolved = row[0];

    if (!resolved) {
      throw new ApiError(404, "ASSET_NOT_FOUND", "Asset not found");
    }

    return {
      id: resolved.asset.id,
      slug: resolved.asset.slug,
      title: resolved.asset.title,
      short_description: resolved.asset.shortDescription,
      full_description: resolved.asset.fullDescription,
      energy_type: resolved.asset.energyType,
      status: resolved.asset.status,
      location: {
        country: resolved.asset.locationCountry,
        region: resolved.asset.locationRegion,
        city: resolved.asset.locationCity,
      },
      capacity_kw: toNumber(resolved.asset.capacityKw),
      currency: resolved.asset.currency,
      expected_annual_yield_percent:
        resolved.asset.expectedAnnualYieldPercent === null
          ? null
          : toNumber(resolved.asset.expectedAnnualYieldPercent),
      cover_image_url: resolved.asset.coverImageUrl,
      issuer: {
        id: resolved.issuer.id,
        display_name: resolved.issuer.displayName ?? "Issuer",
      },
      revenue_summary: {
        total_epochs: 0,
        last_posted_epoch: null,
      },
      onchain_refs: {
        onchain_asset_pubkey: resolved.asset.onchainAssetPubkey,
        share_mint_pubkey: resolved.asset.shareMintPubkey,
        vault_pubkey: resolved.asset.vaultPubkey,
      },
      sale_terms: resolved.saleTerms
        ? {
            valuation_usdc: resolved.saleTerms.valuationUsdc,
            total_shares: resolved.saleTerms.totalShares,
            price_per_share_usdc: resolved.saleTerms.pricePerShareUsdc,
            minimum_buy_amount_usdc: resolved.saleTerms.minimumBuyAmountUsdc,
            target_raise_usdc: resolved.saleTerms.targetRaiseUsdc,
            sale_status: resolved.saleTerms.saleStatus,
          }
        : null,
      documents: documents.map((document) => ({
        id: document.id,
        type: document.type,
        title: document.title,
        storage_provider: document.storageProvider,
        storage_uri: document.storageUri,
        content_hash: document.contentHash,
        mime_type: document.mimeType,
        is_public: document.isPublic,
        created_at: document.createdAt.toISOString(),
      })),
      review_feedback: reviewFeedback,
    };
  }

  async registerAssetDocument(
    currentUser: IssuerActor,
    assetId: string,
    input: IssuerAssetDocumentBody,
  ): Promise<IssuerAssetDocumentResponse> {
    await assertEditableDraft(assetId, currentUser.id);

    const documentId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(assetDocuments).values({
        id: documentId,
        assetId,
        type: input.type,
        title: input.title,
        storageProvider: input.storage_provider,
        storageUri: input.storage_uri,
        contentHash: input.content_hash,
        mimeType: input.mime_type ?? null,
        uploadedByUserId: currentUser.id,
        isPublic: input.is_public,
      });

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "asset_document",
        entityId: documentId,
        action: "asset.document_registered",
        payloadJson: {
          asset_id: assetId,
          type: input.type,
        },
      });
    });

    return {
      document_id: documentId,
      success: true,
    };
  }

  async saveSaleTerms(
    currentUser: IssuerActor,
    assetId: string,
    input: SaleTermsBody,
  ): Promise<SaleTermsResponse> {
    const asset = await assertEditableDraft(assetId, currentUser.id);
    const [existingSaleTerms] = await db
      .select()
      .from(assetSaleTerms)
      .where(eq(assetSaleTerms.assetId, assetId))
      .limit(1);

    const capacityKw = toNumber(asset.capacityKw);
    const totalShares = input.total_shares ?? deriveTotalShares(capacityKw);
    const pricePerShareUsdc = input.price_per_share_usdc ?? input.valuation_usdc / totalShares;
    const targetRaiseUsdc = input.target_raise_usdc ?? input.valuation_usdc;

    await db.transaction(async (tx) => {
      if (existingSaleTerms) {
        await tx
          .update(assetSaleTerms)
          .set({
            valuationUsdc: input.valuation_usdc.toFixed(6),
            totalShares,
            pricePerShareUsdc: pricePerShareUsdc.toFixed(6),
            minimumBuyAmountUsdc: input.minimum_buy_amount_usdc.toFixed(6),
            targetRaiseUsdc: targetRaiseUsdc.toFixed(6),
            updatedAt: new Date(),
          })
          .where(eq(assetSaleTerms.assetId, assetId));
      } else {
        await tx.insert(assetSaleTerms).values({
          assetId,
          valuationUsdc: input.valuation_usdc.toFixed(6),
          totalShares,
          pricePerShareUsdc: pricePerShareUsdc.toFixed(6),
          minimumBuyAmountUsdc: input.minimum_buy_amount_usdc.toFixed(6),
          targetRaiseUsdc: targetRaiseUsdc.toFixed(6),
        });
      }

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "asset_sale_terms",
        entityId: assetId,
        action: "asset.sale_terms_saved",
        payloadJson: {
          ...input,
          total_shares: totalShares,
          price_per_share_usdc: pricePerShareUsdc,
          target_raise_usdc: targetRaiseUsdc,
          derived_from_capacity_kw: capacityKw,
        },
      });
    });

    return {
      success: true,
      asset_id: assetId,
    };
  }

  async submitAssetForWorkflow(
    currentUser: IssuerActor,
    assetId: string,
  ): Promise<IssuerSubmitResponse> {
    const asset = await getOwnedAsset(assetId, currentUser.id);
    const [saleTerms] = await db
      .select()
      .from(assetSaleTerms)
      .where(eq(assetSaleTerms.assetId, assetId))
      .limit(1);
    const [document] = await db
      .select({ id: assetDocuments.id })
      .from(assetDocuments)
      .where(eq(assetDocuments.assetId, assetId))
      .limit(1);

    if (!saleTerms) {
      throw new ApiError(409, "SALE_TERMS_REQUIRED", "Sale terms must be saved before submission");
    }

    if (!document) {
      throw new ApiError(409, "ASSET_DOCUMENT_REQUIRED", "At least one asset document is required");
    }

    const nextStatus =
      asset.status === "draft"
        ? "pending_review"
        : asset.status === "verified"
          ? "active_sale"
          : null;

    if (!nextStatus) {
      throw new ApiError(
        409,
        "INVALID_ASSET_STATE",
        "Asset can only be submitted from draft or verified state",
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(assets)
        .set({
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, assetId));

      await tx.insert(assetStatusHistory).values({
        assetId,
        oldStatus: asset.status,
        newStatus: nextStatus,
        changedByUserId: currentUser.id,
        reason:
          nextStatus === "pending_review"
            ? "Issuer submitted asset for review"
            : "Issuer activated verified asset sale",
      });

      if (nextStatus === "pending_review") {
        await tx.insert(verificationRequests).values({
          assetId,
          requestedByUserId: currentUser.id,
          requestType: "asset_review",
          payloadJson: {
            asset_id: assetId,
          },
        });
      }

      if (nextStatus === "active_sale") {
        await tx
          .update(assetSaleTerms)
          .set({
            saleStatus: "live",
            updatedAt: new Date(),
          })
          .where(eq(assetSaleTerms.assetId, assetId));
      }

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "asset",
        entityId: assetId,
        action:
          nextStatus === "pending_review" ? "asset.submitted_for_review" : "asset.sale_activated",
        payloadJson: {
          previous_status: asset.status,
          next_status: nextStatus,
        },
      });
    });

    return {
      success: true,
      message: "Asset submission accepted for the next workflow step",
      next_status: nextStatus,
    };
  }

  async prepareOnchainSetup(
    currentUser: IssuerActor,
    assetId: string,
    input: AssetOnchainSetupBody,
  ): Promise<AssetOnchainSetupResponse> {
    const [row] = await db
      .select({
        asset: assets,
        saleTerms: assetSaleTerms,
      })
      .from(assets)
      .innerJoin(assetSaleTerms, eq(assetSaleTerms.assetId, assets.id))
      .where(and(eq(assets.id, assetId), eq(assets.issuerUserId, currentUser.id)))
      .limit(1);

    if (!row) {
      throw new ApiError(404, "ASSET_NOT_FOUND", "Asset not found");
    }

    if (
      row.asset.status !== "verified" &&
      row.asset.status !== "active_sale" &&
      row.asset.status !== "funded"
    ) {
      throw new ApiError(
        409,
        "ASSET_NOT_READY_FOR_ONCHAIN_SETUP",
        "Only verified, active sale, or funded assets can be initialized on-chain",
      );
    }

    if (row.asset.onchainAssetPubkey && row.asset.shareMintPubkey && row.asset.vaultPubkey) {
      throw new ApiError(
        409,
        "ASSET_ALREADY_INITIALIZED_ONCHAIN",
        "Asset is already initialized on-chain",
      );
    }

    const metadataUri = input.metadata_uri ?? row.asset.assetMetadataUri;
    if (!metadataUri) {
      throw new ApiError(
        409,
        "ASSET_METADATA_URI_REQUIRED",
        "metadata_uri is required to initialize this asset on-chain",
      );
    }

    const [walletBinding] = await db
      .select()
      .from(walletBindings)
      .where(and(eq(walletBindings.userId, currentUser.id), eq(walletBindings.status, "active")))
      .limit(1);

    if (!walletBinding) {
      throw new ApiError(
        409,
        "ACTIVE_WALLET_REQUIRED",
        "An active wallet binding is required to initialize an asset on-chain",
      );
    }

    if (row.asset.assetMetadataUri !== metadataUri) {
      await db
        .update(assets)
        .set({
          assetMetadataUri: metadataUri,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, assetId));
    }

    const payload = await prepareAssetSetupTransaction({
      operationId: assetId,
      assetId,
      issuerWalletAddress: walletBinding.walletAddress,
      metadataUri,
      totalShares: row.saleTerms.totalShares,
      pricePerShareUsdc: toNumber(row.saleTerms.pricePerShareUsdc),
      activateSale: row.asset.status === "active_sale" || row.asset.status === "funded",
    });

    return payload as AssetOnchainSetupResponse;
  }

  async confirmOnchainSetup(
    currentUser: IssuerActor,
    assetId: string,
    input: AssetOnchainSetupConfirmBody,
  ): Promise<AssetOnchainConfirmResponse> {
    const [row] = await db
      .select({
        asset: assets,
      })
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.issuerUserId, currentUser.id)))
      .limit(1);

    if (!row) {
      throw new ApiError(404, "ASSET_NOT_FOUND", "Asset not found");
    }

    if (row.asset.onchainAssetPubkey && row.asset.shareMintPubkey && row.asset.vaultPubkey) {
      return {
        success: true,
        asset_id: assetId,
        onchain_asset_pubkey: row.asset.onchainAssetPubkey,
        share_mint_pubkey: row.asset.shareMintPubkey,
        vault_pubkey: row.asset.vaultPubkey,
      };
    }

    const [walletBinding] = await db
      .select()
      .from(walletBindings)
      .where(and(eq(walletBindings.userId, currentUser.id), eq(walletBindings.status, "active")))
      .limit(1);

    if (!walletBinding) {
      throw new ApiError(
        409,
        "ACTIVE_WALLET_REQUIRED",
        "An active wallet binding is required to confirm on-chain initialization",
      );
    }

    const verificationResult = await verifyAssetSetupTransaction(input.transaction_signature, {
      expectedSigner: walletBinding.walletAddress,
      assetId,
      activateSale: row.asset.status === "active_sale" || row.asset.status === "funded",
    });

    if (!verificationResult.valid) {
      throw new ApiError(
        400,
        `VERIFICATION_${verificationResult.error.code}`,
        verificationResult.error.message,
      );
    }

    const nextOnchainAssetPubkey =
      row.asset.onchainAssetPubkey ?? deriveAssetPDA({ assetId }).publicKey.toBase58();
    const nextShareMintPubkey =
      row.asset.shareMintPubkey ?? deriveShareMintPDA(assetId).publicKey.toBase58();
    const nextVaultPubkey =
      row.asset.vaultPubkey ?? deriveVaultPDA({ assetId }).publicKey.toBase58();
    const paymentMint = getUsdcMintAddress();
    const tokenProgram =
      paymentMint !== null
        ? tokenProgramLabel(
            await resolveTokenProgramForMint(
              new PublicKey(paymentMint),
              "Payment",
              solanaConnection,
            ),
          )
        : "spl-token";

    await db.transaction(async (tx) => {
      await tx
        .update(assets)
        .set({
          onchainAssetPubkey: nextOnchainAssetPubkey,
          shareMintPubkey: nextShareMintPubkey,
          vaultPubkey: nextVaultPubkey,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, assetId));

      const [existingShareMint] = await tx
        .select()
        .from(shareMints)
        .where(eq(shareMints.assetId, assetId))
        .limit(1);

      if (existingShareMint) {
        await tx
          .update(shareMints)
          .set({
            mintAddress: nextShareMintPubkey,
            vaultAddress: nextVaultPubkey,
            tokenProgram,
            decimals: 6,
            transactionSignature: input.transaction_signature,
            status: "minted",
            updatedAt: new Date(),
          })
          .where(eq(shareMints.assetId, assetId));
      } else {
        await tx.insert(shareMints).values({
          assetId,
          mintAddress: nextShareMintPubkey,
          vaultAddress: nextVaultPubkey,
          tokenProgram,
          decimals: 6,
          transactionSignature: input.transaction_signature,
          status: "minted",
        });
      }

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "asset",
        entityId: assetId,
        action: "asset.onchain_initialized",
        payloadJson: {
          transaction_signature: input.transaction_signature,
          onchain_asset_pubkey: nextOnchainAssetPubkey,
          share_mint_pubkey: nextShareMintPubkey,
          vault_pubkey: nextVaultPubkey,
          verification_slot: verificationResult.slot,
          verification_block_time: verificationResult.blockTime,
        },
      });
    });

    return {
      success: true,
      asset_id: assetId,
      onchain_asset_pubkey: nextOnchainAssetPubkey,
      share_mint_pubkey: nextShareMintPubkey,
      vault_pubkey: nextVaultPubkey,
    };
  }

  async createRevenueEpoch(
    currentUser: IssuerActor,
    assetId: string,
    input: RevenueEpochBody,
  ): Promise<RevenueEpochResponse> {
    const asset = await getOwnedAsset(assetId, currentUser.id);

    if (asset.status !== "active_sale" && asset.status !== "funded") {
      throw new ApiError(
        409,
        "INVALID_ASSET_STATE",
        "Revenue epochs can only be created for active sale or funded assets",
      );
    }

    if (input.period_end < input.period_start) {
      throw new ApiError(422, "INVALID_PERIOD", "period_end must not be earlier than period_start");
    }

    const [existingEpoch] = await db
      .select({ id: revenueEpochs.id })
      .from(revenueEpochs)
      .where(
        and(eq(revenueEpochs.assetId, assetId), eq(revenueEpochs.epochNumber, input.epoch_number)),
      )
      .limit(1);

    if (existingEpoch) {
      throw new ApiError(
        409,
        "REVENUE_EPOCH_EXISTS",
        "Revenue epoch already exists for this asset",
      );
    }

    const [epoch] = await db
      .insert(revenueEpochs)
      .values({
        assetId,
        epochNumber: input.epoch_number,
        periodStart: input.period_start,
        periodEnd: input.period_end,
        grossRevenueUsdc: toMoneyString(input.gross_revenue_usdc),
        netRevenueUsdc: toMoneyString(input.net_revenue_usdc),
        distributableRevenueUsdc: toMoneyString(input.distributable_revenue_usdc),
        reportUri: input.report_uri,
        reportHash: input.report_hash,
        sourceType: input.source_type,
        postedByUserId: currentUser.id,
        status: "draft",
      })
      .returning({ id: revenueEpochs.id });

    await db.insert(auditLogs).values({
      actorUserId: currentUser.id,
      entityType: "revenue_epoch",
      entityId: epoch.id,
      action: "revenue_epoch.draft_created",
      payloadJson: {
        asset_id: assetId,
        epoch_number: input.epoch_number,
      },
    });

    return {
      success: true,
      revenue_epoch_id: epoch.id,
    };
  }

  async prepareRevenuePosting(
    currentUser: IssuerActor,
    assetId: string,
    epochId: string,
  ): Promise<RevenuePostResponse> {
    await getOwnedAsset(assetId, currentUser.id);

    const [walletBinding] = await db
      .select()
      .from(walletBindings)
      .where(and(eq(walletBindings.userId, currentUser.id), eq(walletBindings.status, "active")))
      .limit(1);

    if (!walletBinding) {
      throw new ApiError(
        409,
        "ACTIVE_WALLET_REQUIRED",
        "An active wallet binding is required to post revenue",
      );
    }

    const [revenueEpoch] = await db
      .select()
      .from(revenueEpochs)
      .where(and(eq(revenueEpochs.id, epochId), eq(revenueEpochs.assetId, assetId)))
      .limit(1);

    if (!revenueEpoch) {
      throw new ApiError(404, "REVENUE_EPOCH_NOT_FOUND", "Revenue epoch not found");
    }

    if (revenueEpoch.status !== "draft") {
      throw new ApiError(
        409,
        "REVENUE_EPOCH_ALREADY_PREPARED",
        "Only draft revenue epochs can be prepared for posting",
      );
    }

    // Build the Solana transaction for issuer signing
    const payload = await prepareRevenuePostTransaction({
      operationId: revenueEpoch.id,
      assetId,
      issuerWalletAddress: walletBinding.walletAddress,
      epochNumber: revenueEpoch.epochNumber,
      amountUsdc: toNumber(revenueEpoch.distributableRevenueUsdc),
      reportHash: revenueEpoch.reportHash ?? "",
    });

    return payload as RevenuePostResponse;
  }
}

export const issuerService = new IssuerService();

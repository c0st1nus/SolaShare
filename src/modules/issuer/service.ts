import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db";
import {
  assetDocuments,
  assetSaleTerms,
  assetStatusHistory,
  assets,
  auditLogs,
  revenueEpochs,
  verificationRequests,
  walletBindings,
} from "../../db/schema";
import { ApiError } from "../../lib/api-error";
import { prepareRevenuePostTransaction } from "../../lib/solana";
import { toMoneyString, toNumber } from "../shared/utils";
import type {
  issuerAssetBodySchema,
  issuerAssetDocumentBodySchema,
  issuerAssetDocumentResponseSchema,
  issuerAssetResponseSchema,
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
type IssuerAssetDocumentBody = z.infer<typeof issuerAssetDocumentBodySchema>;
type IssuerAssetDocumentResponse = z.infer<typeof issuerAssetDocumentResponseSchema>;
type SaleTermsBody = z.infer<typeof saleTermsBodySchema>;
type SaleTermsResponse = z.infer<typeof saleTermsResponseSchema>;
type IssuerSubmitResponse = z.infer<typeof issuerSubmitResponseSchema>;
type RevenueEpochBody = z.infer<typeof revenueEpochBodySchema>;
type RevenueEpochResponse = z.infer<typeof revenueEpochResponseSchema>;
type RevenuePostResponse = z.infer<typeof revenuePostResponseSchema>;

type IssuerActor = {
  id: string;
};

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

export class IssuerService {
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
    await assertEditableDraft(assetId, currentUser.id);
    const [existingSaleTerms] = await db
      .select()
      .from(assetSaleTerms)
      .where(eq(assetSaleTerms.assetId, assetId))
      .limit(1);

    await db.transaction(async (tx) => {
      if (existingSaleTerms) {
        await tx
          .update(assetSaleTerms)
          .set({
            valuationUsdc: input.valuation_usdc.toFixed(6),
            totalShares: input.total_shares,
            pricePerShareUsdc: input.price_per_share_usdc.toFixed(6),
            minimumBuyAmountUsdc: input.minimum_buy_amount_usdc.toFixed(6),
            targetRaiseUsdc: input.target_raise_usdc.toFixed(6),
            updatedAt: new Date(),
          })
          .where(eq(assetSaleTerms.assetId, assetId));
      } else {
        await tx.insert(assetSaleTerms).values({
          assetId,
          valuationUsdc: input.valuation_usdc.toFixed(6),
          totalShares: input.total_shares,
          pricePerShareUsdc: input.price_per_share_usdc.toFixed(6),
          minimumBuyAmountUsdc: input.minimum_buy_amount_usdc.toFixed(6),
          targetRaiseUsdc: input.target_raise_usdc.toFixed(6),
        });
      }

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "asset_sale_terms",
        entityId: assetId,
        action: "asset.sale_terms_saved",
        payloadJson: input,
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

import { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db";
import {
  assetDocuments,
  assetSaleTerms,
  assets,
  claims,
  holdingsSnapshots,
  investments,
  revenueEpochs,
  users,
} from "../../db/schema";
import { ApiError } from "../../lib/api-error";
import { roundMoney, toNumber } from "../shared/utils";
import type {
  assetDetailSchema,
  assetDocumentsResponseSchema,
  assetHoldersSummaryResponseSchema,
  assetRevenueResponseSchema,
  assetsListResponseSchema,
  assetsQuerySchema,
} from "./contracts";
import { calculateFundedPercent } from "./domain";

type AssetsQuery = z.infer<typeof assetsQuerySchema>;
type AssetsListResponse = z.infer<typeof assetsListResponseSchema>;
type AssetDetailResponse = z.infer<typeof assetDetailSchema>;
type AssetRevenueResponse = z.infer<typeof assetRevenueResponseSchema>;
type AssetDocumentsResponse = z.infer<typeof assetDocumentsResponseSchema>;
type AssetHoldersSummaryResponse = z.infer<typeof assetHoldersSummaryResponseSchema>;

const publicAssetStatuses = ["verified", "active_sale", "funded", "frozen", "closed"] as const;

const getPublicAssetBase = async (assetId: string) => {
  const [row] = await db
    .select({
      asset: assets,
      issuer: users,
      saleTerms: assetSaleTerms,
    })
    .from(assets)
    .innerJoin(users, eq(users.id, assets.issuerUserId))
    .innerJoin(assetSaleTerms, eq(assetSaleTerms.assetId, assets.id))
    .where(and(eq(assets.id, assetId), inArray(assets.status, publicAssetStatuses)))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "ASSET_NOT_FOUND", "Asset not found");
  }

  return row;
};

export class AssetsService {
  async listAssets(query: AssetsQuery): Promise<AssetsListResponse> {
    const filters = [
      query.status && publicAssetStatuses.includes(query.status as (typeof publicAssetStatuses)[number])
        ? eq(assets.status, query.status)
        : inArray(assets.status, publicAssetStatuses),
      query.energy_type ? eq(assets.energyType, query.energy_type) : undefined,
    ].filter(Boolean);

    const whereClause =
      filters.length === 1 ? filters[0] : filters.length > 1 ? and(...filters) : undefined;

    const sortClause =
      query.sort === "price_asc"
        ? asc(assetSaleTerms.pricePerShareUsdc)
        : query.sort === "yield_desc"
          ? desc(assets.expectedAnnualYieldPercent)
          : desc(assets.createdAt);

    const [rows, totals] = await Promise.all([
      db
        .select({
          id: assets.id,
          title: assets.title,
          energyType: assets.energyType,
          capacityKw: assets.capacityKw,
          status: assets.status,
          pricePerShareUsdc: assetSaleTerms.pricePerShareUsdc,
          expectedAnnualYieldPercent: assets.expectedAnnualYieldPercent,
        })
        .from(assets)
        .innerJoin(assetSaleTerms, eq(assetSaleTerms.assetId, assets.id))
        .where(whereClause)
        .orderBy(sortClause)
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      db
        .select({ total: count(assets.id) })
        .from(assets)
        .innerJoin(assetSaleTerms, eq(assetSaleTerms.assetId, assets.id))
        .where(whereClause),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        energy_type: row.energyType,
        capacity_kw: toNumber(row.capacityKw),
        status: row.status,
        price_per_share_usdc: toNumber(row.pricePerShareUsdc),
        expected_annual_yield_percent:
          row.expectedAnnualYieldPercent === null ? 0 : toNumber(row.expectedAnnualYieldPercent),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totals[0]?.total ?? 0,
      },
    };
  }

  async getAsset(id: string): Promise<AssetDetailResponse> {
    const [row, documents, revenueStats] = await Promise.all([
      getPublicAssetBase(id),
      this.getAssetDocuments(id),
      db
        .select({
          totalEpochs: count(revenueEpochs.id),
          lastPostedEpoch: sql<number | null>`max(${revenueEpochs.epochNumber})`,
        })
        .from(revenueEpochs)
        .where(
          and(
            eq(revenueEpochs.assetId, id),
            or(eq(revenueEpochs.status, "posted"), eq(revenueEpochs.status, "settled")),
          ),
        ),
    ]);

    return {
      id: row.asset.id,
      slug: row.asset.slug,
      title: row.asset.title,
      short_description: row.asset.shortDescription,
      full_description: row.asset.fullDescription,
      energy_type: row.asset.energyType,
      status: row.asset.status,
      location: {
        country: row.asset.locationCountry,
        region: row.asset.locationRegion,
        city: row.asset.locationCity,
      },
      capacity_kw: toNumber(row.asset.capacityKw),
      currency: row.asset.currency,
      expected_annual_yield_percent:
        row.asset.expectedAnnualYieldPercent === null
          ? null
          : toNumber(row.asset.expectedAnnualYieldPercent),
      issuer: {
        id: row.issuer.id,
        display_name: row.issuer.displayName ?? "Issuer",
      },
      sale_terms: {
        valuation_usdc: row.saleTerms.valuationUsdc,
        total_shares: row.saleTerms.totalShares,
        price_per_share_usdc: row.saleTerms.pricePerShareUsdc,
        minimum_buy_amount_usdc: row.saleTerms.minimumBuyAmountUsdc,
        target_raise_usdc: row.saleTerms.targetRaiseUsdc,
        sale_status: row.saleTerms.saleStatus,
      },
      public_documents: documents.items,
      revenue_summary: {
        total_epochs: revenueStats[0]?.totalEpochs ?? 0,
        last_posted_epoch: revenueStats[0]?.lastPostedEpoch ?? null,
      },
      onchain_refs: {
        onchain_asset_pubkey: row.asset.onchainAssetPubkey,
        share_mint_pubkey: row.asset.shareMintPubkey,
        vault_pubkey: row.asset.vaultPubkey,
      },
    };
  }

  async getAssetRevenue(id: string): Promise<AssetRevenueResponse> {
    await getPublicAssetBase(id);

    const rows = await db
      .select()
      .from(revenueEpochs)
      .where(
        and(
          eq(revenueEpochs.assetId, id),
          or(eq(revenueEpochs.status, "posted"), eq(revenueEpochs.status, "settled")),
        ),
      )
      .orderBy(desc(revenueEpochs.epochNumber));

    return {
      items: rows.map((row) => ({
        id: row.id,
        epoch_number: row.epochNumber,
        period_start: row.periodStart,
        period_end: row.periodEnd,
        gross_revenue_usdc: toNumber(row.grossRevenueUsdc),
        net_revenue_usdc: toNumber(row.netRevenueUsdc),
        distributable_revenue_usdc: toNumber(row.distributableRevenueUsdc),
        report_uri: row.reportUri ?? "https://example.com/reports/pending",
        posting_status: row.status,
      })),
    };
  }

  async getAssetDocuments(id: string): Promise<AssetDocumentsResponse> {
    await getPublicAssetBase(id);

    const rows = await db
      .select()
      .from(assetDocuments)
      .where(and(eq(assetDocuments.assetId, id), eq(assetDocuments.isPublic, true)))
      .orderBy(desc(assetDocuments.createdAt));

    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        storage_provider: row.storageProvider,
        storage_uri: row.storageUri,
        content_hash: row.contentHash,
        is_public: row.isPublic,
      })),
    };
  }

  async getAssetHoldersSummary(id: string): Promise<AssetHoldersSummaryResponse> {
    await getPublicAssetBase(id);

    const [
      saleTerms,
      investorsAggregate,
      revenueAggregate,
      claimsAggregate,
      confirmedInvestmentsAggregate,
    ] = await Promise.all([
      db.select().from(assetSaleTerms).where(eq(assetSaleTerms.assetId, id)).limit(1),
      db
        .select({
          total: count(holdingsSnapshots.userId),
        })
        .from(holdingsSnapshots)
        .where(eq(holdingsSnapshots.assetId, id)),
      db
        .select({
          total: sql<string>`coalesce(sum(${revenueEpochs.distributableRevenueUsdc}), 0)`,
        })
        .from(revenueEpochs)
        .where(
          and(
            eq(revenueEpochs.assetId, id),
            or(eq(revenueEpochs.status, "posted"), eq(revenueEpochs.status, "settled")),
          ),
        ),
      db
        .select({
          total: sql<string>`coalesce(sum(${claims.claimAmountUsdc}), 0)`,
        })
        .from(claims)
        .where(and(eq(claims.assetId, id), eq(claims.status, "confirmed"))),
      db
        .select({
          total: sql<string>`coalesce(sum(${investments.amountUsdc}), 0)`,
        })
        .from(investments)
        .where(and(eq(investments.assetId, id), eq(investments.status, "confirmed"))),
    ]);

    const targetRaiseUsdc = toNumber(saleTerms[0]?.targetRaiseUsdc);
    const fundedPercent = calculateFundedPercent(
      targetRaiseUsdc,
      toNumber(confirmedInvestmentsAggregate[0]?.total),
    );

    return {
      total_investors: investorsAggregate[0]?.total ?? 0,
      funded_percent: fundedPercent,
      total_distributed_usdc: roundMoney(toNumber(revenueAggregate[0]?.total)),
      total_claimed_usdc: roundMoney(toNumber(claimsAggregate[0]?.total)),
    };
  }
}

export const assetsService = new AssetsService();

import type { z } from "zod";
import type {
  assetDetailSchema,
  assetDocumentsResponseSchema,
  assetHoldersSummaryResponseSchema,
  assetRevenueResponseSchema,
  assetsListResponseSchema,
  assetsQuerySchema,
} from "./contracts";

type AssetsQuery = z.infer<typeof assetsQuerySchema>;
type AssetsListResponse = z.infer<typeof assetsListResponseSchema>;
type AssetDetailResponse = z.infer<typeof assetDetailSchema>;
type AssetRevenueResponse = z.infer<typeof assetRevenueResponseSchema>;
type AssetDocumentsResponse = z.infer<typeof assetDocumentsResponseSchema>;
type AssetHoldersSummaryResponse = z.infer<typeof assetHoldersSummaryResponseSchema>;

const stubAssetId = "22222222-2222-4222-8222-222222222222";

export class AssetsService {
  listAssets(query: AssetsQuery): AssetsListResponse {
    return {
      items: [
        {
          id: stubAssetId,
          title: "Solar Farm A",
          energy_type: query.energy_type ?? "solar",
          capacity_kw: 150,
          status: query.status ?? "active_sale",
          price_per_share_usdc: 10,
          expected_annual_yield_percent: 12.5,
        },
      ],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: 1,
      },
    };
  }

  getAsset(id: string): AssetDetailResponse {
    return {
      id,
      slug: "solar-farm-a",
      title: "Solar Farm A",
      short_description: "Yield-bearing solar farm asset",
      full_description: "Stub asset payload used to lock API contracts before real services land.",
      energy_type: "solar",
      status: "active_sale",
      location: {
        country: "Kazakhstan",
        region: "Almaty Region",
        city: "Almaty",
      },
      capacity_kw: 150,
      currency: "USDC",
      expected_annual_yield_percent: 12.5,
      issuer: {
        id: "33333333-3333-4333-8333-333333333333",
        display_name: "SolaShare Issuer",
      },
      sale_terms: {
        valuation_usdc: "100000.000000",
        total_shares: 10000,
        price_per_share_usdc: "10.000000",
        minimum_buy_amount_usdc: "50.000000",
        target_raise_usdc: "50000.000000",
        sale_status: "live",
      },
      public_documents: this.getAssetDocuments(id).items,
      revenue_summary: {
        total_epochs: 1,
        last_posted_epoch: 1,
      },
      onchain_refs: {
        onchain_asset_pubkey: null,
        share_mint_pubkey: null,
        vault_pubkey: null,
      },
    };
  }

  getAssetRevenue(_id: string): AssetRevenueResponse {
    return {
      items: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          epoch_number: 1,
          period_start: "2026-03-01",
          period_end: "2026-03-31",
          gross_revenue_usdc: 2500,
          net_revenue_usdc: 2100,
          distributable_revenue_usdc: 1800,
          report_uri: "https://example.com/reports/epoch-1",
          posting_status: "posted",
        },
      ],
    };
  }

  getAssetDocuments(_id: string): AssetDocumentsResponse {
    return {
      items: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          type: "technical_passport",
          title: "Technical passport",
          storage_provider: "arweave",
          storage_uri: "https://example.com/documents/technical-passport",
          content_hash: "sha256:stub-passport",
          is_public: true,
        },
      ],
    };
  }

  getAssetHoldersSummary(_id: string): AssetHoldersSummaryResponse {
    return {
      total_investors: 93,
      funded_percent: 71.5,
      total_distributed_usdc: 14320,
      total_claimed_usdc: 12904,
    };
  }
}

export const assetsService = new AssetsService();

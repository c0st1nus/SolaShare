import type { z } from "zod";
import type { meClaimsResponseSchema, mePortfolioResponseSchema } from "./contracts";

type MePortfolioResponse = z.infer<typeof mePortfolioResponseSchema>;
type MeClaimsResponse = z.infer<typeof meClaimsResponseSchema>;

export class MeService {
  getPortfolio(): MePortfolioResponse {
    return {
      total_invested_usdc: 1200,
      total_claimed_usdc: 84,
      total_unclaimed_usdc: 19,
      positions: [
        {
          asset_id: "22222222-2222-4222-8222-222222222222",
          title: "Solar Farm A",
          shares_amount: 120,
          shares_percentage: 0.24,
          unclaimed_usdc: 6.1,
        },
      ],
    };
  }

  getClaims(): MeClaimsResponse {
    return {
      items: [
        {
          claim_id: "99999999-9999-4999-8999-999999999999",
          asset_id: "22222222-2222-4222-8222-222222222222",
          revenue_epoch_id: "44444444-4444-4444-8444-444444444444",
          claim_amount_usdc: 84,
          status: "confirmed",
          transaction_signature: "stub-claim-signature",
        },
      ],
    };
  }
}

export const meService = new MeService();

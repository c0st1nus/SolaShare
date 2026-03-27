import type { z } from "zod";
import type {
  investmentPrepareResponseSchema,
  investmentQuoteBodySchema,
  investmentQuoteResponseSchema,
} from "./contracts";

type InvestmentQuoteBody = z.infer<typeof investmentQuoteBodySchema>;
type InvestmentQuoteResponse = z.infer<typeof investmentQuoteResponseSchema>;
type InvestmentPrepareResponse = z.infer<typeof investmentPrepareResponseSchema>;

export class InvestmentsService {
  getQuote(input: InvestmentQuoteBody): InvestmentQuoteResponse {
    return {
      shares_to_receive: input.amount_usdc / 10,
      price_per_share_usdc: 10,
      fees_usdc: 0,
    };
  }

  prepareInvestment(input: InvestmentQuoteBody): InvestmentPrepareResponse {
    return {
      success: true,
      signing_payload: {
        kind: "investment",
        asset_id: input.asset_id,
        amount_usdc: input.amount_usdc,
      },
      message: "Stub investment payload prepared",
    };
  }
}

export const investmentsService = new InvestmentsService();

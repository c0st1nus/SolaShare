import type { z } from "zod";
import type { claimPrepareBodySchema, claimPrepareResponseSchema } from "./contracts";

type ClaimPrepareBody = z.infer<typeof claimPrepareBodySchema>;
type ClaimPrepareResponse = z.infer<typeof claimPrepareResponseSchema>;

export class ClaimsService {
  prepareClaim(input: ClaimPrepareBody): ClaimPrepareResponse {
    return {
      success: true,
      signing_payload: {
        kind: "claim",
        asset_id: input.asset_id,
        revenue_epoch_id: input.revenue_epoch_id,
      },
      message: "Stub claim payload prepared",
    };
  }
}

export const claimsService = new ClaimsService();

import type { z } from "zod";
import { ApiError } from "../../lib/api-error";
import type { transactionConfirmBodySchema, transactionConfirmResponseSchema } from "./contracts";
import { settlementService } from "./settlement-service";

type TransactionConfirmBody = z.infer<typeof transactionConfirmBodySchema>;
type TransactionConfirmResponse = z.infer<typeof transactionConfirmResponseSchema>;

type AuthenticatedActor = {
  id: string;
};

export class TransactionsService {
  async confirmTransaction(
    currentUser: AuthenticatedActor,
    input: TransactionConfirmBody,
  ): Promise<TransactionConfirmResponse> {
    switch (input.kind) {
      case "investment": {
        if (!input.operation_id) {
          throw new ApiError(
            422,
            "OPERATION_ID_REQUIRED",
            "operation_id is required for investments",
          );
        }

        return settlementService.confirmInvestment(
          currentUser,
          input.operation_id,
          input.transaction_signature,
        );
      }
      case "claim": {
        if (!input.operation_id) {
          throw new ApiError(422, "OPERATION_ID_REQUIRED", "operation_id is required for claims");
        }

        return settlementService.confirmClaim(
          currentUser,
          input.operation_id,
          input.transaction_signature,
        );
      }
      case "revenue_post": {
        if (!input.operation_id) {
          throw new ApiError(
            422,
            "OPERATION_ID_REQUIRED",
            "operation_id is required for revenue posting confirmations",
          );
        }

        return settlementService.confirmRevenuePosting(
          currentUser,
          input.operation_id,
          input.transaction_signature,
        );
      }
      case "wallet_link":
        return settlementService.confirmWalletBinding(currentUser, input.transaction_signature);
    }
  }
}

export const transactionsService = new TransactionsService();

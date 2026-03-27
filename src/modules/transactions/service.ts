import type { z } from "zod";
import type { transactionConfirmBodySchema, transactionConfirmResponseSchema } from "./contracts";

type TransactionConfirmBody = z.infer<typeof transactionConfirmBodySchema>;
type TransactionConfirmResponse = z.infer<typeof transactionConfirmResponseSchema>;

export class TransactionsService {
  confirmTransaction(_input: TransactionConfirmBody): TransactionConfirmResponse {
    return {
      success: true,
      sync_status: "queued",
    };
  }
}

export const transactionsService = new TransactionsService();

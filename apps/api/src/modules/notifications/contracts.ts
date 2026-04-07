import { z } from "zod";

export const notificationSchema = z.object({
  type: z.enum(["INVESTMENT_CONFIRMED", "EPOCH_CREATED", "PAYMENT_RECEIVED"]),
  data: z.any(),
  userId: z.string().optional(),
  timestamp: z.number(),
});

export type Notification = z.infer<typeof notificationSchema>;

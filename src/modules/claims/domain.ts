import { roundMoney } from "../shared/utils";

export const isRevenueClaimableStatus = (status: "draft" | "posted" | "settled" | "flagged") =>
  status === "posted" || status === "settled";

export const calculateClaimableAmount = (
  distributableRevenueUsdc: number,
  sharesPercentage: number,
  alreadyClaimedUsdc: number,
) => roundMoney(distributableRevenueUsdc * sharesPercentage - alreadyClaimedUsdc);

import { clampPercent } from "../shared/utils";

export const calculateFundedPercent = (
  targetRaiseUsdc: number,
  confirmedInvestmentUsdc: number,
) => {
  if (targetRaiseUsdc <= 0) {
    return 0;
  }

  return clampPercent((confirmedInvestmentUsdc / targetRaiseUsdc) * 100);
};

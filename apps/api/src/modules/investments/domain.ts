import { roundMoney } from "../shared/utils";

export const calculateSharesToReceive = (amountUsdc: number, pricePerShareUsdc: number) => {
  if (pricePerShareUsdc <= 0) {
    throw new Error("pricePerShareUsdc must be positive");
  }

  return roundMoney(amountUsdc / pricePerShareUsdc);
};

export const calculateRemainingShares = (totalShares: number, reservedShares: number) =>
  totalShares - reservedShares;

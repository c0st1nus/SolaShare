import { describe, expect, it } from "bun:test";
import { calculateFundedPercent } from "../modules/assets/domain";
import { calculateClaimableAmount, isRevenueClaimableStatus } from "../modules/claims/domain";
import { calculateRemainingShares, calculateSharesToReceive } from "../modules/investments/domain";

describe("domain helpers", () => {
  it("calculates funded percent safely", () => {
    expect(calculateFundedPercent(1000, 250)).toBe(25);
    expect(calculateFundedPercent(0, 250)).toBe(0);
    expect(calculateFundedPercent(100, 120)).toBe(100);
  });

  it("calculates shares to receive and remaining shares", () => {
    expect(calculateSharesToReceive(100, 10)).toBe(10);
    expect(calculateRemainingShares(1000, 125)).toBe(875);
  });

  it("throws when price per share is invalid", () => {
    expect(() => calculateSharesToReceive(100, 0)).toThrow();
  });

  it("calculates claimable amounts and claimable statuses", () => {
    expect(isRevenueClaimableStatus("posted")).toBe(true);
    expect(isRevenueClaimableStatus("settled")).toBe(true);
    expect(isRevenueClaimableStatus("draft")).toBe(false);
    expect(calculateClaimableAmount(1800, 0.01, 0)).toBe(18);
    expect(calculateClaimableAmount(1800, 0.01, 5)).toBe(13);
  });
});

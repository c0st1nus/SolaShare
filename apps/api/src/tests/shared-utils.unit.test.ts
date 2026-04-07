import { describe, expect, it } from "bun:test";
import {
  clampPercent,
  roundMoney,
  toMoneyString,
  toNumber,
  toShareAmountString,
} from "../modules/shared/utils";

describe("shared utils", () => {
  it("converts nullable values to numbers", () => {
    expect(toNumber("12.5")).toBe(12.5);
    expect(toNumber(7)).toBe(7);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
  });

  it("formats money and share amounts with fixed precision", () => {
    expect(toMoneyString(12.3)).toBe("12.300000");
    expect(toShareAmountString(1.25)).toBe("1.250000000000");
  });

  it("rounds money values to six decimals", () => {
    expect(roundMoney(1.12345678)).toBe(1.123457);
    expect(roundMoney(1.12345611)).toBe(1.123456);
  });

  it("clamps percentage into the 0..100 range", () => {
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(12.3456)).toBe(12.35);
  });
});

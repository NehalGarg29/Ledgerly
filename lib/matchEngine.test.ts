import { describe, it, expect } from "vitest";
import { calculateConfidence, daysBetween } from "./matchEngine";

describe("calculateConfidence", () => {
  it("scores a perfect match (same amount, same day) at 1.0", () => {
    expect(calculateConfidence(50000, 50000, 0)).toBe(1);
  });

  it("scores same amount at the edge of the 7-day window at 0.7", () => {
    // dateScore floors at 0 once daysApart * 0.15 >= 1 (~6.67 days),
    // so at exactly 7 days only the amount side contributes.
    expect(calculateConfidence(50000, 50000, 7)).toBe(0.7);
  });

  it("floors amountScore at 0 once the amount is off by 20% or more, same day", () => {
    // amountDiffRatio = 0.2 is exactly where amountScore hits 0 (1 - 0.2*5 = 0).
    // Confidence should be the dateScore's contribution only: 0.3.
    expect(calculateConfidence(10000, 8000, 0)).toBe(0.3);
  });

  it("never goes negative even when the amount is wildly off", () => {
    // amountDiffRatio = 1.0 would make amountScore = -4 without the floor.
    // Should land on the same 0.3 as the boundary case above, not lower.
    expect(calculateConfidence(10000, 0, 0)).toBe(0.3);
  });

  it("handles negative amounts correctly (vendor payments, bank fees)", () => {
    // Real transactions are often negative. An exact match on a negative
    // amount should still score full marks on the amount side.
    expect(calculateConfidence(-220000, -220000, 2)).toBe(0.91);
  });

  it("handles a small real-world discrepancy on a negative amount", () => {
    // A 50-cent difference on a -$150.50 bank fee, same day.
    expect(calculateConfidence(-15050, -15000, 0)).toBe(0.99);
  });
});

describe("daysBetween", () => {
  it("returns 0 for the same date", () => {
    expect(daysBetween("2026-08-19", "2026-08-19")).toBe(0);
  });

  it("returns the correct span regardless of argument order", () => {
    expect(daysBetween("2026-08-19", "2026-08-24")).toBe(5);
    expect(daysBetween("2026-08-24", "2026-08-19")).toBe(5);
  });
});
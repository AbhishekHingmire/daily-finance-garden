import { describe, it, expect } from "vitest";
import {
  calculateInvestmentValuation,
  getDefaultExpenseRatio,
  computeNextSipDate,
  calculateSipHistoricalProgress,
} from "@/lib/investment-calculator";

describe("Investment Calculator Engine", () => {
  it("determines correct default expense ratios per asset category", () => {
    expect(getDefaultExpenseRatio("Mutual fund", "Parag Parikh Flexi Cap Fund Direct Growth")).toBe(0.65);
    expect(getDefaultExpenseRatio("Mutual fund", "HDFC Top 100 Regular Plan")).toBe(1.75);
    expect(getDefaultExpenseRatio("Mutual fund", "UTI Nifty 50 Index Fund")).toBe(0.20);
    expect(getDefaultExpenseRatio("ETF", "Nifty BeES")).toBe(0.15);
    expect(getDefaultExpenseRatio("ETF", "Nippon India Gold BeES")).toBe(0.35);
    expect(getDefaultExpenseRatio("Stocks & Equity", "Reliance Industries Ltd")).toBe(0.00);
    expect(getDefaultExpenseRatio("Fixed deposit", "HDFC Bank FD")).toBe(0.00);
  });

  it("calculates current valuation accurately from units and ongoing market price", () => {
    const res = calculateInvestmentValuation({
      investedAmount: 50000,
      currentPrice: 89.28,
      units: 600,
      assetType: "Mutual fund",
      startMonthYear: "2024-01",
      expenseRatio: 0.65,
    });

    // 600 units * 89.28 = 53568
    expect(res.currentAmount).toBe(53568);
    expect(res.absolutePnL).toBe(3568);
    expect(res.absolutePnLPct).toBeCloseTo(7.14, 1);
    expect(res.annualExpenseFee).toBeCloseTo(348.19, 1);
    expect(res.cagr).not.toBeNull();
    expect(res.netCagr).not.toBeNull();
    expect(res.netCagr!).toBeCloseTo(res.cagr! - 0.65, 2);
  });

  it("calculates units and current valuation from purchase price and ongoing price", () => {
    const res = calculateInvestmentValuation({
      investedAmount: 100000,
      purchasePrice: 2000, // Bought at 2000
      currentPrice: 2500,  // Currently trading at 2500 (+25%)
      assetType: "Stocks & Equity",
      startMonthYear: "2024-01",
      expenseRatio: 0.0,
    });

    // Units = 100000 / 2000 = 50 units
    expect(res.units).toBe(50);
    // Current Value = 50 * 2500 = 125000
    expect(res.currentAmount).toBe(125000);
    expect(res.absolutePnL).toBe(25000);
    expect(res.absolutePnLPct).toBe(25.0);
    expect(res.annualExpenseFee).toBe(0);
  });

  it("computes accurate compound interest for Fixed Deposits", () => {
    const res = calculateInvestmentValuation({
      investedAmount: 100000,
      assetType: "Fixed deposit",
      fdAnnualRate: 7.2,
      fdCompounding: "Quarterly",
      startMonthYear: "2024-01",
      endMonthYear: "2028-01", // Future maturity date
    });

    expect(res.currentAmount).toBeGreaterThan(100000);
    expect(res.fdAccruedInterest).toBeGreaterThan(0);
    expect(res.fdMaturityAmount).toBeGreaterThan(res.currentAmount);
    expect(res.absolutePnL).toBe(res.fdAccruedInterest!);
  });

  it("calculates SGB bonus interest for Gold & Commodities", () => {
    const res = calculateInvestmentValuation({
      investedAmount: 80000,
      currentPrice: 72.5,
      units: 1200,
      assetType: "Gold & Commodities",
      startMonthYear: "2024-01",
    });

    expect(res.currentAmount).toBe(87000); // 1200 * 72.5
    expect(res.sgbBonusInterest).toBeGreaterThan(0);
  });

  it("handles manual valuation fallback when requested", () => {
    const res = calculateInvestmentValuation({
      investedAmount: 40000,
      calculationMode: "manual",
      manualCurrentAmount: 45000,
      assetType: "Other",
      startMonthYear: "2024-06",
    });

    expect(res.currentAmount).toBe(45000);
    expect(res.absolutePnL).toBe(5000);
    expect(res.absolutePnLPct).toBe(12.5);
  });

  describe("computeNextSipDate", () => {
    it("schedules in the same month if target day is in the future", () => {
      // Reference date: 2026-10-15
      const refDate = new Date(2026, 9, 15); // Month 9 is October
      const result = computeNextSipDate(25, refDate);

      expect(result.isSameMonth).toBe(true);
      expect(result.nextDate).toBe("2026-10-25");
      expect(result.daysUntil).toBe(10);
    });

    it("schedules today if target day is today", () => {
      const refDate = new Date(2026, 9, 15);
      const result = computeNextSipDate(15, refDate);

      expect(result.isSameMonth).toBe(true);
      expect(result.nextDate).toBe("2026-10-15");
      expect(result.daysUntil).toBe(0);
    });

    it("rolls over to next month if target day has already passed", () => {
      // Reference date: 2026-10-29, target day: 10
      const refDate = new Date(2026, 9, 29);
      const result = computeNextSipDate(10, refDate);

      expect(result.isSameMonth).toBe(false);
      expect(result.nextDate).toBe("2026-11-10");
      expect(result.daysUntil).toBeGreaterThan(0);
    });

    it("handles December rollover to next year January properly", () => {
      // Reference date: 2026-12-20, target day: 5
      const refDate = new Date(2026, 11, 20); // Month 11 is December
      const result = computeNextSipDate(5, refDate);

      expect(result.isSameMonth).toBe(false);
      expect(result.nextDate).toBe("2027-01-05");
    });

    it("clamps target day to valid month days (e.g. 31st in a 30-day month)", () => {
      // Reference date: 2026-10-15, target day: 31 (October has 31 days)
      const refDate = new Date(2026, 9, 15);
      const octResult = computeNextSipDate(31, refDate);
      expect(octResult.nextDate).toBe("2026-10-31");

      // Reference date: 2026-10-31, target day: 31 (next month is November, 30 days)
      const refDatePassed = new Date(2026, 9, 31, 23, 59, 59);
      // If we pass day 31 and it rolls to Nov:
      const novRefDate = new Date(2026, 10, 15); // Nov 15, target 31
      const novResult = computeNextSipDate(31, novRefDate);
      expect(novResult.nextDate).toBe("2026-11-30"); // Nov has 30 days
    });
  });

  describe("calculateSipHistoricalProgress", () => {
    it("calculates exact 17 installments for July 2025 to Oct 29, 2026 with 19th SIP date", () => {
      // User scenario: Started July 2025 (2025-07), Monthly SIP: ₹5,000, SIP day: 19, Reference: 2026-10-29
      const refDate = new Date(2026, 9, 29); // Month 9 is October
      const result = calculateSipHistoricalProgress("2025-07", 5000, 19, refDate);

      expect(result.elapsedInstallments).toBe(17);
      expect(result.totalEstimatedInvested).toBe(85000); // 17 * 5000
      expect(result.monthsElapsed).toBe(17);
    });

    it("calculates accurate elapsed installments and invested capital when SIP day has passed", () => {
      // Reference: 2026-10-29. Started 2026-07. SIP day: 10.
      const refDate = new Date(2026, 9, 29);
      const result = calculateSipHistoricalProgress("2026-07", 5000, 10, refDate);

      expect(result.elapsedInstallments).toBe(5);
      expect(result.totalEstimatedInvested).toBe(25000); // 5 * 5000
    });

    it("does not count current month installment if SIP day is in the future", () => {
      // Reference: 2026-10-05. Started 2026-07. SIP day: 10.
      const refDate = new Date(2026, 9, 5);
      const result = calculateSipHistoricalProgress("2026-07", 5000, 10, refDate);

      expect(result.elapsedInstallments).toBe(4);
      expect(result.totalEstimatedInvested).toBe(20000); // 4 * 5000
    });

    it("handles multi-year spans accurately", () => {
      // Started 2024-01, Reference 2026-01-15, SIP day 10
      const refDate = new Date(2026, 0, 15);
      const result = calculateSipHistoricalProgress("2024-01", 10000, 10, refDate);

      expect(result.elapsedInstallments).toBe(26);
      expect(result.totalEstimatedInvested).toBe(260000);
    });

    it("supports full date format YYYY-MM-DD without breaking installment progress", () => {
      const refDate = new Date(2026, 9, 29);
      const result = calculateSipHistoricalProgress("2025-07-15", 5000, 19, refDate);

      expect(result.elapsedInstallments).toBe(17);
      expect(result.totalEstimatedInvested).toBe(85000);
    });
  });

  describe("Autonomous Lump Sum Valuation", () => {
    it("accurately computes units and current valuation with real historical NAV from purchase date", () => {
      // Real HDFC Flexi Cap Direct Plan Growth Option scenario:
      // Invested: ₹80,000 on 2025-07-15 at purchase NAV ₹2,178.07
      // Live NAV: ₹2,152.61
      const invested = 80000;
      const purchaseNav = 2178.07;
      const liveNav = 2152.61;
      const derivedUnits = Math.round((invested / purchaseNav) * 10000) / 10000; // ~36.7297 units

      expect(derivedUnits).toBeCloseTo(36.7297, 3);

      const val = calculateInvestmentValuation({
        investedAmount: invested,
        units: derivedUnits,
        purchasePrice: purchaseNav,
        currentPrice: liveNav,
        assetType: "Mutual fund",
        startMonthYear: "2025-07-15",
      });

      // Current Value = 36.7297 * 2152.61 = ~79,064.62
      expect(val.currentAmount).toBeCloseTo(79064.62, 0);
      expect(val.absolutePnL).toBeCloseTo(-935.38, 0);
      expect(val.absolutePnLPct).toBeCloseTo(-1.17, 1);
      expect(val.elapsedMonths).toBeGreaterThan(0);
    });
  });
});

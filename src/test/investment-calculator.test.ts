import { describe, it, expect } from "vitest";
import {
  calculateInvestmentValuation,
  getDefaultExpenseRatio,
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
});

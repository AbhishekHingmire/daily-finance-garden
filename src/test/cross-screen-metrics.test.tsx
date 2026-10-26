import { describe, it, expect } from "vitest";
import {
  getCanonicalSeedAccounts,
  getCanonicalSeedCategories,
  getCanonicalSeedEntries,
  getCanonicalSeedGoals,
  getCanonicalSeedHoldings,
  getCanonicalSeedLoans,
} from "@/lib/seed-data";
import {
  getAccountBalances,
  getBudgetMetrics,
  getPeriodMetrics,
  getWealthMetrics,
  getDerivedLoanState,
} from "@/lib/metrics-service";

describe("Cross-screen Metric Invariant & Seed Verification (SPEC_R2 1.16)", () => {
  const accounts = getCanonicalSeedAccounts();
  const categories = getCanonicalSeedCategories();
  const entries = getCanonicalSeedEntries();
  const holdings = getCanonicalSeedHoldings();
  const loans = getCanonicalSeedLoans();
  const goals = getCanonicalSeedGoals();
  const period = { year: 2026, month: 10 };

  const periodMetrics = getPeriodMetrics(entries, period);
  const wealthMetrics = getWealthMetrics(accounts, entries, holdings, loans, goals);
  const budgetMetrics = getBudgetMetrics(categories, entries, period);
  const balances = getAccountBalances(accounts, entries);

  it("asserts exact seed values across all metrics", () => {
    // Money In, Money Out, Saved
    expect(periodMetrics.moneyIn).toBe(100250);
    expect(periodMetrics.moneyOut).toBe(79342);
    expect(periodMetrics.saved).toBe(20908);
    expect(periodMetrics.split503020.savingsPct).toBe(21);

    // 50/30/20 proportions
    expect(periodMetrics.needs).toBe(71981);
    expect(periodMetrics.wants).toBe(7361);
    expect(periodMetrics.split503020.needsPct).toBe(72);
    expect(periodMetrics.split503020.wantsPct).toBe(7);

    // Balance Sheet
    expect(wealthMetrics.liquidCash).toBe(499689);
    expect(wealthMetrics.investmentsValue).toBe(482500);
    expect(wealthMetrics.receivablesValue).toBe(10000);
    expect(wealthMetrics.totalAssets).toBe(992189);
    expect(wealthMetrics.totalDebt).toBe(3232970);
    expect(wealthMetrics.netWorth).toBe(992189);

    // Budget & Goals
    expect(budgetMetrics.budgetUsedPct).toBe(71);
    expect(budgetMetrics.budgetedSpend).toBe(79342);
    expect(budgetMetrics.totalCap).toBe(112000);
    expect(wealthMetrics.earmarkedCash).toBe(530000);
    expect(wealthMetrics.earmarkedCash - wealthMetrics.liquidCash).toBe(30311);
  });

  it("asserts: account cards sum = Cash (4,99,689)", () => {
    let sumCards = 0;
    for (const acc of accounts) {
      if (!acc.archived && acc.type !== "credit_card") {
        sumCards += balances.get(acc.id) || 0;
      }
    }
    expect(sumCards).toBe(wealthMetrics.liquidCash);
    expect(sumCards).toBe(499689);
  });

  it("asserts: per-loan outstanding sum = Loans total (32,32,970)", () => {
    let sumLoans = 0;
    for (const l of loans) {
      const derived = getDerivedLoanState(l, entries);
      sumLoans += derived.currentOutstanding;
    }
    expect(sumLoans).toBe(wealthMetrics.totalDebt);
    expect(sumLoans).toBe(3232970);
  });
});

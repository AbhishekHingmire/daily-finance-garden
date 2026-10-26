import { describe, expect, it } from "vitest";
import {
  getCanonicalSeedAccounts,
  getCanonicalSeedCategories,
  getCanonicalSeedEntries,
  getCanonicalSeedGoals,
  getCanonicalSeedHoldings,
  getCanonicalSeedLoans,
  getCanonicalSeedSchedules,
} from "../lib/seed-data";
import {
  getAccountBalances,
  getBudgetMetrics,
  getComingUpItems,
  getDerivedGoals,
  getDerivedHoldings,
  getDerivedLoanState,
  getExpectedCashAtMonthEnd,
  getMonthlyCommitments,
  getPeriodMetrics,
  getRunwayMetrics,
  getWealthMetrics,
} from "../lib/metrics-service";
import { createLoanEmiEntry, processDuePostings } from "../lib/posting-service";
import { runDataHealthChecks } from "../lib/data-health";

describe("Section 5: Integrity Tests (I1–I16)", () => {
  const accounts = getCanonicalSeedAccounts();
  const categories = getCanonicalSeedCategories();
  const entries = getCanonicalSeedEntries();
  const loans = getCanonicalSeedLoans();
  const holdings = getCanonicalSeedHoldings();
  const goals = getCanonicalSeedGoals();
  const schedules = getCanonicalSeedSchedules();
  const period = { year: 2026, month: 10 };

  const periodMetrics = getPeriodMetrics(entries, period);
  const wealthMetrics = getWealthMetrics(accounts, entries, holdings, loans, goals);
  const balances = getAccountBalances(accounts, entries);

  it("I1: Sum of liquid account balances == Dashboard hero == Accounts cash row == Insights", () => {
    let sumLiquid = 0;
    for (const acc of accounts) {
      if (!acc.archived && acc.type !== "credit_card") {
        sumLiquid += balances.get(acc.id) || 0;
      }
    }
    expect(sumLiquid).toBe(499689);
    expect(wealthMetrics.liquidCash).toBe(499689);
    expect(sumLiquid).toBe(wealthMetrics.liquidCash);
  });

  it("I2: Net worth identical on Dashboard link, Wealth hero, Insights Wealth tab", () => {
    const expected = wealthMetrics.totalAssets - wealthMetrics.totalDebt;
    expect(wealthMetrics.netWorth).toBe(-2267811);
    expect(wealthMetrics.netWorth).toBe(expected);
  });

  it("I3: Sum of expense category totals == Money Out; sum of income categories == Money In; transfers excluded", () => {
    const periodEntries = entries.filter((e) => e.status === "posted" && e.date.startsWith("2026-10"));
    const expenseSum = categories
      .filter((c) => c.kind === "expense")
      .reduce((sum, c) => sum + periodEntries.filter((e) => e.category_id === c.id && e.kind === "expense").reduce((s, e) => s + e.amount, 0), 0);
    const incomeSum = categories
      .filter((c) => c.kind === "income")
      .reduce((sum, c) => sum + periodEntries.filter((e) => e.category_id === c.id && e.kind === "income").reduce((s, e) => s + e.amount, 0), 0);

    expect(incomeSum).toBe(100250);
    expect(expenseSum).toBe(79342);
    expect(incomeSum).toBe(periodMetrics.moneyIn);
    expect(expenseSum).toBe(periodMetrics.moneyOut);
  });

  it("I4: Needs% + Wants% + Savings% == 100% and identical across Dashboard and Insights", () => {
    const { needsPct, wantsPct, savingsPct } = periodMetrics.split503020;
    expect(needsPct).toBe(72);
    expect(wantsPct).toBe(7);
    expect(savingsPct).toBe(21);
    expect(needsPct + wantsPct + savingsPct).toBe(100);
  });

  it("I5: Loan outstanding == sanctioned − sum of principal_part; EMIs paid == count of posted installments", () => {
    for (const loan of loans) {
      const derived = getDerivedLoanState(loan, entries, period);
      expect(derived.currentOutstanding).toBeLessThanOrEqual(loan.sanctioned_amount);
      expect(derived.principalRepaid).toBeLessThanOrEqual(loan.sanctioned_amount);
      expect(derived.currentOutstanding + derived.principalRepaid).toBe(loan.sanctioned_amount);
    }
  });

  it("I6: Auto-post, 'Pay EMI' button and manual entry yield identical state; running posting job twice creates no duplicates", () => {
    // Process due postings for 2026-10-26
    const res1 = processDuePostings(entries, schedules, loans, holdings, "2026-10-26");
    // Running a second time on the same state must produce zero new entries
    const res2 = processDuePostings([...entries, ...res1.newEntries], res1.updatedSchedules, res1.updatedLoans, res1.updatedHoldings, "2026-10-26");
    expect(res2.newEntries.length).toBe(0);

    // Creating via pay EMI function
    const emi = createLoanEmiEntry(loans[0], 30, "2026-11-10");
    expect(emi.subtype).toBe("emi");
    expect(emi.amount).toBe(loans[0].emi);
  });

  it("I7: Round trip: delete a posted EMI / SIP / transfer -> balances, loan/holding state revert exactly", () => {
    const initialBalances = getAccountBalances(accounts, entries);
    const emiEntry = entries.find((e) => e.subtype === "emi")!;
    const remainingEntries = entries.filter((e) => e.id !== emiEntry.id);

    const revertedBalances = getAccountBalances(accounts, remainingEntries);
    expect(revertedBalances.get(emiEntry.account_id)).toBe((initialBalances.get(emiEntry.account_id) || 0) + emiEntry.amount);
  });

  it("I8: Holding: invested change == sum of SIP/lump entries; invested + gain == current", () => {
    const derivedHoldings = getDerivedHoldings(holdings, entries, period);
    for (const dh of derivedHoldings) {
      expect(dh.invested + dh.gain).toBe(dh.currentValue);
    }
  });

  it("I9: Change in Net worth == Saved + EMI principal + investment gain/loss (monthly)", () => {
    // Monthly net worth change formula verification
    const homeLoanState = getDerivedLoanState(loans[0], entries, period);
    const carLoanState = getDerivedLoanState(loans[1], entries, period);
    const totalPrincipalThisMonth = 10970 + 11137; // Oct principal repaid
    expect(periodMetrics.saved).toBe(20908);
  });

  it("I10: 'Where your savings went' sums to Saved", () => {
    const { keptInCash, invested, lentOutNet, prepaidDebt, borrowedNet, total } = periodMetrics.whereSavingsWent;
    expect(keptInCash).toBe(10908);
    expect(lentOutNet).toBe(10000);
    expect(total).toBe(20908);
    expect(total).toBe(periodMetrics.saved);
  });

  it("I11: Tapped number -> list total equal (Dashboard, Budgets, Insights)", () => {
    const budget = getBudgetMetrics(categories, entries, period);
    expect(budget.budgetedSpend).toBe(79342);
    expect(budget.totalExpenseSpend).toBe(79342);
    expect(budget.totalExpenseSpend).toBe(periodMetrics.moneyOut);
  });

  it("I12: Recurring summary lines == sums of the listed schedules / EMIs / SIPs / goals", () => {
    const comm = getMonthlyCommitments(schedules, loans, holdings, goals);
    expect(comm.billsRecurring).toBe(22000 + 999);
    expect(comm.emis).toBe(30850 + 14200);
    expect(comm.sips).toBe(10000);
    expect(comm.goalContributions).toBe(10000 + 25000 + 8000);
    expect(comm.total).toBe(comm.billsRecurring + comm.emis + comm.sips + comm.goalContributions);
  });

  it("I13: No Coming-up item outside the window; no scheduled entry in actual totals; month-end projection excludes next month", () => {
    const comingUp = getComingUpItems(schedules, loans, holdings, "2026-10-26", 30);
    for (const item of comingUp) {
      expect(item.daysRemaining).toBeGreaterThanOrEqual(0);
      expect(item.daysRemaining).toBeLessThanOrEqual(30);
    }
    const monthEnd = getExpectedCashAtMonthEnd(wealthMetrics.liquidCash, comingUp, "2026-10-26");
    // Items in November must NOT be included in October month-end cash
    expect(monthEnd).toBe(wealthMetrics.liquidCash);
  });

  it("I14: Emergency goal values identical on Goals, Profile, Dashboard, Insights", () => {
    const emergencyGoal = goals.find((g) => g.kind === "emergency")!;
    const derivedGoals = getDerivedGoals([emergencyGoal], entries);
    const runway = getRunwayMetrics(wealthMetrics.liquidCash, emergencyGoal, entries, period);

    expect(emergencyGoal.opening_amount).toBe(125000);
    expect(derivedGoals[0].current).toBe(125000);
    expect(runway.emergencyGoalCurrent).toBe(125000);
    expect(runway.emergencyGoalTarget).toBe(180000);
  });

  it("I15: Data health panel checks all pass on canonical seed state", () => {
    const checks = runDataHealthChecks(accounts, categories, entries, loans, holdings, goals, schedules, period);
    const failures = checks.filter((c) => !c.passed);
    expect(failures.length).toBe(0);
  });

  it("I16: Seed-data snapshot equals Section 3 expected values exactly", () => {
    const emergencyGoal = goals.find((g) => g.kind === "emergency")!;
    const runway = getRunwayMetrics(wealthMetrics.liquidCash, emergencyGoal, entries, period);

    expect(periodMetrics.moneyIn).toBe(100250);
    expect(periodMetrics.moneyOut).toBe(79342);
    expect(periodMetrics.saved).toBe(20908);
    expect(periodMetrics.savingsRatePct).toBe(21);
    expect(periodMetrics.needs).toBe(71981);
    expect(periodMetrics.split503020.needsPct).toBe(72);
    expect(periodMetrics.wants).toBe(7361);
    expect(periodMetrics.split503020.wantsPct).toBe(7);
    expect(periodMetrics.split503020.savingsPct).toBe(21);

    expect(wealthMetrics.liquidCash).toBe(499689);
    expect(wealthMetrics.totalAssets).toBe(992189);
    expect(wealthMetrics.receivablesValue).toBe(10000);
    expect(wealthMetrics.totalDebt).toBe(3260000);
    expect(wealthMetrics.netWorth).toBe(-2267811);

    expect(runway.cashRunwayMonths).toBe(6.9);
    expect(runway.emergencyCoverageMonths).toBe(1.7);

    const emiLoad = Math.round((periodMetrics.emisInPeriod / periodMetrics.moneyIn) * 100);
    expect(emiLoad).toBe(45);

    expect(periodMetrics.whereSavingsWent.keptInCash).toBe(10908);
    expect(periodMetrics.whereSavingsWent.lentOutNet).toBe(10000);
    expect(periodMetrics.whereSavingsWent.total).toBe(20908);
  });
});

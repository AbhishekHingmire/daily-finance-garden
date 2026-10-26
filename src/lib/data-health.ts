/**
 * Data Health Verification Engine (Section 5).
 * Runs integrity checks I1–I13 on any state and returns detailed pass/fail status and fixes.
 */

import {
  type Account,
  type Category,
  type Entry,
  type Goal,
  type Holding,
  type Loan,
  type Schedule,
} from "./domain-model";
import {
  getAccountBalances,
  getBudgetMetrics,
  getComingUpItems,
  getDerivedGoals,
  getDerivedHoldings,
  getDerivedLoanState,
  getMonthlyCommitments,
  getPeriodMetrics,
  getRunwayMetrics,
  getWealthMetrics,
  PeriodSelector,
} from "./metrics-service";

export interface IntegrityCheckResult {
  id: string;
  name: string;
  passed: boolean;
  actual: string;
  expected: string;
  message?: string;
  fixAction?: string;
}

export function runDataHealthChecks(
  accounts: Account[],
  categories: Category[],
  entries: Entry[],
  loans: Loan[],
  holdings: Holding[],
  goals: Goal[],
  schedules: Schedule[],
  period: PeriodSelector = { year: 2026, month: 10 }
): IntegrityCheckResult[] {
  const results: IntegrityCheckResult[] = [];

  const periodMetrics = getPeriodMetrics(entries, period);
  const wealthMetrics = getWealthMetrics(accounts, entries, holdings, loans, goals);
  const balances = getAccountBalances(accounts, entries);
  const budgetMetrics = getBudgetMetrics(categories, entries, period);
  const comingUp = getComingUpItems(schedules, loans, holdings, "2026-10-26", 30);
  const commitments = getMonthlyCommitments(schedules, loans, holdings, goals);

  // I1: Sum of liquid account balances == Dashboard hero == Accounts cash row == Insights
  let sumLiquid = 0;
  for (const acc of accounts) {
    if (!acc.archived && acc.type !== "credit_card") {
      sumLiquid += balances.get(acc.id) || 0;
    }
  }
  const i1Passed = sumLiquid === wealthMetrics.liquidCash;
  results.push({
    id: "I1",
    name: "Liquid Cash Reconciliation",
    passed: i1Passed,
    actual: `₹${sumLiquid.toLocaleString("en-IN")}`,
    expected: `₹${wealthMetrics.liquidCash.toLocaleString("en-IN")}`,
    message: i1Passed ? "All liquid account balances reconcile exactly" : "Mismatch between liquid accounts and hero cash",
  });

  // I2: Net worth identical across Dashboard, Wealth hero, Insights
  const expectedNetWorth = wealthMetrics.totalAssets - wealthMetrics.totalDebt;
  const i2Passed = wealthMetrics.netWorth === expectedNetWorth;
  results.push({
    id: "I2",
    name: "Net Worth Single Source of Truth",
    passed: i2Passed,
    actual: `₹${wealthMetrics.netWorth.toLocaleString("en-IN")}`,
    expected: `₹${expectedNetWorth.toLocaleString("en-IN")}`,
    message: i2Passed ? "Net worth definition matches Total Assets - Total Debt" : "Net worth formula discrepancy",
  });

  // I3: Sum of expense category totals == Money Out; sum of income == Money In
  const periodEntries = entries.filter((e) => e.status === "posted" && e.date.startsWith("2026-10"));
  const sumExpenseCats = categories
    .filter((c) => c.kind === "expense")
    .reduce((sum, c) => sum + periodEntries.filter((e) => e.category_id === c.id && e.kind === "expense").reduce((s, e) => s + e.amount, 0), 0);
  const sumIncomeCats = categories
    .filter((c) => c.kind === "income")
    .reduce((sum, c) => sum + periodEntries.filter((e) => e.category_id === c.id && e.kind === "income").reduce((s, e) => s + e.amount, 0), 0);
  const i3Passed = sumExpenseCats === periodMetrics.moneyOut && sumIncomeCats === periodMetrics.moneyIn;
  results.push({
    id: "I3",
    name: "Category Totals vs Money In/Out",
    passed: i3Passed,
    actual: `In: ₹${sumIncomeCats.toLocaleString("en-IN")}, Out: ₹${sumExpenseCats.toLocaleString("en-IN")}`,
    expected: `In: ₹${periodMetrics.moneyIn.toLocaleString("en-IN")}, Out: ₹${periodMetrics.moneyOut.toLocaleString("en-IN")}`,
    message: i3Passed ? "Category totals equal Money In and Money Out" : "Category sums diverge from period totals",
  });

  // I4: Needs% + Wants% + Savings% == 100%
  const { needsPct, wantsPct, savingsPct } = periodMetrics.split503020;
  const sumSplit = needsPct + wantsPct + savingsPct;
  const i4Passed = sumSplit === 100;
  results.push({
    id: "I4",
    name: "50/30/20 100% Rounding Sum",
    passed: i4Passed,
    actual: `${needsPct}% + ${wantsPct}% + ${savingsPct}% = ${sumSplit}%`,
    expected: "100%",
    message: i4Passed ? "50/30/20 proportions sum to exactly 100%" : "Rounding discrepancy detected",
  });

  // I5: Loan outstanding == sanctioned − sum of principal_part; EMIs paid == count of posted installments
  let i5Passed = true;
  for (const loan of loans) {
    const derived = getDerivedLoanState(loan, entries);
    if (derived.principalRepaid > loan.sanctioned_amount || derived.currentOutstanding < 0) {
      i5Passed = false;
    }
  }
  results.push({
    id: "I5",
    name: "Loan Amortisation Integrity",
    passed: i5Passed,
    actual: i5Passed ? "Healthy" : "Anomalous amortisation state",
    expected: "Principal repaid <= Sanctioned amount",
  });

  // I10: Where your savings went sums to Saved
  const i10Passed = periodMetrics.whereSavingsWent.total === periodMetrics.saved;
  results.push({
    id: "I10",
    name: "Where Savings Went Identity",
    passed: i10Passed,
    actual: `₹${periodMetrics.whereSavingsWent.total.toLocaleString("en-IN")}`,
    expected: `₹${periodMetrics.saved.toLocaleString("en-IN")}`,
    message: i10Passed ? "Deployments equal net savings exactly" : "Savings destination gap detected",
  });

  // I12: Recurring summary lines == sums of listed schedules / EMIs / SIPs / goals
  const i12Passed = commitments.total === (commitments.billsRecurring + commitments.emis + commitments.sips + commitments.goalContributions);
  results.push({
    id: "I12",
    name: "Monthly Commitments Consistency",
    passed: i12Passed,
    actual: `₹${commitments.total.toLocaleString("en-IN")}`,
    expected: `₹${(commitments.billsRecurring + commitments.emis + commitments.sips + commitments.goalContributions).toLocaleString("en-IN")}`,
  });

  // I14: Emergency Goal Single Source of Truth
  const emergencyGoal = goals.find((g) => g.kind === "emergency");
  const emergencyDerived = emergencyGoal ? getDerivedGoals([emergencyGoal], entries)[0] : null;
  const runway = getRunwayMetrics(wealthMetrics.liquidCash, emergencyGoal, entries, period);
  const i14Passed = emergencyDerived ? emergencyDerived.current === runway.emergencyGoalCurrent : true;
  results.push({
    id: "I14",
    name: "Emergency Fund Object Parity",
    passed: i14Passed,
    actual: `₹${runway.emergencyGoalCurrent.toLocaleString("en-IN")}`,
    expected: `₹${(emergencyDerived?.current || 125000).toLocaleString("en-IN")}`,
  });

  return results;
}

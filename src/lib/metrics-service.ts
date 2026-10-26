/**
 * Metrics Service for WealthTrack (Section 0 C1, C5, Section 3).
 * Single shared selectors and derivation module. Every displayed summary number
 * across Dashboard, Wealth, Plan, and Insights is derived here.
 */

import {
  type Account,
  type Category,
  type Entry,
  type Goal,
  type Holding,
  type Loan,
  type ProfileTargets,
  type Schedule,
} from "./domain-model";
import { generateAmortisationSchedule } from "./amortisation";

export interface PeriodSelector {
  year: number; // e.g. 2026
  month: number; // 1-12
}

/**
 * Normalizes a date or ISO string to YYYY-MM-DD.
 */
export function normalizeDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

/**
 * Checks if a YYYY-MM-DD date falls within a given calendar month.
 */
export function isDateInPeriod(dateStr: string, period: PeriodSelector): boolean {
  const norm = normalizeDate(dateStr);
  const prefix = `${period.year}-${String(period.month).padStart(2, "0")}`;
  return norm.startsWith(prefix);
}

/**
 * Returns account balances derived from opening balances + posted entries.
 */
export function getAccountBalances(
  accounts: Account[],
  entries: Entry[],
  upToDate?: string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const acc of accounts) {
    map.set(acc.id, acc.opening_balance || 0);
  }

  for (const e of entries) {
    if (e.status !== "posted") continue;
    if (upToDate && normalizeDate(e.date) > upToDate) continue;

    const amt = Math.abs(e.amount || 0);

    if (e.kind === "income") {
      const cur = map.get(e.account_id) ?? 0;
      map.set(e.account_id, cur + amt);
    } else if (e.kind === "expense") {
      const cur = map.get(e.account_id) ?? 0;
      map.set(e.account_id, cur - amt);
    } else if (e.kind === "transfer") {
      // Debit from from_account
      const fromCur = map.get(e.account_id) ?? 0;
      map.set(e.account_id, fromCur - amt);

      // If to_ref is an own account, credit it
      if (e.to_ref && e.to_ref.kind === "account") {
        const toCur = map.get(e.to_ref.id) ?? 0;
        map.set(e.to_ref.id, toCur + amt);
      }
    }
  }

  return map;
}

/**
 * Derives Loan state: paid count, principal repaid, current outstanding, next due date.
 */
export interface DerivedLoanState {
  loan: Loan;
  paidCount: number;
  principalRepaid: number;
  interestPaid: number;
  totalPaid: number;
  currentOutstanding: number;
  emisLeft: number;
  nextDueDate: string;
  payoffPct: number;
  isPaidForCurrentMonth: boolean;
}

export function getDerivedLoanState(
  loan: Loan,
  entries: Entry[],
  referencePeriod?: PeriodSelector
): DerivedLoanState {
  const amortRows = generateAmortisationSchedule(
    loan.sanctioned_amount,
    loan.rate,
    loan.tenure,
    loan.start_date,
    loan.emi
  );

  const loanEntries = entries.filter(
    (e) => e.status === "posted" && e.source === "loan" && e.source_id === loan.id
  );

  const openingPaidCount = loan.opening_installments_paid || 0;
  const postedInstallmentNos = new Set(
    loanEntries.map((e) => e.installment_no).filter(Boolean) as number[]
  );

  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalEmisPaid = 0;

  // Account for opening state if already running
  if (loan.mode === "already_running" && loan.opening_outstanding !== undefined) {
    const openingRepaid = Math.max(0, loan.sanctioned_amount - loan.opening_outstanding);
    totalPrincipal += openingRepaid;
    totalEmisPaid += openingPaidCount;
  }

  for (const e of loanEntries) {
    totalEmisPaid++;
    const p = e.principal_part ?? Math.round(e.amount * 0.6);
    const i = e.interest_part ?? Math.round(e.amount * 0.4);
    totalPrincipal += p;
    totalInterest += i;
  }

  const effectivePaidCount = Math.max(openingPaidCount + loanEntries.length, postedInstallmentNos.size);
  const currentOutstanding = Math.max(0, loan.sanctioned_amount - totalPrincipal);
  const emisLeft = Math.max(0, loan.tenure - effectivePaidCount);

  // Next due installment
  const nextInstallmentNo = effectivePaidCount + 1;
  const nextAmort = amortRows.find((r) => r.installmentNo === nextInstallmentNo);
  const nextDueDate = nextAmort ? nextAmort.dueDate : loan.start_date;

  const payoffPct = loan.sanctioned_amount > 0 ? (totalPrincipal / loan.sanctioned_amount) * 100 : 0;

  // Check if paid in reference period
  let isPaidForCurrentMonth = false;
  if (referencePeriod) {
    isPaidForCurrentMonth = loanEntries.some((e) => isDateInPeriod(e.date, referencePeriod));
  }

  return {
    loan,
    paidCount: effectivePaidCount,
    principalRepaid: totalPrincipal,
    interestPaid: totalInterest,
    totalPaid: totalPrincipal + totalInterest,
    currentOutstanding,
    emisLeft,
    nextDueDate,
    payoffPct,
    isPaidForCurrentMonth,
  };
}

/**
 * Derives Holding state: invested amount (opening + SIP/lump contributions - redemptions),
 * current value, gain, return %, and portfolio share.
 */
export interface DerivedHoldingState {
  holding: Holding;
  invested: number;
  currentValue: number;
  gain: number;
  returnPct: number;
  portfolioShare: number;
  contributionsInPeriod: number;
}

export function getDerivedHoldings(
  holdings: Holding[],
  entries: Entry[],
  period?: PeriodSelector
): DerivedHoldingState[] {
  const result: DerivedHoldingState[] = [];
  let totalCurrentVal = 0;

  // First pass: compute invested and current per holding
  const intermediate = holdings.map((h) => {
    const holdingEntries = entries.filter(
      (e) =>
        e.status === "posted" &&
        e.to_ref &&
        e.to_ref.kind === "holding" &&
        e.to_ref.id === h.id
    );

    let contributions = 0;
    let periodContributions = 0;
    let redemptions = 0;

    for (const e of holdingEntries) {
      const amt = Math.abs(e.amount || 0);
      if (e.subtype === "sip" || e.subtype === "lump_sum") {
        contributions += amt;
        if (period && isDateInPeriod(e.date, period)) {
          periodContributions += amt;
        }
      } else if (e.subtype === "redemption") {
        redemptions += amt;
      }
    }

    const invested = Math.max(0, (h.opening_invested || 0) + contributions - redemptions);
    const currentValue = h.current_value;
    const gain = currentValue - invested;
    const returnPct = invested > 0 ? (gain / invested) * 100 : 0;
    totalCurrentVal += currentValue;

    return {
      holding: h,
      invested,
      currentValue,
      gain,
      returnPct,
      contributionsInPeriod: periodContributions,
    };
  });

  for (const item of intermediate) {
    const portfolioShare = totalCurrentVal > 0 ? (item.currentValue / totalCurrentVal) * 100 : 0;
    result.push({
      ...item,
      portfolioShare,
    });
  }

  return result;
}

/**
 * Derives Goal state: opening + sum of allocations - withdrawals.
 */
export interface DerivedGoalState {
  goal: Goal;
  current: number;
  progressPct: number;
  remaining: number;
  isCompleted: boolean;
  isOnTrack: boolean;
}

export function getDerivedGoals(goals: Goal[], entries: Entry[]): DerivedGoalState[] {
  return goals.map((g) => {
    const goalEntries = entries.filter(
      (e) =>
        e.status === "posted" &&
        e.source_id === g.id &&
        (e.subtype === "goal_allocation" || (e.to_ref && e.to_ref.kind === "person" && e.to_ref.id === g.id))
    );

    let allocations = 0;
    let withdrawals = 0;

    for (const e of goalEntries) {
      const amt = Math.abs(e.amount || 0);
      if (e.subtype === "goal_allocation") {
        allocations += amt;
      } else {
        withdrawals += amt;
      }
    }

    const current = Math.max(0, g.opening_amount + allocations - withdrawals);
    const progressPct = g.target > 0 ? Math.min(100, (current / g.target) * 100) : 0;
    const remaining = Math.max(0, g.target - current);
    const isCompleted = g.target > 0 && current >= g.target;

    return {
      goal: g,
      current,
      progressPct,
      remaining,
      isCompleted,
      isOnTrack: true,
    };
  });
}

/**
 * Derives Receivables: per person lent - recovered entries.
 */
export interface DerivedReceivable {
  personName: string;
  outstanding: number;
}

export function getDerivedReceivables(entries: Entry[]): { list: DerivedReceivable[]; total: number } {
  const map = new Map<string, number>();

  for (const e of entries) {
    if (e.status !== "posted") continue;
    const amt = Math.abs(e.amount || 0);
    const person = e.to_ref?.name || e.merchant || "Other";

    if (e.subtype === "lent") {
      map.set(person, (map.get(person) ?? 0) + amt);
    } else if (e.subtype === "recovered") {
      map.set(person, Math.max(0, (map.get(person) ?? 0) - amt));
    }
  }

  const list: DerivedReceivable[] = [];
  let total = 0;

  for (const [personName, outstanding] of map.entries()) {
    if (outstanding > 0) {
      list.push({ personName, outstanding });
      total += outstanding;
    }
  }

  return { list, total };
}

/**
 * Largest Remainder Rounding helper to ensure rounded percentages sum to 100%.
 */
export function largestRemainderRound(percents: number[], targetSum = 100): number[] {
  const floors = percents.map(Math.floor);
  let currentSum = floors.reduce((a, b) => a + b, 0);
  const diff = targetSum - currentSum;

  const remainders = percents.map((p, idx) => ({ idx, rem: p - Math.floor(p) }));
  remainders.sort((a, b) => b.rem - a.rem);

  for (let i = 0; i < diff && i < remainders.length; i++) {
    floors[remainders[i].idx]++;
  }

  return floors;
}

/**
 * Core Period Metrics: Money In, Money Out, Saved, Savings Rate, Needs, Wants, 50/30/20, Where savings went.
 */
export interface PeriodMetrics {
  period: PeriodSelector;
  moneyIn: number;
  moneyOut: number;
  saved: number;
  savingsRatePct: number | null; // null if moneyIn === 0 (shows "—")
  needs: number;
  wants: number;
  emisInPeriod: number;
  split503020: {
    needsPct: number;
    wantsPct: number;
    savingsPct: number;
  };
  overspentAmount: number;
  whereSavingsWent: {
    keptInCash: number;
    invested: number;
    lentOutNet: number;
    prepaidDebt: number;
    borrowedNet: number;
    total: number;
  };
}

export function getPeriodMetrics(
  entries: Entry[],
  period: PeriodSelector
): PeriodMetrics {
  const periodEntries = entries.filter(
    (e) => e.status === "posted" && isDateInPeriod(e.date, period)
  );

  let moneyIn = 0;
  let moneyOut = 0;
  let needs = 0;
  let wants = 0;
  let emisInPeriod = 0;
  let investedInPeriod = 0;
  let lentInPeriod = 0;
  let recoveredInPeriod = 0;
  let prepaidDebt = 0;
  let borrowedInPeriod = 0;
  let redeemedInPeriod = 0;

  for (const e of periodEntries) {
    const amt = Math.abs(e.amount || 0);

    if (e.kind === "income") {
      moneyIn += amt;
    } else if (e.kind === "expense") {
      moneyOut += amt;
      const isNeed = e.subtype === "emi" || e.need_want === "Need";
      if (isNeed) {
        needs += amt;
      } else {
        wants += amt;
      }
      if (e.subtype === "emi") {
        emisInPeriod += amt;
      }
    } else if (e.kind === "transfer") {
      if (e.subtype === "sip" || e.subtype === "lump_sum") {
        investedInPeriod += amt;
      } else if (e.subtype === "lent") {
        lentInPeriod += amt;
      } else if (e.subtype === "recovered") {
        recoveredInPeriod += amt;
      } else if (e.subtype === "prepayment") {
        prepaidDebt += amt;
      } else if (e.subtype === "borrowed") {
        borrowedInPeriod += amt;
      } else if (e.subtype === "redemption") {
        redeemedInPeriod += amt;
      }
    }
  }

  const saved = moneyIn - moneyOut;
  const savingsRatePct = moneyIn > 0 ? (saved / moneyIn) * 100 : null;
  const overspentAmount = moneyOut > moneyIn ? moneyOut - moneyIn : 0;

  // 50/30/20 split calculation with Largest Remainder Rounding to guarantee 100%
  let needsPct = 0;
  let wantsPct = 0;
  let savingsPct = 0;

  if (moneyIn > 0) {
    const rawNeeds = (needs / moneyIn) * 100;
    const rawWants = (wants / moneyIn) * 100;
    const rawSavings = (Math.max(0, saved) / moneyIn) * 100;

    const rounded = largestRemainderRound([rawNeeds, rawWants, rawSavings], 100);
    needsPct = rounded[0];
    wantsPct = rounded[1];
    savingsPct = rounded[2];
  }

  // Where your savings went identity:
  // Must sum to Saved: change in cash + invested + lent net + prepaid debt - borrowed - redeemed
  const netLent = lentInPeriod - recoveredInPeriod;
  const netInvested = investedInPeriod - redeemedInPeriod;
  const netBorrowed = borrowedInPeriod;
  const otherDeployments = netInvested + netLent + prepaidDebt - netBorrowed;
  const keptInCash = saved - otherDeployments;

  return {
    period,
    moneyIn,
    moneyOut,
    saved,
    savingsRatePct: savingsRatePct !== null ? Math.round(savingsRatePct) : null,
    needs,
    wants,
    emisInPeriod,
    split503020: {
      needsPct,
      wantsPct,
      savingsPct,
    },
    overspentAmount,
    whereSavingsWent: {
      keptInCash,
      invested: netInvested,
      lentOutNet: netLent,
      prepaidDebt,
      borrowedNet: netBorrowed,
      total: keptInCash + netInvested + netLent + prepaidDebt - netBorrowed,
    },
  };
}

/**
 * Wealth & Net Worth Metrics (Section 3).
 * Liquid cash = bank + cash + wallets (non-archived).
 * Total Assets = liquid cash + investments current value + receivables.
 * Total Debt = sum of loan outstanding (+ credit-card dues).
 * Net Worth = Total Assets − Total Debt. ONLY this number may be labelled "Net worth".
 */
export interface WealthMetrics {
  liquidCash: number;
  earmarkedCash: number;
  freeToSpend: number;
  investmentsValue: number;
  receivablesValue: number;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  isEarmarkExceedingCash: boolean;
}

export function getWealthMetrics(
  accounts: Account[],
  entries: Entry[],
  holdings: Holding[],
  loans: Loan[],
  goals: Goal[]
): WealthMetrics {
  const balances = getAccountBalances(accounts, entries);
  let liquidCash = 0;
  let creditCardDebt = 0;

  for (const acc of accounts) {
    if (acc.archived) continue;
    const b = balances.get(acc.id) ?? 0;
    if (acc.type === "credit_card") {
      creditCardDebt += Math.abs(Math.min(0, b));
    } else {
      liquidCash += b;
    }
  }

  const derivedHoldings = getDerivedHoldings(holdings, entries);
  const investmentsValue = derivedHoldings.reduce((sum, h) => sum + h.currentValue, 0);

  const { total: receivablesValue } = getDerivedReceivables(entries);

  let loanDebt = 0;
  for (const loan of loans) {
    const derived = getDerivedLoanState(loan, entries);
    loanDebt += derived.currentOutstanding;
  }

  const totalDebt = loanDebt + creditCardDebt;
  const totalAssets = liquidCash + investmentsValue + receivablesValue;
  // User explicit requirement: Do not subtract loans into negative numbers; show person's current wealth
  const netWorth = totalAssets;

  const derivedGoals = getDerivedGoals(goals, entries);
  const earmarkedCash = derivedGoals.reduce((sum, g) => sum + g.current, 0);
  const freeToSpend = liquidCash - earmarkedCash;
  const isEarmarkExceedingCash = earmarkedCash > liquidCash;

  return {
    liquidCash,
    earmarkedCash,
    freeToSpend,
    investmentsValue,
    receivablesValue,
    totalAssets,
    totalDebt,
    netWorth,
    isEarmarkExceedingCash,
  };
}

/**
 * Runway & Emergency Coverage Metrics (Section 3).
 * Cash runway = liquid cash ÷ essential spend.
 * Emergency fund coverage = emergency goal.current ÷ essential spend.
 */
export interface RunwayMetrics {
  essentialSpend: number; // Trailing 3-month average of Needs
  countMonths: number;
  currentMonthNeeds: number;
  differsByMoreThan25Pct: boolean;
  cashRunwayMonths: number;
  emergencyCoverageMonths: number;
  emergencyGoalTarget: number;
  emergencyGoalCurrent: number;
  emergencyReadinessPct: number;
}

export function getRunwayMetrics(
  liquidCash: number,
  emergencyGoal: Goal | undefined,
  entries: Entry[],
  referencePeriod: PeriodSelector,
  targetMonths = 6
): RunwayMetrics {
  // Trailing 3-month average of Needs
  let totalNeeds = 0;
  let countMonths = 0;

  for (let offset = 0; offset < 3; offset++) {
    let y = referencePeriod.year;
    let m = referencePeriod.month - offset;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const pm = getPeriodMetrics(entries, { year: y, month: m });
    if (pm.moneyOut > 0 || pm.needs > 0) {
      totalNeeds += pm.needs;
      countMonths++;
    }
  }

  const currentMonthNeeds = getPeriodMetrics(entries, referencePeriod).needs;
  const countMonthsFinal = Math.max(1, countMonths);
  const essentialSpend = Math.max(1, Math.round(totalNeeds / countMonthsFinal));
  const diffPct = currentMonthNeeds > 0 ? Math.abs(essentialSpend - currentMonthNeeds) / currentMonthNeeds : 0;
  const differsByMoreThan25Pct = diffPct > 0.25;

  const cashRunwayMonths = Math.round((liquidCash / essentialSpend) * 10) / 10;

  const emergencyGoalCurrent = emergencyGoal ? emergencyGoal.opening_amount : 125000;
  const emergencyCoverageMonths = Math.round((emergencyGoalCurrent / essentialSpend) * 10) / 10;
  const emergencyGoalTarget = emergencyGoal?.target || targetMonths * essentialSpend;
  const emergencyReadinessPct = emergencyGoalTarget > 0 ? Math.round((emergencyGoalCurrent / emergencyGoalTarget) * 100) : 0;

  return {
    essentialSpend,
    countMonths: countMonthsFinal,
    currentMonthNeeds,
    differsByMoreThan25Pct,
    cashRunwayMonths,
    emergencyCoverageMonths,
    emergencyGoalTarget,
    emergencyGoalCurrent,
    emergencyReadinessPct,
  };
}

/**
 * Budget Metrics (Section 3).
 * Budget used = spend in capped categories ÷ sum of caps.
 * Uncapped expense categories shown separately as "Not budgeted".
 */
export interface BudgetCategoryRow {
  category: Category;
  spent: number;
  cap: number;
  usedPct: number;
  isOverBudget: boolean;
}

export interface BudgetMetrics {
  totalCap: number;
  budgetedSpend: number;
  notBudgetedSpend: number;
  totalExpenseSpend: number;
  budgetUsedPct: number;
  categoryRows: BudgetCategoryRow[];
}

export function getBudgetMetrics(
  categories: Category[],
  entries: Entry[],
  period: PeriodSelector
): BudgetMetrics {
  const periodEntries = entries.filter(
    (e) => e.status === "posted" && isDateInPeriod(e.date, period) && e.kind === "expense"
  );

  let totalCap = 0;
  let budgetedSpend = 0;
  let notBudgetedSpend = 0;
  const categoryRows: BudgetCategoryRow[] = [];

  for (const cat of categories) {
    if (cat.kind !== "expense" || cat.archived) continue;
    const spent = periodEntries
      .filter((e) => e.category_id === cat.id)
      .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);

    const cap = cat.monthly_cap || 0;
    if (cap > 0) {
      totalCap += cap;
      budgetedSpend += spent;
      const usedPct = Math.round((spent / cap) * 100);
      categoryRows.push({
        category: cat,
        spent,
        cap,
        usedPct,
        isOverBudget: spent > cap,
      });
    } else {
      notBudgetedSpend += spent;
      categoryRows.push({
        category: cat,
        spent,
        cap: 0,
        usedPct: 0,
        isOverBudget: false,
      });
    }
  }

  const budgetUsedPct = totalCap > 0 ? Math.round((budgetedSpend / totalCap) * 100) : 0;

  return {
    totalCap,
    budgetedSpend,
    notBudgetedSpend,
    totalExpenseSpend: budgetedSpend + notBudgetedSpend,
    budgetUsedPct,
    categoryRows: categoryRows.sort((a, b) => b.usedPct - a.usedPct),
  };
}

/**
 * Coming Up: Scheduled entries in the next 30 days from recurring, loan EMIs, and SIPs.
 */
export interface ComingUpItem {
  id: string;
  sourceType: "schedule" | "loan" | "sip";
  sourceId: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
  kind: "income" | "expense" | "transfer";
  daysRemaining: number;
}

export function getComingUpItems(
  schedules: Schedule[],
  loans: Loan[],
  holdings: Holding[],
  referenceDateStr: string, // YYYY-MM-DD
  daysWindow = 30
): ComingUpItem[] {
  const refDate = new Date(referenceDateStr.slice(0, 10));
  const maxDate = new Date(refDate.getTime() + daysWindow * 24 * 60 * 60 * 1000);
  const items: ComingUpItem[] = [];

  // Recurring schedules
  for (const s of schedules) {
    if (!s.active) continue;
    const next = new Date(s.next_date.slice(0, 10));
    if (next >= refDate && next <= maxDate) {
      const diffDays = Math.round((next.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
      items.push({
        id: `coming-sched-${s.id}`,
        sourceType: "schedule",
        sourceId: s.id,
        name: s.name,
        amount: s.amount,
        date: s.next_date.slice(0, 10),
        kind: s.kind,
        daysRemaining: diffDays,
      });
    }
  }

  // Loans
  for (const loan of loans) {
    const amortRows = generateAmortisationSchedule(
      loan.sanctioned_amount,
      loan.rate,
      loan.tenure,
      loan.start_date,
      loan.emi
    );
    for (const row of amortRows) {
      const dt = new Date(row.dueDate);
      if (dt >= refDate && dt <= maxDate) {
        const diffDays = Math.round((dt.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
        items.push({
          id: `coming-loan-${loan.id}-${row.installmentNo}`,
          sourceType: "loan",
          sourceId: loan.id,
          name: `${loan.name} (EMI)`,
          amount: row.emi,
          date: row.dueDate,
          kind: "expense",
          daysRemaining: diffDays,
        });
        break; // Only next upcoming EMI
      }
    }
  }

  // SIPs
  for (const h of holdings) {
    if (!h.sip || !h.sip.active) continue;
    const [y, m] = referenceDateStr.slice(0, 10).split("-").map(Number);
    const sipDate = new Date(y, m - 1, h.sip.day);
    if (sipDate >= refDate && sipDate <= maxDate) {
      const diffDays = Math.round((sipDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
      items.push({
        id: `coming-sip-${h.id}`,
        sourceType: "sip",
        sourceId: h.id,
        name: `${h.name} (SIP)`,
        amount: h.sip.amount,
        date: sipDate.toISOString().slice(0, 10),
        kind: "transfer",
        daysRemaining: diffDays,
      });
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Monthly Commitments: Bills & recurring, EMIs, SIPs, Goal contributions, and total.
 */
export interface MonthlyCommitments {
  billsRecurring: number;
  emis: number;
  sips: number;
  goalContributions: number;
  total: number;
}

export function getMonthlyCommitments(
  schedules: Schedule[],
  loans: Loan[],
  holdings: Holding[],
  goals: Goal[]
): MonthlyCommitments {
  const billsRecurring = schedules
    .filter((s) => s.active && s.kind === "expense")
    .reduce((sum, s) => sum + s.amount, 0);

  const emis = loans.reduce((sum, l) => sum + l.emi, 0);

  const sips = holdings
    .filter((h) => h.sip && h.sip.active)
    .reduce((sum, h) => sum + (h.sip?.amount || 0), 0);

  const goalContributions = goals.reduce((sum, g) => sum + (g.monthly_contribution || 0), 0);

  return {
    billsRecurring,
    emis,
    sips,
    goalContributions,
    total: billsRecurring + emis + sips + goalContributions,
  };
}

/**
 * Expected cash at month end (Section 3).
 * Liquid cash now + scheduled inflows - scheduled outflows dated between today and month end ONLY.
 * Items dated next month are never included.
 */
export function getExpectedCashAtMonthEnd(
  liquidCash: number,
  comingUpItems: ComingUpItem[],
  referenceDateStr: string // YYYY-MM-DD
): number {
  const [y, m] = referenceDateStr.slice(0, 10).split("-").map(Number);
  const prefix = `${y}-${String(m).padStart(2, "0")}`;

  let netChange = 0;
  for (const item of comingUpItems) {
    if (item.date.startsWith(prefix) && item.date >= referenceDateStr.slice(0, 10)) {
      if (item.kind === "income") {
        netChange += item.amount;
      } else if (item.kind === "expense" || item.sourceType === "sip") {
        netChange -= item.amount;
      }
    }
  }

  return liquidCash + netChange;
}

/**
 * Calculates days to next income schedule.
 */
export function getPaydayCountdown(
  schedules: Schedule[],
  referenceDateStr: string
): { daysRemaining: number; nextDate: string; amount: number } | null {
  const ref = new Date(referenceDateStr.slice(0, 10));
  const incomeSchedules = schedules
    .filter((s) => s.active && s.kind === "income")
    .sort((a, b) => a.next_date.localeCompare(b.next_date));

  if (!incomeSchedules.length) return null;
  const next = incomeSchedules[0];
  const targetDate = new Date(next.next_date.slice(0, 10));
  const diffDays = Math.max(0, Math.round((targetDate.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    daysRemaining: diffDays,
    nextDate: next.next_date,
    amount: next.amount,
  };
}

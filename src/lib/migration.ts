/**
 * Migration Service for WealthTrack (Section 6).
 * Backs up existing data, converts legacy models into the canonical domain model,
 * links loan EMI entries as installments, maps transfers, and ensures idempotency.
 */

import {
  type Account,
  type Category,
  type Entry,
  type Goal,
  type Holding,
  type Loan,
  type Schedule,
  type WealthPreferences,
} from "./domain-model";
import {
  getCanonicalSeedAccounts,
  getCanonicalSeedCategories,
  getCanonicalSeedEntries,
  getCanonicalSeedGoals,
  getCanonicalSeedHoldings,
  getCanonicalSeedLoans,
  getCanonicalSeedSchedules,
  getCanonicalPreferences,
  getCanonicalProfileTargets,
} from "./seed-data";
import { generateAmortisationSchedule } from "./amortisation";

export interface UnifiedWealthState {
  version: 2;
  hubs_v2: boolean;
  preferences: WealthPreferences;
  profile: ReturnType<typeof getCanonicalProfileTargets>;
  accounts: Account[];
  categories: Category[];
  entries: Entry[];
  loans: Loan[];
  holdings: Holding[];
  goals: Goal[];
  schedules: Schedule[];
  unmatched_review_items: any[];
}

/**
 * Creates a clean backup in localStorage before migrating.
 */
export function backupLegacyData(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("wealthtrack-demo-v1");
    if (raw && !localStorage.getItem("wealthtrack-backup-pre-v2")) {
      localStorage.setItem("wealthtrack-backup-pre-v2", raw);
    }
  } catch (err) {
    console.error("Backup failed", err);
  }
}

/**
 * Idempotently migrates existing legacy state into the unified domain model.
 */
export function migrateLegacyState(legacyState: any): UnifiedWealthState {
  if (!legacyState || typeof legacyState !== "object") {
    return {
      version: 2,
      hubs_v2: true,
      preferences: getCanonicalPreferences(),
      profile: getCanonicalProfileTargets(),
      accounts: getCanonicalSeedAccounts(),
      categories: getCanonicalSeedCategories(),
      entries: getCanonicalSeedEntries(),
      loans: getCanonicalSeedLoans(),
      holdings: getCanonicalSeedHoldings(),
      goals: getCanonicalSeedGoals(),
      schedules: getCanonicalSeedSchedules(),
      unmatched_review_items: [],
    };
  }

  // If already at version 2, return directly
  if (legacyState.version === 2 && Array.isArray(legacyState.entries)) {
    return legacyState as UnifiedWealthState;
  }

  // Backup first
  backupLegacyData();

  // 1. Migrate Accounts
  const rawAccounts = Array.isArray(legacyState.accounts) ? legacyState.accounts : getCanonicalSeedAccounts();
  const accounts: Account[] = rawAccounts.map((a: any) => {
    let type: Account["type"] = "bank";
    const k = (a.kind || "").toLowerCase();
    if (k.includes("credit")) type = "credit_card";
    else if (k.includes("cash")) type = "cash";
    else if (k.includes("wallet")) type = "wallet";

    return {
      id: a.id || `acc-${Date.now()}`,
      name: a.name || "Account",
      type,
      institution: a.institution || "",
      identifier: a.identifier || "",
      opening_balance: Number(a.openingBalance ?? a.opening_balance ?? 0) || 0,
      archived: Boolean(a.archived),
      notes: a.notes || "",
    };
  });

  // 2. Migrate Categories
  const rawCategories = Array.isArray(legacyState.categories) ? legacyState.categories : getCanonicalSeedCategories();
  const categories: Category[] = rawCategories.map((c: any) => {
    let kind: Category["kind"] = "expense";
    const k = (c.kind || "").toLowerCase();
    if (k.includes("income")) kind = "income";
    else if (k.includes("transfer") || c.name.toLowerCase().includes("borrow") || c.name.toLowerCase().includes("lend") || c.name.toLowerCase().includes("recovery")) {
      kind = "transfer";
    }

    return {
      id: c.id || `cat-${Date.now()}`,
      name: c.name || "Category",
      kind,
      default_need_want: c.defaultNeed || c.default_need_want || (c.name.toLowerCase().includes("shop") || c.name.toLowerCase().includes("entertain") ? "Want" : "Need"),
      monthly_cap: Number(c.monthlyLimit ?? c.monthly_cap ?? 0) || 0,
      icon: c.icon || "🏷️",
      color: c.color || "blue",
      archived: Boolean(c.archived),
    };
  });

  // 3. Migrate Loans
  const rawLoans = Array.isArray(legacyState.loans) ? legacyState.loans : getCanonicalSeedLoans();
  const loans: Loan[] = rawLoans.map((l: any) => ({
    id: l.id || `loan-${Date.now()}`,
    name: l.name || "Loan",
    lender: l.lenderInstitution || l.lender || "Lender",
    type: l.loanType || l.type || "Personal Loan",
    sanctioned_amount: Number(l.principalAmount ?? l.sanctioned_amount ?? 0) || 0,
    rate: Number(l.interestRate ?? l.rate ?? 8.5) || 8.5,
    tenure: Number(l.tenureMonths ?? l.tenure ?? 12) || 12,
    start_date: l.startDate || l.start_date || "2024-01-01",
    emi: Number(l.emiAmount ?? l.emi ?? 0) || 0,
    emi_day: Number(l.emi_day ?? 5) || 5,
    pay_from_account: l.repaymentAccountId || l.pay_from_account || "acc-hdfc",
    auto_post: l.autoRecurringEmi ?? l.auto_post ?? true,
    mode: l.mode || "already_running",
    opening_outstanding: Number(l.currentOutstanding ?? l.opening_outstanding ?? 0) || 0,
    opening_installments_paid: Number(l.paidEmisCount ?? l.opening_installments_paid ?? 0) || 0,
    notes: l.notes || "",
  }));

  // 4. Migrate Holdings
  const rawHoldings = Array.isArray(legacyState.investments) ? legacyState.investments : getCanonicalSeedHoldings();
  const holdings: Holding[] = rawHoldings.map((h: any) => ({
    id: h.id || `inv-${Date.now()}`,
    type: h.assetType || h.type || "Mutual fund",
    broker: h.institution || h.broker || "Broker",
    name: h.name || "Holding",
    opening_invested: Number(h.investedAmount ?? h.opening_invested ?? 0) || 0,
    current_value: Number(h.currentAmount ?? h.current_value ?? 0) || 0,
    sip: h.isRecurring || h.sip
      ? {
          amount: Number(h.sipAmount ?? h.sip?.amount ?? 0) || 0,
          day: Number(h.sip?.day ?? 5) || 5,
          from_account: h.sipAccountId ?? h.sip?.from_account ?? "acc-hdfc",
          active: h.status !== "Paused" && (h.sip?.active ?? true),
        }
      : undefined,
    start_date: h.startMonthYear ? `${h.startMonthYear}-01` : h.start_date,
    maturity_date: h.endMonthYear ? `${h.endMonthYear}-01` : h.maturity_date,
    notes: h.notes || "",
  }));

  // 5. Migrate Goals
  const rawFunds = Array.isArray(legacyState.funds) ? legacyState.funds : getCanonicalSeedGoals();
  const goals: Goal[] = rawFunds.map((f: any) => {
    let kind: Goal["kind"] = "goal";
    if (f.type === "Emergency" || (f.name && f.name.toLowerCase().includes("emergency"))) {
      kind = "emergency";
    } else if (f.type === "Custom" || (f.name && f.name.toLowerCase().includes("vacation"))) {
      kind = "sinking";
    }

    return {
      id: f.id || `goal-${Date.now()}`,
      name: f.name || "Savings Goal",
      kind,
      target: Number(f.targetAmount ?? f.target ?? 0) || 0,
      target_date: f.targetDate || f.target_date,
      monthly_contribution: Number(f.monthlyContribution ?? f.monthly_contribution ?? 0) || 0,
      contribution_mode: f.contribution_mode || "auto",
      opening_amount: Number(f.currentAmount ?? f.opening_amount ?? 0) || 0,
      icon: f.icon || "🎯",
      color: f.color || "emerald",
      notes: f.notes || "",
    };
  });

  // 6. Migrate Schedules
  const rawRecurring = Array.isArray(legacyState.recurring) ? legacyState.recurring : getCanonicalSeedSchedules();
  const schedules: Schedule[] = rawRecurring
    .filter((r: any) => !r.loanId && !r.investmentId) // Exclude duplicate loan/SIP mirrors
    .map((r: any) => {
      let kind: Schedule["kind"] = "expense";
      if (r.type === "Income") kind = "income";

      return {
        id: r.id || `sched-${Date.now()}`,
        name: r.name || "Schedule",
        kind,
        amount: Number(r.amount) || 0,
        frequency: r.frequency || "Monthly",
        next_date: r.nextDate || r.next_date || "2026-11-01",
        account: r.accountId || r.account || "acc-hdfc",
        category: r.categoryId || r.category || "cat-bills",
        auto_post: r.enabled ?? r.auto_post ?? true,
        active: r.enabled ?? r.active ?? true,
        need_want: r.need || "Need",
      };
    });

  // 7. Migrate Transactions into Ledger Entries
  const rawTx = Array.isArray(legacyState.transactions) ? legacyState.transactions : getCanonicalSeedEntries();
  const entries: Entry[] = [];
  const unmatched_review_items: any[] = [];

  for (const t of rawTx) {
    let kind: Entry["kind"] = "expense";
    let subtype: Entry["subtype"] = "none";
    let to_ref: Entry["to_ref"] = undefined;
    const typeLower = (t.type || "").toLowerCase();

    if (typeLower === "income" || typeLower === "refund") {
      kind = "income";
    } else if (typeLower.includes("loan payment") || typeLower.includes("emi")) {
      kind = "expense";
      subtype = "emi";
      // Match to loan
      const matchedLoan = loans.find(
        (l) =>
          l.id === t.loanId ||
          l.pay_from_account === t.accountId ||
          Math.abs(l.emi - t.amount) < 100
      );
      if (matchedLoan) {
        to_ref = { kind: "loan", id: matchedLoan.id, name: matchedLoan.name };
      }
    } else if (typeLower.includes("lend")) {
      kind = "transfer";
      subtype = "lent";
      to_ref = { kind: "person", id: `person-${t.merchant || "other"}`, name: t.merchant || "Contact" };
    } else if (typeLower.includes("recovery")) {
      kind = "transfer";
      subtype = "recovered";
      to_ref = { kind: "person", id: `person-${t.merchant || "other"}`, name: t.merchant || "Contact" };
    } else if (typeLower.includes("borrow")) {
      kind = "transfer";
      subtype = "borrowed";
    } else if (typeLower === "transfer") {
      kind = "transfer";
      if (t.destinationAccountId) {
        to_ref = { kind: "account", id: t.destinationAccountId };
      }
    } else if (typeLower === "investment") {
      kind = "transfer";
      subtype = "sip";
      const matchedHolding = holdings.find((h) => h.name.toLowerCase() === (t.instrumentName || t.description || "").toLowerCase());
      if (matchedHolding) {
        to_ref = { kind: "holding", id: matchedHolding.id, name: matchedHolding.name };
      }
    }

    entries.push({
      id: t.id || `entry-${Date.now()}-${Math.random()}`,
      date: (t.date || "2026-10-01").slice(0, 10),
      status: "posted",
      kind,
      amount: Number(t.amount) || 0,
      category_id: t.categoryId || t.category_id,
      account_id: t.accountId || t.account_id || "acc-hdfc",
      to_ref,
      need_want: t.need || "Need",
      subtype,
      source: t.loanId ? "loan" : t.recurring ? "schedule" : "manual",
      source_id: t.loanId || undefined,
      installment_no: t.installment_no,
      principal_part: t.principal_part,
      interest_part: t.interest_part,
      note: t.description || t.notes || "",
      merchant: t.merchant || t.description,
      tags: Array.isArray(t.tags) ? t.tags : [],
    });
  }

  // 8. Profile & Preferences
  const profile = {
    ...getCanonicalProfileTargets(),
    ...(legacyState.profile || {}),
  };

  const preferences = {
    ...getCanonicalPreferences(),
    ...(legacyState.preferences || {}),
  };

  return {
    version: 2,
    hubs_v2: true,
    preferences,
    profile,
    accounts,
    categories,
    entries,
    loans,
    holdings,
    goals,
    schedules,
    unmatched_review_items,
  };
}

/**
 * Converts a canonical Entry to a legacy Transaction for UI compatibility.
 */
export function entryToLegacyTransaction(entry: Entry): any {
  let type = "Expense";
  if (entry.kind === "income") {
    type = "Income";
  } else if (entry.kind === "expense") {
    if (entry.subtype === "emi") {
      type = "EMI / Loan Payment";
    } else {
      type = "Expense";
    }
  } else if (entry.kind === "transfer") {
    if (entry.subtype === "borrowed") {
      type = "Borrow / Loan Taken";
    } else if (entry.subtype === "lent") {
      type = "Lend / Loan Given";
    } else if (entry.subtype === "recovered") {
      type = "Debt Recovery";
    } else if (entry.subtype === "sip" || entry.subtype === "lump_sum") {
      type = "Investment";
    } else {
      type = "Transfer";
    }
  }

  return {
    id: entry.id,
    date: entry.date.length === 10 ? `${entry.date}T10:00:00` : entry.date,
    description: entry.note || entry.merchant || "Transaction",
    type,
    amount: entry.amount,
    categoryId: entry.category_id || "cat-food",
    accountId: entry.account_id,
    destinationAccountId: entry.to_ref?.kind === "account" ? entry.to_ref.id : undefined,
    loanId: entry.to_ref?.kind === "loan" ? entry.to_ref.id : undefined,
    investmentId: entry.to_ref?.kind === "holding" ? entry.to_ref.id : undefined,
    need: entry.need_want,
    merchant: entry.merchant || "",
    notes: entry.note || "",
    tags: entry.tags || [],
  };
}


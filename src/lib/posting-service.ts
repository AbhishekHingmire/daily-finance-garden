/**
 * Posting Service for WealthTrack (Section 0 C4, Section 2 E4-E20).
 * Creates REAL ledger entries from schedules, loans, SIPs, and goal allocations.
 * Completely idempotent on (source_id, due_date).
 */

import {
  type Account,
  type Entry,
  type Goal,
  type Holding,
  type Loan,
  type Schedule,
} from "./domain-model";
import { generateAmortisationSchedule } from "./amortisation";

export interface PostingResult {
  newEntries: Entry[];
  updatedSchedules: Schedule[];
  updatedLoans: Loan[];
  updatedGoals: Goal[];
  updatedHoldings: Holding[];
}

/**
 * Checks if an entry has already been posted for a given source and due date.
 */
export function hasEntryBeenPosted(
  entries: Entry[],
  sourceId: string,
  dueDate: string
): boolean {
  const normDate = dueDate.slice(0, 10);
  return entries.some(
    (e) =>
      e.status === "posted" &&
      e.source_id === sourceId &&
      e.date.slice(0, 10) === normDate
  );
}

/**
 * Advances a YYYY-MM-DD date according to schedule frequency.
 */
export function advanceDate(dateStr: string, frequency: "Weekly" | "Monthly" | "Yearly"): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  if (frequency === "Weekly") {
    const dt = new Date(y, m - 1, d + 7);
    return dt.toISOString().slice(0, 10);
  }
  if (frequency === "Yearly") {
    return `${y + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  // Monthly: advance month with day clamping
  const nextMonthIndex = m; // 0-indexed month + 1
  const targetDate = new Date(y, nextMonthIndex, 1);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(d, daysInMonth);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

/**
 * Creates an EMI entry for a loan installment (Section 2 E5, E6).
 */
export function createLoanEmiEntry(
  loan: Loan,
  installmentNo: number,
  dueDate: string,
  amortisationRows = generateAmortisationSchedule(
    loan.sanctioned_amount,
    loan.rate,
    loan.tenure,
    loan.start_date,
    loan.emi
  )
): Entry {
  const amort = amortisationRows.find((r) => r.installmentNo === installmentNo) || {
    principalPart: Math.round(loan.emi * 0.6),
    interestPart: Math.round(loan.emi * 0.4),
  };

  return {
    id: `entry-emi-${loan.id}-${installmentNo}-${Date.now()}`,
    date: dueDate.slice(0, 10),
    status: "posted",
    kind: "expense",
    amount: loan.emi,
    category_id: "cat-loan-emi",
    account_id: loan.pay_from_account,
    to_ref: { kind: "loan", id: loan.id, name: loan.name },
    need_want: "Need",
    subtype: "emi",
    source: "loan",
    source_id: loan.id,
    installment_no: installmentNo,
    principal_part: amort.principalPart,
    interest_part: amort.interestPart,
    note: `${loan.name} · Installment ${installmentNo} of ${loan.tenure}`,
    merchant: loan.lender,
    tags: ["EMI", "Debt"],
  };
}

/**
 * Creates an SIP investment transfer entry (Section 2 E11).
 */
export function createSipEntry(
  holding: Holding,
  dueDate: string
): Entry {
  const amount = holding.sip?.amount || 0;
  const fromAccount = holding.sip?.from_account || "";

  return {
    id: `entry-sip-${holding.id}-${dueDate.slice(0, 10)}-${Date.now()}`,
    date: dueDate.slice(0, 10),
    status: "posted",
    kind: "transfer",
    amount,
    account_id: fromAccount,
    to_ref: { kind: "holding", id: holding.id, name: holding.name },
    need_want: "Need",
    subtype: "sip",
    source: "sip",
    source_id: holding.id,
    note: `${holding.name} · SIP Auto-Investment`,
    merchant: holding.broker,
    tags: ["SIP", "Investment"],
  };
}

/**
 * Creates a recurring schedule entry (Section 2 E4).
 */
export function createScheduleEntry(
  schedule: Schedule,
  dueDate: string
): Entry {
  return {
    id: `entry-sched-${schedule.id}-${dueDate.slice(0, 10)}-${Date.now()}`,
    date: dueDate.slice(0, 10),
    status: "posted",
    kind: schedule.kind,
    amount: schedule.amount,
    category_id: schedule.category,
    account_id: schedule.account,
    need_want: schedule.need_want || "Need",
    subtype: schedule.subtype || "none",
    source: "schedule",
    source_id: schedule.id,
    note: schedule.name,
    merchant: schedule.name,
    tags: ["Recurring"],
  };
}

/**
 * Core posting service runner. Processes all due recurring schedules,
 * auto loan EMIs, and SIP investments up to referenceDate.
 * Guaranteed idempotent on (source_id, due_date).
 */
export function processDuePostings(
  entries: Entry[],
  schedules: Schedule[],
  loans: Loan[],
  holdings: Holding[],
  referenceDateStr: string // YYYY-MM-DD
): PostingResult {
  const refDate = referenceDateStr.slice(0, 10);
  const newEntries: Entry[] = [];
  const updatedSchedules: Schedule[] = [...schedules];
  const updatedLoans: Loan[] = [...loans];
  const updatedHoldings: Holding[] = [...holdings];

  // 1. Recurring Schedules with auto_post === true
  for (let i = 0; i < updatedSchedules.length; i++) {
    const s = updatedSchedules[i];
    if (!s.active || !s.auto_post) continue;

    let next = s.next_date.slice(0, 10);
    while (next <= refDate) {
      if (!hasEntryBeenPosted([...entries, ...newEntries], s.id, next)) {
        newEntries.push(createScheduleEntry(s, next));
      }
      next = advanceDate(next, s.frequency);
    }
    updatedSchedules[i] = { ...s, next_date: next };
  }

  // 2. Loans with auto_post === true
  for (let i = 0; i < updatedLoans.length; i++) {
    const loan = updatedLoans[i];
    if (!loan.auto_post) continue;

    const amortRows = generateAmortisationSchedule(
      loan.sanctioned_amount,
      loan.rate,
      loan.tenure,
      loan.start_date,
      loan.emi
    );

    // Determine next unpaid installment
    const postedInstallments = new Set(
      [...entries, ...newEntries]
        .filter((e) => e.status === "posted" && e.source === "loan" && e.source_id === loan.id && e.installment_no)
        .map((e) => e.installment_no!)
    );

    const openingPaid = loan.opening_installments_paid || 0;
    for (let inst = openingPaid + 1; inst <= loan.tenure; inst++) {
      const amort = amortRows.find((r) => r.installmentNo === inst);
      if (!amort) break;
      if (amort.dueDate > refDate) break;

      if (!postedInstallments.has(inst) && !hasEntryBeenPosted([...entries, ...newEntries], loan.id, amort.dueDate)) {
        const emiEntry = createLoanEmiEntry(loan, inst, amort.dueDate, amortRows);
        newEntries.push(emiEntry);
        postedInstallments.add(inst);
      }
    }
  }

  // 3. SIPs on Holdings
  for (let i = 0; i < updatedHoldings.length; i++) {
    const holding = updatedHoldings[i];
    if (!holding.sip || !holding.sip.active) continue;

    const sipDay = holding.sip.day;
    // Construct current month's due date
    const [y, m] = refDate.split("-").map(Number);
    const dueDate = `${y}-${String(m).padStart(2, "0")}-${String(sipDay).padStart(2, "0")}`;

    if (dueDate <= refDate && !hasEntryBeenPosted([...entries, ...newEntries], holding.id, dueDate)) {
      newEntries.push(createSipEntry(holding, dueDate));
    }
  }

  return {
    newEntries,
    updatedSchedules,
    updatedLoans,
    updatedGoals: [],
    updatedHoldings,
  };
}

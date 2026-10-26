/**
 * Financial amortisation and compounding engine for WealthTrack.
 * Handles exact EMI, principal/interest schedule generation, and FD accrual.
 */

export interface AmortisationRow {
  installmentNo: number;
  dueDate: string; // YYYY-MM-DD
  openingBalance: number;
  emi: number;
  principalPart: number;
  interestPart: number;
  closingBalance: number;
}

/**
 * Calculates standard monthly EMI using the formula:
 * EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 */
export function calculateMonthlyEmi(
  principal: number,
  annualRatePct: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRatePct <= 0) return Math.round(principal / tenureMonths);

  const monthlyRate = annualRatePct / (12 * 100);
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi);
}

/**
 * Advances a YYYY-MM-DD date by N months, safely clamping end of month.
 */
export function addMonthsToDate(dateStr: string, months: number): string {
  const parts = dateStr.slice(0, 10).split("-").map(Number);
  const year = parts[0];
  const month = parts[1] - 1; // 0-indexed
  const day = parts[2];

  const targetDate = new Date(year, month + months, 1);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  // Days in target month
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInMonth);

  const mm = String(targetMonth + 1).padStart(2, "0");
  const dd = String(clampedDay).padStart(2, "0");
  return `${targetYear}-${mm}-${dd}`;
}

/**
 * Computes full loan amortisation schedule.
 */
export function generateAmortisationSchedule(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
  startDate: string,
  fixedEmi?: number
): AmortisationRow[] {
  if (principal <= 0 || tenureMonths <= 0) return [];

  const emi = fixedEmi && fixedEmi > 0 ? fixedEmi : calculateMonthlyEmi(principal, annualRatePct, tenureMonths);
  const monthlyRate = annualRatePct / (12 * 100);

  const rows: AmortisationRow[] = [];
  let balance = principal;

  for (let i = 1; i <= tenureMonths && balance > 0; i++) {
    const dueDate = addMonthsToDate(startDate, i - 1);
    const interestPart = Math.round(balance * monthlyRate);
    let principalPart = emi - interestPart;

    if (principalPart > balance || i === tenureMonths) {
      principalPart = balance;
    }

    const actualEmi = principalPart + interestPart;
    const closingBalance = Math.max(0, balance - principalPart);

    rows.push({
      installmentNo: i,
      dueDate,
      openingBalance: balance,
      emi: actualEmi,
      principalPart,
      interestPart,
      closingBalance,
    });

    balance = closingBalance;
  }

  return rows;
}

/**
 * Computes accrued value of a fixed deposit or bond with quarterly compounding.
 * A = P * (1 + r/n)^(n*t)
 */
export function calculateAccruedInvestmentValue(
  investedAmount: number,
  annualRatePct: number,
  startDateStr: string,
  currentDateStr: string,
  compoundingFrequency: "monthly" | "quarterly" | "annual" = "quarterly"
): number {
  if (investedAmount <= 0 || annualRatePct <= 0) return investedAmount;

  const start = new Date(startDateStr.slice(0, 10));
  const now = new Date(currentDateStr.slice(0, 10));
  const diffDays = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const years = diffDays / 365.25;

  const n = compoundingFrequency === "monthly" ? 12 : compoundingFrequency === "quarterly" ? 4 : 1;
  const r = annualRatePct / 100;
  const accrued = investedAmount * Math.pow(1 + r / n, n * years);
  return Math.round(accrued);
}

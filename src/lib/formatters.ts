/**
 * Formatting utilities for WealthTrack (SPEC_R2 1.14, 1.15)
 */

export const UNICODE_MINUS = "\u2212";

export interface MoneyFormatOptions {
  signed?: boolean;
  compact?: boolean;
  decimals?: number;
}

/**
 * Formats a currency number with Indian numbering grouping (en-IN).
 * Strictly guarantees:
 * - Negatives formatted as "−₹22,40,781" (U+2212 before ₹, NEVER "₹-" or "-₹")
 * - Positives formatted as "₹22,40,781" or "+₹1,00,250" if signed: true
 * - Tabular numbers
 */
export function formatMoney(
  amount: number | null | undefined,
  currency = "INR",
  options?: MoneyFormatOptions
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "₹0";
  }

  const symbol = currency === "INR" ? "₹" : currency;
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const rounded = options?.decimals !== undefined
    ? absVal.toLocaleString("en-IN", {
        minimumFractionDigits: options.decimals,
        maximumFractionDigits: options.decimals,
      })
    : Math.round(absVal).toLocaleString("en-IN");

  if (isNegative) {
    return `${UNICODE_MINUS}${symbol}${rounded}`;
  }
  if (options?.signed && amount > 0) {
    return `+${symbol}${rounded}`;
  }
  return `${symbol}${rounded}`;
}

/**
 * Compact currency tick formatting for chart axes and badges (1.15).
 * e.g.:
 * 1,00,000 -> "₹1L"
 * -18,000 -> "−₹18k"
 * 50,00,000 -> "₹50L"
 * 1,00,00,000 -> "₹1Cr"
 */
export function formatChartTick(
  amount: number | null | undefined,
  currency = "INR"
): string {
  if (amount === null || amount === undefined || isNaN(amount) || amount === 0) {
    return "₹0";
  }

  const symbol = currency === "INR" ? "₹" : currency;
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  let formatted = "";

  if (absVal >= 10000000) {
    const cr = absVal / 10000000;
    formatted = `${cr % 1 === 0 ? cr : cr.toFixed(1)}Cr`;
  } else if (absVal >= 100000) {
    const l = absVal / 100000;
    formatted = `${l % 1 === 0 ? l : l.toFixed(1)}L`;
  } else if (absVal >= 1000) {
    const k = absVal / 1000;
    formatted = `${k % 1 === 0 ? k : k.toFixed(1)}k`;
  } else {
    formatted = `${Math.round(absVal)}`;
  }

  return isNegative ? `${UNICODE_MINUS}${symbol}${formatted}` : `${symbol}${formatted}`;
}

export const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Formats a date string (YYYY-MM-DD or ISO) into human-readable format (SPEC_R2 1.14).
 * Default display: "26 Oct 2026".
 * Eliminates raw ISO strings in user-facing UI.
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  userPref?: { dateFormat?: string }
): string {
  if (!dateInput) return "";

  let year: number;
  let monthIndex: number;
  let day: number;

  if (typeof dateInput === "string") {
    const clean = dateInput.slice(0, 10);
    const parts = clean.split("-");
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      monthIndex = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return dateInput;
      year = d.getFullYear();
      monthIndex = d.getMonth();
      day = d.getDate();
    }
  } else {
    year = dateInput.getFullYear();
    monthIndex = dateInput.getMonth();
    day = dateInput.getDate();
  }

  const pref = userPref?.dateFormat || "DD/MM/YYYY";

  // If user requested standard slash input/display format:
  if (pref === "DD/MM/YYYY") {
    const dd = String(day).padStart(2, "0");
    const mm = String(monthIndex + 1).padStart(2, "0");
    // For human readable body text, we prefer "26 Oct 2026"
    return `${day} ${MONTH_NAMES_SHORT[monthIndex]} ${year}`;
  }
  if (pref === "MM/DD/YYYY") {
    return `${MONTH_NAMES_SHORT[monthIndex]} ${day}, ${year}`;
  }
  return `${day} ${MONTH_NAMES_SHORT[monthIndex]} ${year}`;
}

/**
 * Format date for input elements or strict table columns: DD/MM/YYYY (never "-").
 */
export function formatDateSlash(
  dateInput: string | Date | null | undefined,
  format: "DD/MM/YYYY" | "MM/DD/YYYY" = "DD/MM/YYYY"
): string {
  if (!dateInput) return "";
  const clean = typeof dateInput === "string" ? dateInput.slice(0, 10) : dateInput.toISOString().slice(0, 10);
  const parts = clean.split("-");
  if (parts.length !== 3) return "";
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  if (format === "MM/DD/YYYY") {
    return `${month}/${day}/${year}`;
  }
  return `${day}/${month}/${year}`;
}

/**
 * Formats a payday chip string (1.14): "Payday 19 Nov · in 24 days"
 */
export function formatPaydayLabel(
  paydayIso: string,
  referenceDate = new Date(2026, 9, 26) // 26 Oct 2026 default seed date
): string {
  const parts = paydayIso.slice(0, 10).split("-");
  if (parts.length !== 3) return paydayIso;
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const targetDate = new Date(year, monthIndex, day);
  const diffTime = targetDate.getTime() - referenceDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const dayStr = `${day} ${MONTH_NAMES_SHORT[monthIndex]}`;
  if (diffDays === 0) {
    return `Payday today (${dayStr})`;
  }
  if (diffDays === 1) {
    return `Payday tomorrow (${dayStr})`;
  }
  if (diffDays > 1) {
    return `Payday ${dayStr} · in ${diffDays} days`;
  }
  return `Payday ${dayStr}`;
}

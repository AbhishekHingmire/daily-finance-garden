import type { AssetType } from "./wealthtrack";

export interface ValuationInput {
  investedAmount: number;
  currentPrice?: number;
  units?: number;
  purchasePrice?: number;
  assetType: AssetType;
  calculationMode?: "auto_units" | "auto_purchase_price" | "fixed_deposit" | "manual";
  startMonthYear?: string; // YYYY-MM
  endMonthYear?: string;   // YYYY-MM
  expenseRatio?: number;   // Percentage e.g. 0.65 for 0.65%
  fdAnnualRate?: number;   // Percentage e.g. 7.1%
  fdCompounding?: "Quarterly" | "Monthly" | "Annual";
  manualCurrentAmount?: number;
}

export interface ValuationResult {
  currentAmount: number;
  units: number;
  purchasePrice: number;
  currentPrice: number;
  absolutePnL: number;
  absolutePnLPct: number;
  elapsedMonths: number;
  elapsedYears: number;
  cagr: number | null;
  expenseRatio: number;
  annualExpenseFee: number;
  netCagr: number | null;
  fdAccruedInterest?: number;
  fdMaturityAmount?: number;
  sgbBonusInterest?: number;
}

/**
 * Returns intelligent Total Expense Ratio (TER) default estimates based on asset class.
 */
export function getDefaultExpenseRatio(assetType: AssetType, name: string = ""): number {
  const lowerName = name.toLowerCase();

  switch (assetType) {
    case "Mutual fund":
      if (lowerName.includes("direct")) return 0.65;
      if (lowerName.includes("regular")) return 1.75;
      if (lowerName.includes("index") || lowerName.includes("nifty")) return 0.20;
      return 0.75;
    case "ETF":
      if (lowerName.includes("gold")) return 0.35;
      if (lowerName.includes("nasdaq") || lowerName.includes("mon100")) return 0.49;
      return 0.15;
    case "Gold & Commodities":
      if (lowerName.includes("etf") || lowerName.includes("bees")) return 0.35;
      return 0.00; // SGB / Physical Gold have 0 TER
    case "Stocks & Equity":
    case "Fixed deposit":
    case "Crypto":
    case "Other":
    default:
      return 0.00;
  }
}

/**
 * Calculates in-depth investment metrics:
 * 1. Live market-derived current valuation from units or buy price.
 * 2. Absolute profit/loss (value & percentage).
 * 3. Compound Annual Growth Rate (CAGR).
 * 4. Total Expense Ratio (TER) annual impact and Net CAGR.
 * 5. Fixed deposit compound interest and SGB semi-annual interest.
 */
export function calculateInvestmentValuation(input: ValuationInput): ValuationResult {
  const investedAmount = Math.max(0, Number(input.investedAmount) || 0);
  const currentPrice = Math.max(0, Number(input.currentPrice) || 0);
  const expenseRatio = Math.max(0, Number(input.expenseRatio ?? getDefaultExpenseRatio(input.assetType)));

  // Calculate elapsed holding period
  let elapsedMonths = 1;
  if (input.startMonthYear && /^\d{4}-\d{2}$/.test(input.startMonthYear)) {
    const [year, month] = input.startMonthYear.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const now = new Date();
    elapsedMonths = Math.max(
      1,
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    );
  }
  const elapsedYears = Math.max(0.0833, elapsedMonths / 12);

  let currentAmount = 0;
  let units = Number(input.units) || 0;
  let purchasePrice = Number(input.purchasePrice) || 0;
  let fdAccruedInterest: number | undefined;
  let fdMaturityAmount: number | undefined;
  let sgbBonusInterest: number | undefined;

  // 1. FIXED DEPOSIT COMPOUNDING FORMULA: A = P * (1 + r/n)^(n*t)
  if (input.assetType === "Fixed deposit" || input.calculationMode === "fixed_deposit") {
    const rate = Math.max(0, Number(input.fdAnnualRate) || 7.0) / 100;
    const n = input.fdCompounding === "Monthly" ? 12 : input.fdCompounding === "Annual" ? 1 : 4; // Default Quarterly

    const accruedFactor = Math.pow(1 + rate / n, n * elapsedYears);
    currentAmount = Math.round(investedAmount * accruedFactor * 100) / 100;
    fdAccruedInterest = Math.max(0, currentAmount - investedAmount);

    // Optional maturity calculation if endMonthYear is provided
    if (input.endMonthYear && /^\d{4}-\d{2}$/.test(input.endMonthYear)) {
      const [endYear, endMonth] = input.endMonthYear.split("-").map(Number);
      const [startYear, startMonth] = (input.startMonthYear || "2024-01").split("-").map(Number);
      const totalTenureMonths = Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth));
      const totalTenureYears = totalTenureMonths / 12;
      fdMaturityAmount = Math.round(investedAmount * Math.pow(1 + rate / n, n * totalTenureYears) * 100) / 100;
    }

    units = 1;
    purchasePrice = investedAmount;
  }
  // 2. MANUAL VALUATION OVERRIDE
  else if (input.calculationMode === "manual" && input.manualCurrentAmount !== undefined) {
    currentAmount = Math.max(0, Number(input.manualCurrentAmount) || 0);
    if (units > 0) {
      purchasePrice = investedAmount > 0 ? investedAmount / units : purchasePrice;
    } else if (purchasePrice > 0 && investedAmount > 0) {
      units = investedAmount / purchasePrice;
    }
  }
  // 3. LIVE AUTO-VALUATION FROM UNITS & ONGOING PRICE
  else if (units > 0 && currentPrice > 0) {
    currentAmount = Math.round(units * currentPrice * 100) / 100;
    purchasePrice = investedAmount > 0 ? Math.round((investedAmount / units) * 10000) / 10000 : currentPrice;
  }
  // 4. LIVE AUTO-VALUATION FROM PURCHASE PRICE / BUY NAV
  else if (purchasePrice > 0 && investedAmount > 0 && currentPrice > 0) {
    units = Math.round((investedAmount / purchasePrice) * 10000) / 10000;
    currentAmount = Math.round(units * currentPrice * 100) / 100;
  }
  // 5. IF ONLY INVESTED AMOUNT & LIVE PRICE PROVIDED (ASSUME UNITS = INVESTED / CURRENT PRICE)
  else if (investedAmount > 0 && currentPrice > 0) {
    units = Math.round((investedAmount / currentPrice) * 10000) / 10000;
    purchasePrice = currentPrice;
    currentAmount = investedAmount;
  }
  // 6. FALLBACK TO DIRECT MANUAL / PREVIOUS VALUE
  else {
    currentAmount = Math.max(0, Number(input.manualCurrentAmount) || investedAmount);
    purchasePrice = currentPrice > 0 ? currentPrice : currentAmount;
    units = purchasePrice > 0 ? Math.round((investedAmount / purchasePrice) * 10000) / 10000 : 1;
  }

  // SGB (Sovereign Gold Bond) gives 2.5% p.a. simple interest on invested amount
  if (input.assetType === "Gold & Commodities") {
    sgbBonusInterest = Math.round(investedAmount * 0.025 * elapsedYears * 100) / 100;
  }

  // Absolute Returns
  const absolutePnL = Math.round((currentAmount - investedAmount) * 100) / 100;
  const absolutePnLPct = investedAmount > 0 ? Math.round((absolutePnL / investedAmount) * 10000) / 100 : 0;

  // Annualized CAGR (Compound Annual Growth Rate)
  let cagr: number | null = null;
  if (investedAmount > 0 && currentAmount > 0 && elapsedYears >= 0.25) {
    const rawCagr = (Math.pow(currentAmount / investedAmount, 1 / elapsedYears) - 1) * 100;
    // Guard against extreme numerical spikes for very short tenures
    cagr = Math.round(Math.min(1000, Math.max(-100, rawCagr)) * 100) / 100;
  }

  // Total Expense Ratio (TER) Impact
  const annualExpenseFee = Math.round(currentAmount * (expenseRatio / 100) * 100) / 100;
  const netCagr = cagr !== null ? Math.round((cagr - expenseRatio) * 100) / 100 : null;

  return {
    currentAmount,
    units,
    purchasePrice,
    currentPrice,
    absolutePnL,
    absolutePnLPct,
    elapsedMonths,
    elapsedYears,
    cagr,
    expenseRatio,
    annualExpenseFee,
    netCagr,
    fdAccruedInterest,
    fdMaturityAmount,
    sgbBonusInterest,
  };
}

/**
 * Computes the exact next SIP auto-debit date based on selected day of month.
 * If day in current month is today or in future => deducts in current month.
 * If day in current month has already passed => advances to next month.
 */
export function computeNextSipDate(sipDay: number, referenceDate: Date = new Date()): {
  nextDate: string;
  isSameMonth: boolean;
  daysUntil: number;
} {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth(); // 0-indexed
  const currentDay = referenceDate.getDate();

  const targetDay = Math.max(1, Math.min(31, Math.floor(sipDay) || 10));

  if (targetDay >= currentDay) {
    // Target day in current month is today or in future
    const maxDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const day = Math.min(targetDay, maxDays);
    const mStr = String(currentMonth + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const nextDate = `${currentYear}-${mStr}-${dStr}`;
    const nextDateObj = new Date(currentYear, currentMonth, day);
    const diffTime = nextDateObj.getTime() - referenceDate.getTime();
    const daysUntil = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return { nextDate, isSameMonth: true, daysUntil };
  } else {
    // Target day in current month has passed, advance to next month
    const nextDateObj = new Date(currentYear, currentMonth + 1, 1);
    const nextYear = nextDateObj.getFullYear();
    const nextMonth = nextDateObj.getMonth();
    const maxDays = new Date(nextYear, nextMonth + 1, 0).getDate();
    const day = Math.min(targetDay, maxDays);
    const mStr = String(nextMonth + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const nextDate = `${nextYear}-${mStr}-${dStr}`;
    const fullNextDateObj = new Date(nextYear, nextMonth, day);
    const diffTime = fullNextDateObj.getTime() - referenceDate.getTime();
    const daysUntil = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return { nextDate, isSameMonth: false, daysUntil };
  }
}

/**
 * Calculates historical SIP progress: elapsed installments, estimated capital invested, and average buy price.
 */
export function calculateSipHistoricalProgress(
  startMonthYear: string,
  monthlySipAmount: number,
  sipDay: number = 10,
  referenceDate: Date = new Date()
): {
  elapsedInstallments: number;
  totalEstimatedInvested: number;
  monthsElapsed: number;
} {
  if (!startMonthYear || !/^\d{4}-\d{2}$/.test(startMonthYear)) {
    return { elapsedInstallments: 1, totalEstimatedInvested: monthlySipAmount, monthsElapsed: 1 };
  }

  const [startYear, startMonth] = startMonthYear.split("-").map(Number);
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-indexed
  const currentDay = referenceDate.getDate();

  // Total months between start month and current month (inclusive)
  const monthsDiff = (currentYear - startYear) * 12 + (currentMonth - startMonth);
  let installments = Math.max(0, monthsDiff);

  // If this month's SIP day has arrived or passed, count current month installment as paid
  if (currentDay >= sipDay) {
    installments += 1;
  }

  const finalInstallments = Math.max(1, installments);
  const totalEstimatedInvested = finalInstallments * (Number(monthlySipAmount) || 0);

  return {
    elapsedInstallments: finalInstallments,
    totalEstimatedInvested,
    monthsElapsed: Math.max(1, monthsDiff + 1),
  };
}

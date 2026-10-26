/**
 * Shared Period State Manager (Section 2 E25, Section 7).
 * Single shared period state across Dashboard, Transactions, Budgets, Insights.
 * Persists across tabs and browser reload.
 */

import { useState, useEffect } from "react";
import { type PeriodSelector } from "./metrics-service";

const STORAGE_KEY = "wt_selected_period";

export const DEFAULT_PERIOD: PeriodSelector = {
  year: 2026,
  month: 10,
};

export function getPersistedPeriod(): PeriodSelector {
  if (typeof window === "undefined") return DEFAULT_PERIOD;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.year === "number" && typeof parsed.month === "number") {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_PERIOD;
}

export function setPersistedPeriod(period: PeriodSelector): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(period));
    window.dispatchEvent(new CustomEvent("wt_period_changed", { detail: period }));
  } catch {}
}

export function useSharedPeriod(): [PeriodSelector, (next: PeriodSelector) => void] {
  const [period, setPeriodState] = useState<PeriodSelector>(getPersistedPeriod);

  useEffect(() => {
    const handlePeriodChange = (e: Event) => {
      const detail = (e as CustomEvent<PeriodSelector>).detail;
      if (detail) {
        setPeriodState(detail);
      }
    };

    window.addEventListener("wt_period_changed", handlePeriodChange);
    return () => window.removeEventListener("wt_period_changed", handlePeriodChange);
  }, []);

  const updatePeriod = (next: PeriodSelector) => {
    setPeriodState(next);
    setPersistedPeriod(next);
  };

  return [period, updatePeriod];
}

export const MONTH_SHORT_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const MONTH_FULL_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function formatPeriodLabel(period: PeriodSelector): string {
  const monthName = MONTH_SHORT_NAMES[period.month - 1] || "Oct";
  return `${monthName} ${period.year}`;
}

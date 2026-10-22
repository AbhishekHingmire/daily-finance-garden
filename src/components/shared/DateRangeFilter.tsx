import { useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DateRangePreset = "month" | "year" | "custom" | "1m" | "6m" | "12m";

export interface DateRangeValue {
  preset: DateRangePreset;
  year?: number;  // e.g. 2026
  month?: number; // 1 to 12 (e.g. 10 for October)
  customFrom?: string; // YYYY-MM-DD
  customTo?: string;   // YYYY-MM-DD
}

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Filter helper to test if an ISO date string falls within the selected DateRangeValue.
 * Default reference: October 2026.
 */
export function matchesDateRange(
  dateString: string,
  range: DateRangeValue,
  referenceDate = new Date(2026, 9, 22)
): boolean {
  if (!dateString) return false;
  const itemDate = dateString.slice(0, 10);

  // Custom range
  if (range.preset === "custom") {
    if (range.customFrom && itemDate < range.customFrom) return false;
    if (range.customTo && itemDate > range.customTo) return false;
    return true;
  }

  // Specific single month of a year (e.g., Oct 2026, May 2026)
  if (range.preset === "month" || range.preset === "1m") {
    const targetYear = range.year ?? referenceDate.getFullYear();
    const targetMonth = range.month ?? (referenceDate.getMonth() + 1);
    const prefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
    return itemDate.startsWith(prefix);
  }

  // Full year selection (Jan to Dec of selected year)
  if (range.preset === "year") {
    const targetYear = range.year ?? referenceDate.getFullYear();
    return itemDate.startsWith(`${targetYear}-`);
  }

  // Legacy relative presets (6m, 12m) for test compatibility
  const monthsBack = range.preset === "6m" ? 6 : 12;
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (monthsBack - 1), 1);
  const startIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
  const endIso = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}-31`;

  return itemDate >= startIso && itemDate <= endIso;
}

export function DateRangeFilter({
  value,
  onChange,
  className = "",
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}) {
  const currentYear = value.year ?? 2026;
  const activeMonth = value.month ?? (value.preset === "1m" || value.preset === "month" ? 10 : undefined);

  const handleMonthSelect = (monthIndex: number) => {
    const m = monthIndex + 1;
    onChange({
      preset: "month",
      year: currentYear,
      month: m,
      customFrom: `${currentYear}-${String(m).padStart(2, "0")}-01`,
      customTo: `${currentYear}-${String(m).padStart(2, "0")}-31`,
    });
  };

  const handleYearSelect = () => {
    onChange({
      preset: "year",
      year: currentYear,
      month: undefined,
      customFrom: `${currentYear}-01-01`,
      customTo: `${currentYear}-12-31`,
    });
  };

  const handleCustomToggle = () => {
    if (value.preset === "custom") {
      // Toggle back to active month
      handleMonthSelect((activeMonth ? activeMonth - 1 : 9));
    } else {
      onChange({
        preset: "custom",
        year: currentYear,
        month: activeMonth,
        customFrom: value.customFrom || `${currentYear}-01-01`,
        customTo: value.customTo || `${currentYear}-12-31`,
      });
    }
  };

  const changeYear = (delta: number) => {
    const newYear = currentYear + delta;
    if (value.preset === "month") {
      onChange({
        ...value,
        year: newYear,
        customFrom: `${newYear}-${String(activeMonth || 10).padStart(2, "0")}-01`,
        customTo: `${newYear}-${String(activeMonth || 10).padStart(2, "0")}-31`,
      });
    } else if (value.preset === "year") {
      onChange({
        ...value,
        year: newYear,
        customFrom: `${newYear}-01-01`,
        customTo: `${newYear}-12-31`,
      });
    } else {
      onChange({
        ...value,
        year: newYear,
      });
    }
  };

  // Human readable active label
  const rangeDescription = useMemo(() => {
    if (value.preset === "custom") {
      return `Custom: ${value.customFrom || "Start"} to ${value.customTo || "End"}`;
    }
    if (value.preset === "year") {
      return `Full Year ${currentYear} (Jan – Dec)`;
    }
    const m = activeMonth || 10;
    return `${FULL_MONTH_NAMES[m - 1]} ${currentYear}`;
  }, [value, currentYear, activeMonth]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Year Stepper Selector */}
        <div className="inline-flex items-center rounded-xl border border-border/80 bg-card p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => changeYear(-1)}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Previous Year"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="px-2 text-xs font-black tracking-tight text-foreground">
            {currentYear}
          </span>
          <button
            type="button"
            onClick={() => changeYear(1)}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Next Year"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* 12 Months Pills Row (Jan to Dec for that year) */}
        <div className="inline-flex max-w-full overflow-x-auto items-center rounded-xl border border-border/80 bg-muted/60 p-1 shadow-2xs no-scrollbar">
          {MONTH_NAMES.map((name, idx) => {
            const m = idx + 1;
            const isSelected =
              (value.preset === "month" || value.preset === "1m") &&
              (activeMonth === m);

            return (
              <button
                key={name}
                type="button"
                onClick={() => handleMonthSelect(idx)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all shrink-0 ${
                  isSelected
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* Full Year & Custom Range Buttons */}
        <div className="inline-flex items-center rounded-xl border border-border/80 bg-muted/60 p-1 shadow-2xs">
          <button
            type="button"
            onClick={handleYearSelect}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
              value.preset === "year"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All {currentYear}
          </button>
          <button
            type="button"
            onClick={handleCustomToggle}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
              value.preset === "custom"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Custom
          </button>
        </div>

        {/* Active Selection Badge */}
        <span className="hidden sm:inline-flex text-[11px] font-bold text-muted-foreground ml-1">
          {rangeDescription}
        </span>
      </div>

      {/* Inline Date Pickers for Custom Range */}
      {value.preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-card p-2 shadow-2xs animate-in fade-in-50 duration-150">
          <div className="flex items-center gap-1.5 px-1.5 text-xs text-muted-foreground">
            <Calendar size={13} className="text-primary" />
            <span className="font-semibold text-foreground">From:</span>
            <input
              type="date"
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={value.customFrom || `${currentYear}-01-01`}
              onChange={(e) =>
                onChange({
                  ...value,
                  preset: "custom",
                  customFrom: e.target.value,
                })
              }
            />
          </div>

          <span className="text-xs text-muted-foreground font-bold">→</span>

          <div className="flex items-center gap-1.5 px-1.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">To:</span>
            <input
              type="date"
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={value.customTo || `${currentYear}-12-31`}
              onChange={(e) =>
                onChange({
                  ...value,
                  preset: "custom",
                  customTo: e.target.value,
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

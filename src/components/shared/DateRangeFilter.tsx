import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DateRangePreset = "1m" | "3m" | "6m" | "12m" | "all" | "custom";

export interface DateRangeValue {
  preset: DateRangePreset;
  customFrom?: string; // YYYY-MM-DD
  customTo?: string;   // YYYY-MM-DD
  selectedMonth?: string; // YYYY-MM (e.g. "2026-10")
}

export const PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "1m", label: "1 Month" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "12m", label: "12 Months" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

/**
 * Filter helper to test if an ISO date string falls within the selected DateRangeValue.
 */
export function matchesDateRange(dateString: string, range: DateRangeValue, referenceDate = new Date(2026, 9, 22)): boolean {
  if (!dateString) return false;
  const itemDate = dateString.slice(0, 10);

  if (range.preset === "all") return true;

  if (range.preset === "custom") {
    if (range.customFrom && itemDate < range.customFrom) return false;
    if (range.customTo && itemDate > range.customTo) return false;
    return true;
  }

  if (range.preset === "1m") {
    if (range.selectedMonth) {
      return itemDate.slice(0, 7) === range.selectedMonth;
    }
    const y = referenceDate.getFullYear();
    const m = String(referenceDate.getMonth() + 1).padStart(2, "0");
    return itemDate.slice(0, 7) === `${y}-${m}`;
  }

  // Multi-month presets (3m, 6m, 12m)
  const monthsBack = range.preset === "3m" ? 3 : range.preset === "6m" ? 6 : 12;
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (monthsBack - 1), 1);
  const startIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
  const endIso = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}-31`;

  return itemDate >= startIso && itemDate <= endIso;
}

export function DateRangeFilter({
  value,
  onChange,
  showMonthNavigator = true,
  className = "",
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  showMonthNavigator?: boolean;
  className?: string;
}) {
  const [showCustomModal, setShowCustomModal] = useState(false);

  const selectedMonth = value.selectedMonth || "2026-10";
  const monthDate = new Date(`${selectedMonth}-01T00:00:00`);
  const formattedMonth = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(
    Number.isNaN(monthDate.getTime()) ? new Date() : monthDate
  );

  const shiftMonth = (delta: number) => {
    const d = new Date(`${selectedMonth}-01T00:00:00`);
    d.setMonth(d.getMonth() + delta);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    onChange({
      ...value,
      preset: "1m",
      selectedMonth: newMonth,
    });
  };

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === "custom") {
      setShowCustomModal(true);
      onChange({
        ...value,
        preset: "custom",
        customFrom: value.customFrom || "2026-05-01",
        customTo: value.customTo || "2026-10-31",
      });
    } else {
      onChange({
        ...value,
        preset,
      });
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Preset Dropdown / Buttons */}
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1 shadow-2xs">
        <div className="flex items-center px-1 text-muted-foreground">
          <CalendarDays size={14} />
        </div>
        <select
          className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer py-1 pr-2"
          value={value.preset}
          onChange={(e) => handlePresetSelect(e.target.value as DateRangePreset)}
          aria-label="Select Date Range Filter"
        >
          {PRESET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Month Navigator (visible when in 1 Month mode) */}
      {value.preset === "1m" && showMonthNavigator && (
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-1.5 py-1 shadow-2xs">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft size={13} />
          </Button>
          <span className="min-w-20 text-center text-xs font-bold text-foreground">
            {formattedMonth}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight size={13} />
          </Button>
        </div>
      )}

      {/* Custom Date Pickers (visible when Custom is selected) */}
      {value.preset === "custom" && (
        <div className="flex items-center gap-1.5 text-xs">
          <label className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">From:</span>
            <input
              type="date"
              className="wt-field h-8 w-32 py-0 text-xs"
              value={value.customFrom || ""}
              onChange={(e) => onChange({ ...value, customFrom: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">To:</span>
            <input
              type="date"
              className="wt-field h-8 w-32 py-0 text-xs"
              value={value.customTo || ""}
              onChange={(e) => onChange({ ...value, customTo: e.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

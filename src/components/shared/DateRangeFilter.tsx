import { Calendar, CalendarDays } from "lucide-react";

export type DateRangePreset = "1m" | "6m" | "12m" | "custom";

export interface DateRangeValue {
  preset: DateRangePreset;
  customFrom?: string; // YYYY-MM-DD
  customTo?: string;   // YYYY-MM-DD
}

export const PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "1m", label: "1 Month" },
  { value: "6m", label: "6 Months" },
  { value: "12m", label: "12 Months" },
  { value: "custom", label: "Custom Range" },
];

/**
 * Filter helper to test if an ISO date string falls within the selected DateRangeValue.
 * Uses reference date (Oct 2026) to match the demo data accurately.
 */
export function matchesDateRange(
  dateString: string,
  range: DateRangeValue,
  referenceDate = new Date(2026, 9, 22)
): boolean {
  if (!dateString) return false;
  const itemDate = dateString.slice(0, 10);

  if (range.preset === "custom") {
    if (range.customFrom && itemDate < range.customFrom) return false;
    if (range.customTo && itemDate > range.customTo) return false;
    return true;
  }

  if (range.preset === "1m") {
    // Current month (e.g. 2026-10)
    const y = referenceDate.getFullYear();
    const m = String(referenceDate.getMonth() + 1).padStart(2, "0");
    return itemDate.slice(0, 7) === `${y}-${m}`;
  }

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
  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === "custom") {
      onChange({
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
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {/* Groww-style Segmented Pills */}
      <div className="inline-flex items-center rounded-xl bg-muted/70 p-1 border border-border/60 shadow-2xs">
        {PRESET_OPTIONS.map((opt) => {
          const isActive = value.preset === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handlePresetSelect(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-card text-foreground shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Pickers (smoothly revealed when Custom Range is active) */}
      {value.preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-card p-1.5 shadow-2xs animate-in fade-in-50 duration-150">
          <div className="flex items-center gap-1.5 px-1.5 text-xs text-muted-foreground">
            <Calendar size={13} className="text-primary" />
            <span className="font-semibold text-foreground">From:</span>
            <input
              type="date"
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={value.customFrom || "2026-05-01"}
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
              value={value.customTo || "2026-10-31"}
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

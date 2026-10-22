import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react";
import {
  type DateRangeValue,
  MONTH_NAMES,
  FULL_MONTH_NAMES,
} from "@/components/shared/DateRangeFilter";
import type { Transaction } from "@/lib/wealthtrack";

export interface CashFlowVelocityChartProps {
  transactions: Transaction[];
  dateRange: DateRangeValue;
  money: (amount: number) => string;
  onNavigateToReports?: () => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

interface VelocityItem {
  key: string;
  label: string;
  shortLabel: string;
  fullDateLabel: string;
  isOngoing?: boolean;
  income: number;
  expense: number;
}

function isInflow(type: string): boolean {
  return (
    type === "Income" ||
    type === "Borrow / Loan Taken" ||
    type === "Debt Recovery" ||
    type === "Refund"
  );
}

function isOutflow(type: string): boolean {
  return (
    type === "Expense" ||
    type === "EMI / Loan Payment" ||
    type === "Lend / Loan Given"
  );
}

export function CashFlowVelocityChart({
  transactions,
  dateRange,
  money,
  onNavigateToReports,
  title = "Cash Flow Velocity",
  subtitle,
  className = "",
}: CashFlowVelocityChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Reference today date (matching application context: Oct 2026)
  const today = useMemo(() => {
    // If today is actually in 2026, use real date; otherwise anchor to 2026-10-22
    const now = new Date();
    if (now.getFullYear() === 2026) return now;
    return new Date(2026, 9, 22);
  }, []);

  const isMonthlyFilter = dateRange.preset === "month" || dateRange.preset === "1m";
  const targetYear = dateRange.year ?? today.getFullYear();
  const targetMonth = dateRange.month ?? today.getMonth() + 1; // 1 to 12

  // Build chart items depending on whether single-month or multi-month/year filter is selected
  const chartItems = useMemo<VelocityItem[]>(() => {
    if (isMonthlyFilter) {
      // Single month selected: Break down into weekly buckets till today's date if current month
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      const isCurrentMonth =
        today.getFullYear() === targetYear && today.getMonth() + 1 === targetMonth;
      const todayDay = isCurrentMonth ? today.getDate() : daysInMonth;

      const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
      const monthShort = MONTH_NAMES[targetMonth - 1] ?? "Mo";

      const weekRanges: {
        weekNum: number;
        startDay: number;
        endDay: number;
      }[] = [
        { weekNum: 1, startDay: 1, endDay: 7 },
        { weekNum: 2, startDay: 8, endDay: 14 },
        { weekNum: 3, startDay: 15, endDay: 21 },
        { weekNum: 4, startDay: 22, endDay: 28 },
      ];

      if (daysInMonth >= 29) {
        weekRanges.push({ weekNum: 5, startDay: 29, endDay: daysInMonth });
      }

      // Filter weeks up till today's date if current month
      const visibleWeeks = weekRanges.filter((w) => {
        if (!isCurrentMonth) return true; // Show all weeks for past or future months
        return w.startDay <= todayDay; // Show only weeks that have commenced
      });

      return visibleWeeks.map((w) => {
        const startIso = `${monthPrefix}-${String(w.startDay).padStart(2, "0")}`;
        const endIso = `${monthPrefix}-${String(w.endDay).padStart(2, "0")}`;
        const isOngoing = isCurrentMonth && todayDay >= w.startDay && todayDay <= w.endDay;

        const weekTxs = transactions.filter((t) => {
          const d = t.date.slice(0, 10);
          return d >= startIso && d <= endIso;
        });

        const income = weekTxs
          .filter((t) => isInflow(t.type))
          .reduce((sum, t) => sum + t.amount, 0);

        const expense = weekTxs
          .filter((t) => isOutflow(t.type))
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          key: `wk-${w.weekNum}`,
          label: isOngoing ? `Wk ${w.weekNum} (Ongoing)` : `Wk ${w.weekNum}`,
          shortLabel: `Wk ${w.weekNum}`,
          fullDateLabel: `${monthShort} ${w.startDay} – ${w.endDay}, ${targetYear}${
            isOngoing ? " · Ongoing" : ""
          }`,
          isOngoing,
          income,
          expense,
        };
      });
    }

    // Year or multi-month filter selected: Show monthly breakdown
    if (dateRange.preset === "year") {
      // 12 months for the selected year
      return MONTH_NAMES.map((mName, idx) => {
        const mNum = idx + 1;
        const prefix = `${targetYear}-${String(mNum).padStart(2, "0")}`;
        const mTransactions = transactions.filter((t) => t.date.startsWith(prefix));

        const income = mTransactions
          .filter((t) => isInflow(t.type))
          .reduce((sum, t) => sum + t.amount, 0);

        const expense = mTransactions
          .filter((t) => isOutflow(t.type))
          .reduce((sum, t) => sum + t.amount, 0);

        const isCurrent =
          today.getFullYear() === targetYear && today.getMonth() === idx;

        return {
          key: prefix,
          label: mName,
          shortLabel: mName,
          fullDateLabel: `${FULL_MONTH_NAMES[idx]} ${targetYear}${
            isCurrent ? " · Current" : ""
          }`,
          isOngoing: isCurrent,
          income,
          expense,
        };
      });
    }

    // Default multi-month (6m or legacy): Show rolling 6 months
    const rollingMonths = [
      { key: "2026-05", label: "May", year: 2026, monthIdx: 4 },
      { key: "2026-06", label: "Jun", year: 2026, monthIdx: 5 },
      { key: "2026-07", label: "Jul", year: 2026, monthIdx: 6 },
      { key: "2026-08", label: "Aug", year: 2026, monthIdx: 7 },
      { key: "2026-09", label: "Sep", year: 2026, monthIdx: 8 },
      { key: "2026-10", label: "Oct", year: 2026, monthIdx: 9 },
    ];

    return rollingMonths.map((m) => {
      const mTransactions = transactions.filter((t) => t.date.startsWith(m.key));
      const income = mTransactions
        .filter((t) => isInflow(t.type))
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = mTransactions
        .filter((t) => isOutflow(t.type))
        .reduce((sum, t) => sum + t.amount, 0);
      const isCurrent = m.key === "2026-10";

      return {
        key: m.key,
        label: m.label,
        shortLabel: m.label,
        fullDateLabel: `${FULL_MONTH_NAMES[m.monthIdx]} ${m.year}${
          isCurrent ? " · Current" : ""
        }`,
        isOngoing: isCurrent,
        income,
        expense,
      };
    });
  }, [isMonthlyFilter, dateRange.preset, targetYear, targetMonth, transactions, today]);

  // Max value for bar scaling
  const maxValue = useMemo(() => {
    const highest = Math.max(
      1,
      ...chartItems.map((item) => Math.max(item.income, item.expense))
    );
    return highest;
  }, [chartItems]);

  // Active item for inspection header
  const activeItem = useMemo(() => {
    if (hoveredKey) {
      return chartItems.find((i) => i.key === hoveredKey) ?? null;
    }
    // Default to the last item (most recent / ongoing)
    return chartItems[chartItems.length - 1] ?? null;
  }, [chartItems, hoveredKey]);

  const defaultSubtitle = isMonthlyFilter
    ? `Weekly cash inflows vs outflows for ${MONTH_NAMES[targetMonth - 1]} ${targetYear}`
    : dateRange.preset === "year"
    ? `Monthly cash inflows vs outflows for ${targetYear}`
    : "Comparison of total money inflows vs outflows over time";

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-5 sm:p-6 wt-shadow flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header with Title and All Reports Link */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="wt-display text-base font-bold text-foreground">
                {title}
              </h3>
              {isMonthlyFilter && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Weekly View
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {subtitle ?? defaultSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                <span className="size-2.5 rounded-full bg-emerald-500 shadow-xs" /> Inflows
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                <span className="size-2.5 rounded-full bg-rose-500 shadow-xs" /> Outflows
              </span>
            </div>

            {onNavigateToReports && (
              <button
                type="button"
                className="text-xs font-semibold text-primary hover:underline ml-1"
                onClick={onNavigateToReports}
              >
                All Reports →
              </button>
            )}
          </div>
        </div>

        {/* Real-time Hover Inspection Banner */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/30 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <span>{activeItem?.fullDateLabel ?? "Period Velocity"}</span>
            {activeItem?.isOngoing && (
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                Ongoing
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 tabular-nums text-xs">
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
              +{money(activeItem ? activeItem.income : 0)}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="font-extrabold text-rose-600 dark:text-rose-400">
              −{money(activeItem ? activeItem.expense : 0)}
            </span>
            <span className="text-muted-foreground">·</span>
            <span
              className={`font-extrabold ${
                (activeItem ? activeItem.income - activeItem.expense : 0) >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              Net: {money(activeItem ? activeItem.income - activeItem.expense : 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Bar Chart with Track Heights and Hover Elevation */}
      <div className="mt-5 flex h-48 items-end justify-between gap-2 pt-4 border-b border-border/80 pb-2">
        {chartItems.length === 0 ? (
          <div className="w-full text-center py-12 text-xs text-muted-foreground">
            No transaction data available for this timeframe.
          </div>
        ) : (
          chartItems.map((item) => {
            const isHovered = hoveredKey === item.key;
            const isLatest = item.key === chartItems[chartItems.length - 1]?.key;
            const incHeight = Math.max(6, Math.round((item.income / maxValue) * 140));
            const expHeight = Math.max(6, Math.round((item.expense / maxValue) * 140));

            return (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`flex flex-1 flex-col items-center gap-2 h-full justify-end rounded-xl p-1 sm:p-1.5 transition-all cursor-pointer ${
                  isHovered
                    ? "bg-muted/70 ring-1 ring-primary/40 shadow-xs"
                    : isLatest && !hoveredKey
                    ? "bg-muted/20"
                    : "hover:bg-muted/30"
                }`}
              >
                <div className="flex w-full items-end justify-center gap-1 sm:gap-1.5 h-[140px]">
                  {/* Inflow Bar */}
                  <div className="h-full w-3 sm:w-4 flex items-end justify-center">
                    <div
                      style={{ height: `${incHeight}px` }}
                      className={`w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-xs transition-all duration-200 ${
                        isHovered ? "brightness-110 scale-y-105" : ""
                      }`}
                      title={`${item.label} Inflow: ${money(item.income)}`}
                    />
                  </div>

                  {/* Outflow Bar */}
                  <div className="h-full w-3 sm:w-4 flex items-end justify-center">
                    <div
                      style={{ height: `${expHeight}px` }}
                      className={`w-full rounded-t-md bg-gradient-to-t from-rose-600 to-rose-400 shadow-xs transition-all duration-200 ${
                        isHovered ? "brightness-110 scale-y-105" : ""
                      }`}
                      title={`${item.label} Outflow: ${money(item.expense)}`}
                    />
                  </div>
                </div>

                <div className="text-center w-full min-w-0">
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold block truncate transition-colors ${
                      isHovered || (isLatest && !hoveredKey)
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.shortLabel}
                  </span>
                  {item.isOngoing && (
                    <span className="hidden sm:inline-block text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                      Live
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
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
  isToday?: boolean;
  isOngoing?: boolean;
  isFuture?: boolean;
  income: number;
  expense: number;
  dayNumber?: number;
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

  // Reference today date (anchored to 2026-10-22 if mock year is 2026)
  const today = useMemo(() => {
    const now = new Date();
    if (now.getFullYear() === 2026) return now;
    return new Date(2026, 9, 22);
  }, []);

  const isMonthlyFilter = dateRange.preset === "month" || dateRange.preset === "1m";
  const targetYear = dateRange.year ?? today.getFullYear();
  const targetMonth = dateRange.month ?? today.getMonth() + 1; // 1 to 12

  // Build chart items: Day-wise when a month is selected, Month-wise when year/multi-month is selected
  const chartItems = useMemo<VelocityItem[]>(() => {
    if (isMonthlyFilter) {
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      const isCurrentMonth =
        today.getFullYear() === targetYear && today.getMonth() + 1 === targetMonth;
      const todayDay = isCurrentMonth ? today.getDate() : -1;

      const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
      const monthShort = MONTH_NAMES[targetMonth - 1] ?? "Mo";

      const dailyItems: VelocityItem[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, "0");
        const iso = `${monthPrefix}-${dayStr}`;
        const isToday = day === todayDay;
        const isFuture = isCurrentMonth && day > todayDay;

        const dayTxs = transactions.filter((t) => t.date.slice(0, 10) === iso);

        const income = dayTxs
          .filter((t) => isInflow(t.type))
          .reduce((sum, t) => sum + t.amount, 0);

        const expense = dayTxs
          .filter((t) => isOutflow(t.type))
          .reduce((sum, t) => sum + t.amount, 0);

        dailyItems.push({
          key: iso,
          label: `${monthShort} ${day}`,
          shortLabel: String(day),
          fullDateLabel: `${day} ${FULL_MONTH_NAMES[targetMonth - 1]} ${targetYear}${
            isToday ? " · Today" : isFuture ? " · Upcoming" : ""
          }`,
          isToday,
          isOngoing: isToday,
          isFuture,
          income,
          expense,
          dayNumber: day,
        });
      }

      return dailyItems;
    }

    // Year or multi-month selection: 12 months evenly distributed
    if (dateRange.preset === "year") {
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
          isToday: isCurrent,
          income,
          expense,
        };
      });
    }

    // Rolling 6 months default
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
        isToday: isCurrent,
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

  // Active item for inspection readout
  const activeItem = useMemo(() => {
    if (hoveredKey) {
      return chartItems.find((i) => i.key === hoveredKey) ?? null;
    }
    // Default to today if current month, or the latest item with transactions
    const todayItem = chartItems.find((i) => i.isToday);
    if (todayItem) return todayItem;
    const lastWithActivity = [...chartItems].reverse().find((i) => i.income > 0 || i.expense > 0);
    return lastWithActivity ?? chartItems[chartItems.length - 1] ?? null;
  }, [chartItems, hoveredKey]);

  const defaultSubtitle = isMonthlyFilter
    ? `Day-by-day cash velocity for ${FULL_MONTH_NAMES[targetMonth - 1]} ${targetYear}`
    : dateRange.preset === "year"
    ? `Monthly cash inflows vs outflows for ${targetYear}`
    : "Comparison of total money inflows vs outflows over time";

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-5 sm:p-6 wt-shadow flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header with Title and Optional All Reports Link */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="wt-display text-base font-bold text-foreground">
                {title}
              </h3>
              {isMonthlyFilter ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Day-by-Day View
                </span>
              ) : (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Monthly View
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

        {/* Real-time Hover Inspection Readout Banner */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/30 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span>{activeItem?.fullDateLabel ?? "Timeline Inspection"}</span>
            {activeItem?.isToday && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                Today
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

      {/* Visual Bar Chart (Evenly Spanned Day-Wise or Month-Wise Grid) */}
      <div className="mt-5 pt-3 border-b border-border/80 pb-2">
        <div className="flex h-44 items-end justify-between gap-0.5 sm:gap-1">
          {chartItems.map((item) => {
            const isHovered = hoveredKey === item.key;
            const incHeight =
              item.income > 0
                ? Math.max(8, Math.round((item.income / maxValue) * 140))
                : 0;
            const expHeight =
              item.expense > 0
                ? Math.max(8, Math.round((item.expense / maxValue) * 140))
                : 0;

            const hasActivity = item.income > 0 || item.expense > 0;

            return (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`group relative flex flex-1 flex-col items-center justify-end h-full transition-all cursor-pointer rounded-t-sm py-1 ${
                  isHovered
                    ? "bg-muted/80 ring-1 ring-primary/40"
                    : item.isToday
                    ? "bg-primary/5"
                    : "hover:bg-muted/40"
                }`}
              >
                {/* Bars Container */}
                <div className="flex w-full items-end justify-center gap-0.5 h-[140px] px-0.5">
                  {/* Inflow Bar */}
                  {incHeight > 0 ? (
                    <div
                      style={{ height: `${incHeight}px` }}
                      className={`w-full max-w-[10px] rounded-t-sm bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-2xs transition-all duration-150 ${
                        isHovered ? "brightness-110 scale-y-105" : ""
                      }`}
                      title={`${item.label} Inflow: ${money(item.income)}`}
                    />
                  ) : null}

                  {/* Outflow Bar */}
                  {expHeight > 0 ? (
                    <div
                      style={{ height: `${expHeight}px` }}
                      className={`w-full max-w-[10px] rounded-t-sm bg-gradient-to-t from-rose-600 to-rose-400 shadow-2xs transition-all duration-150 ${
                        isHovered ? "brightness-110 scale-y-105" : ""
                      }`}
                      title={`${item.label} Outflow: ${money(item.expense)}`}
                    />
                  ) : null}

                  {/* Resting Baseline Dot when no transaction */}
                  {!hasActivity && (
                    <div
                      className={`size-1 rounded-full mb-1 transition-colors ${
                        item.isToday
                          ? "bg-primary"
                          : item.isFuture
                          ? "bg-border/40"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Milestone Labels (Clean, uncluttered, non-overlapping) */}
        <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground px-1">
          {isMonthlyFilter ? (
            <>
              <span>Day 1</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
              <span>25</span>
              <span>Day {chartItems.length}</span>
            </>
          ) : (
            chartItems.map((item) => (
              <span
                key={item.key}
                className={item.isToday ? "text-primary font-black" : ""}
              >
                {item.shortLabel}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

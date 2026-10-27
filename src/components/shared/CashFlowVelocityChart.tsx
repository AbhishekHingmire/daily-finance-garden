import { useMemo, useState } from "react";
import { Maximize2 } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  type DateRangeValue,
  MONTH_NAMES,
  FULL_MONTH_NAMES,
} from "@/components/shared/DateRangeFilter";
import type { Transaction } from "@/lib/wealthtrack";
import { formatChartTick } from "@/lib/formatters";

export interface CashFlowVelocityChartProps {
  transactions: Transaction[];
  dateRange: DateRangeValue;
  money: (amount: number) => string;
  onNavigateToReports?: () => void;
  onExpand?: () => void;
  title?: string;
  subtitle?: string;
  className?: string;
  chartHeight?: number;
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
  net: number;
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
  onExpand,
  title = "Cash Flow Velocity",
  subtitle,
  className = "",
  chartHeight,
}: CashFlowVelocityChartProps) {
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

      // Fill width completely up to today for ongoing month; full month for past months
      const maxDayToShow = isCurrentMonth ? Math.max(1, todayDay) : daysInMonth;

      const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
      const monthShort = MONTH_NAMES[targetMonth - 1] ?? "Mo";

      const dailyItems: VelocityItem[] = [];

      for (let day = 1; day <= maxDayToShow; day++) {
        const dayStr = String(day).padStart(2, "0");
        const iso = `${monthPrefix}-${dayStr}`;
        const isToday = day === todayDay;

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
            isToday ? " · Today" : ""
          }`,
          isToday,
          isOngoing: isToday,
          isFuture: false,
          income,
          expense,
          net: income - expense,
          dayNumber: day,
        });
      }

      return dailyItems;
    }

    // Year or multi-month selection: months up to current month for current year
    if (dateRange.preset === "year") {
      const maxMonthIdx = targetYear === today.getFullYear() ? today.getMonth() : 11;
      return MONTH_NAMES.slice(0, maxMonthIdx + 1).map((mName, idx) => {
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
          net: income - expense,
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
        net: income - expense,
      };
    });
  }, [isMonthlyFilter, dateRange.preset, targetYear, targetMonth, transactions, today]);

  // Max value for scaling
  const maxValue = useMemo(() => {
    const highest = Math.max(
      1,
      ...chartItems.map((item) => Math.max(item.income, item.expense))
    );
    return highest;
  }, [chartItems]);

  // Clean ceiling for Y-axis scale and tick marks
  const ceilMax = useMemo(() => {
    if (maxValue <= 1000) return 1000;
    if (maxValue <= 5000) return 5000;
    if (maxValue <= 10000) return 10000;
    if (maxValue <= 20000) return 20000;
    if (maxValue <= 50000) return 50000;
    if (maxValue <= 100000) return 100000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
    return Math.ceil(maxValue / magnitude) * magnitude;
  }, [maxValue]);

  const yAxisTicks = useMemo(() => {
    return [
      0,
      Math.round(ceilMax * 0.33),
      Math.round(ceilMax * 0.66),
      ceilMax,
    ];
  }, [ceilMax]);

  const defaultSubtitle = isMonthlyFilter
    ? `Day-by-day cash velocity for ${FULL_MONTH_NAMES[targetMonth - 1]} ${targetYear}`
    : dateRange.preset === "year"
    ? `Monthly cash inflows vs outflows for ${targetYear}`
    : "Continuous cash inflow and outflow area wave";

  // Collision-free X-axis milestone markers
  const { milestoneTicks, milestoneLabelMap } = useMemo(() => {
    const labelMap = new Map<string, string>();

    if (!isMonthlyFilter) {
      const n = chartItems.length;
      let selectedItems: VelocityItem[] = [];
      if (n <= 6) {
        selectedItems = chartItems;
      } else {
        const step = Math.ceil(n / 6);
        selectedItems = chartItems.filter((_, i) => i === 0 || i === n - 1 || i % step === 0);
      }
      selectedItems.forEach((it) => labelMap.set(it.shortLabel, it.shortLabel));
      return {
        milestoneTicks: selectedItems.map((it) => it.shortLabel),
        milestoneLabelMap: labelMap,
      };
    }

    const n = chartItems.length;
    if (n <= 1) {
      return { milestoneTicks: [], milestoneLabelMap: labelMap };
    }

    const isCurrentMonth =
      today.getFullYear() === targetYear && today.getMonth() + 1 === targetMonth;
    const currentDay = isCurrentMonth ? today.getDate() : -1;

    const candidateDays = [1, 5, 10, 15, 20, 25, n].filter(
      (d, idx, arr) => d <= n && arr.indexOf(d) === idx
    );

    const filteredDays = candidateDays.filter(
      (d) => currentDay <= 0 || d === currentDay || Math.abs(d - currentDay) >= 3
    );

    if (currentDay > 1 && currentDay < n && !filteredDays.includes(currentDay)) {
      filteredDays.push(currentDay);
      filteredDays.sort((a, b) => a - b);
    }

    const cleanDays: number[] = [];
    for (const d of filteredDays) {
      const ratio = ((d - 1) / Math.max(1, n - 1)) * 100;
      const prevRatio =
        cleanDays.length > 0
          ? ((cleanDays[cleanDays.length - 1] - 1) / Math.max(1, n - 1)) * 100
          : -100;

      if (ratio - prevRatio >= 8 || d === currentDay || d === n) {
        if (
          d === currentDay &&
          cleanDays.length > 0 &&
          ratio - prevRatio < 8 &&
          cleanDays[cleanDays.length - 1] !== 1
        ) {
          cleanDays.pop();
        }
        cleanDays.push(d);
      }
    }

    cleanDays.forEach((d) => {
      const key = String(d);
      const label =
        d === 1
          ? "Day 1"
          : d === currentDay
          ? `Today (${d})`
          : d === n
          ? `Day ${d}`
          : String(d);
      labelMap.set(key, label);
    });

    return {
      milestoneTicks: cleanDays.map(String),
      milestoneLabelMap: labelMap,
    };
  }, [isMonthlyFilter, chartItems, today, targetYear, targetMonth]);

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-4 sm:p-5 pb-3.5 wt-shadow ${className}`}
    >
      <div>
        {/* Header with Title, Legends, and Always-Top-Right Expand CTA */}
        <div className="flex items-start justify-between gap-2.5 sm:gap-4 pb-3 border-b border-border/60">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="wt-display text-sm sm:text-base font-bold text-foreground truncate">
                {title}
              </h3>
              {isMonthlyFilter ? (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Day-by-Day Flow
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Monthly Flow
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
              {subtitle ?? defaultSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                onClick={onNavigateToReports}
              >
                All Reports →
              </button>
            )}

            {onExpand && (
              <button
                type="button"
                onClick={onExpand}
                className="grid size-7.5 place-items-center rounded-lg border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shadow-2xs cursor-pointer shrink-0"
                title="Expand Chart"
                aria-label="Expand Chart"
              >
                <Maximize2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Modern Recharts Area Chart */}
        <div className="mt-3 w-full" style={{ height: chartHeight ?? 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartItems}
              margin={{ top: 12, right: 8, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="velocityInflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.38} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="velocityOutflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.38} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.45}
              />

              <XAxis
                dataKey="shortLabel"
                axisLine={false}
                tickLine={false}
                ticks={milestoneTicks}
                tickFormatter={(val) => milestoneLabelMap.get(String(val)) ?? String(val)}
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10.5,
                  fontWeight: 600,
                }}
                dy={6}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                domain={[0, ceilMax]}
                ticks={yAxisTicks}
                tickFormatter={(val) => formatChartTick(Number(val))}
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10.5,
                  fontWeight: 600,
                }}
                dx={-4}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload as VelocityItem;
                  if (!item) return null;

                  return (
                    <div className="rounded-xl border border-border/80 bg-card/95 backdrop-blur-md px-3.5 py-2.5 text-xs shadow-xl min-w-[175px]">
                      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5 mb-1.5 font-bold text-foreground">
                        <span>{item.fullDateLabel}</span>
                        {item.isToday && (
                          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 tabular-nums text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="size-2 rounded-full bg-emerald-500" /> Inflows
                          </span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            +{money(item.income)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="size-2 rounded-full bg-rose-500" /> Outflows
                          </span>
                          <span className="font-extrabold text-rose-600 dark:text-rose-400">
                            −{money(item.expense)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/40 font-bold">
                          <span className="text-muted-foreground">Net Movement</span>
                          <span
                            className={
                              item.net >= 0
                                ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                                : "text-rose-600 dark:text-rose-400 font-extrabold"
                            }
                          >
                            {item.net >= 0 ? `+${money(item.net)}` : `−${money(Math.abs(item.net))}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
                cursor={{
                  stroke: "hsl(var(--muted-foreground))",
                  strokeWidth: 1.5,
                  strokeDasharray: "3 3",
                  strokeOpacity: 0.6,
                }}
              />

              <Area
                type="monotone"
                dataKey="income"
                name="Inflows"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#velocityInflowGrad)"
                isAnimationActive={false}
                activeDot={{ r: 5.5, strokeWidth: 2, stroke: "#ffffff", fill: "#10b981" }}
              />

              <Area
                type="monotone"
                dataKey="expense"
                name="Outflows"
                stroke="#f43f5e"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#velocityOutflowGrad)"
                isAnimationActive={false}
                activeDot={{ r: 5.5, strokeWidth: 2, stroke: "#ffffff", fill: "#f43f5e" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Symmetrical Bottom Velocity Metrics Footer */}
        <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-foreground">Period Velocity Movement</span>
            <span className="text-[11px] block text-muted-foreground mt-0.5">
              Inflows:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                +{money(chartItems.reduce((s, it) => s + it.income, 0))}
              </strong>{" "}
              · Outflows:{" "}
              <strong className="text-rose-600 dark:text-rose-400 font-bold">
                −{money(chartItems.reduce((s, it) => s + it.expense, 0))}
              </strong>
            </span>
          </div>
          <div className="text-right">
            <span
              className={`font-extrabold tabular-nums ${
                chartItems.reduce((s, it) => s + (it.income - it.expense), 0) >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {chartItems.reduce((s, it) => s + (it.income - it.expense), 0) >= 0
                ? `+${money(chartItems.reduce((s, it) => s + (it.income - it.expense), 0))}`
                : `−${money(Math.abs(chartItems.reduce((s, it) => s + (it.income - it.expense), 0)))}`}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground block">
              Net Velocity Flow
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

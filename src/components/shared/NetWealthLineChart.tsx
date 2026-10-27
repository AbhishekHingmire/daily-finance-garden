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
  ReferenceLine,
} from "recharts";
import type { Transaction } from "@/lib/wealthtrack";
import {
  type DateRangeValue,
  MONTH_NAMES,
  FULL_MONTH_NAMES,
} from "@/components/shared/DateRangeFilter";
import { formatChartTick } from "@/lib/formatters";

export interface NetWealthPoint {
  key: string;
  label: string;
  shortLabel: string;
  fullLabel: string;
  value: number;
  delta: number;
  day: number;
}

export function NetWealthLineChart({
  transactions,
  dateRange,
  money,
  title = "Cumulative Net Cash Flow Trend",
  subtitle = "Running cash flow accumulation across the selected timeframe",
  onExpand,
  className = "",
  chartHeight,
}: {
  transactions: Transaction[];
  dateRange: DateRangeValue;
  money: (amount: number) => string;
  title?: string;
  subtitle?: string;
  onExpand?: () => void;
  className?: string;
  chartHeight?: number;
}) {
  // Group transactions into sequential time points
  const points = useMemo<NetWealthPoint[]>(() => {
    const isMonthly = dateRange.preset === "month" || dateRange.preset === "1m";
    const targetYear = dateRange.year ?? 2026;
    const targetMonth = dateRange.month ?? 10;
    const now = new Date();
    const today = now.getFullYear() === 2026 ? now : new Date(2026, 9, 27);
    const todayDay = today.getDate();
    const isCurrentMonth =
      today.getFullYear() === targetYear && today.getMonth() + 1 === targetMonth;
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const maxDay = isCurrentMonth ? todayDay : daysInMonth;

    if (isMonthly) {
      const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
      const monthName = MONTH_NAMES[targetMonth - 1] ?? "Mo";

      let runningTotal = 0;
      const dailyPoints: NetWealthPoint[] = [];

      for (let d = 1; d <= maxDay; d++) {
        const iso = `${monthPrefix}-${String(d).padStart(2, "0")}`;
        const dayTxs = transactions.filter((t) => t.date.slice(0, 10) === iso);

        const inflow = dayTxs
          .filter(
            (t) =>
              (t.type === "Income" || t.type === "Refund") &&
              t.categoryId !== "cat-borrow" &&
              t.categoryId !== "cat-debt-recovery"
          )
          .reduce((sum, t) => sum + t.amount, 0);

        const outflow = dayTxs
          .filter(
            (t) =>
              (t.type === "Expense" || t.type === "EMI / Loan Payment") &&
              t.categoryId !== "cat-lend"
          )
          .reduce((sum, t) => sum + t.amount, 0);

        const netDay = inflow - outflow;
        runningTotal += netDay;

        dailyPoints.push({
          key: iso,
          label: `${monthName} ${d}`,
          shortLabel: String(d),
          fullLabel: `${d} ${FULL_MONTH_NAMES[targetMonth - 1]} ${targetYear}${
            d === todayDay && isCurrentMonth ? " · Today" : ""
          }`,
          value: runningTotal,
          delta: netDay,
          day: d,
        });
      }
      return dailyPoints;
    }

    // Year or multi-month: months up to current month for current year
    const year = dateRange.year ?? 2026;
    const maxMonthIdx = year === 2026 ? 9 : 11;
    let runningTotal = 0;

    return MONTH_NAMES.slice(0, maxMonthIdx + 1).map((mName, idx) => {
      const prefix = `${year}-${String(idx + 1).padStart(2, "0")}`;
      const mTxs = transactions.filter((t) => t.date.startsWith(prefix));

      const inflow = mTxs
        .filter(
          (t) =>
            (t.type === "Income" || t.type === "Refund") &&
            t.categoryId !== "cat-borrow" &&
            t.categoryId !== "cat-debt-recovery"
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const outflow = mTxs
        .filter(
          (t) =>
            (t.type === "Expense" || t.type === "EMI / Loan Payment") &&
            t.categoryId !== "cat-lend"
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const netMonth = inflow - outflow;
      runningTotal += netMonth;

      return {
        key: prefix,
        label: mName,
        shortLabel: mName,
        fullLabel: `${FULL_MONTH_NAMES[idx]} ${year}${
          year === 2026 && idx === 9 ? " · Current Month" : ""
        }`,
        value: runningTotal,
        delta: netMonth,
        day: idx + 1,
      };
    });
  }, [transactions, dateRange]);

  const { minVal, maxVal, yAxisTicks } = useMemo(() => {
    if (points.length === 0) {
      return { minVal: 0, maxVal: 1000, yAxisTicks: [0, 1000] };
    }
    const values = points.map((p) => p.value);
    const minRaw = Math.min(0, ...values);
    const maxRaw = Math.max(1000, ...values);

    const t1 = maxRaw;
    const t2 = Math.round(minRaw + (maxRaw - minRaw) * 0.66);
    const t3 = Math.round(minRaw + (maxRaw - minRaw) * 0.33);
    const t4 = minRaw;

    return {
      minVal: minRaw,
      maxVal: maxRaw,
      yAxisTicks: [t4, t3, t2, t1],
    };
  }, [points]);

  const isMonthlyFilter = dateRange.preset === "month" || dateRange.preset === "1m";

  // Collision-free milestone selection
  const { milestoneTicks, milestoneLabelMap } = useMemo(() => {
    const labelMap = new Map<string, string>();
    const n = points.length;
    if (n === 0) return { milestoneTicks: [], milestoneLabelMap: labelMap };

    if (!isMonthlyFilter) {
      let selectedPoints: NetWealthPoint[] = [];
      if (n <= 6) {
        selectedPoints = points;
      } else {
        const step = Math.ceil(n / 6);
        selectedPoints = points.filter((_, idx) => idx === 0 || idx === n - 1 || idx % step === 0);
      }
      selectedPoints.forEach((p) => labelMap.set(p.shortLabel, p.shortLabel));
      return {
        milestoneTicks: selectedPoints.map((p) => p.shortLabel),
        milestoneLabelMap: labelMap,
      };
    }

    const candidateDays = [1, 5, 10, 15, 20, 25, n].filter(
      (d, idx, arr) => d <= n && arr.indexOf(d) === idx
    );

    // Prune candidate days within 2 days of end point to prevent label collision
    const filteredDays = candidateDays.filter(
      (d) => d === n || Math.abs(d - n) >= 3
    );

    const cleanDays: number[] = [];
    for (const d of filteredDays) {
      const ratio = ((d - 1) / Math.max(1, n - 1)) * 100;
      const prevRatio =
        cleanDays.length > 0
          ? ((cleanDays[cleanDays.length - 1] - 1) / Math.max(1, n - 1)) * 100
          : -100;

      if (ratio - prevRatio >= 8 || d === n) {
        if (
          d === n &&
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
      const point = points.find((p) => p.day === d);
      const isEnd = d === n;
      const isToday = point?.fullLabel?.includes("Today");

      const label =
        d === 1
          ? "Day 1"
          : isEnd
          ? isToday
            ? `Today (${d})`
            : `Day ${d}`
          : String(d);

      labelMap.set(String(d), label);
    });

    return {
      milestoneTicks: cleanDays.map(String),
      milestoneLabelMap: labelMap,
    };
  }, [points, isMonthlyFilter]);

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-4 sm:p-5 pb-3.5 wt-shadow ${className}`}
    >
      <div>
        {/* Header with Title, Badge, and Always-Top-Right Expand CTA */}
        <div className="flex items-start justify-between gap-2.5 sm:gap-4 pb-3 border-b border-border/60">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="wt-display text-sm sm:text-base font-bold text-foreground truncate">
                {title}
              </h3>
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                Cumulative Trend
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
              data={points}
              margin={{ top: 12, right: 8, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="wealthTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.38} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.45}
              />

              {minVal < 0 && (
                <ReferenceLine
                  y={0}
                  stroke="hsl(var(--border))"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              )}

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
                domain={[minVal, maxVal]}
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
                  const item = payload[0]?.payload as NetWealthPoint;
                  if (!item) return null;

                  return (
                    <div className="rounded-xl border border-border/80 bg-card/95 backdrop-blur-md px-3.5 py-2.5 text-xs shadow-xl min-w-[175px]">
                      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5 mb-1.5 font-bold text-foreground">
                        <span>{item.fullLabel}</span>
                        {item.fullLabel?.includes("Today") && (
                          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 tabular-nums text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Cumulative Net</span>
                          <strong
                            className={
                              item.value >= 0
                                ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                                : "text-rose-600 dark:text-rose-400 font-extrabold"
                            }
                          >
                            {item.value >= 0 ? "+" : "−"}
                            {money(Math.abs(item.value))}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/40 font-bold">
                          <span className="text-muted-foreground">Day Delta</span>
                          <span
                            className={
                              item.delta >= 0
                                ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                                : "text-rose-600 dark:text-rose-400 font-extrabold"
                            }
                          >
                            {item.delta >= 0 ? "+" : "−"}
                            {money(Math.abs(item.delta))}
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
                dataKey="value"
                name="Cumulative Net"
                stroke="#10b981"
                strokeWidth={2.75}
                fillOpacity={1}
                fill="url(#wealthTrendGrad)"
                isAnimationActive={false}
                activeDot={{ r: 5.5, strokeWidth: 2, stroke: "#ffffff", fill: "#10b981" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

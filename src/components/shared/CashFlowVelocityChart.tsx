import { useMemo, useState } from "react";
import { Maximize2 } from "lucide-react";
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
  onExpand?: () => void;
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

// Helper to generate smooth Catmull-Rom / cubic bezier curves across SVG points
function buildSmoothPath(
  points: { x: number; y: number }[],
  baseY = 166,
  topY = 14
): string {
  if (points.length <= 1) {
    return points.length === 1
      ? `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
      : "";
  }
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 5.5;
    let cp1y = p1.y + (p2.y - p0.y) / 5.5;
    const cp2x = p2.x - (p3.x - p1.x) / 5.5;
    let cp2y = p2.y - (p3.y - p1.y) / 5.5;

    // Clamp control points so the wave never overshoots below the baseline or above top boundary
    cp1y = Math.min(baseY, Math.max(topY, cp1y));
    cp2y = Math.min(baseY, Math.max(topY, cp2y));

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
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
      { value: ceilMax, label: money(ceilMax) },
      { value: Math.round(ceilMax * 0.66), label: money(Math.round(ceilMax * 0.66)) },
      { value: Math.round(ceilMax * 0.33), label: money(Math.round(ceilMax * 0.33)) },
      { value: 0, label: money(0) },
    ];
  }, [ceilMax, money]);

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

  // Compute SVG coordinates and smooth paths across 1000x180 canvas
  const {
    inflowAreaPath,
    inflowLinePath,
    outflowAreaPath,
    outflowLinePath,
    activeX,
    activeInflowY,
    activeOutflowY,
  } = useMemo(() => {
    const N = chartItems.length;
    if (N === 0) {
      return {
        inflowAreaPath: "",
        inflowLinePath: "",
        outflowAreaPath: "",
        outflowLinePath: "",
        activeX: 500,
        activeInflowY: 166,
        activeOutflowY: 166,
      };
    }

    const inflowPts = chartItems.map((item, idx) => ({
      x: N > 1 ? (idx / (N - 1)) * 1000 : 500,
      y: 166 - (item.income / ceilMax) * 152,
    }));

    const outflowPts = chartItems.map((item, idx) => ({
      x: N > 1 ? (idx / (N - 1)) * 1000 : 500,
      y: 166 - (item.expense / ceilMax) * 152,
    }));

    const iLine = buildSmoothPath(inflowPts, 166, 14);
    const oLine = buildSmoothPath(outflowPts, 166, 14);

    const firstX = inflowPts[0].x.toFixed(1);
    const lastX = inflowPts[inflowPts.length - 1].x.toFixed(1);

    const iArea = iLine ? `${iLine} L ${lastX} 166 L ${firstX} 166 Z` : "";
    const oArea = oLine ? `${oLine} L ${lastX} 166 L ${firstX} 166 Z` : "";

    const activeIdx = activeItem
      ? chartItems.findIndex((it) => it.key === activeItem.key)
      : -1;
    const curX =
      activeIdx >= 0
        ? N > 1
          ? (activeIdx / (N - 1)) * 1000
          : 500
        : 500;
    const curInY = activeItem ? 166 - (activeItem.income / ceilMax) * 152 : 166;
    const curOutY = activeItem ? 166 - (activeItem.expense / ceilMax) * 152 : 166;

    return {
      inflowAreaPath: iArea,
      inflowLinePath: iLine,
      outflowAreaPath: oArea,
      outflowLinePath: oLine,
      activeX: curX,
      activeInflowY: curInY,
      activeOutflowY: curOutY,
    };
  }, [chartItems, ceilMax, activeItem]);

  const defaultSubtitle = isMonthlyFilter
    ? `Day-by-day cash velocity for ${FULL_MONTH_NAMES[targetMonth - 1]} ${targetYear}`
    : dateRange.preset === "year"
    ? `Monthly cash inflows vs outflows for ${targetYear}`
    : "Continuous cash inflow and outflow area wave";

  // Compute clean X-axis milestone markers based on current view
  const xAxisMilestones = useMemo(() => {
    if (!isMonthlyFilter) {
      return chartItems.map((item, i) => ({
        key: item.key,
        label: item.shortLabel,
        isCurrent: item.isToday,
        ratio: chartItems.length > 1 ? (i / (chartItems.length - 1)) * 100 : 50,
      }));
    }

    const n = chartItems.length;
    if (n <= 1) return [];

    // Milestone day numbers to display along the horizontal axis
    const days = [1, 5, 10, 15, 20, 25, n].filter(
      (d, idx, arr) => d <= n && arr.indexOf(d) === idx
    );

    return days.map((d) => ({
      key: `day-${d}`,
      label: d === 1 ? "Day 1" : d === n ? `Day ${d}` : String(d),
      isCurrent:
        d ===
        (today.getFullYear() === targetYear && today.getMonth() + 1 === targetMonth
          ? today.getDate()
          : -1),
      ratio: ((d - 1) / Math.max(1, n - 1)) * 100,
    }));
  }, [isMonthlyFilter, chartItems, today, targetYear, targetMonth]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.min(
      chartItems.length - 1,
      Math.max(0, Math.round(ratio * (chartItems.length - 1)))
    );
    if (chartItems[idx]) {
      setHoveredKey(chartItems[idx].key);
    }
  };

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

        {/* Real-time Hover Inspection Readout Banner */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/30 px-3.5 py-2 text-xs">
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

      {/* Chart Canvas with Left Vertical Y-Axis, Guidelines, and Continuous SVG Area Wave */}
      <div className="mt-3.5">
        <div className="flex gap-2 sm:gap-3">
          {/* Vertical Left Y-Axis Bar with Amount Numbers */}
          <div className="flex flex-col justify-between items-end pr-2.5 h-[168px] text-[10px] font-bold text-muted-foreground tabular-nums select-none shrink-0 border-r border-border/80 min-w-[52px] sm:min-w-[64px] py-1">
            {yAxisTicks.map((tick, i) => (
              <span key={i} className="leading-none">
                {tick.label}
              </span>
            ))}
          </div>

          {/* Continuous SVG Area Wave Chart Container */}
          <div
            className="relative flex-1 h-[168px] cursor-crosshair select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredKey(null)}
          >
            {/* SVG Wave Canvas */}
            <svg
              viewBox="0 0 1000 180"
              preserveAspectRatio="none"
              className="absolute inset-0 size-full overflow-visible"
            >
              <defs>
                {/* Emerald Inflow Gradient */}
                <linearGradient id="cf-inflow-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.48" />
                  <stop offset="70%" stopColor="#10b981" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                </linearGradient>

                {/* Rose Outflow Gradient */}
                <linearGradient id="cf-outflow-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.42" />
                  <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Horizontal Guidelines matching Y-Axis Ticks */}
              <line
                x1="0"
                y1="14"
                x2="1000"
                y2="14"
                stroke="currentColor"
                strokeDasharray="4 4"
                className="text-border/40"
              />
              <line
                x1="0"
                y1="64.6"
                x2="1000"
                y2="64.6"
                stroke="currentColor"
                strokeDasharray="4 4"
                className="text-border/40"
              />
              <line
                x1="0"
                y1="115.3"
                x2="1000"
                y2="115.3"
                stroke="currentColor"
                strokeDasharray="4 4"
                className="text-border/40"
              />
              <line
                x1="0"
                y1="166"
                x2="1000"
                y2="166"
                stroke="currentColor"
                className="text-border/80"
                strokeWidth="1"
              />

              {/* Filled Continuous Area Waves */}
              {inflowAreaPath && (
                <path d={inflowAreaPath} fill="url(#cf-inflow-grad)" />
              )}
              {outflowAreaPath && (
                <path d={outflowAreaPath} fill="url(#cf-outflow-grad)" />
              )}

              {/* Glowing Boundary Contour Strokes */}
              {inflowLinePath && (
                <path
                  d={inflowLinePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {outflowLinePath && (
                <path
                  d={outflowLinePath}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Activity Dots on Days with Movement */}
              {chartItems.map((item, idx) => {
                const x =
                  chartItems.length > 1
                    ? (idx / (chartItems.length - 1)) * 1000
                    : 500;
                const hasInflow = item.income > 0;
                const hasOutflow = item.expense > 0;
                if (!hasInflow && !hasOutflow) return null;

                const isCur = activeItem?.key === item.key;

                return (
                  <g key={item.key}>
                    {hasInflow && (
                      <circle
                        cx={x}
                        cy={166 - (item.income / ceilMax) * 152}
                        r={isCur ? 4.5 : 2.5}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}
                    {hasOutflow && (
                      <circle
                        cx={x}
                        cy={166 - (item.expense / ceilMax) * 152}
                        r={isCur ? 4.5 : 2.5}
                        fill="#f43f5e"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}
                  </g>
                );
              })}

              {/* Active / Hovered Vertical Guide Line and Nodes */}
              {activeItem && (
                <g>
                  <line
                    x1={activeX}
                    y1={14}
                    x2={activeX}
                    y2={166}
                    stroke="currentColor"
                    strokeDasharray="3 3"
                    className="text-muted-foreground/60"
                    strokeWidth="1.5"
                  />
                  {activeItem.income > 0 && (
                    <circle
                      cx={activeX}
                      cy={activeInflowY}
                      r="6"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  )}
                  {activeItem.expense > 0 && (
                    <circle
                      cx={activeX}
                      cy={activeOutflowY}
                      r="6"
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  )}
                  {activeItem.income === 0 && activeItem.expense === 0 && (
                    <circle
                      cx={activeX}
                      cy={166}
                      r="4"
                      fill="currentColor"
                      className="text-muted-foreground"
                    />
                  )}
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* X-Axis Milestone Labels with Exact Proportional Alignment */}
        <div className="flex gap-2 sm:gap-3 mt-1.5">
          <div className="min-w-[52px] sm:min-w-[64px] shrink-0" />
          <div className="relative flex-1 h-5 text-[10px] font-bold text-muted-foreground select-none">
            {xAxisMilestones.map((ms, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === xAxisMilestones.length - 1;
              const transformClass = isFirst
                ? "translate-x-0"
                : isLast
                ? "-translate-x-full"
                : "-translate-x-1/2";

              return (
                <span
                  key={ms.key}
                  style={{ left: `${ms.ratio}%` }}
                  className={`absolute top-0 transform ${transformClass} whitespace-nowrap ${
                    ms.isCurrent ? "text-primary font-black" : ""
                  }`}
                >
                  {ms.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Symmetrical Bottom Velocity Metrics Footer */}
        <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-foreground">Period Velocity Movement</span>
            <span className="text-[11px] block text-muted-foreground mt-0.5">
              Inflows: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">+{money(chartItems.reduce((s, it) => s + it.income, 0))}</strong> · Outflows: <strong className="text-rose-600 dark:text-rose-400 font-bold">−{money(chartItems.reduce((s, it) => s + it.expense, 0))}</strong>
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

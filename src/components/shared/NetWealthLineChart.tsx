import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/wealthtrack";
import {
  type DateRangeValue,
  MONTH_NAMES,
  FULL_MONTH_NAMES,
} from "@/components/shared/DateRangeFilter";

export function NetWealthLineChart({
  transactions,
  dateRange,
  money,
  title = "Cumulative Net Cash Flow Trend",
  subtitle = "Running cash flow accumulation across the selected timeframe",
}: {
  transactions: Transaction[];
  dateRange: DateRangeValue;
  money: (amount: number) => string;
  title?: string;
  subtitle?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group transactions into sequential time points
  const points = useMemo(() => {
    const isMonthly = dateRange.preset === "month" || dateRange.preset === "1m";
    const targetYear = dateRange.year ?? 2026;
    const targetMonth = dateRange.month ?? 10;
    const isCurrentMonth = targetYear === 2026 && targetMonth === 10;
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const maxDay = isCurrentMonth ? 22 : daysInMonth;

    if (isMonthly) {
      const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
      const monthName = MONTH_NAMES[targetMonth - 1] ?? "Mo";

      let runningTotal = 0;
      const dailyPoints: {
        label: string;
        shortLabel: string;
        fullLabel: string;
        value: number;
        delta: number;
        day: number;
      }[] = [];

      for (let d = 1; d <= maxDay; d++) {
        const iso = `${monthPrefix}-${String(d).padStart(2, "0")}`;
        const dayTxs = transactions.filter((t) => t.date.slice(0, 10) === iso);

        const inflow = dayTxs
          .filter(
            (t) =>
              t.type === "Income" ||
              t.type === "Borrow / Loan Taken" ||
              t.type === "Debt Recovery" ||
              t.type === "Refund"
          )
          .reduce((sum, t) => sum + t.amount, 0);

        const outflow = dayTxs
          .filter(
            (t) =>
              t.type === "Expense" ||
              t.type === "EMI / Loan Payment" ||
              t.type === "Lend / Loan Given"
          )
          .reduce((sum, t) => sum + t.amount, 0);

        const netDay = inflow - outflow;
        runningTotal += netDay;

        dailyPoints.push({
          label: `${monthName} ${d}`,
          shortLabel: String(d),
          fullLabel: `${d} ${FULL_MONTH_NAMES[targetMonth - 1]} ${targetYear}${
            d === maxDay && isCurrentMonth ? " · Today" : ""
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
            t.type === "Income" ||
            t.type === "Borrow / Loan Taken" ||
            t.type === "Debt Recovery" ||
            t.type === "Refund"
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const outflow = mTxs
        .filter(
          (t) =>
            t.type === "Expense" ||
            t.type === "EMI / Loan Payment" ||
            t.type === "Lend / Loan Given"
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const netMonth = inflow - outflow;
      runningTotal += netMonth;

      return {
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

  // Coordinate geometry calculations (1000 x 180 grid)
  const { pathD, areaD, coordinates, milestones, minVal, maxVal } = useMemo(() => {
    if (points.length === 0) {
      return { pathD: "", areaD: "", coordinates: [], milestones: [], minVal: 0, maxVal: 0 };
    }

    const values = points.map((p) => p.value);
    const minRaw = Math.min(0, ...values);
    const maxRaw = Math.max(1000, ...values);
    const range = maxRaw - minRaw || 1;

    const width = 1000;
    const height = 180;
    const paddingX = 15;
    const paddingTop = 14;
    const paddingBottom = 14;
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingTop - paddingBottom;

    const coords = points.map((p, idx) => {
      const x = paddingX + (idx / Math.max(1, points.length - 1)) * innerWidth;
      const normalizedY = (p.value - minRaw) / range;
      const y = height - paddingBottom - normalizedY * innerHeight;
      return { x, y, ...p };
    });

    // Generate smooth bezier curve path
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const controlX1 = curr.x + (next.x - curr.x) / 2;
      const controlY1 = curr.y;
      const controlX2 = curr.x + (next.x - curr.x) / 2;
      const controlY2 = next.y;
      d += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${next.x} ${next.y}`;
    }

    const baselineY = height - paddingBottom;
    const area = `${d} L ${coords[coords.length - 1].x} ${baselineY} L ${coords[0].x} ${baselineY} Z`;

    const milestoneList = coords.filter(
      (pt, idx) =>
        idx === 0 ||
        idx === coords.length - 1 ||
        (pt.day && pt.day % 5 === 0)
    );

    return {
      pathD: d,
      areaD: area,
      coordinates: coords,
      milestones: milestoneList,
      minVal: minRaw,
      maxVal: maxRaw,
    };
  }, [points]);

  // Y-axis tick calculations matching CashFlowVelocityChart
  const yAxisTicks = useMemo(() => {
    const t1 = maxVal;
    const t2 = minVal + (maxVal - minVal) * 0.66;
    const t3 = minVal + (maxVal - minVal) * 0.33;
    const t4 = minVal;
    const formatTick = (val: number) => {
      if (Math.abs(val) >= 100000) {
        return `₹${(val / 100000).toFixed(1)}L`;
      }
      if (Math.abs(val) >= 1000) {
        return `₹${Math.round(val / 1000)}k`;
      }
      return `₹${Math.round(val)}`;
    };
    return [
      { val: t1, label: formatTick(t1) },
      { val: t2, label: formatTick(t2) },
      { val: t3, label: formatTick(t3) },
      { val: t4, label: formatTick(t4) },
    ];
  }, [minVal, maxVal]);

  const activeIndex = hoveredIndex !== null ? hoveredIndex : coordinates.length - 1;
  const activePoint = coordinates[activeIndex];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (coordinates.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.min(
      coordinates.length - 1,
      Math.max(0, Math.round(ratio * (coordinates.length - 1)))
    );
    setHoveredIndex(idx);
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 pb-3.5 wt-shadow">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="wt-display text-base font-bold text-foreground">{title}</h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                Cumulative Trend
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          {activePoint && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-[11px] text-muted-foreground font-medium">
                {activePoint.fullLabel}:
              </span>
              <div className="flex items-center gap-2 tabular-nums">
                <span
                  className={`wt-display text-base font-extrabold ${
                    activePoint.value >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {activePoint.value >= 0 ? "+" : ""}{money(activePoint.value)}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  (Day: {activePoint.delta >= 0 ? "+" : ""}{money(activePoint.delta)})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Hover Inspection Readout Banner */}
        {activePoint && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/30 px-3.5 py-2 text-xs">
            <span className="font-bold text-foreground">
              {activePoint.fullLabel}
            </span>
            <div className="flex items-center gap-3 tabular-nums text-xs">
              <span className="font-semibold text-muted-foreground">Cumulative Net:</span>
              <span
                className={`font-black ${
                  activePoint.value >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {activePoint.value >= 0 ? "+" : ""}{money(activePoint.value)}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground font-semibold">
                Daily Inflow/Outflow Delta:{" "}
                <strong
                  className={
                    activePoint.delta >= 0
                      ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                      : "text-rose-600 dark:text-rose-400 font-extrabold"
                  }
                >
                  {activePoint.delta >= 0 ? "+" : ""}{money(activePoint.delta)}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Canvas with Left Vertical Y-Axis Amounts and Smooth Area Wave */}
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

          {/* Continuous SVG Line & Area Container with Crosshair Mouse Move Tracking */}
          <div
            className="relative flex-1 h-[168px] cursor-crosshair select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <svg
              viewBox="0 0 1000 180"
              className="absolute inset-0 size-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#10b981" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines matching Y-Axis Ticks */}
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

              {/* Filled Area Gradient */}
              {areaD && <path d={areaD} fill="url(#wealthGradient)" />}

              {/* Continuous Smooth Line Stroke */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  className="drop-shadow-xs"
                />
              )}

              {/* Vertical Guide Line on Hover */}
              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1="14"
                  x2={activePoint.x}
                  y2="166"
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                  className="opacity-75"
                />
              )}

              {/* Glowing Active Marker Point */}
              {activePoint && (
                <g>
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="8"
                    fill="#10b981"
                    fillOpacity="0.25"
                    className="animate-ping"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="5"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="shadow-sm"
                  />
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Sharp, Crisp HTML X-Axis Milestone Labels below the chart */}
        <div className="flex gap-2 sm:gap-3 mt-2">
          <div className="w-[52px] sm:w-[64px] shrink-0" />
          <div className="relative h-5 flex-1 text-[11px] font-bold text-muted-foreground select-none">
            {milestones?.map((pt, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === milestones.length - 1;
              const isHovered =
                hoveredIndex !== null && coordinates[hoveredIndex]?.day === pt.day;
              const leftPct = (pt.x / 1000) * 100;
              const transformClass = isFirst
                ? "translate-x-0"
                : isLast
                ? "-translate-x-full"
                : "-translate-x-1/2";

              return (
                <span
                  key={pt.label}
                  style={{ left: `${leftPct}%` }}
                  className={`absolute top-0 transform ${transformClass} whitespace-nowrap transition-colors ${
                    isHovered ? "text-primary font-black" : ""
                  }`}
                >
                  {pt.day === 1 ? "Day 1" : pt.shortLabel || pt.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

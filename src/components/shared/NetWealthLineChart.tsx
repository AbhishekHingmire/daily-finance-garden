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
    // If single month, split into 4-5 weekly intervals or daily checkpoints
    const isMonthly = dateRange.preset === "month" || dateRange.preset === "1m";
    const targetYear = dateRange.year ?? 2026;
    const targetMonth = dateRange.month ?? 10;

    if (isMonthly) {
      const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      const monthName = MONTH_NAMES[targetMonth - 1] ?? "Mo";

      // 5 checkpoints across the month: Day 1, Day 7, Day 14, Day 21, Day end
      const checkDays = [1, 7, 14, 21, daysInMonth];
      let runningTotal = 0;

      return checkDays.map((day, idx) => {
        const prevDay = idx === 0 ? 0 : checkDays[idx - 1];
        const startIso = `${monthPrefix}-${String(prevDay + 1).padStart(2, "0")}`;
        const endIso = `${monthPrefix}-${String(day).padStart(2, "0")}`;

        const periodTxs = transactions.filter((t) => {
          const d = t.date.slice(0, 10);
          return d >= startIso && d <= endIso;
        });

        const inflow = periodTxs
          .filter((t) => t.type === "Income" || t.type === "Borrow / Loan Taken" || t.type === "Debt Recovery" || t.type === "Refund")
          .reduce((sum, t) => sum + t.amount, 0);

        const outflow = periodTxs
          .filter((t) => t.type === "Expense" || t.type === "EMI / Loan Payment" || t.type === "Lend / Loan Given")
          .reduce((sum, t) => sum + t.amount, 0);

        runningTotal += (inflow - outflow);

        return {
          label: `${monthName} ${day}`,
          fullLabel: `${FULL_MONTH_NAMES[targetMonth - 1]} ${day}, ${targetYear}`,
          value: runningTotal,
          delta: inflow - outflow,
        };
      });
    }

    // Year or multi-month: 12 months
    const year = dateRange.year ?? 2026;
    let runningTotal = 0;

    return MONTH_NAMES.map((mName, idx) => {
      const prefix = `${year}-${String(idx + 1).padStart(2, "0")}`;
      const mTxs = transactions.filter((t) => t.date.startsWith(prefix));

      const inflow = mTxs
        .filter((t) => t.type === "Income" || t.type === "Borrow / Loan Taken" || t.type === "Debt Recovery" || t.type === "Refund")
        .reduce((sum, t) => sum + t.amount, 0);

      const outflow = mTxs
        .filter((t) => t.type === "Expense" || t.type === "EMI / Loan Payment" || t.type === "Lend / Loan Given")
        .reduce((sum, t) => sum + t.amount, 0);

      runningTotal += (inflow - outflow);

      return {
        label: mName,
        fullLabel: `${FULL_MONTH_NAMES[idx]} ${year}`,
        value: runningTotal,
        delta: inflow - outflow,
      };
    });
  }, [transactions, dateRange]);

  // Coordinate geometry calculations
  const { pathD, areaD, coordinates, minVal, maxVal } = useMemo(() => {
    if (points.length === 0) {
      return { pathD: "", areaD: "", coordinates: [], minVal: 0, maxVal: 0 };
    }

    const values = points.map((p) => p.value);
    const minRaw = Math.min(0, ...values);
    const maxRaw = Math.max(1000, ...values);
    const range = maxRaw - minRaw || 1;

    const width = 500;
    const height = 160;
    const paddingX = 25;
    const paddingTop = 20;
    const paddingBottom = 30;
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingTop - paddingBottom;

    const coords = points.map((p, idx) => {
      const x = paddingX + (idx / (points.length - 1)) * innerWidth;
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

    return {
      pathD: d,
      areaD: area,
      coordinates: coords,
      minVal: minRaw,
      maxVal: maxRaw,
    };
  }, [points]);

  const activePoint = hoveredIndex !== null ? coordinates[hoveredIndex] : coordinates[coordinates.length - 1];

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 wt-shadow flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
          <div>
            <h3 className="wt-display text-base font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          {activePoint && (
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block font-medium">
                {activePoint.fullLabel}
              </span>
              <span
                className={`wt-display text-sm font-extrabold tabular-nums ${
                  activePoint.value >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {money(activePoint.value)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Line & Area Visualization */}
      <div className="relative mt-4 w-full">
        <svg
          viewBox="0 0 500 160"
          className="w-full h-44 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1="25"
            y1="20"
            x2="475"
            y2="20"
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-border/40"
          />
          <line
            x1="25"
            y1="75"
            x2="475"
            y2="75"
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-border/40"
          />
          <line
            x1="25"
            y1="130"
            x2="475"
            y2="130"
            stroke="currentColor"
            className="text-border/60"
          />

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#wealthGradient)" />}

          {/* Smooth line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="drop-shadow-xs"
            />
          )}

          {/* Data Points */}
          {coordinates.map((pt, idx) => {
            const isHovered = hoveredIndex === idx;
            const isLatest = idx === coordinates.length - 1;

            return (
              <g key={pt.label} className="cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : isLatest ? 4.5 : 3.5}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all duration-150"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                <text
                  x={pt.x}
                  y="152"
                  textAnchor="middle"
                  className={`text-[10px] font-bold ${
                    isHovered ? "fill-primary font-black" : "fill-muted-foreground"
                  }`}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

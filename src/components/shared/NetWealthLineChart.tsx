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

  // Coordinate geometry calculations
  const { pathD, areaD, coordinates, minVal, maxVal } = useMemo(() => {
    if (points.length === 0) {
      return { pathD: "", areaD: "", coordinates: [], minVal: 0, maxVal: 0 };
    }

    const values = points.map((p) => p.value);
    const minRaw = Math.min(0, ...values);
    const maxRaw = Math.max(1000, ...values);
    const range = maxRaw - minRaw || 1;

    const width = 600;
    const height = 180;
    const paddingX = 25;
    const paddingTop = 25;
    const paddingBottom = 35;
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

    return {
      pathD: d,
      areaD: area,
      coordinates: coords,
      minVal: minRaw,
      maxVal: maxRaw,
    };
  }, [points]);

  const activeIndex = hoveredIndex !== null ? hoveredIndex : coordinates.length - 1;
  const activePoint = coordinates[activeIndex];

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 wt-shadow">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div>
            <h3 className="wt-display text-base font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          {activePoint && (
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block font-medium">
                {activePoint.fullLabel}
              </span>
              <div className="flex items-center gap-2 justify-end mt-0.5">
                <span
                  className={`wt-display text-base font-extrabold tabular-nums ${
                    activePoint.value >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {money(activePoint.value)}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  (Day: {activePoint.delta >= 0 ? "+" : ""}{money(activePoint.delta)})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SVG Line & Area Visualization with responsive viewBox */}
      <div className="relative mt-4 w-full">
        <svg
          viewBox="0 0 600 180"
          className="w-full h-48 overflow-visible select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1="25"
            y1="25"
            x2="575"
            y2="25"
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-border/40"
          />
          <line
            x1="25"
            y1="85"
            x2="575"
            y2="85"
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-border/40"
          />
          <line
            x1="25"
            y1="145"
            x2="575"
            y2="145"
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
              strokeWidth="2.75"
              strokeLinecap="round"
              className="drop-shadow-xs"
            />
          )}

          {/* Vertical cursor guide for active point */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1="20"
              x2={activePoint.x}
              y2="145"
              stroke="#10b981"
              strokeDasharray="3 3"
              strokeWidth="1.5"
              className="opacity-70"
            />
          )}

          {/* Data Points */}
          {coordinates.map((pt, idx) => {
            const isHovered = hoveredIndex === idx;
            const isLatest = idx === coordinates.length - 1;
            const isMilestone =
              idx === 0 ||
              idx === coordinates.length - 1 ||
              (pt.day && pt.day % 5 === 0);

            return (
              <g
                key={pt.label}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6.5 : isLatest ? 4.5 : 3}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all duration-150"
                />
                {isMilestone && (
                  <text
                    x={pt.x}
                    y="166"
                    textAnchor="middle"
                    className={`text-[10px] font-bold ${
                      isHovered ? "fill-primary font-black" : "fill-muted-foreground"
                    }`}
                  >
                    {pt.shortLabel || pt.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

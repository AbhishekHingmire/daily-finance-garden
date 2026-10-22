import { useState, useMemo } from "react";

export interface PieCategoryItem {
  id: string;
  name: string;
  icon?: string;
  amount: number;
  pct: number;
}

const PALETTE = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#f43f5e", // rose-500
  "#06b6d4", // cyan-500
  "#d946ef", // fuchsia-500
  "#64748b", // slate-500
];

export function CategoryPieChart({
  categories,
  totalAmount,
  money,
  onCategoryClick,
}: {
  categories: PieCategoryItem[];
  totalAmount: number;
  money: (amount: number) => string;
  onCategoryClick?: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter out zero amount categories
  const activeItems = useMemo(
    () => categories.filter((c) => c.amount > 0).slice(0, 7),
    [categories]
  );

  // Compute SVG slice paths for a donut chart
  const slices = useMemo(() => {
    if (totalAmount <= 0 || activeItems.length === 0) return [];

    const size = 180;
    const center = size / 2;
    const outerRadius = 78;
    const innerRadius = 52;

    let cumulativeAngle = -Math.PI / 2; // start at top 12 o'clock

    return activeItems.map((item, idx) => {
      const sliceAngle = (item.amount / totalAmount) * (2 * Math.PI);
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + sliceAngle;
      cumulativeAngle = endAngle;

      // Arc coordinates
      const x1 = center + outerRadius * Math.cos(startAngle);
      const y1 = center + outerRadius * Math.sin(startAngle);
      const x2 = center + outerRadius * Math.cos(endAngle);
      const y2 = center + outerRadius * Math.sin(endAngle);

      const x3 = center + innerRadius * Math.cos(endAngle);
      const y3 = center + innerRadius * Math.sin(endAngle);
      const x4 = center + innerRadius * Math.cos(startAngle);
      const y4 = center + innerRadius * Math.sin(startAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;

      // Donut slice path
      const pathData = [
        `M ${x1} ${y1}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
        "Z",
      ].join(" ");

      const color = PALETTE[idx % PALETTE.length];

      return {
        ...item,
        pathData,
        color,
        index: idx,
      };
    });
  }, [activeItems, totalAmount]);

  const activeCategory = useMemo(() => {
    if (hoveredId) {
      return activeItems.find((c) => c.id === hoveredId) ?? null;
    }
    return activeItems[0] ?? null;
  }, [activeItems, hoveredId]);

  if (activeItems.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/15 p-6 text-center text-xs text-muted-foreground">
        No expense transactions recorded in this period.
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* SVG Donut */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          viewBox="0 0 180 180"
          className="size-48 drop-shadow-xs transition-transform"
        >
          {slices.map((slice) => {
            const isHovered = hoveredId === slice.id;
            return (
              <path
                key={slice.id}
                d={slice.pathData}
                fill={slice.color}
                className="cursor-pointer transition-all duration-200"
                style={{
                  opacity: hoveredId && !isHovered ? 0.45 : 1,
                  transformOrigin: "90px 90px",
                  transform: isHovered ? "scale(1.05)" : "scale(1)",
                }}
                onMouseEnter={() => setHoveredId(slice.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onCategoryClick?.(slice.id)}
              />
            );
          })}
        </svg>

        {/* Center Readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {hoveredId ? "Selected" : "Total Outflow"}
          </span>
          <span className="wt-display text-base font-extrabold text-foreground tabular-nums leading-tight mt-0.5">
            {money(activeCategory && hoveredId ? activeCategory.amount : totalAmount)}
          </span>
          {activeCategory && hoveredId && (
            <span className="text-[10px] font-bold text-primary mt-0.5">
              {activeCategory.pct}%
            </span>
          )}
        </div>
      </div>

      {/* Category Legend */}
      <div className="flex-1 w-full space-y-2">
        {activeItems.map((item, idx) => {
          const isHovered = hoveredId === item.id;
          const color = PALETTE[idx % PALETTE.length];

          return (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onCategoryClick?.(item.id)}
              className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                isHovered
                  ? "bg-muted/70 ring-1 ring-primary/40 shadow-xs"
                  : "hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="size-3 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-bold text-foreground truncate">
                  {item.icon ? `${item.icon} ` : ""}
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0 text-right">
                <span className="text-xs font-extrabold text-foreground tabular-nums">
                  {money(item.amount)}
                </span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground min-w-[34px] text-center">
                  {item.pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

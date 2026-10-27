import { useState, useMemo } from "react";
import { ArrowRight, Tags } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#f97316", // orange-500
  "#84cc16", // lime-500
  "#6366f1", // indigo-500
  "#d946ef", // fuchsia-500
  "#eab308", // yellow-500
  "#0ea5e9", // sky-500
  "#a855f7", // purple-500
  "#64748b", // slate-500
];

export function CategoryPieChart({
  categories,
  totalAmount,
  totalCategoriesCount,
  money,
  onCategoryClick,
  onViewAllCategories,
}: {
  categories: PieCategoryItem[];
  totalAmount: number;
  totalCategoriesCount?: number;
  money: (amount: number) => string;
  onCategoryClick?: (id: string) => void;
  onViewAllCategories?: () => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter out zero amount categories and prepare items that account for 100% of the chart
  const activeItems = useMemo(() => {
    const nonZero = categories.filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
    if (nonZero.length === 0) return [];

    // Show top 10 categories individually, bundle any excess into 'Other'
    const maxItems = 10;
    const top = nonZero.slice(0, maxItems);
    const remainder = nonZero.slice(maxItems);
    const remainderSum = remainder.reduce((s, c) => s + c.amount, 0);

    const result = [...top];
    if (remainderSum > 0) {
      result.push({
        id: "cat-other-bundled",
        name: `Other Categories (${remainder.length})`,
        icon: "📦",
        amount: remainderSum,
        pct: totalAmount > 0 ? Math.round((remainderSum / totalAmount) * 100) : 0,
      });
    }

    // If totalAmount is larger than the sum of all categories (e.g. EMIs or unclassified outflows)
    const currentSum = result.reduce((s, c) => s + c.amount, 0);
    if (totalAmount > currentSum && totalAmount - currentSum > 10) {
      const diff = totalAmount - currentSum;
      result.push({
        id: "cat-other-outflows",
        name: "Other Outflows / EMIs",
        icon: "💳",
        amount: diff,
        pct: Math.round((diff / totalAmount) * 100),
      });
    }

    return result;
  }, [categories, totalAmount]);

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
    <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
      {/* Modern Recharts Donut Pie */}
      <div className="relative shrink-0 flex items-center justify-center size-44 sm:size-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={activeItems}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              isAnimationActive={false}
              onMouseEnter={(_, index) => setHoveredId(activeItems[index]?.id ?? null)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={(_, index) => {
                const item = activeItems[index];
                if (item) onCategoryClick?.(item.id);
              }}
            >
              {activeItems.map((entry, index) => (
                <Cell
                  key={`cell-${entry.id}`}
                  fill={PALETTE[index % PALETTE.length]}
                  className="cursor-pointer transition-opacity"
                  style={{
                    opacity: hoveredId && hoveredId !== entry.id ? 0.45 : 1,
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[100px]">
            {hoveredId && activeCategory ? activeCategory.name : "Total Outflow"}
          </span>
          <span className="wt-display text-sm sm:text-base font-extrabold text-foreground tabular-nums leading-tight mt-0.5">
            {money(activeCategory && hoveredId ? activeCategory.amount : totalAmount)}
          </span>
          {activeCategory && hoveredId && (
            <span className="text-[10px] font-bold text-primary mt-0.5">
              {activeCategory.pct}%
            </span>
          )}
        </div>
      </div>

      {/* Category Legend with Fixed View Area & Smooth Scrolling for 10 Categories */}
      <div className="flex-1 w-full min-w-0 flex flex-col justify-start">
        <div className="flex items-center justify-between pb-1.5 mb-1 px-1 text-[11px] font-semibold text-muted-foreground border-b border-border/40">
          <span>Top Categories ({Math.min(activeItems.length, 10)})</span>
          {onViewAllCategories && (
            <button
              type="button"
              onClick={onViewAllCategories}
              className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View all {totalCategoriesCount ? `(${totalCategoriesCount})` : ""}</span>
              <ArrowRight size={11} />
            </button>
          )}
        </div>
        <div className="space-y-1 max-h-[260px] sm:max-h-[290px] overflow-y-auto wt-scrollbar pr-1">
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
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    className="size-3 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-bold text-foreground truncate" title={item.name}>
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

        {/* Prominent View All Footer Action */}
        {onViewAllCategories && (
          <button
            type="button"
            onClick={onViewAllCategories}
            className="w-full mt-2.5 flex items-center justify-between px-3 py-2 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 text-primary transition-all text-xs font-semibold cursor-pointer group"
          >
            <span className="flex items-center gap-1.5">
              <Tags size={13} className="shrink-0 text-primary" />
              <span>View all categories {totalCategoriesCount ? `(${totalCategoriesCount})` : ""}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold group-hover:translate-x-0.5 transition-transform">
              Categories page <ArrowRight size={12} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

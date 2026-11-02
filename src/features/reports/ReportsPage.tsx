import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Info,
  Lightbulb,
  MapPin,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/shared/PageHeading";
import { PeriodPill } from "@/components/shared/PeriodPill";
import { formatChartTick } from "@/lib/formatters";
import { useSharedPeriod } from "@/lib/period-state";
import { migrateLegacyState } from "@/lib/migration";
import {
  getBudgetMetrics,
  getPeriodMetrics,
} from "@/lib/metrics-service";
import type { Transaction, WealthState } from "@/lib/wealthtrack";
import { type DateRangeValue } from "@/components/shared/DateRangeFilter";

interface ReportsPageProps {
  data: WealthState;
  rows: Transaction[];
  dateRange: DateRangeValue;
  setDateRange: (range: DateRangeValue) => void;
  money: (amount: number) => string;
  onExport: () => void;
  onCategory?: (id: string) => void;
  onViewAllCategories?: () => void;
}

const CATEGORY_COLORS = [
  "#2563eb", // Vibrant Blue
  "#9333ea", // Vibrant Purple
  "#10b981", // Emerald
  "#f97316", // Vibrant Orange
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f59e0b", // Amber
  "#64748b", // Slate
];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const pointsData = !data || data.length < 2 ? [10, 14, 12, 19, 15, 24, 21, 28] : data;
  const min = Math.min(...pointsData);
  const max = Math.max(...pointsData);
  const range = max - min || 1;
  const width = 88;
  const height = 36;
  const points = pointsData.map((val, idx) => {
    const x = (idx / (pointsData.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;
  const areaD = `M ${points[0]} L ${points.join(" L ")} L ${width},${height} L 0,${height} Z`;
  const gradId = `grad-${color.replace("#", "")}`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ReportsPage({
  data,
  rows,
  dateRange,
  setDateRange,
  money,
  onExport,
  onViewAllCategories,
}: ReportsPageProps) {
  const [sharedPeriod, setSharedPeriod] = useSharedPeriod();
  const [expenseTimeframe, setExpenseTimeframe] = useState<"Day" | "Week" | "Month">("Day");

  const handlePeriodChange = (newPeriod: { year: number; month: number }) => {
    setSharedPeriod(newPeriod);
    setDateRange?.({
      preset: "1m",
      year: newPeriod.year,
      month: newPeriod.month,
    });
  };

  // Derive data from canonical metrics service
  const unified = useMemo(() => migrateLegacyState(data), [data]);
  const periodMetrics = useMemo(
    () => getPeriodMetrics(unified.entries, sharedPeriod),
    [unified.entries, sharedPeriod]
  );
  const budgetMetrics = useMemo(
    () => getBudgetMetrics(unified.categories, unified.entries, sharedPeriod),
    [unified.categories, unified.entries, sharedPeriod]
  );

  const totalExpenses = periodMetrics.moneyOut;
  const remainingBudget = Math.max(0, budgetMetrics.totalCap - budgetMetrics.budgetedSpend);
  const isBudgetExhausted = remainingBudget <= 0;

  // Previous month spending comparison
  const prevMonthSpend = useMemo(() => {
    const prevMonth = sharedPeriod.month === 1 ? 12 : sharedPeriod.month - 1;
    const prevYear = sharedPeriod.month === 1 ? sharedPeriod.year - 1 : sharedPeriod.year;
    const prevPrefix = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
    return unified.entries
      .filter((e) => e.status === "posted" && e.kind === "expense" && e.date.startsWith(prevPrefix))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [unified.entries, sharedPeriod]);

  const spendDiffPct = useMemo(() => {
    if (prevMonthSpend === 0) return 0;
    return Math.round(((totalExpenses - prevMonthSpend) / prevMonthSpend) * 100);
  }, [totalExpenses, prevMonthSpend]);

  // Needs vs Wants metrics
  const needsSpend = periodMetrics.needs;
  const wantsSpend = periodMetrics.wants;
  const needsPct = periodMetrics.split503020.needsPct;
  const wantsPct = periodMetrics.split503020.wantsPct;
  const bufferPct = Math.max(0, 100 - (needsPct + wantsPct));

  const periodLabel = `${new Date(sharedPeriod.year, sharedPeriod.month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  })}`;
  const periodFullLabel = `${new Date(sharedPeriod.year, sharedPeriod.month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })}`;

  // Daily expense data for charts
  const { dailyExpenseData, cumulativeExpenseData } = useMemo(() => {
    const daysInMonth = new Date(sharedPeriod.year, sharedPeriod.month, 0).getDate();
    const prefix = `${sharedPeriod.year}-${String(sharedPeriod.month).padStart(2, "0")}`;

    const flowItems: Array<{
      day: number;
      label: string;
      expense: number;
    }> = [];

    const cumulItems: Array<{
      day: number;
      label: string;
      cumulativeExpense: number;
    }> = [];

    let runningSpend = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${prefix}-${String(d).padStart(2, "0")}`;
      const dayEntries = unified.entries.filter(
        (e) => e.status === "posted" && e.kind === "expense" && e.date.startsWith(dayStr)
      );

      const dayExpense = dayEntries.reduce((sum, e) => sum + e.amount, 0);
      runningSpend += dayExpense;

      flowItems.push({
        day: d,
        label: d === 1 || d === 8 || d === 15 || d === 22 || d === daysInMonth ? `${periodLabel.slice(0, 3)} ${d}` : `${d}`,
        expense: dayExpense,
      });

      cumulItems.push({
        day: d,
        label: d === 1 ? "Day 1" : d === daysInMonth ? `Day ${d}` : `${d}`,
        cumulativeExpense: runningSpend,
      });
    }

    return { dailyExpenseData: flowItems, cumulativeExpenseData: cumulItems };
  }, [unified.entries, sharedPeriod, periodLabel]);

  // Actual Category-Wise Allocation (Food, Grocery, Utilities, etc.)
  const categoryAllocation = useMemo(() => {
    const activeRows = budgetMetrics.categoryRows
      .filter((r) => r.spent > 0)
      .sort((a, b) => b.spent - a.spent);

    if (activeRows.length === 0) {
      return [
        { name: "General Expenses", value: 100, amount: totalExpenses, color: "#2563eb", icon: "💸" },
      ];
    }

    const total = activeRows.reduce((sum, r) => sum + r.spent, 0);
    const topCategories = activeRows.slice(0, 4);
    const remaining = activeRows.slice(4);
    const remainingSum = remaining.reduce((sum, r) => sum + r.spent, 0);

    const items = topCategories.map((r, idx) => ({
      name: r.category.name,
      amount: r.spent,
      value: total > 0 ? Math.round((r.spent / total) * 100) : 0,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      icon: r.category.icon || "📁",
    }));

    if (remainingSum > 0) {
      items.push({
        name: `Other (${remaining.length})`,
        amount: remainingSum,
        value: total > 0 ? Math.round((remainingSum / total) * 100) : 0,
        color: "#94a3b8",
        icon: "📦",
      });
    }

    return items;
  }, [budgetMetrics, totalExpenses]);

  // Dynamic Permutation Quick Insights for Reports
  const reportInsights = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      description: string;
      icon: typeof TrendingUp;
      iconClass: string;
      bgClass: string;
    }> = [];

    // 1. Budget Pace
    if (totalExpenses === 0) {
      list.push({
        id: "rep-zero",
        title: `Zero spending logged for ${periodLabel}.`,
        description: `Full monthly budget of ${money(budgetMetrics.totalCap)} is available.`,
        icon: CheckCircle2,
        iconClass: "text-emerald-600 dark:text-emerald-400",
        bgClass: "bg-emerald-500/10",
      });
    } else if (budgetMetrics.budgetUsedPct > 100) {
      list.push({
        id: "rep-over",
        title: `Spending exceeded budget by ${budgetMetrics.budgetUsedPct - 100}%.`,
        description: `${money(budgetMetrics.budgetedSpend - budgetMetrics.totalCap)} over ceiling limit. Consider pruning discretionary items.`,
        icon: AlertTriangle,
        iconClass: "text-rose-600 dark:text-rose-400",
        bgClass: "bg-rose-500/10",
      });
    } else if (budgetMetrics.budgetUsedPct > 80) {
      list.push({
        id: "rep-warning",
        title: `Budget utilization at ${budgetMetrics.budgetUsedPct}%.`,
        description: `${money(remainingBudget)} buffer remaining for the rest of this month.`,
        icon: AlertTriangle,
        iconClass: "text-amber-600 dark:text-amber-400",
        bgClass: "bg-amber-500/10",
      });
    } else {
      list.push({
        id: "rep-healthy",
        title: "Overall spending is well disciplined.",
        description: `${budgetMetrics.budgetUsedPct}% of budget utilized with ${money(remainingBudget)} available buffer.`,
        icon: TrendingUp,
        iconClass: "text-emerald-600 dark:text-emerald-400",
        bgClass: "bg-emerald-500/10",
      });
    }

    // 2. Category Concentration
    const overCategory = budgetMetrics.categoryRows.find((r) => r.isOverBudget);
    const topCat = budgetMetrics.categoryRows.find((r) => r.spent > 0);
    if (overCategory) {
      list.push({
        id: "rep-cat-over",
        title: `${overCategory.category.name} is over budget.`,
        description: `Spent ${money(overCategory.spent)} exceeding cap of ${money(overCategory.cap)}.`,
        icon: AlertTriangle,
        iconClass: "text-rose-600 dark:text-rose-400",
        bgClass: "bg-rose-500/10",
      });
    } else if (topCat && totalExpenses > 0) {
      const pct = Math.round((topCat.spent / totalExpenses) * 100);
      list.push({
        id: "rep-cat-top",
        title: `${topCat.category.name} is the top expense (${pct}%).`,
        description: `${money(topCat.spent)} total spending recorded in this period.`,
        icon: MapPin,
        iconClass: "text-blue-600 dark:text-blue-400",
        bgClass: "bg-blue-500/10",
      });
    } else {
      list.push({
        id: "rep-cat-info",
        title: "Category allocation active.",
        description: "Review category distributions to optimize recurring outgoings.",
        icon: Lightbulb,
        iconClass: "text-blue-600 dark:text-blue-400",
        bgClass: "bg-blue-500/10",
      });
    }

    // 3. Needs vs Wants Efficiency
    if (wantsPct > 35) {
      list.push({
        id: "rep-wants-high",
        title: `Discretionary spends at ${wantsPct}% of expenses.`,
        description: "Target recommended is < 30%. Diverting a portion to savings boosts security.",
        icon: AlertTriangle,
        iconClass: "text-amber-600 dark:text-amber-400",
        bgClass: "bg-amber-500/10",
      });
    } else {
      list.push({
        id: "rep-needs-good",
        title: `Needs ratio balanced at ${needsPct}%.`,
        description: "Essential outgoings are well managed within the recommended 50% guideline.",
        icon: CheckCircle2,
        iconClass: "text-emerald-600 dark:text-emerald-400",
        bgClass: "bg-emerald-500/10",
      });
    }

    return list;
  }, [totalExpenses, periodLabel, money, budgetMetrics, remainingBudget, wantsPct, needsPct]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header (No icons before title, clean and consistent) */}
      <PageHeading
        title="Insights"
        description="Get a complete view of your outgoings, category spending, and budget performance."
        periodSlot={<PeriodPill period={sharedPeriod} onChange={handlePeriodChange} />}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={onExport}
            className="h-8 gap-1.5 px-3 text-xs font-bold border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer shadow-2xs"
          >
            <Download size={14} className="text-primary" />
            <span>Export PDF</span>
          </Button>
        }
      />

      {/* 2. Top 3 Stat Cards: Total Expenses, Monthly Budget, Budget Remaining */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
        {/* Card 1: Total Expenses */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="size-11 rounded-2xl bg-blue-500/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
              <Wallet size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">Total Expenses</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                  {money(totalExpenses)}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                  {spendDiffPct <= 0 ? `↓ ${Math.abs(spendDiffPct)}%` : `↑ ${spendDiffPct}%`}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                vs {money(prevMonthSpend)} last month
              </p>
            </div>
          </div>
          <Sparkline data={[totalExpenses * 0.7, totalExpenses * 0.85, totalExpenses * 0.9, totalExpenses]} color="#3b82f6" />
        </div>

        {/* Card 2: Monthly Budget */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <CalendarDays size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">Monthly Budget</p>
              <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums mt-0.5">
                {money(budgetMetrics.totalCap)}
              </p>
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {budgetMetrics.budgetUsedPct <= 100 ? "On track ✓" : "Over budget"}
              </p>
            </div>
          </div>
          <Sparkline data={[20, 25, 22, 30, 28, 35, 32, 40]} color="#10b981" />
        </div>

        {/* Card 3: Budget Remaining */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="size-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
              <PiggyBank size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">Budget Remaining</p>
              <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums mt-0.5">
                {money(remainingBudget)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isBudgetExhausted ? "Budget exhausted" : "Available to spend"}
              </p>
            </div>
          </div>
          <Sparkline data={[40, 35, 30, 22, 18, 12, 8, 0]} color="#8b5cf6" />
        </div>
      </div>

      {/* 3. Auto-rearranging Two-Column Layout (eliminates marginal gaps between stacked cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
        {/* COLUMN 1: Expense Spending Trend & Where your money went */}
        <div className="flex flex-col gap-5 lg:gap-6">
          {/* Chart 1: Expense Spending Trend */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">Expense Spending Trend</h3>
                <p className="text-xs text-muted-foreground">
                  Day-by-day outgoings for {periodFullLabel}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Segmented Pill */}
                <div className="inline-flex items-center rounded-xl border border-border/70 bg-muted/40 p-0.5 text-xs font-semibold">
                  {(["Day", "Week", "Month"] as const).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setExpenseTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        expenseTimeframe === tf
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <span className="size-2 rounded-full bg-rose-500" /> Outflow
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyExpenseData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expenseTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val: any) => formatChartTick(val)}
                    tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                  />
                  <Tooltip
                    formatter={(val: any) => [money(Number(val) || 0), "Outflow"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--card)",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Outflow"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#expenseTrendGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card: Where your money went (Donut Circle - Unclipped, ample margin, perfect full circle) */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Where your money went</h3>
                <p className="text-xs text-muted-foreground">
                  Category-wise breakdown for {periodLabel}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewAllCategories}
                className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
              >
                All Categories →
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-1">
              {/* Unclipped Donut Container with ample padding to guarantee 100% full visible circle */}
              <div className="relative w-48 h-48 sm:w-52 sm:h-52 shrink-0 flex items-center justify-center p-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Pie
                      data={categoryAllocation}
                      dataKey="amount"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                      isAnimationActive={false}
                    >
                      {categoryAllocation.map((entry, index) => (
                        <Cell key={`cat-cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-base sm:text-lg font-black text-foreground tabular-nums">
                    {money(totalExpenses)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total</span>
                </div>
              </div>

              {/* Category Breakdown legend */}
              <div className="space-y-2.5 text-xs flex-1 w-full min-w-0">
                {categoryAllocation.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm shrink-0">{item.icon}</span>
                      <span className="font-semibold text-foreground truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="font-bold text-foreground">{money(item.amount)}</span>
                      <span className="text-[11px] text-muted-foreground font-semibold w-8 text-right">
                        {item.value}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Cumulative Expense Trend & Needs/Wants Breakdown */}
        <div className="flex flex-col gap-5 lg:gap-6">
          {/* Chart 2: Cumulative Expense Trend */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">Cumulative Expense Trend</h3>
                <p className="text-xs text-muted-foreground">
                  Running total of expenses across {periodLabel}
                </p>
              </div>

              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                Cumulative Total ⌄
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeExpenseData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cumulSpendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val: any) => formatChartTick(val)}
                    tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                  />
                  <Tooltip
                    formatter={(val: any) => [money(Number(val) || 0), "Cumulative Spent"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--card)",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeExpense"
                    name="Cumulative Spent"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#cumulSpendGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card: Needs & Wants Breakdown */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground">Needs & Wants Breakdown</h3>
              <p className="text-xs text-muted-foreground">
                Smart priority categorization of your outgoings
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center pt-1">
              {/* Needs */}
              <div className="space-y-1.5 rounded-xl bg-muted/20 p-3 border border-border/50">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[11px] font-bold text-muted-foreground">Needs</span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                    Essential
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                  {needsPct}%
                </p>
                <p className="text-xs font-bold text-foreground tabular-nums">{money(needsSpend)}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Target &lt; 50%</p>
              </div>

              {/* Wants */}
              <div className="space-y-1.5 rounded-xl bg-muted/20 p-3 border border-border/50">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[11px] font-bold text-muted-foreground">Wants</span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                    Discretionary
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                  {wantsPct}%
                </p>
                <p className="text-xs font-bold text-foreground tabular-nums">{money(wantsSpend)}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Target &lt; 30%</p>
              </div>

              {/* Headroom / Buffer */}
              <div className="space-y-1.5 rounded-xl bg-muted/20 p-3 border border-border/50">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[11px] font-bold text-muted-foreground">Capacity</span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
                    Headroom
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                  {bufferPct}%
                </p>
                <p className="text-xs font-bold text-foreground tabular-nums">{money(remainingBudget)}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Available</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Fourth Row: Quick Insights across full width */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Quick Insights</h3>
            <p className="text-xs text-muted-foreground">
              Key takeaways from your expense tracking
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {reportInsights.map((insight) => {
            const Icon = insight.icon;
            return (
              <div
                key={insight.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs"
              >
                <div className={`size-9 rounded-xl ${insight.bgClass} ${insight.iconClass} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground leading-snug">{insight.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {insight.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

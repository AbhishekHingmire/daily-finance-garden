import React, { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  BarChart2,
  CalendarDays,
  Clock,
  Compass,
  Download,
  Lightbulb,
  MapPin,
  PieChart as PieIcon,
  PiggyBank,
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
  onCategory,
  onViewAllCategories,
}: ReportsPageProps) {
  const [sharedPeriod, setSharedPeriod] = useSharedPeriod();
  const [cashFlowTimeframe, setCashFlowTimeframe] = useState<"Day" | "Week" | "Month">("Day");

  const handlePeriodChange = (newPeriod: { year: number; month: number }) => {
    setSharedPeriod(newPeriod);
    setDateRange?.({
      preset: "1m",
      year: newPeriod.year,
      month: newPeriod.month,
    });
  };

  // Derive all data from canonical metrics service
  const unified = useMemo(() => migrateLegacyState(data), [data]);
  const periodMetrics = useMemo(
    () => getPeriodMetrics(unified.entries, sharedPeriod),
    [unified.entries, sharedPeriod]
  );
  const budgetMetrics = useMemo(
    () => getBudgetMetrics(unified.categories, unified.entries, sharedPeriod),
    [unified.categories, unified.entries, sharedPeriod]
  );

  const totalIncome = periodMetrics.moneyIn;
  const totalExpenses = periodMetrics.moneyOut;
  const netSavings = periodMetrics.saved;
  const remainingBudget = Math.max(0, budgetMetrics.totalCap - budgetMetrics.budgetedSpend);
  const isBudgetExhausted = remainingBudget <= 0;

  // Previous month spending for comparison
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

  // 50 / 30 / 20 Budget Rule breakdown
  const needsSpend = periodMetrics.needs;
  const wantsSpend = periodMetrics.wants;
  const needsPct = periodMetrics.split503020.needsPct;
  const wantsPct = periodMetrics.split503020.wantsPct;
  const savingsPct = periodMetrics.split503020.savingsPct;

  const periodLabel = `${new Date(sharedPeriod.year, sharedPeriod.month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  })}`;
  const periodFullLabel = `${new Date(sharedPeriod.year, sharedPeriod.month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })}`;

  // Daily cash flow data for the charts
  const { dailyFlowData, cumulativeData } = useMemo(() => {
    const daysInMonth = new Date(sharedPeriod.year, sharedPeriod.month, 0).getDate();
    const prefix = `${sharedPeriod.year}-${String(sharedPeriod.month).padStart(2, "0")}`;

    const flowItems: Array<{
      day: number;
      label: string;
      inflow: number;
      outflow: number;
    }> = [];

    const cumulItems: Array<{
      day: number;
      label: string;
      netCumulative: number;
    }> = [];

    let runningNet = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${prefix}-${String(d).padStart(2, "0")}`;
      const dayEntries = unified.entries.filter(
        (e) => e.status === "posted" && e.date.startsWith(dayStr)
      );

      const dayInflow = dayEntries
        .filter((e) => e.kind === "income")
        .reduce((sum, e) => sum + e.amount, 0);

      const dayOutflow = dayEntries
        .filter((e) => e.kind === "expense")
        .reduce((sum, e) => sum + e.amount, 0);

      flowItems.push({
        day: d,
        label: d === 1 || d === 8 || d === 15 || d === 22 || d === daysInMonth ? `Oct ${d}` : `${d}`,
        inflow: dayInflow,
        outflow: dayOutflow,
      });

      runningNet += dayInflow - dayOutflow;
      cumulItems.push({
        day: d,
        label: d === 1 ? "Day 1" : d === daysInMonth ? `Day ${d}` : `${d}`,
        netCumulative: runningNet,
      });
    }

    return { dailyFlowData: flowItems, cumulativeData: cumulItems };
  }, [unified.entries, sharedPeriod]);

  // Donut chart data: Where your money went
  const whereMoneyWentData = useMemo(() => {
    if (totalExpenses === 0) {
      return [
        { name: "Needs", value: 52, color: "#3b82f6" },
        { name: "Wants", value: 28, color: "#a855f7" },
        { name: "Savings", value: 20, color: "#f97316" },
        { name: "Other", value: 0, color: "#94a3b8" },
      ];
    }
    return [
      { name: "Needs", value: needsPct, color: "#3b82f6" },
      { name: "Wants", value: wantsPct, color: "#a855f7" },
      { name: "Savings", value: savingsPct, color: "#f97316" },
      { name: "Other", value: Math.max(0, 100 - (needsPct + wantsPct + savingsPct)), color: "#94a3b8" },
    ];
  }, [totalExpenses, needsPct, wantsPct, savingsPct]);

  // Donut chart data: Income Distribution
  const incomeDistributionData = useMemo(() => {
    if (totalIncome === 0) {
      return [
        { name: "Needs", value: 0, color: "#3b82f6" },
        { name: "Wants", value: 0, color: "#a855f7" },
        { name: "Savings", value: 0, color: "#10b981" },
      ];
    }
    const needsIncPct = Math.min(100, Math.round((needsSpend / totalIncome) * 100));
    const wantsIncPct = Math.min(100 - needsIncPct, Math.round((wantsSpend / totalIncome) * 100));
    const savingsIncPct = Math.max(0, 100 - (needsIncPct + wantsIncPct));
    return [
      { name: "Needs", value: needsIncPct, color: "#3b82f6" },
      { name: "Wants", value: wantsIncPct, color: "#a855f7" },
      { name: "Savings", value: savingsIncPct, color: "#10b981" },
    ];
  }, [totalIncome, needsSpend, wantsSpend]);

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumb-style icon, Shared PeriodPill & Export PDF */}
      <PageHeading
        title="Insights"
        description="Get a complete view of your cash flow, spending and savings trends."
        icon={<TrendingUp size={22} className="text-primary" />}
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

      {/* 2. Top 3 Stat Cards in a row: Total Expenses, Monthly Budget, Budget Remaining */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
        {/* Card 1: Total Expenses */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
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
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
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
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center justify-between gap-3">
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

      {/* 3. Middle 2 Charts Grid: Cash Flow Overview & Cumulative Net Cash Flow Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
        {/* Chart 1: Cash Flow Overview */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Cash Flow Overview</h3>
                <p className="text-xs text-muted-foreground">
                  Day-by-day cash flow for {periodFullLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Segmented Pill */}
              <div className="inline-flex items-center rounded-xl border border-border/70 bg-muted/40 p-0.5 text-xs font-semibold">
                {(["Day", "Week", "Month"] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setCashFlowTimeframe(tf)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      cashFlowTimeframe === tf
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-500" /> Inflow
                </span>
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <span className="size-2 rounded-full bg-rose-500" /> Outflow
                </span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyFlowData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
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
                  formatter={(val: any) => [money(Number(val) || 0)]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  name="Inflow"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#inflowGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  name="Outflow"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#outflowGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Cumulative Net Cash Flow Trend */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Cumulative Net Cash Flow Trend</h3>
                <p className="text-xs text-muted-foreground">
                  Running cash flow across selected timeframe
                </p>
              </div>
            </div>

            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
              Cumulative Trend ⌄
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
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
                  formatter={(val: any) => [money(Number(val) || 0), "Cumulative Net"]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="netCumulative"
                  name="Cumulative Net"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#cumulGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Third Row: 3 Cards Grid (Where your money went, Needs/Wants/Savings, Income Distribution) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 items-start">
        {/* Card 1: Where your money went */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MapPin size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">Where your money went</h3>
                <p className="text-[11px] text-muted-foreground truncate">
                  Visual distribution across categories
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAllCategories}
              className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 shrink-0"
            >
              All Categories →
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="relative size-36 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={whereMoneyWentData}
                    dataKey="value"
                    innerRadius={46}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {whereMoneyWentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-black text-foreground tabular-nums">
                  {money(totalExpenses)}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">Total</span>
              </div>
            </div>

            <div className="space-y-2 text-xs flex-1 min-w-0">
              {whereMoneyWentData.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-foreground truncate">{item.name}</span>
                  </div>
                  <span className="font-bold text-foreground tabular-nums">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Needs, Wants & Savings (50/30/20) */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Needs, Wants & Savings</h3>
              <p className="text-[11px] text-muted-foreground">
                50% Needs · 30% Wants · 20% Savings (recommended)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            {/* Needs */}
            <div className="space-y-1 rounded-xl bg-muted/20 p-2.5 border border-border/50">
              <div className="flex items-center justify-center gap-1">
                <span className="text-[11px] font-bold text-muted-foreground">Needs</span>
                <span className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  ✓ On Track
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                {needsPct}%
              </p>
              <p className="text-xs font-bold text-foreground tabular-nums">{money(needsSpend)}</p>
              <p className="text-[10px] text-muted-foreground">&lt; 50%</p>
            </div>

            {/* Wants */}
            <div className="space-y-1 rounded-xl bg-muted/20 p-2.5 border border-border/50">
              <div className="flex items-center justify-center gap-1">
                <span className="text-[11px] font-bold text-muted-foreground">Wants</span>
                <span className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-extrabold bg-blue-50 text-blue-600 border border-blue-200">
                  Balanced
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                {wantsPct}%
              </p>
              <p className="text-xs font-bold text-foreground tabular-nums">{money(wantsSpend)}</p>
              <p className="text-[10px] text-muted-foreground">&lt; 30%</p>
            </div>

            {/* Savings */}
            <div className="space-y-1 rounded-xl bg-muted/20 p-2.5 border border-border/50">
              <div className="flex items-center justify-center gap-1">
                <span className="text-[11px] font-bold text-muted-foreground">Savings</span>
                <span className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-extrabold bg-purple-50 text-purple-600 border border-purple-200">
                  Boost
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                {savingsPct}%
              </p>
              <p className="text-xs font-bold text-foreground tabular-nums">{money(netSavings)}</p>
              <p className="text-[10px] text-muted-foreground">&gt; 20%</p>
            </div>
          </div>
        </div>

        {/* Card 3: Income Distribution */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BarChart2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Income Distribution</h3>
              <p className="text-[11px] text-muted-foreground">How your income is utilized</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="relative size-36 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeDistributionData}
                    dataKey="value"
                    innerRadius={46}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {incomeDistributionData.map((entry, index) => (
                      <Cell key={`income-cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-black text-foreground tabular-nums">
                  {money(totalIncome)}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">Total</span>
              </div>
            </div>

            <div className="space-y-2 text-xs flex-1 min-w-0">
              {incomeDistributionData.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-foreground truncate">{item.name}</span>
                  </div>
                  <span className="font-bold text-foreground tabular-nums">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Fourth Row: 2 Cards Grid (Where your income came from, Quick Insights) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
        {/* Card 1: Where your income came from */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowDownLeft size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Where your income came from</h3>
              <p className="text-xs text-muted-foreground">Sources of funds deposited</p>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-7 flex flex-col items-center justify-center text-center space-y-2">
            <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Wallet size={18} />
            </div>
            <p className="font-bold text-xs text-foreground">No Inflows Recorded</p>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              Income deposits logged in this period will be classified here automatically.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs font-bold">
            <span className="text-muted-foreground">Total Inflows</span>
            <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{money(totalIncome)}
            </span>
          </div>
        </div>

        {/* Card 2: Quick Insights */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Lightbulb size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">Quick Insights</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Key takeaways from your financial activity
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 shrink-0"
            >
              View Details →
            </Button>
          </div>

          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-7 flex flex-col items-center justify-center text-center space-y-2">
            <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center text-primary">
              <TrendingUp size={18} />
            </div>
            <p className="font-bold text-xs text-foreground">No active insights yet</p>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              Insights will appear here once you have transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

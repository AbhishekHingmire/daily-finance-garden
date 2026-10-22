import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Compass,
  Download,
  Flame,
  Landmark,
  PieChart,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, type DateRangeValue } from "@/components/shared/DateRangeFilter";
import { EmptyInline } from "@/components/shared/EmptyInline";
import { PageHeading } from "@/components/shared/PageHeading";
import { matchCategoryIcon } from "@/lib/icon-matcher";
import {
  getInvestmentSummary,
  type Transaction,
  type WealthState,
} from "@/lib/wealthtrack";

export function ReportsPage({
  data,
  rows,
  dateRange,
  setDateRange,
  money,
  onExport,
  onCategory,
}: {
  data: WealthState;
  rows: Transaction[];
  dateRange: DateRangeValue;
  setDateRange: (range: DateRangeValue) => void;
  money: (amount: number) => string;
  onExport: () => void;
  onCategory?: (id: string) => void;
}) {
  const [priorityFilter, setPriorityFilter] = useState("All");

  const activeRows = useMemo(() => {
    return rows.filter((r) => priorityFilter === "All" || r.need === priorityFilter);
  }, [rows, priorityFilter]);

  const totalIncome = useMemo(
    () =>
      activeRows
        .filter((r) => r.type === "Income")
        .reduce((sum, r) => sum + r.amount, 0),
    [activeRows]
  );

  const totalExpenses = useMemo(
    () =>
      activeRows
        .filter((r) => r.type === "Expense")
        .reduce((sum, r) => sum + r.amount, 0),
    [activeRows]
  );

  const netSavings = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // 50 / 30 / 20 Budget Rule Metrics
  const needsSpend = useMemo(
    () =>
      rows
        .filter((r) => r.type === "Expense" && r.need === "Need")
        .reduce((sum, r) => sum + r.amount, 0),
    [rows]
  );

  const wantsSpend = useMemo(
    () =>
      rows
        .filter((r) => r.type === "Expense" && r.need === "Want")
        .reduce((sum, r) => sum + r.amount, 0),
    [rows]
  );

  const effectiveIncome = Math.max(1, totalIncome);
  const needsPct = Math.round((needsSpend / effectiveIncome) * 100);
  const wantsPct = Math.round((wantsSpend / effectiveIncome) * 100);
  const savingsPct = Math.max(0, Math.round((netSavings / effectiveIncome) * 100));

  // Debt & Loan Cash Flow Metrics
  const emiPaidInPeriod = useMemo(
    () =>
      rows
        .filter((r) => r.type === "EMI / Loan Payment")
        .reduce((sum, r) => sum + r.amount, 0),
    [rows]
  );

  const borrowedInPeriod = useMemo(
    () =>
      rows
        .filter((r) => r.type === "Borrow / Loan Taken")
        .reduce((sum, r) => sum + r.amount, 0),
    [rows]
  );

  const lentInPeriod = useMemo(
    () =>
      rows
        .filter((r) => r.type === "Lend / Loan Given")
        .reduce((sum, r) => sum + r.amount, 0),
    [rows]
  );

  const recoveredInPeriod = useMemo(
    () =>
      rows
        .filter((r) => r.type === "Debt Recovery")
        .reduce((sum, r) => sum + r.amount, 0),
    [rows]
  );

  // Category breakdown
  const categorySpendList = useMemo(() => {
    return data.categories
      .filter((c) => c.kind === "Expense" && !c.archived)
      .map((c) => {
        const amount = activeRows
          .filter((r) => r.categoryId === c.id && r.type === "Expense")
          .reduce((sum, r) => sum + r.amount, 0);
        const count = activeRows.filter(
          (r) => r.categoryId === c.id && r.type === "Expense"
        ).length;
        const pctOfTotal = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
        return {
          ...c,
          icon: c.icon || matchCategoryIcon(c.name),
          amount,
          count,
          pctOfTotal,
        };
      })
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [data.categories, activeRows, totalExpenses]);

  // Top merchants / payees
  const topMerchants = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const r of activeRows) {
      if (r.type === "Expense") {
        const name = r.merchant?.trim() || r.description?.trim() || "Unspecified";
        const cur = map.get(name) || { amount: 0, count: 0 };
        map.set(name, { amount: cur.amount + r.amount, count: cur.count + 1 });
      }
    }
    return Array.from(map.entries())
      .map(([name, stat]) => ({
        name,
        amount: stat.amount,
        count: stat.count,
        pct: totalExpenses > 0 ? Math.round((stat.amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [activeRows, totalExpenses]);

  // Income Sources
  const incomeSources = useMemo(() => {
    return data.categories
      .filter((c) => c.kind === "Income" && !c.archived)
      .map((c) => {
        const amount = activeRows
          .filter((r) => r.categoryId === c.id && r.type === "Income")
          .reduce((sum, r) => sum + r.amount, 0);
        const count = activeRows.filter(
          (r) => r.categoryId === c.id && r.type === "Income"
        ).length;
        const pct = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0;
        return { ...c, amount, count, pct };
      })
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [data.categories, activeRows, totalIncome]);

  // Investment summary
  const investmentSummary = useMemo(() => getInvestmentSummary(rows), [rows]);

  // 6-Month Cash Flow Trend Data
  const monthlyTrends = useMemo(() => {
    const months = [
      { key: "2026-05", label: "May" },
      { key: "2026-06", label: "Jun" },
      { key: "2026-07", label: "Jul" },
      { key: "2026-08", label: "Aug" },
      { key: "2026-09", label: "Sep" },
      { key: "2026-10", label: "Oct" },
    ];
    return months.map((m) => {
      const inc = data.transactions
        .filter((t) => t.date.slice(0, 7) === m.key && t.type === "Income")
        .reduce((sum, t) => sum + t.amount, 0);
      const exp = data.transactions
        .filter((t) => t.date.slice(0, 7) === m.key && t.type === "Expense")
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...m, income: inc, expense: exp };
    });
  }, [data.transactions]);

  const maxTrendValue = Math.max(
    1,
    ...monthlyTrends.map((m) => Math.max(m.income, m.expense))
  );

  return (
    <div className="space-y-6">
      <PageHeading
        title="Reports"
        description="Cash flow velocity, category allocation, and wealth accumulation."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={onExport}
            className="h-9 gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      {/* Date Range & Priority Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Priority:</span>
          <select
            className="wt-field h-8 w-36 text-xs py-0 font-semibold"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Priority Classification Filter"
          >
            <option value="All">All Priorities</option>
            <option value="Need">Need (Essential)</option>
            <option value="Want">Want (Discretionary)</option>
          </select>
        </div>
      </div>

      {/* Hero Financial Performance Card */}
      <div className="grid gap-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 wt-shadow sm:grid-cols-3">
        {/* Surplus / Net Accumulation */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Net Surplus
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                <Sparkles size={11} /> {savingsRate}% Saved
              </span>
            </div>
            <p className="wt-display mt-1 text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
              {money(netSavings)}
            </p>
          </div>
        </div>

        {/* Total Inflow */}
        <div className="border-t border-border/60 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Inflows
            </span>
            <span className="grid size-6 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft size={13} />
            </span>
          </div>
          <p className="wt-display mt-1 text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{money(totalIncome)}
          </p>
        </div>

        {/* Total Outflow */}
        <div className="border-t border-border/60 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Outflows
            </span>
            <span className="grid size-6 place-items-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ArrowUpRight size={13} />
            </span>
          </div>
          <p className="wt-display mt-1 text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            −{money(totalExpenses)}
          </p>
        </div>
      </div>

      {/* 50 / 30 / 20 Rule Diagnostic Engine */}
      <div className="rounded-2xl border border-border bg-card p-6 wt-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="wt-display text-lg font-bold text-foreground">
                50 / 30 / 20 Budget Rule Diagnostic
              </h2>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                Healthy Balance
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Standard financial benchmark: 50% Essential Needs · 30% Lifestyle Wants · 20% Financial Freedom
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Period Income Baseline</span>
            <p className="text-sm font-extrabold text-foreground tabular-nums">
              {money(totalIncome)}
            </p>
          </div>
        </div>

        {/* Multi-segmented Progress Bar */}
        <div className="mt-5 h-3.5 w-full overflow-hidden rounded-full bg-muted flex shadow-inner">
          <div
            style={{ width: `${Math.min(100, needsPct)}%` }}
            className="h-full bg-blue-500 transition-all duration-300"
            title={`Needs: ${needsPct}%`}
          />
          <div
            style={{ width: `${Math.min(100, wantsPct)}%` }}
            className="h-full bg-amber-500 transition-all duration-300"
            title={`Wants: ${wantsPct}%`}
          />
          <div
            style={{ width: `${Math.min(100, savingsPct)}%` }}
            className="h-full bg-emerald-500 transition-all duration-300"
            title={`Savings & Investments: ${savingsPct}%`}
          />
        </div>

        {/* 3 Target Diagnostic Cards */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/25 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span className="size-2 rounded-full bg-blue-500" />
                Needs & Essentials
              </span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {needsPct}%
              </span>
            </div>
            <p className="mt-1.5 text-lg font-extrabold text-foreground tabular-nums">
              {money(needsSpend)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Target: Under 50% ({needsPct <= 50 ? "✓ On Track" : "⚠ Exceeding"})
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/25 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span className="size-2 rounded-full bg-amber-500" />
                Lifestyle Wants
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {wantsPct}%
              </span>
            </div>
            <p className="mt-1.5 text-lg font-extrabold text-foreground tabular-nums">
              {money(wantsSpend)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Target: Under 30% ({wantsPct <= 30 ? "✓ Disciplined" : "⚠ High"})
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/25 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span className="size-2 rounded-full bg-emerald-500" />
                Savings & Wealth
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {savingsPct}%
              </span>
            </div>
            <p className="mt-1.5 text-lg font-extrabold text-foreground tabular-nums">
              {money(netSavings)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Target: Over 20% ({savingsPct >= 20 ? "★ Outstanding" : "Needs Boost"})
            </p>
          </div>
        </div>

        {/* Advisor Insight Strip */}
        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200 border border-emerald-500/20">
          <Award size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            <strong>Advisor Insight:</strong> Exceptional financial discipline! Your lifestyle expenses are just {wantsPct}%, enabling a {savingsPct}% savings rate that significantly accelerates wealth compounding.
          </span>
        </div>
      </div>

      {/* Two-Column Analytics: Cash Flow Trends & Top Merchants */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend Visual SVG Bars */}
        <div className="rounded-2xl border border-border bg-card p-6 wt-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="wt-display text-base font-bold text-foreground">
                Cash Flow Velocity (6 Months)
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2.5 rounded-full bg-emerald-500" /> Income
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2.5 rounded-full bg-rose-500" /> Expense
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparison of total inflows vs outflows over time
            </p>
          </div>

          <div className="mt-6 flex h-48 items-end justify-between gap-3 pt-6 border-b border-border pb-2">
            {monthlyTrends.map((m) => {
              const incHeight = Math.max(8, Math.round((m.income / maxTrendValue) * 160));
              const expHeight = Math.max(8, Math.round((m.expense / maxTrendValue) * 160));

              return (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
                  <div className="flex w-full items-end justify-center gap-1.5 h-[160px]">
                    <div
                      style={{ height: `${incHeight}px` }}
                      className="w-3.5 rounded-t-md bg-emerald-500 hover:bg-emerald-600 transition-all cursor-pointer"
                      title={`${m.label} Income: ${money(m.income)}`}
                    />
                    <div
                      style={{ height: `${expHeight}px` }}
                      className="w-3.5 rounded-t-md bg-rose-500 hover:bg-rose-600 transition-all cursor-pointer"
                      title={`${m.label} Expense: ${money(m.expense)}`}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Expense Payees & Merchants */}
        <div className="rounded-2xl border border-border bg-card p-6 wt-shadow flex flex-col justify-between">
          <div>
            <h3 className="wt-display text-base font-bold text-foreground">
              Top Expense Payees & Merchants
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Entities where your expenditure concentrated most heavily
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {topMerchants.length === 0 ? (
              <EmptyInline message="No expenses recorded in this period." />
            ) : (
              topMerchants.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-7 place-items-center rounded-lg bg-card text-xs font-bold text-foreground border border-border shadow-2xs">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.count} transaction{item.count > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-foreground tabular-nums">
                      {money(item.amount)}
                    </p>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {item.pct}% of total outflow
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Expense Allocation by Category (2-in-a-Row Responsive Grid) */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 wt-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border/60">
          <div>
            <h3 className="wt-display text-base font-bold text-foreground">
              Expense Allocation by Category
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ranked breakdown of expenditure across your budgeted categories
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {categorySpendList.length} categories active
          </span>
        </div>

        {/* Proportional Multi-Color Allocation Bar */}
        {categorySpendList.length > 0 && (
          <div className="mt-4">
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted flex shadow-inner">
              {categorySpendList.map((cat, idx) => {
                const colors = [
                  "bg-blue-500",
                  "bg-emerald-500",
                  "bg-violet-500",
                  "bg-amber-500",
                  "bg-rose-500",
                  "bg-cyan-500",
                  "bg-fuchsia-500",
                ];
                return (
                  <div
                    key={cat.id}
                    style={{ width: `${Math.max(2, cat.pctOfTotal)}%` }}
                    className={`h-full ${colors[idx % colors.length]} transition-all`}
                    title={`${cat.name}: ${cat.pctOfTotal}% (${money(cat.amount)})`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 2 in a Row Grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categorySpendList.length === 0 ? (
            <div className="col-span-2">
              <EmptyInline message="No category spending found in this date range." />
            </div>
          ) : (
            categorySpendList.map((cat, idx) => {
              const barColors = [
                "bg-blue-500",
                "bg-emerald-500",
                "bg-violet-500",
                "bg-amber-500",
                "bg-rose-500",
                "bg-cyan-500",
                "bg-fuchsia-500",
              ];
              const barColor = barColors[idx % barColors.length];

              return (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-border/70 bg-card p-4.5 hover:border-primary/50 hover:shadow-xs transition-all cursor-pointer group"
                  onClick={() => onCategory?.(cat.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted/60 text-lg group-hover:scale-105 transition-transform">
                        {cat.icon || "🏷️"}
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-foreground block truncate group-hover:text-primary transition-colors">
                          {cat.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                          {cat.count} transaction{cat.count > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-extrabold text-foreground tabular-nums block">
                        {money(cat.amount)}
                      </span>
                      <span className="inline-block mt-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {cat.pctOfTotal}% of total
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      style={{ width: `${Math.min(100, Math.max(3, cat.pctOfTotal))}%` }}
                      className={`h-full ${barColor} rounded-full transition-all`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3-Pillar Capital Flow: Income Streams, Investments, and Debt/Loan Cash Flow */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Income Breakdown */}
        <div className="rounded-2xl border border-border bg-card p-6 wt-shadow flex flex-col justify-between">
          <div>
            <h3 className="wt-display text-base font-bold text-foreground">
              Income Streams Breakdown
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sources of funds deposited during this timeframe
            </p>

            <div className="mt-4 space-y-3">
              {incomeSources.length === 0 ? (
                <EmptyInline message="No income records found for this period." />
              ) : (
                incomeSources.map((inc) => (
                  <div
                    key={inc.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-emerald-500/5 p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-sm">
                        {inc.icon || "💰"}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-foreground">{inc.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {inc.count} deposit{inc.count > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        +{money(inc.amount)}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {inc.pct}% of total income
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Investment & Wealth Deployment */}
        <div className="rounded-2xl border border-border bg-card p-6 wt-shadow flex flex-col justify-between">
          <div>
            <h3 className="wt-display text-base font-bold text-foreground">
              Investment Deployment
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Capital allocated into wealth-building instruments
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Capital Deployed
                </span>
                <span className="wt-display text-lg font-extrabold text-foreground mt-1 block tabular-nums">
                  {money(investmentSummary.contributions)}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Mutual funds, stocks & SIPs
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Returns & Dividends
                </span>
                <span className="wt-display text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block tabular-nums">
                  +{money(investmentSummary.returns)}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Cash inflows from assets
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-primary/10 p-3 text-xs text-primary flex items-center gap-2">
            <Compass size={16} className="shrink-0" />
            <span>
              Investments compound long-term and are kept distinct from living expenses.
            </span>
          </div>
        </div>

        {/* Debt, Loan & Borrowing Cash Flow */}
        <div className="rounded-2xl border border-border bg-card p-6 wt-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="wt-display text-base font-bold text-foreground">
                  Debt & Loan Cash Flow
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  EMIs serviced, borrowings, and advances
                </p>
              </div>
              <span className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Landmark size={16} />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  EMIs Paid
                </span>
                <span className="wt-display text-base font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 block tabular-nums">
                  {money(emiPaidInPeriod)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Debt servicing
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Borrowed
                </span>
                <span className="wt-display text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block tabular-nums">
                  +{money(borrowedInPeriod)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Loans received
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Money Lent
                </span>
                <span className="wt-display text-base font-extrabold text-violet-600 dark:text-violet-400 mt-0.5 block tabular-nums">
                  {money(lentInPeriod)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Advances given
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Recovered
                </span>
                <span className="wt-display text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                  +{money(recoveredInPeriod)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Lent funds returned
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>Net Debt Movement</span>
            <span
              className={`font-bold tabular-nums ${
                borrowedInPeriod + recoveredInPeriod - emiPaidInPeriod - lentInPeriod >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {money(borrowedInPeriod + recoveredInPeriod - emiPaidInPeriod - lentInPeriod)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  Compass,
  Download,
  Landmark,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, type DateRangeValue } from "@/components/shared/DateRangeFilter";
import { CashFlowVelocityChart } from "@/components/shared/CashFlowVelocityChart";
import { CategoryPieChart } from "@/components/shared/CategoryPieChart";
import { CirclePercentageGauge } from "@/components/shared/CirclePercentageGauge";
import { NetWealthLineChart } from "@/components/shared/NetWealthLineChart";
import { EmptyInline } from "@/components/shared/EmptyInline";
import { PageHeading } from "@/components/shared/PageHeading";
import { matchCategoryIcon } from "@/lib/icon-matcher";
import {
  getHoldingsSummary,
  getInvestmentSummary,
  getLoansSummary,
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
        .filter(
          (r) =>
            r.type === "Income" ||
            r.type === "Borrow / Loan Taken" ||
            r.type === "Debt Recovery" ||
            r.type === "Refund"
        )
        .reduce((sum, r) => sum + r.amount, 0),
    [activeRows]
  );

  const totalExpenses = useMemo(
    () =>
      activeRows
        .filter(
          (r) =>
            r.type === "Expense" ||
            r.type === "EMI / Loan Payment" ||
            r.type === "Lend / Loan Given"
        )
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

  // Category breakdown for Donut Chart
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
          pct: pctOfTotal,
        };
      })
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [data.categories, activeRows, totalExpenses]);

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

  // Investment & Loan summaries from real portfolio state + period transactions
  const holdingsSummary = useMemo(() => getHoldingsSummary(data.investments), [data.investments]);
  const loansSummary = useMemo(() => getLoansSummary(data.loans), [data.loans]);
  const investmentSummary = useMemo(() => getInvestmentSummary(rows), [rows]);

  const activeSipMonthly = useMemo(() => {
    return (data.recurring ?? [])
      .filter((r) => r.type === "Investment" && r.enabled)
      .reduce((sum, r) => sum + r.amount, 0);
  }, [data.recurring]);

  const displayCapitalDeployed = useMemo(() => {
    if (investmentSummary.contributions > 0) return investmentSummary.contributions;
    if (activeSipMonthly > 0) return activeSipMonthly;
    return holdingsSummary.totalInvested;
  }, [investmentSummary.contributions, activeSipMonthly, holdingsSummary.totalInvested]);

  const displayReturns = useMemo(() => {
    if (investmentSummary.returns > 0) return investmentSummary.returns;
    return Math.max(0, holdingsSummary.totalReturns);
  }, [investmentSummary.returns, holdingsSummary.totalReturns]);

  const displayEmiPaid = useMemo(() => {
    if (emiPaidInPeriod > 0) return emiPaidInPeriod;
    return loansSummary.totalMonthlyEmi;
  }, [emiPaidInPeriod, loansSummary.totalMonthlyEmi]);

  const displayBorrowed = useMemo(() => {
    if (borrowedInPeriod > 0) return borrowedInPeriod;
    return loansSummary.totalPrincipal;
  }, [borrowedInPeriod, loansSummary.totalPrincipal]);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Reports & Analytics"
        description="Comprehensive cash flow velocity, category allocation, and wealth accumulation."
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

      {/* Hero Financial Performance Metric Cards */}
      <div className="rounded-xl sm:rounded-2xl border border-border/70 bg-card p-3 sm:p-6 wt-shadow hover:border-border transition-all divide-y divide-border/60 sm:divide-y-0 sm:grid sm:grid-cols-3 sm:gap-4">
        {/* Net Surplus */}
        <div className="pb-2.5 sm:pb-0 flex items-center justify-between gap-3 sm:block">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Net Surplus Retained
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <Sparkles size={10} /> {savingsRate}% Saved
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              {netSavings >= 0 ? "Surplus capital retained" : "Net spending deficit"}
            </p>
          </div>
          <p className="wt-display text-base sm:text-3xl font-extrabold text-foreground tabular-nums whitespace-nowrap shrink-0 sm:mt-2">
            {money(netSavings)}
          </p>
        </div>

        {/* Total Inflow */}
        <div className="py-2.5 sm:py-0 sm:border-l sm:border-border/60 sm:pl-5 flex items-center justify-between gap-3 sm:block">
          <div className="min-w-0">
            <div className="flex items-center justify-between sm:w-full">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Period Inflows
              </span>
              <span className="hidden sm:grid size-7 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft size={15} />
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              All salary, dividends & cash inflows
            </p>
          </div>
          <p className="wt-display text-base sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap shrink-0 sm:mt-2">
            +{money(totalIncome)}
          </p>
        </div>

        {/* Total Outflow */}
        <div className="pt-2.5 sm:pt-0 sm:border-l sm:border-border/60 sm:pl-5 flex items-center justify-between gap-3 sm:block">
          <div className="min-w-0">
            <div className="flex items-center justify-between sm:w-full">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Period Outflows
              </span>
              <span className="hidden sm:grid size-7 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ArrowUpRight size={15} />
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              All expenses, EMIs & outflows
            </p>
          </div>
          <p className="wt-display text-base sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap shrink-0 sm:mt-2">
            −{money(totalExpenses)}
          </p>
        </div>
      </div>

      {/* Reused Cash Flow Velocity Chart (Day-by-Day view when Month selected) */}
      <CashFlowVelocityChart
        transactions={data.transactions}
        dateRange={dateRange}
        money={money}
        title="Cash Flow Velocity Breakdown"
      />

      {/* Two Column Visual Analytics: Allocation Donut & 50/30/20 Diagnostic */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Interactive Category Pie / Donut Chart */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 wt-shadow hover:border-border transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="wt-display text-base font-bold text-foreground">
                  Expense Allocation Donut
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visual distribution across major expense categories
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                Donut Chart
              </span>
            </div>
          </div>

          <div className="mt-5">
            <CategoryPieChart
              categories={categorySpendList}
              totalAmount={totalExpenses}
              money={money}
              onCategoryClick={onCategory}
            />
          </div>
        </div>

        {/* 50 / 30 / 20 Budget Diagnostic & Allocations */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 wt-shadow hover:border-border transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="wt-display text-base font-bold text-foreground">
                  50 / 30 / 20 Diagnostic
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  50% Needs · 30% Wants · 20% Wealth compounding
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                Rule Check
              </span>
            </div>

            {/* 3 Circular Percentage Gauge Charts */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CirclePercentageGauge
                label="Needs"
                percentage={needsPct}
                target="< 50%"
                amountFormatted={money(needsSpend)}
                statusText={needsPct <= 50 ? "✓ Optimal" : "⚠ High"}
                statusVariant={needsPct <= 50 ? "success" : "warning"}
                strokeColor="#3b82f6"
              />

              <CirclePercentageGauge
                label="Wants"
                percentage={wantsPct}
                target="< 30%"
                amountFormatted={money(wantsSpend)}
                statusText={wantsPct <= 30 ? "✓ Disciplined" : "⚠ High"}
                statusVariant={wantsPct <= 30 ? "success" : "danger"}
                strokeColor="#f59e0b"
              />

              <CirclePercentageGauge
                label="Savings"
                percentage={savingsPct}
                target="> 20%"
                amountFormatted={money(netSavings)}
                statusText={savingsPct >= 20 ? "★ Compounding" : "Boost"}
                statusVariant={savingsPct >= 20 ? "success" : "info"}
                strokeColor="#10b981"
              />
            </div>
          </div>

          {/* Advisor Insight Strip */}
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200 border border-emerald-500/20">
            <Award size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>Advisor Insight:</strong> Disciplined capital stewardship. Your lifestyle expenses are {wantsPct}%, enabling a {savingsPct}% savings rate that compounds portfolio wealth.
            </span>
          </div>
        </div>
      </div>

      {/* Cumulative Net Wealth & Cash Flow Trend Line Chart */}
      <NetWealthLineChart
        transactions={data.transactions}
        dateRange={dateRange}
        money={money}
      />

      {/* 3-Pillar Capital Flow: Income Streams, Investments, and Debt/Loan Cash Flow */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Income Breakdown */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 wt-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="wt-display text-base font-bold text-foreground">
                  Income Streams
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sources of funds deposited
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                Inflows
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
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
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 wt-shadow hover:border-border transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="wt-display text-base font-bold text-foreground">
                  Investment Deployment
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Wealth-building allocations
                </p>
              </div>
              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                Assets
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Capital Deployed
                </span>
                <span className="wt-display text-base sm:text-lg font-extrabold text-foreground mt-1 block tabular-nums">
                  {money(displayCapitalDeployed)}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Mutual funds & SIPs
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Returns & Divs
                </span>
                <span className="wt-display text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block tabular-nums">
                  +{money(displayReturns)}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Asset payouts
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
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 wt-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="wt-display text-base font-bold text-foreground">
                  Debt & Loan Servicing
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  EMIs serviced & loan advances
                </p>
              </div>
              <span className="grid size-7 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Landmark size={14} />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  EMIs Paid
                </span>
                <span className="wt-display text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 block tabular-nums">
                  {money(displayEmiPaid)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Debt servicing
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Borrowed
                </span>
                <span className="wt-display text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block tabular-nums">
                  +{money(displayBorrowed)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Loans received
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Money Lent
                </span>
                <span className="wt-display text-sm sm:text-base font-extrabold text-violet-600 dark:text-violet-400 mt-0.5 block tabular-nums">
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
                <span className="wt-display text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                  +{money(recoveredInPeriod)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Returned
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

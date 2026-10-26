import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  ChevronDown,
  Compass,
  Download,
  Landmark,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, type DateRangeValue } from "@/components/shared/DateRangeFilter";
import { CashFlowVelocityChart } from "@/components/shared/CashFlowVelocityChart";
import { CategoryPieChart } from "@/components/shared/CategoryPieChart";
import { CirclePercentageGauge } from "@/components/shared/CirclePercentageGauge";
import { NetWealthLineChart } from "@/components/shared/NetWealthLineChart";
import { EmptyInline } from "@/components/shared/EmptyInline";
import { PageHeading } from "@/components/shared/PageHeading";
import { Metric } from "@/components/shared/Metric";
import { matchCategoryIcon } from "@/lib/icon-matcher";
import { useSharedPeriod } from "@/lib/period-state";
import { migrateLegacyState } from "@/lib/migration";
import {
  getBudgetMetrics,
  getDerivedLoanState,
  getPeriodMetrics,
  getWealthMetrics,
} from "@/lib/metrics-service";
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
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [expandedChart, setExpandedChart] = useState<"velocity" | "trend" | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "cashflow" | "spending" | "rule" | "debt" | "wealth">("all");

  const [sharedPeriod] = useSharedPeriod();
  const unified = useMemo(() => migrateLegacyState(data), [data]);
  const periodMetrics = useMemo(
    () => getPeriodMetrics(unified.entries, sharedPeriod),
    [unified.entries, sharedPeriod]
  );
  const wealthMetrics = useMemo(
    () =>
      getWealthMetrics(
        unified.accounts,
        unified.entries,
        unified.holdings,
        unified.loans,
        unified.goals
      ),
    [unified]
  );
  const budgetMetrics = useMemo(
    () => getBudgetMetrics(unified.categories, unified.entries, sharedPeriod),
    [unified.categories, unified.entries, sharedPeriod]
  );

  const totalIncome = periodMetrics.moneyIn;
  const totalExpenses = periodMetrics.moneyOut;
  const netSavings = periodMetrics.saved;
  const savingsRate = periodMetrics.savingsRatePct ?? 0;

  // 50 / 30 / 20 Budget Rule Metrics
  const needsSpend = periodMetrics.needs;
  const wantsSpend = periodMetrics.wants;
  const needsPct = periodMetrics.split503020.needsPct;
  const wantsPct = periodMetrics.split503020.wantsPct;
  const savingsPct = periodMetrics.split503020.savingsPct;

  // Debt & Loan Cash Flow Metrics
  const emiPaidInPeriod = periodMetrics.emisInPeriod;
  const borrowedInPeriod = periodMetrics.whereSavingsWent.borrowedNet;
  const lentInPeriod = periodMetrics.whereSavingsWent.lentOutNet;
  const recoveredInPeriod = 0;

  // Category breakdown for Donut Chart (derived from budget engine, NO transfers/lent)
  const categorySpendList = useMemo(() => {
    return budgetMetrics.categoryRows
      .filter((r) => r.spent > 0)
      .map((r) => {
        const pctOfTotal = periodMetrics.moneyOut > 0 ? Math.round((r.spent / periodMetrics.moneyOut) * 100) : 0;
        return {
          id: r.category.id,
          name: r.category.name,
          kind: "Expense" as const,
          icon: r.category.icon || matchCategoryIcon(r.category.name),
          color: r.category.color || "blue",
          monthlyLimit: r.cap,
          amount: r.spent,
          count: 1,
          pctOfTotal,
          pct: pctOfTotal,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [budgetMetrics, periodMetrics.moneyOut]);

  // Income Sources (derived from period entries, ensuring sum equals totalIncome)
  const incomeSources = useMemo(() => {
    const periodKey = `${sharedPeriod.year}-${String(sharedPeriod.month).padStart(2, "0")}`;
    const periodEntries = unified.entries.filter(
      (e) => e.status === "posted" && e.kind === "income" && e.date.startsWith(periodKey)
    );
    return unified.categories
      .filter((c) => c.kind === "income" && !c.archived)
      .map((c) => {
        const catEntries = periodEntries.filter((e) => e.category_id === c.id);
        const amount = catEntries.reduce((sum, e) => sum + e.amount, 0);
        const count = catEntries.length;
        const pct = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0;
        return { ...c, amount, count, pct };
      })
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [unified, sharedPeriod, totalIncome]);

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
    return borrowedInPeriod;
  }, [borrowedInPeriod]);

  const hasDebtActivity = useMemo(() => {
    return (data.loans && data.loans.length > 0) || loansSummary.totalPrincipal > 0 || emiPaidInPeriod > 0 || borrowedInPeriod > 0 || lentInPeriod > 0 || recoveredInPeriod > 0;
  }, [data.loans, loansSummary.totalPrincipal, emiPaidInPeriod, borrowedInPeriod, lentInPeriod, recoveredInPeriod]);

  const hasInvestmentActivity = useMemo(() => {
    return (data.investments && data.investments.length > 0) || displayCapitalDeployed > 0 || displayReturns > 0 || activeSipMonthly > 0;
  }, [data.investments, displayCapitalDeployed, displayReturns, activeSipMonthly]);

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

      {/* Date Range & Priority Filter Controls: Collapsible across all screen sizes */}
      <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-3.5 wt-shadow hover:border-border transition-colors space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
          <div className="flex-1 min-w-0">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Filter Toggle (Consistent across Desktop and Mobile) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterExpanded((prev) => !prev)}
              className={`h-7 sm:h-8 gap-1.5 px-2.5 text-xs font-bold transition-all cursor-pointer ${
                priorityFilter !== "All"
                  ? "border-primary/40 bg-primary/10 text-primary shadow-2xs"
                  : "text-muted-foreground hover:text-foreground border-border/80"
              }`}
              aria-expanded={isFilterExpanded}
              aria-label={isFilterExpanded ? "Collapse filters" : "Expand filters"}
            >
              <SlidersHorizontal size={12} className={priorityFilter !== "All" ? "text-primary" : "text-muted-foreground"} />
              <span>Filters</span>
              {priorityFilter !== "All" && (
                <span className="grid size-4 place-items-center rounded-full bg-primary text-[9.5px] font-bold text-primary-foreground leading-none">
                  1
                </span>
              )}
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${isFilterExpanded ? "rotate-180" : ""}`}
              />
            </Button>

            {priorityFilter !== "All" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 sm:h-8 gap-1 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                onClick={() => setPriorityFilter("All")}
                title="Reset priority filter"
              >
                <RotateCcw size={12} /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Priority Filter: Collapsible across all screen sizes */}
        <div
          className={`${
            isFilterExpanded ? "flex" : "hidden"
          } flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 animate-in fade-in-50 duration-150`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Priority Classification:</span>
            <select
              className="wt-field h-8 w-auto min-w-[155px] text-xs py-0 pl-2.5 pr-8 font-semibold cursor-pointer"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Priority Classification Filter"
            >
              <option value="All">All Priorities</option>
              <option value="Need">Need (Essential)</option>
              <option value="Want">Want (Discretionary)</option>
            </select>
          </div>
          {priorityFilter !== "All" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-semibold">
              Filter: {priorityFilter}
              <button type="button" onClick={() => setPriorityFilter("All")} className="hover:opacity-80 cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Responsive Segmented Reports Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 wt-scrollbar">
        {[
          { id: "all", label: "Overview & All" },
          { id: "cashflow", label: "Cash Flow & Trends" },
          { id: "spending", label: "Spending Allocation" },
          { id: "rule", label: "50/30/20 Discipline" },
          { id: "debt", label: "Income & Debt" },
          { id: "wealth", label: "Wealth & SIPs" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hero Financial Performance Metric Cards */}
      <div className="rounded-xl sm:rounded-2xl border border-border/70 bg-card p-3 sm:p-6 wt-shadow hover:border-border transition-all divide-y divide-border/60 sm:divide-y-0 sm:grid sm:grid-cols-3 sm:gap-4">
        {/* Net Surplus */}
        <div className="pb-2.5 sm:pb-0 flex items-center justify-between gap-3 sm:block">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Saved
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <Sparkles size={10} /> <Metric id="savings_rate" value={savingsRate} format="percent" /> Saved
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              {netSavings >= 0 ? "Surplus capital retained" : "Net spending deficit"}
            </p>
          </div>
          <p className="wt-display text-base sm:text-3xl font-extrabold text-foreground tabular-nums whitespace-nowrap shrink-0 sm:mt-2">
            <Metric id="saved" value={netSavings} />
          </p>
        </div>

        {/* Total Inflow */}
        <div className="py-2.5 sm:py-0 sm:border-l sm:border-border/60 sm:pl-5 flex items-center justify-between gap-3 sm:block">
          <div className="min-w-0">
            <div className="flex items-center justify-between sm:w-full">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Money In
              </span>
              <span className="hidden sm:grid size-7 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft size={15} />
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              Salary, freelance & other income
            </p>
          </div>
          <p className="wt-display text-base sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap shrink-0 sm:mt-2">
            <Metric id="money_in" value={totalIncome} signed />
          </p>
        </div>

        {/* Total Outflow */}
        <div className="pt-2.5 sm:pt-0 sm:border-l sm:border-border/60 sm:pl-5 flex items-center justify-between gap-3 sm:block">
          <div className="min-w-0">
            <div className="flex items-center justify-between sm:w-full">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Money Out
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
            <Metric id="money_out" value={totalExpenses} />
          </p>
        </div>
      </div>

      {/* Side by Side Charts in 1 Row: Velocity Breakdown & Cumulative Net Cash Flow Trend */}
      {(activeTab === "all" || activeTab === "cashflow") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <CashFlowVelocityChart
            transactions={data.transactions}
            dateRange={dateRange}
            money={money}
            title="Cash Flow Velocity Breakdown"
            onExpand={() => setExpandedChart("velocity")}
          />

          <NetWealthLineChart
            transactions={data.transactions}
            dateRange={dateRange}
            money={money}
            title="Cumulative Net Cash Flow Trend"
            onExpand={() => setExpandedChart("trend")}
          />
        </div>
      )}

      {/* Two Column Visual Analytics: Allocation Donut & 50/30/20 Diagnostic */}
      {(activeTab === "all" || activeTab === "spending" || activeTab === "rule") && (
        <div className={activeTab === "all" ? "grid gap-6 lg:grid-cols-2" : "grid gap-6"}>
          {/* Interactive Category Pie / Donut Chart */}
          {(activeTab === "all" || activeTab === "spending") && (
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
          )}

          {/* 50 / 30 / 20 Budget Diagnostic & Allocations */}
          {(activeTab === "all" || activeTab === "rule") && (
            <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 wt-shadow hover:border-border transition-all flex flex-col justify-between">
              <div className="space-y-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <CirclePercentageGauge
                    label="Needs"
                    percentage={needsPct}
                    target="< 50%"
                    amountFormatted={money(needsSpend)}
                    metricId="needs_pct"
                    amountMetricId="needs_amt"
                    amountMetricValue={needsSpend}
                    statusText={needsPct <= 50 ? "✓ Optimal" : "⚠ High"}
                    statusVariant={needsPct <= 50 ? "success" : "warning"}
                    strokeColor="#3b82f6"
                  />

                  <CirclePercentageGauge
                    label="Wants"
                    percentage={wantsPct}
                    target="< 30%"
                    amountFormatted={money(wantsSpend)}
                    metricId="wants_pct"
                    amountMetricId="wants_amt"
                    amountMetricValue={wantsSpend}
                    statusText={wantsPct <= 30 ? "✓ Disciplined" : "⚠ High"}
                    statusVariant={wantsPct <= 30 ? "success" : "danger"}
                    strokeColor="#f59e0b"
                  />

                  <CirclePercentageGauge
                    label="Savings"
                    percentage={savingsPct}
                    target="> 20%"
                    amountFormatted={money(netSavings)}
                    metricId="savings_pct"
                    amountMetricId="saved"
                    amountMetricValue={netSavings}
                    statusText={savingsPct >= 20 ? "★ Compounding" : "Boost"}
                    statusVariant={savingsPct >= 20 ? "success" : "info"}
                    strokeColor="#10b981"
                  />
                </div>

                {/* Proportional Rule Allocation Distribution Bar */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Income Distribution Split</span>
                    <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
                      {needsPct}% Needs · {wantsPct}% Wants · {savingsPct}% Saved
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted flex shadow-2xs">
                    <div
                      style={{ width: `${Math.min(needsPct, 100)}%` }}
                      className="h-full bg-blue-500 transition-all duration-300"
                      title={`Needs: ${needsPct}%`}
                    />
                    <div
                      style={{ width: `${Math.min(wantsPct, 100 - Math.min(needsPct, 100))}%` }}
                      className="h-full bg-amber-500 transition-all duration-300"
                      title={`Wants: ${wantsPct}%`}
                    />
                    <div
                      style={{
                        width: `${Math.min(
                          savingsPct,
                          Math.max(0, 100 - Math.min(needsPct, 100) - Math.min(wantsPct, 100))
                        )}%`,
                      }}
                      className="h-full bg-emerald-500 transition-all duration-300"
                      title={`Savings: ${savingsPct}%`}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-blue-500" /> Needs Target ≤50%
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-amber-500" /> Wants Target ≤30%
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500" /> Savings Target ≥20%
                      </span>
                    </div>
                    <span className="font-medium text-foreground">
                      {needsPct <= 50 && wantsPct <= 30 && savingsPct >= 20
                        ? "✓ Rule Compliant"
                        : "Adjustments Recommended"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Advisor Insight Strip */}
              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200 border border-emerald-500/20">
                <Award size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  <strong>Advisor Insight:</strong>{" "}
                  {savingsPct >= 20 && wantsPct <= 30
                    ? `Disciplined capital stewardship. Your lifestyle expenses are controlled at ${wantsPct}%, enabling a ${savingsPct}% savings rate that compounds portfolio wealth.`
                    : wantsPct > 30
                    ? `Discretionary spending is elevated at ${wantsPct}% (target ≤ 30%). Moderating non-essential wants will channel higher cash flow into wealth compounding.`
                    : needsPct > 50
                    ? `Essential living costs consume ${needsPct}% of inflows. Look for recurring utility, subscription, or fixed bill optimizations to increase headroom.`
                    : `Balanced cash flow profile. Direct surplus capital into automated recurring SIPs or debt reduction to accelerate wealth compounding.`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3-Pillar Capital Flow: Income Streams, Investments, and Debt/Loan Cash Flow */}
      {(activeTab === "all" || activeTab === "debt" || activeTab === "wealth") && (
        <div className={`grid gap-6 ${
          activeTab === "all"
            ? "md:grid-cols-3"
            : activeTab === "debt"
            ? "md:grid-cols-2"
            : "grid-cols-1 max-w-3xl"
        }`}>
          {/* Income Breakdown */}
          {(activeTab === "all" || activeTab === "debt") && (
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 wt-shadow flex flex-col justify-between h-[390px] sm:h-[410px] transition-all hover:border-border">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 sm:size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <ArrowDownLeft size={16} />
                  </span>
                  <div>
                    <h3 className="wt-display text-sm sm:text-base font-bold text-foreground">
                      Income Streams
                    </h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      Sources of funds deposited
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  +{money(totalIncome)}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto wt-scrollbar min-h-0 py-3 pr-1 space-y-2">
                {incomeSources.length === 0 ? (
                  <div className="py-7 px-4 text-center rounded-xl border border-dashed border-border/70 bg-muted/15 space-y-2 my-auto">
                    <span className="grid size-10 mx-auto place-items-center rounded-full bg-muted/60 text-muted-foreground">
                      <Wallet size={18} className="opacity-60" />
                    </span>
                    <p className="text-xs font-bold text-foreground">No Inflows Recorded</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                      Income deposits logged in this period will be classified here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {incomeSources.map((inc) => (
                      <div
                        key={inc.id}
                        className="rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 p-2.5 transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="grid size-7 place-items-center rounded-lg bg-card shadow-2xs text-sm shrink-0">
                              {inc.icon || "💰"}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{inc.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {inc.count} deposit{inc.count > 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              +{money(inc.amount)}
                            </p>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {inc.pct}% of income
                            </span>
                          </div>
                        </div>

                        {/* Visual Contribution Bar */}
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            style={{ width: `${Math.min(inc.pct, 100)}%` }}
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-auto shrink-0 pt-2.5 border-t border-border/60">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs text-muted-foreground flex items-center justify-between">
                  <span className="font-medium">Total Inflows</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{money(totalIncome)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Investment & Wealth Deployment */}
          {(activeTab === "all" || activeTab === "wealth") && (
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 wt-shadow flex flex-col justify-between h-[390px] sm:h-[410px] transition-all hover:border-border">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 sm:size-9 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                    <TrendingUp size={16} />
                  </span>
                  <div>
                    <h3 className="wt-display text-sm sm:text-base font-bold text-foreground">
                      Investment Deployment
                    </h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      Wealth-building allocations
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-violet-700 dark:text-violet-300">
                  {data.investments && data.investments.length > 0 ? `${data.investments.length} Assets` : "Portfolio"}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto wt-scrollbar min-h-0 py-3 pr-1 space-y-2.5">
                {!hasInvestmentActivity ? (
                  <div className="py-7 px-4 text-center rounded-xl border border-dashed border-border/70 bg-muted/15 space-y-2 my-auto">
                    <span className="grid size-10 mx-auto place-items-center rounded-full bg-muted/60 text-muted-foreground">
                      <TrendingUp size={18} className="opacity-60" />
                    </span>
                    <p className="text-xs font-bold text-foreground">No Active Investments</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                      Track mutual funds, stocks, and SIPs to monitor long-term wealth compounding.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Capital Deployed
                        </span>
                        <span className="wt-display text-sm sm:text-base font-extrabold text-foreground mt-0.5 block tabular-nums">
                          {money(displayCapitalDeployed)}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                          {activeSipMonthly > 0 ? `SIP: ${money(activeSipMonthly)}/mo` : "Mutual funds & SIPs"}
                        </span>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Returns & Yield
                        </span>
                        <span className="wt-display text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                          +{money(displayReturns)}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                          {holdingsSummary.returnPercentage > 0 ? `+${holdingsSummary.returnPercentage.toFixed(1)}% growth` : "Asset payouts"}
                        </span>
                      </div>
                    </div>

                    {/* Portfolio Status Banner */}
                    <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-2.5 text-xs text-violet-700 dark:text-violet-300 flex items-center justify-between">
                      <span className="font-semibold">Total Portfolio Net Worth</span>
                      <span className="font-extrabold tabular-nums">
                        {money(holdingsSummary.currentValue)}
                      </span>
                    </div>

                    {/* Holdings breakdown if any exist */}
                    {data.investments && data.investments.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Tracked Assets ({data.investments.length})
                        </p>
                        {data.investments.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 p-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{inv.name}</p>
                              <p className="text-[10px] text-muted-foreground">{inv.assetType}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-foreground tabular-nums">
                                {money(inv.currentAmount ?? inv.investedAmount)}
                              </p>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                {inv.currentAmount && inv.investedAmount
                                  ? `${inv.currentAmount >= inv.investedAmount ? "+" : ""}${(((inv.currentAmount - inv.investedAmount) / inv.investedAmount) * 100).toFixed(1)}%`
                                  : "Active"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-auto shrink-0 pt-2.5 border-t border-border/60">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
                  <Compass size={14} className="shrink-0 text-primary" />
                  <span className="truncate">
                    {activeSipMonthly > 0
                      ? `${money(activeSipMonthly)}/mo automated discipline active`
                      : "Investments kept distinct from living burn rate"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Debt, Loan & Borrowing Cash Flow */}
          {(activeTab === "all" || activeTab === "debt") && (
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 wt-shadow flex flex-col justify-between h-[390px] sm:h-[410px] transition-all hover:border-border">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className={`grid size-8 sm:size-9 place-items-center rounded-xl shrink-0 ${
                    hasDebtActivity ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {hasDebtActivity ? <Landmark size={16} /> : <ShieldCheck size={16} />}
                  </span>
                  <div>
                    <h3 className="wt-display text-sm sm:text-base font-bold text-foreground">
                      Debt & Loan Servicing
                    </h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      EMIs serviced & loan advances
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold ${
                  hasDebtActivity
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                }`}>
                  {hasDebtActivity ? `${data.loans?.length || 1} Active Debt` : "Debt-Free"}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto wt-scrollbar min-h-0 py-3 pr-1 space-y-2.5">
                {!hasDebtActivity ? (
                  <div className="py-7 px-4 text-center rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 space-y-2 my-auto">
                    <span className="grid size-10 mx-auto place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck size={20} />
                    </span>
                    <p className="text-xs font-bold text-foreground">🎉 Zero Debt Obligations</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                      You have no outstanding loans or borrowing commitments. 100% of your earnings stay yours.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          EMIs Serviced
                        </span>
                        <span className="wt-display text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 block tabular-nums">
                          {money(displayEmiPaid)}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Monthly obligation
                        </span>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Total Outstanding
                        </span>
                        <span className="wt-display text-sm sm:text-base font-extrabold text-foreground mt-0.5 block tabular-nums">
                          <Metric id="total_debt" value={wealthMetrics.totalDebt} />
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Active balance
                        </span>
                      </div>

                      {(borrowedInPeriod > 0 || recoveredInPeriod > 0) && (
                        <>
                          <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Borrowed
                            </span>
                            <span className="wt-display text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block tabular-nums">
                              +{money(displayBorrowed)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              In this period
                            </span>
                          </div>

                          <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Recovered
                            </span>
                            <span className="wt-display text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                              +{money(recoveredInPeriod)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              Advances returned
                            </span>
                          </div>
                        </>
                      )}

                      {lentInPeriod > 0 && !(borrowedInPeriod > 0 || recoveredInPeriod > 0) && (
                        <div className="col-span-2 rounded-xl border border-border/70 bg-muted/20 p-2.5 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Money Lent
                            </span>
                            <span className="text-[10px] text-muted-foreground">Advances given to peers</span>
                          </div>
                          <span className="wt-display text-sm sm:text-base font-extrabold text-violet-600 dark:text-violet-400 tabular-nums">
                            <Metric id="lent_out" value={lentInPeriod} />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Active Loans list if available */}
                    {unified.loans && unified.loans.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Active Loans ({unified.loans.length})
                        </p>
                        {unified.loans.map((loan) => {
                          const derived = getDerivedLoanState(loan, unified.entries, sharedPeriod);
                          return (
                            <div
                              key={loan.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 p-2 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{loan.name}</p>
                                <p className="text-[10px] text-muted-foreground">EMI: {money(loan.emi)}/mo</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                  <Metric id={`loan_outstanding:${loan.id}`} value={derived.currentOutstanding} />
                                </p>
                                <span className="text-[10px] text-muted-foreground">Outstanding</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-auto shrink-0 pt-2.5 border-t border-border/60">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs text-muted-foreground flex items-center justify-between">
                  <span className="font-medium">Monthly Liability Load</span>
                  <span
                    className={`font-bold tabular-nums ${
                      loansSummary.totalMonthlyEmi > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {loansSummary.totalMonthlyEmi > 0
                      ? `${money(loansSummary.totalMonthlyEmi)}/mo`
                      : "Zero (Debt Free)"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded Large Chart Modal Popup */}
      {expandedChart && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in-50 duration-200">
          <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto wt-scrollbar rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h3 className="wt-display text-lg font-bold text-foreground">
                  {expandedChart === "velocity"
                    ? "Cash Flow Velocity Breakdown (Expanded Analytics)"
                    : "Cumulative Net Cash Flow Trend (Expanded Analytics)"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  High-resolution chronological inspection across all recorded cash activity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedChart(null)}
                className="grid size-9 place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pt-2">
              {expandedChart === "velocity" ? (
                <CashFlowVelocityChart
                  transactions={data.transactions}
                  dateRange={dateRange}
                  money={money}
                  title="Cash Flow Velocity Breakdown"
                  className="border-0 shadow-none p-0"
                />
              ) : (
                <NetWealthLineChart
                  transactions={data.transactions}
                  dateRange={dateRange}
                  money={money}
                  title="Cumulative Net Cash Flow Trend"
                  className="border-0 shadow-none p-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

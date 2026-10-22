import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Landmark,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, matchesDateRange, type DateRangeValue } from "@/components/shared/DateRangeFilter";
import { EmptyInline } from "@/components/shared/EmptyInline";
import { PageHeading } from "@/components/shared/PageHeading";
import { TransactionRow } from "@/components/shared/TransactionRow";
import {
  getAccountBalance,
  getCategorySpend,
  getInvestmentSummary,
  type Section,
  type Transaction,
  type WealthState,
} from "@/lib/wealthtrack";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function Dashboard({
  data,
  money,
  dateRange,
  setDateRange,
  onAdd,
  onTransferClick,
  onNavigate,
  onSelectTransaction,
  onCategory,
}: {
  data: WealthState;
  money: (amount: number) => string;
  dateRange: DateRangeValue;
  setDateRange: (range: DateRangeValue) => void;
  onAdd: (preset?: Partial<Transaction>) => void;
  onTransferClick?: () => void;
  onNavigate: (section: Section) => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onCategory: (id: string) => void;
}) {
  const [dashboardPriority, setDashboardPriority] = useState<string>("All");
  const [hoveredTrendKey, setHoveredTrendKey] = useState<string | null>(null);

  // Filter transactions according to the unified date range
  const periodTransactions = useMemo(() => {
    return data.transactions.filter((t) => matchesDateRange(t.date, dateRange));
  }, [data.transactions, dateRange]);

  const monthInflowTransactions = useMemo(
    () =>
      periodTransactions.filter(
        (t) =>
          t.type === "Income" ||
          t.type === "Borrow / Loan Taken" ||
          t.type === "Debt Recovery" ||
          t.type === "Refund"
      ),
    [periodTransactions]
  );

  const monthOutflowTransactions = useMemo(
    () =>
      periodTransactions.filter(
        (t) =>
          t.type === "Expense" ||
          t.type === "EMI / Loan Payment" ||
          t.type === "Lend / Loan Given"
      ),
    [periodTransactions]
  );

  const monthIncome = useMemo(
    () => monthInflowTransactions.reduce((sum, item) => sum + item.amount, 0),
    [monthInflowTransactions]
  );

  const monthExpenses = useMemo(
    () => monthOutflowTransactions.reduce((sum, item) => sum + item.amount, 0),
    [monthOutflowTransactions]
  );

  const monthEmiPaid = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.type === "EMI / Loan Payment")
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions]
  );

  const netCashFlow = monthIncome - monthExpenses;
  const savingsRate = monthIncome > 0 ? Math.round((netCashFlow / monthIncome) * 100) : 0;

  const investmentSummary = useMemo(() => {
    return getInvestmentSummary(data.transactions);
  }, [data.transactions]);

  const holdingsValuation = useMemo(() => {
    return (data.investments ?? []).reduce((sum, h) => sum + (h.currentAmount || 0), 0);
  }, [data.investments]);

  const effectiveInvestmentsVal = holdingsValuation > 0
    ? holdingsValuation
    : (investmentSummary.currentValue ?? investmentSummary.contributions);

  const activeAccounts = useMemo(() => data.accounts.filter((item) => !item.archived), [data.accounts]);
  const totalBalance = useMemo(
    () =>
      activeAccounts.reduce(
        (sum, account) => sum + getAccountBalance(account, data.transactions),
        0
      ),
    [activeAccounts, data.transactions]
  );

  const liquidAssets = activeAccounts
    .filter((a) => a.kind !== "Credit card")
    .reduce((sum, a) => sum + Math.max(0, getAccountBalance(a, data.transactions)), 0);

  const creditLiabilities = activeAccounts
    .filter((a) => a.kind === "Credit card")
    .reduce((sum, a) => sum + Math.abs(getAccountBalance(a, data.transactions)), 0);

  const loansOutstanding = useMemo(() => {
    return (data.loans ?? []).reduce((sum, l) => sum + (l.currentOutstanding || 0), 0);
  }, [data.loans]);

  const totalLiabilities = creditLiabilities + loansOutstanding;

  const totalAssetsSum = Math.max(1, liquidAssets + effectiveInvestmentsVal + totalLiabilities);
  const liquidPct = Math.round((liquidAssets / totalAssetsSum) * 100);
  const invPct = Math.round((effectiveInvestmentsVal / totalAssetsSum) * 100);
  const liabilityPct = Math.round((totalLiabilities / totalAssetsSum) * 100);

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

  // Top spending categories in the period
  const topCategories = useMemo(() => {
    return data.categories
      .filter((item) => item.kind === "Expense" && !item.archived)
      .map((cat) => ({
        category: cat,
        amount: Math.max(0, getCategorySpend(cat.id, periodTransactions)),
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [data.categories, periodTransactions]);

  const maxCategorySpend = Math.max(1, ...topCategories.map((c) => c.amount));

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return [...data.transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
  }, [data.transactions]);

  const filteredRecent = recentTransactions.filter((tx) => {
    if (dashboardPriority !== "All" && tx.need !== dashboardPriority) return false;
    return true;
  });

  // Upcoming auto-debits
  const upcomingRecurring = useMemo(() => {
    return data.recurring
      .filter((item) => item.enabled)
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
      .slice(0, 4);
  }, [data.recurring]);

  const totalMonthlyRecurringCommitments = useMemo(() => {
    return data.recurring
      .filter((item) => item.enabled && item.type === "Expense")
      .reduce((sum, item) => sum + item.amount, 0);
  }, [data.recurring]);

  const activeTrend = useMemo(() => {
    if (hoveredTrendKey) {
      return monthlyTrends.find((m) => m.key === hoveredTrendKey) ?? null;
    }
    return monthlyTrends[monthlyTrends.length - 1] ?? null;
  }, [monthlyTrends, hoveredTrendKey]);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Overview"
        description="Real-time portfolio net worth, cash flow velocity, and recent activity."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold"
              onClick={() => (onTransferClick ? onTransferClick() : onAdd({ type: "Transfer" }))}
            >
              <ArrowLeftRight size={14} /> Transfer
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
              onClick={() => onAdd()}
            >
              <Plus size={15} /> Add Transaction
            </Button>
          </div>
        }
      />

      {/* Ultra-Premium Hero Net Worth Card with Gradient Accent & Asset Distribution */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-emerald-500/[0.04] p-6 sm:p-7 wt-shadow">
        {/* Subtle decorative ambient glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 -bottom-12 size-36 rounded-full bg-primary/10 blur-2xl" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Portfolio Balance
              </span>
              {savingsRate > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <Sparkles size={10} /> +{savingsRate}% Saved
                </span>
              )}
            </div>

            <p className="wt-display mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight tabular-nums">
              {money(totalBalance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total wealth aggregated across {activeAccounts.length} financial accounts
            </p>
          </div>

          {/* Interactive Sub-KPI Cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 border-t border-border/60 pt-5 lg:border-t-0 lg:border-l lg:pl-7 lg:pt-0">
            <div
              className="group rounded-2xl border border-border/70 bg-card/80 p-3.5 hover:border-emerald-500/40 hover:shadow-xs transition-all cursor-pointer"
              onClick={() => onNavigate("Accounts")}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Liquid Cash
                </span>
                <span className="grid size-6 place-items-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <Wallet size={12} />
                </span>
              </div>
              <p className="mt-1.5 text-sm sm:text-base font-extrabold text-foreground tabular-nums truncate">
                {money(liquidAssets)}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                {liquidPct}% of portfolio
              </span>
            </div>

            <div
              className="group rounded-2xl border border-border/70 bg-card/80 p-3.5 hover:border-violet-500/40 hover:shadow-xs transition-all cursor-pointer"
              onClick={() => onNavigate("Investments")}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Investments
                </span>
                <span className="grid size-6 place-items-center rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                  <TrendingUp size={12} />
                </span>
              </div>
              <p className="mt-1.5 text-sm sm:text-base font-extrabold text-foreground tabular-nums truncate">
                {money(effectiveInvestmentsVal)}
              </p>
              <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium block mt-0.5">
                {invPct}% of portfolio
              </span>
            </div>

            <div
              className="group rounded-2xl border border-border/70 bg-card/80 p-3.5 hover:border-rose-500/40 hover:shadow-xs transition-all cursor-pointer"
              onClick={() => onNavigate("Loans")}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Liabilities & Debt
                </span>
                <span className="grid size-6 place-items-center rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                  <Landmark size={12} />
                </span>
              </div>
              <p className="mt-1.5 text-sm sm:text-base font-extrabold text-foreground tabular-nums truncate">
                {money(totalLiabilities)}
              </p>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium block mt-0.5">
                {(data.loans ?? []).length} loans · {liabilityPct}% of total
              </span>
            </div>
          </div>
        </div>

        {/* Proportional Asset Breakdown Bar */}
        <div className="mt-6 border-t border-border/60 pt-4 relative z-10">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted flex shadow-inner">
            <div
              style={{ width: `${liquidPct}%` }}
              className="h-full bg-emerald-500 transition-all"
              title={`Liquid Cash: ${liquidPct}%`}
            />
            <div
              style={{ width: `${invPct}%` }}
              className="h-full bg-violet-500 transition-all"
              title={`Investments: ${invPct}%`}
            />
            <div
              style={{ width: `${liabilityPct}%` }}
              className="h-full bg-rose-500 transition-all"
              title={`Liabilities: ${liabilityPct}%`}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> Liquid Cash ({liquidPct}%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-violet-500" /> Investments ({invPct}%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-500" /> Liabilities ({liabilityPct}%)
              </span>
            </div>
            <span className="font-semibold text-foreground">
              Net Wealth: {money(totalBalance + effectiveInvestmentsVal - totalLiabilities)}
            </span>
          </div>
        </div>
      </div>

      {/* Timeframe Filter Bar */}
      <div className="flex items-center justify-between">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Cash Flow Performance Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-5 wt-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Period Inflows
            </span>
            <span className="grid size-7 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft size={15} />
            </span>
          </div>
          <p className="wt-display mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{money(monthIncome)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {monthInflowTransactions.length} deposit{monthInflowTransactions.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 wt-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Period Outflows
            </span>
            <span className="grid size-7 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ArrowUpRight size={15} />
            </span>
          </div>
          <p className="wt-display mt-2 text-2xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            −{money(monthExpenses)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {monthOutflowTransactions.length} payment{monthOutflowTransactions.length !== 1 ? "s" : ""}
            {monthEmiPaid > 0 ? ` (incl. ${money(monthEmiPaid)} in EMIs)` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 wt-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Savings
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              {savingsRate}% Saved
            </span>
          </div>
          <p className="wt-display mt-2 text-2xl font-extrabold text-foreground tabular-nums">
            {money(netCashFlow)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {netCashFlow >= 0 ? "Surplus capital retained" : "Net spending deficit"}
          </p>
        </div>
      </div>

      {/* Two Column Layout: Cash Flow Velocity Chart & Top Spending Categories */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Interactive 6-Month Cash Flow Velocity Chart */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 wt-shadow flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="wt-display text-base font-bold text-foreground">
                  Cash Flow Velocity
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  6-month inflow vs outflow with interactive inspection
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <span className="size-2.5 rounded-full bg-emerald-500 shadow-xs" /> Inflows
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <span className="size-2.5 rounded-full bg-rose-500 shadow-xs" /> Outflows
                </span>
              </div>
            </div>

            {/* Interactive Live Inspection Banner */}
            <div className="mt-3.5 flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3.5 py-2 text-xs">
              <span className="font-bold text-foreground">
                {activeTrend ? `${activeTrend.label} 2026` : "Monthly Velocity"}
              </span>
              <div className="flex items-center gap-3 tabular-nums text-xs">
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  +{money(activeTrend ? activeTrend.income : 0)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400">
                  −{money(activeTrend ? activeTrend.expense : 0)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span
                  className={`font-extrabold ${
                    (activeTrend ? activeTrend.income - activeTrend.expense : 0) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  Net: {money(activeTrend ? activeTrend.income - activeTrend.expense : 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Premium Visual Bar Chart with Track Background & Hover Interaction */}
          <div className="mt-5 flex h-48 items-end justify-between gap-2.5 pt-4 border-b border-border/80 pb-2">
            {monthlyTrends.map((m) => {
              const isHovered = hoveredTrendKey === m.key;
              const isLatest = m.key === monthlyTrends[monthlyTrends.length - 1]?.key;
              const incHeight = Math.max(8, Math.round((m.income / maxTrendValue) * 144));
              const expHeight = Math.max(8, Math.round((m.expense / maxTrendValue) * 144));

              return (
                <div
                  key={m.key}
                  onMouseEnter={() => setHoveredTrendKey(m.key)}
                  onMouseLeave={() => setHoveredTrendKey(null)}
                  className={`flex flex-1 flex-col items-center gap-2 h-full justify-end rounded-xl p-1.5 transition-all cursor-pointer ${
                    isHovered
                      ? "bg-muted/60 ring-1 ring-primary/30"
                      : isLatest && !hoveredTrendKey
                      ? "bg-muted/20"
                      : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex w-full items-end justify-center gap-1.5 h-[144px]">
                    {/* Inflow Bar */}
                    <div className="h-full w-4 flex items-end justify-center">
                      <div
                        style={{ height: `${incHeight}px` }}
                        className={`w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-xs transition-all duration-200 ${
                          isHovered ? "brightness-110 scale-y-105" : ""
                        }`}
                        title={`${m.label} Inflow: ${money(m.income)}`}
                      />
                    </div>

                    {/* Outflow Bar */}
                    <div className="h-full w-4 flex items-end justify-center">
                      <div
                        style={{ height: `${expHeight}px` }}
                        className={`w-full rounded-t-md bg-gradient-to-t from-rose-600 to-rose-400 shadow-xs transition-all duration-200 ${
                          isHovered ? "brightness-110 scale-y-105" : ""
                        }`}
                        title={`${m.label} Outflow: ${money(m.expense)}`}
                      />
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold transition-colors ${
                      isHovered || (isLatest && !hoveredTrendKey)
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Spending Categories Matrix */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 wt-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="wt-display text-base font-bold text-foreground">
                  Top Spending Categories
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ranked expenditure for this timeframe
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-primary hover:underline"
                onClick={() => onNavigate("Reports")}
              >
                All Reports →
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3.5">
            {topCategories.length ? (
              topCategories.map(({ category, amount }) => {
                const pct = monthExpenses > 0 ? Math.round((amount / monthExpenses) * 100) : 0;
                return (
                  <button
                    key={category.id}
                    type="button"
                    className="w-full text-left group cursor-pointer"
                    onClick={() => onCategory(category.id)}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-7 place-items-center rounded-lg bg-muted/60 text-sm">
                          {category.icon || "🏷️"}
                        </span>
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {category.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-foreground tabular-nums">
                          {money(amount)}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1.5 font-medium">
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, (amount / maxCategorySpend) * 100)}%` }}
                      />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 p-6 text-center space-y-2">
                <span className="mx-auto grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck size={20} />
                </span>
                <p className="text-xs font-bold text-foreground">Zero Expense Outflow</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  No expenditure recorded for this timeframe. Your capital is 100% preserved.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate("Reports")}
                  className="mt-2 text-xs font-semibold h-7 px-3"
                >
                  View Full Reports
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Upcoming Recurring & Recent Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* Upcoming Automated Recurring Schedules (No Empty Gaps) */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 wt-shadow flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <h3 className="wt-display text-base font-bold text-foreground">
                  Upcoming Recurring
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Zap size={11} /> Auto
                </span>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-primary hover:underline"
                onClick={() => onNavigate("Recurring")}
              >
                Manage →
              </button>
            </div>

            <div className="space-y-2.5">
              {upcomingRecurring.length ? (
                upcomingRecurring.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/15 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary text-sm">
                        <CalendarDays size={16} />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Due {formatDate(item.nextDate)} · {item.frequency}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-bold tabular-nums block ${
                          item.type === "Income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {item.type === "Income" ? "+" : "−"}
                        {money(item.amount)}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Auto-records
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 p-5 text-center space-y-1.5">
                  <CalendarDays size={18} className="mx-auto text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">No Upcoming Recurring Bills</p>
                  <p className="text-[11px] text-muted-foreground">All schedules are current</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Commitment Summary Bar (Fills gap and balances card) */}
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Total Monthly Commitment</span>
            <span className="font-extrabold text-foreground tabular-nums">
              {money(totalMonthlyRecurringCommitments)}/mo
            </span>
          </div>
        </div>

        {/* Recent Financial Movements Table */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 wt-shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <h3 className="wt-display text-base font-bold text-foreground">
                Recent Transactions
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest financial movements across all accounts
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                className="wt-field h-8 w-28 text-xs py-0"
                value={dashboardPriority}
                onChange={(e) => setDashboardPriority(e.target.value)}
                aria-label="Filter priority"
              >
                <option value="All">All</option>
                <option value="Need">Need</option>
                <option value="Want">Want</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold text-primary hover:bg-primary/5"
                onClick={() => onNavigate("Transactions")}
              >
                View Ledger →
              </Button>
            </div>
          </div>

          <div className="space-y-1 divide-y divide-border/60">
            {filteredRecent.length ? (
              filteredRecent.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  category={data.categories.find((c) => c.id === tx.categoryId)}
                  account={data.accounts.find((a) => a.id === tx.accountId)}
                  money={money}
                  onClick={() => onSelectTransaction(tx)}
                />
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No recent transactions found.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

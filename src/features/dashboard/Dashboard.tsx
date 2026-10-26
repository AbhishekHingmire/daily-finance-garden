import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, matchesDateRange, type DateRangeValue } from "@/components/shared/DateRangeFilter";
import { CashFlowVelocityChart } from "@/components/shared/CashFlowVelocityChart";
import { EmptyInline } from "@/components/shared/EmptyInline";
import { PageHeading } from "@/components/shared/PageHeading";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { SalaryCountdownCard } from "./SalaryCountdownCard";
import {
  getAccountBalance,
  getAllAccountBalances,
  getCategorySpend,
  getInvestmentSummary,
  getLoansSummary,
  type CustomFund,
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
  onUpdateSalary,
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
  onUpdateSalary?: (payload: any) => void;
}) {
  const [dismissedGoals, setDismissedGoals] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("wt_dismissed_goal_banners");
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const handleDismissGoal = (fundId: string) => {
    setDismissedGoals((prev) => {
      const next = prev.includes(fundId) ? prev : [...prev, fundId];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("wt_dismissed_goal_banners", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

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

  const monthEmiTransactions = useMemo(
    () => periodTransactions.filter((t) => t.type === "EMI / Loan Payment"),
    [periodTransactions]
  );

  const monthEmiPaid = useMemo(
    () => monthEmiTransactions.reduce((sum, t) => sum + t.amount, 0),
    [monthEmiTransactions]
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

  const accountBalances = useMemo(
    () => getAllAccountBalances(data.accounts, data.transactions),
    [data.accounts, data.transactions]
  );

  const { totalBalance, liquidAssets, creditLiabilities, assetAccounts, liabilityAccounts } = useMemo(() => {
    let balance = 0;
    let liquid = 0;
    let credit = 0;
    const assetsList: typeof activeAccounts = [];
    const liabilitiesList: typeof activeAccounts = [];
    for (const a of activeAccounts) {
      const b = accountBalances.get(a.id) ?? (a.openingBalance || 0);
      balance += b;
      if (a.kind === "Credit card") {
        liabilitiesList.push(a);
        credit += Math.abs(b);
      } else {
        assetsList.push(a);
        liquid += Math.max(0, b);
      }
    }
    return {
      totalBalance: balance,
      liquidAssets: liquid,
      creditLiabilities: credit,
      assetAccounts: assetsList,
      liabilityAccounts: liabilitiesList,
    };
  }, [activeAccounts, accountBalances]);

  const activeLoans = useMemo(() => data.loans ?? [], [data.loans]);
  const loansSummary = useMemo(() => getLoansSummary(activeLoans), [activeLoans]);
  const loansOutstanding = loansSummary.totalOutstanding;

  const totalLiabilities = creditLiabilities + loansOutstanding;

  const totalAssetsSum = Math.max(1, liquidAssets + effectiveInvestmentsVal + totalLiabilities);
  const liquidPct = Math.round((liquidAssets / totalAssetsSum) * 100);
  const invPct = Math.round((effectiveInvestmentsVal / totalAssetsSum) * 100);
  const liabilityPct = Math.round((totalLiabilities / totalAssetsSum) * 100);

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
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.transactions]);

  // Upcoming auto-debits
  const upcomingRecurring = useMemo(() => {
    return data.recurring
      .filter((item) => item.enabled)
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  }, [data.recurring]);

  const totalMonthlyRecurringCommitments = useMemo(() => {
    return data.recurring
      .filter((item) => item.enabled && item.type === "Expense")
      .reduce((sum, item) => sum + item.amount, 0);
  }, [data.recurring]);

  // 50/30/20 Need vs Want breakdown
  const needTotal = useMemo(() => {
    return monthOutflowTransactions
      .filter((t) => t.need === "Need")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthOutflowTransactions]);

  const wantTotal = useMemo(() => {
    return monthOutflowTransactions
      .filter((t) => t.need === "Want")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthOutflowTransactions]);

  const needPct = monthExpenses > 0 ? Math.round((needTotal / monthExpenses) * 100) : 0;
  const wantPct = monthExpenses > 0 ? Math.round((wantTotal / monthExpenses) * 100) : 0;

  // Runway in months
  const runwayMonths = useMemo(() => {
    const monthlyBurn = Math.max(1000, monthExpenses);
    return Math.round((liquidAssets / monthlyBurn) * 10) / 10;
  }, [liquidAssets, monthExpenses]);

  // Primary Outflow Entity / Top Merchant
  const topMerchant = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthOutflowTransactions) {
      const name = t.merchant?.trim() || t.description?.trim() || "General Outflow";
      map.set(name, (map.get(name) || 0) + t.amount);
    }
    let bestName = "";
    let bestAmt = 0;
    for (const [name, amt] of map.entries()) {
      if (amt > bestAmt) {
        bestAmt = amt;
        bestName = name;
      }
    }
    if (bestAmt === 0) return null;
    return {
      name: bestName,
      amount: bestAmt,
      pct: monthExpenses > 0 ? Math.round((bestAmt / monthExpenses) * 100) : 0,
    };
  }, [monthOutflowTransactions, monthExpenses]);

  // Projected Month-End Cash Surplus
  const projectedSurplus = useMemo(() => {
    const pendingInflow = data.recurring
      .filter((r) => r.enabled && r.type === "Income")
      .reduce((sum, r) => sum + r.amount, 0);
    const pendingOutflow = totalMonthlyRecurringCommitments;
    return netCashFlow + (pendingInflow - pendingOutflow);
  }, [netCashFlow, data.recurring, totalMonthlyRecurringCommitments]);

  // Fulfilled goals celebration banner
  const fulfilledFunds = useMemo(() => {
    return (data.funds ?? []).filter(
      (f) => f.targetAmount > 0 && f.currentAmount >= f.targetAmount && !dismissedGoals.includes(f.id)
    );
  }, [data.funds, dismissedGoals]);

  // Active Sinking Funds for Monthly Allocation Tracker
  const activeFunds = useMemo(() => {
    return (data.funds ?? []).filter((f) => f.type !== "Emergency");
  }, [data.funds]);

  // Total committed category budgets vs actual spending
  const totalCommittedBudget = useMemo(() => {
    const sumLimits = data.categories.reduce((acc, c) => acc + (c.monthlyLimit || 0), 0);
    return sumLimits > 0 ? sumLimits : 45000;
  }, [data.categories]);

  const budgetUsedPct = totalCommittedBudget > 0 ? Math.min(100, Math.round((monthExpenses / totalCommittedBudget) * 100)) : 0;
  const budgetDifference = totalCommittedBudget - monthExpenses;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Dashboard"
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

      {/* Fulfilled Sinking Funds & Savings Celebration Banners */}
      {fulfilledFunds.map((fund) => (
        <div
          key={fund.id}
          className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-card p-4 wt-shadow"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/20 text-xl shrink-0">
              {fund.icon || "🎉"}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300">
                  Goal 100% Achieved
                </span>
                <span className="text-xs font-bold text-foreground">{fund.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target of <strong className="text-foreground">{money(fund.targetAmount)}</strong> fulfilled! Ready for this milestone.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate("Fund Planner")}
              className="h-8 text-xs font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
            >
              View Goal →
            </Button>
            <button
              type="button"
              onClick={() => handleDismissGoal(fund.id)}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground text-xs transition-colors"
              aria-label="Dismiss alert"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      {/* Timeframe Filter Bar */}
      <div className="flex items-center justify-between">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Consolidated Financial Snapshot: Immediate Answer to "How much money do I have?" */}
      <div className="space-y-3 sm:space-y-4">
        {/* Available Liquid Balance Hero Strip */}
        <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 p-4 sm:p-5 wt-shadow hover:border-border transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Available Liquid Cash
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Across {assetAccounts.length} active accounts
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="wt-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight tabular-nums">
                  {money(liquidAssets)}
                </span>
                <span className="text-xs text-muted-foreground sm:hidden">
                  · {assetAccounts.length} accounts
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Instantly accessible funds in Bank, Cash & Wallets
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-t border-border/60 pt-3 sm:border-t-0 sm:pt-0">
              <div className="text-left sm:text-right text-xs">
                <span className="text-muted-foreground block text-[11px]">Consolidated Net Worth</span>
                <span className="font-extrabold text-foreground tabular-nums">
                  {money(liquidAssets + effectiveInvestmentsVal - totalLiabilities)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold"
                onClick={() => onNavigate("Accounts")}
              >
                <Wallet size={13} className="mr-1.5" /> View Accounts
              </Button>
            </div>
          </div>
        </div>

        {/* Period Cash Flow Movement Header */}
        <div className="flex items-center justify-between px-0.5 pt-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Period Cash Flow Movement
          </h3>
          <span className="text-[11px] text-muted-foreground font-medium">
            Incoming & Outgoing Cash Activity
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Period Inflows */}
          <div className="rounded-xl sm:rounded-2xl border border-border/70 bg-card p-2.5 sm:p-5 wt-shadow hover:border-border transition-all">
            <div className="flex items-center justify-between sm:mb-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cash Inflows (Incoming)
              </span>
              <span className="hidden sm:grid size-7 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft size={15} />
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 sm:flex sm:flex-col sm:items-start">
              <p className="text-[11px] sm:text-xs text-muted-foreground sm:order-2 sm:mt-1 truncate">
                {monthInflowTransactions.length} deposit{monthInflowTransactions.length !== 1 ? "s" : ""} · salary & income
              </p>
              <p className="wt-display text-base sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap shrink-0 sm:order-1">
                +{money(monthIncome)}
              </p>
            </div>
          </div>

          {/* Period Outflows */}
          <div className="rounded-xl sm:rounded-2xl border border-border/70 bg-card p-2.5 sm:p-5 wt-shadow hover:border-border transition-all">
            <div className="flex items-center justify-between sm:mb-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cash Outflows (Outgoing)
              </span>
              <span className="hidden sm:grid size-7 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ArrowUpRight size={15} />
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 sm:flex sm:flex-col sm:items-start">
              <p className="text-[11px] sm:text-xs text-muted-foreground sm:order-2 sm:mt-1 truncate">
                {monthOutflowTransactions.length} payment{monthOutflowTransactions.length !== 1 ? "s" : ""}
                {monthEmiPaid > 0 ? ` (incl. ${money(monthEmiPaid)} in EMIs)` : ""}
              </p>
              <p className="wt-display text-base sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap shrink-0 sm:order-1">
                −{money(monthExpenses)}
              </p>
            </div>
          </div>

          {/* EMIs & Debt Servicing */}
          <div className="rounded-xl sm:rounded-2xl border border-border/70 bg-card p-2.5 sm:p-5 wt-shadow hover:border-border transition-all">
            <div className="flex items-center justify-between sm:mb-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                EMIs & Debt Servicing
              </span>
              <span className="hidden sm:grid size-7 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Landmark size={15} />
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 sm:flex sm:flex-col sm:items-start">
              <p className="text-[11px] sm:text-xs text-muted-foreground sm:order-2 sm:mt-1 truncate">
                {monthEmiTransactions.length > 0
                  ? `${monthEmiTransactions.length} paid${loansSummary.totalMonthlyEmi > 0 ? ` · Commitment: ${money(loansSummary.totalMonthlyEmi)}/mo` : ""}`
                  : activeLoans.length > 0
                  ? `${activeLoans.length} active loans · ${money(loansSummary.totalMonthlyEmi)}/mo`
                  : "Zero debt obligations"}
              </p>
              <p className={`wt-display text-base sm:text-2xl font-extrabold tabular-nums whitespace-nowrap shrink-0 sm:order-1 ${
                monthEmiPaid > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              }`}>
                {monthEmiPaid > 0 ? `−${money(monthEmiPaid)}` : money(0)}
              </p>
            </div>
          </div>

          {/* Net Savings */}
          <div className="rounded-xl sm:rounded-2xl border border-border/70 bg-card p-2.5 sm:p-5 wt-shadow hover:border-border transition-all">
            <div className="flex items-center justify-between sm:mb-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Net Savings Retained
              </span>
              <span className="hidden sm:grid size-7 place-items-center rounded-xl bg-primary/10 text-primary">
                <Sparkles size={15} />
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 sm:flex sm:flex-col sm:items-start">
              <p className="text-[11px] sm:text-xs text-muted-foreground sm:order-2 sm:mt-1 truncate">
                {savingsRate}% saved · {netCashFlow >= 0 ? "surplus cash" : "cash deficit"}
              </p>
              <p className={`wt-display text-base sm:text-2xl font-extrabold tabular-nums whitespace-nowrap shrink-0 sm:order-1 ${
                netCashFlow >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-400"
              }`}>
                {money(netCashFlow)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Countdown & Inflow Tracker (Payroll & Payday section moved right after Cash Flow Movement) */}
      <SalaryCountdownCard
        data={data}
        money={money}
        onUpdateSalary={onUpdateSalary}
      />

      {/* Two Column Layout: Cash Flow Velocity Chart & Top Spending Categories */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <CashFlowVelocityChart
          transactions={data.transactions}
          dateRange={dateRange}
          money={money}
          onNavigateToReports={() => onNavigate("Reports")}
        />

        {/* Top Spending Categories Matrix */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 wt-shadow hover:border-border transition-all">
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

            {/* Symmetrical Top Banner Matching Cash Flow Chart */}
            <div className="mt-3.5 flex items-center justify-between rounded-xl border border-border/60 bg-muted/25 px-3.5 py-2 text-xs">
              <span className="font-bold text-foreground">
                {topCategories.length ? `${topCategories.length} Categories Ranked` : "Spending Concentration"}
              </span>
              <span className="font-extrabold text-foreground tabular-nums">
                Total: {money(monthExpenses)}
              </span>
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

          {/* Bottom Commitment vs Actual Spending Progress Footer */}
          <div className="mt-5 pt-3.5 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-foreground">Total Budget Commitment</span>
                <span className="text-[11px] block mt-0.5">
                  {monthExpenses <= totalCommittedBudget ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✨ {money(budgetDifference)} under committed budget · Progressing safely
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      ⚠️ {money(Math.abs(budgetDifference))} over committed budget
                    </span>
                  )}
                </span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-foreground tabular-nums">
                  {money(monthExpenses)} <span className="text-muted-foreground font-normal">/ {money(totalCommittedBudget)}</span>
                </span>
                <span className="text-[10px] font-bold text-muted-foreground block">
                  {budgetUsedPct}% Limit Used
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                style={{ width: `${Math.min(100, budgetUsedPct)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetUsedPct <= 85 ? "bg-emerald-500" : budgetUsedPct <= 100 ? "bg-amber-500" : "bg-rose-500"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Sinking Funds & Recurring Left, Recent Activity Feed Right */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6 flex flex-col">
          {/* Monthly Sinking Funds & Savings Allocations Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 wt-shadow flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <h3 className="wt-display text-base font-bold text-foreground">
                  Sinking Funds & Savings
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <PiggyBank size={11} /> Goals
                </span>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-primary hover:underline"
                onClick={() => onNavigate("Fund Planner")}
              >
                Fund Planner →
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 mb-3.5">
              Monthly capital allocations & milestone envelopes
            </p>

            <div className="space-y-3">
              {activeFunds.length ? (
                activeFunds.map((fund) => {
                  const pct = fund.targetAmount > 0 ? Math.min(100, Math.round((fund.currentAmount / fund.targetAmount) * 100)) : 0;
                  const isFulfilled = fund.targetAmount > 0 && fund.currentAmount >= fund.targetAmount;
                  const isSkippedThisMonth = (fund.skippedMonths ?? []).includes("2026-10");

                  return (
                    <div
                      key={fund.id}
                      onClick={() => onNavigate("Fund Planner")}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                        isFulfilled
                          ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                          : isSkippedThisMonth
                          ? "border-border/60 bg-muted/20 opacity-80 hover:opacity-100"
                          : "border-border/60 bg-muted/15 hover:bg-muted/30 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 place-items-center rounded-lg bg-card text-base shadow-2xs group-hover:scale-105 transition-transform">
                            {fund.icon || "🎯"}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                              {fund.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {money(fund.currentAmount)} / {money(fund.targetAmount)} ({pct}%)
                            </p>
                          </div>
                        </div>

                        {/* Status Label (Clean - actions managed in Fund Planner) */}
                        <div className="text-right">
                          {isFulfilled ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 size={11} /> Ready for this!
                            </span>
                          ) : isSkippedThisMonth ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Skipped Oct
                            </span>
                          ) : fund.monthlyContribution ? (
                            <span className="text-[11px] font-bold text-foreground tabular-nums">
                              {money(fund.monthlyContribution)}/mo
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-muted-foreground">
                              Target Goal
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Miniature Progress Bar */}
                      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFulfilled ? "bg-emerald-500" : "bg-primary"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 p-5 text-center space-y-1.5">
                  <PiggyBank size={18} className="mx-auto text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">No Sinking Funds Configured</p>
                  <p className="text-[11px] text-muted-foreground">Set up dedicated savings goals in Fund Planner</p>
                </div>
              )}
            </div>

            {/* Bottom Total Allocation summary */}
            <div className="mt-auto pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">Total Monthly Savings Target</span>
              <span className="font-extrabold text-foreground tabular-nums">
                {money(activeFunds.reduce((sum, f) => sum + (f.monthlyContribution || 0), 0))}/mo
              </span>
            </div>
          </div>

          {/* Upcoming Automated Recurring Schedules: shows all possible in allocated height */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 wt-shadow flex flex-col">
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
            <p className="text-xs text-muted-foreground mt-2 mb-3.5">
              Automated bills and payroll schedules
            </p>

            <div className="space-y-2.5">
              {upcomingRecurring.length ? (
                upcomingRecurring.slice(0, 3).map((item) => (
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

            {/* Bottom Commitment Summary Bar anchored cleanly at bottom */}
            <div className="mt-auto pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">Total Monthly Commitment</span>
              <span className="font-extrabold text-foreground tabular-nums">
                {money(totalMonthlyRecurringCommitments)}/mo
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Ledger Table + Informative Radar below it */}
        <div className="space-y-6 flex flex-col">
          {/* Recent Financial Movements Table */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 wt-shadow">
            <div className="mb-4 flex items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <h3 className="wt-display text-base font-bold text-foreground">
                  Recent Transactions
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Latest financial movements across all accounts
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold text-primary hover:bg-primary/5"
                onClick={() => onNavigate("Transactions")}
              >
                View Ledger →
              </Button>
            </div>

            <div className="space-y-1 divide-y divide-border/60">
              {recentTransactions.length ? (
                recentTransactions.slice(0, 4).map((tx) => (
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

          {/* Informative Portfolio Health & Capital Allocation Section right below transactions */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 wt-shadow space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <h3 className="wt-display text-base font-bold text-foreground">
                  Financial Health & Capital Allocation
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Sparkles size={11} /> 50/30/20 Discipline
                </span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                Period Intelligence
              </span>
            </div>

            {/* 50/30/20 Need vs Want vs Savings Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">50/30/20 Rule Adherence</span>
                <span className="text-muted-foreground tabular-nums">
                  Needs: <strong className="text-foreground">{needPct}%</strong> · Wants: <strong className="text-foreground">{wantPct}%</strong> · Retained: <strong className="text-emerald-600 dark:text-emerald-400">{savingsRate}%</strong>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted flex shadow-inner">
                <div
                  style={{ width: `${Math.min(100, needPct)}%` }}
                  className="h-full bg-blue-500 transition-all"
                  title={`Essential Needs: ${needPct}% (Target: ≤50%)`}
                />
                <div
                  style={{ width: `${Math.min(100, wantPct)}%` }}
                  className="h-full bg-violet-500 transition-all"
                  title={`Discretionary Wants: ${wantPct}% (Target: ≤30%)`}
                />
                <div
                  style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
                  className="h-full bg-emerald-500 transition-all"
                  title={`Retained Savings: ${savingsRate}% (Target: ≥20%)`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-500" /> Essential Needs ({money(needTotal)})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-violet-500" /> Discretionary Wants ({money(wantTotal)})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" /> Surplus Retained ({money(Math.max(0, netCashFlow))})
                </span>
              </div>
            </div>

            {/* Key Insights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Liquid Runway Cushion */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Liquid Runway Buffer
                </span>
                <p className="wt-display text-base font-extrabold text-foreground tabular-nums">
                  {runwayMonths} Months
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                  {runwayMonths >= 6 ? "✓ Safe & Resilient" : "Moderate Runway"}
                </span>
              </div>

              {/* Top Outflow Entity */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Primary Outflow Entity
                </span>
                <p className="wt-display text-sm font-extrabold text-foreground truncate">
                  {topMerchant ? topMerchant.name : "Diversified"}
                </p>
                <span className="text-[10px] text-muted-foreground font-medium block tabular-nums">
                  {topMerchant ? `${money(topMerchant.amount)} (${topMerchant.pct}% of outflow)` : "No single outflow >20%"}
                </span>
              </div>

              {/* Projected Month-End Trajectory */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Month-End Cash Surplus
                </span>
                <p className={`wt-display text-base font-extrabold tabular-nums ${projectedSurplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {projectedSurplus >= 0 ? "+" : ""}{money(projectedSurplus)}
                </p>
                <span className="text-[10px] text-muted-foreground font-medium block">
                  Includes pending commitments
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

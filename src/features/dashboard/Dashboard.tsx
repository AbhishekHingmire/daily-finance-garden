import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
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
  type Account,
  type Category,
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
  onRecordRecurring?: (item: any) => void;
}) {
  const [dashboardPriority, setDashboardPriority] = useState<string>("All");

  // Filter transactions according to the unified date range
  const periodTransactions = useMemo(() => {
    return data.transactions.filter((t) => matchesDateRange(t.date, dateRange));
  }, [data.transactions, dateRange]);

  const monthIncome = useMemo(
    () =>
      periodTransactions
        .filter((item) => item.type === "Income")
        .reduce((sum, item) => sum + item.amount, 0),
    [periodTransactions]
  );

  const monthExpenses = useMemo(
    () =>
      periodTransactions
        .filter((item) => item.type === "Expense")
        .reduce((sum, item) => sum + item.amount, 0),
    [periodTransactions]
  );

  const netCashFlow = monthIncome - monthExpenses;
  const savingsRate = monthIncome > 0 ? Math.round((netCashFlow / monthIncome) * 100) : 0;

  const investmentSummary = useMemo(() => {
    return getInvestmentSummary(data.transactions);
  }, [data.transactions]);

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
      .slice(0, 5);
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
      .slice(0, 3);
  }, [data.recurring]);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="YOUR FINANCIAL OVERVIEW"
        title="Money Dashboard"
        description="A calm, unified perspective on your liquid wealth, automated bills, and cash flow."
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

      {/* Groww-style Hero Net Worth Card */}
      <div className="rounded-2xl border border-border bg-card p-6 wt-shadow">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Net Worth
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
                <Sparkles size={11} /> Healthy
              </span>
            </div>
            <p className="wt-display mt-1 text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums tracking-tight">
              {money(totalBalance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Calculated across {activeAccounts.length} connected accounts & liabilities
            </p>
          </div>

          {/* Quick Sub-Chips (Liquid vs Portfolio vs Dues) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div
              className="rounded-xl border border-border bg-muted/25 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => onNavigate("Accounts")}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Liquid Cash
              </span>
              <p className="wt-display mt-0.5 text-sm sm:text-base font-bold text-foreground tabular-nums truncate">
                {money(liquidAssets)}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                Bank & Wallets
              </span>
            </div>

            <div
              className="rounded-xl border border-border bg-muted/25 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => onNavigate("Reports")}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Investments
              </span>
              <p className="wt-display mt-0.5 text-sm sm:text-base font-bold text-foreground tabular-nums truncate">
                {money(investmentSummary.currentValue ?? investmentSummary.contributions)}
              </p>
              <span className="text-[10px] text-primary font-semibold block mt-0.5">
                Funds & Stocks
              </span>
            </div>

            <div
              className="rounded-xl border border-border bg-muted/25 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => onNavigate("Accounts")}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Liabilities
              </span>
              <p className="wt-display mt-0.5 text-sm sm:text-base font-bold text-foreground tabular-nums truncate">
                {money(creditLiabilities)}
              </p>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block mt-0.5">
                Credit Dues
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Timeframe Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 wt-shadow">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Period Filter
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cash flows and performance metrics for the selected window
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Inflow, Outflow, Net Cash Flow Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 wt-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Period Inflows
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft size={15} />
            </span>
          </div>
          <p className="wt-display mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{money(monthIncome)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {periodTransactions.filter((t) => t.type === "Income").length} income deposits
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 wt-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Period Outflows
            </span>
            <span className="grid size-7 place-items-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <ArrowUpRight size={15} />
            </span>
          </div>
          <p className="wt-display mt-2 text-2xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            −{money(monthExpenses)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {periodTransactions.filter((t) => t.type === "Expense").length} payments made
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 wt-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Net Savings
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              {savingsRate}%
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

      {/* Two Column Layout: Top Categories & Recurring Auto-Debits */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Spending Categories */}
        <div className="rounded-2xl border border-border bg-card p-6 wt-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="wt-display text-base font-bold text-foreground">
                Top Spending Categories
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-primary"
                onClick={() => onNavigate("Reports")}
              >
                View Full Breakdown →
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ranked expenditure for this timeframe
            </p>
          </div>

          <div className="mt-5 space-y-4">
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{category.icon || "🏷️"}</span>
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {category.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-foreground tabular-nums">
                          {money(amount)}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">
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
              <EmptyInline message="No expenses recorded in this period." />
            )}
          </div>
        </div>

        {/* Automated Upcoming Bills & Subscriptions */}
        <div className="rounded-2xl border border-border bg-card p-6 wt-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="wt-display text-base font-bold text-foreground">
                  Automated Recurring Bills
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Zap size={11} /> Auto-Debit
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-primary"
                onClick={() => onNavigate("Recurring")}
              >
                Manage →
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recorded automatically when due without manual intervention
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {upcomingRecurring.length ? (
              upcomingRecurring.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <CalendarDays size={16} />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Due: {formatDate(item.nextDate)} · {item.frequency}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums block">
                      −{money(item.amount)}
                    </span>
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Auto-records
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyInline message="No active recurring schedules." />
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="rounded-2xl border border-border bg-card p-6 wt-shadow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="wt-display text-base font-bold text-foreground">
              Recent Transactions
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest financial activity recorded across all accounts
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              className="wt-field h-8 w-32 text-xs py-0"
              value={dashboardPriority}
              onChange={(e) => setDashboardPriority(e.target.value)}
              aria-label="Priority Classification"
            >
              <option value="All">All Priorities</option>
              <option value="Need">Need Only</option>
              <option value="Want">Want Only</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold"
              onClick={() => onNavigate("Transactions")}
            >
              View All Transactions →
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
  );
}

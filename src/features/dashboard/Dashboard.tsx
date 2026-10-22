import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, matchesDateRange, type DateRangeValue } from "@/components/shared/DateRangeFilter";
import { EmptyInline } from "@/components/shared/EmptyInline";
import { MetricCard } from "@/components/shared/MetricCard";
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
  onRecordRecurring,
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
  onRecordRecurring: (item: any) => void;
}) {
  const [dashboardPriority, setDashboardPriority] = useState<string>("All");

  // Filter transactions according to the unified date range
  const periodTransactions = useMemo(() => {
    return data.transactions.filter((t) => matchesDateRange(t.date, dateRange));
  }, [data.transactions, dateRange]);

  const monthIncome = periodTransactions
    .filter((item) => item.type === "Income")
    .reduce((sum, item) => sum + item.amount, 0);

  const monthExpenses = periodTransactions
    .filter((item) => item.type === "Expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const investmentSummary = useMemo(() => {
    return getInvestmentSummary(data.transactions);
  }, [data.transactions]);

  const maxSpend = Math.max(
    1,
    ...data.categories
      .filter((item) => item.kind === "Expense" && !item.archived)
      .map((item) => getCategorySpend(item.id, periodTransactions))
  );

  const categories = data.categories
    .filter((item) => item.kind === "Expense" && !item.archived)
    .map((category) => ({
      category,
      amount: Math.max(0, getCategorySpend(category.id, periodTransactions)),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const recentTransactions = [...data.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  const filteredRecent = recentTransactions.filter((tx) => {
    if (dashboardPriority !== "All" && tx.need !== dashboardPriority) return false;
    return true;
  });

  // Calculate liquid balance
  const activeAccounts = data.accounts.filter((item) => !item.archived);
  const totalBalance = activeAccounts.reduce(
    (sum, account) => sum + getAccountBalance(account, data.transactions),
    0
  );

  return (
    <>
      <PageHeading
        eyebrow="YOUR FINANCIAL SNAPSHOT"
        title="Money, at a glance"
        description="A clear, calm perspective on your cash flow, investments, and predictable bills."
        actions={
          <>
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
          </>
        }
      />

      {/* Date Range Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 sm:p-4 wt-shadow">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active Filter Range
          </p>
          <p className="text-sm font-bold text-foreground">Overview & Analytics Period</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Metric Cards (Standardized Design & Heights, with Dedicated Investments Card) */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricCard
          label="Total Liquid Balance"
          value={money(totalBalance)}
          delta={`${activeAccounts.length} active accounts`}
          icon={Wallet}
          tone="blue"
          onClick={() => onNavigate("Accounts")}
        />
        <MetricCard
          label="Investments Portfolio"
          value={money(investmentSummary.currentValue ?? investmentSummary.contributions)}
          delta={
            investmentSummary.contributions > 0
              ? `${money(investmentSummary.contributions)} invested`
              : "Track assets & funds"
          }
          icon={TrendingUp}
          tone="green"
          onClick={() => onNavigate("Reports")}
        />
        <MetricCard
          label="Income Inflows"
          value={money(monthIncome)}
          delta="Selected period"
          icon={ArrowDownLeft}
          tone="green"
          onClick={() => onNavigate("Reports")}
        />
        <MetricCard
          label="Expenses Outflows"
          value={money(monthExpenses)}
          delta="Selected period"
          icon={ArrowUpRight}
          tone="red"
          onClick={() => onNavigate("Transactions")}
        />
        <MetricCard
          label="Net Cash Flow"
          value={money(monthIncome - monthExpenses)}
          delta={monthIncome >= monthExpenses ? "Surplus savings" : "Net deficit"}
          icon={Activity}
          tone={monthIncome >= monthExpenses ? "green" : "red"}
          onClick={() => onNavigate("Reports")}
        />
      </div>

      {/* 6-Month Income vs Expense Trend & Spending by Category */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 wt-shadow">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-base text-foreground">Income vs. Expenses Trend</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Monthly cash flow history over the last 6 months</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs font-semibold" onClick={() => onNavigate("Reports")}>
              Full Report →
            </Button>
          </div>

          <div className="mt-6 flex h-52 items-end gap-2 border-b border-border pb-3 sm:gap-4">
            {Array.from({ length: 6 }, (_, index) => {
              const date = new Date(2026, 9 - (5 - index), 1);
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
              const rows = data.transactions.filter((item) => item.date.slice(0, 7) === key);
              const income = rows
                .filter((item) => item.type === "Income")
                .reduce((sum, item) => sum + item.amount, 0);
              const expenses = rows
                .filter((item) => item.type === "Expense")
                .reduce((sum, item) => sum + item.amount, 0);
              const max = Math.max(
                1,
                ...data.transactions
                  .filter((item) => item.date.slice(0, 7) >= "2026-05")
                  .map((item) => item.amount),
                income,
                expenses
              );
              const label = new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date);

              return (
                <div
                  key={key}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2 rounded-md px-1 hover:bg-muted/40 transition-colors"
                  title={`${label}: ${money(income)} income, ${money(expenses)} expenses`}
                >
                  <div className="flex h-40 w-full max-w-12 items-end justify-center gap-1.5">
                    <span
                      className="w-[38%] rounded-t-sm bg-emerald-500 transition-all hover:opacity-85"
                      style={{ height: `${Math.max(income ? 5 : 0, (income / max) * 100)}%` }}
                    />
                    <span
                      className="w-[38%] rounded-t-sm bg-rose-500 transition-all hover:opacity-85"
                      style={{ height: `${Math.max(expenses ? 5 : 0, (expenses / max) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground sm:text-xs">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex gap-4 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2.5 rounded-full bg-emerald-500" /> Income
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2.5 rounded-full bg-rose-500" /> Expenses
            </span>
          </div>
        </section>

        {/* Spending by Category */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 wt-shadow">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-base text-foreground">Top Spending Categories</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Breakdown for the selected range</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs font-semibold" onClick={() => onNavigate("Reports")}>
              Details →
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            {categories.length ? (
              categories.map(({ category, amount }, index) => (
                <button
                  key={category.id}
                  type="button"
                  className="w-full text-left group cursor-pointer"
                  onClick={() => onCategory(category.id)}
                >
                  <span className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-base">{category.icon}</span>
                      <span className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
                        {category.name}
                      </span>
                    </span>
                    <span className="shrink-0 font-bold text-foreground tabular-nums">
                      {money(amount)}
                    </span>
                  </span>
                  <span className="block h-2 overflow-hidden rounded-full bg-muted">
                    <span
                      className={`block h-full rounded-full transition-all ${
                        ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"][index % 5]
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, (amount / maxSpend) * 100))}%` }}
                    />
                  </span>
                </button>
              ))
            ) : (
              <EmptyInline
                title="No expenditures in this period"
                body="Your category spending breakdown will display here."
              />
            )}
          </div>
        </section>
      </div>

      {/* Recent Transactions & Side Overview Cards */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5 wt-shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-base text-foreground">Recent Transactions</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Latest financial movements across all accounts</p>
            </div>
            <div className="flex items-center gap-2">
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
                variant="ghost"
                size="sm"
                className="text-xs font-semibold"
                onClick={() => onNavigate("Transactions")}
              >
                View All →
              </Button>
            </div>
          </div>

          <div className="space-y-1 divide-y divide-border/60">
            {filteredRecent.length ? (
              filteredRecent.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  category={data.categories.find((item) => item.id === transaction.categoryId)}
                  account={data.accounts.find((item) => item.id === transaction.accountId)}
                  money={money}
                  onClick={() => onSelectTransaction(transaction)}
                />
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No transactions matching selected priority filter.
              </p>
            )}
          </div>
        </section>

        {/* Right Side Column: Accounts & Recurring Reminders */}
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5 wt-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-foreground">Financial Accounts</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Live balances across institutions</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs font-semibold"
                onClick={() => onNavigate("Accounts")}
              >
                Manage →
              </Button>
            </div>

            <div className="mt-3.5 space-y-2">
              {activeAccounts.slice(0, 4).map((account) => {
                const isCard = account.kind === "Credit card";
                return (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 py-2 rounded-lg hover:bg-muted/30 px-2 transition-colors cursor-pointer"
                    onClick={() => onNavigate("Accounts")}
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-muted text-primary">
                      {isCard ? <CreditCard size={16} /> : <Wallet size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.institution || account.kind}</p>
                    </div>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {money(getAccountBalance(account, data.transactions))}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Upcoming Bills & Recurring */}
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5 wt-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-foreground">Upcoming Reminders</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Predictable repeating bills & paychecks</p>
              </div>
              <CalendarDays size={18} className="text-muted-foreground" />
            </div>

            <div className="mt-3.5 space-y-3">
              {data.recurring
                .filter((item) => item.enabled)
                .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
                .slice(0, 3)
                .map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span
                      className={`grid size-9 place-items-center rounded-lg ${
                        item.type === "Income" ? "wt-success-bg text-success" : "bg-muted text-foreground"
                      }`}
                    >
                      {item.type === "Income" ? <ArrowDownLeft size={16} /> : <CalendarDays size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Due: {formatDate(item.nextDate)}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-bold tabular-nums block ${
                          item.type === "Income" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                        }`}
                      >
                        {item.type === "Income" ? "+" : "−"}
                        {money(item.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              {!data.recurring.some((item) => item.enabled) && (
                <EmptyInline title="No active reminders" body="Set up a recurring schedule to see it here." />
              )}
            </div>

            <Button
              variant="link"
              className="mt-3 h-auto p-0 text-xs font-semibold text-primary"
              onClick={() => onNavigate("Recurring")}
            >
              Manage Recurring Schedules →
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}

import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Info,
  Landmark,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeading } from "@/components/shared/PageHeading";
import { PeriodPill } from "@/components/shared/PeriodPill";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { Metric } from "@/components/shared/Metric";
import { formatPaydayLabel } from "@/lib/formatters";
import { useSharedPeriod } from "@/lib/period-state";
import { migrateLegacyState } from "@/lib/migration";
import {
  getBudgetMetrics,
  getComingUpItems,
  getMonthlyCommitments,
  getPaydayCountdown,
  getPeriodMetrics,
} from "@/lib/metrics-service";
import { safeAmount, type Section, type Transaction, type WealthState } from "@/lib/wealthtrack";

export function Dashboard({
  data,
  money,
  onAdd,
  onTransferClick,
  onNavigate,
  onFilterTransactions,
  onSelectTransaction,
  onCategory,
}: {
  data: WealthState;
  money: (amount: number) => string;
  onAdd: (preset?: Partial<Transaction>) => void;
  onTransferClick?: () => void;
  onNavigate: (section: Section) => void;
  onFilterTransactions?: (filter: { type?: string }) => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onCategory: (id: string) => void;
  onUpdateSalary?: (payload: any) => void;
}) {
  const [sharedPeriod, setSharedPeriod] = useSharedPeriod();

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
  const comingUpItems = useMemo(
    () => getComingUpItems(unified.schedules, unified.loans, unified.holdings, "2026-10-26", 30),
    [unified.schedules, unified.loans, unified.holdings]
  );
  const commitments = useMemo(
    () => getMonthlyCommitments(unified.schedules, unified.loans, unified.holdings, unified.goals),
    [unified.schedules, unified.loans, unified.holdings, unified.goals]
  );
  const payday = useMemo(
    () => getPaydayCountdown(unified.schedules, "2026-10-26"),
    [unified.schedules]
  );

  // Filtered period transactions for recent list and charts
  const periodDatePrefix = `${sharedPeriod.year}-${String(sharedPeriod.month).padStart(2, "0")}`;
  const periodLabel = `${new Date(sharedPeriod.year, sharedPeriod.month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;

  const recentTransactions = useMemo(() => {
    return [...data.transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [data.transactions]);

  // Top spending categories in current period
  const topCategories = useMemo(() => {
    return budgetMetrics.categoryRows
      .filter((r) => r.spent > 0)
      .slice(0, 4);
  }, [budgetMetrics]);

  // Loan obligations summary
  const loansSummary = useMemo(() => {
    const activeLoans = (data.loans ?? []).filter((l) => safeAmount(l.currentOutstanding) > 0);
    const totalOutstanding = activeLoans.reduce((sum, l) => sum + safeAmount(l.currentOutstanding), 0);
    const totalMonthlyEmi = activeLoans.reduce(
      (sum, l) => sum + (l.autoRecurringEmi !== false ? safeAmount(l.emiAmount) : 0),
      0
    );
    const totalPrincipal = activeLoans.reduce(
      (sum, l) => sum + safeAmount(l.principalAmount || l.currentOutstanding),
      0
    );
    const totalPaid = Math.max(0, totalPrincipal - totalOutstanding);
    const payoffPct = totalPrincipal > 0 ? Math.round((totalPaid / totalPrincipal) * 100) : 0;
    return {
      activeLoans,
      totalOutstanding,
      totalMonthlyEmi,
      payoffPct,
      hasLoans: activeLoans.length > 0,
    };
  }, [data.loans]);

  const hasComingUp = comingUpItems && comingUpItems.length > 0;
  const hasLoans = loansSummary.hasLoans;
  const hasTopSpending = topCategories && topCategories.length > 0;
  const hasGoals = unified.goals && unified.goals.length > 0;

  const remainingBudget = Math.max(0, budgetMetrics.totalCap - budgetMetrics.budgetedSpend);
  const isOverBudget = budgetMetrics.budgetUsedPct > 100;

  return (
    <div className="space-y-6">
      {/* Standard Page Header: Home + Shared PeriodPill */}
      <PageHeading
        title="Home"
        description="Daily expense tracker: review outgoings, category budgets, and recurring bills."
        periodSlot={<PeriodPill period={sharedPeriod} onChange={setSharedPeriod} />}
      />

      {/* BLOCK 1: Hero Card — Monthly Spending & Budget Health */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onNavigate("Categories")}
        onKeyDown={(e) => e.key === "Enter" && onNavigate("Categories")}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.04] p-4 sm:p-5 wt-shadow hover:border-primary/50 transition-all text-left"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-primary/10 blur-3xl" />

        <div className="flex flex-col gap-3 relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                isOverBudget
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                  : "bg-primary/10 border-primary/20 text-primary"
              }`}>
                <span className={`size-1.5 rounded-full ${isOverBudget ? "bg-rose-500" : "bg-primary animate-pulse"}`} />
                {isOverBudget ? "Over Budget" : "Monthly Spending"}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">{periodLabel}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate("Categories");
              }}
              className="h-7 px-2.5 gap-1 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <span>View Budgets</span>
              <ArrowRight size={13} />
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6 pt-0.5">
            <div className="flex items-baseline gap-2 shrink-0 flex-wrap">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight tabular-nums">
                <Metric id="money_out" value={periodMetrics.moneyOut} />
              </span>
              <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                spent of {money(budgetMetrics.totalCap)} budget
              </span>
              <span className={`text-xs font-extrabold ${isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-primary"}`}>
                ({budgetMetrics.budgetUsedPct}% used)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1 text-xs font-medium">
                <span className="text-muted-foreground">Remaining Budget:</span>
                <strong className={`tabular-nums ${isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                  {money(remainingBudget)}
                </strong>
              </div>

              {commitments.total > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1 text-xs font-medium">
                  <span className="text-muted-foreground">Recurring:</span>
                  <strong className="text-foreground">{money(commitments.total)}/mo</strong>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden mt-1">
            <div
              style={{ width: `${Math.min(100, budgetMetrics.budgetUsedPct)}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget
                  ? "bg-rose-500"
                  : budgetMetrics.budgetUsedPct > 75
                  ? "bg-amber-500"
                  : "bg-primary"
              }`}
            />
          </div>
        </div>
      </div>

      {/* BLOCK 2: "This Month" 3-Tile Strip */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Spending Summary ({periodLabel})
          </h2>
          <span className="text-[11px] text-muted-foreground">Tap tile to inspect details</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Tile 1: Total Outflow */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("Transactions")}
            onKeyDown={(e) => e.key === "Enter" && onNavigate("Transactions")}
            className="group cursor-pointer rounded-2xl border border-border/80 bg-card p-2.5 sm:p-4 wt-shadow hover:border-rose-500/50 hover:bg-rose-500/[0.03] transition-all min-w-0"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1 sm:mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Total Expenses</span>
              <span className="grid size-6 place-items-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0 group-hover:scale-110 transition-transform">
                <ArrowUpRight size={13} />
              </span>
            </div>
            <div className="text-sm sm:text-2xl font-extrabold text-foreground tabular-nums truncate">
              <Metric id="money_out" value={periodMetrics.moneyOut} />
            </div>
            <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 truncate">
              Outgoings this month
            </p>
          </div>

          {/* Tile 2: Budget Headroom */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("Categories")}
            onKeyDown={(e) => e.key === "Enter" && onNavigate("Categories")}
            className="group cursor-pointer rounded-2xl border border-border/80 bg-card p-2.5 sm:p-4 wt-shadow hover:border-primary/50 hover:bg-primary/[0.03] transition-all min-w-0"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1 sm:mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Budget Left</span>
              <span className="grid size-6 place-items-center rounded-lg bg-primary/15 text-primary shrink-0 group-hover:scale-110 transition-transform">
                <Tag size={13} />
              </span>
            </div>
            <div className="text-sm sm:text-2xl font-extrabold text-foreground tabular-nums truncate">
              {money(remainingBudget)}
            </div>
            <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 truncate">
              Available budget capacity
            </p>
          </div>

          {/* Tile 3: Recurring Commitments */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("Recurring")}
            onKeyDown={(e) => e.key === "Enter" && onNavigate("Recurring")}
            className="group cursor-pointer rounded-2xl border border-border/80 bg-card p-2.5 sm:p-4 wt-shadow hover:border-amber-500/50 hover:bg-amber-500/[0.03] transition-all min-w-0"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1 sm:mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Fixed Bills</span>
              <span className="grid size-6 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
                <CalendarDays size={13} />
              </span>
            </div>
            <div className="text-sm sm:text-2xl font-extrabold text-foreground tabular-nums truncate">
              {money(commitments.total)}
            </div>
            <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 truncate">
              Monthly repeating bills
            </p>
          </div>
        </div>
      </div>

      {/* BLOCK 3: Adaptive Cards Grid (Coming Up, Top Spending, Recent Activity) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-start">
        {/* Top Spending Categories Card */}
        {hasTopSpending ? (
          <div className="rounded-2xl border border-border/80 bg-card p-5 wt-shadow space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Top Spending Categories</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Category breakdown for {periodLabel}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("Categories")}
                className="h-7 text-xs font-semibold text-primary"
              >
                All Categories →
              </Button>
            </div>

            <div className="space-y-3">
              {topCategories.map((r) => {
                const pct = r.cap > 0 ? Math.round((r.spent / r.cap) * 100) : 100;
                const isOver = r.isOverBudget;
                return (
                  <div key={r.category.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span>{r.category.icon}</span>
                        <span className="font-bold text-foreground">{r.category.name}</span>
                      </div>
                      <div className="text-right tabular-nums">
                        <span className="font-bold text-foreground">
                          {money(r.spent)}
                        </span>
                        {r.cap > 0 && (
                          <span className="text-muted-foreground ml-1">/ {money(r.cap)}</span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, pct)}%` }}
                        className={`h-full rounded-full transition-all ${
                          isOver ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-primary"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Coming Up Bills Card */}
        {hasComingUp ? (
          <div className="rounded-2xl border border-border/80 bg-card p-5 wt-shadow space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-foreground">Upcoming Bills</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("Recurring")}
                className="h-7 text-xs font-semibold text-primary"
              >
                Recurring →
              </Button>
            </div>

            <div className="space-y-2">
              {comingUpItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-card border border-border/60 font-bold text-foreground text-xs shadow-2xs">
                      {item.date.slice(8, 10)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Due in {item.daysRemaining} days
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-foreground tabular-nums">{money(item.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Recent Activity Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Recent Expenses</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Latest recorded transactions</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("Transactions")}
            className="h-7 text-xs font-semibold text-primary"
          >
            All Transactions →
          </Button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
            <p>No transactions logged yet.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAdd()}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus size={13} /> Add first expense
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {recentTransactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                category={data.categories.find((c) => c.id === tx.categoryId)}
                account={data.accounts.find((a) => a.id === tx.accountId)}
                money={money}
                onClick={() => onSelectTransaction(tx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  Clock,
  Home,
  Lightbulb,
  PieChart,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/shared/PageHeading";
import { PeriodPill } from "@/components/shared/PeriodPill";
import { Metric } from "@/components/shared/Metric";
import { Wallet3DIcon } from "@/components/shared/Wallet3DIcon";
import { useSharedPeriod } from "@/lib/period-state";
import { migrateLegacyState } from "@/lib/migration";
import {
  getBudgetMetrics,
  getComingUpItems,
  getMonthlyCommitments,
  getPeriodMetrics,
} from "@/lib/metrics-service";
import { safeAmount, type Section, type Transaction, type WealthState } from "@/lib/wealthtrack";

interface DashboardProps {
  data: WealthState;
  money: (amount: number) => string;
  onAdd: (preset?: Partial<Transaction>) => void;
  onTransferClick?: () => void;
  onNavigate: (section: Section) => void;
  onFilterTransactions?: (filter: { type?: string }) => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onCategory: (id: string) => void;
  onUpdateSalary?: (payload: any) => void;
}

const CATEGORY_PROGRESS_COLORS = [
  "#2563eb", // Vibrant Blue
  "#9333ea", // Vibrant Purple
  "#10b981", // Emerald
  "#f97316", // Vibrant Orange
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f59e0b", // Amber
];

function formatShortDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { day: "01", month: "Nov", full: dateStr };
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleDateString("en-IN", { month: "short" });
    return { day, month, full: `${day} ${month}` };
  } catch {
    return { day: "01", month: "Nov", full: dateStr };
  }
}

export function Dashboard({
  data,
  money,
  onAdd,
  onNavigate,
  onSelectTransaction,
}: DashboardProps) {
  const [sharedPeriod, setSharedPeriod] = useSharedPeriod();
  const [categoryTimeframe, setCategoryTimeframe] = useState<"Day" | "Week" | "Month">("Month");

  // Derive state through canonical engine
  const unified = useMemo(() => migrateLegacyState(data), [data]);
  const periodMetrics = useMemo(
    () => getPeriodMetrics(unified.entries, sharedPeriod),
    [unified.entries, sharedPeriod]
  );
  const budgetMetrics = useMemo(
    () => getBudgetMetrics(unified.categories, unified.entries, sharedPeriod),
    [unified.categories, unified.entries, sharedPeriod]
  );
  const commitments = useMemo(
    () => getMonthlyCommitments(unified.schedules, unified.loans, unified.holdings, unified.goals),
    [unified.schedules, unified.loans, unified.holdings, unified.goals]
  );
  const comingUpItems = useMemo(
    () => getComingUpItems(unified.schedules, unified.loans, unified.holdings, "2026-10-26", 30),
    [unified.schedules, unified.loans, unified.holdings]
  );

  const periodLabel = `${new Date(sharedPeriod.year, sharedPeriod.month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  })}`;

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
    return Math.round(((periodMetrics.moneyOut - prevMonthSpend) / prevMonthSpend) * 100);
  }, [periodMetrics.moneyOut, prevMonthSpend]);

  const remainingBudget = Math.max(0, budgetMetrics.totalCap - budgetMetrics.budgetedSpend);
  const isOverBudget = budgetMetrics.budgetUsedPct > 100;

  // Filtered period transactions
  const periodPrefix = `${sharedPeriod.year}-${String(sharedPeriod.month).padStart(2, "0")}`;
  const recentTransactions = useMemo(() => {
    const periodMatches = data.transactions.filter((t) => t.date.startsWith(periodPrefix));
    return (periodMatches.length > 0 ? periodMatches : data.transactions)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [data.transactions, periodPrefix]);

  // Top spending categories in current period
  const topCategories = useMemo(() => {
    return budgetMetrics.categoryRows
      .filter((r) => r.spent > 0)
      .slice(0, 4);
  }, [budgetMetrics]);

  // First upcoming bill for Quick Insights
  const nextBill = comingUpItems && comingUpItems.length > 0 ? comingUpItems[0] : null;

  // Highest over-budget or top spending category for Quick Insights
  const highlightCategory = useMemo(() => {
    if (topCategories.length === 0) return null;
    const over = topCategories.find((r) => r.isOverBudget);
    return over || topCategories[0];
  }, [topCategories]);

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumb-style icon & Shared PeriodPill */}
      <PageHeading
        title="Home"
        description="Daily expense tracker: review outgoings, category budgets, and recurring bills."
        icon={<Home size={22} className="text-primary" />}
        periodSlot={<PeriodPill period={sharedPeriod} onChange={setSharedPeriod} />}
      />

      {/* 2. Hero Banner: Monthly Spending, Budget Left, Fixed Bills */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-100/90 dark:border-blue-900/40 bg-gradient-to-r from-blue-50/80 via-sky-50/50 to-blue-100/30 dark:from-blue-950/30 dark:via-slate-900/60 dark:to-card p-5 sm:p-6 lg:p-7 shadow-xs">
        {/* Decorative ascending bar chart illustration behind View Budgets button */}
        <div className="absolute right-4 bottom-0 flex items-end gap-1.5 opacity-20 dark:opacity-10 pointer-events-none select-none h-20 sm:h-24">
          <div className="w-2.5 sm:w-3.5 h-[28%] rounded-t-sm bg-primary" />
          <div className="w-2.5 sm:w-3.5 h-[42%] rounded-t-sm bg-primary" />
          <div className="w-2.5 sm:w-3.5 h-[60%] rounded-t-sm bg-primary" />
          <div className="w-2.5 sm:w-3.5 h-[80%] rounded-t-sm bg-primary" />
          <div className="w-2.5 sm:w-3.5 h-[100%] rounded-t-sm bg-primary" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Block: 3D Wallet + Monthly Spending */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <Wallet3DIcon className="size-16 sm:size-20 shrink-0 filter drop-shadow-sm" />
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Monthly Spending
              </p>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight tabular-nums">
                <Metric id="money_out" value={periodMetrics.moneyOut} />
              </div>
              <p className="text-xs text-muted-foreground">
                vs {money(prevMonthSpend)} last month ·{" "}
                <span className={spendDiffPct > 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-muted-foreground"}>
                  {spendDiffPct > 0 ? `+${spendDiffPct}%` : `${spendDiffPct}%`}
                </span>
              </p>
            </div>
          </div>

          {/* Middle & Right Block: Budget Left, Fixed Bills, View Budgets */}
          <div className="flex flex-wrap items-center gap-5 sm:gap-8 lg:gap-10">
            {/* Stat: Budget Left */}
            <div className="flex items-center gap-3">
              <div className="size-10 sm:size-11 rounded-2xl bg-blue-500/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Budget Left</p>
                <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                  {money(remainingBudget)}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  of {money(budgetMetrics.totalCap)}
                </p>
              </div>
            </div>

            {/* Stat: Fixed Bills */}
            <div className="flex items-center gap-3">
              <div className="size-10 sm:size-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Receipt size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Fixed Bills</p>
                <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                  {money(commitments.total)}
                </p>
                <p className="text-[11px] text-muted-foreground">per month</p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="shrink-0 pt-1 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate("Categories")}
                className="h-9 px-4 gap-1.5 text-xs font-bold border-primary/20 bg-background/90 hover:bg-background text-primary shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              >
                <span>View Budgets</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main 2x2 Grid (Top Spending, Upcoming Bills, Recent Expenses, Quick Insights) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
        {/* Card 1: Top Spending Categories */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <PieChart size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">Top Spending Categories</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Category breakdown for {periodLabel}
                </p>
              </div>
            </div>

            {/* Day | Week | Month Toggle */}
            <div className="inline-flex items-center rounded-xl border border-border/70 bg-muted/40 p-0.5 text-xs font-semibold shrink-0">
              {(["Day", "Week", "Month"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setCategoryTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    categoryTimeframe === tf
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {topCategories.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
              <p>No category spending recorded for {periodLabel}.</p>
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
            <div className="space-y-4 pt-1">
              {topCategories.map((r, idx) => {
                const pct = r.cap > 0 ? Math.round((r.spent / r.cap) * 100) : 100;
                const isOver = r.isOverBudget;
                const barColor = CATEGORY_PROGRESS_COLORS[idx % CATEGORY_PROGRESS_COLORS.length];

                return (
                  <div key={r.category.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 text-sm">
                          {r.category.icon || "📁"}
                        </span>
                        <span className="font-bold text-foreground truncate">{r.category.name}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right tabular-nums">
                          <span className="font-bold text-foreground">{money(r.spent)}</span>
                          {r.cap > 0 && (
                            <span className="text-muted-foreground ml-1">/ {money(r.cap)}</span>
                          )}
                        </div>

                        {/* Percentage Pill */}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold border tabular-nums ${
                            isOver
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                          }`}
                        >
                          {pct > 999 ? `${pct.toLocaleString()}%` : `${pct}%`}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar with vibrant category color */}
                    <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          backgroundColor: barColor,
                        }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card 2: Upcoming Bills */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CalendarDays size={18} />
              </div>
              <h3 className="text-sm font-bold text-foreground">Upcoming Bills</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("Recurring")}
              className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10"
            >
              View All →
            </Button>
          </div>

          {!comingUpItems || comingUpItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
              <p>No upcoming bills scheduled in the next 30 days.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigate("Recurring")}
                className="gap-1.5 text-xs font-semibold"
              >
                Set up recurring bills
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {comingUpItems.slice(0, 4).map((item) => {
                const dateParts = formatShortDate(item.date);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 px-3.5 py-2.5 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Date Badge: Day & Month stacked */}
                      <div className="size-11 rounded-xl border border-border/70 bg-card flex flex-col items-center justify-center shrink-0 shadow-2xs">
                        <span className="text-xs sm:text-sm font-black text-foreground leading-none">
                          {dateParts.day}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground mt-0.5 leading-none">
                          {dateParts.month}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Due in {item.daysRemaining} days
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-black text-foreground tabular-nums text-sm">
                        {money(item.amount)}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                        Upcoming
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card 3: Recent Expenses */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Clock size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">Recent Expenses</h3>
                <p className="text-xs text-muted-foreground truncate">Latest recorded transactions</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("Transactions")}
              className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 shrink-0"
            >
              View All →
            </Button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
              <p>No transactions logged for this period.</p>
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
            <div className="space-y-2 pt-1">
              {recentTransactions.map((tx) => {
                const cat = data.categories.find((c) => c.id === tx.categoryId);
                const dateParts = formatShortDate(tx.date);
                const isOut = tx.type === "Expense" || tx.amount < 0;
                const priority = tx.need || "Need";

                return (
                  <div
                    key={tx.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectTransaction(tx)}
                    onKeyDown={(e) => e.key === "Enter" && onSelectTransaction(tx)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card hover:bg-muted/30 px-3.5 py-2.5 text-xs transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="size-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 text-base">
                        {cat?.icon || "💸"}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-foreground truncate">{tx.merchant || tx.notes || "Expense"}</p>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider border ${
                              priority.toLowerCase() === "want"
                                ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900"
                                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                            }`}
                          >
                            {priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {cat?.name || "General"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <span
                        className={`font-black tabular-nums text-sm ${
                          isOut ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isOut ? `-${money(Math.abs(tx.amount))}` : `+${money(Math.abs(tx.amount))}`}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums w-12 text-right hidden sm:inline">
                        {dateParts.full}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card 4: Quick Insights */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Lightbulb size={18} />
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
              onClick={() => onNavigate("Reports")}
              className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 shrink-0"
            >
              View Details →
            </Button>
          </div>

          <div className="space-y-3 pt-1">
            {/* Insight 1: Budget Status */}
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs">
              <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp size={18} />
              </div>
              <div>
                <p className="font-bold text-foreground">
                  {isOverBudget
                    ? `Spending exceeded budget by ${budgetMetrics.budgetUsedPct - 100}%`
                    : "Your spending is within budget this month."}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isOverBudget
                    ? "Consider reducing discretionary spends for the remaining days."
                    : "Keep it up!"}
                </p>
              </div>
            </div>

            {/* Insight 2: Next Upcoming Bill */}
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs">
              <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar size={18} />
              </div>
              <div>
                <p className="font-bold text-foreground">
                  {nextBill
                    ? `Next bill (${nextBill.name}) is due in ${nextBill.daysRemaining} days.`
                    : "No pending bills due in the near future."}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {nextBill ? money(nextBill.amount) : "All regular commitments are up to date."}
                </p>
              </div>
            </div>

            {/* Insight 3: Category Focus */}
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs">
              <div className="size-9 rounded-xl bg-blue-500/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <PieChart size={18} />
              </div>
              <div>
                <p className="font-bold text-foreground">
                  {highlightCategory
                    ? `${highlightCategory.category.name} is ${
                        highlightCategory.cap > 0
                          ? `${Math.round((highlightCategory.spent / highlightCategory.cap) * 100)}% of limit.`
                          : "your highest expense category."
                      }`
                    : "Category insights will appear as you spend."}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {highlightCategory?.isOverBudget
                    ? "Consider reducing discretionary spends in this category."
                    : "Tracking well against target limits."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
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
import { getTodayDateString } from "@/lib/formatters";

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

function formatDueText(daysRemaining: number) {
  if (daysRemaining === 0) return "Due today";
  if (daysRemaining === 1) return "Due tomorrow";
  if (daysRemaining > 1) return `Due in ${daysRemaining} days`;
  return `Overdue by ${Math.abs(daysRemaining)}d`;
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

  // Dynamic current date reference (accurate calculations)
  const todayStr = useMemo(() => getTodayDateString(), []);

  // Derive canonical unified engine state
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

  // Dynamic upcoming bills calculated strictly from today's real date
  const comingUpItems = useMemo(
    () => getComingUpItems(unified.schedules, unified.loans, unified.holdings, todayStr, 30),
    [unified.schedules, unified.loans, unified.holdings, todayStr]
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

  // Filtered period transactions (Recent Expenses limited to top 4)
  const periodPrefix = `${sharedPeriod.year}-${String(sharedPeriod.month).padStart(2, "0")}`;
  const allPeriodExpenses = useMemo(() => {
    const periodMatches = data.transactions.filter(
      (t) => t.date.startsWith(periodPrefix) && (t.type === "Expense" || t.amount < 0)
    );
    const source = periodMatches.length > 0
      ? periodMatches
      : data.transactions.filter((t) => t.type === "Expense" || t.amount < 0);
    return source.slice().sort((a, b) => b.date.localeCompare(a.date));
  }, [data.transactions, periodPrefix]);

  const recentExpenses = useMemo(() => allPeriodExpenses.slice(0, 4), [allPeriodExpenses]);

  // Top spending categories dynamically filtered by Day | Week | Month
  const topCategories = useMemo(() => {
    let filteredTxs = data.transactions.filter((t) => t.type === "Expense" || t.amount < 0);

    if (categoryTimeframe === "Day") {
      filteredTxs = filteredTxs.filter((t) => t.date.slice(0, 10) === todayStr);
    } else if (categoryTimeframe === "Week") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      const weekStartStr = d.toISOString().slice(0, 10);
      filteredTxs = filteredTxs.filter((t) => {
        const dStr = t.date.slice(0, 10);
        return dStr >= weekStartStr && dStr <= todayStr;
      });
    } else {
      // Month
      filteredTxs = filteredTxs.filter((t) => t.date.startsWith(periodPrefix));
    }

    const spendMap: Record<string, number> = {};
    for (const tx of filteredTxs) {
      const catId = tx.categoryId || "general";
      spendMap[catId] = (spendMap[catId] || 0) + Math.abs(tx.amount);
    }

    const rows = Object.entries(spendMap).map(([catId, spent]) => {
      const cat = data.categories.find((c) => c.id === catId);
      const name = cat?.name || (catId === "general" ? "General" : "Other");
      const icon = cat?.icon || "📁";
      const cap = cat?.monthlyLimit || 0;
      const isOver = cap > 0 && spent > cap;
      const pct = cap > 0 ? Math.round((spent / cap) * 100) : 100;

      return {
        category: {
          id: catId,
          name,
          icon,
          monthlyLimit: cap,
        },
        spent,
        cap,
        isOverBudget: isOver,
        pct,
      };
    });

    return rows.sort((a, b) => b.spent - a.spent);
  }, [data.transactions, data.categories, categoryTimeframe, todayStr, periodPrefix]);

  const displayedTopCategories = useMemo(() => topCategories.slice(0, 4), [topCategories]);

  // Upcoming bills limited to top 4
  const displayedComingUp = useMemo(() => (comingUpItems || []).slice(0, 4), [comingUpItems]);

  // Dynamic Permutation Quick Insights covering all data conditions
  const quickInsights = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      description: string;
      icon: typeof TrendingUp;
      iconClass: string;
      bgClass: string;
    }> = [];

    // 1. Budget Pace Insight
    const daysInMonth = new Date(sharedPeriod.year, sharedPeriod.month, 0).getDate();
    const currentDay = Math.min(new Date().getDate(), daysInMonth);
    const daysLeft = Math.max(1, daysInMonth - currentDay);

    if (periodMetrics.moneyOut === 0) {
      list.push({
        id: "budget-zero",
        title: `Zero spending logged for ${periodLabel}.`,
        description: `Your entire monthly budget of ${money(budgetMetrics.totalCap)} is fully intact.`,
        icon: CheckCircle2,
        iconClass: "text-emerald-600 dark:text-emerald-400",
        bgClass: "bg-emerald-500/10",
      });
    } else if (budgetMetrics.totalCap === 0) {
      list.push({
        id: "budget-none",
        title: "No monthly budget configured.",
        description: "Set category limits in Budgets & Categories to track savings capacity.",
        icon: Info,
        iconClass: "text-blue-600 dark:text-blue-400",
        bgClass: "bg-blue-500/10",
      });
    } else if (isOverBudget) {
      const overAmount = budgetMetrics.budgetedSpend - budgetMetrics.totalCap;
      list.push({
        id: "budget-over",
        title: `Spending exceeded budget by ${budgetMetrics.budgetUsedPct - 100}%.`,
        description: `${money(overAmount)} over target limit. Consider pausing discretionary outgoings.`,
        icon: AlertTriangle,
        iconClass: "text-rose-600 dark:text-rose-400",
        bgClass: "bg-rose-500/10",
      });
    } else if (budgetMetrics.budgetUsedPct > 80) {
      const dailyLeft = Math.round(remainingBudget / daysLeft);
      list.push({
        id: "budget-warning",
        title: `Approaching budget ceiling (${budgetMetrics.budgetUsedPct}% used).`,
        description: `~${money(dailyLeft)}/day remaining across ${daysLeft} days left in this month.`,
        icon: AlertTriangle,
        iconClass: "text-amber-600 dark:text-amber-400",
        bgClass: "bg-amber-500/10",
      });
    } else {
      list.push({
        id: "budget-healthy",
        title: "Your spending is healthy and within budget.",
        description: `${budgetMetrics.budgetUsedPct}% of budget used. ${money(remainingBudget)} remaining headroom.`,
        icon: TrendingUp,
        iconClass: "text-emerald-600 dark:text-emerald-400",
        bgClass: "bg-emerald-500/10",
      });
    }

    // 2. Upcoming Obligations Insight
    const nextBill = comingUpItems && comingUpItems.length > 0 ? comingUpItems[0] : null;
    if (nextBill) {
      const billDueText = formatDueText(nextBill.daysRemaining);
      const isUrgent = nextBill.daysRemaining <= 2;
      list.push({
        id: "upcoming-bill",
        title: `${nextBill.name} is ${billDueText.toLowerCase()}.`,
        description: `${money(nextBill.amount)} scheduled payment (${formatShortDate(nextBill.date).full}).`,
        icon: Calendar,
        iconClass: isUrgent ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400",
        bgClass: isUrgent ? "bg-amber-500/10" : "bg-purple-500/10",
      });
    } else {
      list.push({
        id: "no-bills",
        title: "No upcoming bills scheduled in 30 days.",
        description: "All regular recurring payments and loan obligations are up to date.",
        icon: CheckCircle2,
        iconClass: "text-emerald-600 dark:text-emerald-400",
        bgClass: "bg-emerald-500/10",
      });
    }

    // 3. Category Concentration Insight
    const overCategory = topCategories.find((c) => c.isOverBudget);
    const highestCategory = topCategories[0];

    if (overCategory) {
      list.push({
        id: "cat-over",
        title: `${overCategory.category.name} is ${overCategory.pct}% of limit.`,
        description: `Spent ${money(overCategory.spent)} against ${money(overCategory.cap)} cap.`,
        icon: PieChart,
        iconClass: "text-rose-600 dark:text-rose-400",
        bgClass: "bg-rose-500/10",
      });
    } else if (highestCategory && periodMetrics.moneyOut > 0) {
      const pctOfTotal = Math.round((highestCategory.spent / periodMetrics.moneyOut) * 100);
      list.push({
        id: "cat-highest",
        title: `${highestCategory.category.name} is your largest expense (${pctOfTotal}%).`,
        description: `${money(highestCategory.spent)} spent in this category for ${periodLabel}.`,
        icon: PieChart,
        iconClass: "text-blue-600 dark:text-blue-400",
        bgClass: "bg-blue-500/10",
      });
    } else {
      list.push({
        id: "cat-empty",
        title: "Category breakdown is ready.",
        description: "Add daily transactions to see automatic spending patterns and savings.",
        icon: Lightbulb,
        iconClass: "text-blue-600 dark:text-blue-400",
        bgClass: "bg-blue-500/10",
      });
    }

    return list;
  }, [
    periodMetrics.moneyOut,
    sharedPeriod,
    periodLabel,
    money,
    budgetMetrics,
    isOverBudget,
    remainingBudget,
    comingUpItems,
    topCategories,
  ]);

  return (
    <div className="space-y-6">
      {/* 1. Header with Shared PeriodPill */}
      <PageHeading
        title="Home"
        description="Daily expense tracker: review outgoings, category budgets, and recurring bills."
        periodSlot={<PeriodPill period={sharedPeriod} onChange={setSharedPeriod} />}
      />

      {/* 2. Hero Banner: 100% Mobile Responsive with zero collision */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-100/90 dark:border-blue-900/40 bg-gradient-to-r from-blue-50/80 via-sky-50/50 to-blue-100/30 dark:from-blue-950/30 dark:via-slate-900/60 dark:to-card p-4 sm:p-6 lg:p-7 shadow-xs">
        {/* Decorative ascending bar chart illustration: hidden on small screens (<640px) to prevent button collision */}
        <div className="absolute right-4 bottom-0 hidden sm:flex items-end gap-1.5 opacity-20 dark:opacity-10 pointer-events-none select-none h-20 sm:h-24">
          <div className="w-2.5 sm:w-3.5 h-[28%] rounded-t-sm bg-primary" />
          <div className="w-2.5 sm:w-3.5 h-[42%] rounded-t-sm bg-primary" />
          <div className="w-2.5 sm:w-3.5 h-[60%] rounded-t-sm bg-primary" />
          <div className="w-2.5 sm:w-3.5 h-[80%] rounded-t-sm bg-primary" />
          <div className="w-2.5 sm:w-3.5 h-[100%] rounded-t-sm bg-primary" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          {/* Top/Left Block: 3D Wallet + Monthly Spending */}
          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
            <Wallet3DIcon className="size-14 sm:size-20 shrink-0 filter drop-shadow-sm" />
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Monthly Spending
              </p>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight tabular-nums">
                <Metric id="money_out" value={periodMetrics.moneyOut} />
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                vs {money(prevMonthSpend)} last month ·{" "}
                <span className={spendDiffPct > 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-muted-foreground font-semibold"}>
                  {spendDiffPct > 0 ? `+${spendDiffPct}%` : `${spendDiffPct}%`}
                </span>
              </p>
            </div>
          </div>

          {/* Middle & Right Block: Mobile side-by-side tiles + View Budgets */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-6 lg:gap-8">
            {/* 2 Stat Cards side-by-side on mobile */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-6 w-full sm:w-auto">
              {/* Stat: Budget Left */}
              <div className="flex items-center gap-2.5 sm:gap-3 rounded-2xl bg-card/70 sm:bg-transparent border border-border/50 sm:border-0 p-2.5 sm:p-0 shadow-2xs sm:shadow-none">
                <div className="size-9 sm:size-11 rounded-2xl bg-blue-500/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                  <Wallet size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10.5px] sm:text-xs font-semibold text-muted-foreground truncate">Budget Left</p>
                  <p className="text-base sm:text-2xl font-black text-foreground tabular-nums truncate">
                    {money(remainingBudget)}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground tabular-nums truncate">
                    of {money(budgetMetrics.totalCap)}
                  </p>
                </div>
              </div>

              {/* Stat: Fixed Bills */}
              <div className="flex items-center gap-2.5 sm:gap-3 rounded-2xl bg-card/70 sm:bg-transparent border border-border/50 sm:border-0 p-2.5 sm:p-0 shadow-2xs sm:shadow-none">
                <div className="size-9 sm:size-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Receipt size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10.5px] sm:text-xs font-semibold text-muted-foreground truncate">Fixed Bills</p>
                  <p className="text-base sm:text-2xl font-black text-foreground tabular-nums truncate">
                    {money(commitments.total)}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">per month</p>
                </div>
              </div>
            </div>

            {/* CTA Button: full-width on mobile, auto on sm */}
            <div className="shrink-0 pt-0.5 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate("Categories")}
                className="w-full sm:w-auto h-9 px-4 gap-1.5 text-xs font-bold border-primary/20 bg-background/90 hover:bg-background text-primary shadow-2xs hover:shadow-xs transition-all cursor-pointer justify-center"
              >
                <span>View Budgets</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Auto-rearranging Cards (Two-Column Flex Layout to eliminate marginal gaps) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
        {/* LEFT COLUMN: Top Spending Categories & Recent Expenses */}
        <div className="flex flex-col gap-5 lg:gap-6">
          {/* Card 1: Top Spending Categories */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <PieChart size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground">Top Spending Categories</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    Category breakdown ({categoryTimeframe === "Day" ? "Today" : categoryTimeframe === "Week" ? "Last 7 Days" : periodLabel})
                  </p>
                </div>
              </div>

              {/* Day | Week | Month Dynamic Toggle */}
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

            {displayedTopCategories.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <p>
                  No category spending recorded for{" "}
                  {categoryTimeframe === "Day" ? "today" : categoryTimeframe === "Week" ? "this week" : periodLabel}.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAdd()}
                  className="gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Plus size={13} /> Add first expense
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {displayedTopCategories.map((r, idx) => {
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
                              r.isOverBudget
                                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                            }`}
                          >
                            {r.pct > 999 ? `${r.pct.toLocaleString()}%` : `${r.pct}%`}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar with vibrant category color */}
                      <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(100, r.pct)}%`,
                            backgroundColor: barColor,
                          }}
                          className="h-full rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}

                {topCategories.length > 4 && (
                  <div className="pt-1 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate("Categories")}
                      className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      View All ({topCategories.length}) →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Recent Expenses (Limited to top 4 with View All link) */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs space-y-4">
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
                className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
              >
                View All →
              </Button>
            </div>

            {recentExpenses.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <p>No transactions logged for this period.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAdd()}
                  className="gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Plus size={13} /> Add first expense
                </Button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {recentExpenses.map((tx) => {
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

                {allPeriodExpenses.length > 4 && (
                  <div className="pt-1 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate("Transactions")}
                      className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      View All ({allPeriodExpenses.length}) →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Upcoming Bills & Quick Insights */}
        <div className="flex flex-col gap-5 lg:gap-6">
          {/* Card 3: Upcoming Bills (Strictly calculated from today, limited to top 4) */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs space-y-4">
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
                className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
              >
                View All →
              </Button>
            </div>

            {!displayedComingUp || displayedComingUp.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <p>No upcoming bills scheduled in the next 30 days.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate("Recurring")}
                  className="gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  Set up recurring bills
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                {displayedComingUp.map((item) => {
                  const dateParts = formatShortDate(item.date);
                  const isUrgent = item.daysRemaining <= 2;

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
                          <p className={`text-[11px] font-medium ${isUrgent ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground"}`}>
                            {formatDueText(item.daysRemaining)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-black text-foreground tabular-nums text-sm">
                          {money(item.amount)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            item.daysRemaining === 0
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                              : isUrgent
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900"
                              : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900"
                          }`}
                        >
                          {item.daysRemaining === 0 ? "Today" : isUrgent ? "Soon" : "Upcoming"}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {(comingUpItems || []).length > 4 && (
                  <div className="pt-1 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate("Recurring")}
                      className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      View All ({(comingUpItems || []).length}) →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 4: Quick Insights (Dynamic covering all data permutations) */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs space-y-4">
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
                className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
              >
                View Details →
              </Button>
            </div>

            <div className="space-y-3 pt-1">
              {quickInsights.map((insight) => {
                const Icon = insight.icon;
                return (
                  <div
                    key={insight.id}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs"
                  >
                    <div className={`size-9 rounded-xl ${insight.bgClass} ${insight.iconClass} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground leading-snug">{insight.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
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
import { PageHeading } from "@/components/shared/PageHeading";
import { PeriodPill } from "@/components/shared/PeriodPill";
import { CashFlowVelocityChart } from "@/components/shared/CashFlowVelocityChart";
import { EmptyInline } from "@/components/shared/EmptyInline";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { SalaryCountdownCard } from "./SalaryCountdownCard";
import { useSharedPeriod } from "@/lib/period-state";
import { migrateLegacyState } from "@/lib/migration";
import {
  getBudgetMetrics,
  getComingUpItems,
  getMonthlyCommitments,
  getPaydayCountdown,
  getPeriodMetrics,
  getRunwayMetrics,
  getWealthMetrics,
} from "@/lib/metrics-service";
import type { Section, Transaction, WealthState } from "@/lib/wealthtrack";

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
  onAdd,
  onTransferClick,
  onNavigate,
  onSelectTransaction,
  onCategory,
  onUpdateSalary,
}: {
  data: WealthState;
  money: (amount: number) => string;
  onAdd: (preset?: Partial<Transaction>) => void;
  onTransferClick?: () => void;
  onNavigate: (section: Section) => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onCategory: (id: string) => void;
  onUpdateSalary?: (payload: any) => void;
}) {
  const [sharedPeriod, setSharedPeriod] = useSharedPeriod();
  const [goalsAccordionOpen, setGoalsAccordionOpen] = useState(false);
  const [chartAccordionOpen, setChartAccordionOpen] = useState(false);

  // Derive all data from canonical metrics service (Correlation Contract C1)
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
  const emergencyGoal = unified.goals.find((g) => g.name.toLowerCase().includes("emergency"));
  const runwayMetrics = useMemo(
    () =>
      getRunwayMetrics(
        wealthMetrics.liquidCash,
        emergencyGoal,
        unified.entries,
        sharedPeriod
      ),
    [wealthMetrics.liquidCash, emergencyGoal, unified.entries, sharedPeriod]
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

  // Earmarks check
  const earmarksExceedCash = wealthMetrics.isEarmarkExceedingCash;

  // Filtered period transactions for recent list and charts
  const periodDatePrefix = `${sharedPeriod.year}-${String(sharedPeriod.month).padStart(2, "0")}`;
  const periodLabel = `${new Date(sharedPeriod.year, sharedPeriod.month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
  const periodTransactions = useMemo(() => {
    return data.transactions.filter((t) => t.date.startsWith(periodDatePrefix));
  }, [data.transactions, periodDatePrefix]);

  const recentTransactions = useMemo(() => {
    return [...data.transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4);
  }, [data.transactions]);

  // Top spending categories in current period
  const topCategories = useMemo(() => {
    return budgetMetrics.categoryRows
      .filter((r) => r.spent > 0)
      .slice(0, 3);
  }, [budgetMetrics]);

  const emiToIncomePct = periodMetrics.moneyIn > 0
    ? Math.round((periodMetrics.emisInPeriod / periodMetrics.moneyIn) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Clean Header: Dashboard + Shared PeriodPill (No redundant Add buttons) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Unified financial position derived from your ledger.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <PeriodPill period={sharedPeriod} onChange={setSharedPeriod} />
        </div>
      </div>

      {/* BLOCK 1: Hero Card — Answer to "How much money do I have?" */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onNavigate("Wealth")}
        onKeyDown={(e) => e.key === "Enter" && onNavigate("Wealth")}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 shadow-sm hover:border-primary/50 transition-all text-left"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cash available
              </span>
              <span className="text-xs text-muted-foreground">in bank, cash & wallets</span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight tabular-nums">
                {money(wealthMetrics.liquidCash)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pt-0.5">
              <span>Net worth</span>
              <span className="font-bold text-foreground tabular-nums">
                {money(wealthMetrics.netWorth)}
              </span>
              <ChevronRight size={14} className="text-primary group-hover:translate-x-0.5 transition-transform" />
            </div>

            {/* Second line: Set aside vs Free to spend */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-muted-foreground">
                <strong className="text-foreground">{money(wealthMetrics.earmarkedCash)}</strong> set aside for goals
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">{money(wealthMetrics.freeToSpend)}</strong> free to spend
              </span>
            </div>

            {earmarksExceedCash && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-400 mt-2 font-semibold">
                <AlertTriangle size={14} /> Earmarks exceed current liquid balance by{" "}
                {money(wealthMetrics.earmarkedCash - wealthMetrics.liquidCash)}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:items-end justify-between self-stretch shrink-0 border-t border-border/60 pt-3 sm:border-t-0 sm:pt-0">
            <div className="hidden sm:block text-right">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">Investments</span>
              <p className="text-sm font-black text-foreground tabular-nums">{money(wealthMetrics.investmentsValue)}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors self-start sm:self-auto"
            >
              <span>View Wealth Hub</span>
              <ArrowRight size={13} />
            </Button>
          </div>
        </div>
      </div>

      {/* BLOCK 2: "This Month" 3-Tile Strip (Tap opens filtered Transactions) */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            This Month ({periodLabel})
          </h2>
          <span className="text-[11px] text-muted-foreground">Tap any tile to inspect entries</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tile 1: Money In */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("Transactions")}
            onKeyDown={(e) => e.key === "Enter" && onNavigate("Transactions")}
            className="group cursor-pointer rounded-xl border border-border/70 bg-card p-4 shadow-2xs hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Money In</span>
              <ArrowDownLeft size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{money(periodMetrics.moneyIn)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Salary & freelance receivables</p>
          </div>

          {/* Tile 2: Money Out */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("Transactions")}
            onKeyDown={(e) => e.key === "Enter" && onNavigate("Transactions")}
            className="group cursor-pointer rounded-xl border border-border/70 bg-card p-4 shadow-2xs hover:border-rose-500/50 hover:bg-rose-500/5 transition-all"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Money Out</span>
              <ArrowUpRight size={16} className="text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-extrabold text-foreground tabular-nums">
              −{money(periodMetrics.moneyOut)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              incl. <strong className="text-foreground">{money(periodMetrics.emisInPeriod)}</strong> EMIs
            </p>
          </div>

          {/* Tile 3: Saved */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("Transactions")}
            onKeyDown={(e) => e.key === "Enter" && onNavigate("Transactions")}
            className="group cursor-pointer rounded-xl border border-border/70 bg-card p-4 shadow-2xs hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Saved</span>
              <PiggyBank size={16} className="text-primary group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-extrabold text-foreground tabular-nums">
              {money(periodMetrics.saved)}
              <span className="ml-2 text-sm font-bold text-primary">({periodMetrics.savingsRatePct ?? 0}%)</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Kept in cash + investments + lent</p>
          </div>
        </div>
      </div>

      {/* BLOCK 3: Health Card — 50/30/20 & Vital Chips */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-primary" />
              <h3 className="text-sm font-bold text-foreground">Monthly Financial Health</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Saving <strong className="text-foreground">{periodMetrics.savingsRatePct ?? 0}%</strong> of income — target is{" "}
              {data.profile?.savingsRateTarget || 35}%
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("Reports")}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline self-start sm:self-auto"
          >
            <span>See insights</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* 3-Segment 50/30/20 Proportional Bar */}
        <div className="space-y-2">
          <div className="h-3.5 w-full rounded-full bg-muted overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${periodMetrics.split503020.needsPct}%` }}
              className="bg-blue-500 transition-all duration-500"
              title={`Needs: ${periodMetrics.split503020.needsPct}%`}
            />
            <div
              style={{ width: `${periodMetrics.split503020.wantsPct}%` }}
              className="bg-violet-500 transition-all duration-500"
              title={`Wants: ${periodMetrics.split503020.wantsPct}%`}
            />
            <div
              style={{ width: `${periodMetrics.split503020.savingsPct}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Savings: ${periodMetrics.split503020.savingsPct}%`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Needs:</span>
              <strong className="text-foreground">{periodMetrics.split503020.needsPct}%</strong>
              <span className="text-[10px] text-muted-foreground">({money(periodMetrics.needs)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-violet-500" />
              <span className="text-muted-foreground">Wants:</span>
              <strong className="text-foreground">{periodMetrics.split503020.wantsPct}%</strong>
              <span className="text-[10px] text-muted-foreground">({money(periodMetrics.wants)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Savings:</span>
              <strong className="text-foreground">{periodMetrics.split503020.savingsPct}%</strong>
              <span className="text-[10px] text-muted-foreground">({money(periodMetrics.saved)})</span>
            </div>
          </div>
        </div>

        {/* Vital Health Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Cash runway</span>
            <span className="text-sm font-extrabold text-foreground tabular-nums">
              {runwayMetrics.cashRunwayMonths} months
            </span>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Emergency cover</span>
            <span className="text-sm font-extrabold text-foreground tabular-nums">
              {runwayMetrics.emergencyCoverageMonths} months
            </span>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">EMI load</span>
            <span className="text-sm font-extrabold text-foreground tabular-nums">
              {emiToIncomePct}% of income
            </span>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Budget used</span>
            <span className="text-sm font-extrabold text-foreground tabular-nums">
              {budgetMetrics.budgetUsedPct}%
            </span>
          </div>
        </div>
      </div>

      {/* BLOCK 4: Merged Coming Up Card (Payday + Next 3 Recurring / Commitments) */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Coming Up</h3>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-bold">
              {payday ? `Payday in ${payday.daysRemaining} days (${payday.nextDate.slice(0, 10)})` : "No upcoming payday"}
            </span>
          </div>
        </div>

        {comingUpItems.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">No scheduled payments due in the next 30 days.</p>
        ) : (
          <div className="space-y-2">
            {comingUpItems.slice(0, 3).map((item) => (
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
                      Due in {item.daysRemaining} days · {item.sourceType === "loan" ? "Loan EMI" : item.sourceType === "sip" ? "SIP" : "Recurring"}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-foreground tabular-nums">{money(item.amount)}</p>
                  <span className="text-[10px] text-muted-foreground">{item.sourceType === "loan" ? "Auto-debit" : "Scheduled"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">
            Total monthly commitments: <strong className="text-foreground">{money(commitments.total)}</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("Plan")}
            className="h-7 text-xs font-semibold text-primary"
          >
            Manage recurring →
          </Button>
        </div>
      </div>

      {/* BLOCK 5: Top Spending Categories */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Top Spending</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {budgetMetrics.budgetUsedPct}% of total budget used in {periodLabel}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("Plan")}
            className="h-7 text-xs font-semibold text-primary"
          >
            All Budgets →
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
                    <span className="font-bold text-foreground">{money(r.spent)}</span>
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

      {/* BLOCK 6: Recent Activity (Last 4 entries) */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Latest posted transactions</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("Transactions")}
            className="h-7 text-xs font-semibold text-primary"
          >
            View all →
          </Button>
        </div>

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
      </div>

      {/* Collapsed Accordions: Sinking Funds/Goals & Cash Flow Velocity Chart */}
      <div className="space-y-3 pt-2">
        {/* Accordion 1: Goals */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setGoalsAccordionOpen(!goalsAccordionOpen)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={18} className="text-emerald-500" />
              <span className="text-xs font-bold text-foreground">
                Goals & Sinking Funds · {unified.goals.length} active · {money(commitments.goalContributions)}/mo
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform ${goalsAccordionOpen ? "rotate-180" : ""}`}
            />
          </button>
          {goalsAccordionOpen && (
            <div className="p-4 pt-0 border-t border-border/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {unified.goals.map((g) => {
                  const pct = g.target > 0 ? Math.min(100, Math.round((g.opening_amount / g.target) * 100)) : 100;
                  return (
                    <div key={g.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{g.name}</span>
                        <span className="text-[10px] font-bold text-primary">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="h-full bg-emerald-500 rounded-full" />
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{money(g.opening_amount)}</span>
                        <span>Target: {money(g.target)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Accordion 2: Cash Flow Velocity Chart */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setChartAccordionOpen(!chartAccordionOpen)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp size={18} className="text-primary" />
              <span className="text-xs font-bold text-foreground">Cash Flow Velocity Chart</span>
            </div>
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform ${chartAccordionOpen ? "rotate-180" : ""}`}
            />
          </button>
          {chartAccordionOpen && (
            <div className="p-4 pt-0 border-t border-border/60">
              <CashFlowVelocityChart
                transactions={periodTransactions}
                money={money}
                dateRange={{ preset: "1m" }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

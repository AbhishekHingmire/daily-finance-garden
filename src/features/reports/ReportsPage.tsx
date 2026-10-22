import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, type DateRangeValue } from "@/components/shared/DateRangeFilter";
import { EmptyInline } from "@/components/shared/EmptyInline";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeading } from "@/components/shared/PageHeading";
import { SelectField } from "@/components/shared/FormFields";
import { matchCategoryIcon } from "@/lib/icon-matcher";
import {
  getInvestmentSummary,
  type Transaction,
  type WealthState,
} from "@/lib/wealthtrack";

export function ReportsPage({
  data,
  rows,
  dateRange,
  setDateRange,
  category,
  setCategory,
  account,
  setAccount,
  priority,
  setPriority,
  money,
  onExport,
  onCategory,
}: {
  data: WealthState;
  rows: Transaction[];
  dateRange: DateRangeValue;
  setDateRange: (range: DateRangeValue) => void;
  category: string;
  setCategory: (category: string) => void;
  account: string;
  setAccount: (account: string) => void;
  priority: string;
  setPriority: (priority: string) => void;
  money: (amount: number) => string;
  onExport: () => void;
  onCategory: (id: string) => void;
}) {
  const totalIncome = rows
    .filter((r) => r.type === "Income")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpenses = rows
    .filter((r) => r.type === "Expense")
    .reduce((sum, r) => sum + r.amount, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  const investmentTx = rows.filter((r) => r.type === "Investment");
  const investmentSummary = getInvestmentSummary(rows);

  // 50 / 30 / 20 Budget Rule Metrics
  const needsSpend = rows
    .filter((r) => r.type === "Expense" && r.need === "Need")
    .reduce((sum, r) => sum + r.amount, 0);

  const wantsSpend = rows
    .filter((r) => r.type === "Expense" && r.need === "Want")
    .reduce((sum, r) => sum + r.amount, 0);

  const effectiveIncome = Math.max(1, totalIncome);
  const needsPct = Math.round((needsSpend / effectiveIncome) * 100);
  const wantsPct = Math.round((wantsSpend / effectiveIncome) * 100);
  const savingsPct = Math.max(0, Math.round((netSavings / effectiveIncome) * 100));

  // Expense breakdown by category with exact icons
  const spendByCategory = data.categories
    .filter((c) => c.kind === "Expense" && !c.archived)
    .map((c) => {
      const amount = rows
        .filter((r) => r.categoryId === c.id && r.type === "Expense")
        .reduce((sum, r) => sum + r.amount, 0);
      const count = rows.filter((r) => r.categoryId === c.id && r.type === "Expense").length;
      return { ...c, icon: c.icon || matchCategoryIcon(c.name), amount, count };
    })
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Income breakdown by category with exact icons
  const incomeByCategory = data.categories
    .filter((c) => c.kind === "Income" && !c.archived)
    .map((c) => {
      const amount = rows
        .filter((r) => r.categoryId === c.id && r.type === "Income")
        .reduce((sum, r) => sum + r.amount, 0);
      const count = rows.filter((r) => r.categoryId === c.id && r.type === "Income").length;
      return { ...c, icon: c.icon || matchCategoryIcon(c.name), amount, count };
    })
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Top Merchants / Payees Intelligence
  const merchantMap = new Map<string, { total: number; count: number }>();
  rows
    .filter((r) => r.type === "Expense")
    .forEach((r) => {
      const name = r.merchant || r.description;
      const existing = merchantMap.get(name) || { total: 0, count: 0 };
      merchantMap.set(name, { total: existing.total + r.amount, count: existing.count + 1 });
    });
  const topMerchants = Array.from(merchantMap.entries())
    .map(([name, { total, count }]) => ({ name, total, count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // 6-Month Income vs Expense Trend Bar Graph Data
  const trendMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(2026, 9 - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const mRows = data.transactions.filter((item) => item.date.slice(0, 7) === key);
    const inc = mRows.filter((item) => item.type === "Income").reduce((sum, item) => sum + item.amount, 0);
    const exp = mRows.filter((item) => item.type === "Expense").reduce((sum, item) => sum + item.amount, 0);
    const label = new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date);
    return { key, label, income: inc, expenses: exp, net: inc - exp };
  });
  const maxTrend = Math.max(1, ...trendMonths.flatMap((m) => [m.income, m.expenses]));

  return (
    <>
      <PageHeading
        eyebrow="FINANCIAL INTELLIGENCE"
        title="Reports & Analytics"
        description="Deep analysis into cash flow trajectory, spending habits, 50/30/20 balance, and investments."
        actions={
          <Button variant="outline" size="sm" onClick={onExport} className="h-9 gap-1.5 text-xs font-semibold">
            <Download size={15} /> Export Report CSV
          </Button>
        }
      />

      {/* Consistent Filter Bar with Unified DateRangeFilter */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5 wt-shadow">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="wt-label">Date Range Filter</span>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
          <SelectField
            label="Priority Classification"
            value={priority}
            onChange={setPriority}
            options={[
              { value: "All priorities", label: "All Priorities" },
              { value: "Need", label: "Need" },
              { value: "Want", label: "Want" },
            ]}
          />
          <SelectField
            label="Category"
            value={category}
            onChange={setCategory}
            options={[
              { value: "All categories", label: "All Categories" },
              ...data.categories
                .filter((c) => !c.archived)
                .map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
            ]}
          />
          <SelectField
            label="Account"
            value={account}
            onChange={setAccount}
            options={[
              { value: "All accounts", label: "All Accounts" },
              ...data.accounts
                .filter((a) => !a.archived)
                .map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        </div>
      </div>

      {/* Executive KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Period Inflow" value={money(totalIncome)} icon={ArrowDownLeft} tone="green" />
        <MetricCard label="Total Period Outflow" value={money(totalExpenses)} icon={ArrowUpRight} tone="red" />
        <MetricCard
          label="Net Operating Surplus"
          value={money(netSavings)}
          icon={Activity}
          tone={netSavings >= 0 ? "green" : "red"}
        />
        <MetricCard
          label="Savings Efficiency"
          value={`${savingsRate}%`}
          icon={TrendingUp}
          tone={savingsRate >= 20 ? "green" : "amber"}
        />
      </div>

      {/* 50 / 30 / 20 Needs vs. Wants Budget Health Panel */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5 wt-shadow">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-foreground">50 / 30 / 20 Budget Rule Diagnostic</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  wantsPct <= 30 && needsPct <= 50
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                }`}
              >
                {wantsPct <= 30 && needsPct <= 50 ? "Healthy Distribution" : "Attention Recommended"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Standard benchmark: 50% Essential Needs · 30% Lifestyle Wants · 20% Financial Freedom (Savings)
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Period Inflows: </span>
            <span className="text-sm font-bold text-foreground tabular-nums">{money(totalIncome)}</span>
          </div>
        </div>

        {/* Visual Multi-Segment Distribution Bar */}
        <div className="mt-4">
          <div className="flex h-5 w-full overflow-hidden rounded-full bg-muted">
            <div
              style={{ width: `${Math.min(100, needsPct)}%` }}
              className="bg-emerald-500 transition-all"
              title={`Needs: ${money(needsSpend)} (${needsPct}%)`}
            />
            <div
              style={{ width: `${Math.min(100 - needsPct, wantsPct)}%` }}
              className="bg-amber-500 transition-all"
              title={`Wants: ${money(wantsSpend)} (${wantsPct}%)`}
            />
            <div
              style={{ width: `${Math.min(100 - needsPct - wantsPct, savingsPct)}%` }}
              className="bg-primary transition-all"
              title={`Savings: ${money(netSavings)} (${savingsPct}%)`}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:text-left">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="size-2 rounded-full bg-emerald-500" /> Needs ({needsPct}%)
              </span>
              <span className="mt-1 block text-sm font-bold text-foreground tabular-nums">
                {money(needsSpend)}
              </span>
              <span className="text-[10px] text-muted-foreground">Target: ≤ 50%</span>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <span className="size-2 rounded-full bg-amber-500" /> Wants ({wantsPct}%)
              </span>
              <span className="mt-1 block text-sm font-bold text-foreground tabular-nums">
                {money(wantsSpend)}
              </span>
              <span className="text-[10px] text-muted-foreground">Target: ≤ 30%</span>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <span className="size-2 rounded-full bg-primary" /> Savings ({savingsPct}%)
              </span>
              <span className="mt-1 block text-sm font-bold text-foreground tabular-nums">
                {money(netSavings)}
              </span>
              <span className="text-[10px] text-muted-foreground">Target: ≥ 20%</span>
            </div>
          </div>
        </div>

        {/* Advisory Insight Banner */}
        <div className="mt-4 rounded-xl bg-accent/50 p-3.5 text-xs leading-relaxed">
          {wantsPct > 30 ? (
            <p className="text-amber-700 dark:text-amber-300">
              <strong>Advisor Insight:</strong> Discretionary spending ("Wants") is currently at{" "}
              <strong>{wantsPct}%</strong>, exceeding the 30% benchmark. Consider cutting back on dining out, shopping, or entertainment to channel more surplus toward your savings buffer.
            </p>
          ) : needsPct > 50 ? (
            <p className="text-amber-700 dark:text-amber-300">
              <strong>Advisor Insight:</strong> Essential spending ("Needs") is high at{" "}
              <strong>{needsPct}%</strong>. Review recurring utility bills, subscriptions, and housing costs to unlock more breathing room in your monthly cash flow.
            </p>
          ) : (
            <p className="text-emerald-700 dark:text-emerald-300">
              <strong>Advisor Insight:</strong> Outstanding financial discipline! Your lifestyle expenses are well under 30% and your savings rate of{" "}
              <strong>{savingsPct}%</strong> beats standard benchmarks.
            </p>
          )}
        </div>
      </div>

      {/* Graphical Trends & Merchants Matrix */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* 6-Month Income vs Expense Trend Bar Graph */}
        <div className="rounded-xl border border-border bg-card p-5 wt-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground">Income vs. Expense Trend</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                6-month comparison of total money inflows vs. outflows
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-500" /> Expense
              </span>
            </div>
          </div>

          <div className="mt-6 flex h-52 items-end justify-between gap-3 border-b border-border pb-3">
            {trendMonths.map((m) => {
              const incPct = maxTrend > 0 ? (m.income / maxTrend) * 100 : 0;
              const expPct = maxTrend > 0 ? (m.expenses / maxTrend) * 100 : 0;
              return (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end justify-center gap-1">
                    <div
                      className="w-[42%] max-w-6 rounded-t-sm bg-emerald-500 transition-all hover:opacity-80"
                      style={{ height: `${Math.max(incPct ? 6 : 0, incPct)}%` }}
                      title={`${m.label} Income: ${money(m.income)}`}
                    />
                    <div
                      className="w-[42%] max-w-6 rounded-t-sm bg-rose-500 transition-all hover:opacity-80"
                      style={{ height: `${Math.max(expPct ? 6 : 0, expPct)}%` }}
                      title={`${m.label} Expense: ${money(m.expenses)}`}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground">{m.label}</span>
                  <span className={`text-[10px] font-bold ${m.net >= 0 ? "text-success" : "text-destructive"}`}>
                    {m.net >= 0 ? "+" : "−"}
                    {money(Math.abs(m.net))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Payees & Merchants Intelligence */}
        <div className="rounded-xl border border-border bg-card p-5 wt-shadow">
          <h2 className="font-bold text-foreground">Top Expense Payees & Merchants</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Where your outflows went most heavily</p>
          <div className="mt-5 space-y-3">
            {topMerchants.length ? (
              topMerchants.map((item, idx) => {
                const pctOfExpenses =
                  totalExpenses > 0 ? Math.round((item.total / totalExpenses) * 100) : 0;
                return (
                  <div key={item.name} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        <span className="grid size-6 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {idx + 1}
                        </span>
                        {item.name}
                      </span>
                      <span className="font-bold text-foreground tabular-nums">
                        {money(item.total)}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({pctOfExpenses}%)
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {item.count} {item.count === 1 ? "transaction" : "transactions"}
                      </span>
                      <span>{pctOfExpenses}% of total period outflows</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyInline title="No payee data" body="No expense merchants recorded in this period." />
            )}
          </div>
        </div>
      </div>

      {/* Investment Activity Panel */}
      {investmentTx.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 wt-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground">Investment Activity & Capital Flows</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Contributions and returns for the selected range · capital movements excluded from ordinary spending
              </p>
            </div>
            <TrendingUp size={18} className="text-muted-foreground" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-4 bg-muted/20">
              <span className="text-xs text-muted-foreground">Contributions & Purchases</span>
              <span className="mt-1 block text-lg font-bold text-foreground tabular-nums">
                {money(investmentSummary.contributions)}
              </span>
            </div>
            <div className="rounded-xl border border-border p-4 bg-muted/20">
              <span className="text-xs text-muted-foreground">Sales, Maturities & Dividends</span>
              <span className="mt-1 block text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {money(investmentSummary.returns)}
              </span>
            </div>
            <div className="rounded-xl border border-border p-4 bg-muted/20">
              <span className="text-xs text-muted-foreground">Latest Recorded Valuation</span>
              <span className="mt-1 block text-lg font-bold text-foreground tabular-nums">
                {investmentSummary.currentValue != null ? money(investmentSummary.currentValue) : "Not recorded"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Complete Category Spend Matrix */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5 wt-shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground">Expense Breakdown by Category</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ranked by total expenditure with exact category icons and budget tracking
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{spendByCategory.length} categories active</span>
        </div>

        <div className="mt-5 space-y-4">
          {spendByCategory.length ? (
            spendByCategory.map((cat, idx) => {
              const percentOfExpenses =
                totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0;
              const hasBudget = cat.monthlyLimit > 0;
              const budgetPct = hasBudget ? Math.round((cat.amount / cat.monthlyLimit) * 100) : 0;
              const overBudget = hasBudget && cat.amount > cat.monthlyLimit;

              return (
                <div
                  key={cat.id}
                  className="group cursor-pointer rounded-xl border border-border p-3.5 transition hover:border-primary/40 hover:bg-muted/30"
                  onClick={() => onCategory(cat.id)}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2.5">
                      <span className="text-xl">{cat.icon}</span>
                      <span className="font-semibold group-hover:text-primary transition-colors text-foreground">
                        {cat.name}
                      </span>
                      {idx === 0 && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                          Top Outflow
                        </span>
                      )}
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-foreground tabular-nums">{money(cat.amount)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({percentOfExpenses}%)</span>
                    </div>
                  </div>

                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        overBudget ? "bg-destructive" : "bg-primary"
                      }`}
                      style={{ width: `${percentOfExpenses}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {cat.count} {cat.count === 1 ? "transaction" : "transactions"} recorded
                    </span>
                    {hasBudget ? (
                      <span className={overBudget ? "font-bold text-destructive" : ""}>
                        Budget: {money(cat.monthlyLimit)} ({budgetPct}% consumed)
                      </span>
                    ) : (
                      <span>Click to view transactions →</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyInline title="No expense data" body="No expenses recorded for this filter range." />
          )}
        </div>
      </div>

      {/* Income Sources Breakdown */}
      {incomeByCategory.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 wt-shadow">
          <h2 className="font-bold text-foreground">Income Sources Breakdown</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Earnings and cash deposits categorized by revenue stream
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {incomeByCategory.map((cat) => {
              const pctOfIncome =
                totalIncome > 0 ? Math.round((cat.amount / totalIncome) * 100) : 0;
              return (
                <div key={cat.id} className="rounded-xl border border-border bg-muted/20 p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate text-foreground">{cat.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {cat.count} {cat.count === 1 ? "deposit" : "deposits"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-success block tabular-nums">
                        +{money(cat.amount)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{pctOfIncome}% of income</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

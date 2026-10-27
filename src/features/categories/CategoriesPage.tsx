import React, { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Pencil, Plus, SlidersHorizontal, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { PageHeading } from "@/components/shared/PageHeading";
import { PeriodPill } from "@/components/shared/PeriodPill";
import { Metric } from "@/components/shared/Metric";
import { useSharedPeriod } from "@/lib/period-state";
import { migrateLegacyState } from "@/lib/migration";
import { getBudgetMetrics } from "@/lib/metrics-service";
import {
  getCategorySpend,
  type Category,
  type WealthState,
} from "@/lib/wealthtrack";

export function CategoriesPage({
  data,
  kind,
  setKind,
  onAdd,
  onEdit,
  onDelete,
  money,
}: {
  data: WealthState;
  kind: "Expense" | "Income" | "Transfer";
  setKind: (kind: "Expense" | "Income" | "Transfer") => void;
  onAdd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  money: (amount: number) => string;
}) {
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [sharedPeriod, setSharedPeriod] = useSharedPeriod();

  const unified = useMemo(() => migrateLegacyState(data), [data]);
  const budgetMetrics = useMemo(
    () => getBudgetMetrics(unified.categories, unified.entries, sharedPeriod),
    [unified, sharedPeriod]
  );

  const periodKey = `${sharedPeriod.year}-${String(sharedPeriod.month).padStart(2, "0")}`;
  const periodTransactions = useMemo(
    () => data.transactions.filter((t) => t.date.slice(0, 7) === periodKey),
    [data.transactions, periodKey]
  );

  const expenseCategories = data.categories.filter((c) => !c.archived && c.kind === "Expense");
  const incomeCategories = data.categories.filter((c) => !c.archived && c.kind === "Income");
  const transferCategories = data.categories.filter((c) => !c.archived && c.kind === "Transfer");

  const categories = data.categories.filter((c) => {
    if (c.archived) return false;
    if (c.kind !== kind) return false;
    if (priorityFilter !== "All" && c.kind === "Expense" && (c.defaultNeed || "Need") !== priorityFilter)
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeading
        title="Budgets & Categories"
        description="Organize your spending into smart need or want classifications with monthly budget caps. Tap any category to edit, or use ⋯ to delete."
        periodSlot={<PeriodPill period={sharedPeriod} onChange={setSharedPeriod} />}
        primaryAction={
          <Button size="sm" onClick={onAdd} className="h-8 sm:h-9 px-2.5 sm:px-3 gap-1.5 text-xs font-semibold shadow-xs shrink-0">
            <Plus size={15} />
            <span className="hidden sm:inline">Add category</span>
          </Button>
        }
      />

      {/* Top Budget Summary Hero Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs space-y-3 min-w-0 w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Overall Budget Performance
              </span>
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold shrink-0">
                {sharedPeriod.month === 10 ? "October 2026" : `${sharedPeriod.month}/${sharedPeriod.year}`}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                <Metric id="money_out" value={budgetMetrics.budgetedSpend} />
              </h2>
              <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                of {money(budgetMetrics.totalCap)}
              </span>
              <span className="text-xs font-extrabold text-primary">
                (<Metric id="budget_used_pct" value={budgetMetrics.budgetUsedPct} format="percent" /> used)
              </span>
            </div>
          </div>
          <div className="text-left sm:text-right text-xs text-muted-foreground shrink-0">
            <span className="block sm:inline sm:mr-1">Uncapped / not budgeted:</span>
            <strong className="text-foreground">{money(budgetMetrics.notBudgetedSpend)}</strong>
          </div>
        </div>

        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            style={{ width: `${Math.min(100, budgetMetrics.budgetUsedPct)}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              budgetMetrics.budgetUsedPct > 100
                ? "bg-rose-500"
                : budgetMetrics.budgetUsedPct > 75
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
          />
        </div>
      </div>

      {/* Filter and Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3 sm:pb-4 min-w-0">
        <div className="flex items-center justify-between gap-2 w-full sm:w-auto min-w-0">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <Button
              variant={kind === "Expense" ? "default" : "outline"}
              size="sm"
              className="h-7.5 sm:h-8 px-2.5 sm:px-3 text-xs font-medium"
              onClick={() => setKind("Expense")}
            >
              Expense <span className="hidden sm:inline">({expenseCategories.length})</span>
            </Button>
            <Button
              variant={kind === "Income" ? "default" : "outline"}
              size="sm"
              className="h-7.5 sm:h-8 px-2.5 sm:px-3 text-xs font-medium"
              onClick={() => setKind("Income")}
            >
              Income <span className="hidden sm:inline">({incomeCategories.length})</span>
            </Button>
            <Button
              variant={kind === "Transfer" ? "default" : "outline"}
              size="sm"
              className="h-7.5 sm:h-8 px-2.5 sm:px-3 text-xs font-medium"
              onClick={() => setKind("Transfer")}
            >
              Transfers <span className="hidden sm:inline">({transferCategories.length})</span>
            </Button>
          </div>

          {/* Filter Toggle (Consistent across Desktop and Mobile) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterExpanded((prev) => !prev)}
            className={`h-8 gap-1.5 px-2.5 text-xs font-bold transition-all cursor-pointer ${
              priorityFilter !== "All"
                ? "border-primary/40 bg-primary/10 text-primary shadow-2xs"
                : "text-muted-foreground hover:text-foreground border-border/80"
            }`}
            aria-expanded={isFilterExpanded}
            aria-label="Toggle classification filter"
          >
            <SlidersHorizontal size={12} className={priorityFilter !== "All" ? "text-primary" : "text-muted-foreground"} />
            <span>Filter</span>
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
        </div>

        {/* Priority Filter: Collapsible across all screen sizes */}
        <div
          className={`${
            isFilterExpanded ? "flex" : "hidden"
          } items-center gap-2 pt-2 border-t border-border/50 animate-in fade-in-50 duration-150`}
        >
          <span className="text-[11px] font-medium text-muted-foreground shrink-0">
            Classification:
          </span>
          <select
            className="wt-field h-8 w-auto min-w-[145px] text-xs py-0 pl-2.5 pr-8 bg-background cursor-pointer"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Priority Classification Filter"
          >
            <option value="All">All Priorities</option>
            <option value="Need">Need (50%)</option>
            <option value="Want">Want (30%)</option>
          </select>
        </div>
      </div>

      {/* Categories Grid: Compact rows, 2 columns at lg+, 1 column below */}
      <div className="grid gap-2.5 grid-cols-1 lg:grid-cols-2 items-start">
        {categories.map((category) => {
          const row = budgetMetrics.categoryRows.find((r) => r.category.id === category.id);
          const isExpense = category.kind === "Expense";
          const isIncome = category.kind === "Income";
          const isTransfer = category.kind === "Transfer";

          let spent = 0;
          if (isExpense) {
            spent = row ? row.spent : 0;
          } else if (isIncome || isTransfer) {
            const periodKey = `${sharedPeriod.year}-${String(sharedPeriod.month).padStart(2, "0")}`;
            spent = unified.entries
              .filter((e) => e.status === "posted" && e.category_id === category.id && e.date.startsWith(periodKey))
              .reduce((sum, e) => sum + e.amount, 0);
          }

          const cap = row ? row.cap : category.monthlyLimit;
          const hasBudget = isExpense && cap > 0;
          const percent = hasBudget && cap > 0 ? Math.round((spent / cap) * 100) : 0;
          const overBudget = hasBudget && spent > cap;
          const overByAmount = spent - cap;

          return (
            <div
              key={category.id}
              onClick={() => onEdit(category)}
              className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-3 sm:p-3.5 transition-all duration-200 hover:border-border hover:shadow-xs cursor-pointer h-auto"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted/60 text-base">
                    {category.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="truncate font-semibold text-foreground text-xs sm:text-sm">
                        {category.name}
                      </h3>
                      {category.kind === "Expense" && (
                        <span
                          className={`inline-block rounded px-1.5 py-0.2 text-[8px] font-semibold tracking-wider ${
                            category.defaultNeed === "Want"
                              ? "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {category.defaultNeed || "Need"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="font-bold text-foreground text-xs sm:text-sm tabular-nums block">
                      <Metric id={`category_total:${category.id}`} value={spent} />
                    </span>
                    {hasBudget && (
                      <span
                        className={`text-[10px] font-semibold tabular-nums block ${
                          overBudget
                            ? "text-rose-600 dark:text-rose-400 font-bold"
                            : percent > 75
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {overBudget ? `Over by ${money(overByAmount)}` : `of ${money(cap)} (${percent}%)`}
                      </span>
                    )}
                  </div>
                  <ActionMenu
                    items={[
                      {
                        label: "Edit category",
                        icon: <Pencil size={13} />,
                        onClick: () => onEdit(category),
                      },
                      {
                        label: "Delete category",
                        icon: <Trash2 size={13} />,
                        destructive: true,
                        onClick: () => onDelete(category),
                      },
                    ]}
                  />
                </div>
              </div>

              {hasBudget && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      overBudget
                        ? "bg-rose-500"
                        : percent > 75
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { PageHeading } from "@/components/shared/PageHeading";
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
  kind: "All" | "Expense" | "Income";
  setKind: (kind: "All" | "Expense" | "Income") => void;
  onAdd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  money: (amount: number) => string;
}) {
  const [priorityFilter, setPriorityFilter] = useState("All");

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthlyTransactions = data.transactions.filter(
    (t) => t.date.slice(0, 7) === currentMonthKey
  );

  const categories = data.categories.filter((c) => {
    if (c.archived) return false;
    if (kind !== "All" && c.kind !== kind) return false;
    if (priorityFilter !== "All" && c.kind === "Expense" && (c.defaultNeed || "Need") !== priorityFilter)
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeading
        title="Categories"
        description="Organize your spending into smart 50/30/20 Need vs. Want classifications with monthly budget caps."
        actions={
          <Button size="sm" onClick={onAdd} className="h-9 gap-1.5 text-xs font-semibold shadow-xs">
            <Plus size={15} /> Add Category
          </Button>
        }
      />

      {/* Filter and Switcher Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 sm:pb-4">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Button
            variant={kind === "All" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={() => setKind("All")}
          >
            All Categories ({data.categories.filter((c) => !c.archived).length})
          </Button>
          <Button
            variant={kind === "Expense" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={() => setKind("Expense")}
          >
            Expense ({data.categories.filter((c) => !c.archived && c.kind === "Expense").length})
          </Button>
          <Button
            variant={kind === "Income" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={() => setKind("Income")}
          >
            Income ({data.categories.filter((c) => !c.archived && c.kind === "Income").length})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">
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

      {/* Categories Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const spent = getCategorySpend(category.id, monthlyTransactions);
          const hasBudget = category.monthlyLimit > 0;
          const percent = hasBudget
            ? Math.min(100, Math.round((spent / category.monthlyLimit) * 100))
            : 0;
          const overBudget = hasBudget && spent > category.monthlyLimit;

          return (
            <div
              key={category.id}
              className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 sm:p-5 transition-all duration-200 hover:border-border hover:shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted/60 text-lg">
                      {category.icon}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-foreground text-sm sm:text-base">
                        {category.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wider ${
                            category.kind === "Income"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {category.kind}
                        </span>
                        {category.kind === "Expense" && (
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wider ${
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

                <div className="mt-4 pt-3 border-t border-border/40">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-xs text-muted-foreground">
                      {category.kind === "Income" ? "Deposited this month" : "Spent this month"}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {money(spent)}
                    </span>
                  </div>

                  {hasBudget && category.kind === "Expense" && (
                    <div className="mt-2.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Cap: {money(category.monthlyLimit)}</span>
                        <span className={overBudget ? "font-semibold text-destructive" : ""}>
                          {percent}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/60">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            overBudget ? "bg-destructive" : "bg-primary"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Category Card */}
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl border-2 border-dashed border-border/70 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 p-5 transition-all flex flex-col items-center justify-center text-center gap-2.5 min-h-[160px] group cursor-pointer"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-2xs">
            <Plus size={20} />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground block group-hover:text-primary transition-colors">
              Add New Category
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
              Expense, Income, or Custom Group
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

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
    <>
      <PageHeading
        eyebrow="SPENDING & REVENUE STRUCTURE"
        title="Categories"
        description="Organize your spending into smart 50/30/20 Need vs. Want classifications with monthly budget caps."
        actions={
          <Button size="sm" onClick={onAdd} className="h-9 gap-1.5 text-xs font-semibold shadow-xs">
            <Plus size={15} /> Add Category
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={kind === "All" ? "default" : "outline"}
            size="sm"
            className="text-xs font-semibold"
            onClick={() => setKind("All")}
          >
            All Categories ({data.categories.filter((c) => !c.archived).length})
          </Button>
          <Button
            variant={kind === "Expense" ? "default" : "outline"}
            size="sm"
            className="text-xs font-semibold"
            onClick={() => setKind("Expense")}
          >
            Expense Categories ({data.categories.filter((c) => !c.archived && c.kind === "Expense").length})
          </Button>
          <Button
            variant={kind === "Income" ? "default" : "outline"}
            size="sm"
            className="text-xs font-semibold"
            onClick={() => setKind("Income")}
          >
            Income Categories ({data.categories.filter((c) => !c.archived && c.kind === "Income").length})
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Priority Filter:
          </span>
          <select
            className="wt-field h-8 w-36 text-xs py-0"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Priority Classification Filter"
          >
            <option value="All">All Priorities</option>
            <option value="Need">Need</option>
            <option value="Want">Want</option>
          </select>
        </div>
      </div>

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
              className="rounded-xl border border-border bg-card p-5 wt-shadow transition-all hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-muted text-xl">
                    {category.icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-foreground">{category.name}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                          category.kind === "Income"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {category.kind}
                      </span>
                      {category.kind === "Expense" && (
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            category.defaultNeed === "Want"
                              ? "border border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {category.defaultNeed || "Need"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-3">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-xs text-muted-foreground">
                    {category.kind === "Income" ? "Deposited this month" : "Spent this month"}
                  </span>
                  <span className="font-bold text-foreground tabular-nums">{money(spent)}</span>
                </div>

                {hasBudget && category.kind === "Expense" && (
                  <div className="mt-2.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Monthly Cap: {money(category.monthlyLimit)}</span>
                      <span className={overBudget ? "font-bold text-destructive" : ""}>
                        {percent}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          overBudget ? "bg-destructive" : "bg-primary"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Explicit Actions Row with 3-Dots Dropdown */}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Actions
                </span>
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
          );
        })}
      </div>
    </>
  );
}

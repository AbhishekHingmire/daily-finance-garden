import { useState } from "react";
import {
  ArrowDownLeft,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { PageHeading } from "@/components/shared/PageHeading";
import type { RecurringItem, WealthState } from "@/lib/wealthtrack";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function RecurringPage({
  data,
  money,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: {
  data: WealthState;
  money: (amount: number) => string;
  onAdd: () => void;
  onEdit: (item: RecurringItem) => void;
  onDelete: (item: RecurringItem) => void;
  onToggle: (item: RecurringItem) => void;
}) {
  const [priorityFilter, setPriorityFilter] = useState("All");

  const filtered = data.recurring.filter((item) => {
    if (priorityFilter !== "All" && item.need !== priorityFilter) return false;
    return true;
  });

  const activeSchedules = data.recurring.filter((r) => r.enabled);
  const totalMonthlyOutflow = activeSchedules
    .filter((r) => r.type === "Expense")
    .reduce((sum, r) => sum + r.amount, 0);
  const totalMonthlyInflow = activeSchedules
    .filter((r) => r.type === "Income")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="AUTOMATED RECURRING FLOWS"
        title="Recurring"
        description="Scheduled bills, loan EMIs, subscriptions, and recurring income schedules."
        actions={
          <Button size="sm" onClick={onAdd} className="h-10 gap-2 px-4 text-xs font-semibold shadow-xs">
            <Plus size={16} /> Add Schedule
          </Button>
        }
      />

      {/* Standardized Summary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-card p-4 wt-shadow">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Monthly Outflows
          </span>
          <span className="mt-1 block text-2xl font-black text-destructive tabular-nums">
            −{money(totalMonthlyOutflow)}
          </span>
          <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
            Bills, subscriptions & EMIs
          </span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 wt-shadow">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Monthly Inflows
          </span>
          <span className="mt-1 block text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{money(totalMonthlyInflow)}
          </span>
          <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
            Salary & guaranteed inflows
          </span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 wt-shadow">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Active Schedules
          </span>
          <span className="mt-1 block text-2xl font-black text-foreground tabular-nums">
            {activeSchedules.length} of {data.recurring.length}
          </span>
          <span className="mt-1 block text-[11px] font-medium text-emerald-600 dark:text-emerald-400 font-semibold">
            Net: +{money(Math.max(0, totalMonthlyInflow - totalMonthlyOutflow))}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
        <span className="text-xs font-bold text-muted-foreground">
          Showing {filtered.length} schedule{filtered.length === 1 ? "" : "s"}
        </span>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground">Priority:</span>
          <select
            className="wt-field h-8 text-xs py-0 w-36 font-semibold"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="All">All Priorities</option>
            <option value="Need">Need (Essential)</option>
            <option value="Want">Want (Discretionary)</option>
          </select>
        </div>
      </div>

      {/* Sleek Minimalist Schedule Rows */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card wt-shadow">
        <div className="divide-y divide-border/60">
          {filtered.map((item) => {
            const cat = data.categories.find((c) => c.id === item.categoryId);
            const acc = data.accounts.find((a) => a.id === item.accountId);
            const isIncome = item.type === "Income";

            return (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:px-5 gap-3 transition-colors hover:bg-muted/25 ${
                  item.enabled ? "" : "opacity-60"
                }`}
              >
                {/* Left: Icon, Name & Metadata */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm ${
                      isIncome
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {isIncome ? <ArrowDownLeft size={18} /> : <CalendarDays size={18} />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm truncate">
                        {item.name}
                      </h3>
                      {item.need && !isIncome && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                            item.need === "Want"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.need}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {cat?.name ?? item.type} · {acc?.name ?? "Account"}
                    </p>
                  </div>
                </div>

                {/* Right: Cadence, Next Date, Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-muted-foreground block">
                      {item.frequency} · Next {formatDate(item.nextDate)}
                    </span>
                    <span
                      className={`text-sm font-bold tabular-nums block mt-0.5 ${
                        isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      {money(item.amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggle(item)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        item.enabled
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      title={item.enabled ? "Click to pause" : "Click to activate"}
                    >
                      {item.enabled ? "Active" : "Paused"}
                    </button>

                    <ActionMenu
                      items={[
                        {
                          label: "Edit",
                          icon: <Pencil size={13} />,
                          onClick: () => onEdit(item),
                        },
                        {
                          label: item.enabled ? "Pause" : "Resume",
                          icon: <CalendarDays size={13} />,
                          onClick: () => onToggle(item),
                        },
                        {
                          label: "Delete",
                          icon: <Trash2 size={13} />,
                          destructive: true,
                          onClick: () => onDelete(item),
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No recurring schedules found matching filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

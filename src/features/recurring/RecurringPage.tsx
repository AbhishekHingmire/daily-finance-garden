import { useState } from "react";
import {
  ArrowDownLeft,
  CalendarDays,
  CheckCircle2,
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
  onRecordNow,
}: {
  data: WealthState;
  money: (amount: number) => string;
  onAdd: () => void;
  onEdit: (item: RecurringItem) => void;
  onDelete: (item: RecurringItem) => void;
  onToggle: (item: RecurringItem) => void;
  onRecordNow: (item: RecurringItem) => void;
}) {
  const [priorityFilter, setPriorityFilter] = useState("All");

  const filtered = data.recurring.filter((item) => {
    if (priorityFilter !== "All" && item.need !== priorityFilter) return false;
    return true;
  });

  return (
    <>
      <PageHeading
        eyebrow="AUTOMATED RECURRING FLOWS"
        title="Recurring Reminders"
        description="Predictable expenses, monthly subscriptions, and scheduled paychecks recorded in 1 click."
        actions={
          <Button size="sm" onClick={onAdd} className="h-9 gap-1.5 text-xs font-semibold shadow-xs">
            <Plus size={15} /> Add Schedule
          </Button>
        }
      />

      {/* Filter Toolbar with Priority Dropdown */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 wt-shadow">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Priority Filter:
          </span>
          <select
            className="wt-field h-8 w-36 text-xs py-0"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by Priority Classification"
          >
            <option value="All">All Priorities</option>
            <option value="Need">Need Only</option>
            <option value="Want">Want Only</option>
          </select>
        </div>
        <span className="text-xs text-muted-foreground">
          Showing {filtered.length} of {data.recurring.length} schedules
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const cat = data.categories.find((c) => c.id === item.categoryId);
          const acc = data.accounts.find((a) => a.id === item.accountId);

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-5 transition wt-shadow bg-card ${
                item.enabled ? "border-border" : "border-border/60 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-10 place-items-center rounded-xl ${
                      item.type === "Income" ? "wt-success-bg text-success" : "bg-muted text-foreground"
                    }`}
                  >
                    {item.type === "Income" ? <ArrowDownLeft size={18} /> : <CalendarDays size={18} />}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-foreground">{item.name}</h3>
                      {item.need && item.type === "Expense" && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            item.need === "Want"
                              ? "border border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {item.need}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cat?.name ?? item.type} · {acc?.name ?? "Account"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={item.enabled ? "outline" : "secondary"}
                  className="h-7 text-xs font-semibold"
                  onClick={() => onToggle(item)}
                >
                  {item.enabled ? "Active" : "Paused"}
                </Button>
              </div>

              <div className="mt-4 border-t border-border pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Cadence: {item.frequency}</span>
                  <span
                    className={`text-base font-extrabold tabular-nums ${
                      item.type === "Income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {item.type === "Income" ? "+" : "−"}
                    {money(item.amount)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Next scheduled:{" "}
                  <strong className="text-foreground">{formatDate(item.nextDate)}</strong>
                </p>
              </div>

              <div className="mt-3.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-full text-xs font-semibold gap-1.5"
                  disabled={!item.enabled}
                  onClick={() => onRecordNow(item)}
                >
                  <CheckCircle2 size={14} /> Record Now
                </Button>
              </div>

              {/* Actions Row with 3-Dots Dropdown */}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Actions
                </span>
                <ActionMenu
                  items={[
                    {
                      label: "Edit schedule",
                      icon: <Pencil size={13} />,
                      onClick: () => onEdit(item),
                    },
                    {
                      label: item.enabled ? "Pause reminder" : "Resume reminder",
                      icon: <CalendarDays size={13} />,
                      onClick: () => onToggle(item),
                    },
                    {
                      label: "Delete schedule",
                      icon: <Trash2 size={13} />,
                      destructive: true,
                      onClick: () => onDelete(item),
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

import { useState } from "react";
import {
  ArrowDownLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Zap,
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
  const totalMonthlyCommitment = activeSchedules
    .filter((r) => r.type === "Expense")
    .reduce((sum, r) => sum + r.amount, 0);
  const totalMonthlyIncome = activeSchedules
    .filter((r) => r.type === "Income")
    .reduce((sum, r) => sum + r.amount, 0);

  // Dynamic balanced grid (e.g. 4 cards -> 2-col or 4-col, never 3+1 orphan card)
  const gridColsClass =
    filtered.length === 4
      ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      : filtered.length % 3 === 0
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      : filtered.length % 2 === 0
      ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <>
      <PageHeading
        eyebrow="AUTOMATED RECURRING FLOWS"
        title="Recurring Schedules"
        description="Your subscriptions, utility bills, and salary deposits are recorded automatically when due."
        actions={
          <Button size="sm" onClick={onAdd} className="h-9 gap-1.5 text-xs font-semibold shadow-xs">
            <Plus size={15} /> Add Schedule
          </Button>
        }
      />

      {/* Groww-style Automation Summary Banner */}
      <div className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-5 wt-shadow sm:grid-cols-3">
        <div className="flex items-start gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Zap size={22} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Automated Execution
            </p>
            <p className="wt-display mt-0.5 text-xl font-bold text-foreground">
              100% Automatic
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Transactions are recorded on due dates without manual intervention
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scheduled Monthly Outflows
          </p>
          <p className="wt-display mt-0.5 text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            −{money(totalMonthlyCommitment)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activeSchedules.filter((r) => r.type === "Expense").length} automated bills & subscriptions
          </p>
        </div>

        <div className="border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scheduled Monthly Inflows
          </p>
          <p className="wt-display mt-0.5 text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{money(totalMonthlyIncome)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activeSchedules.filter((r) => r.type === "Income").length} automated deposits & salaries
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 wt-shadow">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-muted-foreground">
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
          Showing {filtered.length} of {data.recurring.length} automated flows
        </span>
      </div>

      {/* Recurring Cards Grid */}
      <div className={gridColsClass}>
        {filtered.map((item) => {
          const cat = data.categories.find((c) => c.id === item.categoryId);
          const acc = data.accounts.find((a) => a.id === item.accountId);
          const isIncome = item.type === "Income";

          return (
            <div
              key={item.id}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition-all wt-shadow bg-card ${
                item.enabled ? "border-border hover:border-primary/40" : "border-border/60 opacity-65"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-11 place-items-center rounded-xl ${
                        isIncome
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {isIncome ? <ArrowDownLeft size={20} /> : <CalendarDays size={20} />}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-foreground text-sm">{item.name}</h3>
                        {item.need && !isIncome && (
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
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cat?.name ?? item.type} · {acc?.name ?? "Account"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      item.enabled
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        item.enabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                      }`}
                    />
                    {item.enabled ? "Active" : "Paused"}
                  </span>
                </div>

                {/* Amount & Schedule */}
                <div className="mt-4 border-t border-border pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Cadence: {item.frequency}</span>
                    <span
                      className={`text-lg font-extrabold tabular-nums ${
                        isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      {money(item.amount)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Next auto-run:{" "}
                    <strong className="text-foreground">{formatDate(item.nextDate)}</strong>
                  </p>
                </div>

                {/* Automated Status Indicator (NO Record Now button) */}
                <div className="mt-4">
                  {item.enabled ? (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Zap size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Auto-debit active</span>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-600/80 dark:text-emerald-400/80">
                        Records on due date
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground border border-border">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock size={14} />
                        <span>Schedule paused</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggle(item)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Resume
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Schedule Options
                </span>
                <ActionMenu
                  items={[
                    {
                      label: "Edit schedule",
                      icon: <Pencil size={13} />,
                      onClick: () => onEdit(item),
                    },
                    {
                      label: item.enabled ? "Pause schedule" : "Resume schedule",
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

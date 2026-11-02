import { useState } from "react";
import {
  ArrowDownLeft,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Landmark,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { PageHeading } from "@/components/shared/PageHeading";
import { formatDate } from "@/lib/formatters";
import type { RecurringItem, WealthState } from "@/lib/wealthtrack";

export function RecurringPage({
  data,
  money,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  onNavigateToLoans,
  onRecordEmiPayment,
}: {
  data: WealthState;
  money: (amount: number) => string;
  onAdd: () => void;
  onEdit: (item: RecurringItem) => void;
  onDelete: (item: RecurringItem) => void;
  onToggle: (item: RecurringItem) => void;
  onNavigateToLoans?: () => void;
  onRecordEmiPayment?: (loanId: string) => void;
}) {
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  const filtered = data.recurring.filter((item) => {
    if (priorityFilter !== "All" && item.need !== priorityFilter) return false;
    return true;
  });

  const activeSchedules = data.recurring.filter((r) => r.enabled);
  const totalMonthlyOutflow = activeSchedules
    .filter((r) => r.type === "Expense")
    .reduce((sum, r) => sum + r.amount, 0);
  const totalMonthlySip = activeSchedules
    .filter((r) => r.type === "Investment")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Recurring"
        description="Scheduled bills, loan EMIs, and automated SIP investments."
        isBalancePage
        primaryAction={
          <Button size="sm" onClick={onAdd} className="h-9 gap-1.5 px-3.5 text-xs font-semibold shadow-xs cursor-pointer">
            <Plus size={15} /> Add schedule
          </Button>
        }
      />

      {/* Summary Metric Cards: Enhanced for Mobile & Desktop */}
      <div className="space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 items-start">
        {/* Card 1: Monthly Expenses & EMIs (Primary featured banner on mobile) */}
        <div className="rounded-2xl border border-rose-200/70 dark:border-rose-900/50 bg-gradient-to-r from-rose-50/80 via-rose-50/40 to-background dark:from-rose-950/30 dark:via-background dark:to-card p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Monthly Expenses & EMIs
            </span>
            <span className="size-7 sm:size-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <CalendarDays size={16} />
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-start">
            <span className="text-xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
              −{money(totalMonthlyOutflow)}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground truncate">
              Bills, subscriptions & loans
            </span>
          </div>
        </div>

        {/* Mobile side-by-side grid for Cards 2 & 3 / Desktop columns 2 & 3 */}
        <div className="grid grid-cols-2 gap-2.5 sm:contents">
          {/* Card 2: Monthly SIP Investments */}
          <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-[10.5px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Monthly SIPs
              </span>
              <span className="size-6 sm:size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <TrendingUp size={14} />
              </span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-base sm:text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums truncate">
                {money(totalMonthlySip)}
              </span>
              <span className="text-[10.5px] sm:text-xs text-muted-foreground truncate mt-0.5">
                Automated SIPs
              </span>
            </div>
          </div>

          {/* Card 3: Active Schedules */}
          <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-[10.5px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Active Schedules
              </span>
              <span className="size-6 sm:size-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <CircleDollarSign size={14} />
              </span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-base sm:text-2xl font-black text-foreground tabular-nums truncate">
                {activeSchedules.length} of {data.recurring.length}
              </span>
              <span className="text-[10.5px] sm:text-xs text-muted-foreground truncate mt-0.5">
                Commitments
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-muted-foreground">
            Showing {filtered.length} schedule{filtered.length === 1 ? "" : "s"}
          </span>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterExpanded((prev) => !prev)}
            className={`h-7.5 gap-1.5 px-2.5 text-xs font-bold transition-all cursor-pointer ${
              priorityFilter !== "All"
                ? "border-primary/40 bg-primary/10 text-primary shadow-2xs"
                : "text-muted-foreground hover:text-foreground border-border/80"
            }`}
            aria-expanded={isFilterExpanded}
            aria-label="Toggle priority filter"
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
          <span className="text-[11px] font-semibold text-muted-foreground">Priority:</span>
          <select
            className="wt-field h-8 text-xs py-0 pl-2.5 pr-8 w-auto min-w-[155px] font-semibold cursor-pointer"
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

      {/* Recurring Records: Distinct Self-Contained Cards with Clear Separation */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const cat = data.categories.find((c) => c.id === item.categoryId);
          const linkedLoan = data.loans?.find((l) => l.id === item.loanId);
          const isIncome = item.type === "Income";
          const isInv = item.type === "Investment";

          return (
            <div
              key={item.id}
              className={`rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4.5 shadow-2xs hover:shadow-xs hover:border-border transition-all space-y-3 ${
                item.enabled ? "" : "opacity-60 bg-muted/20"
              }`}
            >
              {/* Top Row: Icon + Name & Badges on Left, Status Pill & Menu on Right */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm shadow-2xs ${
                      isIncome
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : isInv
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    {isIncome ? (
                      <ArrowDownLeft size={18} />
                    ) : isInv ? (
                      <TrendingUp size={18} />
                    ) : (
                      <CalendarDays size={18} />
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-foreground text-sm truncate leading-snug">
                        {item.name}
                      </h3>
                      {item.loanId && (
                        <span className="rounded-md bg-rose-500/10 border border-rose-200/60 dark:border-rose-900/60 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 dark:text-rose-300 shrink-0">
                          EMI{item.totalInstallments ? ` · ${item.paidInstallments || 0}/${item.totalInstallments}` : ""}
                        </span>
                      )}
                      {isInv && (
                        <span className="rounded-md bg-blue-500/10 border border-blue-200/60 dark:border-blue-900/60 px-1.5 py-0.2 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase shrink-0">
                          SIP
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.loanId && linkedLoan
                        ? `${linkedLoan.name} · Outstanding ${money(linkedLoan.currentOutstanding)}`
                        : `${cat?.name ?? item.type}`}
                    </p>
                  </div>
                </div>

                {/* Right controls: Active status pill & ⋯ Action Menu */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggle(item)}
                    className={`rounded-full px-2.5 py-0.8 text-[11px] font-bold transition-colors cursor-pointer ${
                      item.enabled
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    title={item.enabled ? "Click to pause" : "Click to activate"}
                  >
                    {item.enabled ? "Active" : "Paused"}
                  </button>

                  <ActionMenu
                    items={[
                      ...(item.loanId && onRecordEmiPayment
                        ? [
                            {
                              label: "Record EMI Payment",
                              icon: <CircleDollarSign size={13} />,
                              onClick: () => onRecordEmiPayment(item.loanId!),
                            },
                          ]
                        : []),
                      // ...(item.loanId && onNavigateToLoans
                      //   ? [
                      //       {
                      //         label: "View in Loans",
                      //         icon: <Landmark size={13} />,
                      //         onClick: onNavigateToLoans,
                      //       },
                      //     ]
                      //   : []),
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

              {/* Bottom Schedule Pill: Cadence, Next Due Date & Amount cleanly banded together */}
              <div className="flex items-center justify-between rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/50 px-3 py-2 text-xs">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 truncate">
                  <span className="capitalize font-semibold text-foreground/80">{item.frequency}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>Next: {formatDate(item.nextDate)}</span>
                </span>

                <span
                  className={`text-sm font-black tabular-nums shrink-0 ml-2 ${
                    isIncome
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isInv
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isIncome ? "+" : "−"}
                  {money(item.amount)}
                </span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-border/80 bg-card p-8 text-center text-xs text-muted-foreground">
            No recurring schedules found matching filter.
          </div>
        )}
      </div>
    </div>
  );
}

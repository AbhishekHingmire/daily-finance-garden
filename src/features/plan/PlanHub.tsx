import { useState, useEffect } from "react";
import { CalendarDays, ShieldCheck, Tag } from "lucide-react";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { FundsPage } from "@/features/funds/FundsPage";
import { RecurringPage } from "@/features/recurring/RecurringPage";
import type { Category, CustomFund, PurchasePlan, RecurringItem, WealthState } from "@/lib/wealthtrack";

export type PlanSubtab = "budgets" | "goals" | "recurring";

export interface PlanHubProps {
  initialSubtab?: PlanSubtab;
  data: WealthState;
  money: (amount: number) => string;
  categoryTab: "All" | "Expense" | "Income";
  setCategoryTab: (tab: "All" | "Expense" | "Income") => void;
  onAddCategory: () => void;
  onEditCategory: (cat: Category) => void;
  onDeleteCategory: (cat: Category) => void;
  onSaveFund: (fund: CustomFund) => void;
  onDeleteFund: (fundId: string) => void;
  onSavePlan: (plan: PurchasePlan) => void;
  onDeletePlan: (planId: string) => void;
  onQuickDepositFund: (fundId: string, amount: number) => void;
  onSkipFundMonth?: (fundId: string, monthStr: string) => void;
  onAddRecurring: () => void;
  onEditRecurring: (item: RecurringItem) => void;
  onDeleteRecurring: (item: RecurringItem) => void;
  onToggleRecurring: (item: RecurringItem) => void;
}

export function PlanHub({
  initialSubtab = "budgets",
  data,
  money,
  categoryTab,
  setCategoryTab,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onSaveFund,
  onDeleteFund,
  onSavePlan,
  onDeletePlan,
  onQuickDepositFund,
  onSkipFundMonth,
  onAddRecurring,
  onEditRecurring,
  onDeleteRecurring,
  onToggleRecurring,
}: PlanHubProps) {
  const [tab, setTab] = useState<PlanSubtab>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("wt_plan_subtab") as PlanSubtab;
      if (stored && ["budgets", "goals", "recurring"].includes(stored)) {
        return initialSubtab || stored;
      }
    }
    return initialSubtab || "budgets";
  });

  useEffect(() => {
    if (initialSubtab && initialSubtab !== tab) {
      setTab(initialSubtab);
    }
  }, [initialSubtab]);

  const handleTabChange = (nextTab: PlanSubtab) => {
    setTab(nextTab);
    if (typeof window !== "undefined") {
      localStorage.setItem("wt_plan_subtab", nextTab);
    }
  };

  const tabs: { id: PlanSubtab; label: string; icon: typeof Tag; count?: number }[] = [
    { id: "budgets", label: "Budgets", icon: Tag, count: data.categories.length },
    { id: "goals", label: "Goals", icon: ShieldCheck, count: (data.funds ?? []).length },
    { id: "recurring", label: "Recurring", icon: CalendarDays, count: (data.recurring ?? []).length },
  ];

  return (
    <div className="space-y-6">
      {/* Subtab Segmented Switcher */}
      <div className="w-full max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-border/80 pb-3">
        <div className="inline-flex items-center w-full sm:w-auto justify-between sm:justify-start rounded-xl bg-muted/60 p-1 border border-border/60 shadow-2xs">
          {tabs.map(({ id, label, icon: Icon, count }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTabChange(id)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-card text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={14} className={`shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-[11px] sm:text-xs">{label}</span>
                {typeof count === "number" && (
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold ${
                      isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Selected View */}
      {tab === "budgets" && (
        <CategoriesPage
          data={data}
          kind={categoryTab}
          setKind={setCategoryTab}
          onAdd={onAddCategory}
          onEdit={onEditCategory}
          onDelete={onDeleteCategory}
          money={money}
        />
      )}

      {tab === "goals" && (
        <FundsPage
          data={data}
          money={money}
          onSaveFund={onSaveFund}
          onDeleteFund={onDeleteFund}
          onSavePlan={onSavePlan}
          onDeletePlan={onDeletePlan}
          onQuickDepositFund={onQuickDepositFund}
          onSkipFundMonth={onSkipFundMonth}
        />
      )}

      {tab === "recurring" && (
        <RecurringPage
          data={data}
          money={money}
          onAdd={onAddRecurring}
          onEdit={onEditRecurring}
          onDelete={onDeleteRecurring}
          onToggle={onToggleRecurring}
        />
      )}
    </div>
  );
}

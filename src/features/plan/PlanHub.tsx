import { useState, useEffect } from "react";
import { ShieldCheck, Tag } from "lucide-react";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { FundsPage } from "@/features/funds/FundsPage";
import type { Category, CustomFund, PurchasePlan, WealthState } from "@/lib/wealthtrack";

export type PlanSubtab = "budgets" | "goals";

export interface PlanHubProps {
  initialSubtab?: PlanSubtab;
  data: WealthState;
  money: (amount: number) => string;
  categoryTab: "Expense" | "Income" | "Transfer";
  setCategoryTab: (tab: "Expense" | "Income" | "Transfer") => void;
  onAddCategory: () => void;
  onEditCategory: (cat: Category) => void;
  onDeleteCategory: (cat: Category) => void;
  onSaveFund: (fund: CustomFund) => void;
  onDeleteFund: (fundId: string) => void;
  onSavePlan: (plan: PurchasePlan) => void;
  onDeletePlan: (planId: string) => void;
  onQuickDepositFund: (fundId: string, amount: number) => void;
  onSkipFundMonth?: (fundId: string, monthStr: string) => void;
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
}: PlanHubProps) {
  const [tab, setTab] = useState<PlanSubtab>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("wt_plan_subtab") as PlanSubtab;
      if (stored && ["budgets", "goals"].includes(stored)) {
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

  const tabs: { id: PlanSubtab; label: string; mobileLabel: string; icon: typeof Tag; count?: number }[] = [
    { id: "budgets", label: "Budgets & Categories", mobileLabel: "Budgets", icon: Tag, count: data.categories.length },
    { id: "goals", label: "Goals", mobileLabel: "Goals", icon: ShieldCheck, count: (data.funds ?? []).length },
  ];

  return (
    <div className="space-y-6">
      {/* Subtab Segmented Switcher (Sticky directly under top bar) */}
      <div className="sticky top-[56px] md:top-[64px] z-subnav -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-2.5 bg-background border-b border-border/80 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-w-[100vw]">
        <div className="inline-flex items-center w-full sm:w-auto justify-between sm:justify-start rounded-xl bg-muted/80 p-1 border border-border/80 shadow-xs">
          {tabs.map(({ id, label, mobileLabel, icon: Icon, count }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTabChange(id)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-1.5 text-xs font-semibold transition-all min-w-0 overflow-hidden cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-bold ring-1 ring-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon size={14} className={`shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                <span className="text-[11px] sm:text-xs truncate">
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{mobileLabel}</span>
                </span>
                {typeof count === "number" && (
                  <span
                    className={`hidden sm:inline-flex shrink-0 rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold ${
                      isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/15 text-muted-foreground"
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
    </div>
  );
}

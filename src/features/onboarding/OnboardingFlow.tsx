import { useState, useMemo } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  DollarSign,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { CategoryModal } from "@/features/categories/CategoryModal";
import { RecurringModal } from "@/features/recurring/RecurringModal";
import { getWealthRepository } from "@/services/api";
import {
  formatMoney,
  safeAmount,
  type Category,
  type RecurringItem,
  type WealthPreferences,
  type WealthState,
} from "@/lib/wealthtrack";

export function OnboardingFlow({
  data,
  onComplete,
  onUpdatePreferences,
  onUpdateState,
  onOpenAccountModal,
}: {
  data: WealthState;
  onComplete: () => void;
  onUpdatePreferences: (patch: Partial<WealthPreferences>) => void;
  onUpdateState: (patch: Partial<WealthState>) => void;
  onOpenAccountModal?: () => void;
}) {
  const [step, setStep] = useState(0);
  const repository = useMemo(() => getWealthRepository(), []);

  // Category Modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Recurring Modal state
  const [editingRecurring, setEditingRecurring] = useState<RecurringItem | null>(null);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);

  const totalSteps = 4;
  const currency = data.preferences.currency;
  const money = (val: number) => formatMoney(val, currency);

  // Filter only active expense categories
  const expenseCategories = useMemo(
    () => data.categories.filter((c) => !c.archived && c.kind === "Expense"),
    [data.categories]
  );

  // Calculate total monthly budget allocated
  const totalAllocatedBudget = useMemo(
    () => expenseCategories.reduce((sum, c) => sum + (Number(c.monthlyLimit) || 0), 0),
    [expenseCategories]
  );

  // Active recurring expenses
  const recurringExpenses = useMemo(
    () => data.recurring.filter((r) => r.enabled && r.type !== "Income"),
    [data.recurring]
  );

  const totalRecurringMonthly = useMemo(
    () => recurringExpenses.reduce((sum, r) => sum + safeAmount(r.amount), 0),
    [recurringExpenses]
  );

  // Category budget change handler
  const handleUpdateCategoryLimit = async (categoryId: string, limit: number) => {
    const updated = data.categories.map((c) =>
      c.id === categoryId ? { ...c, monthlyLimit: Math.max(0, limit) } : c
    );
    onUpdateState({ categories: updated });
    const target = updated.find((c) => c.id === categoryId);
    if (target) {
      repository.updateCategory(target).catch(() => {});
    }
  };

  const handleSaveCategory = async (cat: Partial<Category>) => {
    if (editingCategory) {
      const updatedCat: Category = { ...editingCategory, ...cat };
      const res = await repository.updateCategory(updatedCat);
      const finalCat = res.success && res.data ? res.data : updatedCat;
      onUpdateState({
        categories: data.categories.map((c) => (c.id === finalCat.id ? finalCat : c)),
      });
    } else {
      const newCat: Category = {
        id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: cat.name || "Custom Category",
        kind: "Expense",
        icon: cat.icon || "📁",
        color: cat.color || "blue",
        monthlyLimit: Number(cat.monthlyLimit) || 5000,
        defaultNeed: cat.defaultNeed || "Need",
        archived: false,
      };
      const res = await repository.addCategory(newCat);
      const finalCat = res.success && res.data ? res.data : newCat;
      onUpdateState({
        categories: [...data.categories, finalCat],
      });
    }
    setCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await repository.archiveCategory(id);
    if (!res.success) return;
    onUpdateState({
      categories: data.categories.filter((c) => c.id !== id),
    });
  };

  // Recurring handler
  const handleSaveRecurring = async (rec: Partial<RecurringItem>) => {
    if (editingRecurring) {
      const updatedRec: RecurringItem = { ...editingRecurring, ...rec };
      const res = await repository.updateRecurring(updatedRec);
      const finalRec = res.success && res.data ? res.data : updatedRec;
      onUpdateState({
        recurring: data.recurring.map((r) => (r.id === finalRec.id ? finalRec : r)),
      });
    } else {
      const newRec: RecurringItem = {
        id: `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: rec.name || "Recurring Item",
        type: "Expense",
        amount: Number(rec.amount) || 0,
        categoryId: rec.categoryId || expenseCategories[0]?.id || "",
        accountId: rec.accountId || "",
        frequency: rec.frequency || "Monthly",
        intervalDays: rec.intervalDays || 30,
        startDate: rec.startDate || new Date().toISOString().slice(0, 10),
        endDate: rec.endDate || "",
        nextDate: rec.nextDate || new Date().toISOString().slice(0, 10),
        need: rec.need || "Need",
        enabled: true,
      };
      const res = await repository.addRecurring(newRec);
      const finalRec = res.success && res.data ? res.data : newRec;
      onUpdateState({
        recurring: [...data.recurring, finalRec],
      });
    }
    setRecurringModalOpen(false);
    setEditingRecurring(null);
  };

  const handleDeleteRecurring = async (id: string) => {
    await repository.deleteRecurring(id);
    onUpdateState({
      recurring: data.recurring.filter((r) => r.id !== id),
    });
  };

  const handleFinish = async () => {
    await repository.saveState({ ...data, onboarded: true });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl border border-border/80 bg-card shadow-2xl p-6 sm:p-8 space-y-6 my-auto">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
              {step + 1}
            </span>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Step {step + 1} of {totalSteps}
              </p>
              <h1 className="text-base sm:text-lg font-black text-foreground">
                {step === 0 && "Welcome & Setup"}
                {step === 1 && "Categories & Fund Allocation"}
                {step === 2 && "Recurring Expenses & Subscriptions"}
                {step === 3 && "Review & Launch"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-7 bg-primary"
                    : i < step
                    ? "w-3 bg-primary/40"
                    : "w-3 bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 0: Welcome & Basic Preferences */}
        {step === 0 && (
          <div className="space-y-6 py-2">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
                <Sparkles className="size-6 text-primary" />
                Welcome to your financial space
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                A focused expense tracker designed for mindful spending. Set your monthly fund allocations,
                track category outgoings, and stay within your budget without the clutter of complex accounts.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Your Name or Nickname"
                value={data.preferences.displayName || data.profile?.fullName || ""}
                onChange={(displayName) => {
                  onUpdatePreferences({ displayName });
                  if (data.profile) {
                    onUpdateState({ profile: { ...data.profile, fullName: displayName } });
                  }
                }}
                placeholder="e.g. Abhishek"
              />

              <SelectField
                label="Preferred Currency"
                value={data.preferences.currency}
                onChange={(currency) =>
                  onUpdatePreferences({ currency: currency as WealthPreferences["currency"] })
                }
                options={[
                  { value: "INR", label: "₹ INR (Indian Rupee)" },
                  { value: "USD", label: "$ USD (US Dollar)" },
                  { value: "EUR", label: "€ EUR (Euro)" },
                  { value: "GBP", label: "£ GBP (British Pound)" },
                ]}
              />
            </div>
          </div>
        )}

        {/* STEP 1: Categories & Monthly Budget Fund Allocation */}
        {step === 1 && (
          <div className="space-y-5 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 border border-border/70 rounded-2xl p-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Monthly Budget Allocation
                </span>
                <p className="text-2xl font-black text-primary tabular-nums mt-0.5">
                  {money(totalAllocatedBudget)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Allocated across {expenseCategories.length} spending categories
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryModalOpen(true);
                }}
                className="gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Category</span>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Review and adjust your monthly spending cap for each category below:
            </p>

            <div className="max-h-[360px] overflow-y-auto wt-scrollbar space-y-2 pr-1">
              {expenseCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-9 place-items-center rounded-xl bg-muted/60 text-lg shrink-0">
                      {cat.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {cat.name}
                      </p>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {cat.defaultNeed || "Need"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative w-28 sm:w-36">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-muted-foreground">
                        {currency === "INR" ? "₹" : "$"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        className="wt-field h-8 pl-6 pr-2 text-xs font-bold tabular-nums"
                        value={cat.monthlyLimit || ""}
                        placeholder="0"
                        onChange={(e) =>
                          handleUpdateCategoryLimit(cat.id, Number(e.target.value) || 0)
                        }
                      />
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategoryModalOpen(true);
                      }}
                      title="Edit Category"
                    >
                      <Pencil size={13} />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteCategory(cat.id)}
                      title="Delete Category"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Recurring Expenses (Subscriptions, Rent, EMIs) */}
        {step === 2 && (
          <div className="space-y-5 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 border border-border/70 rounded-2xl p-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Monthly Recurring Outflows
                </span>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
                  −{money(totalRecurringMonthly)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {recurringExpenses.length} recurring commitment{recurringExpenses.length !== 1 ? "s" : ""}
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingRecurring(null);
                  setRecurringModalOpen(true);
                }}
                className="gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Recurring Expense</span>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Add your monthly fixed expenses such as rent, subscriptions, loan EMIs, or bills (optional):
            </p>

            <div className="max-h-[340px] overflow-y-auto wt-scrollbar space-y-2 pr-1">
              {recurringExpenses.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2 rounded-2xl border border-dashed border-border/80">
                  <p>No recurring expenses added yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingRecurring(null);
                      setRecurringModalOpen(true);
                    }}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Plus size={13} /> Add first recurring bill
                  </Button>
                </div>
              ) : (
                recurringExpenses.map((rec) => {
                  const cat = data.categories.find((c) => c.id === rec.categoryId);
                  return (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3 hover:border-border transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="grid size-9 place-items-center rounded-xl bg-muted/60 text-lg shrink-0">
                          {cat?.icon || "📅"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {rec.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {rec.frequency} · {cat?.name || "General"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs sm:text-sm font-extrabold text-foreground tabular-nums">
                          {money(rec.amount)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingRecurring(rec);
                            setRecurringModalOpen(true);
                          }}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteRecurring(rec.id)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Review & Launch Cockpit */}
        {step === 3 && (
          <div className="space-y-6 py-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-1">
              <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-500" />
                Ready to launch your expense tracker!
              </h2>
              <p className="text-xs text-muted-foreground">
                Your categories and budget fund allocations are set up and ready to monitor.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total Monthly Budget
                </span>
                <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                  {money(totalAllocatedBudget)}
                </p>
                <p className="text-[11px] text-muted-foreground">Across {expenseCategories.length} categories</p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recurring Commitments
                </span>
                <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                  −{money(totalRecurringMonthly)}
                </p>
                <p className="text-[11px] text-muted-foreground">{recurringExpenses.length} recurring schedules</p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Flexible Spending
                </span>
                <p className="text-xl sm:text-2xl font-black text-primary tabular-nums">
                  {money(Math.max(0, totalAllocatedBudget - totalRecurringMonthly))}
                </p>
                <p className="text-[11px] text-muted-foreground">Uncommitted budget headroom</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-2">
              <p className="text-xs font-bold text-foreground">Top Category Budgets:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {expenseCategories.slice(0, 6).map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs bg-card border border-border/60 rounded-xl p-2 min-w-0">
                    <span className="text-base shrink-0">{c.icon}</span>
                    <div className="min-w-0 truncate">
                      <p className="font-bold text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{money(c.monthlyLimit || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="gap-1 text-xs font-semibold cursor-pointer"
          >
            <ChevronLeft size={14} />
            <span>Back</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (step === totalSteps - 1) {
                handleFinish();
              } else {
                setStep((s) => Math.min(totalSteps - 1, s + 1));
              }
            }}
            className="gap-1.5 px-5 h-9 text-xs font-bold cursor-pointer shadow-xs"
          >
            <span>{step === totalSteps - 1 ? "Launch WealthTrack" : "Continue"}</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Category Modal for Step 1 */}
      {categoryModalOpen && (
        <CategoryModal
          category={editingCategory}
          kind="Expense"
          onClose={() => {
            setCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          onSave={handleSaveCategory}
        />
      )}

      {/* Recurring Modal for Step 2 */}
      {recurringModalOpen && (
        <RecurringModal
          item={editingRecurring}
          data={data}
          onClose={() => {
            setRecurringModalOpen(false);
            setEditingRecurring(null);
          }}
          onSave={handleSaveRecurring}
        />
      )}
    </div>
  );
}

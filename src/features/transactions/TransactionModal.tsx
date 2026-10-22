import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Landmark, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { Modal } from "@/components/shared/Modal";
import { CategoryModal } from "@/features/categories/CategoryModal";
import { matchCategoryIcon } from "@/lib/icon-matcher";
import {
  DEBT_TRANSACTION_TYPES,
  type Category,
  type Transaction,
  type TransactionType,
  type WealthState,
} from "@/lib/wealthtrack";

export function TransactionModal({
  data,
  form,
  setForm,
  errors,
  edit,
  onClose,
  onSave,
  onAddCategory,
}: {
  data: WealthState;
  form: Partial<Transaction>;
  setForm: (form: Partial<Transaction> | ((current: Partial<Transaction>) => Partial<Transaction>)) => void;
  errors: Record<string, string>;
  edit: boolean;
  onClose: () => void;
  onSave: (keepOpen?: boolean) => void;
  onAddCategory?: (category: Category) => void;
}) {
  const type = (form.type ?? "Expense") as TransactionType;
  const isDebtType = DEBT_TRANSACTION_TYPES.includes(type);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const currencySymbol =
    data.preferences.currency === "INR"
      ? "₹"
      : data.preferences.currency === "USD"
      ? "$"
      : data.preferences.currency === "EUR"
      ? "€"
      : "£";

  const isInflowType =
    type === "Income" || type === "Borrow / Loan Taken" || type === "Debt Recovery";

  // Available categories for current type
  const categories = useMemo(() => {
    return data.categories.filter(
      (c) => !c.archived && (isInflowType ? c.kind === "Income" : c.kind === "Expense")
    );
  }, [data.categories, isInflowType]);

  // Frequently used top categories for instant 1-click chip selection
  const quickCategories = useMemo(() => {
    return categories.slice(0, 6);
  }, [categories]);

  const [showMore, setShowMore] = useState<boolean>(() => {
    return Boolean(
      edit ||
      form.merchant ||
      form.notes ||
      (form.tags && form.tags.length > 0) ||
      (form.date && !form.date.startsWith(new Date().toISOString().slice(0, 10)))
    );
  });

  const set = (key: keyof Transaction, value: any) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSelectCategory = (catId: string) => {
    const cat = data.categories.find((c) => c.id === catId);
    setForm((current) => {
      const isWant = cat?.defaultNeed
        ? cat.defaultNeed === "Want"
        : ["Shopping", "Entertainment", "Dining out", "Travel", "Personal Care"].includes(
            cat?.name ?? ""
          );
      return {
        ...current,
        categoryId: catId,
        description:
          !current.description || categories.some((c) => c.name === current.description)
            ? cat?.name ?? ""
            : current.description,
        need: current.need ?? (isWant ? "Want" : "Need"),
      };
    });
  };

  const handleQuickCreateCategory = (catForm: Partial<Category>) => {
    if (!catForm.name?.trim()) return;
    const newCat: Category = {
      id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: catForm.name.trim(),
      kind: catForm.kind ?? (isInflowType ? "Income" : "Expense"),
      icon: catForm.icon ?? matchCategoryIcon(catForm.name.trim(), "📁"),
      color: catForm.color ?? "blue",
      monthlyLimit: Number(catForm.monthlyLimit) || 0,
      defaultNeed: catForm.defaultNeed ?? "Need",
    };
    onAddCategory?.(newCat);
    handleSelectCategory(newCat.id);
    setIsCreatingCategory(false);
  };

  const handleDropdownSelectCategory = (val: string) => {
    if (val === "__new_category__") {
      setIsCreatingCategory(true);
    } else {
      handleSelectCategory(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if ((e.target as HTMLElement).tagName.toLowerCase() === "textarea") return;
      e.preventDefault();
      onSave(false);
    }
  };

  return (
    <Modal
      title={edit ? "Edit Transaction" : "Quick Add Transaction"}
      description="Enter amount and category. Everything else is optional."
      onClose={onClose}
    >
      <form onSubmit={(e) => { e.preventDefault(); onSave(false); }} onKeyDown={handleKeyDown} className="space-y-4">
        {/* Primary Type Selector: Expense | Income | Loan / Debt | Transfer */}
        <div className="flex rounded-xl bg-muted p-1">
          {[
            { id: "Expense", label: "Expense" },
            { id: "Income", label: "Income" },
            { id: "Loan / Debt", label: "Loan / Debt" },
            { id: "Transfer", label: "Transfer" },
          ].map((tab) => {
            const isTabActive =
              tab.id === "Loan / Debt"
                ? isDebtType
                : type === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  isTabActive
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  if (tab.id === "Loan / Debt") {
                    setForm((cur) => {
                      const catLoan = data.categories.find((c) => c.id === "cat-loan-emi")?.id;
                      return {
                        ...cur,
                        type: "EMI / Loan Payment",
                        categoryId: catLoan || cur.categoryId,
                        description: cur.description || "Loan EMI",
                      };
                    });
                  } else if (tab.id === "Transfer") {
                    setForm((cur) => ({
                      ...cur,
                      type: "Transfer",
                      categoryId: "",
                      description: "Account Transfer",
                    }));
                  } else {
                    setForm((cur) => ({
                      ...cur,
                      type: tab.id as TransactionType,
                    }));
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loan & Debt Sub-Category Pill Toggle */}
        {isDebtType && (
          <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.03] p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Debt Transaction Kind
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: "EMI / Loan Payment", label: "EMI Repayment", icon: "💳", hint: "Outflow" },
                { id: "Borrow / Loan Taken", label: "Borrow Money", icon: "🏦", hint: "Inflow" },
                { id: "Lend / Loan Given", label: "Lend Money", icon: "🤝", hint: "Outflow" },
                { id: "Debt Recovery", label: "Debt Recovery", icon: "💵", hint: "Inflow" },
              ].map((item) => {
                const isSelected = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const nextType = item.id as TransactionType;
                      let defaultCat = "";
                      let defaultDesc = "";
                      if (nextType === "EMI / Loan Payment") {
                        defaultCat = data.categories.find((c) => c.id === "cat-loan-emi")?.id || "";
                        defaultDesc = "Loan EMI";
                      } else if (nextType === "Borrow / Loan Taken") {
                        defaultCat = data.categories.find((c) => c.id === "cat-borrow")?.id || "";
                        defaultDesc = "Loan Borrowed";
                      } else if (nextType === "Lend / Loan Given") {
                        defaultCat = data.categories.find((c) => c.id === "cat-lend")?.id || "";
                        defaultDesc = "Money Lent";
                      } else if (nextType === "Debt Recovery") {
                        defaultCat = data.categories.find((c) => c.id === "cat-debt-recovery")?.id || "";
                        defaultDesc = "Debt Repaid";
                      }
                      setForm((current) => ({
                        ...current,
                        type: nextType,
                        categoryId: defaultCat || current.categoryId,
                        description: current.description || defaultDesc,
                      }));
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-card text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="mt-0.5 text-center">{item.label}</span>
                    <span
                      className={`text-[10px] font-semibold mt-0.5 ${
                        item.hint === "Inflow"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {item.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Optional Loan Linkage for EMI Repayment */}
            {type === "EMI / Loan Payment" && (data.loans?.length ?? 0) > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 space-y-1.5">
                <label className="block">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Landmark size={13} className="text-primary" />
                    <span className="wt-label font-bold text-foreground">
                      Link to Loan (Reduces Outstanding Balance)
                    </span>
                  </div>
                  <select
                    className="wt-field h-9 text-xs"
                    value={form.loanId || ""}
                    onChange={(e) => {
                      const selectedLoan = data.loans?.find((l) => l.id === e.target.value);
                      setForm((cur) => ({
                        ...cur,
                        loanId: e.target.value || undefined,
                        amount: cur.amount || (selectedLoan ? selectedLoan.emiAmount : undefined),
                        merchant: cur.merchant || selectedLoan?.lenderInstitution || "",
                        description:
                          cur.description && cur.description !== "Loan EMI"
                            ? cur.description
                            : selectedLoan
                            ? `${selectedLoan.name} EMI`
                            : "Loan EMI",
                      }));
                    }}
                  >
                    <option value="">-- None / General Debt Payment --</option>
                    {data.loans?.map((loan) => (
                      <option key={loan.id} value={loan.id}>
                        {loan.name} ({loan.lenderInstitution} · Outstanding: {currencySymbol}
                        {loan.currentOutstanding})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        )}

        {/* 1. Large Amount Input */}
        <div>
          <label className="block">
            <span className="wt-label">
              Amount ({currencySymbol}) <span className="text-destructive">*</span>
            </span>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-lg font-black text-muted-foreground">
                {currencySymbol}
              </span>
              <input
                className="wt-field h-12 pl-9 text-2xl font-black tracking-tight"
                type="number"
                min="0.01"
                step="any"
                placeholder="0"
                value={form.amount !== undefined && form.amount !== null ? form.amount : ""}
                onChange={(e) =>
                  set("amount", e.target.value === "" ? undefined : Number(e.target.value))
                }
                autoFocus
              />
            </div>
            {errors.amount && (
              <span className="mt-1 block text-xs text-destructive">{errors.amount}</span>
            )}
          </label>
        </div>

        {/* 2. Category Selection (For Expense, Income, and Loan types) */}
        {type !== "Transfer" && (
          <div className="space-y-2">
            <span className="wt-label">Category <span className="text-destructive">*</span></span>

            {/* Quick-Pick Category Chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {quickCategories.map((c) => {
                const isSelected = form.categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCategory(c.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs font-bold"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsCreatingCategory(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-primary/60 bg-primary/5 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                title="Create a new category"
              >
                <Plus size={13} />
                <span>+ Create</span>
              </button>
            </div>

            {/* Complete Category Dropdown */}
            <div className="pt-1">
              <SelectField
                label=""
                value={form.categoryId ?? ""}
                onChange={handleDropdownSelectCategory}
                options={[
                  ...categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
                  { value: "__new_category__", label: "＋ Create new category…" },
                ]}
                placeholder="Or select other category…"
                error={errors.categoryId}
              />
            </div>
          </div>
        )}

        {/* 3. Account Selection */}
        {type === "Transfer" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Transfer From"
              value={form.accountId ?? ""}
              onChange={(v) => set("accountId", v)}
              options={data.accounts
                .filter((a) => !a.archived)
                .map((a) => ({ value: a.id, label: a.name }))}
              error={errors.accountId}
              required
            />
            <SelectField
              label="Transfer To"
              value={form.destinationAccountId ?? ""}
              onChange={(v) => set("destinationAccountId", v)}
              options={data.accounts
                .filter((a) => !a.archived)
                .map((a) => ({ value: a.id, label: a.name }))}
              error={errors.destinationAccountId}
              required
            />
          </div>
        ) : (
          <SelectField
            label={isInflowType ? "Deposit into Account" : "Paid with Account"}
            value={form.accountId ?? ""}
            onChange={(v) => set("accountId", v)}
            options={data.accounts
              .filter((a) => !a.archived)
              .map((a) => ({ value: a.id, label: `${a.name} (${a.kind})` }))}
            error={errors.accountId}
            required
          />
        )}

        {/* 4. Collapsible Accordion: More options (optional) */}
        <div className="border-t border-border pt-2">
          <button
            type="button"
            className="flex w-full items-center justify-between py-1 text-xs font-bold text-muted-foreground hover:text-foreground"
            onClick={() => setShowMore(!showMore)}
          >
            <span className="flex items-center gap-1.5 text-primary">
              <Sparkles size={13} />
              {showMore ? "Hide optional details" : "More options (date, merchant, priority, notes)"}
            </span>
            {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showMore && (
            <div className="mt-3 space-y-3 rounded-xl border border-border bg-muted/20 p-3.5 animate-in fade-in-50 duration-150">
              {/* Custom Title */}
              <InputField
                label="Custom Description (optional)"
                placeholder="e.g. Nature's Basket, Team Lunch (defaults to category)"
                value={form.description ?? ""}
                onChange={(v) => set("description", v)}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Date & Time */}
                <InputField
                  label="Date & Time"
                  type="datetime-local"
                  value={(form.date ?? new Date().toISOString()).slice(0, 16)}
                  onChange={(v) => set("date", v)}
                  error={errors.date}
                />

                {/* Priority Classification Dropdown */}
                <div>
                  <label className="block">
                    <span className="wt-label">Priority Classification</span>
                    <select
                      className="wt-field text-xs font-semibold"
                      value={form.need ?? "Need"}
                      onChange={(e) => set("need", e.target.value as "Need" | "Want")}
                    >
                      <option value="Need">Need (Essential / Contractual obligation)</option>
                      <option value="Want">Want (Discretionary spending)</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InputField
                  label={
                    type === "Borrow / Loan Taken"
                      ? "Lender / Source"
                      : type === "Lend / Loan Given" || type === "Debt Recovery"
                      ? "Borrower / Person"
                      : "Merchant / Entity (optional)"
                  }
                  placeholder="e.g. HDFC Bank, Rohan Verma, Airtel"
                  value={form.merchant ?? ""}
                  onChange={(v) => set("merchant", v)}
                />
                <SelectField
                  label="Payment Method"
                  value={form.paymentMethod ?? "UPI"}
                  onChange={(v) => set("paymentMethod", v)}
                  options={["UPI", "Bank transfer", "Auto-debit", "Card", "Cash", "Wallet", "Other"].map((m) => ({
                    value: m,
                    label: m,
                  }))}
                />
              </div>

              <label className="block">
                <span className="wt-label">Notes (optional)</span>
                <textarea
                  className="wt-field min-h-14 resize-y text-xs"
                  placeholder="Add any extra details…"
                  value={form.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {!edit && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onSave(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <Plus size={14} /> Save & Add Another
              </Button>
            )}
            <Button type="submit" className="text-xs font-semibold px-5">
              {edit ? "Save Changes" : "Save Transaction"}
            </Button>
          </div>
        </div>
      </form>

      {isCreatingCategory && (
        <CategoryModal
          category={null}
          kind={isInflowType ? "Income" : "Expense"}
          onClose={() => setIsCreatingCategory(false)}
          onSave={handleQuickCreateCategory}
        />
      )}
    </Modal>
  );
}

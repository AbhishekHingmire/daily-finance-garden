import { useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, FileSpreadsheet, FileUp, Landmark, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { Modal } from "@/components/shared/Modal";
import { CategoryModal } from "@/features/categories/CategoryModal";
import { matchCategoryIcon } from "@/lib/icon-matcher";
import {
  DEBT_TRANSACTION_TYPES,
  getAccountBalance,
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
  onOpenBulkImport,
}: {
  data: WealthState;
  form: Partial<Transaction>;
  setForm: (form: Partial<Transaction> | ((current: Partial<Transaction>) => Partial<Transaction>)) => void;
  errors: Record<string, string>;
  edit: boolean;
  onClose: () => void;
  onSave: (keepOpen?: boolean) => void;
  onAddCategory?: (category: Category) => void;
  onOpenBulkImport?: () => void;
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

  // Always collapsed by default across all scenarios per user specification
  const [showMore, setShowMore] = useState<boolean>(false);

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
      title={edit ? "Edit transaction" : "Add transaction"}
      description="Enter amount and category. Everything else is optional."
      onClose={onClose}
    >
      <form onSubmit={(e) => { e.preventDefault(); onSave(false); }} onKeyDown={handleKeyDown} className="space-y-4">
        {/* Bulk Upload Option */}
        {!edit && onOpenBulkImport && (
          <div className="flex items-center justify-between gap-2.5 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 truncate">
                <span className="font-bold text-foreground">Need bulk entry?</span>
                <span className="text-muted-foreground ml-1 hidden sm:inline">Upload multiple expenses & income via Excel.</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenBulkImport();
              }}
              className="h-7 shrink-0 gap-1.5 px-2.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 hover:text-primary cursor-pointer"
            >
              <FileUp size={13} />
              <span>Bulk Upload (Excel)</span>
            </Button>
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

        {/* 2. Type & Category Selection (Both strictly in Dropdowns as requested) */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block">
              <span className="wt-label">
                Transaction Type <span className="text-destructive">*</span>
              </span>
              <select
                className="wt-field h-10 text-xs font-bold"
                value={type}
                onChange={(e) => {
                  const t = e.target.value as TransactionType;
                  let defaultCat = "";
                  let defaultDesc = "";
                  if (t === "Transfer") {
                    defaultDesc = "Account Transfer";
                  } else if (t === "EMI / Loan Payment") {
                    defaultCat = data.categories.find((c) => c.id === "cat-loan-emi")?.id || "";
                    defaultDesc = "Loan EMI";
                  } else if (t === "Borrow / Loan Taken") {
                    defaultCat = data.categories.find((c) => c.id === "cat-borrow")?.id || "";
                    defaultDesc = "Loan Borrowed";
                  } else if (t === "Lend / Loan Given") {
                    defaultCat = data.categories.find((c) => c.id === "cat-lend")?.id || "";
                    defaultDesc = "Money Lent";
                  } else if (t === "Debt Recovery") {
                    defaultCat = data.categories.find((c) => c.id === "cat-debt-recovery")?.id || "";
                    defaultDesc = "Debt Repaid";
                  }
                  setForm((cur) => ({
                    ...cur,
                    type: t,
                    categoryId: defaultCat || (t === "Transfer" ? "" : cur.categoryId),
                    description: cur.description || defaultDesc,
                  }));
                }}
              >
                <option value="Expense">Expense (Money spent / Outflow)</option>
                <option value="Income">Income (Earnings / Salary / Inflow)</option>
                <option value="EMI / Loan Payment">EMI / Loan Repayment (Outflow to debt)</option>
                <option value="Borrow / Loan Taken">Borrow / Loan Taken (Inflow borrowed)</option>
                <option value="Lend / Loan Given">Lend / Loan Given (Outflow advance to someone)</option>
                <option value="Debt Recovery">Debt Recovery (Inflow lent money returned)</option>
                <option value="Transfer">Transfer between Accounts</option>
              </select>
            </label>
          </div>

          {/* Category Dropdown */}
          {type !== "Transfer" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="wt-label mb-0">
                  Category <span className="text-destructive">*</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(true)}
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={12} /> Create Category
                </button>
              </div>
              <select
                className="wt-field h-10 text-xs font-semibold"
                value={form.categoryId ?? ""}
                onChange={(e) => handleDropdownSelectCategory(e.target.value)}
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
                <option value="__new_category__">＋ Create new category…</option>
              </select>
              {errors.categoryId && (
                <span className="mt-1 block text-xs text-destructive">{errors.categoryId}</span>
              )}
            </div>
          )}
        </div>

        {/* Optional Loan Linkage Dropdown for EMI Repayment */}
        {type === "EMI / Loan Payment" && (data.loans?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1.5">
            <label className="block">
              <div className="flex items-center gap-1.5 mb-1">
                <Landmark size={13} className="text-primary" />
                <span className="wt-label font-bold text-foreground mb-0">
                  Link to Loan (Reduces Outstanding Balance)
                </span>
              </div>
              <select
                className="wt-field h-9 text-xs font-semibold"
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

        {/* 3. Account Selection */}
        {(() => {
          const selectedAcc = data.accounts.find((a) => a.id === form.accountId);
          const selectedAccBalance = selectedAcc ? getAccountBalance(selectedAcc, data.transactions) : 0;
          const numAmt = Number(form.amount) || 0;
          const isDebit = !isInflowType;
          const isBankOrCash = selectedAcc && !["Credit Card", "Loan"].includes(selectedAcc.kind);
          const isInsufficient = isDebit && isBankOrCash && numAmt > selectedAccBalance;
          const isLowBalance = isDebit && isBankOrCash && !isInsufficient && selectedAccBalance - numAmt < 2000 && numAmt > 0;

          return type === "Transfer" ? (
            <div className="space-y-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Transfer From *"
                  value={form.accountId ?? ""}
                  onChange={(v) => set("accountId", v)}
                  options={data.accounts
                    .filter((a) => !a.archived)
                    .map((a) => {
                      const bal = getAccountBalance(a, data.transactions);
                      return {
                        value: a.id,
                        label: `${a.name} (${a.kind}) · ${currencySymbol}${bal.toLocaleString("en-IN")}`,
                      };
                    })}
                  error={errors.accountId}
                  required
                />
                <SelectField
                  label="Transfer To *"
                  value={form.destinationAccountId ?? ""}
                  onChange={(v) => set("destinationAccountId", v)}
                  options={data.accounts
                    .filter((a) => !a.archived && a.id !== form.accountId)
                    .map((a) => {
                      const bal = getAccountBalance(a, data.transactions);
                      return {
                        value: a.id,
                        label: `${a.name} (${a.kind}) · ${currencySymbol}${bal.toLocaleString("en-IN")}`,
                      };
                    })}
                  error={errors.destinationAccountId}
                  required
                />
              </div>
              {selectedAcc && (
                <div className="text-[11px] px-1">
                  {isInsufficient ? (
                    <p className="text-destructive font-semibold flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      Insufficient balance in {selectedAcc.name}: Available {currencySymbol}{selectedAccBalance.toLocaleString("en-IN")}
                    </p>
                  ) : isLowBalance ? (
                    <p className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertTriangle size={12} className="shrink-0" />
                      Low balance alert: Balance will drop to {currencySymbol}{(selectedAccBalance - numAmt).toLocaleString("en-IN")}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Source account balance: {currencySymbol}{selectedAccBalance.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <SelectField
                label={isInflowType ? "Deposit into Account *" : "Paid with Account *"}
                value={form.accountId ?? ""}
                onChange={(v) => set("accountId", v)}
                options={data.accounts
                  .filter((a) => !a.archived)
                  .map((a) => {
                    const bal = getAccountBalance(a, data.transactions);
                    return {
                      value: a.id,
                      label: `${a.name} (${a.kind}) · ${currencySymbol}${bal.toLocaleString("en-IN")}`,
                    };
                  })}
                error={errors.accountId}
                required
              />
              {selectedAcc && (
                <div className="mt-1 text-[11px] px-1">
                  {isInsufficient ? (
                    <p className="text-destructive font-semibold flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      Insufficient balance: Available {currencySymbol}{selectedAccBalance.toLocaleString("en-IN")}, Required {currencySymbol}{numAmt.toLocaleString("en-IN")}
                    </p>
                  ) : isLowBalance ? (
                    <p className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertTriangle size={12} className="shrink-0" />
                      Low balance alert: Balance will drop to {currencySymbol}{(selectedAccBalance - numAmt).toLocaleString("en-IN")}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Available balance: {currencySymbol}{selectedAccBalance.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })()}

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
                label="Custom Description"
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
                    <span className="wt-label">Need or want?</span>
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
                      : "Merchant / Entity"
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
                <span className="wt-label">Notes</span>
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

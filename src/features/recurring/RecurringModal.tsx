import { useState } from "react";
import { Calculator, Landmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { Modal } from "@/components/shared/Modal";
import { CategoryModal } from "@/features/categories/CategoryModal";
import { matchCategoryIcon } from "@/lib/icon-matcher";
import type { Category, RecurringItem, WealthState } from "@/lib/wealthtrack";

export function RecurringModal({
  item,
  data,
  onClose,
  onSave,
  onAddCategory,
}: {
  item: RecurringItem | null;
  data: WealthState;
  onClose: () => void;
  onSave: (form: Partial<RecurringItem>) => void;
  onAddCategory?: (category: Category) => void;
}) {
  const currencySymbol =
    data.preferences.currency === "INR"
      ? "₹"
      : data.preferences.currency === "USD"
      ? "$"
      : data.preferences.currency === "EUR"
      ? "€"
      : "£";

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [form, setForm] = useState<Partial<RecurringItem>>(() =>
    item
      ? { ...item }
      : {
          name: "",
          type: "Expense",
          amount: 0,
          categoryId: data.categories[0]?.id ?? "",
          accountId: data.accounts[0]?.id ?? "",
          frequency: "Monthly",
          intervalDays: 30,
          startDate: new Date().toISOString().slice(0, 10),
          endDate: "",
          nextDate: new Date().toISOString().slice(0, 10),
          need: "Need",
          enabled: true,
        }
  );

  const [isInstallmentPlan, setIsInstallmentPlan] = useState<boolean>(
    Boolean(item?.totalInstallments || item?.loanId)
  );
  const [totalInstallments, setTotalInstallments] = useState<number | "">(
    item?.totalInstallments !== undefined ? item.totalInstallments : ""
  );
  const [paidInstallments, setPaidInstallments] = useState<number | "">(
    item?.paidInstallments !== undefined ? item.paidInstallments : 0
  );
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    item?.loanId ?? ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalNum = Number(totalInstallments) || 0;
  const paidNum = Number(paidInstallments) || 0;
  const remainingInstallments = Math.max(0, totalNum - paidNum);

  const handleQuickCreateCategory = (catForm: Partial<Category>) => {
    if (!catForm.name?.trim()) return;
    const newCat: Category = {
      id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: catForm.name.trim(),
      kind: catForm.kind ?? (form.type === "Investment" ? "Expense" : (form.type ?? "Expense")),
      icon: catForm.icon ?? matchCategoryIcon(catForm.name.trim(), "📁"),
      color: catForm.color ?? "blue",
      monthlyLimit: Number(catForm.monthlyLimit) || 0,
      defaultNeed: catForm.defaultNeed ?? "Need",
    };
    onAddCategory?.(newCat);
    setForm((f) => ({ ...f, categoryId: newCat.id }));
    setIsCreatingCategory(false);
  };

  const handleCategoryChange = (val: string) => {
    if (val === "__new_category__") {
      setIsCreatingCategory(true);
    } else {
      setForm((f) => ({ ...f, categoryId: val }));
    }
  };

  const handleLoanSelect = (loanId: string) => {
    setSelectedLoanId(loanId);
    if (!loanId) return;

    const loan = data.loans?.find((l) => l.id === loanId);
    if (loan) {
      setForm((f) => ({
        ...f,
        name: `${loan.name} (EMI)`,
        amount: loan.emiAmount,
        accountId: loan.repaymentAccountId || f.accountId,
      }));
      setTotalInstallments(loan.tenureMonths);
      setPaidInstallments(loan.paidEmisCount || 0);
      setIsInstallmentPlan(true);
    }
  };

  const handleSave = () => {
    const errs: Record<string, string> = {};

    if (!form.name?.trim()) {
      errs.name = "Enter schedule title or description.";
    }

    if (form.amount === undefined || form.amount === null || Number(form.amount) <= 0) {
      errs.amount = "Enter an amount greater than 0.";
    }

    if (isInstallmentPlan) {
      if (totalInstallments === "" || totalNum <= 0) {
        errs.totalInstallments = "Total installments must be at least 1.";
      }
      if (paidInstallments === "" || paidNum < 0) {
        errs.paidInstallments = "Installments paid cannot be negative.";
      } else if (totalNum > 0 && paidNum > totalNum) {
        errs.paidInstallments = `Paid installments (${paidNum}) cannot exceed total installments (${totalNum}).`;
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onSave({
      ...form,
      loanId: selectedLoanId || undefined,
      totalInstallments: isInstallmentPlan ? (totalNum || undefined) : undefined,
      paidInstallments: isInstallmentPlan ? paidNum : undefined,
    });
  };

  return (
    <Modal
      title={item ? "Edit Recurring Schedule" : "Add Recurring Schedule"}
      description="Automate reminders for repeating bills, loan EMIs, subscriptions, or paychecks."
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <InputField
          label="Schedule Name / Description"
          value={form.name ?? ""}
          onChange={(name) => {
            setForm((f) => ({ ...f, name }));
            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
          }}
          placeholder="e.g. Netflix Subscription, Apartment Rent, Car Loan EMI, Monthly Salary"
          error={errors.name}
          required
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField
            label="Type"
            value={form.type ?? "Expense"}
            onChange={(type) => {
              const newType = type as RecurringItem["type"];
              setForm((f) => ({
                ...f,
                type: newType,
                instrumentType: newType === "Investment" ? f.instrumentType || "Mutual fund" : undefined,
              }));
            }}
            options={[
              { value: "Expense", label: "Expense (Outflow / Bill / EMI)" },
              { value: "Income", label: "Income (Inflow / Salary)" },
              { value: "Investment", label: "Investment (SIP / Recurring)" },
            ]}
          />
          {form.type === "Investment" ? (
            <SelectField
              label="Asset / Instrument Type"
              value={form.instrumentType ?? "Mutual fund"}
              onChange={(instrumentType) =>
                setForm((f) => ({ ...f, instrumentType: instrumentType as any }))
              }
              options={[
                { value: "Mutual fund", label: "Mutual Fund (MF)" },
                { value: "ETF", label: "Exchange Traded Fund (ETF)" },
                { value: "Stocks", label: "Stocks & Equity" },
                { value: "Fixed deposit", label: "Fixed Deposit / RD" },
                { value: "Other", label: "Other Asset" },
              ]}
            />
          ) : (
            <SelectField
              label="Priority Classification"
              value={form.need ?? "Need"}
              onChange={(need) => setForm((f) => ({ ...f, need: need as "Need" | "Want" }))}
              options={[
                { value: "Need", label: "Need (Essential)" },
                { value: "Want", label: "Want (Discretionary)" },
              ]}
            />
          )}

          <label className="block">
            <span className="wt-label">
              Amount ({currencySymbol}) <span className="text-destructive">*</span>
            </span>
            <input
              className="wt-field font-semibold"
              type="number"
              min="0.01"
              step="any"
              value={form.amount !== undefined && form.amount !== 0 ? form.amount : ""}
              onChange={(e) => {
                setForm((f) => ({ ...f, amount: e.target.value === "" ? 0 : Number(e.target.value) }));
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
              }}
              placeholder="0.00"
              required
            />
            {errors.amount && (
              <span className="mt-1 block text-xs text-destructive">{errors.amount}</span>
            )}
          </label>
        </div>

        {/* Investment holding link section */}
        {form.type === "Investment" && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
            <span className="block text-xs font-bold text-foreground">
              Link to Investment Holding (Auto-increments Portfolio)
            </span>
            <p className="text-[11px] text-muted-foreground">
              Every time this recurring SIP advances, the linked holding's invested capital and current valuation will automatically increment.
            </p>
            <select
              className="wt-field text-xs font-semibold"
              value={form.investmentId ?? ""}
              onChange={(e) => {
                const invId = e.target.value;
                const holding = data.investments?.find((h) => h.id === invId);
                setForm((f) => ({
                  ...f,
                  investmentId: invId || undefined,
                  name: holding ? `${holding.name} (SIP)` : f.name,
                  instrumentType: holding ? (holding.assetType as any) : f.instrumentType,
                }));
              }}
            >
              <option value="">＋ Link or create holding with name above…</option>
              {data.investments?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.assetType}) · Current: {currencySymbol}{h.currentAmount.toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* PROMINENT LOAN / EMI INSTALLMENT TRACKING (ASK HOW MUCH PAID & HOW MUCH LEFT) */}
        {form.type === "Expense" && (
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="size-4 rounded accent-primary cursor-pointer"
                  checked={isInstallmentPlan}
                  onChange={(e) => setIsInstallmentPlan(e.target.checked)}
                />
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calculator size={14} className="text-primary" /> Track as Loan EMI or Installment Plan
                </span>
              </label>

              {isInstallmentPlan && totalNum > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold text-primary tabular-nums">
                  {paidNum} of {totalNum} Paid · {remainingInstallments} Left
                </span>
              )}
            </div>

            {isInstallmentPlan && (
              <div className="space-y-3 pt-1 border-t border-border/50">
                {/* Optional link to active registered loan */}
                {(data.loans ?? []).length > 0 && (
                  <div>
                    <label className="wt-label mb-1">Link to Registered Loan (Optional)</label>
                    <select
                      className="wt-field text-xs font-medium bg-background"
                      value={selectedLoanId}
                      onChange={(e) => handleLoanSelect(e.target.value)}
                    >
                      <option value="">-- Standalone Installment / No Linked Loan --</option>
                      {data.loans?.map((loan) => (
                        <option key={loan.id} value={loan.id}>
                          {loan.name} ({loan.lenderInstitution}) · {currencySymbol}{loan.emiAmount.toLocaleString()}/mo · {loan.paidEmisCount || 0}/{loan.tenureMonths} paid
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Total Installments */}
                  <label className="block">
                    <span className="wt-label">
                      Total Installments (Months) <span className="text-destructive">*</span>
                    </span>
                    <input
                      className="wt-field font-semibold bg-background"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 36 or 60"
                      value={totalInstallments}
                      onChange={(e) => {
                        setTotalInstallments(e.target.value === "" ? "" : Math.floor(Number(e.target.value)));
                        if (errors.totalInstallments) setErrors((prev) => ({ ...prev, totalInstallments: "" }));
                      }}
                    />
                    {errors.totalInstallments && (
                      <span className="mt-1 block text-xs text-destructive">{errors.totalInstallments}</span>
                    )}
                  </label>

                  {/* Installments Paid (Asked directly: e.g. 4 or 10) */}
                  <label className="block">
                    <span className="wt-label">
                      Installments Already Paid <span className="text-destructive">*</span>
                    </span>
                    <input
                      className="wt-field font-semibold text-emerald-600 dark:text-emerald-400 bg-background"
                      type="number"
                      min="0"
                      max={totalNum || 600}
                      step="1"
                      placeholder="e.g. 4 or 10"
                      value={paidInstallments}
                      onChange={(e) => {
                        setPaidInstallments(e.target.value === "" ? "" : Math.floor(Number(e.target.value)));
                        if (errors.paidInstallments) setErrors((prev) => ({ ...prev, paidInstallments: "" }));
                      }}
                    />
                    {errors.paidInstallments && (
                      <span className="mt-1 block text-xs text-destructive">{errors.paidInstallments}</span>
                    )}
                  </label>

                  {/* Installments Left (Calculated automatically) */}
                  <label className="block">
                    <span className="wt-label">Installments Left</span>
                    <div className="wt-field font-extrabold text-amber-600 dark:text-amber-400 bg-muted/60 flex items-center justify-between select-none">
                      <span>{remainingInstallments} remaining</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        {totalNum > 0 ? `${((paidNum / totalNum) * 100).toFixed(0)}%` : "0%"}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Progress bar preview */}
                {totalNum > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.min((paidNum / totalNum) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{paidNum} paid so far ({currencySymbol}{((form.amount || 0) * paidNum).toLocaleString()})</span>
                      <span>{remainingInstallments} remaining ({currencySymbol}{((form.amount || 0) * remainingInstallments).toLocaleString()})</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="wt-label mb-0">Category</span>
              <button
                type="button"
                onClick={() => setIsCreatingCategory(true)}
                className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <Plus size={12} /> New
              </button>
            </div>
            <SelectField
              label=""
              value={form.categoryId ?? ""}
              onChange={handleCategoryChange}
              options={[
                ...data.categories
                  .filter((c) => !c.archived && (form.type === "Investment" ? true : c.kind === (form.type ?? "Expense")))
                  .map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
                { value: "__new_category__", label: "＋ Create new category…" },
              ]}
            />
          </div>
          <SelectField
            label="Account"
            value={form.accountId ?? ""}
            onChange={(accountId) => setForm((f) => ({ ...f, accountId }))}
            options={data.accounts
              .filter((a) => !a.archived)
              .map((a) => ({ value: a.id, label: a.name }))}
          />
        </div>

        <div
          className={`grid gap-3 ${
            form.frequency === "Custom interval" ? "sm:grid-cols-4" : "sm:grid-cols-3"
          }`}
        >
          <SelectField
            label="Frequency"
            value={form.frequency ?? "Monthly"}
            onChange={(frequency) =>
              setForm((f) => ({
                ...f,
                frequency: frequency as RecurringItem["frequency"],
                intervalDays: frequency === "Custom interval" ? f.intervalDays || 14 : f.intervalDays,
              }))
            }
            options={["Weekly", "Monthly", "Yearly", "Custom interval"].map((v) => ({
              value: v,
              label: v,
            }))}
          />
          {form.frequency === "Custom interval" && (
            <InputField
              label="Interval (Days)"
              type="number"
              min="1"
              max="365"
              value={form.intervalDays ?? 14}
              onChange={(val) =>
                setForm((f) => ({ ...f, intervalDays: Math.max(1, Number(val) || 1) }))
              }
              placeholder="e.g. 15"
              required
            />
          )}
          <InputField
            label="Start Date"
            type="date"
            value={form.startDate ?? ""}
            onChange={(startDate) => setForm((f) => ({ ...f, startDate }))}
          />
          <InputField
            label="Next Due Date"
            type="date"
            value={form.nextDate ?? ""}
            onChange={(nextDate) => setForm((f) => ({ ...f, nextDate }))}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={form.enabled ?? true}
            onCheckedChange={(enabled) => setForm((f) => ({ ...f, enabled: Boolean(enabled) }))}
          />
          <span className="text-sm font-medium">Keep schedule active</span>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{item ? "Save Changes" : "Add Schedule"}</Button>
        </div>
      </div>

      {isCreatingCategory && (
        <CategoryModal
          category={null}
          kind={form.type === "Investment" ? "Expense" : (form.type ?? "Expense")}
          onClose={() => setIsCreatingCategory(false)}
          onSave={handleQuickCreateCategory}
        />
      )}
    </Modal>
  );
}

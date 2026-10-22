import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { Modal } from "@/components/shared/Modal";
import {
  INVESTMENT_OUTFLOW_ACTIONS,
  type InvestmentAction,
  type InvestmentInstrument,
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
}: {
  data: WealthState;
  form: Partial<Transaction>;
  setForm: (form: Partial<Transaction> | ((current: Partial<Transaction>) => Partial<Transaction>)) => void;
  errors: Record<string, string>;
  edit: boolean;
  onClose: () => void;
  onSave: (keepOpen?: boolean) => void;
}) {
  const type = form.type ?? "Expense";
  const currencySymbol =
    data.preferences.currency === "INR"
      ? "₹"
      : data.preferences.currency === "USD"
      ? "$"
      : data.preferences.currency === "EUR"
      ? "€"
      : "£";

  const categories = data.categories.filter(
    (category) =>
      !category.archived &&
      (type === "Income" ? category.kind === "Income" : category.kind === "Expense")
  );

  const set = (key: keyof Transaction, value: any) => setForm((current) => ({ ...current, [key]: value }));
  const [showOptional, setShowOptional] = useState<boolean>(
    Boolean(form.merchant || form.notes || form.tags?.length)
  );

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

  return (
    <Modal
      title={edit ? "Edit Transaction" : "Quick Add Transaction"}
      description="Select a category, enter the amount, and save in seconds."
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        {/* Type Selector */}
        <div>
          <span className="wt-label">Transaction Type</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(["Expense", "Income", "Transfer", "Refund", "Investment"] as TransactionType[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={type === t ? "default" : "outline"}
                className="h-9 text-xs font-semibold"
                onClick={() => set("type", t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        {/* Category Dropdown */}
        {type !== "Transfer" && type !== "Adjustment" && type !== "Investment" && (
          <div>
            <SelectField
              label="Category"
              value={form.categoryId ?? ""}
              onChange={handleSelectCategory}
              options={categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
              placeholder="Choose category…"
              error={errors.categoryId}
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Auto-fills title and sets smart 50/30/20 Need or Want priority.
            </p>
          </div>
        )}

        {/* Investment-specific fields */}
        {type === "Investment" && (
          <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border bg-muted/20 p-3.5">
            <SelectField
              label="Instrument Type"
              value={form.instrumentType ?? ""}
              onChange={(v) => set("instrumentType", v)}
              options={([
                "Mutual fund",
                "SIP",
                "Fixed deposit",
                "Stocks",
                "ETF",
                "Bonds",
                "Other",
              ] as InvestmentInstrument[]).map((v) => ({ value: v, label: v }))}
              placeholder="Choose instrument…"
              error={errors.instrumentType}
              required
            />
            <SelectField
              label="Investment Action"
              value={form.investmentAction ?? ""}
              onChange={(v) => set("investmentAction", v)}
              options={([
                "Contribution",
                "Purchase",
                "Sale",
                "Maturity",
                "Dividend",
                "Fee",
                "Valuation",
              ] as InvestmentAction[]).map((v) => ({ value: v, label: v }))}
              placeholder="Choose action…"
              error={errors.investmentAction}
              required
            />
            <InputField
              label="Fund / Instrument Name"
              placeholder="e.g. Parag Parikh Flexi Cap"
              value={form.instrumentName ?? ""}
              onChange={(v) => set("instrumentName", v)}
            />
            <div className="grid grid-cols-2 gap-2">
              <InputField
                label="Units (optional)"
                type="number"
                min="0"
                step="0.0001"
                value={form.units ?? ""}
                onChange={(v) =>
                  setForm((current) => {
                    const units = v === "" ? undefined : Number(v);
                    const price = current.pricePerUnit;
                    return {
                      ...current,
                      units,
                      amount: units && price ? Number((units * price).toFixed(2)) : current.amount,
                    };
                  })
                }
              />
              <InputField
                label="Price / Unit (optional)"
                type="number"
                min="0"
                step="0.01"
                value={form.pricePerUnit ?? ""}
                onChange={(v) =>
                  setForm((current) => {
                    const price = v === "" ? undefined : Number(v);
                    const units = current.units;
                    return {
                      ...current,
                      pricePerUnit: price,
                      amount: units && price ? Number((units * price).toFixed(2)) : current.amount,
                    };
                  })
                }
              />
            </div>
            <p className="text-[11px] text-muted-foreground sm:col-span-2">
              {form.investmentAction === "Valuation"
                ? "Valuation entries record current portfolio worth; no cash balance moves."
                : INVESTMENT_OUTFLOW_ACTIONS.includes(form.investmentAction as InvestmentAction)
                ? "Outflow: This amount will be debited from the chosen account."
                : "Inflow: This amount will be credited to the chosen account."}
            </p>
          </div>
        )}

        {/* Amount & Account */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="wt-label">
              Amount ({currencySymbol}) <span className="text-destructive">*</span>
            </span>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">
                {currencySymbol}
              </span>
              <input
                className="wt-field pl-8 text-lg font-bold"
                type="number"
                min={type === "Adjustment" ? undefined : "0.01"}
                step="0.01"
                placeholder="0.00"
                value={form.amount ?? ""}
                onChange={(e) => set("amount", Number(e.target.value))}
                autoFocus
              />
            </div>
            {errors.amount && <span className="mt-1 block text-xs text-destructive">{errors.amount}</span>}
          </label>

          {type === "Transfer" ? (
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="From Account"
                value={form.accountId ?? ""}
                onChange={(v) => set("accountId", v)}
                options={data.accounts
                  .filter((a) => !a.archived)
                  .map((a) => ({ value: a.id, label: a.name }))}
                error={errors.accountId}
                required
              />
              <SelectField
                label="To Account"
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
              label="Account"
              value={form.accountId ?? ""}
              onChange={(v) => set("accountId", v)}
              options={data.accounts
                .filter((a) => !a.archived)
                .map((a) => ({ value: a.id, label: `${a.name} (${a.kind})` }))}
              error={errors.accountId}
              required
            />
          )}
        </div>

        {/* Priority Classification Dropdown */}
        <div>
          <label className="block min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="wt-label mb-0">
                Priority Classification {type === "Expense" && <span className="text-destructive">*</span>}
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                50/30/20 Rule
              </span>
            </div>
            <select
              className="wt-field"
              value={form.need ?? "Need"}
              onChange={(e) => set("need", e.target.value as "Need" | "Want")}
              aria-label="Priority Classification"
            >
              <option value="Need">Need (Essential — Rent, groceries, utility bills, healthcare, obligations)</option>
              <option value="Want">Want (Discretionary — Dining out, hobbies, shopping, leisure)</option>
            </select>
          </label>
        </div>

        {/* Date and Time */}
        <InputField
          label="Date & Time"
          type="datetime-local"
          value={(form.date ?? "").slice(0, 16)}
          onChange={(v) => set("date", v)}
          error={errors.date}
          required
        />

        {/* Optional Collapsible Details */}
        <div className="border-t border-border pt-2">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline py-1"
            onClick={() => setShowOptional(!showOptional)}
          >
            <span>
              {showOptional
                ? "− Hide optional details"
                : "+ Add custom title, merchant, notes or payment method"}
            </span>
          </button>

          {showOptional && (
            <div className="mt-3 space-y-3 rounded-xl border border-border bg-muted/30 p-3.5">
              <InputField
                label="Custom Title / Description (optional)"
                placeholder="e.g. Weekly Groceries (defaults to category)"
                value={form.description ?? ""}
                onChange={(v) => set("description", v)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <InputField
                  label="Merchant / Entity"
                  placeholder="e.g. Nature's Basket, Uber, Jio"
                  value={form.merchant ?? ""}
                  onChange={(v) => set("merchant", v)}
                />
                <SelectField
                  label="Payment Method"
                  value={form.paymentMethod ?? "UPI"}
                  onChange={(v) => set("paymentMethod", v)}
                  options={["UPI", "Card", "Cash", "Bank transfer", "Wallet", "Other"].map((m) => ({
                    value: m,
                    label: m,
                  }))}
                />
              </div>
              <label className="block">
                <span className="wt-label">Notes</span>
                <textarea
                  className="wt-field min-h-16 resize-y text-xs"
                  placeholder="Add any extra notes…"
                  value={form.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {!edit && (
              <Button type="button" variant="outline" onClick={() => onSave(true)} className="gap-1.5 text-xs font-semibold">
                <Plus size={14} /> Save & Add Another
              </Button>
            )}
            <Button type="button" onClick={() => onSave(false)} className="text-xs font-semibold">
              {edit ? "Save Changes" : "Save Transaction"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

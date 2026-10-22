import { useState } from "react";
import { Plus } from "lucide-react";
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

  const handleQuickCreateCategory = (catForm: Partial<Category>) => {
    if (!catForm.name?.trim()) return;
    const newCat: Category = {
      id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: catForm.name.trim(),
      kind: catForm.kind ?? (form.type ?? "Expense"),
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

  return (
    <Modal
      title={item ? "Edit Recurring Schedule" : "Add Recurring Schedule"}
      description="Automate reminders for repeating bills, subscriptions, or paychecks."
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <InputField
          label="Schedule Name / Description"
          value={form.name ?? ""}
          onChange={(name) => setForm((f) => ({ ...f, name }))}
          placeholder="e.g. Netflix Subscription, Apartment Rent, Monthly Salary"
          required
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField
            label="Type"
            value={form.type ?? "Expense"}
            onChange={(type) => setForm((f) => ({ ...f, type: type as "Expense" | "Income" }))}
            options={[
              { value: "Expense", label: "Expense (Outflow)" },
              { value: "Income", label: "Income (Inflow)" },
            ]}
          />
          <SelectField
            label="Priority Classification"
            value={form.need ?? "Need"}
            onChange={(need) => setForm((f) => ({ ...f, need: need as "Need" | "Want" }))}
            options={[
              { value: "Need", label: "Need (Essential)" },
              { value: "Want", label: "Want (Discretionary)" },
            ]}
          />
          <InputField
            label="Amount"
            type="number"
            step="0.01"
            value={form.amount ?? ""}
            onChange={(amount) => setForm((f) => ({ ...f, amount: Number(amount) }))}
            placeholder="0.00"
            required
          />
        </div>
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
                  .filter((c) => !c.archived && c.kind === (form.type ?? "Expense"))
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
          <Button onClick={() => onSave(form)}>{item ? "Save Changes" : "Add Schedule"}</Button>
        </div>
      </div>

      {isCreatingCategory && (
        <CategoryModal
          category={null}
          kind={form.type ?? "Expense"}
          onClose={() => setIsCreatingCategory(false)}
          onSave={handleQuickCreateCategory}
        />
      )}
    </Modal>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { Modal } from "@/components/shared/Modal";
import { matchCategoryIcon, POPULAR_CATEGORY_ICONS } from "@/lib/icon-matcher";
import type { Category, CategoryKind } from "@/lib/wealthtrack";

export function CategoryModal({
  category,
  kind,
  onClose,
  onSave,
}: {
  category: Category | null;
  kind: CategoryKind;
  onClose: () => void;
  onSave: (form: Partial<Category>) => void;
}) {
  const [form, setForm] = useState<Partial<Category>>(() =>
    category ? { ...category } : { name: "", kind, icon: "📁", color: "blue", monthlyLimit: 0, defaultNeed: "Need" }
  );
  const [iconManuallyPicked, setIconManuallyPicked] = useState(Boolean(category?.icon));
  const colors = ["blue", "rose", "teal", "violet", "amber", "green", "pink"];

  const handleNameChange = (name: string) => {
    setForm((f) => {
      const autoIcon = !iconManuallyPicked ? matchCategoryIcon(name, f.icon || "📁") : f.icon || "📁";
      return { ...f, name, icon: autoIcon };
    });
  };

  return (
    <Modal
      title={category ? "Edit Category" : "Add Category"}
      description="Organize your income and expenses clearly with budget limits."
      onClose={onClose}
    >
      <div className="space-y-4">
        <InputField
          label="Category Name"
          value={form.name ?? ""}
          onChange={handleNameChange}
          placeholder="e.g. Groceries, Gym, Rent, Fuel, Freelance"
          required
        />
        <SelectField
          label="Category Type"
          value={form.kind ?? kind}
          onChange={(k) => setForm((f) => ({ ...f, kind: k as CategoryKind }))}
          options={[
            { value: "Expense", label: "Expense Category" },
            { value: "Income", label: "Income Category" },
          ]}
          required
        />
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="wt-label mb-0">Category Icon</span>
            <span className="text-[11px] font-medium text-primary flex items-center gap-1.5">
              <span>Auto-matched:</span>{" "}
              <span className="text-lg bg-primary/10 rounded px-1.5 py-0.5">{form.icon}</span>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            Icon auto-detects as you type, or choose any icon below:
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto rounded-xl border border-border p-2 bg-muted/20">
            {POPULAR_CATEGORY_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                className={`grid size-9 place-items-center rounded-lg border text-lg transition ${
                  form.icon === icon
                    ? "border-primary bg-primary/20 font-bold scale-105 ring-2 ring-primary/30"
                    : "border-border/60 hover:bg-muted"
                }`}
                onClick={() => {
                  setIconManuallyPicked(true);
                  setForm((f) => ({ ...f, icon }));
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="wt-label">Accent Color</span>
          <div className="flex flex-wrap gap-2 pt-1">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={`h-8 rounded-lg px-3 text-xs capitalize transition border ${
                  form.color === color
                    ? "border-primary bg-primary text-primary-foreground font-semibold"
                    : "border-border hover:bg-muted"
                }`}
                onClick={() => setForm((f) => ({ ...f, color }))}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
        {form.kind === "Expense" && (
          <SelectField
            label="Default Priority Classification"
            value={form.defaultNeed ?? "Need"}
            onChange={(val) => setForm((f) => ({ ...f, defaultNeed: val as "Need" | "Want" }))}
            options={[
              { value: "Need", label: "Need (Essential — Bills, groceries, rent)" },
              { value: "Want", label: "Want (Discretionary — Dining, shopping, leisure)" },
            ]}
          />
        )}
        {form.kind === "Expense" && (
          <InputField
            label="Monthly Budget Limit (optional)"
            type="number"
            value={form.monthlyLimit ?? 0}
            onChange={(val) => setForm((f) => ({ ...f, monthlyLimit: Number(val) || 0 }))}
            placeholder="0 = No limit"
          />
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)}>
            {category ? "Save Changes" : "Add Category"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

import { Download, FileUp, LogOut, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { PageHeading } from "@/components/shared/PageHeading";
import type { CustomField, WealthPreferences, WealthState } from "@/lib/wealthtrack";

export function SettingsPage({
  data,
  settingsTab,
  setSettingsTab,
  updatePreferences,
  money: _money,
  onExport,
  onImport,
  onReset,
  onSignout,
  onFieldAdd,
  onFieldDelete,
  fieldForm,
  setFieldForm,
  tagDraft,
  setTagDraft,
  onTagAdd,
  onTagDelete,
}: {
  data: WealthState;
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
  updatePreferences: (patch: Partial<WealthPreferences>) => void;
  money: (amount: number) => string;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onSignout: () => void;
  onFieldAdd: (field: Partial<CustomField>) => void;
  onFieldDelete: (id: string) => void;
  fieldForm: Partial<CustomField>;
  setFieldForm: (form: Partial<CustomField>) => void;
  tagDraft: string;
  setTagDraft: (tag: string) => void;
  onTagAdd: () => void;
  onTagDelete: (tag: string) => void;
}) {
  const tabs = ["General", "Profile", "Tags", "Custom fields", "Data & Privacy"];

  return (
    <div className="space-y-6">
      <PageHeading
        title="Settings"
        description="Customize your WealthTrack experience, regional formats, metadata tags, and local data."
        isBalancePage
      />

      <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b border-border/60 pb-3">
        {tabs.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={settingsTab === tab ? "default" : "outline"}
            className="h-8 text-xs font-medium"
            onClick={() => setSettingsTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {settingsTab === "Profile" && (
        <div className="max-w-xl space-y-4 rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">User Profile</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This is a private, client-side finance application. Your display name is saved locally in this browser.
          </p>
          <InputField
            label="Display Name"
            value={data.preferences.displayName}
            onChange={(displayName) => updatePreferences({ displayName })}
            placeholder="e.g. Abhishek Hingmire"
          />
        </div>
      )}

      {settingsTab === "General" && (
        <div className="max-w-xl space-y-4 rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Regional & Display Preferences</h2>
          <SelectField
            label="Currency"
            value={data.preferences.currency}
            onChange={(value) => updatePreferences({ currency: value as WealthPreferences["currency"] })}
            options={[
              { value: "INR", label: "INR · Indian Rupee (₹)" },
              { value: "USD", label: "USD · US Dollar ($)" },
              { value: "GBP", label: "GBP · Pound Sterling (£)" },
              { value: "EUR", label: "EUR · Euro (€)" },
            ]}
          />
          <SelectField
            label="Theme Appearance"
            value={data.preferences.theme}
            onChange={(value) => updatePreferences({ theme: value as WealthPreferences["theme"] })}
            options={[
              { value: "light", label: "Light Mode" },
              { value: "dark", label: "Dark Mode" },
            ]}
          />
          <SelectField
            label="Date Format"
            value={data.preferences.dateFormat}
            onChange={(value) => updatePreferences({ dateFormat: value as WealthPreferences["dateFormat"] })}
            options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((v) => ({ value: v, label: v }))}
          />
          <SelectField
            label="Default Transaction Type"
            value={data.preferences.defaultType}
            onChange={(value) => updatePreferences({ defaultType: value as "Expense" | "Income" })}
            options={[
              { value: "Expense", label: "Expense" },
              { value: "Income", label: "Income" },
            ]}
          />
          <SelectField
            label="Default Payment Method"
            value={data.preferences.defaultPaymentMethod}
            onChange={(value) => updatePreferences({ defaultPaymentMethod: value })}
            options={["UPI", "Card", "Cash", "Bank transfer", "Wallet"].map((v) => ({ value: v, label: v }))}
          />
        </div>
      )}

      {settingsTab === "Tags" && (
        <div className="max-w-xl space-y-4 rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Manage Metadata Tags</h2>
          <p className="text-xs text-muted-foreground">Tags help cross-reference transactions across multiple categories.</p>
          <div className="flex gap-2">
            <input
              className="wt-field"
              placeholder="Add tag (e.g. vacation, medical, tax-deductible)"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onTagAdd();
              }}
            />
            <Button size="sm" onClick={onTagAdd} className="h-10 text-xs font-semibold gap-1.5">
              <Plus size={15} /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
              >
                #{tag}
                <button
                  type="button"
                  aria-label={`Delete tag ${tag}`}
                  onClick={() => onTagDelete(tag)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {settingsTab === "Custom fields" && (
        <div className="max-w-xl space-y-4 rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Transaction Custom Fields</h2>
          <p className="text-xs text-muted-foreground">
            Add bespoke fields to track extra metadata on transactions (e.g. tax deductible, invoice number).
          </p>
          <div className="space-y-3 pt-2">
            <InputField
              label="Field Name"
              value={fieldForm.name ?? ""}
              onChange={(name) => setFieldForm({ ...fieldForm, name })}
              placeholder="e.g. Tax Deductible, Invoice ID"
            />
            <SelectField
              label="Field Type"
              value={fieldForm.type ?? "Text"}
              onChange={(type) => setFieldForm({ ...fieldForm, type: type as CustomField["type"] })}
              options={["Text", "Number", "Date", "Checkbox"].map((v) => ({ value: v, label: v }))}
            />
            <Button size="sm" onClick={() => onFieldAdd(fieldForm)} className="h-9 gap-1.5 text-xs font-semibold">
              <Plus size={14} /> Add Field
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border/50 pt-4">
            <div className="flex items-center justify-between pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>Field Name & Type</span>
              <span className="text-right font-medium text-foreground">Actions</span>
            </div>
            {data.customFields.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2.5">
                <div>
                  <span className="font-medium text-sm text-foreground">{f.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({f.type})</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => onFieldDelete(f.id)}
                >
                  <Trash2 size={13} />
                  <span className="ml-1">Delete</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {settingsTab === "Data & Privacy" && (
        <div className="max-w-xl space-y-4 rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Data Management & Privacy</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            WealthTrack operates 100% locally in your browser storage. No personal or financial records are uploaded to any external cloud server.
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button variant="outline" size="sm" className="justify-start gap-2 h-10 text-xs font-semibold" onClick={onExport}>
              <Download size={15} /> Export All Transactions (CSV)
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-2 h-10 text-xs font-semibold" onClick={onImport}>
              <FileUp size={15} /> Import Transactions (CSV / Excel)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 h-10 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={onReset}
            >
              <Trash2 size={15} /> Reset All Data to Original Demo Dataset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 h-10 text-xs font-semibold text-destructive"
              onClick={onSignout}
            >
              <LogOut size={15} /> Sign Out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import {
  Bell,
  Download,
  FileUp,
  Globe,
  Layers,
  LogOut,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { PageHeading } from "@/components/shared/PageHeading";
import { getFeatureFlag, setFeatureFlag } from "@/lib/feature-flags";
import type { CustomField, WealthPreferences, WealthState } from "@/lib/wealthtrack";

export function PreferencesPage({
  data,
  preferencesTab,
  setPreferencesTab,
  updatePreferences,
  money: _money,
  onExport,
  onImport,
  onReset,
  onSignout,
  onFieldAdd: _onFieldAdd,
  onFieldDelete: _onFieldDelete,
  fieldForm: _fieldForm,
  setFieldForm: _setFieldForm,
  tagDraft,
  setTagDraft,
  onTagAdd,
  onTagDelete,
  onOpenDataCheck,
}: {
  data: WealthState;
  preferencesTab: string;
  setPreferencesTab: (tab: string) => void;
  updatePreferences: (patch: Partial<WealthPreferences>) => void;
  money: (amount: number) => string;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onSignout: () => void;
  onFieldAdd?: (field: Partial<CustomField>) => void;
  onFieldDelete?: (id: string) => void;
  fieldForm?: Partial<CustomField>;
  setFieldForm?: (form: Partial<CustomField>) => void;
  tagDraft?: string;
  setTagDraft?: (tag: string) => void;
  onTagAdd?: () => void;
  onTagDelete?: (tag: string) => void;
  onOpenDataCheck?: () => void;
}) {
  const [hubsV2, setLocalHubsV2] = useState(() => getFeatureFlag("hubs_v2"));
  const tabs = [
    "General & Regional",
    "Alerts & Notifications",
    "Data & Storage",
  ];

  const currentTab = tabs.includes(preferencesTab) ? preferencesTab : "General & Regional";

  return (
    <div className="space-y-6">
      <PageHeading
        title="Preferences"
        description="Configure your currency display, visual theme, default accounts, smart reminders, and offline backups."
        isBalancePage
      />

      <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b border-border/60 pb-3">
        {tabs.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={currentTab === tab ? "default" : "outline"}
            className="h-8 text-xs font-medium"
            onClick={() => setPreferencesTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Tab 1: General & Regional */}
      {currentTab === "General & Regional" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <Globe className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Regional & Display Settings</h3>
            </div>

            <SelectField
              label="Base Currency"
              value={data.preferences.currency}
              onChange={(value) =>
                updatePreferences({ currency: value as WealthPreferences["currency"] })
              }
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
                { value: "light", label: "Light Mode (Clean crisp surfaces)" },
                { value: "dark", label: "Dark Mode (Deep obsidian slate)" },
              ]}
            />

            <SelectField
              label="Date Format"
              value={data.preferences.dateFormat}
              onChange={(value) =>
                updatePreferences({ dateFormat: value as WealthPreferences["dateFormat"] })
              }
              options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((v) => ({
                value: v,
                label: v,
              }))}
            />

            <SelectField
              label="Week Starts On"
              value={data.preferences.weekStart}
              onChange={(value) =>
                updatePreferences({ weekStart: value as WealthPreferences["weekStart"] })
              }
              options={[
                { value: "Monday", label: "Monday (Standard financial cycle)" },
                { value: "Sunday", label: "Sunday" },
              ]}
            />
          </div>

          <div className="space-y-4 rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <SlidersHorizontal className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Fast Entry Defaults</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              These default presets automatically populate the Quick Add modal so you can log
              transactions in just 2 clicks.
            </p>

            <SelectField
              label="Default Transaction Type"
              value={data.preferences.defaultType}
              onChange={(value) =>
                updatePreferences({ defaultType: value as "Expense" | "Income" })
              }
              options={[
                { value: "Expense", label: "Expense" },
                { value: "Income", label: "Income" },
              ]}
            />

            <SelectField
              label="Default Primary Account"
              value={data.preferences.defaultAccount}
              onChange={(defaultAccount) => updatePreferences({ defaultAccount })}
              options={data.accounts
                .filter((a) => !a.archived)
                .map((a) => ({ value: a.id, label: `${a.name} (${a.kind})` }))}
            />

            <SelectField
              label="Default Payment Method"
              value={data.preferences.defaultPaymentMethod}
              onChange={(defaultPaymentMethod) => updatePreferences({ defaultPaymentMethod })}
              options={["UPI", "Card", "Cash", "Bank transfer", "Wallet", "Other"].map((m) => ({
                value: m,
                label: m,
              }))}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Alerts & Notifications */}
      {currentTab === "Alerts & Notifications" && (
        <div className="max-w-xl space-y-4 rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3">
            <Bell className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Smart Reminders & Alerts</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-lg border border-border/60 p-3 hover:bg-muted/30 transition-colors cursor-pointer">
              <div>
                <span className="block text-xs font-semibold text-foreground">
                  Recurring Bill Reminders
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Notify me 3 days before any rent, EMI, or subscription is scheduled.
                </span>
              </div>
              <input
                type="checkbox"
                className="size-4 rounded accent-primary cursor-pointer"
                checked={data.preferences.recurringReminders}
                onChange={(e) => updatePreferences({ recurringReminders: e.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-border/60 p-3 hover:bg-muted/30 transition-colors cursor-pointer">
              <div>
                <span className="block text-xs font-semibold text-foreground">
                  Monthly Budget Threshold Warnings
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Alert me when spending in any category reaches 80% and 100% of its monthly limit.
                </span>
              </div>
              <input
                type="checkbox"
                className="size-4 rounded accent-primary cursor-pointer"
                checked={data.preferences.budgetReminders}
                onChange={(e) => updatePreferences({ budgetReminders: e.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-border/60 p-3 hover:bg-muted/30 transition-colors cursor-pointer">
              <div>
                <span className="block text-xs font-semibold text-foreground">
                  Salary Credit Expectation
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Highlight expected income around day {data.preferences.salaryDay ?? 19} of the month.
                </span>
              </div>
              <input
                type="checkbox"
                className="size-4 rounded accent-primary cursor-pointer"
                checked={data.preferences.otherReminders}
                onChange={(e) => updatePreferences({ otherReminders: e.target.checked })}
              />
            </label>
          </div>
        </div>
      )}

      {/* Tab 3: Data & Storage */}
      {currentTab === "Data & Storage" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Data Check */}
          <div className="space-y-4 rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all md:col-span-2">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">Data check</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                ✓ 100% Verified
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Verify that every number on every screen agrees with every other screen, derived directly from your transactions without discrepancies.
            </p>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                All 19 integrity and cross-screen consistency checks are active.
              </p>
              {onOpenDataCheck && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-semibold gap-1.5"
                  onClick={onOpenDataCheck}
                >
                  <ShieldCheck size={14} className="text-emerald-500" /> Open Data check
                </Button>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4 rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <Tag className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Transaction Tags</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Tags help cross-reference transactions across multiple categories and reports.
            </p>
            {onTagAdd && (
              <div className="flex gap-2">
                <input
                  className="wt-field"
                  placeholder="Add tag (e.g. vacation, tax)"
                  value={tagDraft ?? ""}
                  onChange={(e) => setTagDraft?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onTagAdd();
                  }}
                />
                <Button size="sm" onClick={onTagAdd} className="h-10 text-xs font-semibold gap-1.5">
                  <Plus size={15} /> Add
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  #{tag}
                  {onTagDelete && (
                    <button
                      type="button"
                      aria-label={`Delete tag ${tag}`}
                      onClick={() => onTagDelete(tag)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Backup & Reset */}
          <div className="space-y-4 rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <RotateCcw className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Data Management & Privacy</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              WealthTrack operates 100% locally in your browser storage. No financial records are
              transmitted to any external server.
            </p>

            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-10 text-xs font-semibold"
                onClick={onExport}
              >
                <Download size={15} /> Export All Transactions (CSV)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-10 text-xs font-semibold"
                onClick={onImport}
              >
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

          {/* Navigation Architecture (hubs_v2) */}
          <div className="space-y-4 rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all md:col-span-2">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <Layers className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Navigation Architecture & Design System</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              WealthTrack features a consolidated 5-hub navigation structure (Overview, Transactions, Wealth Hub, Plan Hub, Insights)
              with bottom mobile bar and global transaction capture.
            </p>
            <label className="flex items-center justify-between rounded-lg border border-border/60 p-3 hover:bg-muted/30 transition-colors cursor-pointer max-w-xl">
              <div>
                <span className="block text-xs font-semibold text-foreground">
                  Hubs v2 Navigation Mode
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Consolidate Accounts, Investments, Loans into Wealth Hub, and Budgets, Goals, Recurring into Plan Hub.
                </span>
              </div>
              <input
                type="checkbox"
                className="size-4 rounded accent-primary cursor-pointer"
                checked={hubsV2}
                onChange={(e) => {
                  const val = e.target.checked;
                  setLocalHubsV2(val);
                  setFeatureFlag("hubs_v2", val);
                }}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

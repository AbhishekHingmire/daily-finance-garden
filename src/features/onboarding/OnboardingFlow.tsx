import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  CreditCard,
  Plus,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputField, SelectField } from "@/components/shared/FormFields";
import {
  formatMoney,
  type Account,
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
  onOpenAccountModal: () => void;
}) {
  const [step, setStep] = useState(0);

  // Sample quick recurring setup state
  const [recurringRent, setRecurringRent] = useState(true);
  const [rentAmount, setRentAmount] = useState("22000");
  const [recurringSalary, setRecurringSalary] = useState(true);
  const [salaryAmount, setSalaryAmount] = useState("85000");
  const [recurringWifi, setRecurringWifi] = useState(true);
  const [wifiAmount, setWifiAmount] = useState("999");

  const totalSteps = 6;
  const currency = data.preferences.currency;

  const handleFinish = () => {
    // Commit any selected onboarding recurring items
    const defaultAccountId = data.accounts[0]?.id || "acc-hdfc";
    const newRecurring: RecurringItem[] = [];

    if (recurringRent && Number(rentAmount) > 0) {
      newRecurring.push({
        id: "rec-rent",
        name: "Monthly rent",
        type: "Expense",
        amount: Number(rentAmount),
        categoryId: "cat-housing",
        accountId: defaultAccountId,
        frequency: "Monthly",
        intervalDays: 0,
        startDate: "2026-10-01",
        endDate: "",
        nextDate: "2026-11-08",
        need: "Need",
        enabled: true,
      });
    }

    if (recurringSalary && Number(salaryAmount) > 0) {
      newRecurring.push({
        id: "rec-salary",
        name: "Monthly salary",
        type: "Income",
        amount: Number(salaryAmount),
        categoryId: "cat-salary",
        accountId: defaultAccountId,
        frequency: "Monthly",
        intervalDays: 0,
        startDate: "2026-10-01",
        endDate: "",
        nextDate: "2026-11-19",
        need: "Need",
        enabled: true,
      });
    }

    if (recurringWifi && Number(wifiAmount) > 0) {
      newRecurring.push({
        id: "rec-internet",
        name: "Home internet",
        type: "Expense",
        amount: Number(wifiAmount),
        categoryId: "cat-bills",
        accountId: defaultAccountId,
        frequency: "Monthly",
        intervalDays: 0,
        startDate: "2026-10-01",
        endDate: "",
        nextDate: "2026-11-15",
        need: "Need",
        enabled: true,
      });
    }

    onUpdateState({
      onboarded: true,
      recurring: newRecurring.length ? newRecurring : data.recurring,
    });
    onComplete();
  };

  const handleOpeningBalanceChange = (accountId: string, amount: string) => {
    const numeric = Number(amount) || 0;
    onUpdateState({
      accounts: data.accounts.map((a) => (a.id === accountId ? { ...a, openingBalance: numeric } : a)),
    });
  };

  const titles = [
    "Welcome to your financial space",
    "Personalize your preferences",
    "Review your accounts & balances",
    "Set up regular income & bills",
    "Review your spending categories",
    "Ready to launch WealthTrack",
  ];

  const descriptions = [
    "Track cash flow, see where your money goes, and stay on top of what’s next without friction.",
    "Choose your primary currency, display preferences, and theme appearance.",
    "Review starting balances for your bank accounts, digital wallets, and cards.",
    "Automate recurring reminders for rent, salary, utilities, or subscriptions.",
    "Your default categories are configured with smart Need/Want priority defaults.",
    "Your workspace is completely prepared. All sample data remains stored locally in your browser.",
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header with Logo & Skip */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-[10px] bg-primary text-primary-foreground">
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
            <span className="wt-display text-xl font-extrabold">WealthTrack</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleFinish} className="text-xs text-muted-foreground hover:text-foreground">
            Skip setup →
          </Button>
        </div>

        {/* Step Progress Bar */}
        <div className="mb-6 flex gap-1.5" aria-label="Setup progress">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                idx <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Title & Description */}
        <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">
          Step {step + 1} of {totalSteps}
        </p>
        <h1 className="wt-display mt-1 text-2xl font-extrabold sm:text-3xl text-foreground">
          {titles[step]}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {descriptions[step]}
        </p>

        {/* Main Step Card Container */}
        <div className="mt-6 min-h-[320px] rounded-2xl border border-border bg-card p-5 wt-shadow sm:p-7">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-accent/40 p-5">
                <div className="mb-4 grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                  <TrendingUp size={20} />
                </div>
                <h3 className="font-bold text-base">Know where every rupee goes</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Understand spending patterns with clean 50/30/20 Need vs. Want intelligence and 6-month visual trends.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-5">
                <div className="mb-4 grid size-10 place-items-center rounded-lg bg-success-soft text-success shadow-xs">
                  <Wallet size={20} />
                </div>
                <h3 className="font-bold text-base">Private & Zero Bank Connection</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  No bank credentials needed. Everything is stored locally on this machine with complete offline privacy.
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Preferences */}
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Primary Currency"
                value={data.preferences.currency}
                onChange={(value) => onUpdatePreferences({ currency: value as WealthPreferences["currency"] })}
                options={[
                  { value: "INR", label: "INR · Indian Rupee (₹)" },
                  { value: "USD", label: "USD · US Dollar ($)" },
                  { value: "GBP", label: "GBP · Pound Sterling (£)" },
                  { value: "EUR", label: "EUR · Euro (€)" },
                ]}
              />
              <SelectField
                label="Date Format"
                value={data.preferences.dateFormat}
                onChange={(value) => onUpdatePreferences({ dateFormat: value as WealthPreferences["dateFormat"] })}
                options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((v) => ({ value: v, label: v }))}
              />
              <SelectField
                label="Theme Appearance"
                value={data.preferences.theme}
                onChange={(value) => onUpdatePreferences({ theme: value as WealthPreferences["theme"] })}
                options={[
                  { value: "light", label: "Light Mode" },
                  { value: "dark", label: "Dark Mode" },
                ]}
              />
              <SelectField
                label="Week Starts On"
                value={data.preferences.weekStart}
                onChange={(value) => onUpdatePreferences({ weekStart: value as WealthPreferences["weekStart"] })}
                options={["Monday", "Sunday"].map((v) => ({ value: v, label: v }))}
              />
            </div>
          )}

          {/* Step 2: Accounts & Balances */}
          {step === 2 && (
            <div className="space-y-3.5">
              <div className="space-y-3">
                {data.accounts
                  .filter((a) => !a.archived)
                  .map((account) => {
                    const isCreditCard = account.kind === "Credit card";
                    return (
                      <div
                        key={account.id}
                        className="flex flex-col gap-3 rounded-xl border border-border p-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 place-items-center rounded-lg bg-muted text-foreground">
                            {isCreditCard ? <CreditCard size={17} /> : <Wallet size={17} />}
                          </span>
                          <div>
                            <p className="font-bold text-sm">{account.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {account.institution || account.kind} {isCreditCard ? "· Outstanding balance" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="w-full sm:w-44">
                          <label className="block">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                              Opening Balance
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              className="wt-field h-9 text-xs"
                              value={account.openingBalance}
                              onChange={(e) => handleOpeningBalanceChange(account.id, e.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <Button variant="outline" size="sm" onClick={onOpenAccountModal} className="gap-1.5 text-xs">
                <Plus size={14} /> Add Another Account
              </Button>
            </div>
          )}

          {/* Step 3: Recurring Income & Expenses */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Select and configure standard monthly predictable flows. You can edit or disable them anytime.
              </p>

              <div className="space-y-3">
                {/* Salary */}
                <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={recurringSalary} onCheckedChange={(c) => setRecurringSalary(Boolean(c))} />
                    <span className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                      <ArrowDownLeft size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-bold">Monthly Salary</p>
                      <p className="text-xs text-muted-foreground">Income · Need · Every 19th of month</p>
                    </div>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      disabled={!recurringSalary}
                      className="wt-field h-8 text-xs tabular-nums text-right font-bold text-emerald-600"
                      value={salaryAmount}
                      onChange={(e) => setSalaryAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* Rent */}
                <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={recurringRent} onCheckedChange={(c) => setRecurringRent(Boolean(c))} />
                    <span className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-rose-600">
                      <CalendarDays size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-bold">Home Rent</p>
                      <p className="text-xs text-muted-foreground">Housing · Need · Every 8th of month</p>
                    </div>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      disabled={!recurringRent}
                      className="wt-field h-8 text-xs tabular-nums text-right font-bold text-rose-600"
                      value={rentAmount}
                      onChange={(e) => setRentAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* Internet */}
                <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={recurringWifi} onCheckedChange={(c) => setRecurringWifi(Boolean(c))} />
                    <span className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-rose-600">
                      <CalendarDays size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-bold">Broadband / Mobile</p>
                      <p className="text-xs text-muted-foreground">Bills & Utilities · Need · Every 15th</p>
                    </div>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      disabled={!recurringWifi}
                      className="wt-field h-8 text-xs tabular-nums text-right font-bold text-rose-600"
                      value={wifiAmount}
                      onChange={(e) => setWifiAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Categories */}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                WealthTrack auto-matches emoji icons and sets 50/30/20 Need vs. Want rules on each category.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.categories
                  .filter((c) => !c.archived)
                  .map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-md bg-muted text-lg">
                          {category.icon}
                        </span>
                        <div>
                          <p className="text-xs font-semibold">{category.name}</p>
                          <span className="text-[10px] text-muted-foreground">{category.kind}</span>
                        </div>
                      </div>
                      {category.kind === "Expense" && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            category.defaultNeed === "Want"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {category.defaultNeed || "Need"}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Step 5: Summary */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-success-soft p-4 text-xs font-medium text-success flex items-center gap-2">
                <ShieldCheck size={18} />
                <span>Everything is set up and saved privately in your local browser storage.</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground">Accounts Configured</span>
                  <p className="wt-display mt-1 text-2xl font-bold">{data.accounts.filter((a) => !a.archived).length}</p>
                </div>
                <div className="rounded-xl border border-border p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground">Categories Active</span>
                  <p className="wt-display mt-1 text-2xl font-bold">{data.categories.filter((c) => !c.archived).length}</p>
                </div>
                <div className="rounded-xl border border-border p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground">Currency System</span>
                  <p className="wt-display mt-1 text-2xl font-bold">{currency}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="gap-1.5 text-xs font-semibold"
          >
            <ChevronLeft size={16} /> Back
          </Button>
          <Button
            onClick={() => (step === totalSteps - 1 ? handleFinish() : setStep((s) => Math.min(totalSteps - 1, s + 1)))}
            className="gap-1.5 text-xs font-semibold"
          >
            {step === totalSteps - 1 ? "Launch Dashboard" : "Continue"} <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </main>
  );
}

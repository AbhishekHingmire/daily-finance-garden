import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  CreditCard,
  Landmark,
  Plus,
  ShieldCheck,
  Sparkles,
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
  type InvestmentHolding,
  type LoanLiability,
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

  // Quick recurring setup state
  const [recurringRent, setRecurringRent] = useState(true);
  const [rentAmount, setRentAmount] = useState("22000");
  const [recurringSalary, setRecurringSalary] = useState(true);
  const [salaryAmount, setSalaryAmount] = useState("85000");
  const [recurringWifi, setRecurringWifi] = useState(true);
  const [wifiAmount, setWifiAmount] = useState("999");

  // Emergency Fund and Profile Targets
  const [emergencyTarget, setEmergencyTarget] = useState(
    String(data.profile?.emergencyFundTarget || 180000)
  );
  const [incomeTarget, setIncomeTarget] = useState(
    String(data.profile?.monthlyIncomeTarget || 100000)
  );
  const [savingsTarget, setSavingsTarget] = useState(
    String(data.profile?.savingsRateTarget || 35)
  );

  // Initial Investment Holdings
  const [hasInvestments, setHasInvestments] = useState(true);
  const [mutualFundAmount, setMutualFundAmount] = useState("120000");
  const [stocksAmount, setStocksAmount] = useState("65000");

  // Initial Loans / Debt
  const [hasLoans, setHasLoans] = useState(true);
  const [homeLoanAmount, setHomeLoanAmount] = useState("2840000");
  const [homeLoanEmi, setHomeLoanEmi] = useState("30850");

  const totalSteps = 8;
  const currency = data.preferences.currency;

  const handleFinish = () => {
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

    // Update profile targets
    const updatedProfile = {
      ...(data.profile ?? {
        fullName: "Abhishek Hingmire",
        email: "demo@wealthtrack.app",
        phone: "+91 98765 43210",
        occupation: "Product Designer & Engineer",
        riskProfile: "Balanced" as const,
      }),
      monthlyIncomeTarget: Number(incomeTarget) || 100000,
      emergencyFundTarget: Number(emergencyTarget) || 180000,
      savingsRateTarget: Number(savingsTarget) || 35,
    };

    onUpdateState({
      onboarded: true,
      profile: updatedProfile,
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
    "Portfolio assets & investments",
    "Loans, liabilities & debt obligations",
    "Emergency buffer & financial goals",
    "Set up regular income & bills",
    "Ready to launch WealthTrack",
  ];

  const descriptions = [
    "Track cash flow, see where your money goes, and stay on top of what’s next without friction.",
    "Choose your primary currency, display preferences, and theme appearance.",
    "Review starting balances for your bank accounts, digital wallets, and cards.",
    "Track your mutual funds, equity holdings, and fixed deposits.",
    "Log any existing borrowings, mortgages, or vehicle loans to model debt freedom.",
    "Configure your target emergency runway and monthly savings goals.",
    "Automate recurring reminders for rent, salary, utilities, or subscriptions.",
    "Your workspace is completely prepared. All data remains stored privately in your browser.",
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header with Logo & Skip */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-[10px] bg-primary text-primary-foreground shadow-xs">
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
            <span className="wt-display text-xl font-extrabold text-foreground">WealthTrack</span>
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
        <div className="mt-6 min-h-[340px] rounded-2xl border border-border/80 bg-card p-5 wt-shadow sm:p-7">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-accent/40 p-5">
                <div className="mb-4 grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                  <TrendingUp size={20} />
                </div>
                <h3 className="font-bold text-base">Know where every rupee goes</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Understand spending patterns with clean 50/30/20 Need vs. Want intelligence, investment valuation, and cash flow velocity.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-5">
                <div className="mb-4 grid size-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs">
                  <Wallet size={20} />
                </div>
                <h3 className="font-bold text-base">Private & Zero Bank Connection</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  No bank credentials needed. Everything is stored locally on this machine with complete offline privacy and speed.
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

          {/* Step 3: Investments & Holdings */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" />
                  <span className="text-xs font-bold text-foreground">Include Existing Portfolio Holdings</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={hasInvestments} onCheckedChange={(c) => setHasInvestments(Boolean(c))} />
                  <span className="text-xs font-medium text-muted-foreground">I have active investments</span>
                </div>
              </div>

              {hasInvestments ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
                    <div>
                      <p className="text-sm font-bold">Mutual Funds & SIPs</p>
                      <p className="text-xs text-muted-foreground">Flexi-cap, index funds, equity SIPs</p>
                    </div>
                    <div className="w-36">
                      <input
                        type="number"
                        className="wt-field h-9 text-xs font-bold text-right"
                        value={mutualFundAmount}
                        onChange={(e) => setMutualFundAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
                    <div>
                      <p className="text-sm font-bold">Direct Stocks & Equity</p>
                      <p className="text-xs text-muted-foreground">Demat accounts (Zerodha, Groww, Angel)</p>
                    </div>
                    <div className="w-36">
                      <input
                        type="number"
                        className="wt-field h-9 text-xs font-bold text-right"
                        value={stocksAmount}
                        onChange={(e) => setStocksAmount(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  You can start tracking investments and asset allocation whenever you're ready.
                </p>
              )}
            </div>
          )}

          {/* Step 4: Loans & Liabilities */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Landmark size={16} className="text-rose-500" />
                  <span className="text-xs font-bold text-foreground">Existing Borrowings & Mortgages</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={hasLoans} onCheckedChange={(c) => setHasLoans(Boolean(c))} />
                  <span className="text-xs font-medium text-muted-foreground">I have active loans/debt</span>
                </div>
              </div>

              {hasLoans ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border p-3.5">
                    <div>
                      <p className="text-sm font-bold">Home / Property Loan</p>
                      <p className="text-xs text-muted-foreground">Principal outstanding & monthly EMI</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Balance</span>
                        <input
                          type="number"
                          className="wt-field h-8 text-xs font-bold text-right text-rose-600"
                          value={homeLoanAmount}
                          onChange={(e) => setHomeLoanAmount(e.target.value)}
                        />
                      </div>
                      <div className="w-28">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">EMI</span>
                        <input
                          type="number"
                          className="wt-field h-8 text-xs font-bold text-right"
                          value={homeLoanEmi}
                          onChange={(e) => setHomeLoanEmi(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-500/10 p-4 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <Check size={16} />
                  <span>Debt-free status: You have no active loan liabilities or mortgages.</span>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Emergency Buffer & Financial Goals */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Target Emergency Buffer (₹)"
                  type="number"
                  placeholder="180000"
                  value={emergencyTarget}
                  onChange={setEmergencyTarget}
                />
                <InputField
                  label="Monthly Income Target (₹)"
                  type="number"
                  placeholder="100000"
                  value={incomeTarget}
                  onChange={setIncomeTarget}
                />
              </div>
              <InputField
                label="Target Monthly Savings Rate (%)"
                type="number"
                placeholder="35"
                value={savingsTarget}
                onChange={setSavingsTarget}
              />
              <div className="rounded-xl bg-muted/40 p-3.5 text-xs text-muted-foreground flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                <span>We recommend keeping 3–6 months of average monthly expenses in your emergency fund buffer.</span>
              </div>
            </div>
          )}

          {/* Step 6: Recurring Income & Bills */}
          {step === 6 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Select and configure predictable monthly flows. Auto-records will manage ledger sync.
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
                      <p className="text-xs text-muted-foreground">Income · Need · Auto-records</p>
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
                      <p className="text-xs text-muted-foreground">Housing · Need · Auto-records</p>
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
                      <p className="text-sm font-bold">Broadband / Utilities</p>
                      <p className="text-xs text-muted-foreground">Bills · Need · Auto-records</p>
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

          {/* Step 7: Summary */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-500/10 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-200 border border-emerald-500/20 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Your financial dashboard, accounts, assets, and emergency targets are primed and saved locally.</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground">Accounts Configured</span>
                  <p className="wt-display mt-1 text-2xl font-bold">{data.accounts.filter((a) => !a.archived).length}</p>
                </div>
                <div className="rounded-xl border border-border p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground">Emergency Buffer</span>
                  <p className="wt-display mt-1 text-2xl font-bold">₹{Number(emergencyTarget).toLocaleString("en-IN")}</p>
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

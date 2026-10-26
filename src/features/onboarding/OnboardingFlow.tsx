import { useState, useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  DollarSign,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { InstitutionLogo } from "@/components/shared/InstitutionLogo";
import { AccountModal } from "@/features/accounts/AccountModal";
import { InvestmentHoldingModal } from "@/features/investments/InvestmentHoldingModal";
import { LoanModal } from "@/features/loans/LoanModal";
import { FundModal } from "@/features/funds/FundModal";
import { RecurringModal } from "@/features/recurring/RecurringModal";
import {
  formatMoney,
  safeAmount,
  type Account,
  type AssetType,
  type Category,
  type CustomFund,
  type InvestmentHolding,
  type LoanLiability,
  type RecurringItem,
  type WealthPreferences,
  type WealthState,
} from "@/lib/wealthtrack";

const ASSET_COLORS: Record<string, { bg: string; text: string }> = {
  "Mutual fund": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  "Stocks & Equity": { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  ETF: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
  "Gold & Commodities": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  "Fixed deposit": { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400" },
  Crypto: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" },
  Other: { bg: "bg-muted", text: "text-muted-foreground" },
};

const LOAN_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  "Home Loan": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  "Personal Loan": { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
  "Car / Auto Loan": { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400" },
  "Education Loan": { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  "Credit Line": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  Other: { bg: "bg-muted", text: "text-muted-foreground" },
};

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
  onOpenAccountModal?: () => void;
}) {
  const [step, setStep] = useState(0);

  // Modal control states
  const [modalType, setModalType] = useState<"account" | "investment" | "loan" | "fund" | "recurring" | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentHolding | null>(null);
  const [editingLoan, setEditingLoan] = useState<LoanLiability | null>(null);
  const [editingFund, setEditingFund] = useState<CustomFund | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringItem | null>(null);

  // Profile targets state (emergency buffer & income targets)
  const [emergencyTarget, setEmergencyTarget] = useState(
    String(data.profile?.emergencyFundTarget || 180000)
  );
  const [incomeTarget, setIncomeTarget] = useState(
    String(data.profile?.monthlyIncomeTarget || 100000)
  );
  const [savingsTarget, setSavingsTarget] = useState(
    String(data.profile?.savingsRateTarget || 35)
  );

  // Review step tab
  const [reviewTab, setReviewTab] = useState<"all" | "accounts" | "investments" | "loans" | "funds" | "recurring">("all");

  const totalSteps = 8;
  const currency = data.preferences.currency;
  const money = (val: number) => formatMoney(val, currency);

  // -------------------------------------------------------------
  // Calculations for Step 7 (Comprehensive Review Cockpit)
  // -------------------------------------------------------------
  const activeAccounts = useMemo(() => data.accounts.filter((a) => !a.archived), [data.accounts]);
  const assetAccounts = useMemo(() => activeAccounts.filter((a) => a.kind !== "Credit card"), [activeAccounts]);
  const liabilityAccounts = useMemo(() => activeAccounts.filter((a) => a.kind === "Credit card"), [activeAccounts]);

  const totalLiquidAssets = useMemo(
    () => assetAccounts.reduce((acc, a) => acc + (Number(a.openingBalance) || 0), 0),
    [assetAccounts]
  );
  const creditCardLiabilities = useMemo(
    () => liabilityAccounts.reduce((acc, a) => acc + (Number(a.openingBalance) || 0), 0),
    [liabilityAccounts]
  );

  const investmentsList = useMemo(() => data.investments || [], [data.investments]);
  const totalInvested = useMemo(
    () => investmentsList.reduce((acc, h) => acc + safeAmount(h.investedAmount), 0),
    [investmentsList]
  );
  const totalInvestmentValuation = useMemo(
    () => investmentsList.reduce((acc, h) => acc + safeAmount(h.currentAmount), 0),
    [investmentsList]
  );
  const totalInvestmentPnL = totalInvestmentValuation - totalInvested;
  const investmentReturnPct = totalInvested > 0 ? (totalInvestmentPnL / totalInvested) * 100 : 0;

  const loansList = useMemo(() => data.loans || [], [data.loans]);
  const totalLoanOutstanding = useMemo(
    () => loansList.reduce((acc, l) => acc + safeAmount(l.currentOutstanding), 0),
    [loansList]
  );
  const totalMonthlyEmi = useMemo(
    () => loansList.reduce((acc, l) => acc + safeAmount(l.emiAmount), 0),
    [loansList]
  );

  const totalDebt = totalLoanOutstanding + creditCardLiabilities;
  const calculatedNetWorth = totalLiquidAssets + totalInvestmentValuation - totalDebt;

  const fundsList = useMemo(() => data.funds || [], [data.funds]);
  const recurringList = useMemo(() => data.recurring || [], [data.recurring]);

  const monthlyRecurringIncome = useMemo(
    () =>
      recurringList
        .filter((r) => r.enabled && r.type === "Income")
        .reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    [recurringList]
  );
  const monthlyRecurringExpenses = useMemo(
    () =>
      recurringList
        .filter((r) => r.enabled && r.type === "Expense")
        .reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    [recurringList]
  );
  const monthlyRecurringInvestments = useMemo(
    () =>
      recurringList
        .filter((r) => r.enabled && r.type === "Investment")
        .reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    [recurringList]
  );

  const totalMonthlyCommitments = monthlyRecurringExpenses + totalMonthlyEmi + monthlyRecurringInvestments;
  const projectedMonthlyCashFlow = monthlyRecurringIncome - totalMonthlyCommitments;

  // -------------------------------------------------------------
  // Account CRUD
  // -------------------------------------------------------------
  const handleOpeningBalanceChange = (accountId: string, amount: string) => {
    const numeric = Number(amount) || 0;
    onUpdateState({
      accounts: data.accounts.map((a) => (a.id === accountId ? { ...a, openingBalance: numeric } : a)),
    });
  };

  const handleSaveAccount = (form: Partial<Account>) => {
    if (editingAccount) {
      onUpdateState({
        accounts: data.accounts.map((a) => (a.id === editingAccount.id ? { ...a, ...form } : a)),
      });
    } else {
      const newAccount: Account = {
        id: `acc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: form.name || "New Account",
        kind: form.kind || "Bank account",
        institution: form.institution || "",
        identifier: form.identifier || "",
        openingBalance: Number(form.openingBalance) || 0,
        notes: form.notes || "",
        archived: false,
      };
      onUpdateState({
        accounts: [...data.accounts, newAccount],
      });
    }
    setModalType(null);
    setEditingAccount(null);
  };

  const handleDeleteAccount = (id: string) => {
    onUpdateState({
      accounts: data.accounts.filter((a) => a.id !== id),
    });
  };

  // -------------------------------------------------------------
  // Investment CRUD
  // -------------------------------------------------------------
  const handleSaveInvestment = (holding: InvestmentHolding) => {
    const current = data.investments || [];
    const exists = current.some((h) => h.id === holding.id);
    onUpdateState({
      investments: exists ? current.map((h) => (h.id === holding.id ? holding : h)) : [...current, holding],
    });
    setModalType(null);
    setEditingInvestment(null);
  };

  const handleDeleteInvestment = (id: string) => {
    onUpdateState({
      investments: (data.investments || []).filter((h) => h.id !== id),
    });
  };

  // -------------------------------------------------------------
  // Loan CRUD
  // -------------------------------------------------------------
  const handleSaveLoan = (loan: LoanLiability) => {
    const current = data.loans || [];
    const exists = current.some((l) => l.id === loan.id);
    onUpdateState({
      loans: exists ? current.map((l) => (l.id === loan.id ? loan : l)) : [...current, loan],
    });
    setModalType(null);
    setEditingLoan(null);
  };

  const handleDeleteLoan = (id: string) => {
    onUpdateState({
      loans: (data.loans || []).filter((l) => l.id !== id),
    });
  };

  // -------------------------------------------------------------
  // Fund CRUD
  // -------------------------------------------------------------
  const handleSaveFund = (fund: CustomFund) => {
    const current = data.funds || [];
    const exists = current.some((f) => f.id === fund.id);
    onUpdateState({
      funds: exists ? current.map((f) => (f.id === fund.id ? fund : f)) : [...current, fund],
    });
    setModalType(null);
    setEditingFund(null);
  };

  const handleDeleteFund = (id: string) => {
    onUpdateState({
      funds: (data.funds || []).filter((f) => f.id !== id),
    });
  };

  // -------------------------------------------------------------
  // Recurring CRUD
  // -------------------------------------------------------------
  const handleSaveRecurring = (form: Partial<RecurringItem>) => {
    const current = data.recurring || [];
    if (editingRecurring) {
      onUpdateState({
        recurring: current.map((r) => (r.id === editingRecurring.id ? { ...r, ...form } : r)),
      });
    } else {
      const newItem: RecurringItem = {
        id: `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: form.name || "Recurring schedule",
        type: form.type || "Expense",
        amount: Number(form.amount) || 0,
        categoryId: form.categoryId || data.categories[0]?.id || "",
        accountId: form.accountId || activeAccounts[0]?.id || "",
        frequency: form.frequency || "Monthly",
        intervalDays: form.intervalDays || 0,
        startDate: form.startDate || new Date().toISOString().slice(0, 10),
        endDate: form.endDate || "",
        nextDate: form.nextDate || new Date().toISOString().slice(0, 10),
        need: form.need || "Need",
        enabled: form.enabled ?? true,
        instrumentType: form.instrumentType,
      };
      onUpdateState({
        recurring: [...current, newItem],
      });
    }
    setModalType(null);
    setEditingRecurring(null);
  };

  const handleToggleRecurring = (id: string) => {
    onUpdateState({
      recurring: (data.recurring || []).map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    });
  };

  const handleDeleteRecurring = (id: string) => {
    onUpdateState({
      recurring: (data.recurring || []).filter((r) => r.id !== id),
    });
  };

  const handleAddCategory = (category: Category) => {
    onUpdateState({
      categories: [...data.categories, category],
    });
  };

  // -------------------------------------------------------------
  // Finish & Launch
  // -------------------------------------------------------------
  const handleFinish = () => {
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
    });
    onComplete();
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
    "Review starting balances for your bank accounts, digital wallets, and cards. Add, edit, or delete accounts anytime.",
    "Track your mutual funds, equity holdings, ETFs, fixed deposits, and sovereign bonds with full live valuations.",
    "Log any existing borrowings, mortgages, or vehicle loans to model debt freedom and auto-recurring EMIs.",
    "Configure your target emergency runway and create dedicated sinking funds or savings reserves.",
    "Automate recurring reminders for rent, salary, utilities, subscriptions, or SIP investments.",
    "Review your complete financial balance sheet and configured workspace before launching your dashboard.",
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header with Logo & Skip */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-[10px] bg-primary text-primary-foreground shadow-xs">
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
            <span className="wt-display text-xl font-extrabold text-foreground">WealthTrack</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFinish}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
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
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">
              Step {step + 1} of {totalSteps}
            </p>
            <h1 className="wt-display mt-1 text-2xl font-extrabold sm:text-3xl text-foreground">
              {titles[step]}
            </h1>
          </div>
          {step > 1 && step < 7 && (
            <span className="text-xs text-muted-foreground">Changes save automatically to local state</span>
          )}
        </div>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {descriptions[step]}
        </p>

        {/* Main Step Card Container */}
        <div className="mt-6 min-h-[380px] rounded-2xl border border-border/80 bg-card p-5 wt-shadow sm:p-7">
          {/* ========================================================= */}
          {/* Step 0: Welcome                                          */}
          {/* ========================================================= */}
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-accent/40 p-5">
                <div className="mb-4 grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                  <TrendingUp size={20} />
                </div>
                <h3 className="font-bold text-base">Know where every rupee goes</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Understand spending patterns with clean Need vs. Want intelligence, investment valuation, and cash flow velocity.
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

          {/* ========================================================= */}
          {/* Step 1: Preferences                                      */}
          {/* ========================================================= */}
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

          {/* ========================================================= */}
          {/* Step 2: Accounts & Balances                              */}
          {/* ========================================================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Configured Accounts ({activeAccounts.length})
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingAccount(null);
                    setModalType("account");
                  }}
                  className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                >
                  <Plus size={14} /> Add Account
                </Button>
              </div>

              {activeAccounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card">
                  <Wallet className="mx-auto size-8 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-bold text-foreground">No accounts configured</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                    Add your everyday bank accounts, digital wallets, or credit cards to track balances.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingAccount(null);
                      setModalType("account");
                    }}
                    className="mt-3 gap-1.5 text-xs font-semibold"
                  >
                    <Plus size={14} /> Add First Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeAccounts.map((account) => {
                    const isCreditCard = account.kind === "Credit card";
                    return (
                      <div
                        key={account.id}
                        className="group flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3.5 transition-all hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <InstitutionLogo
                            name={account.institution || account.name}
                            size="md"
                            className="shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-foreground truncate">{account.name}</p>
                              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shrink-0">
                                {account.kind}
                              </span>
                              {isCreditCard && (
                                <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 shrink-0">
                                  Liability
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {account.institution || account.kind} {account.identifier ? `· ${account.identifier}` : ""}
                              {account.notes ? ` · ${account.notes}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <div className="w-36">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                              {isCreditCard ? "Outstanding" : "Opening Balance"}
                            </span>
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-bold">
                                {currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "£"}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                className="wt-field h-8 pl-6 text-xs font-bold tabular-nums text-right"
                                value={account.openingBalance}
                                onChange={(e) => handleOpeningBalanceChange(account.id, e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1 pt-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              title="Edit account details"
                              onClick={() => {
                                setEditingAccount(account);
                                setModalType("account");
                              }}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              title="Delete account"
                              onClick={() => handleDeleteAccount(account.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* Step 3: Portfolio Assets & Investments                   */}
          {/* ========================================================= */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Active Portfolio Holdings ({investmentsList.length})
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingInvestment(null);
                    setModalType("investment");
                  }}
                  className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                >
                  <Plus size={14} /> Add Investment
                </Button>
              </div>

              {investmentsList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card">
                  <TrendingUp className="mx-auto size-8 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-bold text-foreground">No portfolio holdings added yet</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                    Track mutual funds, equity stocks, index ETFs, fixed deposits, gold bonds, or crypto.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingInvestment(null);
                      setModalType("investment");
                    }}
                    className="mt-3 gap-1.5 text-xs font-semibold"
                  >
                    <Plus size={14} /> Add First Investment
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {investmentsList.map((h) => {
                    const invested = safeAmount(h.investedAmount);
                    const current = safeAmount(h.currentAmount);
                    const pnl = current - invested;
                    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                    const colors = ASSET_COLORS[h.assetType] || ASSET_COLORS.Other;

                    return (
                      <div
                        key={h.id}
                        className="group flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3.5 transition-all hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text}`}
                            >
                              {h.assetType}
                            </span>
                            {h.isRecurring && (
                              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                SIP: {money(h.sipAmount || 0)}/mo
                              </span>
                            )}
                            {h.institution && (
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {h.institution}
                              </span>
                            )}
                          </div>
                          <h4 className="mt-1.5 font-bold text-sm text-foreground truncate" title={h.name}>
                            {h.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Started {h.startMonthYear} {h.notes ? `· ${h.notes}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <div className="flex items-baseline justify-end gap-2">
                              <span className="text-xs text-muted-foreground">Invested {money(invested)}</span>
                              <span className="font-extrabold text-sm text-foreground tabular-nums">
                                {money(current)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] font-bold">
                              {pnl >= 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                  <ArrowUpRight size={13} /> +{money(pnl)} ({pnlPct.toFixed(1)}%)
                                </span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                                  <TrendingDown size={13} /> -{money(Math.abs(pnl))} ({pnlPct.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 border-l border-border pl-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              title="Edit holding"
                              onClick={() => {
                                setEditingInvestment(h);
                                setModalType("investment");
                              }}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              title="Delete investment"
                              onClick={() => handleDeleteInvestment(h.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* Step 4: Loans & Liabilities                              */}
          {/* ========================================================= */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Landmark size={16} className="text-rose-500" />
                  <span className="text-xs font-bold text-foreground">
                    Existing Loans & Debt Obligations ({loansList.length})
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingLoan(null);
                    setModalType("loan");
                  }}
                  className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                >
                  <Plus size={14} /> Add Loan / Debt
                </Button>
              </div>

              {loansList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card">
                  <div className="mx-auto mb-2 grid size-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Check size={20} strokeWidth={2.5} />
                  </div>
                  <p className="text-sm font-bold text-foreground">Debt-free status</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                    You have no active loans or mortgages recorded. You can add home, car, or education loans anytime.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingLoan(null);
                      setModalType("loan");
                    }}
                    className="mt-3 gap-1.5 text-xs font-semibold"
                  >
                    <Plus size={14} /> Add Loan Liability
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {loansList.map((loan) => {
                    const principal = safeAmount(loan.principalAmount);
                    const outstanding = safeAmount(loan.currentOutstanding);
                    const paid = Math.max(0, principal - outstanding);
                    const pctPaid = principal > 0 ? (paid / principal) * 100 : 0;
                    const colors = LOAN_TYPE_COLORS[loan.loanType] || LOAN_TYPE_COLORS.Other;

                    return (
                      <div
                        key={loan.id}
                        className="group flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3.5 transition-all hover:border-rose-500/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text}`}
                            >
                              {loan.loanType}
                            </span>
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {loan.lenderInstitution}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              · {loan.interestRate}% interest
                            </span>
                          </div>
                          <h4 className="mt-1.5 font-bold text-sm text-foreground truncate" title={loan.name}>
                            {loan.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Sanctioned: {money(principal)} · {pctPaid.toFixed(0)}% principal repaid
                          </p>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Outstanding</p>
                            <p className="font-extrabold text-sm text-rose-600 dark:text-rose-400 tabular-nums">
                              {money(outstanding)}
                            </p>
                            <p className="text-[11px] font-semibold text-muted-foreground">
                              EMI: {money(loan.emiAmount)}/mo
                            </p>
                          </div>

                          <div className="flex items-center gap-1 border-l border-border pl-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              title="Edit loan"
                              onClick={() => {
                                setEditingLoan(loan);
                                setModalType("loan");
                              }}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              title="Delete loan"
                              onClick={() => handleDeleteLoan(loan.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* Step 5: Emergency Buffer & Financial Goals               */}
          {/* ========================================================= */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Target Emergency Runway Buffer (₹)"
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

              <div className="grid gap-4 sm:grid-cols-2 items-center">
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

              {/* Sinking Funds / Custom Reserves */}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <PiggyBank size={16} className="text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Sinking Funds & Savings Goals ({fundsList.length})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingFund(null);
                      setModalType("fund");
                    }}
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    <Plus size={14} /> Add Sinking Fund
                  </Button>
                </div>

                {fundsList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center bg-card">
                    <p className="text-xs font-semibold text-muted-foreground">
                      No custom sinking funds added yet. Allocate liquid reserves for downpayments, vacation, or tax provisions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {fundsList.map((fund) => {
                      const target = Number(fund.targetAmount) || 0;
                      const current = Number(fund.currentAmount) || 0;
                      const pct = target > 0 ? (current / target) * 100 : 0;

                      return (
                        <div
                          key={fund.id}
                          className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3 transition-all hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xl shrink-0">{fund.icon || "🛡️"}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-foreground truncate">{fund.name}</p>
                                <span className="rounded-md bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-muted-foreground">
                                  {fund.type}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Target: {money(target)} {fund.monthlyContribution ? `· +${money(fund.monthlyContribution)}/mo` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="w-28 text-right">
                              <span className="font-extrabold text-xs text-foreground tabular-nums block">
                                {money(current)}
                              </span>
                              <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-1 border-l border-border pl-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                title="Edit fund"
                                onClick={() => {
                                  setEditingFund(fund);
                                  setModalType("fund");
                                }}
                              >
                                <Pencil size={13} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                title="Delete fund"
                                onClick={() => handleDeleteFund(fund.id)}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* Step 6: Recurring Income & Bills                         */}
          {/* ========================================================= */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Recurring Monthly Schedules ({recurringList.length})
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingRecurring(null);
                    setModalType("recurring");
                  }}
                  className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                >
                  <Plus size={14} /> Add Recurring
                </Button>
              </div>

              {recurringList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card">
                  <CalendarDays className="mx-auto size-8 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-bold text-foreground">No recurring schedules set up</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                    Automate notifications and transactions for repeating bills, rent, salary, utilities, or SIP investments.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingRecurring(null);
                      setModalType("recurring");
                    }}
                    className="mt-3 gap-1.5 text-xs font-semibold"
                  >
                    <Plus size={14} /> Add First Recurring Schedule
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recurringList.map((r) => {
                    const isIncome = r.type === "Income";
                    const isInvestment = r.type === "Investment";
                    const isExpense = r.type === "Expense";
                    const category = data.categories.find((c) => c.id === r.categoryId);
                    const account = activeAccounts.find((a) => a.id === r.accountId);

                    return (
                      <div
                        key={r.id}
                        className={`group flex flex-col gap-3 rounded-xl border p-3.5 transition-all sm:flex-row sm:items-center sm:justify-between ${
                          r.enabled
                            ? "border-border bg-card/60 hover:border-primary/40"
                            : "border-border/50 bg-muted/20 opacity-70"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={r.enabled}
                            onCheckedChange={() => handleToggleRecurring(r.id)}
                            title="Toggle active schedule"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                  isIncome
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : isInvestment
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {r.type}
                              </span>
                              <p className="font-bold text-sm text-foreground truncate">{r.name}</p>
                              {category && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <span>{category.icon}</span>
                                  <span>{category.name}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              Frequency: {r.frequency} {account ? `· Account: ${account.name}` : ""}
                              {r.nextDate ? ` · Next: ${r.nextDate}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <span
                              className={`font-extrabold text-sm tabular-nums block ${
                                isIncome
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : isInvestment
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {isIncome ? "+" : "-"}{money(r.amount)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {r.enabled ? "Active" : "Paused"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 border-l border-border pl-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              title="Edit recurring schedule"
                              onClick={() => {
                                setEditingRecurring(r);
                                setModalType("recurring");
                              }}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              title="Delete recurring item"
                              onClick={() => handleDeleteRecurring(r.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* Step 7: Ready to Launch WealthTrack (Full Review Cockpit) */}
          {/* ========================================================= */}
          {step === 7 && (
            <div className="space-y-6">
              {/* Security & Readiness Banner */}
              <div className="rounded-xl bg-emerald-500/10 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-200 border border-emerald-500/20 flex items-start gap-3">
                <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm">Workspace Ready · Zero External Dependency</p>
                  <p className="leading-relaxed opacity-90">
                    Your financial balance sheet, starting account balances, portfolio holdings, liabilities, and recurring commitments are primed. All data remains stored 100% privately on your local browser.
                  </p>
                </div>
              </div>

              {/* Financial Cockpit Headline Cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* 1. Net Worth */}
                <div className="rounded-xl border border-border p-4 bg-card wt-shadow">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Estimated Net Worth
                  </span>
                  <p className="wt-display mt-1 text-2xl font-black text-primary tabular-nums">
                    {money(calculatedNetWorth)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assets ({money(totalLiquidAssets + totalInvestmentValuation)}) − Debt ({money(totalDebt)})
                  </p>
                </div>

                {/* 2. Liquid Reserves */}
                <div className="rounded-xl border border-border p-4 bg-card wt-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Liquid Cash & Bank
                    </span>
                    <button
                      onClick={() => setStep(2)}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="wt-display mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {money(totalLiquidAssets)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Across {assetAccounts.length} active bank & wallet accounts
                  </p>
                </div>

                {/* 3. Portfolio Investments */}
                <div className="rounded-xl border border-border p-4 bg-card wt-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Portfolio Valuation
                    </span>
                    <button
                      onClick={() => setStep(3)}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="wt-display mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    {money(totalInvestmentValuation)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {investmentsList.length} holdings · Return {investmentReturnPct >= 0 ? "+" : ""}{investmentReturnPct.toFixed(1)}%
                  </p>
                </div>

                {/* 4. Total Debt */}
                <div className="rounded-xl border border-border p-4 bg-card wt-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Total Debt & Loans
                    </span>
                    <button
                      onClick={() => setStep(4)}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="wt-display mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {money(totalDebt)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Monthly EMI commitment: {money(totalMonthlyEmi)}/mo
                  </p>
                </div>

                {/* 5. Monthly Cash Flow */}
                <div className="rounded-xl border border-border p-4 bg-card wt-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Projected Cash Flow
                    </span>
                    <button
                      onClick={() => setStep(6)}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p
                    className={`wt-display mt-1 text-2xl font-bold tabular-nums ${
                      projectedMonthlyCashFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {projectedMonthlyCashFlow >= 0 ? "+" : ""}{money(projectedMonthlyCashFlow)}/mo
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Inflow {money(monthlyRecurringIncome)} vs Outflow {money(totalMonthlyCommitments)}
                  </p>
                </div>

                {/* 6. Emergency Runway */}
                <div className="rounded-xl border border-border p-4 bg-card wt-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Emergency Runway
                    </span>
                    <button
                      onClick={() => setStep(5)}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="wt-display mt-1 text-2xl font-bold text-primary tabular-nums">
                    {money(Number(emergencyTarget))}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Target buffer · {fundsList.length} custom goals set
                  </p>
                </div>
              </div>

              {/* Filter Tabs for Detailed Review */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
                {[
                  { id: "all", label: "All Items", count: activeAccounts.length + investmentsList.length + loansList.length + recurringList.length },
                  { id: "accounts", label: "Accounts", count: activeAccounts.length },
                  { id: "investments", label: "Investments", count: investmentsList.length },
                  { id: "loans", label: "Loans & Debt", count: loansList.length },
                  { id: "funds", label: "Funds & Goals", count: fundsList.length },
                  { id: "recurring", label: "Recurring Schedules", count: recurringList.length },
                ].map((t) => (
                  <Button
                    key={t.id}
                    size="sm"
                    variant={reviewTab === t.id ? "default" : "outline"}
                    className="h-8 rounded-full text-xs font-semibold px-3"
                    onClick={() => setReviewTab(t.id as any)}
                  >
                    {t.label}
                    <span className="ml-1.5 rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
                      {t.count}
                    </span>
                  </Button>
                ))}
              </div>

              {/* Detailed Breakdown Sections */}
              <div className="space-y-4">
                {/* 1. Accounts Section */}
                {(reviewTab === "all" || reviewTab === "accounts") && (
                  <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet size={16} className="text-primary" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Bank Accounts, Wallets & Cards ({activeAccounts.length})
                        </h4>
                      </div>
                      <button
                        onClick={() => setStep(2)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        Modify <ArrowRight size={12} />
                      </button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {activeAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 p-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <InstitutionLogo name={acc.institution || acc.name} size="sm" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{acc.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {acc.institution} {acc.identifier ? `· ${acc.identifier}` : ""}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold tabular-nums shrink-0 ml-2">
                            {money(acc.openingBalance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Investments Section */}
                {(reviewTab === "all" || reviewTab === "investments") && (
                  <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-primary" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Portfolio Assets & Investments ({investmentsList.length})
                        </h4>
                      </div>
                      <button
                        onClick={() => setStep(3)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        Modify <ArrowRight size={12} />
                      </button>
                    </div>

                    {investmentsList.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No investments currently logged.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {investmentsList.map((inv) => {
                          const pnl = safeAmount(inv.currentAmount) - safeAmount(inv.investedAmount);
                          return (
                            <div
                              key={inv.id}
                              className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 p-2.5"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold rounded bg-primary/10 text-primary px-1 py-0.2">
                                    {inv.assetType}
                                  </span>
                                  <p className="text-xs font-bold text-foreground truncate">{inv.name}</p>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Invested: {money(inv.investedAmount)} · Broker: {inv.institution || "Direct"}
                                </p>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <span className="text-xs font-extrabold tabular-nums block">
                                  {money(inv.currentAmount)}
                                </span>
                                <span
                                  className={`text-[10px] font-bold ${
                                    pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
                                  }`}
                                >
                                  {pnl >= 0 ? "+" : ""}{money(pnl)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Loans & Debt Section */}
                {(reviewTab === "all" || reviewTab === "loans") && (
                  <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Landmark size={16} className="text-rose-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Loans, Mortgages & Borrowings ({loansList.length})
                        </h4>
                      </div>
                      <button
                        onClick={() => setStep(4)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        Modify <ArrowRight size={12} />
                      </button>
                    </div>

                    {loansList.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Check size={14} /> Debt-free: Zero active borrowings configured.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {loansList.map((loan) => (
                          <div
                            key={loan.id}
                            className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 p-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{loan.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {loan.lenderInstitution} · EMI: {money(loan.emiAmount)}/mo · {loan.interestRate}%
                              </p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 tabular-nums block">
                                {money(loan.currentOutstanding)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">Outstanding</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Funds & Goals Section */}
                {(reviewTab === "all" || reviewTab === "funds") && (
                  <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PiggyBank size={16} className="text-primary" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Emergency Buffer & Sinking Reserves ({fundsList.length + 1})
                        </h4>
                      </div>
                      <button
                        onClick={() => setStep(5)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        Modify <ArrowRight size={12} />
                      </button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🛡️</span>
                          <div>
                            <p className="text-xs font-bold text-foreground">Target Emergency Runway</p>
                            <p className="text-[10px] text-muted-foreground">3–6 months liquid safety reserve</p>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-primary tabular-nums">
                          {money(Number(emergencyTarget))}
                        </span>
                      </div>

                      {fundsList.map((fund) => (
                        <div
                          key={fund.id}
                          className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 p-2.5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg">{fund.icon || "🎯"}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{fund.name}</p>
                              <p className="text-[10px] text-muted-foreground">Target: {money(fund.targetAmount)}</p>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold tabular-nums shrink-0 ml-2">
                            {money(fund.currentAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Recurring Schedules Section */}
                {(reviewTab === "all" || reviewTab === "recurring") && (
                  <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={16} className="text-primary" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Scheduled Incomes & Monthly Bills ({recurringList.length})
                        </h4>
                      </div>
                      <button
                        onClick={() => setStep(6)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        Modify <ArrowRight size={12} />
                      </button>
                    </div>

                    {recurringList.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No recurring items configured.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {recurringList.map((rec) => {
                          const isInc = rec.type === "Income";
                          return (
                            <div
                              key={rec.id}
                              className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 p-2.5"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-[9px] font-bold rounded px-1 py-0.2 ${
                                      isInc
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    }`}
                                  >
                                    {rec.type}
                                  </span>
                                  <p className="text-xs font-bold text-foreground truncate">{rec.name}</p>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {rec.frequency} {rec.enabled ? "· Active" : "· Paused"}
                                </p>
                              </div>
                              <span
                                className={`text-xs font-extrabold tabular-nums shrink-0 ml-2 ${
                                  isInc ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {isInc ? "+" : "-"}{money(rec.amount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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
            onClick={() =>
              step === totalSteps - 1 ? handleFinish() : setStep((s) => Math.min(totalSteps - 1, s + 1))
            }
            className={`gap-1.5 text-xs font-semibold shadow-xs ${
              step === totalSteps - 1 ? "bg-primary text-primary-foreground px-6 py-2 h-10 font-bold" : ""
            }`}
          >
            {step === totalSteps - 1 ? (
              <>
                <Sparkles size={16} /> Launch WealthTrack Dashboard
              </>
            ) : (
              <>
                Continue <ArrowRight size={16} />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Onboarding Modals for Consistent Creation & Editing       */}
      {/* ========================================================= */}

      {/* Account Modal */}
      {modalType === "account" && (
        <AccountModal
          account={editingAccount}
          currency={currency}
          onClose={() => {
            setModalType(null);
            setEditingAccount(null);
          }}
          onSave={handleSaveAccount}
        />
      )}

      {/* Investment Holding Modal */}
      {modalType === "investment" && (
        <InvestmentHoldingModal
          data={data}
          existing={editingInvestment}
          onClose={() => {
            setModalType(null);
            setEditingInvestment(null);
          }}
          onSave={handleSaveInvestment}
        />
      )}

      {/* Loan Modal */}
      {modalType === "loan" && (
        <LoanModal
          data={data}
          existing={editingLoan}
          onClose={() => {
            setModalType(null);
            setEditingLoan(null);
          }}
          onSave={handleSaveLoan}
        />
      )}

      {/* Fund Modal */}
      {modalType === "fund" && (
        <FundModal
          open={true}
          accounts={activeAccounts}
          fund={editingFund}
          onClose={() => {
            setModalType(null);
            setEditingFund(null);
          }}
          onSave={handleSaveFund}
        />
      )}

      {/* Recurring Schedule Modal */}
      {modalType === "recurring" && (
        <RecurringModal
          item={editingRecurring}
          data={data}
          onClose={() => {
            setModalType(null);
            setEditingRecurring(null);
          }}
          onSave={handleSaveRecurring}
          onAddCategory={handleAddCategory}
        />
      )}
    </main>
  );
}

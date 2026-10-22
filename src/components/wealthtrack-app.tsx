import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Activity,
  ArrowLeftRight,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  TrendingUp,
  User,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { AppLogo } from "@/components/shared/AppLogo";
import { Modal } from "@/components/shared/Modal";
import { matchesDateRange, type DateRangeValue } from "@/components/shared/DateRangeFilter";
import { AuthPage, type AuthView } from "@/features/auth/AuthPage";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";
import { TransactionModal } from "@/features/transactions/TransactionModal";
import { TransactionDetail } from "@/features/transactions/TransactionDetail";
import { ImportModal } from "@/features/transactions/ImportModal";
import { AccountsPage } from "@/features/accounts/AccountsPage";
import { AccountModal } from "@/features/accounts/AccountModal";
import { TransferModal } from "@/features/accounts/TransferModal";
import { InvestmentsPage } from "@/features/investments/InvestmentsPage";
import { InvestmentHoldingModal } from "@/features/investments/InvestmentHoldingModal";
import { LoansPage } from "@/features/loans/LoansPage";
import { LoanModal } from "@/features/loans/LoanModal";
import { FundsPage } from "@/features/funds/FundsPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { PreferencesPage } from "@/features/preferences/PreferencesPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { CategoryModal } from "@/features/categories/CategoryModal";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { RecurringPage } from "@/features/recurring/RecurringPage";
import { RecurringModal } from "@/features/recurring/RecurringModal";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { getWealthRepository } from "@/services/api";
import { matchCategoryIcon } from "@/lib/icon-matcher";
import {
  createInitialState,
  createTransactionId,
  formatMoney,
  getAccountBalance,
  getHoldingsSummary,
  getLoansSummary,
  getNextRecurringDate,
  makeNotification,
  processDueRecurringTransactions,
  safeAmount,
  STORAGE_KEY,
  type Account,
  type AssetType,
  type Category,
  type CategoryKind,
  type CustomField,
  type CustomFund,
  type InvestmentAction,
  type InvestmentHolding,
  type InvestmentInstrument,
  type LoanLiability,
  type PurchasePlan,
  type RecurringItem,
  type Section,
  type Transaction,
  type TransactionType,
  type UserProfile,
  type WealthPreferences,
  type WealthState,
} from "@/lib/wealthtrack";

const navItems: { label: Section; path: string; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: ArrowLeftRight },
  { label: "Accounts", path: "/accounts", icon: Wallet },
  { label: "Investments", path: "/investments", icon: TrendingUp },
  { label: "Loans", path: "/loans", icon: Landmark },
  { label: "Funds", path: "/funds", icon: ShieldCheck },
  { label: "Recurring", path: "/recurring", icon: CalendarDays },
  { label: "Categories", path: "/categories", icon: Tag },
  { label: "Reports", path: "/reports", icon: Activity },
];

function getInitials(email: string) {
  return email.split("@")[0]?.slice(0, 2).toUpperCase() || "WT";
}

export function WealthTrackApp({ initialSection }: { initialSection?: Section } = {}) {
  const repository = useMemo(() => getWealthRepository(), []);

  const [data, setData] = useState<WealthState>(() => createInitialState());
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<Section>(() => {
    if (initialSection) return initialSection;
    if (typeof window !== "undefined") {
      const path = window.location.pathname.replace(/^\//, "").toLowerCase();
      if (path === "transactions") return "Transactions";
      if (path === "accounts") return "Accounts";
      if (path === "investments") return "Investments";
      if (path === "loans") return "Loans";
      if (path === "funds") return "Funds";
      if (path === "categories") return "Categories";
      if (path === "reports") return "Reports";
      if (path === "recurring") return "Recurring";
      if (path === "profile") return "Profile";
      if (path === "preferences" || path === "settings") return "Preferences";
    }
    return "Overview";
  });

  // Auth States
  const [authView, setAuthView] = useState<AuthView>("signin");
  const [email, setEmail] = useState("demo@wealthtrack.app");
  const [password, setPassword] = useState("Demo123!");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authErrors, setAuthErrors] = useState<Record<string, string>>({});

  // Navigation & Dialog States
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Modals
  const [modal, setModal] = useState<
    "transaction" | "account" | "category" | "recurring" | "confirm" | "import" | "transfer" | null
  >(null);
  const [transferSourceAccountId, setTransferSourceAccountId] = useState<string | undefined>(undefined);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    kind: string;
    id?: string;
    label: string;
    amount?: number;
  } | null>(null);

  // Unified Date Range Filter State
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: "1m",
  });

  // Transactions Page Specific Filters
  const [search, setSearch] = useState("");
  const [txType, setTxType] = useState("All types");
  const [txPriority, setTxPriority] = useState("All priorities");
  const [txCategory, setTxCategory] = useState("All categories");
  const [txAccount, setTxAccount] = useState("All accounts");
  const [txSort, setTxSort] = useState("Newest first");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [transactionForm, setTransactionForm] = useState<Partial<Transaction>>({});
  const [transactionErrors, setTransactionErrors] = useState<Record<string, string>>({});

  // Categories & Recurring Page States
  const [categoryTab, setCategoryTab] = useState<"All" | "Expense" | "Income">("All");

  // Reports Page Specific Filters
  const [reportPriority, setReportPriority] = useState("All priorities");
  const [reportCategory, setReportCategory] = useState("All categories");
  const [reportAccount, setReportAccount] = useState("All accounts");

  // CSV / Excel Import States
  const [csvText, setCsvText] = useState("");
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvError, setCsvError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings & Preferences States
  const [settingsTab, setSettingsTab] = useState("General");
  const [preferencesTab, setPreferencesTab] = useState("General & Regional");
  const [editingHolding, setEditingHolding] = useState<InvestmentHolding | null>(null);
  const [holdingModalOpen, setHoldingModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanLiability | null>(null);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState<Partial<CustomField>>({
    type: "Text",
    options: [],
    required: false,
  });
  const [tagDraft, setTagDraft] = useState("");

  // Concurrency lock against rapid duplicate clicks
  const savingLockRef = useRef(false);

  // Load state from repository on mount
  useEffect(() => {
    repository.getState().then((res) => {
      if (res.success && res.data) {
        // Upgrade legacy icons & ensure every category has proper emoji icon
        const upgradedCategories = res.data.categories.map((c) => {
          if (c.id === "cat-food" || c.name.toLowerCase().includes("food") || c.name.toLowerCase().includes("dining")) {
            return { ...c, icon: "🍽️" };
          }
          if (c.id === "cat-housing" || c.name.toLowerCase().includes("housing") || c.name.toLowerCase().includes("rent")) {
            return { ...c, icon: "🏠" };
          }
          if (c.id === "cat-travel" || c.name.toLowerCase().includes("transport")) {
            return { ...c, icon: "🚗" };
          }
          if (c.id === "cat-shopping" || c.name.toLowerCase().includes("shopping")) {
            return { ...c, icon: "🛍️" };
          }
          if (c.id === "cat-bills" || c.name.toLowerCase().includes("bill") || c.name.toLowerCase().includes("utilit")) {
            return { ...c, icon: "💡" };
          }
          if (c.id === "cat-health" || c.name.toLowerCase().includes("health") || c.name.toLowerCase().includes("medic")) {
            return { ...c, icon: "🏥" };
          }
          if (c.id === "cat-entertainment" || c.name.toLowerCase().includes("entertainment")) {
            return { ...c, icon: "🎬" };
          }
          if (c.id === "cat-salary" || c.name.toLowerCase().includes("salary")) {
            return { ...c, icon: "💼" };
          }
          if (c.id === "cat-freelance" || c.name.toLowerCase().includes("freelance")) {
            return { ...c, icon: "💻" };
          }
          if (c.id === "cat-investments" || c.name.toLowerCase().includes("invest")) {
            return { ...c, icon: "📈" };
          }
          if (c.id === "cat-other-income" || c.name.toLowerCase().includes("income")) {
            return { ...c, icon: "💰" };
          }
          const isLegacyOrInvalid = !c.icon || c.icon === "?" || ["⌂", "↗", "◇", "ϟ", "＋", "♫", "↙"].includes(c.icon);
          if (isLegacyOrInvalid) {
            return { ...c, icon: matchCategoryIcon(c.name, "📁") };
          }
          return c;
        });

        const baseState: WealthState = {
          ...res.data,
          categories: upgradedCategories,
        };
        const { updatedState, processedCount, processedItems } = processDueRecurringTransactions(baseState);
        setData(updatedState);
        if (processedCount > 0) {
          const names = processedItems.map((p) => p.name).join(", ");
          setTimeout(() => {
            toast.success(`⚡ Automatically recorded ${processedCount} recurring transaction${processedCount > 1 ? "s" : ""}`, {
              description: names,
            });
            notify("Automated Recurring Flow", `Auto-recorded: ${names}`);
          }, 300);
        }
      }
      setLoaded(true);
    });
  }, [repository]);

  useEffect(() => {
    if (initialSection && initialSection !== active) {
      setActive(initialSection);
    }
  }, [initialSection, active]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, "").toLowerCase();
      if (path === "transactions") setActive("Transactions");
      else if (path === "accounts") setActive("Accounts");
      else if (path === "categories") setActive("Categories");
      else if (path === "reports") setActive("Reports");
      else if (path === "recurring") setActive("Recurring");
      else if (path === "settings") setActive("Settings");
      else setActive("Overview");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Save changes via repository
  useEffect(() => {
    if (loaded) {
      repository.saveState(data);
    }
  }, [data, loaded, repository]);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.toggle("dark", data.preferences.theme === "dark");
  }, [data.preferences.theme, loaded]);

  const updateData = (patch: Partial<WealthState>) => {
    setData((current) => ({ ...current, ...patch }));
  };

  const updatePreferences = (patch: Partial<WealthPreferences>) => {
    setData((current) => ({
      ...current,
      preferences: { ...current.preferences, ...patch },
    }));
  };

  const handleAddHolding = () => {
    setEditingHolding(null);
    setHoldingModalOpen(true);
  };

  const handleEditHolding = (holding: InvestmentHolding) => {
    setEditingHolding(holding);
    setHoldingModalOpen(true);
  };

  const handleSaveHolding = (incomingHolding: InvestmentHolding) => {
    setData((current) => {
      let holding = { ...incomingHolding };
      let nextHoldings = current.investments ?? [];
      let nextRecurring = [...current.recurring];
      const recurringSipId = holding.recurringId || `rec-inv-${holding.id}`;

      // 100% Correlation: If holding is recurring (SIP), ensure a matching Recurring Item exists
      if (holding.isRecurring && (holding.sipAmount || holding.investedAmount)) {
        const existingRecIdx = nextRecurring.findIndex(
          (r) => r.id === recurringSipId || (holding.id && r.investmentId === holding.id)
        );
        const catInvestments =
          current.categories.find(
            (c) =>
              c.name.toLowerCase().includes("invest") ||
              c.name.toLowerCase().includes("saving") ||
              c.name.toLowerCase().includes("wealth")
          )?.id ?? current.categories[0]?.id;

        const sipItem: RecurringItem = {
          id: recurringSipId,
          name: `${holding.name} (SIP)`,
          type: "Investment",
          amount: Number(holding.sipAmount) || Number(holding.investedAmount) || 0,
          categoryId: catInvestments,
          accountId: holding.sipAccountId || current.accounts[0]?.id || "",
          frequency: (holding.sipFrequency as any) || "Monthly",
          intervalDays: 30,
          startDate: new Date().toISOString().slice(0, 10),
          endDate: "",
          nextDate: "2026-11-10",
          need: "Need",
          enabled: holding.status !== "Paused",
          investmentId: holding.id,
          instrumentType:
            holding.assetType === "ETF"
              ? "ETF"
              : holding.assetType === "Stocks & Equity"
              ? "Stocks"
              : holding.assetType === "Fixed deposit"
              ? "Fixed deposit"
              : "Mutual fund",
        };

        if (existingRecIdx >= 0) {
          nextRecurring[existingRecIdx] = sipItem;
        } else {
          nextRecurring = [sipItem, ...nextRecurring];
        }
        holding = { ...holding, recurringId: recurringSipId };
      } else {
        // If not recurring, remove any linked recurring item
        nextRecurring = nextRecurring.filter(
          (r) => r.id !== recurringSipId && r.investmentId !== holding.id
        );
        holding = { ...holding, recurringId: undefined, isRecurring: false };
      }

      const idx = nextHoldings.findIndex((h) => h.id === holding.id);
      if (idx >= 0) {
        nextHoldings = [...nextHoldings];
        nextHoldings[idx] = holding;
      } else {
        nextHoldings = [holding, ...nextHoldings];
      }

      return { ...current, investments: nextHoldings, recurring: nextRecurring };
    });
    setHoldingModalOpen(false);
    toast.success(editingHolding ? "Investment holding updated" : "Investment holding added", {
      description: `${incomingHolding.name} · ${money(incomingHolding.currentAmount)}${
        incomingHolding.isRecurring ? " (SIP active)" : ""
      }`,
    });
  };

  const handleToggleHoldingSip = (holding: InvestmentHolding) => {
    setData((current) => {
      const nextStatus: "Active" | "Paused" = holding.status === "Paused" ? "Active" : "Paused";
      const nextHoldings: InvestmentHolding[] = (current.investments ?? []).map((h) =>
        h.id === holding.id ? { ...h, status: nextStatus } : h
      );
      const nextRecurring = current.recurring.map((r) =>
        r.investmentId === holding.id || r.id === holding.recurringId
          ? { ...r, enabled: nextStatus === "Active" }
          : r
      );
      return { ...current, investments: nextHoldings, recurring: nextRecurring };
    });
    toast.success(
      holding.status === "Paused" ? "SIP Resumed" : "SIP Paused",
      {
        description: `${holding.name} monthly schedule updated.`,
      }
    );
  };

  const handleDeleteHolding = (holding: InvestmentHolding) => {
    setData((current) => ({
      ...current,
      investments: (current.investments ?? []).filter((h) => h.id !== holding.id),
      recurring: current.recurring.filter(
        (r) => r.investmentId !== holding.id && r.id !== holding.recurringId
      ),
    }));
    toast.success("Holding removed", {
      description: `${holding.name} was removed from your investments and recurring schedules.`,
    });
  };

  const handleAddLoan = () => {
    setEditingLoan(null);
    setLoanModalOpen(true);
  };

  const handleEditLoan = (loan: LoanLiability) => {
    setEditingLoan(loan);
    setLoanModalOpen(true);
  };

  const handleSaveLoan = (loan: LoanLiability) => {
    setData((current) => {
      const loans = current.loans ?? [];
      const idx = loans.findIndex((l) => l.id === loan.id);
      let nextLoans: LoanLiability[];
      if (idx >= 0) {
        nextLoans = [...loans];
        nextLoans[idx] = loan;
      } else {
        nextLoans = [loan, ...loans];
      }

      // 100% Correlation: If autoRecurringEmi is enabled, ensure a matching Recurring Item exists!
      let nextRecurring = [...current.recurring];
      const recurringEmiId = `rec-loan-${loan.id}`;
      const existingRecIdx = nextRecurring.findIndex((r) => r.id === recurringEmiId);

      if (loan.autoRecurringEmi) {
        const catBills = current.categories.find(
          (c) => c.name.toLowerCase().includes("bill") || c.name.toLowerCase().includes("housing")
        )?.id ?? current.categories[0]?.id;

        const recurringEmiItem: RecurringItem = {
          id: recurringEmiId,
          name: `${loan.name} (EMI)`,
          type: "Expense",
          amount: loan.emiAmount,
          categoryId: catBills,
          accountId: loan.repaymentAccountId,
          frequency: "Monthly",
          intervalDays: 30,
          startDate: loan.startDate,
          endDate: loan.endDate ?? "",
          nextDate: "2026-11-05",
          need: "Need",
          enabled: true,
        };

        if (existingRecIdx >= 0) {
          nextRecurring[existingRecIdx] = recurringEmiItem;
        } else {
          nextRecurring = [recurringEmiItem, ...nextRecurring];
        }
      } else if (existingRecIdx >= 0) {
        nextRecurring = nextRecurring.filter((r) => r.id !== recurringEmiId);
      }

      return { ...current, loans: nextLoans, recurring: nextRecurring };
    });

    setLoanModalOpen(false);
    toast.success(editingLoan ? "Loan details updated" : "Loan & EMI schedule added", {
      description: `${loan.name} · EMI ${money(loan.emiAmount)}/mo`,
    });
  };

  const handleDeleteLoan = (loan: LoanLiability) => {
    setData((current) => ({
      ...current,
      loans: (current.loans ?? []).filter((l) => l.id !== loan.id),
      recurring: current.recurring.filter((r) => r.id !== `rec-loan-${loan.id}`),
    }));
    toast.success("Loan removed", {
      description: `${loan.name} was removed from your records.`,
    });
  };

  const handleRecordLoanEmiPayment = (loan: LoanLiability) => {
    const catLoan =
      data.categories.find(
        (c) =>
          c.id === "cat-loan-emi" ||
          c.name.toLowerCase().includes("loan") ||
          c.name.toLowerCase().includes("debt")
      )?.id ?? data.categories[0]?.id;

    beginTransaction({
      type: "EMI / Loan Payment",
      amount: loan.emiAmount,
      accountId: loan.repaymentAccountId,
      categoryId: catLoan,
      loanId: loan.id,
      description: `${loan.name} EMI`,
      merchant: loan.lenderInstitution,
      need: "Need",
      notes: `Monthly EMI repayment for ${loan.name}`,
    });
  };

  const handleSaveProfile = (profile: UserProfile) => {
    setData((current) => ({ ...current, profile }));
    setEmail(profile.email);
    setFullName(profile.fullName);
  };

  const handleSaveFund = (fund: CustomFund) => {
    setData((current) => {
      const existing = current.funds ?? [];
      const index = existing.findIndex((f) => f.id === fund.id);
      const updated =
        index >= 0
          ? existing.map((f, i) => (i === index ? fund : f))
          : [...existing, fund];
      return { ...current, funds: updated };
    });
    toast.success(fund.name, {
      description: `Fund saved with target ${money(fund.targetAmount)}.`,
    });
  };

  const handleDeleteFund = (fundId: string) => {
    setData((current) => ({
      ...current,
      funds: (current.funds ?? []).filter((f) => f.id !== fundId),
    }));
    toast.success("Fund deleted", {
      description: "The fund has been removed from your goals.",
    });
  };

  const handleQuickDepositFund = (fundId: string, amount: number) => {
    setData((current) => {
      const updated = (current.funds ?? []).map((f) =>
        f.id === fundId ? { ...f, currentAmount: f.currentAmount + amount } : f
      );
      return { ...current, funds: updated };
    });
    toast.success("Deposit recorded", {
      description: `Allocated ${money(amount)} to fund balance.`,
    });
  };

  const handleSavePlan = (plan: PurchasePlan) => {
    setData((current) => {
      const existing = current.plans ?? [];
      const index = existing.findIndex((p) => p.id === plan.id);
      const updated =
        index >= 0
          ? existing.map((p, i) => (i === index ? plan : p))
          : [...existing, plan];
      return { ...current, plans: updated };
    });
    toast.success(plan.title, {
      description: `Simulation updated for ${money(plan.targetCost)}.`,
    });
  };

  const handleDeletePlan = (planId: string) => {
    setData((current) => ({
      ...current,
      plans: (current.plans ?? []).filter((p) => p.id !== planId),
    }));
    toast.success("Plan deleted", {
      description: "The purchase scenario has been removed.",
    });
  };

  const notify = (title: string, description: string) => {
    setData((current) => ({
      ...current,
      notifications: [makeNotification(title, description), ...current.notifications],
    }));
  };

  const currency = data.preferences.currency;
  const money = (amount: number) => formatMoney(amount, currency);
  const accountById = (id: string) => data.accounts.find((account) => account.id === id);
  const categoryById = (id: string) => data.categories.find((category) => category.id === id);
  const liveAccounts = data.accounts.filter((account) => !account.archived);

  // Navigation Handler
  const goSection = (section: Section) => {
    setActive(section);
    setMobileNav(false);
    setSelectedTransaction(null);
    setSelectedAccount(null);
    if (typeof window !== "undefined") {
      const targetPath = section === "Overview" ? "/" : `/${section.toLowerCase()}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, "", targetPath);
      }
    }
  };

  // Auth Submissions
  const startLogin = (address = email) => {
    setAuthLoading(true);
    setTimeout(() => {
      updateData({ session: true });
      setAuthLoading(false);
      setAuthErrors({});
      toast.success(`Welcome${address ? ` back, ${address.split("@")[0]}` : ""}`);
    }, 450);
  };

  const submitAuth = () => {
    const errors: Record<string, string> = {};
    if (authView !== "forgot" && !password.trim()) errors.password = "Enter your password.";
    if (authView !== "forgot" && password.trim().length < 6) errors.password = "Use at least 6 characters.";
    if (authView === "signup" && !fullName.trim()) errors.fullName = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
    if (authView === "signup" && password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    if (authView === "signup" && password.length < 8) errors.password = "Use at least 8 characters.";
    setAuthErrors(errors);
    if (Object.keys(errors).length) return;

    if (authView === "forgot") {
      setAuthLoading(true);
      setTimeout(() => {
        setAuthLoading(false);
        toast.success("Reset link simulated", { description: "No email was sent in this local demo." });
        setAuthView("signin");
      }, 500);
      return;
    }
    startLogin();
  };

  // Transaction Actions
  const beginTransaction = (preset?: Partial<Transaction>, existing?: Transaction) => {
    const form: Partial<Transaction> = existing
      ? { ...existing }
      : {
          date: new Date().toISOString().slice(0, 16),
          description: "",
          type: preset?.type ?? data.preferences.defaultType,
          amount: undefined,
          categoryId: "",
          accountId: data.preferences.defaultAccount || liveAccounts[0]?.id,
          destinationAccountId: "",
          paymentMethod: data.preferences.defaultPaymentMethod,
          need: "Need",
          merchant: "",
          tags: [],
          notes: "",
          recurring: false,
          customValues: {},
          ...preset,
        };
    setEditTransaction(existing ?? null);
    setTransactionForm(form);
    setTransactionErrors({});
    setSelectedTransaction(null);
    setModal("transaction");
  };

  const saveTransaction = (keepOpen = false) => {
    if (savingLockRef.current) return;
    const type = transactionForm.type ?? "Expense";
    const errors: Record<string, string> = {};

    if (!transactionForm.amount || Number(transactionForm.amount) <= 0) {
      if (type !== "Adjustment") {
        errors.amount = "Enter an amount greater than zero.";
      }
    }
    if (!transactionForm.date) errors.date = "Choose a date.";
    if (!transactionForm.accountId) errors.accountId = "Choose an account.";
    if (!accountById(transactionForm.accountId ?? "")) errors.accountId = "Choose an available account.";
    if (type === "Transfer" && !transactionForm.destinationAccountId) errors.destinationAccountId = "Choose a destination account.";
    if (type === "Transfer" && transactionForm.accountId === transactionForm.destinationAccountId) errors.destinationAccountId = "Choose a different destination.";
    if (type !== "Transfer" && type !== "Adjustment" && type !== "Investment" && !categoryById(transactionForm.categoryId ?? "")) errors.categoryId = "Choose a category.";

    setTransactionErrors(errors);
    if (Object.keys(errors).length) return;

    savingLockRef.current = true;

    const cat = categoryById(transactionForm.categoryId ?? "");
    const description =
      transactionForm.description?.trim() ||
      cat?.name ||
      (type === "Transfer" ? "Transfer" : type === "Investment" ? "Investment" : "Transaction");

    const saved: Transaction = {
      id: editTransaction?.id ?? createTransactionId(),
      date: transactionForm.date!,
      description,
      type,
      amount: Number(transactionForm.amount),
      categoryId: type === "Transfer" ? "" : transactionForm.categoryId ?? "",
      accountId: transactionForm.accountId!,
      destinationAccountId: transactionForm.destinationAccountId ?? "",
      paymentMethod: transactionForm.paymentMethod ?? "UPI",
      need: transactionForm.need ?? (cat?.name === "Shopping" || cat?.name === "Entertainment" ? "Want" : "Need"),
      merchant: transactionForm.merchant ?? "",
      tags: transactionForm.tags ?? [],
      notes: transactionForm.notes ?? "",
      recurring: transactionForm.recurring ?? false,
      customValues: transactionForm.customValues ?? {},
      investmentAction: transactionForm.investmentAction,
      instrumentType: transactionForm.instrumentType,
      instrumentName: transactionForm.instrumentName,
      units: transactionForm.units,
      pricePerUnit: transactionForm.pricePerUnit,
      loanId: transactionForm.loanId,
    };

    setData((current) => {
      let updatedLoans = current.loans;
      if (saved.type === "EMI / Loan Payment" && saved.loanId && !editTransaction) {
        updatedLoans = (current.loans || []).map((loan) => {
          if (loan.id === saved.loanId) {
            const newOutstanding = Math.max(0, safeAmount(loan.currentOutstanding) - saved.amount);
            return {
              ...loan,
              currentOutstanding: newOutstanding,
              paidEmisCount: (loan.paidEmisCount || 0) + 1,
              updatedAt: new Date().toISOString().slice(0, 10),
            };
          }
          return loan;
        });
      }

      return {
        ...current,
        loans: updatedLoans,
        transactions: editTransaction
          ? current.transactions.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current.transactions],
      };
    });

    toast.success(editTransaction ? "Transaction updated" : "Transaction added", {
      description: `${saved.description} · ${money(saved.amount)}`,
    });
    notify(editTransaction ? "Transaction updated" : "Transaction added", `${saved.description} · ${money(saved.amount)}`);

    savingLockRef.current = false;

    if (keepOpen) {
      setTransactionForm((current) => ({
        ...current,
        amount: undefined,
        description: "",
        date: new Date().toISOString().slice(0, 16),
        notes: "",
        merchant: "",
      }));
      setEditTransaction(null);
    } else {
      setModal(null);
    }
  };

  const duplicateTransaction = (transaction: Transaction) => {
    beginTransaction({ ...transaction, id: undefined, description: `${transaction.description} (copy)` });
  };

  const openTransferModal = (accountId?: string) => {
    setTransferSourceAccountId(accountId);
    setModal("transfer");
  };

  const executeDirectTransfer = ({
    fromAccountId,
    toAccountId,
    amount,
    date,
    notes,
  }: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    notes?: string;
  }) => {
    const fromAccount = accountById(fromAccountId);
    const toAccount = accountById(toAccountId);
    const description = notes || `Transfer to ${toAccount?.name || "Account"}`;

    const saved: Transaction = {
      id: createTransactionId(),
      date,
      description,
      type: "Transfer",
      amount,
      categoryId: "",
      accountId: fromAccountId,
      destinationAccountId: toAccountId,
      paymentMethod: "Transfer",
      need: "Need",
      merchant: toAccount?.name || "",
      tags: ["Transfer"],
      notes: notes || "",
      recurring: false,
      customValues: {},
    };

    setData((current) => ({
      ...current,
      transactions: [saved, ...current.transactions],
    }));

    toast.success("Transfer completed", {
      description: `${money(amount)} transferred from ${fromAccount?.name || "Source"} to ${toAccount?.name || "Destination"}`,
    });
    notify("Transfer completed", `${money(amount)} transferred from ${fromAccount?.name || "Source"} to ${toAccount?.name || "Destination"}`);
    setModal(null);
  };

  // Delete & Confirmation
  const requestDelete = (kind: string, id: string, label: string, amount?: number) => {
    setPendingDelete({ kind, id, label, amount });
    setModal("confirm");
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { kind, id } = pendingDelete;
    if (kind === "transaction") setData((current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }));
    if (kind === "account") setData((current) => ({ ...current, accounts: current.accounts.map((item) => item.id === id ? { ...item, archived: true } : item) }));
    if (kind === "category") setData((current) => ({ ...current, categories: current.categories.map((item) => item.id === id ? { ...item, archived: true } : item) }));
    if (kind === "recurring") setData((current) => ({ ...current, recurring: current.recurring.filter((item) => item.id !== id) }));
    if (kind === "reset") { const initial = createInitialState(); setData(initial); setActive("Overview"); }
    if (kind === "signout") { updateData({ session: false }); setAuthView("signin"); setPassword(""); }
    if (kind === "bulk") { setData((current) => ({ ...current, transactions: current.transactions.filter((item) => !selectedIds.includes(item.id)) })); setSelectedIds([]); }
    toast.success(kind === "reset" ? "Demo data reset" : kind === "signout" ? "Signed out" : "Removed");
    setModal(null);
    setPendingDelete(null);
  };

  // Account Actions
  const openAccountForm = (account?: Account) => {
    setEditingAccount(account ?? null);
    setModal("account");
  };

  const saveAccount = (form: Partial<Account>) => {
    if (!form.name?.trim()) {
      toast.error("Account name is required");
      return;
    }
    const account: Account = {
      id: editingAccount?.id ?? createTransactionId(),
      name: form.name.trim(),
      kind: form.kind ?? "Bank account",
      institution: form.institution ?? "",
      identifier: form.identifier ?? "",
      openingBalance: Number(form.openingBalance) || 0,
      notes: form.notes ?? "",
    };
    setData((current) => ({
      ...current,
      accounts: editingAccount
        ? current.accounts.map((item) => (item.id === account.id ? account : item))
        : [...current.accounts, account],
    }));
    setModal(null);
    toast.success(editingAccount ? "Account updated" : "Account added");
  };

  const handleReconcileAccount = (accountId: string, newBalance: number, notes = "Reconciled balance") => {
    const acc = data.accounts.find((a) => a.id === accountId);
    if (!acc) return;
    const current = getAccountBalance(acc, data.transactions);
    const difference = newBalance - current;
    if (difference === 0) {
      toast.success("Account balance matches statement already");
      return;
    }
    const adjustment: Transaction = {
      id: createTransactionId(),
      date: new Date().toISOString().slice(0, 16),
      description: "Balance reconciliation",
      type: "Adjustment",
      amount: difference,
      categoryId: "",
      accountId: acc.id,
      destinationAccountId: "",
      paymentMethod: "Adjustment",
      need: "Need",
      merchant: "",
      tags: ["reconciled"],
      notes,
      recurring: false,
      customValues: {},
    };
    setData((currentState) => ({
      ...currentState,
      transactions: [adjustment, ...currentState.transactions],
    }));
    notify("Account reconciled", `${acc.name} · ${money(newBalance)}`);
    toast.success("Account balance reconciled successfully");
  };

  // Category Actions
  const openCategoryForm = (category?: Category, kind?: "All" | CategoryKind) => {
    setEditingCategory(category ?? null);
    if (kind && kind !== "All") setCategoryTab(kind);
    else if (category?.kind) setCategoryTab(category.kind);
    setModal("category");
  };

  const saveCategory = (form: Partial<Category>) => {
    if (!form.name?.trim()) {
      toast.error("Category name is required");
      return;
    }
    const category: Category = {
      id: editingCategory?.id ?? createTransactionId(),
      name: form.name.trim(),
      kind: form.kind ?? (categoryTab === "Income" ? "Income" : "Expense"),
      icon: form.icon ?? "📁",
      color: form.color ?? "blue",
      monthlyLimit: Number(form.monthlyLimit) || 0,
      defaultNeed: form.defaultNeed ?? "Need",
    };
    setData((current) => ({
      ...current,
      categories: editingCategory
        ? current.categories.map((item) => (item.id === category.id ? category : item))
        : [...current.categories, category],
    }));
    setModal(null);
    toast.success(editingCategory ? "Category updated" : "Category added");
  };

  // Recurring Actions
  const addRecurring = (form: Partial<RecurringItem>) => {
    if (!form.name?.trim() || !form.amount || !form.accountId) {
      toast.error("Add a name, amount, and account");
      return;
    }
    const item: RecurringItem = {
      id: editingRecurring?.id ?? createTransactionId(),
      name: form.name.trim(),
      type: form.type ?? "Expense",
      amount: Number(form.amount),
      categoryId: form.categoryId ?? "cat-bills",
      accountId: form.accountId,
      frequency: form.frequency ?? "Monthly",
      intervalDays: Number(form.intervalDays) || 30,
      startDate: form.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: form.endDate ?? "",
      nextDate: form.nextDate ?? new Date().toISOString().slice(0, 10),
      need: form.need ?? "Need",
      enabled: form.enabled ?? true,
      investmentId: form.investmentId,
      instrumentType: form.instrumentType,
    };
    setData((current) => {
      let nextInvestments = [...(current.investments ?? [])];
      if (item.type === "Investment") {
        const invIdx = nextInvestments.findIndex(
          (inv) =>
            (item.investmentId && inv.id === item.investmentId) ||
            inv.recurringId === item.id ||
            inv.name.toLowerCase() === item.name.toLowerCase()
        );
        if (invIdx >= 0) {
          nextInvestments[invIdx] = {
            ...nextInvestments[invIdx],
            isRecurring: true,
            recurringId: item.id,
            sipAmount: item.amount,
            sipFrequency: item.frequency,
            sipAccountId: item.accountId,
            status: item.enabled ? "Active" : "Paused",
          };
          item.investmentId = nextInvestments[invIdx].id;
        } else {
          const newHolding: InvestmentHolding = {
            id: `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            name: item.name.replace(/\s*\(SIP\)\s*/i, ""),
            assetType: (item.instrumentType as AssetType) || "Mutual fund",
            investedAmount: 0,
            currentAmount: 0,
            isRecurring: true,
            recurringId: item.id,
            sipAmount: item.amount,
            sipFrequency: item.frequency,
            sipAccountId: item.accountId,
            status: item.enabled ? "Active" : "Paused",
            updatedAt: new Date().toISOString().slice(0, 10),
          };
          item.investmentId = newHolding.id;
          nextInvestments = [newHolding, ...nextInvestments];
        }
      }

      return {
        ...current,
        recurring: editingRecurring
          ? current.recurring.map((row) => (row.id === item.id ? item : row))
          : [...current.recurring, item],
        investments: nextInvestments,
      };
    });
    setModal(null);
    toast.success(editingRecurring ? "Schedule updated" : "Recurring schedule added");
  };

  const recordRecurringNow = (item: RecurringItem) => {
    if (savingLockRef.current) return;
    savingLockRef.current = true;

    const transaction: Transaction = {
      id: createTransactionId(),
      date: new Date().toISOString().slice(0, 16),
      description: item.name,
      type: item.type,
      amount: item.amount,
      categoryId: item.categoryId,
      accountId: item.accountId,
      destinationAccountId: "",
      paymentMethod: "Recurring",
      need: item.need ?? "Need",
      merchant: item.name,
      tags: ["recurring"],
      notes: `Recorded on ${new Date().toISOString().slice(0, 10)}`,
      recurring: true,
      customValues: {},
    };

    const nextDate = getNextRecurringDate(item.nextDate, item.frequency, item.intervalDays);

    setData((current) => ({
      ...current,
      transactions: [transaction, ...current.transactions],
      recurring: current.recurring.map((r) => (r.id === item.id ? { ...r, nextDate } : r)),
    }));

    toast.success("Recurring transaction recorded", {
      description: `${item.name} · ${money(item.amount)} · Next due: ${nextDate}`,
    });
    savingLockRef.current = false;
  };

  // Filtered Transaction Computations
  const filteredTransactions = useMemo(() => {
    const searchTerm = search.toLowerCase().trim();
    const result = data.transactions.filter((transaction) => {
      const matchesText =
        !searchTerm ||
        [transaction.description, transaction.merchant, transaction.notes, transaction.tags.join(" ")].some(
          (value) => value.toLowerCase().includes(searchTerm)
        );
      const matchesPriority = txPriority === "All priorities" || transaction.need === txPriority;
      const matchesRange = matchesDateRange(transaction.date, dateRange);

      return (
        matchesText &&
        matchesPriority &&
        matchesRange &&
        (txType === "All types" || transaction.type === txType) &&
        (txCategory === "All categories" || transaction.categoryId === txCategory) &&
        (txAccount === "All accounts" ||
          transaction.accountId === txAccount ||
          transaction.destinationAccountId === txAccount)
      );
    });

    return result.sort((a, b) =>
      txSort === "Oldest first"
        ? a.date.localeCompare(b.date)
        : txSort === "Amount: high to low"
        ? b.amount - a.amount
        : txSort === "Amount: low to high"
        ? a.amount - b.amount
        : txSort === "Description"
        ? a.description.localeCompare(b.description)
        : b.date.localeCompare(a.date)
    );
  }, [data.transactions, dateRange, search, txAccount, txCategory, txPriority, txSort, txType]);

  const reportTransactions = useMemo(() => {
    return data.transactions.filter((transaction) => matchesDateRange(transaction.date, dateRange));
  }, [data.transactions, dateRange]);

  // Bulk Operations
  const toggleSelected = (id: string) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  const toggleAll = () =>
    setSelectedIds((ids) =>
      filteredTransactions.every((item) => ids.includes(item.id))
        ? ids.filter((id) => !filteredTransactions.some((item) => item.id === id))
        : [...new Set([...ids, ...filteredTransactions.map((item) => item.id)])]
    );

  const bulkReassign = (categoryId: string) => {
    setData((current) => ({
      ...current,
      transactions: current.transactions.map((item) =>
        selectedIds.includes(item.id) ? { ...item, categoryId } : item
      ),
    }));
    setSelectedIds([]);
    toast.success("Categories updated");
  };

  const bulkReassignPriority = (priority: "Need" | "Want") => {
    setData((current) => ({
      ...current,
      transactions: current.transactions.map((item) =>
        selectedIds.includes(item.id) ? { ...item, need: priority } : item
      ),
    }));
    setSelectedIds([]);
    toast.success(`Priority updated to ${priority}`);
  };

  // CSV & Excel Export / Import Handlers
  const exportCsv = (rows = data.transactions) => {
    const headers = [
      "date",
      "description",
      "type",
      "amount",
      "category",
      "account",
      "payment_method",
      "priority",
      "merchant",
      "investment_action",
      "instrument_type",
      "instrument_name",
      "units",
      "price_per_unit",
      "notes",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((item) =>
        [
          item.date,
          item.description,
          item.type,
          item.amount,
          categoryById(item.categoryId)?.name ?? "",
          accountById(item.accountId)?.name ?? "",
          item.paymentMethod,
          item.need,
          item.merchant,
          item.investmentAction ?? "",
          item.instrumentType ?? "",
          item.instrumentName ?? "",
          item.units ?? "",
          item.pricePerUnit ?? "",
          item.notes,
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "wealthtrack-transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded", { description: `${rows.length} transactions exported.` });
  };

  const downloadExcelTemplate = () => {
    const today = new Date().toISOString().slice(0, 10);
    const templateRows = [
      [
        "Date",
        "Category",
        "Amount",
        "Type",
        "Priority",
        "Account",
        "Description",
        "InvestmentAction",
        "InstrumentType",
        "InstrumentName",
        "Units",
        "PricePerUnit",
      ],
      [today, "Food & dining", 1250, "Expense", "Need", data.accounts[0]?.name || "Everyday account", "Weekly groceries", "", "", "", "", ""],
      [today, "Transport", 350, "Expense", "Need", data.accounts[1]?.name || "Paytm wallet", "Metro card recharge", "", "", "", "", ""],
      [today, "Shopping", 2499, "Expense", "Want", data.accounts[0]?.name || "Everyday account", "Running shoes", "", "", "", "", ""],
      [today, "Salary", 85000, "Income", "Need", data.accounts[0]?.name || "Everyday account", "Monthly salary credit", "", "", "", "", ""],
      [today, "Investments", 5000, "Investment", "Need", data.accounts[0]?.name || "Everyday account", "Monthly Index SIP", "Contribution", "SIP", "Nifty 50 Index Fund", 25, 200],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(templateRows);

    const refRows = [
      [
        "VALID CATEGORIES",
        "KIND",
        "",
        "VALID ACCOUNTS",
        "ACCOUNT TYPE",
        "",
        "VALID TYPES",
        "INVESTMENT ACTIONS",
      ],
      ...data.categories.map((c, idx) => [
        c.name,
        c.kind,
        "",
        data.accounts[idx]?.name ?? "",
        data.accounts[idx]?.kind ?? "",
        "",
        idx === 0 ? "Expense" : idx === 1 ? "Income" : idx === 2 ? "Transfer" : idx === 3 ? "Investment" : idx === 4 ? "Refund" : "",
        idx === 0 ? "Contribution" : idx === 1 ? "Purchase" : idx === 2 ? "Sale" : idx === 3 ? "Maturity" : idx === 4 ? "Dividend" : idx === 5 ? "Valuation" : "",
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(refRows);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Transactions_To_Fill");
    XLSX.utils.book_append_sheet(wb, ws2, "Reference_Guide");
    XLSX.writeFile(wb, "WealthTrack_Transactions_Template.xlsx");
    toast.success("Excel template downloaded", { description: "Fill Sheet 1 and upload it back here." });
  };

  const downloadCsvTemplate = () => {
    const today = new Date().toISOString().slice(0, 10);
    const csvContent = [
      "Date,Category,Amount,Type,Priority,Account,Description,InvestmentAction,InstrumentType,InstrumentName,Units,PricePerUnit",
      `${today},Food & dining,1250,Expense,Need,Everyday account,Weekly groceries,,,,,`,
      `${today},Transport,350,Expense,Need,Paytm wallet,Metro recharge,,,,,`,
      `${today},Shopping,2499,Expense,Want,Everyday account,Running shoes,,,,,`,
      `${today},Salary,85000,Income,Need,Everyday account,Monthly salary,,,,,`,
      `${today},Investments,5000,Investment,Need,Everyday account,Monthly SIP,Contribution,SIP,Nifty 50 Fund,25,200`,
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "WealthTrack_Transactions_Template.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV template downloaded");
  };

  const parseMatrix = (matrix: (string | number)[][]) => {
    if (!matrix || matrix.length < 2) {
      setCsvError("File appears empty or has no transaction rows.");
      return;
    }
    const headers = matrix[0]?.map((item) => String(item ?? "").trim().toLowerCase()) ?? [];
    const hasCategory = headers.some((h) => h.includes("cat"));
    const hasDescription = headers.some((h) => h.includes("desc") || h.includes("item") || h.includes("title"));
    const hasAmount = headers.some((h) => h.includes("amount") || h.includes("amt") || h.includes("price") || h.includes("cost"));

    if (!hasAmount || (!hasCategory && !hasDescription)) {
      setCsvError("File needs at least Category (or Description) and Amount columns.");
      return;
    }

    setCsvRows(matrix.map((row) => row.map((cell) => String(cell ?? "").trim())));
    setCsvError("");
  };

  const parseCsv = (text: string) => {
    const rows = text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) =>
        line
          .match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g)
          ?.map((cell) => cell.replace(/,$/, "").replace(/^"|"$/g, "").replaceAll('""', '"')) ?? []
      );
    parseMatrix(rows);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          setCsvError("No sheet found in this Excel file.");
          return;
        }
        const ws = wb.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1 });
        const validRows = rows.filter((r) => r && r.some((c) => c !== undefined && c !== null && String(c).trim() !== ""));
        parseMatrix(validRows);
      } else {
        const text = await file.text();
        setCsvText(text);
        parseCsv(text);
      }
    } catch {
      setCsvError("Failed to parse file. Please upload a valid .xlsx or .csv file.");
    }
  };

  const applyImport = () => {
    if (!csvRows.length) return;
    const headers = csvRows[0]?.map((item) => item.trim().toLowerCase()) ?? [];
    const categoryIndex = headers.findIndex((h) => h.includes("cat"));
    const descriptionIndex = headers.findIndex((h) => h.includes("desc") || h.includes("item") || h.includes("title"));
    const amountIndex = headers.findIndex((h) => h.includes("amount") || h.includes("amt") || h.includes("price"));
    const dateIndex = headers.findIndex((h) => h.includes("date"));
    const typeIndex = headers.findIndex((h) => h.includes("type"));
    const needIndex = headers.findIndex((h) => h.includes("need") || h.includes("want") || h.includes("priority"));
    const accountIndex = headers.findIndex((h) => h.includes("acc"));
    const loanIndex = headers.findIndex((h) => h.includes("loan"));

    // Investment columns
    const actionIndex = headers.findIndex((h) => h.includes("action") || h.includes("investmentaction"));
    const instrumentTypeIndex = headers.findIndex((h) => h.includes("instrumenttype") || h.includes("instrument_type"));
    const instrumentNameIndex = headers.findIndex((h) => h.includes("instrumentname") || h.includes("instrument_name") || h.includes("fund"));
    const unitsIndex = headers.findIndex((h) => h.includes("unit"));
    const pricePerUnitIndex = headers.findIndex((h) => h.includes("priceperunit") || h.includes("price_per_unit") || h.includes("nav"));

    const rows = csvRows.slice(1).filter((row) => {
      const amt = Number(row[amountIndex]);
      return amt && amt > 0;
    });

    if (!rows.length) {
      setCsvError("No valid rows with amounts found to import.");
      return;
    }

    const imported = rows.map((row): Transaction => {
      const catName = categoryIndex >= 0 ? row[categoryIndex]?.trim() : "";
      const matchedCat = data.categories.find(
        (item) => item.name.toLowerCase() === catName?.toLowerCase()
      );

      const rawType = typeIndex >= 0 ? (row[typeIndex]?.trim() as TransactionType) : "Expense";
      const validTypes: TransactionType[] = [
        "Expense",
        "Income",
        "EMI / Loan Payment",
        "Borrow / Loan Taken",
        "Lend / Loan Given",
        "Debt Recovery",
        "Refund",
        "Transfer",
        "Investment",
        "Adjustment",
      ];
      const type: TransactionType = validTypes.includes(rawType) ? rawType : "Expense";

      const rawNeed = needIndex >= 0 ? row[needIndex]?.trim().toLowerCase() : "";
      const need: "Need" | "Want" = rawNeed === "want" ? "Want" : "Need";

      const accName = accountIndex >= 0 ? row[accountIndex]?.trim() : "";
      const matchedAcc = data.accounts.find(
        (item) => !item.archived && item.name.toLowerCase() === accName?.toLowerCase()
      );

      const loanName = loanIndex >= 0 ? row[loanIndex]?.trim() : "";
      const matchedLoan = (data.loans || []).find(
        (l) => l.name.toLowerCase() === loanName.toLowerCase() || l.id === loanName
      );

      const desc =
        (descriptionIndex >= 0 ? row[descriptionIndex]?.trim() : "") ||
        matchedCat?.name ||
        catName ||
        type;

      const investmentAction = actionIndex >= 0 ? (row[actionIndex]?.trim() as InvestmentAction) : undefined;
      const instrumentType = instrumentTypeIndex >= 0 ? (row[instrumentTypeIndex]?.trim() as InvestmentInstrument) : undefined;
      const instrumentName = instrumentNameIndex >= 0 ? row[instrumentNameIndex]?.trim() : undefined;
      const units = unitsIndex >= 0 ? Number(row[unitsIndex]) || undefined : undefined;
      const pricePerUnit = pricePerUnitIndex >= 0 ? Number(row[pricePerUnitIndex]) || undefined : undefined;

      return {
        id: createTransactionId(),
        date: (dateIndex >= 0 ? row[dateIndex]?.trim() : "") || new Date().toISOString().slice(0, 10),
        description: desc,
        type,
        amount: Number(row[amountIndex]),
        categoryId: matchedCat?.id ?? (type === "Income" ? "cat-salary" : "cat-food"),
        accountId: matchedAcc?.id || data.preferences.defaultAccount || liveAccounts[0]?.id || "",
        destinationAccountId: "",
        paymentMethod: "Imported",
        need,
        merchant: "",
        tags: ["imported"],
        notes: "Bulk imported",
        recurring: false,
        customValues: {},
        investmentAction,
        instrumentType,
        instrumentName,
        units,
        pricePerUnit,
        loanId: matchedLoan?.id,
      };
    });

    setData((current) => ({ ...current, transactions: [...imported, ...current.transactions] }));
    setModal(null);
    notify("Import complete", `${imported.length} transactions imported successfully.`);
    toast.success(`${imported.length} transactions imported successfully!`);
  };

  const openImport = () => {
    setCsvText("");
    setCsvRows([]);
    setCsvError("");
    setModal("import");
  };

  // Global Quick Search
  const filteredSearch = searchText.trim().toLowerCase();
  const globalResults = filteredSearch
    ? [
        ...data.transactions
          .filter((item) =>
            [item.description, item.merchant, item.notes].some((value) =>
              value.toLowerCase().includes(filteredSearch)
            )
          )
          .slice(0, 4)
          .map((item) => ({
            kind: "Transaction",
            label: item.description,
            sub: money(item.amount),
            select: () => {
              goSection("Transactions");
              setSearch(item.description);
              setSearchOpen(false);
            },
          })),
        ...data.accounts
          .filter((item) => item.name.toLowerCase().includes(filteredSearch))
          .slice(0, 3)
          .map((item) => ({
            kind: "Account",
            label: item.name,
            sub: money(getAccountBalance(item, data.transactions)),
            select: () => {
              goSection("Accounts");
              setSelectedAccount(item);
              setSearchOpen(false);
            },
          })),
        ...data.categories
          .filter((item) => item.name.toLowerCase().includes(filteredSearch))
          .slice(0, 3)
          .map((item) => ({
            kind: "Category",
            label: item.name,
            sub: item.kind,
            select: () => {
              goSection("Categories");
              setSearchOpen(false);
            },
          })),
      ]
    : [];

  if (!loaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Preparing your financial workspace…
        </div>
      </div>
    );
  }

  // Not logged in: Show Auth Page
  if (!data.session) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <AuthPage
          authView={authView}
          setAuthView={setAuthView}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          fullName={fullName}
          setFullName={setFullName}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          remember={remember}
          setRemember={setRemember}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          authLoading={authLoading}
          authErrors={authErrors}
          onSubmit={submitAuth}
          onQuickLogin={startLogin}
        />
      </>
    );
  }

  // Not onboarded: Show Onboarding Flow
  if (!data.onboarded) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <OnboardingFlow
          data={data}
          onComplete={() => updateData({ onboarded: true })}
          onUpdatePreferences={updatePreferences}
          onUpdateState={updateData}
          onOpenAccountModal={() => openAccountForm()}
        />
        {modal === "account" && (
          <AccountModal
            account={editingAccount}
            currency={currency}
            onClose={() => setModal(null)}
            onSave={saveAccount}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <div className="flex min-h-screen">
        {/* Desktop Sidebar & Mobile Drawer Navigation */}
        <aside
          className={`${
            mobileNav ? "fixed inset-y-0 left-0 z-40 flex w-[272px]" : "hidden"
          } shrink-0 flex-col border-r border-border bg-card lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[248px]`}
        >
          <div className="flex h-[72px] items-center justify-between border-b border-border px-5">
            <AppLogo />
            <Button
              className="lg:hidden"
              variant="ghost"
              size="icon"
              aria-label="Close navigation"
              onClick={() => setMobileNav(false)}
            >
              <X size={18} />
            </Button>
          </div>
          <div className="px-4 pt-6">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Workspace
            </p>
            <nav className="mt-3 space-y-1">
              {navItems.map(({ label, icon: Icon }) => (
                <Button
                  key={label}
                  variant={active === label ? "secondary" : "ghost"}
                  className={`h-10 w-full justify-start gap-3 px-3 text-xs ${
                    active === label ? "font-bold text-primary shadow-2xs" : "text-muted-foreground font-medium"
                  }`}
                  onClick={() => goSection(label)}
                >
                  <Icon size={17} />
                  {label}
                </Button>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4">
            <div className="rounded-xl border border-border bg-muted/50 p-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-success" />
                <span className="text-xs font-bold text-foreground">100% Offline & Private</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                All records stored only in your local browser cache.
              </p>
            </div>
            <Button
              variant="ghost"
              className={`mt-3 h-10 w-full justify-start gap-3 px-3 text-xs ${
                active === "Preferences" || active === "Settings"
                  ? "bg-secondary font-bold text-primary shadow-2xs"
                  : "text-muted-foreground font-medium"
              }`}
              onClick={() => {
                goSection("Preferences");
                setPreferencesTab("General & Regional");
              }}
            >
              <SlidersHorizontal size={17} />
              Preferences
            </Button>
            <Button
              variant="ghost"
              className={`mt-1 h-10 w-full justify-start gap-3 px-3 text-xs ${
                active === "Profile"
                  ? "bg-secondary font-bold text-primary shadow-2xs"
                  : "text-muted-foreground font-medium"
              }`}
              onClick={() => {
                goSection("Profile");
              }}
            >
              <User size={17} />
              My Profile
            </Button>
          </div>
        </aside>

        {mobileNav && (
          <button
            aria-label="Close navigation backdrop"
            className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-2xs lg:hidden"
            onClick={() => setMobileNav(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-xs sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
                onClick={() => setMobileNav(true)}
              >
                <Menu size={19} />
              </Button>
              <div className="hidden min-w-0 sm:block">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">
                  WealthTrack Workspace
                </p>
                <p className="wt-display truncate text-sm font-extrabold text-foreground">
                  {active === "Overview" ? "Dashboard" : active}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative hidden xl:block">
                <button
                  type="button"
                  className="flex h-9 w-[220px] items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={14} />
                  Search workspace…
                  <span className="ml-auto rounded border border-border px-1.5 py-0.2 text-[10px]">
                    ⌘ K
                  </span>
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="xl:hidden"
                aria-label="Search"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={17} />
              </Button>

              <Button
                size="sm"
                className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
                onClick={() => beginTransaction()}
              >
                <Plus size={15} /> Add Transaction
              </Button>

              {/* Notifications Dropdown */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label="Notifications"
                  onClick={() => {
                    setNotificationOpen((value) => !value);
                    setProfileOpen(false);
                  }}
                >
                  <Bell size={17} />
                  {data.notifications.some((item) => !item.read) && (
                    <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
                  )}
                </Button>
                {notificationOpen && (
                  <div className="absolute right-0 top-12 z-30 w-[min(340px,calc(100vw-24px))] rounded-xl border border-border bg-card p-2 wt-shadow">
                    <div className="flex items-center justify-between px-2.5 py-2">
                      <p className="font-bold text-xs text-foreground uppercase tracking-wider">
                        Notifications
                      </p>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-[11px] font-semibold text-primary"
                        onClick={() =>
                          setData((current) => ({
                            ...current,
                            notifications: current.notifications.map((item) => ({ ...item, read: true })),
                          }))
                        }
                      >
                        Mark all read
                      </Button>
                    </div>
                    {data.notifications.length ? (
                      data.notifications.slice(0, 5).map((notice) => (
                        <button
                          key={notice.id}
                          type="button"
                          className="flex w-full gap-2.5 rounded-lg p-2.5 text-left hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setData((current) => ({
                              ...current,
                              notifications: current.notifications.map((item) =>
                                item.id === notice.id ? { ...item, read: true } : item
                              ),
                            }));
                            setNotificationOpen(false);
                          }}
                        >
                          <span
                            className={`mt-1.5 size-2 shrink-0 rounded-full ${
                              notice.read ? "bg-muted-foreground/30" : "bg-primary"
                            }`}
                          />
                          <span>
                            <span className="block text-xs font-bold text-foreground">
                              {notice.title}
                            </span>
                            <span className="block text-[11px] text-muted-foreground mt-0.5">
                              {notice.description}
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                        You’re all caught up.
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setData((current) => ({ ...current, notifications: [] }))}
                    >
                      Clear Notifications
                    </Button>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <Button
                  variant="ghost"
                  className="h-9 gap-2 px-1.5"
                  onClick={() => {
                    setProfileOpen((value) => !value);
                    setNotificationOpen(false);
                  }}
                >
                  <span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {getInitials(email)}
                  </span>
                  <ChevronDown size={14} className="hidden sm:block text-muted-foreground" />
                </Button>
                {profileOpen && (
                  <div className="absolute right-0 top-12 z-30 w-52 rounded-xl border border-border bg-card p-1.5 wt-shadow">
                    <div className="border-b border-border px-3 py-2">
                      <p className="text-xs font-bold text-foreground">
                        {data.profile?.fullName || "Local Profile"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      className="mt-1 w-full justify-start text-xs font-semibold"
                      onClick={() => {
                        goSection("Profile");
                        setProfileOpen(false);
                      }}
                    >
                      <User size={14} className="mr-1.5" /> My Profile
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-xs font-semibold"
                      onClick={() => {
                        goSection("Preferences");
                        setPreferencesTab("General & Regional");
                        setProfileOpen(false);
                      }}
                    >
                      <SlidersHorizontal size={14} className="mr-1.5" /> Preferences
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-xs font-semibold"
                      onClick={() => {
                        toast("WealthTrack Local Workspace", {
                          description: "Your financial data remains strictly in your browser.",
                        });
                        setProfileOpen(false);
                      }}
                    >
                      <CircleHelp size={14} className="mr-1.5" /> Help
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-xs font-semibold text-destructive"
                      onClick={() => {
                        setPendingDelete({ kind: "signout", label: "Sign out of this session?" });
                        setModal("confirm");
                        setProfileOpen(false);
                      }}
                    >
                      <LogOut size={14} className="mr-1.5" /> Sign Out
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-7 sm:pb-10 lg:px-9">
            {active === "Overview" && (
              <Dashboard
                data={data}
                money={money}
                dateRange={dateRange}
                setDateRange={setDateRange}
                onAdd={beginTransaction}
                onTransferClick={() => openTransferModal()}
                onNavigate={goSection}
                onSelectTransaction={setSelectedTransaction}
                onCategory={(id) => {
                  setTxCategory(id);
                  goSection("Transactions");
                }}
              />
            )}

            {active === "Transactions" && (
              <TransactionsPage
                data={data}
                rows={filteredTransactions}
                search={search}
                setSearch={setSearch}
                dateRange={dateRange}
                setDateRange={setDateRange}
                txType={txType}
                setTxType={setTxType}
                txPriority={txPriority}
                setTxPriority={setTxPriority}
                txCategory={txCategory}
                setTxCategory={setTxCategory}
                txAccount={txAccount}
                setTxAccount={setTxAccount}
                txSort={txSort}
                setTxSort={setTxSort}
                money={money}
                onAdd={() => beginTransaction()}
                onEdit={(item) => beginTransaction(undefined, item)}
                onView={setSelectedTransaction}
                onExport={() => exportCsv(filteredTransactions)}
                onImport={openImport}
                selectedIds={selectedIds}
                toggleSelected={toggleSelected}
                toggleAll={toggleAll}
                onDelete={(item) => requestDelete("transaction", item.id, item.description, item.amount)}
                onBulkDelete={() => {
                  setPendingDelete({
                    kind: "bulk",
                    label: `Delete ${selectedIds.length} selected transactions?`,
                  });
                  setModal("confirm");
                }}
                onBulkReassign={bulkReassign}
                onBulkReassignPriority={bulkReassignPriority}
              />
            )}

            {active === "Accounts" && (
              <AccountsPage
                data={data}
                money={money}
                selected={selectedAccount}
                setSelected={setSelectedAccount}
                onAdd={() => openAccountForm()}
                onEdit={openAccountForm}
                onTransfer={(account) => openTransferModal(account.id)}
                onReconcile={handleReconcileAccount}
                onArchive={(account) => requestDelete("account", account.id, account.name)}
                onSelectTransaction={setSelectedTransaction}
                onAddTransaction={(accountId) => beginTransaction({ accountId })}
                onEditTransaction={(item) => beginTransaction(undefined, item)}
                onDeleteTransaction={(item) => requestDelete("transaction", item.id, item.description, item.amount)}
              />
            )}

            {active === "Investments" && (
              <InvestmentsPage
                data={data}
                money={money}
                onAddHolding={handleAddHolding}
                onEditHolding={handleEditHolding}
                onDeleteHolding={handleDeleteHolding}
                onToggleSip={handleToggleHoldingSip}
              />
            )}

            {active === "Loans" && (
              <LoansPage
                data={data}
                money={money}
                onAddLoan={handleAddLoan}
                onEditLoan={handleEditLoan}
                onDeleteLoan={handleDeleteLoan}
                onRecordEmiPayment={handleRecordLoanEmiPayment}
              />
            )}

            {active === "Funds" && (
              <FundsPage
                data={data}
                money={money}
                onSaveFund={handleSaveFund}
                onDeleteFund={handleDeleteFund}
                onSavePlan={handleSavePlan}
                onDeletePlan={handleDeletePlan}
                onQuickDepositFund={handleQuickDepositFund}
              />
            )}

            {active === "Categories" && (
              <CategoriesPage
                data={data}
                kind={categoryTab}
                setKind={setCategoryTab}
                onAdd={() => openCategoryForm(undefined, categoryTab === "Income" ? "Income" : "Expense")}
                onEdit={openCategoryForm}
                onDelete={(category) => requestDelete("category", category.id, category.name)}
                money={money}
              />
            )}

            {active === "Reports" && (
              <ReportsPage
                data={data}
                rows={reportTransactions}
                dateRange={dateRange}
                setDateRange={setDateRange}
                money={money}
                onExport={() => exportCsv(reportTransactions)}
                onCategory={(id) => {
                  setTxCategory(id);
                  goSection("Transactions");
                }}
              />
            )}

            {active === "Recurring" && (
              <RecurringPage
                data={data}
                money={money}
                onAdd={() => {
                  setEditingRecurring(null);
                  setModal("recurring");
                }}
                onEdit={(item) => {
                  setEditingRecurring(item);
                  setModal("recurring");
                }}
                onDelete={(item) => requestDelete("recurring", item.id, item.name, item.amount)}
                onToggle={(item) =>
                  setData((current) => {
                    const nextEnabled = !item.enabled;
                    const nextRecurring = current.recurring.map((row) =>
                      row.id === item.id ? { ...row, enabled: nextEnabled } : row
                    );
                    let nextInvestments = current.investments;
                    if (item.type === "Investment" || item.investmentId) {
                      nextInvestments = (current.investments ?? []).map((inv) =>
                        inv.id === item.investmentId ||
                        inv.recurringId === item.id ||
                        inv.name.toLowerCase() === item.name.toLowerCase()
                          ? { ...inv, status: nextEnabled ? "Active" : "Paused" }
                          : inv
                      );
                    }
                    return {
                      ...current,
                      recurring: nextRecurring,
                      investments: nextInvestments,
                    };
                  })
                }
              />
            )}

            {active === "Profile" && (
              <ProfilePage
                data={data}
                money={money}
                onSaveProfile={handleSaveProfile}
              />
            )}

            {(active === "Preferences" || active === "Settings") && (
              <PreferencesPage
                data={data}
                preferencesTab={preferencesTab}
                setPreferencesTab={setPreferencesTab}
                updatePreferences={updatePreferences}
                money={money}
                onExport={() => exportCsv()}
                onImport={openImport}
                onReset={() => {
                  setPendingDelete({
                    kind: "reset",
                    label: "Restore original sample dataset?",
                    amount: data.transactions.length,
                  });
                  setModal("confirm");
                }}
                onSignout={() => {
                  setPendingDelete({ kind: "signout", label: "Sign out of this session?" });
                  setModal("confirm");
                }}
                onFieldAdd={(field) => {
                  if (!field.name?.trim()) {
                    toast.error("Give this field a name");
                    return;
                  }
                  const customField: CustomField = {
                    id: createTransactionId(),
                    name: field.name.trim(),
                    type: field.type ?? "Text",
                    options: field.options ?? [],
                    required: field.required ?? false,
                  };
                  setData((current) => ({
                    ...current,
                    customFields: [...current.customFields, customField],
                  }));
                  setFieldForm({ type: "Text", options: [], required: false });
                  toast.success("Custom field added");
                }}
                onFieldDelete={(id) =>
                  setData((current) => ({
                    ...current,
                    customFields: current.customFields.filter((field) => field.id !== id),
                  }))
                }
                fieldForm={fieldForm}
                setFieldForm={setFieldForm}
                tagDraft={tagDraft}
                setTagDraft={setTagDraft}
                onTagAdd={() => {
                  const tag = tagDraft.trim().toLowerCase();
                  if (!tag) return;
                  if (data.tags.includes(tag)) {
                    toast.error("That tag already exists");
                    return;
                  }
                  setData((current) => ({ ...current, tags: [...current.tags, tag] }));
                  setTagDraft("");
                  toast.success("Tag added");
                }}
                onTagDelete={(tag) =>
                  setData((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }))
                }
              />
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-xs lg:hidden">
        {["Overview", "Transactions", "Accounts", "Investments"].map((section) => {
          const item = navItems.find((nav) => nav.label === section);
          const Icon = item?.icon ?? LayoutDashboard;
          return (
            <button
              key={section}
              type="button"
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] ${
                active === section ? "font-bold text-primary" : "text-muted-foreground font-medium"
              }`}
              onClick={() => goSection(section as Section)}
            >
              <Icon size={18} />
              {section === "Overview" ? "Home" : section}
            </button>
          );
        })}
        <button
          type="button"
          className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground font-medium"
          onClick={() => setMobileNav(true)}
        >
          <Menu size={18} />
          More
        </button>
      </nav>

      {/* Floating Mobile Add Button */}
      <Button
        aria-label="Add transaction"
        title="Add transaction"
        className="fixed bottom-20 right-4 z-20 size-12 rounded-full p-0 shadow-lg sm:bottom-7 sm:right-7 lg:hidden"
        onClick={() => beginTransaction()}
      >
        <Plus size={22} />
      </Button>

      {/* Search Modal */}
      {searchOpen && (
        <Modal
          title="Search WealthTrack"
          description="Instant search across transactions, accounts, and categories."
          onClose={() => setSearchOpen(false)}
        >
          <div className="relative">
            <Search size={17} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              autoFocus
              className="wt-field pl-9"
              placeholder="Try “groceries”, “savings”, “salary”…"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
          <div className="mt-4 space-y-1">
            {globalResults.map((result, index) => (
              <button
                key={`${result.kind}-${result.label}-${index}`}
                type="button"
                className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-muted transition-colors"
                onClick={result.select}
              >
                <span>
                  <span className="block text-sm font-semibold text-foreground">{result.label}</span>
                  <span className="block text-xs text-muted-foreground">{result.kind}</span>
                </span>
                <span className="text-xs text-muted-foreground font-medium">{result.sub}</span>
              </button>
            ))}
            {filteredSearch && !globalResults.length && (
              <p className="py-8 text-center text-xs text-muted-foreground">No matching records found.</p>
            )}
            {!filteredSearch && (
              <p className="py-5 text-center text-xs text-muted-foreground">
                Start typing to search your entire financial workspace.
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Dialogs */}
      {modal === "transaction" && (
        <TransactionModal
          data={data}
          form={transactionForm}
          setForm={setTransactionForm}
          errors={transactionErrors}
          edit={Boolean(editTransaction)}
          onClose={() => setModal(null)}
          onSave={saveTransaction}
          onAddCategory={saveCategory}
        />
      )}

      {modal === "account" && (
        <AccountModal
          account={editingAccount}
          currency={currency}
          onClose={() => setModal(null)}
          onSave={saveAccount}
        />
      )}

      {modal === "category" && (
        <CategoryModal
          category={editingCategory}
          kind={categoryTab === "Income" ? "Income" : "Expense"}
          onClose={() => setModal(null)}
          onSave={saveCategory}
        />
      )}

      {modal === "recurring" && (
        <RecurringModal
          item={editingRecurring}
          data={data}
          onClose={() => setModal(null)}
          onSave={addRecurring}
          onAddCategory={saveCategory}
        />
      )}

      {modal === "import" && (
        <ImportModal
          data={data}
          fileInputRef={fileInputRef}
          csvText={csvText}
          setCsvText={setCsvText}
          csvRows={csvRows}
          csvError={csvError}
          onFile={onFile}
          parseCsv={parseCsv}
          onDownloadExcel={downloadExcelTemplate}
          onDownloadCsv={downloadCsvTemplate}
          onApplyImport={applyImport}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "transfer" && (
        <TransferModal
          accounts={data.accounts}
          transactions={data.transactions}
          initialFromAccountId={transferSourceAccountId}
          currency={data.preferences.currency}
          onClose={() => setModal(null)}
          onTransfer={executeDirectTransfer}
        />
      )}

      {modal === "confirm" && pendingDelete && (
        <Modal
          title={
            pendingDelete.kind === "signout"
              ? "Sign Out"
              : pendingDelete.kind === "reset"
              ? "Reset Demo Data"
              : pendingDelete.kind === "account"
              ? "Archive Account"
              : pendingDelete.kind === "category"
              ? "Archive Category"
              : pendingDelete.kind === "transaction" || pendingDelete.kind === "bulk"
              ? "Delete Transaction"
              : "Delete Recurring Item"
          }
          description={
            pendingDelete.kind === "reset"
              ? "This restores the original sample data and discards local modifications."
              : pendingDelete.kind === "account"
              ? "This account will be archived. All linked historical transactions are preserved."
              : pendingDelete.kind === "category"
              ? "This category will be archived. Historical records remain untouched."
              : undefined
          }
          onClose={() => {
            setModal(null);
            setPendingDelete(null);
          }}
        >
          <div className="rounded-xl border border-border bg-muted/50 p-3.5">
            <p className="font-bold text-sm text-foreground">{pendingDelete.label}</p>
            {pendingDelete.amount !== undefined && (
              <p className="mt-1 text-xs text-muted-foreground">{money(pendingDelete.amount)}</p>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setModal(null);
                setPendingDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={
                pendingDelete.kind === "signout" || pendingDelete.kind === "reset"
                  ? "default"
                  : "destructive"
              }
              onClick={confirmDelete}
            >
              {pendingDelete.kind === "signout"
                ? "Sign out"
                : pendingDelete.kind === "reset"
                ? "Reset demo"
                : pendingDelete.kind === "account" || pendingDelete.kind === "category"
                ? "Archive"
                : "Delete"}
            </Button>
          </div>
        </Modal>
      )}

      {holdingModalOpen && (
        <InvestmentHoldingModal
          data={data}
          existing={editingHolding}
          onClose={() => setHoldingModalOpen(false)}
          onSave={handleSaveHolding}
        />
      )}

      {loanModalOpen && (
        <LoanModal
          data={data}
          existing={editingLoan}
          onClose={() => setLoanModalOpen(false)}
          onSave={handleSaveLoan}
        />
      )}

      {selectedTransaction && (
        <TransactionDetail
          transaction={selectedTransaction}
          data={data}
          money={money}
          onClose={() => setSelectedTransaction(null)}
          onEdit={(item) => beginTransaction(undefined, item)}
          onDuplicate={duplicateTransaction}
          onDelete={(item) => requestDelete("transaction", item.id, item.description, item.amount)}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Bell, CalendarDays,
  Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, CreditCard,
  Download, FileUp, Filter, LayoutDashboard, LogOut, Menu, Moon, MoreHorizontal,
  Pencil, Plus, Search, Settings2, ShieldCheck, Sun, Tag, Trash2, TrendingDown,
  TrendingUp, Wallet, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster } from "@/components/ui/sonner";
import {
  applyTransactionToAccountBalance, createInitialState, createTransactionId, formatMoney,
  getAccountBalance, getCategorySpend, getMoneySummary, makeNotification, STORAGE_KEY,
  type Account, type AccountKind, type Category, type CategoryKind, type CustomField,
  type RecurringItem, type Transaction, type TransactionType, type WealthPreferences,
  type WealthState,
} from "@/lib/wealthtrack";

type Section = "Overview" | "Transactions" | "Accounts" | "Categories" | "Reports" | "Recurring" | "Settings";
type AuthView = "signin" | "signup" | "forgot";

const navItems: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Transactions", icon: ArrowLeftRight },
  { label: "Accounts", icon: Wallet },
  { label: "Categories", icon: Tag },
  { label: "Reports", icon: Activity },
  { label: "Recurring", icon: CalendarDays },
];

function InputField({ label, value, onChange, type = "text", placeholder, error, required, min, step, ...props }: {
  label: string; value: string | number; onChange: (value: string) => void; type?: string;
  placeholder?: string; error?: string; required?: boolean; min?: string; step?: string;
  autoComplete?: string; disabled?: boolean;
}) {
  return <label className="block min-w-0">
    <span className="wt-label">{label}{required && <span className="ml-1 text-destructive">*</span>}</span>
    <input className="wt-field" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} min={min} step={step} {...props} />
    {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
  </label>;
}

function SelectField({ label, value, onChange, options, placeholder, error }: {
  label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; placeholder?: string; error?: string;
}) {
  return <label className="block min-w-0">
    <span className="wt-label">{label}</span>
    <select className="wt-field" value={value} onChange={(event) => onChange(event.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
  </label>;
}

function Modal({ title, description, onClose, children, wide = false }: {
  title: string; description?: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-xl border border-border bg-card p-5 wt-shadow sm:rounded-xl sm:p-6 ${wide ? "max-w-2xl" : "max-w-lg"}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><h2 id="modal-title" className="wt-display text-xl font-bold">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>
        <Button variant="ghost" size="icon" aria-label="Close dialog" title="Close" onClick={onClose}><X /></Button>
      </div>
      {children}
    </section>
  </div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function transactionSign(transaction: Transaction) {
  return transaction.type === "Expense" ? -1 : transaction.type === "Refund" ? 1 : transaction.type === "Adjustment" ? (transaction.amount < 0 ? -1 : 1) : 1;
}

function AppLogo({ small = false }: { small?: boolean }) {
  return <div className="flex items-center gap-2.5">
    <div className="grid size-9 place-items-center rounded-[10px] bg-primary text-primary-foreground"><Activity size={19} strokeWidth={2.7} /></div>
    {!small && <span className="wt-display text-lg font-extrabold tracking-normal">WealthTrack</span>}
  </div>;
}

function getInitials(email: string) { return email.split("@")[0]?.slice(0, 2).toUpperCase() || "WT"; }

export function WealthTrackApp() {
  const [data, setData] = useState<WealthState>(() => createInitialState());
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<Section>("Overview");
  const [authView, setAuthView] = useState<AuthView>("signin");
  const [email, setEmail] = useState("demo@wealthtrack.app");
  const [password, setPassword] = useState("Demo123!");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authErrors, setAuthErrors] = useState<Record<string, string>>({});
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [modal, setModal] = useState<"transaction" | "account" | "category" | "recurring" | "confirm" | "import" | null>(null);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: string; id?: string; label: string; amount?: number } | null>(null);
  const [search, setSearch] = useState("");
  const [txType, setTxType] = useState("All types");
  const [txCategory, setTxCategory] = useState("All categories");
  const [txAccount, setTxAccount] = useState("All accounts");
  const [txSort, setTxSort] = useState("Newest first");
  const [monthFilter, setMonthFilter] = useState("2026-10");
  const [categoryTab, setCategoryTab] = useState<CategoryKind>("Expense");
  const [reportRange, setReportRange] = useState("This month");
  const [reportCategory, setReportCategory] = useState("All categories");
  const [reportAccount, setReportAccount] = useState("All accounts");
  const [csvText, setCsvText] = useState("");
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvError, setCsvError] = useState("");
  const [importApplied, setImportApplied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [transactionForm, setTransactionForm] = useState<Partial<Transaction>>({});
  const [transactionErrors, setTransactionErrors] = useState<Record<string, string>>({});
  const [transactionCategory, setTransactionCategory] = useState("");
  const [settingsTab, setSettingsTab] = useState("General");
  const [fieldForm, setFieldForm] = useState<Partial<CustomField>>({ type: "Text", options: [], required: false });
  const [tagDraft, setTagDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WealthState>;
        const initial = createInitialState();
        setData({ ...initial, ...parsed, preferences: { ...initial.preferences, ...parsed.preferences } });
      }
    } catch { localStorage.removeItem(STORAGE_KEY); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, loaded]);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.toggle("dark", data.preferences.theme === "dark");
  }, [data.preferences.theme, loaded]);

  const summary = useMemo(() => getMoneySummary(data.accounts, data.transactions), [data.accounts, data.transactions]);
  const updateData = (patch: Partial<WealthState>) => setData((current) => ({ ...current, ...patch }));
  const updatePreferences = (patch: Partial<WealthPreferences>) => setData((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }));
  const notify = (title: string, description: string) => setData((current) => ({ ...current, notifications: [makeNotification(title, description), ...current.notifications] }));
  const currency = data.preferences.currency;
  const money = (amount: number) => formatMoney(amount, currency);
  const accountById = (id: string) => data.accounts.find((account) => account.id === id);
  const categoryById = (id: string) => data.categories.find((category) => category.id === id);
  const liveAccounts = data.accounts.filter((account) => !account.archived);
  const currentMonthTransactions = data.transactions.filter((transaction) => transaction.date.slice(0, 7) === monthFilter);

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
    if (authView === "signup" && password.length < 8) errors.password = "Use at least 8 characters for your password.";
    setAuthErrors(errors);
    if (Object.keys(errors).length) return;
    if (authView === "forgot") {
      setAuthLoading(true);
      setTimeout(() => { setAuthLoading(false); toast.success("Reset link simulated", { description: "No email was sent in this local demo." }); setAuthView("signin"); }, 500);
      return;
    }
    startLogin();
  };

  const goSection = (section: Section) => {
    setActive(section);
    setMobileNav(false);
    setSelectedTransaction(null);
    setSelectedAccount(null);
  };

  const beginTransaction = (preset?: Partial<Transaction>, existing?: Transaction) => {
    const form: Partial<Transaction> = existing ? { ...existing } : {
      date: new Date().toISOString().slice(0, 16), description: "", type: preset?.type ?? data.preferences.defaultType,
      amount: undefined, categoryId: "", accountId: data.preferences.defaultAccount || liveAccounts[0]?.id,
      destinationAccountId: "", paymentMethod: data.preferences.defaultPaymentMethod, need: "Need", merchant: "",
      tags: [], notes: "", recurring: false, customValues: {}, ...preset,
    };
    setEditTransaction(existing ?? null);
    setTransactionForm(form);
    setTransactionCategory(form.categoryId ?? "");
    setTransactionErrors({});
    setSelectedTransaction(null);
    setModal("transaction");
  };

  const saveTransaction = () => {
    const type = transactionForm.type ?? "Expense";
    const errors: Record<string, string> = {};
    if (!transactionForm.description?.trim()) errors.description = "Add a description.";
    if (!transactionForm.amount || Number(transactionForm.amount) <= 0) errors.amount = "Enter an amount greater than zero.";
    if (!transactionForm.date) errors.date = "Choose a date.";
    if (!transactionForm.accountId) errors.accountId = "Choose an account.";
    if (!accountById(transactionForm.accountId ?? "")) errors.accountId = "Choose an available account.";
    if (type === "Transfer" && !transactionForm.destinationAccountId) errors.destinationAccountId = "Choose a destination account.";
    if (type === "Transfer" && transactionForm.accountId === transactionForm.destinationAccountId) errors.destinationAccountId = "Choose a different destination.";
    if (type !== "Transfer" && type !== "Adjustment" && !categoryById(transactionForm.categoryId ?? "")) errors.categoryId = "Choose a category.";
    if (type === "Income" && categoryById(transactionForm.categoryId ?? "")?.kind !== "Income") errors.categoryId = "Choose an income category.";
    if (type === "Expense" && categoryById(transactionForm.categoryId ?? "")?.kind !== "Expense") errors.categoryId = "Choose an expense category.";
    setTransactionErrors(errors);
    if (Object.keys(errors).length) return;
    const saved: Transaction = {
      id: editTransaction?.id ?? createTransactionId(), date: transactionForm.date!, description: transactionForm.description!.trim(),
      type, amount: Number(transactionForm.amount), categoryId: type === "Transfer" ? "" : transactionForm.categoryId ?? "",
      accountId: transactionForm.accountId!, destinationAccountId: transactionForm.destinationAccountId ?? "",
      paymentMethod: transactionForm.paymentMethod ?? "UPI", need: transactionForm.need ?? "Need",
      merchant: transactionForm.merchant ?? "", tags: transactionForm.tags ?? [], notes: transactionForm.notes ?? "",
      recurring: transactionForm.recurring ?? false, customValues: transactionForm.customValues ?? {},
    };
    setData((current) => ({ ...current, transactions: editTransaction ? current.transactions.map((item) => item.id === saved.id ? saved : item) : [saved, ...current.transactions] }));
    setModal(null);
    toast.success(editTransaction ? "Transaction updated" : "Transaction added", { description: `${saved.description} · ${money(saved.amount)}` });
    notify(editTransaction ? "Transaction updated" : "Transaction added", `${saved.description} · ${money(saved.amount)}`);
  };

  const duplicateTransaction = (transaction: Transaction) => {
    beginTransaction({ ...transaction, id: undefined, description: `${transaction.description} (copy)` });
  };

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
    if (kind === "reset") { const initial = createInitialState(); setData(initial); setActive("Overview"); setOnboardingStep(0); }
    if (kind === "signout") { updateData({ session: false }); setAuthView("signin"); setPassword(""); }
    if (kind === "bulk") { setData((current) => ({ ...current, transactions: current.transactions.filter((item) => !selectedIds.includes(item.id)) })); setSelectedIds([]); }
    toast.success(kind === "reset" ? "Demo data reset" : kind === "signout" ? "Signed out" : "Removed", { description: kind === "account" ? "Account archived; its transaction history is preserved." : undefined });
    setModal(null); setPendingDelete(null);
  };

  const openAccountForm = (account?: Account) => { setEditingAccount(account ?? null); setModal("account"); };
  const saveAccount = (form: Partial<Account>) => {
    if (!form.name?.trim()) { toast.error("Account name is required"); return; }
    const account: Account = { id: editingAccount?.id ?? createTransactionId(), name: form.name.trim(), kind: form.kind ?? "Bank account", institution: form.institution ?? "", identifier: form.identifier ?? "", openingBalance: Number(form.openingBalance) || 0, notes: form.notes ?? "" };
    setData((current) => ({ ...current, accounts: editingAccount ? current.accounts.map((item) => item.id === account.id ? account : item) : [...current.accounts, account] }));
    setModal(null); toast.success(editingAccount ? "Account updated" : "Account added");
  };

  const openCategoryForm = (category?: Category, kind?: CategoryKind) => { setEditingCategory(category ?? null); setCategoryTab(category?.kind ?? kind ?? categoryTab); setModal("category"); };
  const saveCategory = (form: Partial<Category>) => {
    if (!form.name?.trim()) { toast.error("Category name is required"); return; }
    const category: Category = { id: editingCategory?.id ?? createTransactionId(), name: form.name.trim(), kind: form.kind ?? categoryTab, icon: form.icon ?? "◈", color: form.color ?? "blue", monthlyLimit: Number(form.monthlyLimit) || 0 };
    setData((current) => ({ ...current, categories: editingCategory ? current.categories.map((item) => item.id === category.id ? category : item) : [...current.categories, category] }));
    setModal(null); toast.success(editingCategory ? "Category updated" : "Category added");
  };

  const filteredTransactions = useMemo(() => {
    const searchTerm = search.toLowerCase().trim();
    const result = data.transactions.filter((transaction) => {
      const matchesText = !searchTerm || [transaction.description, transaction.merchant, transaction.notes, transaction.tags.join(" ")].some((value) => value.toLowerCase().includes(searchTerm));
      return matchesText && (txType === "All types" || transaction.type === txType) &&
        (txCategory === "All categories" || transaction.categoryId === txCategory) &&
        (txAccount === "All accounts" || transaction.accountId === txAccount || transaction.destinationAccountId === txAccount) &&
        transaction.date.slice(0, 7) === monthFilter;
    });
    return result.sort((a, b) => txSort === "Oldest first" ? a.date.localeCompare(b.date) : txSort === "Amount: high to low" ? b.amount - a.amount : txSort === "Amount: low to high" ? a.amount - b.amount : txSort === "Description" ? a.description.localeCompare(b.description) : b.date.localeCompare(a.date));
  }, [data.transactions, monthFilter, search, txAccount, txCategory, txSort, txType]);

  const reportTransactions = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const yearStart = `${now.getFullYear()}-01-01`;
    return data.transactions.filter((transaction) => {
      const dateOnly = transaction.date.slice(0, 10);
      const rangeMatch = reportRange === "This month" ? dateOnly >= monthStart : reportRange === "This year" ? dateOnly >= yearStart : true;
      return rangeMatch && (reportCategory === "All categories" || transaction.categoryId === reportCategory) &&
        (reportAccount === "All accounts" || transaction.accountId === reportAccount || transaction.destinationAccountId === reportAccount);
    });
  }, [data.transactions, reportRange, reportCategory, reportAccount]);

  const exportCsv = (rows = data.transactions) => {
    const headers = ["date", "description", "type", "amount", "category", "account", "payment_method", "merchant", "tags", "notes"];
    const csv = [headers.join(","), ...rows.map((item) => [item.date, item.description, item.type, item.amount, categoryById(item.categoryId)?.name ?? "", accountById(item.accountId)?.name ?? "", item.paymentMethod, item.merchant, item.tags.join("|"), item.notes].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "wealthtrack-transactions.csv"; link.click(); URL.revokeObjectURL(url);
    toast.success("CSV downloaded", { description: `${rows.length} transactions exported.` });
  };

  const parseCsv = (text: string) => {
    const rows = text.split(/\r?\n/).filter((line) => line.trim()).map((line) => line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g)?.map((cell) => cell.replace(/,$/, "").replace(/^"|"$/g, "").replaceAll('""', '"')) ?? []);
    setCsvRows(rows);
    const headers = rows[0]?.map((item) => item.trim().toLowerCase()) ?? [];
    if (!headers.includes("description") || !headers.includes("amount")) setCsvError("CSV needs at least “description” and “amount” columns.");
    else if (rows.length < 2) setCsvError("Add at least one transaction row.");
    else setCsvError("");
  };

  const applyImport = () => {
    const headers = csvRows[0]?.map((item) => item.trim().toLowerCase()) ?? [];
    const descriptionIndex = headers.indexOf("description");
    const amountIndex = headers.indexOf("amount");
    const dateIndex = headers.indexOf("date");
    const typeIndex = headers.indexOf("type");
    const categoryIndex = headers.indexOf("category");
    const rows = csvRows.slice(1).filter((row) => row[descriptionIndex]?.trim() && Number(row[amountIndex]) > 0);
    if (!rows.length) { setCsvError("No valid transaction rows were found."); return; }
    const imported = rows.map((row): Transaction => {
      const category = data.categories.find((item) => item.name.toLowerCase() === row[categoryIndex]?.toLowerCase());
      const inputType = row[typeIndex] as TransactionType;
      const type: TransactionType = ["Expense", "Income", "Refund"].includes(inputType) ? inputType : "Expense";
      return { id: createTransactionId(), date: row[dateIndex] || new Date().toISOString().slice(0, 10), description: row[descriptionIndex] ?? "Imported transaction", type, amount: Number(row[amountIndex]), categoryId: category?.id ?? (type === "Income" ? "cat-other-income" : "cat-food"), accountId: data.preferences.defaultAccount || liveAccounts[0]?.id || "", destinationAccountId: "", paymentMethod: "Imported", need: "Need", merchant: "", tags: ["imported"], notes: "Imported CSV", recurring: false, customValues: {} };
    });
    setData((current) => ({ ...current, transactions: [...imported, ...current.transactions] }));
    setImportApplied(true); setModal(null); notify("Import complete", `${imported.length} transactions added.`); toast.success(`${imported.length} transactions imported`);
  };

  const openImport = () => { setCsvText(""); setCsvRows([]); setCsvError(""); setImportApplied(false); setModal("import"); };
  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader(); reader.onload = () => { const text = String(reader.result ?? ""); setCsvText(text); parseCsv(text); }; reader.readAsText(file);
  };

  const toggleSelected = (id: string) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  const toggleAll = () => setSelectedIds((ids) => filteredTransactions.every((item) => ids.includes(item.id)) ? ids.filter((id) => !filteredTransactions.some((item) => item.id === id)) : [...new Set([...ids, ...filteredTransactions.map((item) => item.id)])]);
  const bulkReassign = (categoryId: string) => {
    setData((current) => ({ ...current, transactions: current.transactions.map((item) => selectedIds.includes(item.id) ? { ...item, categoryId } : item) }));
    setSelectedIds([]); toast.success("Categories updated");
  };

  const addRecurring = (form: Partial<RecurringItem>) => {
    if (!form.name?.trim() || !form.amount || !form.accountId) { toast.error("Add a name, amount, and account"); return; }
    const item: RecurringItem = { id: editingRecurring?.id ?? createTransactionId(), name: form.name.trim(), type: form.type ?? "Expense", amount: Number(form.amount), categoryId: form.categoryId ?? "cat-bills", accountId: form.accountId, frequency: form.frequency ?? "Monthly", intervalDays: Number(form.intervalDays) || 30, startDate: form.startDate ?? new Date().toISOString().slice(0, 10), endDate: form.endDate ?? "", nextDate: form.nextDate ?? new Date().toISOString().slice(0, 10), enabled: form.enabled ?? true };
    setData((current) => ({ ...current, recurring: editingRecurring ? current.recurring.map((row) => row.id === item.id ? item : row) : [...current.recurring, item] }));
    setModal(null); toast.success(editingRecurring ? "Schedule updated" : "Recurring schedule added");
  };

  if (!loaded) return <div className="grid min-h-screen place-items-center bg-background"><div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />Preparing your workspace</div></div>;
  if (!data.session) return <>
    <Toaster position="top-right" richColors />
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20" aria-hidden><div className="absolute -right-20 top-16 size-[30rem] rounded-full border border-primary-foreground/40" /><div className="absolute -right-5 top-32 size-[23rem] rounded-full border border-primary-foreground/30" /><div className="absolute -right-[-6rem] top-48 size-[15rem] rounded-full border border-primary-foreground/20" /></div>
        <AppLogo />
        <div className="relative max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] opacity-80">Your money, in perspective</p>
          <h1 className="wt-display text-5xl font-extrabold leading-[1.12]">A clearer picture of your financial life.</h1>
          <p className="mt-5 max-w-md text-lg leading-7 opacity-80">One calm place to understand your spending, stay on top of what’s next, and make your money work for you.</p>
          <div className="mt-12 flex items-center gap-3 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 p-5 backdrop-blur-sm">
            <div className="grid size-11 place-items-center rounded-full bg-primary-foreground/15"><TrendingUp size={20} /></div>
            <div><p className="text-sm font-semibold">Your demo is ready</p><p className="mt-0.5 text-sm opacity-75">Explore your sample financial snapshot</p></div>
          </div>
        </div>
        <p className="relative text-xs opacity-65">Local demo · Sample data · No bank connection</p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-between lg:hidden"><AppLogo /></div>
          <div className="mb-7">
            <p className="mb-2 text-sm font-semibold text-primary">Welcome to WealthTrack</p>
            <h2 className="wt-display text-3xl font-extrabold">{authView === "signin" ? "Good to see you." : authView === "signup" ? "Create your account." : "Reset your password."}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{authView === "forgot" ? "Enter your email to simulate a password reset." : "Sign in to your personal finance workspace."}</p>
          </div>
          <div className="space-y-4">
            {authView === "signup" && <InputField label="Full name" value={fullName} onChange={setFullName} placeholder="Your name" error={authErrors.fullName} required />}
            <InputField label="Email address" value={email} onChange={setEmail} type="email" placeholder="you@example.com" error={authErrors.email} required autoComplete="email" />
            {authView !== "forgot" && <label className="block">
              <span className="wt-label">Password<span className="ml-1 text-destructive">*</span></span>
              <span className="relative block"><input className="wt-field pr-16" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authView === "signup" ? "new-password" : "current-password"} />
                <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 h-8 px-2 text-xs" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</Button></span>
              {authErrors.password && <span className="mt-1 block text-xs text-destructive">{authErrors.password}</span>}
            </label>}
            {authView === "signup" && <InputField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} type={showPassword ? "text" : "password"} error={authErrors.confirmPassword} required />}
            {authView === "signin" && <div className="flex items-center justify-between text-sm"><label className="flex cursor-pointer items-center gap-2"><Checkbox checked={remember} onCheckedChange={(checked) => setRemember(Boolean(checked))} /><span className="text-muted-foreground">Remember me</span></label><Button variant="link" className="h-auto p-0 text-primary" onClick={() => { setAuthErrors({}); setAuthView("forgot"); }}>Forgot password?</Button></div>}
            {authView === "signup" && <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground"><Checkbox checked={remember} onCheckedChange={(checked) => setRemember(Boolean(checked))} /><span>I agree to the demo terms and privacy notice. No personal details are sent anywhere.</span></label>}
            <Button className="h-11 w-full" disabled={authLoading} onClick={submitAuth}>{authLoading ? "Please wait…" : authView === "signin" ? "Sign in" : authView === "signup" ? "Create account" : "Send reset link"}<ArrowRight size={16} /></Button>
            {authView === "signin" && <>
              <div className="flex items-center gap-3 py-1"><span className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">or continue with</span><span className="h-px flex-1 bg-border" /></div>
              <div className="grid grid-cols-2 gap-3"><Button variant="outline" className="h-10" onClick={() => startLogin()}>◉ <span>Google</span></Button><Button variant="outline" className="h-10" onClick={() => startLogin()}>● <span>Apple</span></Button></div>
            </>}
            {authView === "forgot" && <Button variant="ghost" className="w-full" onClick={() => setAuthView("signin")}><ArrowRight className="rotate-180" size={15} /> Back to sign in</Button>}
            <p className="pt-2 text-center text-sm text-muted-foreground">{authView === "signin" ? "New to WealthTrack?" : "Already have an account?"} <Button variant="link" className="h-auto p-0 text-primary" onClick={() => { setAuthErrors({}); setAuthView(authView === "signup" ? "signin" : "signup"); }}>{authView === "signin" ? "Create an account" : "Sign in"}</Button></p>
          </div>
          <div className="mt-8 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Demo sign-in</span> · demo@wealthtrack.app · Demo123! <span className="block pt-1">Any valid email and non-empty password also work. Demo sign-in is not secure.</span></div>
        </div>
      </section>
    </div>
  </>;

  if (!data.onboarded) {
    const finishOnboarding = () => { updateData({ onboarded: true }); setOnboardingStep(0); toast.success("Your workspace is ready"); };
    return <>
      <Toaster position="top-right" richColors />
      <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-9 flex items-center justify-between"><AppLogo /><Button variant="ghost" onClick={finishOnboarding}>Skip setup</Button></div>
          <div className="mb-8 flex gap-2" aria-label="Setup progress">{[0, 1, 2, 3, 4].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full ${step <= onboardingStep ? "bg-primary" : "bg-muted"}`} />)}</div>
          <p className="text-sm font-semibold text-primary">Step {onboardingStep + 1} of 5</p>
          <h1 className="wt-display mt-2 text-3xl font-extrabold">{["Welcome to your money space", "Make it feel like yours", "Your accounts", "Your categories", "Ready to get started"][onboardingStep]}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{["Track spending, see your full financial picture, and keep the little things from slipping through the cracks.", "Choose your currency and a few preferences. You can change these any time.", "We’ve added a few sample accounts. Adjust the opening balances to match your demo.", "Your sample categories are ready. Add what’s missing or keep going.", "A quick summary of your WealthTrack setup."][onboardingStep]}</p>
          <div className="mt-8 min-h-[290px] rounded-xl border border-border bg-card p-5 wt-shadow sm:p-7">
            {onboardingStep === 0 && <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-lg bg-accent/70 p-5"><div className="mb-4 grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"><TrendingUp size={20} /></div><h3 className="font-bold">Know where it goes</h3><p className="mt-2 text-sm text-muted-foreground">See spending patterns and meaningful trends, all in one place.</p></div><div className="rounded-lg bg-muted/70 p-5"><div className="mb-4 grid size-10 place-items-center rounded-lg bg-success-soft text-success"><Wallet size={20} /></div><h3 className="font-bold">Stay in control</h3><p className="mt-2 text-sm text-muted-foreground">Keep track of accounts, upcoming bills, and day-to-day cash flow.</p></div></div>}
            {onboardingStep === 1 && <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Currency" value={data.preferences.currency} onChange={(value) => updatePreferences({ currency: value as WealthPreferences["currency"] })} options={[{ value: "INR", label: "INR · Indian rupee (₹)" }, { value: "USD", label: "USD · US dollar ($)" }, { value: "GBP", label: "GBP · Pound sterling (£)" }, { value: "EUR", label: "EUR · Euro (€)" }]} /><SelectField label="Date format" value={data.preferences.dateFormat} onChange={(value) => updatePreferences({ dateFormat: value as WealthPreferences["dateFormat"] })} options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((value) => ({ value, label: value }))} /><SelectField label="Language" value={data.preferences.language} onChange={(value) => updatePreferences({ language: value as WealthPreferences["language"] })} options={["English", "हिन्दी"].map((value) => ({ value, label: value }))} /><SelectField label="Week starts on" value={data.preferences.weekStart} onChange={(value) => updatePreferences({ weekStart: value as WealthPreferences["weekStart"] })} options={["Monday", "Sunday"].map((value) => ({ value, label: value }))} /><InputField label="Salary credit day · optional" value={data.preferences.salaryDay ?? ""} onChange={(value) => updatePreferences({ salaryDay: Number(value) || null })} type="number" min="1" placeholder="e.g. 25" /><SelectField label="Appearance" value={data.preferences.theme} onChange={(value) => updatePreferences({ theme: value as WealthPreferences["theme"] })} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} /></div>}
            {onboardingStep === 2 && <div className="space-y-3">{liveAccounts.map((account) => <div key={account.id} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_170px]"><div><p className="font-semibold">{account.name}</p><p className="mt-1 text-xs text-muted-foreground">{account.institution} · {account.kind}</p></div><InputField label="Opening balance" value={account.openingBalance} onChange={(value) => setData((current) => ({ ...current, accounts: current.accounts.map((item) => item.id === account.id ? { ...item, openingBalance: Number(value) || 0 } : item) }))} type="number" min="0" /></div>)}<Button variant="outline" onClick={() => openAccountForm()}><Plus size={16} /> Add another account</Button></div>}
            {onboardingStep === 3 && <div className="grid gap-2 sm:grid-cols-2">{data.categories.filter((category) => !category.archived).map((category) => <div key={category.id} className="flex items-center gap-3 rounded-lg border border-border p-3"><span className="grid size-9 place-items-center rounded-lg bg-muted">{category.icon}</span><span className="text-sm font-medium">{category.name}</span><span className="ml-auto text-xs text-muted-foreground">{category.kind}</span><Button size="icon" variant="ghost" title={`Edit ${category.name}`} aria-label={`Edit ${category.name}`} onClick={() => openCategoryForm(category)}><Pencil size={14} /></Button></div>)}<Button variant="outline" className="h-12" onClick={() => openCategoryForm(undefined, categoryTab)}><Plus size={16} /> Add a category</Button></div>}
            {onboardingStep === 4 && <div className="space-y-3"><p className="text-sm text-muted-foreground">Your local demo starts with <strong className="text-foreground">{data.accounts.length} accounts</strong>, <strong className="text-foreground">{data.categories.length} categories</strong>, and a set of clearly marked sample transactions.</p><div className="rounded-lg bg-success-soft p-4 text-sm text-success">Your data stays in this browser. Nothing connects to a bank or is sent to a server.</div><div className="grid gap-3 sm:grid-cols-3">{[{ label: "Accounts", value: String(liveAccounts.length) }, { label: "Categories", value: String(data.categories.filter((item) => !item.archived).length) }, { label: "Currency", value: currency }].map((item) => <div key={item.label} className="rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className="wt-display mt-1 text-xl font-bold">{item.value}</p></div>)}</div></div>}
          </div>
          <div className="mt-6 flex items-center justify-between"><Button variant="ghost" disabled={onboardingStep === 0} onClick={() => setOnboardingStep((step) => Math.max(0, step - 1))}><ChevronLeft size={16} /> Back</Button><Button onClick={() => onboardingStep === 4 ? finishOnboarding() : setOnboardingStep((step) => Math.min(4, step + 1))}>{onboardingStep === 4 ? "Go to dashboard" : "Continue"}<ArrowRight size={16} /></Button></div>
        </div>
      </main>
      {modal === "account" && <AccountModal account={editingAccount} onClose={() => setModal(null)} onSave={saveAccount} />}
      {modal === "category" && <CategoryModal category={editingCategory} kind={categoryTab} onClose={() => setModal(null)} onSave={saveCategory} />}
    </>;
  }

  const monthList = [...new Set(data.transactions.map((item) => item.date.slice(0, 7)))].sort().reverse();
  const filteredSearch = searchText.trim().toLowerCase();
  const globalResults = filteredSearch ? [
    ...data.transactions.filter((item) => [item.description, item.merchant, item.notes].some((value) => value.toLowerCase().includes(filteredSearch))).slice(0, 4).map((item) => ({ kind: "Transaction", label: item.description, sub: money(item.amount), select: () => { goSection("Transactions"); setSearch(item.description); setSearchOpen(false); } })),
    ...data.accounts.filter((item) => item.name.toLowerCase().includes(filteredSearch)).slice(0, 3).map((item) => ({ kind: "Account", label: item.name, sub: money(getAccountBalance(item, data.transactions)), select: () => { goSection("Accounts"); setSelectedAccount(item); setSearchOpen(false); } })),
    ...data.categories.filter((item) => item.name.toLowerCase().includes(filteredSearch)).slice(0, 3).map((item) => ({ kind: "Category", label: item.name, sub: item.kind, select: () => { goSection("Categories"); setSearchOpen(false); } })),
  ] : [];

  const monthTitle = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${monthFilter}-01T00:00:00`));
  const recentTransactions = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const lastSixMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(2026, 9 - (5 - index), 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const rows = data.transactions.filter((item) => item.date.slice(0, 7) === monthKey);
    return { month: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date), key: monthKey, income: rows.filter((item) => item.type === "Income").reduce((sum, row) => sum + row.amount, 0), expenses: rows.filter((item) => item.type === "Expense").reduce((sum, row) => sum + row.amount, 0) };
  });
  const setMonthOffset = (offset: number) => {
    const current = new Date(`${monthFilter}-01T00:00:00`);
    current.setMonth(current.getMonth() + offset);
    setMonthFilter(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
  };

  return <div className="min-h-screen bg-background">
    <Toaster position="top-right" richColors />
    <div className="flex min-h-screen">
      <aside className={`${mobileNav ? "fixed inset-y-0 left-0 z-40 flex w-[272px]" : "hidden"} shrink-0 flex-col border-r border-border bg-card lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[248px]`}>
        <div className="flex h-[76px] items-center justify-between border-b border-border px-5"><AppLogo /><Button className="lg:hidden" variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X /></Button></div>
        <div className="px-4 pt-6"><p className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Workspace</p><nav className="mt-3 space-y-1">{navItems.map(({ label, icon: Icon }) => <Button key={label} variant={active === label ? "secondary" : "ghost"} className={`h-10 w-full justify-start gap-3 px-3 ${active === label ? "font-semibold text-primary" : "text-muted-foreground"}`} onClick={() => goSection(label)}><Icon size={17} />{label}{label === "Recurring" && <span className="ml-auto rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">{data.recurring.filter((item) => item.enabled).length}</span>}</Button>)}</nav></div>
        <div className="mt-auto p-4"><div className="rounded-lg border border-border bg-muted/50 p-3"><div className="flex items-center gap-2"><ShieldCheck size={15} className="text-success"/><span className="text-xs font-semibold">Private local demo</span></div><p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">Sample data stays in this browser. Nothing is connected.</p></div><Button variant="ghost" className="mt-3 h-10 w-full justify-start gap-3 px-3 text-muted-foreground" onClick={() => { setActive("Settings"); setSettingsTab("General"); }}><Settings2 size={17} />Settings</Button></div>
      </aside>
      {mobileNav && <button aria-label="Close navigation backdrop" className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setMobileNav(false)} />}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu /></Button><div className="hidden min-w-0 sm:block"><p className="text-xs text-muted-foreground">Personal workspace</p><p className="wt-display truncate text-sm font-bold">{active === "Overview" ? "Good morning" : active}</p></div></div>
          <div className="flex items-center gap-1.5">
            <div className="relative hidden md:block"><button className="flex h-9 w-[220px] items-center gap-2 rounded-md border border-input bg-card px-3 text-left text-sm text-muted-foreground" onClick={() => setSearchOpen(true)}><Search size={15} />Search transactions…<span className="ml-auto rounded border border-border px-1 text-[10px]">⌘ K</span></button></div>
            <Button variant="outline" className="hidden h-9 sm:inline-flex" onClick={() => beginTransaction()}><Plus size={15} /> Add transaction</Button>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search" onClick={() => setSearchOpen(true)}><Search /></Button>
            <div className="relative"><Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => { setNotificationOpen((value) => !value); setProfileOpen(false); }}><Bell size={18} />{data.notifications.some((item) => !item.read) && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />}</Button>
              {notificationOpen && <div className="absolute right-0 top-12 z-30 w-[min(340px,calc(100vw-24px))] rounded-lg border border-border bg-card p-2 wt-shadow"><div className="flex items-center justify-between px-2 py-2"><p className="font-semibold">Notifications</p><Button variant="link" className="h-auto p-0 text-xs" onClick={() => setData((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) }))}>Mark all read</Button></div>{data.notifications.length ? data.notifications.slice(0, 5).map((notice) => <button key={notice.id} className="flex w-full gap-2 rounded-md p-2 text-left hover:bg-muted" onClick={() => { setData((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === notice.id ? { ...item, read: true } : item) })); setNotificationOpen(false); }}><span className={`mt-1.5 size-2 shrink-0 rounded-full ${notice.read ? "bg-muted-foreground/30" : "bg-primary"}`} /><span><span className="block text-sm font-semibold">{notice.title}</span><span className="block text-xs text-muted-foreground">{notice.description}</span></span></button>) : <p className="px-2 py-6 text-center text-sm text-muted-foreground">You’re all caught up.</p>}<Button variant="ghost" size="sm" className="w-full" onClick={() => setData((current) => ({ ...current, notifications: [] }))}>Clear notifications</Button></div>}
            </div>
            <div className="relative"><Button variant="ghost" className="h-9 gap-2 px-1.5" onClick={() => { setProfileOpen((value) => !value); setNotificationOpen(false); }}><span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{getInitials(email)}</span><ChevronDown size={14} className="hidden sm:block" /></Button>{profileOpen && <div className="absolute right-0 top-12 z-30 w-52 rounded-lg border border-border bg-card p-1.5 wt-shadow"><div className="border-b border-border px-3 py-2"><p className="text-sm font-semibold">Demo profile</p><p className="truncate text-xs text-muted-foreground">{email}</p></div><Button variant="ghost" className="mt-1 w-full justify-start" onClick={() => { goSection("Settings"); setSettingsTab("General"); setProfileOpen(false); }}>Preferences</Button><Button variant="ghost" className="w-full justify-start" onClick={() => { toast("WealthTrack local demo", { description: "Your sample records are stored only in this browser." }); setProfileOpen(false); }}><CircleHelp size={15} /> Help</Button><Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => { setPendingDelete({ kind: "signout", label: "Sign out of this demo?" }); setModal("confirm"); setProfileOpen(false); }}><LogOut size={15} /> Sign out</Button></div>}</div>
          </div>
        </header>
        <main className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7 sm:pb-10 lg:px-9">
          {active === "Overview" && <Dashboard data={data} summary={summary} money={money} monthTitle={monthTitle} monthFilter={monthFilter} setMonthOffset={setMonthOffset} currentMonthTransactions={currentMonthTransactions} recentTransactions={recentTransactions} onAdd={beginTransaction} onNavigate={goSection} onSelectTransaction={setSelectedTransaction} onCategory={(id) => { setTxCategory(id); goSection("Transactions"); }} />}
          {active === "Transactions" && <TransactionsPage data={data} rows={filteredTransactions} search={search} setSearch={setSearch} txType={txType} setTxType={setTxType} txCategory={txCategory} setTxCategory={setTxCategory} txAccount={txAccount} setTxAccount={setTxAccount} txSort={txSort} setTxSort={setTxSort} monthFilter={monthFilter} setMonthFilter={setMonthFilter} monthList={monthList} money={money} onAdd={() => beginTransaction()} onEdit={(item) => beginTransaction(undefined, item)} onView={setSelectedTransaction} onExport={() => exportCsv(filteredTransactions)} onImport={openImport} selectedIds={selectedIds} toggleSelected={toggleSelected} toggleAll={toggleAll} onDelete={(item) => requestDelete("transaction", item.id, item.description, item.amount)} onBulkDelete={() => { setPendingDelete({ kind: "bulk", label: `Delete ${selectedIds.length} selected transactions?` }); setModal("confirm"); }} onBulkReassign={bulkReassign} />}
          {active === "Accounts" && <AccountsPage data={data} money={money} selected={selectedAccount} setSelected={setSelectedAccount} onAdd={() => openAccountForm()} onEdit={openAccountForm} onTransfer={(account) => beginTransaction({ type: "Transfer", accountId: account.id })} onReconcile={(account) => { const amount = window.prompt(`Enter the new balance for ${account.name}`, String(getAccountBalance(account, data.transactions))); if (amount === null || !Number.isFinite(Number(amount))) return; const current = getAccountBalance(account, data.transactions); const difference = Number(amount) - current; if (!difference) { toast.success("Balance matches already"); return; } const adjustment: Transaction = { id: createTransactionId(), date: new Date().toISOString().slice(0, 16), description: "Balance reconciliation", type: "Adjustment", amount: difference, categoryId: "", accountId: account.id, destinationAccountId: "", paymentMethod: "Adjustment", need: "Need", merchant: "", tags: ["reconciled"], notes: "Reconciled balance", recurring: false, customValues: {} }; setData((currentState) => ({ ...currentState, transactions: [adjustment, ...currentState.transactions] })); notify("Account reconciled", `${account.name} · ${money(Number(amount))}`); toast.success("Account balance reconciled"); }} onArchive={(account) => requestDelete("account", account.id, account.name)} onSelectTransaction={setSelectedTransaction} />}
          {active === "Categories" && <CategoriesPage data={data} kind={categoryTab} setKind={setCategoryTab} onAdd={() => openCategoryForm(undefined, categoryTab)} onEdit={openCategoryForm} onDelete={(category) => requestDelete("category", category.id, category.name)} money={money} onManageFields={() => setSettingsTab("Custom fields")} />}
          {active === "Reports" && <ReportsPage data={data} rows={reportTransactions} range={reportRange} setRange={setReportRange} category={reportCategory} setCategory={setReportCategory} account={reportAccount} setAccount={setReportAccount} money={money} onExport={() => exportCsv(reportTransactions)} onCategory={(id) => { setTxCategory(id); goSection("Transactions"); }} />}
          {active === "Recurring" && <RecurringPage data={data} money={money} onAdd={() => { setEditingRecurring(null); setModal("recurring"); }} onEdit={(item) => { setEditingRecurring(item); setModal("recurring"); }} onDelete={(item) => requestDelete("recurring", item.id, item.name, item.amount)} onToggle={(item) => setData((current) => ({ ...current, recurring: current.recurring.map((row) => row.id === item.id ? { ...row, enabled: !row.enabled } : row) }))} />}
          {active === "Settings" && <SettingsPage data={data} settingsTab={settingsTab} setSettingsTab={setSettingsTab} updatePreferences={updatePreferences} money={money} onExport={() => exportCsv()} onImport={openImport} onReset={() => { setPendingDelete({ kind: "reset", label: "Restore the original sample dataset?", amount: data.transactions.length }); setModal("confirm"); }} onSignout={() => { setPendingDelete({ kind: "signout", label: "Sign out of this demo?" }); setModal("confirm"); }} onFieldAdd={(field) => { if (!field.name?.trim()) { toast.error("Give this field a name"); return; } const customField: CustomField = { id: createTransactionId(), name: field.name.trim(), type: field.type ?? "Text", options: field.options ?? [], required: field.required ?? false }; setData((current) => ({ ...current, customFields: [...current.customFields, customField] })); setFieldForm({ type: "Text", options: [], required: false }); toast.success("Custom field added"); }} onFieldDelete={(id) => setData((current) => ({ ...current, customFields: current.customFields.filter((field) => field.id !== id) }))} fieldForm={fieldForm} setFieldForm={setFieldForm} tagDraft={tagDraft} setTagDraft={setTagDraft} onTagAdd={() => { const tag = tagDraft.trim().toLowerCase(); if (!tag) return; if (data.tags.includes(tag)) { toast.error("That tag already exists"); return; } setData((current) => ({ ...current, tags: [...current.tags, tag] })); setTagDraft(""); toast.success("Tag added"); }} onTagDelete={(tag) => setData((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }))} />}
        </main>
      </div>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden">{["Overview", "Transactions", "Accounts", "Reports"].map((section) => { const item = navItems.find((nav) => nav.label === section); const Icon = item?.icon ?? LayoutDashboard; return <button key={section} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] ${active === section ? "font-semibold text-primary" : "text-muted-foreground"}`} onClick={() => goSection(section as Section)}><Icon size={18} />{section === "Overview" ? "Home" : section}</button>; })}<button className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground" onClick={() => setMobileNav(true)}><Menu size={18} />More</button></nav>
    <Button aria-label="Add transaction" title="Add transaction" className="fixed bottom-20 right-4 z-20 size-12 rounded-full p-0 shadow-lg sm:bottom-7 sm:right-7 lg:hidden" onClick={() => beginTransaction()}><Plus size={21} /></Button>
    {searchOpen && <Modal title="Search WealthTrack" description="Search transactions, accounts, and categories." onClose={() => setSearchOpen(false)}><div className="relative"><Search size={17} className="absolute left-3 top-3 text-muted-foreground" /><input autoFocus className="wt-field pl-9" placeholder="Try “groceries” or “savings”…" value={searchText} onChange={(event) => setSearchText(event.target.value)} /></div><div className="mt-4 space-y-1">{globalResults.map((result, index) => <button key={`${result.kind}-${result.label}-${index}`} className="flex w-full items-center justify-between rounded-md p-3 text-left hover:bg-muted" onClick={result.select}><span><span className="block text-sm font-semibold">{result.label}</span><span className="block text-xs text-muted-foreground">{result.kind}</span></span><span className="text-xs text-muted-foreground">{result.sub}</span></button>)}{filteredSearch && !globalResults.length && <p className="py-8 text-center text-sm text-muted-foreground">No matching records found.</p>}{!filteredSearch && <p className="py-5 text-center text-sm text-muted-foreground">Start typing to search your workspace.</p>}</div></Modal>}
    {modal === "transaction" && <TransactionModal data={data} form={transactionForm} setForm={setTransactionForm} errors={transactionErrors} edit={Boolean(editTransaction)} onClose={() => setModal(null)} onSave={saveTransaction} />}
    {modal === "account" && <AccountModal account={editingAccount} onClose={() => setModal(null)} onSave={saveAccount} />}
    {modal === "category" && <CategoryModal category={editingCategory} kind={categoryTab} onClose={() => setModal(null)} onSave={saveCategory} />}
    {modal === "recurring" && <RecurringModal item={editingRecurring} data={data} onClose={() => setModal(null)} onSave={addRecurring} />}
    {modal === "import" && <Modal title="Import transactions" description="Preview and validate a CSV before adding records." wide onClose={() => setModal(null)}><div className="space-y-4"><div className="rounded-lg border border-dashed border-border bg-muted/35 p-5 text-center"><FileUp className="mx-auto mb-2 text-primary" size={22} /><p className="text-sm font-semibold">Choose a CSV file</p><p className="mt-1 text-xs text-muted-foreground">Required columns: description, amount · Optional: date, type, category</p><Button variant="outline" className="mt-3" onClick={() => fileInputRef.current?.click()}><FileUp size={15} /> Select CSV</Button><input className="hidden" ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={(event) => onFile(event.target.files?.[0])} /></div><label className="block"><span className="wt-label">Or paste CSV content</span><textarea className="wt-field min-h-20 resize-y font-mono text-xs" value={csvText} placeholder={'date,description,amount,type,category\n2026-10-20,Coffee,250,Expense,Food & dining'} onChange={(event) => { setCsvText(event.target.value); parseCsv(event.target.value); }} /></label>{csvError && <p className="rounded-md wt-danger-bg p-3 text-sm text-destructive">{csvError}</p>}{csvRows.length > 0 && !csvError && <div className="overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[460px] text-left text-xs"><thead className="bg-muted"><tr>{csvRows[0]?.slice(0, 5).map((header, index) => <th key={index} className="p-2 font-semibold">{header || `Column ${index + 1}`}</th>)}</tr></thead><tbody>{csvRows.slice(1, 5).map((row, index) => <tr key={index} className="border-t border-border">{csvRows[0]?.slice(0, 5).map((_, cell) => <td key={cell} className="max-w-40 truncate p-2">{row[cell] || "—"}</td>)}</tr>)}</tbody></table><p className="border-t border-border p-2 text-xs text-muted-foreground">Previewing {Math.max(0, csvRows.length - 1)} rows · invalid amounts are skipped</p></div>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button disabled={csvError !== "" || csvRows.length < 2} onClick={applyImport}>Import transactions</Button></div></div></Modal>}
    {modal === "confirm" && pendingDelete && <Modal title={pendingDelete.kind === "signout" ? "Sign out" : pendingDelete.kind === "reset" ? "Reset demo data" : pendingDelete.kind === "account" ? "Archive account" : pendingDelete.kind === "category" ? "Archive category" : pendingDelete.kind === "transaction" || pendingDelete.kind === "bulk" ? "Delete transaction" : "Delete recurring item"} description={pendingDelete.kind === "reset" ? "This restores the original sample data and discards your local changes." : pendingDelete.kind === "account" ? "This account will be archived. Transaction history remains untouched." : pendingDelete.kind === "category" ? "This category will be archived. Existing transaction history is preserved." : undefined} onClose={() => { setModal(null); setPendingDelete(null); }}><div className="rounded-md bg-muted p-3"><p className="font-semibold">{pendingDelete.label}</p>{pendingDelete.amount !== undefined && <p className="mt-1 text-sm text-muted-foreground">{money(pendingDelete.amount)}</p>}</div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => { setModal(null); setPendingDelete(null); }}>Cancel</Button><Button variant={pendingDelete.kind === "signout" || pendingDelete.kind === "reset" ? "default" : "destructive"} onClick={confirmDelete}>{pendingDelete.kind === "signout" ? "Sign out" : pendingDelete.kind === "reset" ? "Reset demo" : pendingDelete.kind === "account" || pendingDelete.kind === "category" ? "Archive" : "Delete"}</Button></div></Modal>}
    {selectedTransaction && <TransactionDetail transaction={selectedTransaction} data={data} money={money} onClose={() => setSelectedTransaction(null)} onEdit={(item) => beginTransaction(undefined, item)} onDuplicate={duplicateTransaction} onDelete={(item) => requestDelete("transaction", item.id, item.description, item.amount)} />}
  </div>;
}

function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.13em] text-primary">{eyebrow}</p>}<h1 className="wt-display text-2xl font-extrabold sm:text-3xl">{title}</h1>{description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}</div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</div>;
}

function MetricCard({ label, value, delta, icon: Icon, tone = "blue", onClick }: { label: string; value: string; delta?: string; icon: typeof Wallet; tone?: string; onClick?: () => void }) {
  const toneClass = tone === "green" ? "bg-success-soft text-success" : tone === "red" ? "wt-danger-bg text-destructive" : tone === "amber" ? "bg-chart-3/15 text-chart-3" : "bg-accent text-primary";
  return <button className={`min-w-0 rounded-lg border border-border bg-card p-4 text-left wt-shadow transition hover:border-primary/35 sm:p-5 ${onClick ? "cursor-pointer" : "cursor-default"}`} onClick={onClick}><div className="flex items-start justify-between gap-2"><span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span><span className={`grid size-8 shrink-0 place-items-center rounded-md ${toneClass}`}><Icon size={16} /></span></div><p className="wt-display mt-3 truncate text-xl font-extrabold sm:text-2xl">{value}</p>{delta && <p className="mt-1 text-xs text-muted-foreground">{delta}</p>}</button>;
}

function Dashboard({ data, summary, money, monthTitle, monthFilter, setMonthOffset, currentMonthTransactions, recentTransactions, onAdd, onNavigate, onSelectTransaction, onCategory }: {
  data: WealthState; summary: ReturnType<typeof getMoneySummary>; money: (amount: number) => string; monthTitle: string; monthFilter: string; setMonthOffset: (offset: number) => void; currentMonthTransactions: Transaction[]; recentTransactions: Transaction[]; onAdd: (preset?: Partial<Transaction>) => void; onNavigate: (section: Section) => void; onSelectTransaction: (transaction: Transaction) => void; onCategory: (id: string) => void;
}) {
  const monthIncome = currentMonthTransactions.filter((item) => item.type === "Income").reduce((sum, item) => sum + item.amount, 0);
  const monthExpenses = currentMonthTransactions.filter((item) => item.type === "Expense").reduce((sum, item) => sum + item.amount, 0);
  const maxSpend = Math.max(1, ...data.categories.filter((item) => item.kind === "Expense" && !item.archived).map((item) => getCategorySpend(item.id, currentMonthTransactions)));
  const categories = data.categories.filter((item) => item.kind === "Expense" && !item.archived).map((category) => ({ category, amount: Math.max(0, getCategorySpend(category.id, currentMonthTransactions)) })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5);
  const maxMonth = Math.max(1, ...[monthIncome, monthExpenses]);
  const monthName = new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(`${monthFilter}-01T00:00:00`));
  return <>
    <PageHeading eyebrow="YOUR FINANCIAL OVERVIEW" title="Money, at a glance" description="A thoughtful overview of your accounts, habits, and what’s coming next." actions={<><Button variant="outline" onClick={() => onAdd({ type: "Transfer" })}><ArrowLeftRight size={15} /> Transfer</Button><Button onClick={() => onAdd()}><Plus size={16} /> Add transaction</Button></>} />
    <div className="mb-5 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Sample workspace · all values are editable</p><p className="mt-0.5 text-sm font-semibold">Your money overview</p></div><div className="flex items-center gap-1"><Button size="icon" variant="outline" aria-label="Previous month" onClick={() => setMonthOffset(-1)}><ChevronLeft size={16} /></Button><span className="min-w-28 text-center text-sm font-semibold">{monthTitle}</span><Button size="icon" variant="outline" aria-label="Next month" onClick={() => setMonthOffset(1)}><ChevronRight size={16} /></Button></div></div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><MetricCard label="Total balance" value={money(summary.balance)} delta={`${data.accounts.filter((item) => !item.archived).length} active accounts`} icon={Wallet} tone="blue" onClick={() => onNavigate("Accounts")} /><MetricCard label="Income" value={money(monthIncome)} delta={`${monthName} · compared with expenses`} icon={ArrowDownLeft} tone="green" onClick={() => onNavigate("Reports")} /><MetricCard label="Expenses" value={money(monthExpenses)} delta={`${monthName} · tap to view transactions`} icon={ArrowUpRight} tone="red" onClick={() => { onNavigate("Transactions"); }} /><MetricCard label="Net cash flow" value={money(monthIncome - monthExpenses)} delta="Income less expenses this month" icon={Activity} tone={monthIncome >= monthExpenses ? "green" : "red"} onClick={() => onNavigate("Reports")} /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <section className="rounded-lg border border-border bg-card p-4 wt-shadow sm:p-5"><div className="flex items-start justify-between"><div><h2 className="font-bold">Income vs expenses</h2><p className="mt-1 text-xs text-muted-foreground">Monthly trend · last six months</p></div><Button variant="ghost" size="sm" onClick={() => onNavigate("Reports")}>View report <ArrowRight size={14} /></Button></div><div className="mt-6 flex h-52 items-end gap-2 border-b border-border pb-3 sm:gap-4">{Array.from({ length: 6 }, (_, index) => {
        const date = new Date(2026, 9 - (5 - index), 1); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; const rows = data.transactions.filter((item) => item.date.slice(0, 7) === key); const income = rows.filter((item) => item.type === "Income").reduce((sum, item) => sum + item.amount, 0); const expenses = rows.filter((item) => item.type === "Expense").reduce((sum, item) => sum + item.amount, 0); const max = Math.max(1, ...data.transactions.filter((item) => item.date.slice(0, 7) >= "2026-05").map((item) => item.amount), income, expenses); const label = new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date);
        return <button key={key} className={`flex h-full flex-1 flex-col items-center justify-end gap-2 rounded-md px-1 hover:bg-muted/50 ${key === monthFilter ? "bg-accent/45" : ""}`} onClick={() => { if (key !== monthFilter) setMonthOffset(new Date(`${key}-01`).getMonth() - new Date(`${monthFilter}-01`).getMonth()); }} title={`${label}: ${money(income)} income, ${money(expenses)} expenses`}><div className="flex h-40 w-full max-w-12 items-end justify-center gap-1"><span className="w-[36%] rounded-t-sm bg-primary" style={{ height: `${Math.max(income ? 5 : 0, income / max * 100)}%` }} /><span className="w-[36%] rounded-t-sm bg-chart-3" style={{ height: `${Math.max(expenses ? 5 : 0, expenses / max * 100)}%` }} /></div><span className="text-[10px] text-muted-foreground sm:text-xs">{label}</span></button>;
      })}</div><div className="mt-3 flex gap-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" />Income</span><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-chart-3" />Expenses</span></div></section>
      <section className="rounded-lg border border-border bg-card p-4 wt-shadow sm:p-5"><div className="flex items-start justify-between"><div><h2 className="font-bold">Spending by category</h2><p className="mt-1 text-xs text-muted-foreground">{monthTitle}</p></div><Button variant="ghost" size="sm" onClick={() => onNavigate("Reports")}>Details <ArrowRight size={14} /></Button></div><div className="mt-5 space-y-4">{categories.length ? categories.map(({ category, amount }, index) => <button key={category.id} className="w-full text-left" onClick={() => onCategory(category.id)}><span className="mb-1.5 flex items-center justify-between gap-2 text-sm"><span className="flex min-w-0 items-center gap-2"><span>{category.icon}</span><span className="truncate">{category.name}</span></span><span className="shrink-0 font-semibold">{money(amount)}</span></span><span className="block h-2 overflow-hidden rounded-full bg-muted"><span className={`block h-full rounded-full ${["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"][index % 5]}`} style={{ width: `${Math.min(100, Math.max(5, amount / maxSpend * 100))}%` }} /></span></button>) : <EmptyInline title="Nothing spent this month yet" body="Your category breakdown will appear here." />}</div></section>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <section className="min-w-0 rounded-lg border border-border bg-card p-4 wt-shadow sm:p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Recent transactions</h2><p className="mt-1 text-xs text-muted-foreground">Your latest activity</p></div><Button variant="ghost" size="sm" onClick={() => onNavigate("Transactions")}>All transactions <ArrowRight size={14} /></Button></div><div className="space-y-1">{recentTransactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} category={data.categories.find((item) => item.id === transaction.categoryId)} account={data.accounts.find((item) => item.id === transaction.accountId)} money={money} onClick={() => onSelectTransaction(transaction)} />)}</div></section>
      <div className="space-y-5"><section className="rounded-lg border border-border bg-card p-4 wt-shadow sm:p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Your accounts</h2><p className="mt-1 text-xs text-muted-foreground">Balances at a glance</p></div><Button size="icon" variant="ghost" title="View accounts" aria-label="View accounts" onClick={() => onNavigate("Accounts")}><ArrowRight size={16} /></Button></div><div className="mt-3 space-y-2">{data.accounts.filter((item) => !item.archived).slice(0, 4).map((account) => <div key={account.id} className="flex items-center gap-3 py-2"><span className="grid size-9 place-items-center rounded-md bg-muted text-primary"><Wallet size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{account.name}</p><p className="text-xs text-muted-foreground">{account.institution || account.kind}</p></div><span className="text-sm font-semibold">{money(getAccountBalance(account, data.transactions))}</span></div>)}</div></section>
        <section className="rounded-lg border border-border bg-card p-4 wt-shadow sm:p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Coming up</h2><p className="mt-1 text-xs text-muted-foreground">Simulated recurring reminders</p></div><CalendarDays size={17} className="text-muted-foreground" /></div><div className="mt-3 space-y-3">{data.recurring.filter((item) => item.enabled).sort((a, b) => a.nextDate.localeCompare(b.nextDate)).slice(0, 3).map((item) => <div key={item.id} className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-md ${item.type === "Income" ? "wt-success-bg text-success" : "bg-muted text-foreground"}`}>{item.type === "Income" ? <ArrowDownLeft size={16} /> : <CalendarDays size={16} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">{formatDate(item.nextDate)}</p></div><span className={`text-sm font-semibold ${item.type === "Income" ? "text-success" : ""}`}>{item.type === "Income" ? "+" : "−"}{money(item.amount)}</span></div>)}{!data.recurring.some((item) => item.enabled) && <EmptyInline title="No reminders scheduled" body="Add a recurring item to see it here." />}</div><Button variant="link" className="mt-3 h-auto p-0 text-xs" onClick={() => onNavigate("Recurring")}>Manage recurring <ArrowRight size={13} /></Button></section></div>
    </div>
  </>;
}

function EmptyInline({ title, body }: { title: string; body: string }) { return <div className="py-6 text-center"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{body}</p></div>; }

function TransactionRow({ transaction, category, account, money, onClick }: { transaction: Transaction; category?: Category; account?: Account; money: (amount: number) => string; onClick: () => void }) {
  const amount = transaction.type === "Expense" ? -transaction.amount : transaction.type === "Adjustment" ? transaction.amount : transaction.amount;
  return <button onClick={onClick} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-muted/55 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.8fr)_auto]">
    <span className="flex min-w-0 items-center gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-full ${transaction.type === "Income" || transaction.type === "Refund" ? "wt-success-bg text-success" : "bg-muted text-foreground"}`}>{transaction.type === "Income" ? <ArrowDownLeft size={16} /> : transaction.type === "Transfer" ? <ArrowLeftRight size={15} /> : <ArrowUpRight size={16} />}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{transaction.description}</span><span className="block truncate text-xs text-muted-foreground">{transaction.merchant || category?.name || transaction.type}</span></span></span>
    <span className="hidden truncate text-xs text-muted-foreground sm:block">{category?.name || transaction.type}</span><span className="hidden truncate text-xs text-muted-foreground sm:block">{account?.name || "—"}</span><span className={`text-right text-sm font-bold ${amount >= 0 && transaction.type !== "Transfer" ? "text-success" : ""}`}>{transaction.type === "Expense" ? "−" : transaction.type === "Income" || transaction.type === "Refund" ? "+" : ""}{money(Math.abs(amount))}</span>
  </button>;
}
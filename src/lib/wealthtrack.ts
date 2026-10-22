export type TransactionType = "Expense" | "Income" | "Refund" | "Adjustment" | "Transfer" | "Investment";
export type CategoryKind = "Expense" | "Income";
export type AccountKind = "Bank account" | "Cash" | "Digital wallet" | "Credit card" | "Investment" | "Other";
export type Section = "Overview" | "Transactions" | "Accounts" | "Categories" | "Reports" | "Recurring" | "Settings";
// Cash-flow direction for an investment transaction: money leaving (Contribution/Purchase/Fee),
// money returning (Sale/Maturity/Dividend), or a non-cash note of current value (Valuation).
export type InvestmentAction = "Contribution" | "Purchase" | "Sale" | "Maturity" | "Dividend" | "Fee" | "Valuation";
export type InvestmentInstrument = "Mutual fund" | "SIP" | "Fixed deposit" | "Stocks" | "ETF" | "Bonds" | "Other";
export const INVESTMENT_OUTFLOW_ACTIONS: InvestmentAction[] = ["Contribution", "Purchase", "Fee"];
export const INVESTMENT_INFLOW_ACTIONS: InvestmentAction[] = ["Sale", "Maturity", "Dividend"];

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  institution: string;
  identifier: string;
  openingBalance: number;
  notes: string;
  archived?: boolean;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  monthlyLimit: number;
  defaultNeed?: "Need" | "Want";
  archived?: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  destinationAccountId: string;
  paymentMethod: string;
  need: "Need" | "Want";
  merchant: string;
  tags: string[];
  notes: string;
  recurring: boolean;
  customValues: Record<string, string | boolean>;
  investmentAction?: InvestmentAction;
  instrumentType?: InvestmentInstrument;
  instrumentName?: string;
  units?: number;
  pricePerUnit?: number;
}

export interface RecurringItem {
  id: string;
  name: string;
  type: "Expense" | "Income";
  amount: number;
  categoryId: string;
  accountId: string;
  frequency: "Weekly" | "Monthly" | "Yearly" | "Custom interval";
  intervalDays: number;
  startDate: string;
  endDate: string;
  nextDate: string;
  need?: "Need" | "Want";
  enabled: boolean;
}

export interface CustomField {
  id: string;
  name: string;
  type: "Text" | "Number" | "Date" | "Dropdown" | "Checkbox";
  options: string[];
  required: boolean;
}

export interface WealthPreferences {
  displayName: string;
  currency: "INR" | "USD" | "GBP" | "EUR";
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  language: "English" | "हिन्दी";
  weekStart: "Monday" | "Sunday";
  theme: "light" | "dark";
  salaryDay: number | null;
  defaultType: "Expense" | "Income";
  defaultAccount: string;
  defaultPaymentMethod: string;
  confirmTransactions: boolean;
  recurringReminders: boolean;
  budgetReminders: boolean;
  otherReminders: boolean;
}

export interface WealthNotification {
  id: string;
  title: string;
  description: string;
  date: string;
  read: boolean;
}

export interface WealthState {
  session: boolean;
  onboarded: boolean;
  preferences: WealthPreferences;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurring: RecurringItem[];
  notifications: WealthNotification[];
  tags: string[];
  customFields: CustomField[];
}

export interface MoneySummary {
  income: number;
  expenses: number;
  net: number;
  balance: number;
}

export const STORAGE_KEY = "wealthtrack-demo-v1";

export function createInitialState(): WealthState {
  const accounts: Account[] = [
    { id: "acc-hdfc", name: "Everyday account", kind: "Bank account", institution: "HDFC Bank", identifier: "•••• 4281", openingBalance: 125000, notes: "Main account" },
    { id: "acc-sbi", name: "Savings", kind: "Bank account", institution: "State Bank of India", identifier: "•••• 9016", openingBalance: 48750, notes: "Savings account" },
    { id: "acc-cash", name: "Cash wallet", kind: "Cash", institution: "Cash", identifier: "", openingBalance: 3800, notes: "" },
    { id: "acc-paytm", name: "Paytm wallet", kind: "Digital wallet", institution: "Paytm", identifier: "", openingBalance: 4150, notes: "" },
  ];
  const categories: Category[] = [
    { id: "cat-food", name: "Food & dining", kind: "Expense", icon: "🍽️", color: "rose", monthlyLimit: 12000 },
    { id: "cat-housing", name: "Housing", kind: "Expense", icon: "🏠", color: "blue", monthlyLimit: 25000 },
    { id: "cat-travel", name: "Transport", kind: "Expense", icon: "🚗", color: "teal", monthlyLimit: 6000 },
    { id: "cat-shopping", name: "Shopping", kind: "Expense", icon: "🛍️", color: "violet", monthlyLimit: 8000 },
    { id: "cat-bills", name: "Bills & utilities", kind: "Expense", icon: "💡", color: "amber", monthlyLimit: 7000 },
    { id: "cat-health", name: "Health", kind: "Expense", icon: "🏥", color: "green", monthlyLimit: 5000 },
    { id: "cat-entertainment", name: "Entertainment", kind: "Expense", icon: "🎬", color: "pink", monthlyLimit: 4000 },
    { id: "cat-salary", name: "Salary", kind: "Income", icon: "💼", color: "green", monthlyLimit: 0 },
    { id: "cat-freelance", name: "Freelance", kind: "Income", icon: "💻", color: "blue", monthlyLimit: 0 },
    { id: "cat-investments", name: "Investments", kind: "Income", icon: "📈", color: "teal", monthlyLimit: 0 },
    { id: "cat-other-income", name: "Other income", kind: "Income", icon: "💰", color: "violet", monthlyLimit: 0 },
  ];
  const tx = (
    id: string, date: string, description: string, type: TransactionType, amount: number,
    categoryId: string, accountId: string, options: Partial<Transaction> = {},
  ): Transaction => ({
    id, date, description, type, amount, categoryId, accountId, destinationAccountId: "",
    paymentMethod: "UPI", need: "Need", merchant: description, tags: [], notes: "",
    recurring: false, customValues: {}, ...options,
  });
  const transactions = [
    tx("tx-01", "2026-10-20T08:45", "Fresh groceries", "Expense", 1842, "cat-food", "acc-hdfc", { merchant: "Nature's Basket", tags: ["weekly"] }),
    tx("tx-02", "2026-10-19T09:00", "October salary", "Income", 85000, "cat-salary", "acc-hdfc", { paymentMethod: "Bank transfer", merchant: "Acme Technologies", recurring: true }),
    tx("tx-03", "2026-10-18T18:24", "Metro card recharge", "Expense", 800, "cat-travel", "acc-paytm", { merchant: "Delhi Metro", paymentMethod: "Wallet" }),
    tx("tx-04", "2026-10-17T20:12", "Dinner with friends", "Expense", 2150, "cat-food", "acc-hdfc", { merchant: "The Table", need: "Want", paymentMethod: "Card" }),
    tx("tx-05", "2026-10-15T11:15", "Internet bill", "Expense", 999, "cat-bills", "acc-hdfc", { merchant: "Airtel", recurring: true }),
    tx("tx-06", "2026-10-12T14:30", "Design project", "Income", 14500, "cat-freelance", "acc-sbi", { paymentMethod: "Bank transfer", merchant: "Studio North" }),
    tx("tx-07", "2026-10-10T19:05", "Running shoes", "Expense", 3899, "cat-shopping", "acc-hdfc", { merchant: "Decathlon", need: "Want", paymentMethod: "Card" }),
    tx("tx-08", "2026-10-08T10:00", "Rent · October", "Expense", 22000, "cat-housing", "acc-hdfc", { merchant: "Home rent", paymentMethod: "Bank transfer", recurring: true }),
    tx("tx-09", "2026-10-06T09:42", "Pharmacy", "Expense", 640, "cat-health", "acc-cash", { merchant: "Apollo Pharmacy", paymentMethod: "Cash" }),
    tx("tx-10", "2026-10-03T16:20", "Cab home", "Expense", 512, "cat-travel", "acc-paytm", { merchant: "Uber", paymentMethod: "Wallet", need: "Want" }),
    tx("tx-11", "2026-10-02T12:10", "Bookshop refund", "Refund", 650, "cat-shopping", "acc-hdfc", { merchant: "Crossword", notes: "Returned a duplicate book" }),
    tx("tx-12", "2026-09-19T09:00", "September salary", "Income", 85000, "cat-salary", "acc-hdfc", { paymentMethod: "Bank transfer", merchant: "Acme Technologies", recurring: true }),
    tx("tx-13", "2026-09-12T14:00", "Website refresh", "Income", 9800, "cat-freelance", "acc-sbi", { paymentMethod: "Bank transfer", merchant: "Mango Studio" }),
    tx("tx-14", "2026-09-08T10:00", "Rent · September", "Expense", 22000, "cat-housing", "acc-hdfc", { merchant: "Home rent", paymentMethod: "Bank transfer", recurring: true }),
    tx("tx-15", "2026-09-04T19:40", "Mobile plan", "Expense", 599, "cat-bills", "acc-hdfc", { merchant: "Jio", recurring: true }),
    tx("tx-16", "2026-08-19T09:00", "August salary", "Income", 85000, "cat-salary", "acc-hdfc", { paymentMethod: "Bank transfer", merchant: "Acme Technologies", recurring: true }),
    tx("tx-17", "2026-08-08T10:00", "Rent · August", "Expense", 22000, "cat-housing", "acc-hdfc", { merchant: "Home rent", paymentMethod: "Bank transfer", recurring: true }),
    tx("tx-18", "2026-08-03T18:30", "Groceries", "Expense", 3120, "cat-food", "acc-hdfc", { merchant: "BigBasket", tags: ["weekly"] }),
    tx("tx-19", "2026-07-19T09:00", "July salary", "Income", 82000, "cat-salary", "acc-hdfc", { paymentMethod: "Bank transfer", merchant: "Acme Technologies", recurring: true }),
    tx("tx-20", "2026-07-08T10:00", "Rent · July", "Expense", 22000, "cat-housing", "acc-hdfc", { merchant: "Home rent", paymentMethod: "Bank transfer", recurring: true }),
    tx("tx-21", "2026-06-19T09:00", "June salary", "Income", 82000, "cat-salary", "acc-hdfc", { paymentMethod: "Bank transfer", merchant: "Acme Technologies", recurring: true }),
    tx("tx-22", "2026-06-08T10:00", "Rent · June", "Expense", 22000, "cat-housing", "acc-hdfc", { merchant: "Home rent", paymentMethod: "Bank transfer", recurring: true }),
    tx("tx-23", "2026-05-19T09:00", "May salary", "Income", 82000, "cat-salary", "acc-hdfc", { paymentMethod: "Bank transfer", merchant: "Acme Technologies", recurring: true }),
    tx("tx-24", "2026-05-08T10:00", "Rent · May", "Expense", 22000, "cat-housing", "acc-hdfc", { merchant: "Home rent", paymentMethod: "Bank transfer", recurring: true }),
  ];
  const preferences: WealthPreferences = {
    displayName: "", currency: "INR", dateFormat: "DD/MM/YYYY", language: "English", weekStart: "Monday", theme: "light",
    salaryDay: 19, defaultType: "Expense", defaultAccount: "acc-hdfc", defaultPaymentMethod: "UPI",
    confirmTransactions: false, recurringReminders: true, budgetReminders: true, otherReminders: true,
  };
  return {
    session: false,
    onboarded: false,
    preferences,
    accounts,
    categories,
    transactions,
    recurring: [
      { id: "rec-rent", name: "Monthly rent", type: "Expense", amount: 22000, categoryId: "cat-housing", accountId: "acc-hdfc", frequency: "Monthly", intervalDays: 0, startDate: "2026-05-08", endDate: "", nextDate: "2026-11-08", enabled: true },
      { id: "rec-internet", name: "Home internet", type: "Expense", amount: 999, categoryId: "cat-bills", accountId: "acc-hdfc", frequency: "Monthly", intervalDays: 0, startDate: "2026-09-15", endDate: "", nextDate: "2026-11-15", enabled: true },
      { id: "rec-salary", name: "Monthly salary", type: "Income", amount: 85000, categoryId: "cat-salary", accountId: "acc-hdfc", frequency: "Monthly", intervalDays: 0, startDate: "2026-05-19", endDate: "", nextDate: "2026-11-19", enabled: true },
    ],
    notifications: [
      { id: "notice-rent", title: "Rent is coming up", description: "Monthly rent · ₹22,000 · Nov 8", date: "2026-10-20", read: false },
      { id: "notice-salary", title: "Salary expected soon", description: "Monthly salary · ₹85,000 · Nov 19", date: "2026-10-20", read: false },
    ],
    tags: ["weekly", "work", "travel", "subscription"],
    customFields: [],
  };
}

export function safeAmount(amount: unknown): number {
  const num = Number(amount);
  return Number.isFinite(num) ? num : 0;
}

export function applyTransactionToAccountBalance(balance: number, transaction: Transaction, accountId: string): number {
  const amount = safeAmount(transaction.amount);
  if (transaction.type === "Income" && transaction.accountId === accountId) return balance + amount;
  if (transaction.type === "Expense" && transaction.accountId === accountId) return balance - amount;
  if (transaction.type === "Refund" && transaction.accountId === accountId) return balance + amount;
  if (transaction.type === "Adjustment" && transaction.accountId === accountId) return balance + amount;
  if (transaction.type === "Transfer") {
    if (transaction.accountId === accountId) return balance - amount;
    if (transaction.destinationAccountId === accountId) return balance + amount;
  }
  if (transaction.type === "Investment" && transaction.accountId === accountId) {
    // Valuation entries only record current worth; no cash actually moves.
    if (transaction.investmentAction === "Valuation") return balance;
    if (transaction.investmentAction && INVESTMENT_INFLOW_ACTIONS.includes(transaction.investmentAction)) return balance + amount;
    return balance - amount;
  }
  return balance;
}

export function getAccountBalance(account: Account, transactions: Transaction[]): number {
  return transactions.reduce(
    (balance, transaction) => applyTransactionToAccountBalance(balance, transaction, account.id),
    safeAmount(account.openingBalance)
  );
}

export function getMoneySummary(accounts: Account[], transactions: Transaction[]): MoneySummary {
  // Transfers and investment movements are cash reallocations, not ordinary income/expense.
  const income = transactions.reduce((sum, item) => sum + (item.type === "Income" ? safeAmount(item.amount) : 0), 0);
  const expenseTotal = transactions.reduce((sum, item) => sum + (item.type === "Expense" ? safeAmount(item.amount) : 0), 0);
  const refundTotal = transactions.reduce((sum, item) => sum + (item.type === "Refund" ? safeAmount(item.amount) : 0), 0);
  const expenses = Math.max(0, expenseTotal - refundTotal);
  const balance = accounts.filter((account) => !account.archived).reduce((sum, account) => sum + getAccountBalance(account, transactions), 0);
  return { income, expenses, net: income - expenses, balance };
}

export function getInvestmentSummary(transactions: Transaction[]) {
  const investmentTx = transactions.filter((item) => item.type === "Investment");
  const contributions = investmentTx.reduce((sum, item) => sum + (item.investmentAction && INVESTMENT_OUTFLOW_ACTIONS.includes(item.investmentAction) ? safeAmount(item.amount) : 0), 0);
  const returns = investmentTx.reduce((sum, item) => sum + (item.investmentAction && INVESTMENT_INFLOW_ACTIONS.includes(item.investmentAction) ? safeAmount(item.amount) : 0), 0);
  const latestValuation = [...investmentTx].filter((item) => item.investmentAction === "Valuation").sort((a, b) => b.date.localeCompare(a.date))[0];
  return { contributions, returns, currentValue: latestValuation ? safeAmount(latestValuation.amount) : undefined };
}

export function getNextRecurringDate(
  currentDate: string,
  frequency: RecurringItem["frequency"],
  intervalDays = 1
): string {
  const [year, month, day] = currentDate.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return currentDate;

  const freqLower = (frequency || "").toLowerCase();
  if (freqLower === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (freqLower === "custom interval") {
    date.setDate(date.getDate() + Math.max(1, Number(intervalDays) || 1));
  } else if (freqLower === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    // Monthly: clamp to the last day of target month instead of overflowing (e.g. Jan 31 -> Feb 28, not Mar 3).
    const originalDay = day;
    date.setMonth(date.getMonth() + 1);
    if (date.getDate() !== originalDay) {
      date.setDate(0);
    }
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getCategorySpend(categoryId: string, transactions: Transaction[]): number {
  return transactions.reduce((sum, item) => {
    if (item.categoryId !== categoryId) return sum;
    if (item.type === "Expense") return sum + item.amount;
    if (item.type === "Refund") return sum - item.amount;
    return sum;
  }, 0);
}

export function formatMoney(amount: number, currency: WealthPreferences["currency"] = "INR"): string {
  const currencyCode = currency === "INR" ? "INR" : currency;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(amount);
}

export function createTransactionId(): string {
  return `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeNotification(title: string, description: string): WealthNotification {
  return { id: createTransactionId(), title, description, date: new Date().toISOString().slice(0, 10), read: false };
}

export function processDueRecurringTransactions(
  state: WealthState,
  referenceDateStr = "2026-10-22"
): {
  updatedState: WealthState;
  processedCount: number;
  processedItems: { name: string; amount: number; date: string }[];
} {
  let hasChanges = false;
  const newTransactions: Transaction[] = [];
  const processedItems: { name: string; amount: number; date: string }[] = [];

  const updatedRecurring = state.recurring.map((item) => {
    if (!item.enabled) return item;
    // Check if nextDate is on or before reference date
    if (item.nextDate && item.nextDate.slice(0, 10) <= referenceDateStr) {
      hasChanges = true;
      const cat = state.categories.find((c) => c.id === item.categoryId);

      const tx: Transaction = {
        id: createTransactionId(),
        date: item.nextDate,
        description: item.name,
        type: item.type,
        amount: item.amount,
        categoryId: item.categoryId || "",
        accountId: item.accountId || state.accounts[0]?.id || "",
        destinationAccountId: "",
        paymentMethod: "Auto-debit",
        need: item.need || (cat?.name === "Shopping" || cat?.name === "Entertainment" ? "Want" : "Need"),
        merchant: item.name,
        tags: ["Recurring", "Auto-debit"],
        notes: `Automatically recorded recurring ${item.frequency.toLowerCase()} schedule.`,
        recurring: true,
        customValues: {},
      };
      newTransactions.push(tx);
      processedItems.push({ name: item.name, amount: item.amount, date: item.nextDate });

      const advancedDate = getNextRecurringDate(item.nextDate, item.frequency, item.intervalDays);
      return {
        ...item,
        lastRun: item.nextDate,
        nextDate: advancedDate,
      };
    }
    return item;
  });

  if (!hasChanges) {
    return { updatedState: state, processedCount: 0, processedItems: [] };
  }

  return {
    updatedState: {
      ...state,
      recurring: updatedRecurring,
      transactions: [...newTransactions, ...state.transactions],
    },
    processedCount: newTransactions.length,
    processedItems,
  };
}
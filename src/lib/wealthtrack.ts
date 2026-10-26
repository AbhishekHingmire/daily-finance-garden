export type TransactionType =
  | "Expense"
  | "Income"
  | "EMI / Loan Payment"
  | "Borrow / Loan Taken"
  | "Lend / Loan Given"
  | "Debt Recovery"
  | "Refund"
  | "Adjustment"
  | "Transfer"
  | "Investment";

export const DEBT_TRANSACTION_TYPES: TransactionType[] = [
  "EMI / Loan Payment",
  "Borrow / Loan Taken",
  "Lend / Loan Given",
  "Debt Recovery",
];

export const OUTFLOW_TYPES: TransactionType[] = [
  "Expense",
  "EMI / Loan Payment",
  "Lend / Loan Given",
];

export const INFLOW_TYPES: TransactionType[] = [
  "Income",
  "Borrow / Loan Taken",
  "Debt Recovery",
  "Refund",
];
export type CategoryKind = "Expense" | "Income" | "Transfer";
export type AccountKind = "Bank account" | "Cash" | "Digital wallet" | "Credit card" | "Investment" | "Other";
export type Section =
  | "Overview"
  | "Transactions"
  | "Accounts"
  | "Investments"
  | "Loans"
  | "Funds"
  | "Fund Planner"
  | "Categories"
  | "Reports"
  | "Recurring"
  | "Preferences"
  | "Profile"
  | "Settings"
  | "Wealth"
  | "Plan"
  | "Insights";
// Cash-flow direction for an investment transaction: money leaving (Contribution/Purchase/Fee),
// money returning (Sale/Maturity/Dividend), or a non-cash note of current value (Valuation).
export type InvestmentAction = "Contribution" | "Purchase" | "Sale" | "Maturity" | "Dividend" | "Fee" | "Valuation";
export type InvestmentInstrument = "Mutual fund" | "SIP" | "Fixed deposit" | "Stocks" | "ETF" | "Bonds" | "Other";
export const INVESTMENT_OUTFLOW_ACTIONS: InvestmentAction[] = ["Contribution", "Purchase", "Fee"];
export const INVESTMENT_INFLOW_ACTIONS: InvestmentAction[] = ["Sale", "Maturity", "Dividend"];

export type AssetType =
  | "Mutual fund"
  | "Stocks & Equity"
  | "ETF"
  | "Gold & Commodities"
  | "Fixed deposit"
  | "Crypto"
  | "Other";

export interface InvestmentHolding {
  id: string;
  name: string;
  assetType: AssetType;
  investedAmount: number;
  currentAmount: number;
  startMonthYear?: string; // YYYY-MM (e.g. "2024-05") - Mandatory on creation
  endMonthYear?: string;   // YYYY-MM (e.g. "2029-12") - Optional
  institution?: string;
  notes?: string;
  updatedAt: string;
  isRecurring?: boolean;
  recurringId?: string;
  sipAmount?: number;
  sipFrequency?: string;
  sipAccountId?: string;
  status?: "Active" | "Paused";
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  occupation: string;
  monthlyIncomeTarget: number;
  emergencyFundTarget: number;
  savingsRateTarget: number;
  riskProfile: "Conservative" | "Balanced" | "Aggressive";
  bio?: string;
}

export type LoanType =
  | "Home Loan"
  | "Personal Loan"
  | "Car / Auto Loan"
  | "Education Loan"
  | "Credit Line"
  | "Other";

export interface LoanLiability {
  id: string;
  name: string;
  loanType: LoanType;
  lenderInstitution: string;
  principalAmount: number;
  currentOutstanding: number;
  interestRate: number;
  emiAmount: number;
  repaymentAccountId: string;
  startDate: string;
  endDate?: string;
  tenureMonths: number;
  paidEmisCount: number;
  autoRecurringEmi: boolean;
  notes?: string;
  updatedAt: string;
}

export type FundType = "Emergency" | "PurchaseGoal" | "Custom";

export interface CustomFund {
  id: string;
  name: string;
  type: FundType;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution?: number;
  targetDate?: string;
  linkedAccountId?: string;
  notes?: string;
  icon?: string;
  color?: string;
  status: "Active" | "Completed" | "Paused";
  updatedAt: string;
  skippedMonths?: string[];
}

export type PlanCategory = "Real Estate" | "Vehicle" | "Asset" | "Gadget" | "Life Event" | "Custom";

export interface PurchasePlan {
  id: string;
  title: string;
  category: PlanCategory;
  targetCost: number;
  downPaymentPercent: number; // e.g. 20%
  targetDate: string; // YYYY-MM
  estimatedLoanRate?: number; // e.g. 8.5%
  loanTenureYears?: number; // e.g. 5
  notes?: string;
  status: "Active" | "Draft" | "Achieved";
  updatedAt: string;
}

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
  loanId?: string;
}

export interface RecurringItem {
  id: string;
  name: string;
  type: "Expense" | "Income" | "Investment";
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
  investmentId?: string;
  instrumentType?: InvestmentInstrument;
  units?: number;
  pricePerUnit?: number;
  loanId?: string;
  totalInstallments?: number;
  paidInstallments?: number;
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
  profile?: UserProfile;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurring: RecurringItem[];
  investments?: InvestmentHolding[];
  loans?: LoanLiability[];
  funds?: CustomFund[];
  plans?: PurchasePlan[];
  notifications: WealthNotification[];
  tags: string[];
  customFields: CustomField[];
}

export interface MoneySummary {
  income: number;
  expenses: number;
  net: number;
  balance: number;
  emiPaid?: number;
  borrowed?: number;
  lent?: number;
}

export const STORAGE_KEY = "wealthtrack-demo-v1";

export function createInitialState(): WealthState {
  const accounts: Account[] = [
    { id: "acc-hdfc", name: "Everyday account", kind: "Bank account", institution: "HDFC Bank", identifier: "•••• 4281", openingBalance: 400000, notes: "Main account" },
    { id: "acc-sbi", name: "Savings", kind: "Bank account", institution: "State Bank of India", identifier: "•••• 9016", openingBalance: 80831, notes: "Savings account" },
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
    { id: "cat-loan-emi", name: "Loan EMI & Debt", kind: "Expense", icon: "💳", color: "rose", monthlyLimit: 45000 },
    { id: "cat-borrow", name: "Loans & Borrowings", kind: "Transfer", icon: "🏦", color: "amber", monthlyLimit: 0 },
    { id: "cat-lend", name: "Money Lent / Advances", kind: "Transfer", icon: "🤝", color: "violet", monthlyLimit: 0 },
    { id: "cat-debt-recovery", name: "Debt Recovery", kind: "Transfer", icon: "💵", color: "emerald", monthlyLimit: 0 },
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
    tx("tx-25", "2026-10-10T10:00", "Home Loan EMI · October", "EMI / Loan Payment", 30850, "cat-loan-emi", "acc-hdfc", {
      paymentMethod: "Auto-debit",
      merchant: "HDFC Bank Home Loan",
      loanId: "loan-01",
      notes: "Monthly EMI auto-debited for Tower 4 home loan",
      recurring: true,
    }),
    tx("tx-26", "2026-10-05T10:00", "EV Car Loan EMI · October", "EMI / Loan Payment", 14200, "cat-loan-emi", "acc-sbi", {
      paymentMethod: "Auto-debit",
      merchant: "SBI Auto Loan",
      loanId: "loan-02",
      notes: "Monthly vehicle loan EMI",
      recurring: true,
    }),
    tx("tx-27", "2026-10-01T15:00", "Advance to Rohan", "Lend / Loan Given", 10000, "cat-lend", "acc-hdfc", {
      paymentMethod: "UPI",
      merchant: "Rohan Verma",
      notes: "Personal advance, promised return by Dec 2026",
    }),
    tx("tx-28", "2026-09-28T18:00", "Friend loan recovery", "Debt Recovery", 5000, "cat-debt-recovery", "acc-hdfc", {
      paymentMethod: "UPI",
      merchant: "Amit Sharma",
      notes: "Part repayment of advance lent in August",
    }),
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
    profile: {
      fullName: "Abhishek Hingmire",
      email: "demo@wealthtrack.app",
      phone: "+91 98765 43210",
      occupation: "Senior Product Designer & Engineer",
      monthlyIncomeTarget: 100000,
      emergencyFundTarget: 150000,
      savingsRateTarget: 35,
      riskProfile: "Balanced",
      bio: "Disciplined compounding, clean cashflow, and mindful wealth accumulation.",
    },
    investments: [
      {
        id: "inv-01",
        name: "Parag Parikh Flexi Cap Fund",
        assetType: "Mutual fund",
        investedAmount: 120000,
        currentAmount: 154800,
        startMonthYear: "2024-04",
        institution: "Groww",
        notes: "Monthly SIP of ₹10,000 active",
        updatedAt: "2026-10-22",
      },
      {
        id: "inv-02",
        name: "Nifty 50 Index Fund",
        assetType: "ETF",
        investedAmount: 90000,
        currentAmount: 108200,
        startMonthYear: "2024-06",
        institution: "Zerodha Coin",
        notes: "Passive core index holding",
        updatedAt: "2026-10-21",
      },
      {
        id: "inv-03",
        name: "Tata Motors Ltd",
        assetType: "Stocks & Equity",
        investedAmount: 65000,
        currentAmount: 84500,
        startMonthYear: "2025-01",
        institution: "Zerodha Kite",
        notes: "Long-term EV growth bet",
        updatedAt: "2026-10-22",
      },
      {
        id: "inv-04",
        name: "Sovereign Gold Bond 2028",
        assetType: "Gold & Commodities",
        investedAmount: 50000,
        currentAmount: 62000,
        startMonthYear: "2023-11",
        endMonthYear: "2028-11",
        institution: "RBI / HDFC Sec",
        notes: "2.5% semi-annual interest + capital appreciation",
        updatedAt: "2026-10-15",
      },
      {
        id: "inv-05",
        name: "HDFC 3-Yr Tax Saver FD",
        assetType: "Fixed deposit",
        investedAmount: 70000,
        currentAmount: 73000,
        startMonthYear: "2024-10",
        endMonthYear: "2027-10",
        institution: "HDFC Bank",
        notes: "7.10% compounded quarterly",
        updatedAt: "2026-10-01",
      },
    ],
    loans: [
      {
        id: "loan-01",
        name: "Home Loan · Tower 4",
        loanType: "Home Loan",
        lenderInstitution: "HDFC Bank",
        principalAmount: 3500000,
        currentOutstanding: 2840000,
        interestRate: 8.4,
        emiAmount: 30850,
        repaymentAccountId: "acc-hdfc",
        startDate: "2024-05-10",
        endDate: "2039-05-10",
        tenureMonths: 180,
        paidEmisCount: 29,
        autoRecurringEmi: true,
        notes: "Auto-debited from HDFC Everyday Account on 10th of every month.",
        updatedAt: "2026-10-22",
      },
      {
        id: "loan-02",
        name: "EV Car Loan",
        loanType: "Car / Auto Loan",
        lenderInstitution: "State Bank of India",
        principalAmount: 850000,
        currentOutstanding: 420000,
        interestRate: 8.75,
        emiAmount: 14200,
        repaymentAccountId: "acc-sbi",
        startDate: "2024-08-05",
        endDate: "2029-08-05",
        tenureMonths: 60,
        paidEmisCount: 26,
        autoRecurringEmi: true,
        notes: "Auto-debited from SBI Savings Account on 5th of every month.",
        updatedAt: "2026-10-22",
      },
    ],
    funds: [
      {
        id: "fund-01",
        name: "Emergency Reserve Fund (6-Mo)",
        type: "Emergency",
        targetAmount: 180000,
        currentAmount: 125000,
        monthlyContribution: 10000,
        targetDate: "2027-04-30",
        linkedAccountId: "acc-hdfc",
        notes: "Liquid emergency cushion held across everyday bank accounts.",
        icon: "🛡️",
        color: "emerald",
        status: "Active",
        updatedAt: "2026-10-22",
      },
      {
        id: "fund-02",
        name: "House Downpayment Fund",
        type: "PurchaseGoal",
        targetAmount: 800000,
        currentAmount: 320000,
        monthlyContribution: 25000,
        targetDate: "2028-06-30",
        linkedAccountId: "acc-sbi",
        notes: "Targeting 20% down payment for future family apartment upgrade.",
        icon: "🏠",
        color: "blue",
        status: "Active",
        updatedAt: "2026-10-22",
      },
      {
        id: "fund-03",
        name: "Japan Vacation Fund",
        type: "Custom",
        targetAmount: 150000,
        currentAmount: 85000,
        monthlyContribution: 8000,
        targetDate: "2027-09-15",
        linkedAccountId: "acc-hdfc",
        notes: "Flights, accommodation, and bullet train passes.",
        icon: "✈️",
        color: "violet",
        status: "Active",
        updatedAt: "2026-10-20",
      },
    ],
    plans: [
      {
        id: "plan-01",
        title: "Electric SUV (Tata Harrier EV)",
        category: "Vehicle",
        targetCost: 2400000,
        downPaymentPercent: 25,
        targetDate: "2027-11",
        estimatedLoanRate: 8.75,
        loanTenureYears: 5,
        notes: "Upgrading daily commute vehicle to a modern long-range EV.",
        status: "Active",
        updatedAt: "2026-10-22",
      },
    ],
  };
}

export function safeAmount(amount: unknown): number {
  const num = Number(amount);
  return Number.isFinite(num) ? num : 0;
}

export function applyTransactionToAccountBalance(balance: number, transaction: Transaction, accountId: string): number {
  const amount = safeAmount(transaction.amount);

  // Inflows: Income, Refund, Borrowings received, Debt recoveries, and positive Adjustments
  if (
    (transaction.type === "Income" ||
      transaction.type === "Refund" ||
      transaction.type === "Borrow / Loan Taken" ||
      transaction.type === "Debt Recovery" ||
      transaction.type === "Adjustment") &&
    transaction.accountId === accountId
  ) {
    return balance + amount;
  }

  // Outflows: Expenses, Loan EMI payments, Money lent out
  if (
    (transaction.type === "Expense" ||
      transaction.type === "EMI / Loan Payment" ||
      transaction.type === "Lend / Loan Given") &&
    transaction.accountId === accountId
  ) {
    return balance - amount;
  }

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

export function getAllAccountBalances(accounts: Account[], transactions: Transaction[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const account of accounts) {
    balances.set(account.id, safeAmount(account.openingBalance));
  }
  for (const tx of transactions) {
    if (tx.accountId && balances.has(tx.accountId)) {
      const current = balances.get(tx.accountId)!;
      balances.set(tx.accountId, applyTransactionToAccountBalance(current, tx, tx.accountId));
    }
    if (tx.destinationAccountId && balances.has(tx.destinationAccountId)) {
      const current = balances.get(tx.destinationAccountId)!;
      balances.set(tx.destinationAccountId, applyTransactionToAccountBalance(current, tx, tx.destinationAccountId));
    }
  }
  return balances;
}

export function getAccountBalance(account: Account, transactions: Transaction[]): number {
  return transactions.reduce(
    (balance, transaction) => applyTransactionToAccountBalance(balance, transaction, account.id),
    safeAmount(account.openingBalance)
  );
}

export function getMoneySummary(accounts: Account[], transactions: Transaction[]): MoneySummary {
  let income = 0;
  let expenseTotal = 0;
  let refundTotal = 0;
  let emiPaid = 0;
  let borrowed = 0;
  let lent = 0;

  for (const item of transactions) {
    const amt = safeAmount(item.amount);
    if (item.type === "Income") income += amt;
    else if (item.type === "Expense") expenseTotal += amt;
    else if (item.type === "Refund") refundTotal += amt;
    else if (item.type === "EMI / Loan Payment") emiPaid += amt;
    else if (item.type === "Borrow / Loan Taken") borrowed += amt;
    else if (item.type === "Lend / Loan Given") lent += amt;
  }

  const expenses = Math.max(0, expenseTotal - refundTotal);
  const accountBalances = getAllAccountBalances(accounts, transactions);
  let balance = 0;
  for (const account of accounts) {
    if (!account.archived) {
      balance += accountBalances.get(account.id) ?? safeAmount(account.openingBalance);
    }
  }

  return { income, expenses, net: income - expenses, balance, emiPaid, borrowed, lent };
}

export function getHoldingsSummary(investments: InvestmentHolding[] = []) {
  const totalInvested = investments.reduce((sum, item) => sum + safeAmount(item.investedAmount), 0);
  const currentValue = investments.reduce((sum, item) => sum + safeAmount(item.currentAmount), 0);
  const totalReturns = currentValue - totalInvested;
  const returnPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
  return {
    totalInvested,
    currentValue,
    totalReturns,
    returnPercentage,
  };
}

export function getLoansSummary(loans: LoanLiability[] = []) {
  const totalPrincipal = loans.reduce((sum, item) => sum + safeAmount(item.principalAmount), 0);
  const totalOutstanding = loans.reduce((sum, item) => sum + safeAmount(item.currentOutstanding), 0);
  const totalMonthlyEmi = loans.reduce((sum, item) => sum + safeAmount(item.emiAmount), 0);
  const totalPaid = Math.max(0, totalPrincipal - totalOutstanding);
  const payoffPercentage = totalPrincipal > 0 ? (totalPaid / totalPrincipal) * 100 : 0;
  return {
    totalPrincipal,
    totalOutstanding,
    totalMonthlyEmi,
    totalPaid,
    payoffPercentage,
  };
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

export function syncSystemNotifications(
  state: WealthState,
  clearedIds: string[] = []
): WealthNotification[] {
  const currentNotifications = [...(state.notifications || [])];
  const newNotices: WealthNotification[] = [];
  const currency = state.preferences?.currency || "INR";

  const isExcluded = (id: string) => {
    return (
      clearedIds.includes(id) ||
      currentNotifications.some((n) => n.id === id) ||
      newNotices.some((n) => n.id === id)
    );
  };

  // 1. Completed Goals notifications
  const funds = state.funds || [];
  funds.forEach((fund) => {
    if (fund.targetAmount > 0 && fund.currentAmount >= fund.targetAmount) {
      const noticeId = `notice-goal-${fund.id}`;
      if (!isExcluded(noticeId)) {
        newNotices.push({
          id: noticeId,
          title: `🎉 Goal 100% Achieved: ${fund.name}`,
          description: `Target of ${formatMoney(fund.targetAmount, currency)} fulfilled! Ready for this milestone.`,
          date: fund.updatedAt || new Date().toISOString().slice(0, 10),
          read: false,
        });
      }
    }
  });

  // 2. Scheduled Salary Credit notifications
  const salaryItem = (state.recurring || []).find(
    (r) => r.enabled && (r.name.toLowerCase().includes("salary") || r.type === "Income")
  );
  if (salaryItem && salaryItem.nextDate) {
    const salaryDateStr = salaryItem.nextDate.slice(0, 10);
    const scheduleKey = salaryDateStr.slice(0, 7);
    const noticeId = `notice-salary-${salaryItem.id}-${scheduleKey}`;
    if (!isExcluded(noticeId)) {
      const formattedDate = new Intl.DateTimeFormat("en-IN", {
        month: "short",
        day: "numeric",
      }).format(new Date(salaryDateStr));
      newNotices.push({
        id: noticeId,
        title: "💰 Salary Credit Scheduled",
        description: `Monthly salary • ${formatMoney(salaryItem.amount, currency)} scheduled for ${formattedDate}.`,
        date: salaryDateStr,
        read: false,
      });
    }
  }

  // 3. Scheduled Loan EMI Deductions notifications
  const loans = state.loans || [];
  loans.forEach((loan) => {
    if (loan.currentOutstanding > 0 && (loan.autoRecurringEmi || loan.emiAmount > 0)) {
      const loanMonth = loan.startDate ? loan.startDate.slice(0, 7) : "active";
      const noticeId = `notice-loan-emi-${loan.id}-${loanMonth}`;
      if (!isExcluded(noticeId)) {
        newNotices.push({
          id: noticeId,
          title: "🏦 Loan EMI Deduction Scheduled",
          description: `${loan.name} • ${formatMoney(loan.emiAmount, currency)} auto-debit scheduled on monthly billing cycle.`,
          date: new Date().toISOString().slice(0, 10),
          read: false,
        });
      }
    }
  });

  // 4. Scheduled SIP Investment notifications
  const sips = (state.recurring || []).filter(
    (r) => r.enabled && (r.type === "Investment" || r.instrumentType || r.name.toLowerCase().includes("sip"))
  );
  sips.forEach((sip) => {
    if (sip.nextDate) {
      const sipDateStr = sip.nextDate.slice(0, 10);
      const scheduleKey = sipDateStr.slice(0, 7);
      const noticeId = `notice-sip-${sip.id}-${scheduleKey}`;
      if (!isExcluded(noticeId)) {
        const formattedDate = new Intl.DateTimeFormat("en-IN", {
          month: "short",
          day: "numeric",
        }).format(new Date(sipDateStr));
        newNotices.push({
          id: noticeId,
          title: "📈 SIP Investment Scheduled",
          description: `${sip.name} • ${formatMoney(sip.amount, currency)} scheduled for ${formattedDate}.`,
          date: sipDateStr,
          read: false,
        });
      }
    }
  });

  return [...newNotices, ...currentNotifications];
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
  let updatedInvestments = [...(state.investments || [])];
  let updatedLoans = [...(state.loans || [])];

  const updatedRecurring = state.recurring.map((item) => {
    if (!item.enabled) return item;
    // Check if nextDate is on or before reference date
    if (item.nextDate && item.nextDate.slice(0, 10) <= referenceDateStr) {
      hasChanges = true;
      const cat = state.categories.find((c) => c.id === item.categoryId);

      const isInv = item.type === "Investment";
      const isLoanEmi = Boolean(item.loanId) || item.name.toLowerCase().includes("emi");
      const txType: TransactionType = isInv ? "Investment" : isLoanEmi ? "EMI / Loan Payment" : item.type;

      const tx: Transaction = {
        id: createTransactionId(),
        date: item.nextDate,
        description: item.name,
        type: txType,
        amount: item.amount,
        categoryId: item.categoryId || "",
        accountId: item.accountId || state.accounts[0]?.id || "",
        destinationAccountId: "",
        paymentMethod: "Auto-debit",
        need: item.need || (cat?.name === "Shopping" || cat?.name === "Entertainment" ? "Want" : "Need"),
        merchant: item.name,
        tags: isInv
          ? ["Recurring", "Auto-debit", "SIP", "Investment"]
          : isLoanEmi
          ? ["Recurring", "Auto-debit", "EMI", "Loan"]
          : ["Recurring", "Auto-debit"],
        notes: isInv
          ? `Automated recurring SIP installment for ${item.name}.`
          : isLoanEmi
          ? `Automated loan EMI repayment for ${item.name}.`
          : `Automatically recorded recurring ${item.frequency.toLowerCase()} schedule.`,
        recurring: true,
        customValues: {},
        investmentAction: isInv ? "Contribution" : undefined,
        instrumentType: isInv ? item.instrumentType || "Mutual fund" : undefined,
        loanId: item.loanId,
      };
      newTransactions.push(tx);
      processedItems.push({ name: item.name, amount: item.amount, date: item.nextDate });

      // If recurring item is linked to a Loan, deduct from currentOutstanding and increment paidEmisCount
      if (item.loanId) {
        const loanIdx = updatedLoans.findIndex((l) => l.id === item.loanId);
        if (loanIdx >= 0) {
          const l = updatedLoans[loanIdx];
          const newOutstanding = Math.max(0, safeAmount(l.currentOutstanding) - item.amount);
          updatedLoans[loanIdx] = {
            ...l,
            currentOutstanding: newOutstanding,
            paidEmisCount: (l.paidEmisCount || 0) + 1,
            updatedAt: item.nextDate.slice(0, 10),
          };
        }
      }

      // If recurring item is an Investment, auto-increment investedAmount & currentAmount in holdings
      if (isInv) {
        const targetInvIdx = updatedInvestments.findIndex(
          (inv) => (item.investmentId && inv.id === item.investmentId) || inv.name.toLowerCase() === item.name.toLowerCase()
        );
        if (targetInvIdx >= 0) {
          const inv = updatedInvestments[targetInvIdx];
          updatedInvestments[targetInvIdx] = {
            ...inv,
            investedAmount: inv.investedAmount + item.amount,
            currentAmount: inv.currentAmount + item.amount,
            updatedAt: item.nextDate.slice(0, 10),
          };
        }
      }

      const advancedDate = getNextRecurringDate(item.nextDate, item.frequency, item.intervalDays);
      const nextPaidCount = (item.paidInstallments || 0) + 1;
      const isTenureCompleted = Boolean(item.totalInstallments && nextPaidCount >= item.totalInstallments);

      return {
        ...item,
        lastRun: item.nextDate,
        nextDate: advancedDate,
        paidInstallments: item.totalInstallments ? nextPaidCount : item.paidInstallments,
        enabled: isTenureCompleted ? false : item.enabled,
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
      investments: updatedInvestments,
      loans: updatedLoans,
    },
    processedCount: newTransactions.length,
    processedItems,
  };
}

export function getEmergencyFundSummary(
  profile?: UserProfile,
  liquidBalance = 0,
  monthlyExpenses = 35000,
  funds: CustomFund[] = []
) {
  const emergencyFund = funds.find((f) => f.type === "Emergency");
  const target = emergencyFund?.targetAmount || profile?.emergencyFundTarget || monthlyExpenses * 6;
  const current = emergencyFund ? emergencyFund.currentAmount : liquidBalance;
  const runwayMonths = monthlyExpenses > 0 ? Number((current / monthlyExpenses).toFixed(1)) : 0;
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  const status = runwayMonths >= 6 ? "Optimal (6+ Mo)" : runwayMonths >= 3 ? "Adequate (3–6 Mo)" : "Building (< 3 Mo)";
  const statusColor = runwayMonths >= 6 ? "emerald" : runwayMonths >= 3 ? "blue" : "amber";

  return {
    target,
    current,
    runwayMonths,
    percent,
    status,
    statusColor,
  };
}

export function getPlanSimulation(
  plan: PurchasePlan,
  liquidBalance: number,
  monthlySurplus: number,
  emergencyBuffer = 150000
) {
  const downPayment = Math.round(plan.targetCost * (plan.downPaymentPercent / 100));
  const loanPrincipal = Math.max(0, plan.targetCost - downPayment);

  // Time horizon in months (reference Oct 2026)
  const now = new Date(2026, 9, 22);
  const target = new Date(plan.targetDate + "-01");
  const monthsDiff = Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));

  // Required monthly savings for down payment
  const requiredMonthlySavings = Math.round(downPayment / monthsDiff);

  // Calculate Loan EMI: P * r * (1+r)^n / ((1+r)^n - 1)
  let estimatedMonthlyEmi = 0;
  if (loanPrincipal > 0 && plan.estimatedLoanRate && plan.loanTenureYears) {
    const r = plan.estimatedLoanRate / 12 / 100;
    const n = plan.loanTenureYears * 12;
    estimatedMonthlyEmi = Math.round((loanPrincipal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }

  // Usable liquid cash without breaching emergency buffer
  const safeLiquidDeployable = Math.max(0, liquidBalance - emergencyBuffer);

  // Feasibility assessment
  let feasibility: "Optimal" | "Feasible" | "Stretch" = "Feasible";
  let feasibilityBadge = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";

  if (requiredMonthlySavings <= monthlySurplus * 0.5) {
    feasibility = "Optimal";
    feasibilityBadge = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  } else if (requiredMonthlySavings <= monthlySurplus) {
    feasibility = "Feasible";
    feasibilityBadge = "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  } else {
    feasibility = "Stretch";
    feasibilityBadge = "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }

  // AI recommendations
  const aiRecommendations: string[] = [
    `Save ₹${requiredMonthlySavings.toLocaleString("en-IN")}/mo over the next ${monthsDiff} months to fully fund your ₹${downPayment.toLocaleString("en-IN")} down payment.`,
    safeLiquidDeployable > 0
      ? `You have ₹${safeLiquidDeployable.toLocaleString("en-IN")} in surplus liquid cash above your emergency safety net that can jumpstart this goal.`
      : `Preserve your liquid cash to keep your emergency safety buffer fully intact.`,
  ];

  if (loanPrincipal > 0) {
    aiRecommendations.push(
      `Financing ₹${loanPrincipal.toLocaleString("en-IN")} at ${plan.estimatedLoanRate}% for ${plan.loanTenureYears} years results in an estimated EMI of ₹${estimatedMonthlyEmi.toLocaleString("en-IN")}/mo.`
    );
  }

  return {
    downPayment,
    loanPrincipal,
    monthsDiff,
    requiredMonthlySavings,
    estimatedMonthlyEmi,
    safeLiquidDeployable,
    feasibility,
    feasibilityBadge,
    aiRecommendations,
  };
}

export function calculateNextSalaryInfo(
  salaryDay: number | null | undefined,
  referenceDateStr = "2026-10-22"
): {
  nextDate: string;
  daysRemaining: number;
  isToday: boolean;
  dayOfMonth: number;
} {
  const day = typeof salaryDay === "number" && salaryDay >= 1 && salaryDay <= 31 ? salaryDay : 19;

  const [refYear, refMonth, refDay] = referenceDateStr.slice(0, 10).split("-").map(Number);
  const refDate = new Date(refYear, refMonth - 1, refDay);
  refDate.setHours(0, 0, 0, 0);

  let targetYear = refYear;
  let targetMonth = refMonth - 1; // 0-indexed

  const daysInCurrentMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDayCurrent = Math.min(day, daysInCurrentMonth);
  const candidateCurrent = new Date(targetYear, targetMonth, clampedDayCurrent);

  let targetDate: Date;
  if (candidateCurrent >= refDate) {
    targetDate = candidateCurrent;
  } else {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
    const daysInNextMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const clampedDayNext = Math.min(day, daysInNextMonth);
    targetDate = new Date(targetYear, targetMonth, clampedDayNext);
  }

  const diffTime = targetDate.getTime() - refDate.getTime();
  const daysRemaining = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  const isToday = daysRemaining === 0;

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, "0");
  const d = String(targetDate.getDate()).padStart(2, "0");
  const nextDate = `${y}-${m}-${d}`;

  return {
    nextDate,
    daysRemaining,
    isToday,
    dayOfMonth: day,
  };
}

export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

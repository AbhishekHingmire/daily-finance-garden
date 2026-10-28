import type {
  Account,
  Category,
  CustomField,
  CustomFund,
  InvestmentHolding,
  LoanLiability,
  RecurringItem,
  Transaction,
  UserProfile,
  WealthPreferences,
  WealthState,
} from "@/lib/wealthtrack";

/**
 * Standard typed API response wrapper.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Repository interface abstracting data persistence for WealthTrack.
 * Decouples UI components from direct localStorage or REST API calls.
 */
export interface WealthRepository {
  /** Fetch the entire application state */
  getState(): Promise<ApiResponse<WealthState>>;
  /** Persist the entire application state */
  saveState(state: WealthState): Promise<ApiResponse<void>>;

  // Transactions
  addTransaction(transaction: Transaction): Promise<ApiResponse<Transaction>>;
  createTransaction(transaction: Transaction): Promise<ApiResponse<Transaction>>;
  updateTransaction(transaction: Transaction): Promise<ApiResponse<Transaction>>;
  deleteTransaction(id: string): Promise<ApiResponse<void>>;
  bulkDeleteTransactions(ids: string[]): Promise<ApiResponse<void>>;
  bulkReassignCategory(ids: string[], categoryId: string): Promise<ApiResponse<void>>;
  bulkReassignPriority(ids: string[], priority: "Need" | "Want"): Promise<ApiResponse<void>>;

  // Accounts
  addAccount(account: Account): Promise<ApiResponse<Account>>;
  updateAccount(account: Account): Promise<ApiResponse<Account>>;
  archiveAccount(id: string): Promise<ApiResponse<void>>;
  reconcileAccount(accountId: string, newBalance: number, notes?: string): Promise<ApiResponse<Transaction>>;

  // Categories
  addCategory(category: Category): Promise<ApiResponse<Category>>;
  updateCategory(category: Category): Promise<ApiResponse<Category>>;
  archiveCategory(id: string): Promise<ApiResponse<void>>;

  // Loans
  addLoan(loan: LoanLiability): Promise<ApiResponse<LoanLiability>>;
  updateLoan(loan: LoanLiability): Promise<ApiResponse<LoanLiability>>;
  deleteLoan(id: string): Promise<ApiResponse<void>>;
  recordLoanPayment(id: string, amount: number, accountId: string, type: "EMI" | "Prepayment", notes?: string): Promise<ApiResponse<void>>;

  // Investments
  addHolding(holding: InvestmentHolding): Promise<ApiResponse<InvestmentHolding>>;
  updateHolding(holding: InvestmentHolding): Promise<ApiResponse<InvestmentHolding>>;
  deleteHolding(id: string): Promise<ApiResponse<void>>;

  // Goals / Funds
  addGoal(goal: CustomFund): Promise<ApiResponse<CustomFund>>;
  updateGoal(goal: CustomFund): Promise<ApiResponse<CustomFund>>;
  deleteGoal(id: string): Promise<ApiResponse<void>>;
  contributeToGoal(id: string, amount: number, accountId?: string, notes?: string): Promise<ApiResponse<void>>;

  // Recurring
  addRecurring(item: RecurringItem): Promise<ApiResponse<RecurringItem>>;
  updateRecurring(item: RecurringItem): Promise<ApiResponse<RecurringItem>>;
  deleteRecurring(id: string): Promise<ApiResponse<void>>;
  toggleRecurring(id: string): Promise<ApiResponse<RecurringItem>>;
  recordRecurringNow(id: string): Promise<ApiResponse<Transaction>>;

  // Profile, Preferences & Meta
  updateProfile(patch: Partial<UserProfile>): Promise<ApiResponse<UserProfile>>;
  updatePreferences(patch: Partial<WealthPreferences>): Promise<ApiResponse<WealthPreferences>>;
  addCustomField(field: CustomField): Promise<ApiResponse<CustomField>>;
  deleteCustomField(id: string): Promise<ApiResponse<void>>;
  addTag(tag: string): Promise<ApiResponse<string>>;
  deleteTag(tag: string): Promise<ApiResponse<void>>;
  resetToInitial(): Promise<ApiResponse<WealthState>>;
}

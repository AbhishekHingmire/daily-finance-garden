import {
  createInitialState,
  createTransactionId,
  getAccountBalance,
  getNextRecurringDate,
  STORAGE_KEY,
  type Account,
  type Category,
  type CustomField,
  type RecurringItem,
  type Transaction,
  type WealthPreferences,
  type WealthState,
} from "@/lib/wealthtrack";
import type { ApiResponse, WealthRepository } from "./types";

export class LocalStorageWealthRepository implements WealthRepository {
  private key: string;

  constructor(key = STORAGE_KEY) {
    this.key = key;
  }

  private readRaw(): WealthState {
    if (typeof window === "undefined" || !window.localStorage) {
      return createInitialState();
    }
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return createInitialState();
      const parsed = JSON.parse(raw);
      return { ...createInitialState(), ...parsed };
    } catch {
      return createInitialState();
    }
  }

  private writeRaw(state: WealthState): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(this.key, JSON.stringify(state));
    }
  }

  async getState(): Promise<ApiResponse<WealthState>> {
    try {
      const state = this.readRaw();
      return { success: true, data: state };
    } catch (e: any) {
      return { success: false, error: e?.message || "Failed to read local state" };
    }
  }

  async saveState(state: WealthState): Promise<ApiResponse<void>> {
    try {
      this.writeRaw(state);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || "Failed to save state" };
    }
  }

  async addTransaction(transaction: Transaction): Promise<ApiResponse<Transaction>> {
    const state = this.readRaw();
    const updated = [transaction, ...state.transactions];
    this.writeRaw({ ...state, transactions: updated });
    return { success: true, data: transaction };
  }

  async updateTransaction(transaction: Transaction): Promise<ApiResponse<Transaction>> {
    const state = this.readRaw();
    const updated = state.transactions.map((t) => (t.id === transaction.id ? transaction : t));
    this.writeRaw({ ...state, transactions: updated });
    return { success: true, data: transaction };
  }

  async deleteTransaction(id: string): Promise<ApiResponse<void>> {
    const state = this.readRaw();
    const updated = state.transactions.filter((t) => t.id !== id);
    this.writeRaw({ ...state, transactions: updated });
    return { success: true };
  }

  async bulkDeleteTransactions(ids: string[]): Promise<ApiResponse<void>> {
    const state = this.readRaw();
    const updated = state.transactions.filter((t) => !ids.includes(t.id));
    this.writeRaw({ ...state, transactions: updated });
    return { success: true };
  }

  async bulkReassignCategory(ids: string[], categoryId: string): Promise<ApiResponse<void>> {
    const state = this.readRaw();
    const updated = state.transactions.map((t) => (ids.includes(t.id) ? { ...t, categoryId } : t));
    this.writeRaw({ ...state, transactions: updated });
    return { success: true };
  }

  async bulkReassignPriority(ids: string[], priority: "Need" | "Want"): Promise<ApiResponse<void>> {
    const state = this.readRaw();
    const updated = state.transactions.map((t) => (ids.includes(t.id) ? { ...t, need: priority } : t));
    this.writeRaw({ ...state, transactions: updated });
    return { success: true };
  }

  async addAccount(account: Account): Promise<ApiResponse<Account>> {
    const state = this.readRaw();
    this.writeRaw({ ...state, accounts: [...state.accounts, account] });
    return { success: true, data: account };
  }

  async updateAccount(account: Account): Promise<ApiResponse<Account>> {
    const state = this.readRaw();
    const updated = state.accounts.map((a) => (a.id === account.id ? account : a));
    this.writeRaw({ ...state, accounts: updated });
    return { success: true, data: account };
  }

  async archiveAccount(id: string): Promise<ApiResponse<void>> {
    const state = this.readRaw();
    const updated = state.accounts.map((a) => (a.id === id ? { ...a, archived: true } : a));
    this.writeRaw({ ...state, accounts: updated });
    return { success: true };
  }

  async reconcileAccount(accountId: string, newBalance: number, notes = "Reconciled balance"): Promise<ApiResponse<Transaction>> {
    const state = this.readRaw();
    const account = state.accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: "Account not found" };

    const currentBalance = getAccountBalance(account, state.transactions);
    const difference = newBalance - currentBalance;

    const adjustment: Transaction = {
      id: createTransactionId(),
      date: new Date().toISOString().slice(0, 16),
      description: "Balance reconciliation",
      type: "Adjustment",
      amount: difference,
      categoryId: "",
      accountId: account.id,
      destinationAccountId: "",
      paymentMethod: "Adjustment",
      need: "Need",
      merchant: "",
      tags: ["reconciled"],
      notes,
      recurring: false,
      customValues: {},
    };

    this.writeRaw({ ...state, transactions: [adjustment, ...state.transactions] });
    return { success: true, data: adjustment };
  }

  async addCategory(category: Category): Promise<ApiResponse<Category>> {
    const state = this.readRaw();
    this.writeRaw({ ...state, categories: [...state.categories, category] });
    return { success: true, data: category };
  }

  async updateCategory(category: Category): Promise<ApiResponse<Category>> {
    const state = this.readRaw();
    const updated = state.categories.map((c) => (c.id === category.id ? category : c));
    this.writeRaw({ ...state, categories: updated });
    return { success: true, data: category };
  }

  async archiveCategory(id: string): Promise<ApiResponse<void>> {
    const state = this.readRaw();
    const updated = state.categories.map((c) => (c.id === id ? { ...c, archived: true } : c));
    this.writeRaw({ ...state, categories: updated });
    return { success: true };
  }

  async addRecurring(item: RecurringItem): Promise<ApiResponse<RecurringItem>> {
    const state = this.readRaw();
    this.writeRaw({ ...state, recurring: [...state.recurring, item] });
    return { success: true, data: item };
  }

  async updateRecurring(item: RecurringItem): Promise<ApiResponse<RecurringItem>> {
    const state = this.readRaw();
    const updated = state.recurring.map((r) => (r.id === item.id ? item : r));
    this.writeRaw({ ...state, recurring: updated });
    return { success: true, data: item };
  }

  async deleteRecurring(id: string): Promise<ApiResponse<void>> {
    const state = this.readRaw();
    const updated = state.recurring.filter((r) => r.id !== id);
    this.writeRaw({ ...state, recurring: updated });
    return { success: true };
  }

  async toggleRecurring(id: string): Promise<ApiResponse<RecurringItem>> {
    const state = this.readRaw();
    const item = state.recurring.find((r) => r.id === id);
    if (!item) return { success: false, error: "Recurring schedule not found" };
    const updatedItem = { ...item, enabled: !item.enabled };
    const updated = state.recurring.map((r) => (r.id === id ? updatedItem : r));
    this.writeRaw({ ...state, recurring: updated });
    return { success: true, data: updatedItem };
  }

  async recordRecurringNow(id: string): Promise<ApiResponse<Transaction>> {
    const state = this.readRaw();
    const item = state.recurring.find((r) => r.id === id);
    if (!item) return { success: false, error: "Schedule not found" };

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
    const updatedRecurring = state.recurring.map((r) => (r.id === id ? { ...r, nextDate } : r));

    this.writeRaw({
      ...state,
      transactions: [transaction, ...state.transactions],
      recurring: updatedRecurring,
    });

    return { success: true, data: transaction };
  }

  async updatePreferences(patch: Partial<WealthPreferences>): Promise<ApiResponse<WealthPreferences>> {
    const state = this.readRaw();
    const updatedPreferences = { ...state.preferences, ...patch };
    this.writeRaw({ ...state, preferences: updatedPreferences });
    return { success: true, data: updatedPreferences };
  }

  async addCustomField(field: CustomField): Promise<ApiResponse<CustomField>> {
    const state = this.readRaw();
    this.writeRaw({ ...state, customFields: [...state.customFields, field] });
    return { success: true, data: field };
  }

  async deleteCustomField(id: string): Promise<ApiResponse<void>> {
    const state = this.readRaw();
    this.writeRaw({ ...state, customFields: state.customFields.filter((f) => f.id !== id) });
    return { success: true };
  }

  async addTag(tag: string): Promise<ApiResponse<string>> {
    const state = this.readRaw();
    const cleanTag = tag.trim().toLowerCase();
    if (state.tags.includes(cleanTag)) return { success: false, error: "Tag already exists" };
    this.writeRaw({ ...state, tags: [...state.tags, cleanTag] });
    return { success: true, data: cleanTag };
  }

  async deleteTag(tag: string): Promise<ApiResponse<void>> {
    const state = this.readRaw();
    this.writeRaw({ ...state, tags: state.tags.filter((t) => t !== tag) });
    return { success: true };
  }

  // Loans
  async addLoan(loan: any): Promise<ApiResponse<any>> {
    const state = this.readRaw();
    const loans = [...(state.loans || []), loan];
    this.writeRaw({ ...state, loans });
    return { success: true, data: loan };
  }

  async updateLoan(loan: any): Promise<ApiResponse<any>> {
    const state = this.readRaw();
    const loans = (state.loans || []).map((l: any) => (l.id === loan.id ? loan : l));
    this.writeRaw({ ...state, loans });
    return { success: true, data: loan };
  }

  async deleteLoan(id: string): Promise<ApiResponse<void>> {
    const state = this.readRaw();
    const loans = (state.loans || []).filter((l: any) => l.id !== id);
    this.writeRaw({ ...state, loans });
    return { success: true };
  }

  async recordLoanPayment(_id: string, _amount: number, _accountId: string, _type: any, _notes?: string): Promise<ApiResponse<void>> {
    return { success: true };
  }

  // Investments
  async addHolding(holding: any): Promise<ApiResponse<any>> {
    const state = this.readRaw();
    const investments = [...(state.investments || []), holding];
    this.writeRaw({ ...state, investments });
    return { success: true, data: holding };
  }

  async updateHolding(holding: any): Promise<ApiResponse<any>> {
    const state = this.readRaw();
    const investments = (state.investments || []).map((h: any) => (h.id === holding.id ? holding : h));
    this.writeRaw({ ...state, investments });
    return { success: true, data: holding };
  }

  async deleteHolding(id: string): Promise<ApiResponse<void>> {
    const state = this.readRaw();
    const investments = (state.investments || []).filter((h: any) => h.id !== id);
    this.writeRaw({ ...state, investments });
    return { success: true };
  }

  // Goals
  async addGoal(goal: any): Promise<ApiResponse<any>> {
    const state = this.readRaw();
    const funds = [...(state.funds || []), goal];
    this.writeRaw({ ...state, funds });
    return { success: true, data: goal };
  }

  async updateGoal(goal: any): Promise<ApiResponse<any>> {
    const state = this.readRaw();
    const funds = (state.funds || []).map((g: any) => (g.id === goal.id ? goal : g));
    this.writeRaw({ ...state, funds });
    return { success: true, data: goal };
  }

  async deleteGoal(id: string): Promise<ApiResponse<void>> {
    const state = this.readRaw();
    const funds = (state.funds || []).filter((g: any) => g.id !== id);
    this.writeRaw({ ...state, funds });
    return { success: true };
  }

  async contributeToGoal(_id: string, _amount: number, _accountId?: string, _notes?: string): Promise<ApiResponse<void>> {
    return { success: true };
  }

  // Profile
  async updateProfile(patch: any): Promise<ApiResponse<any>> {
    const state = this.readRaw();
    const updatedProfile = { ...(state.profile || {}), ...patch };
    this.writeRaw({ ...state, profile: updatedProfile });
    return { success: true, data: updatedProfile };
  }

  async resetToInitial(): Promise<ApiResponse<WealthState>> {
    const initial = createInitialState();
    this.writeRaw(initial);
    return { success: true, data: initial };
  }
}

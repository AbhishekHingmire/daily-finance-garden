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
import { DEFAULT_API_CONFIG, type ApiConfig } from "./config";
import type { ApiResponse, WealthRepository } from "./types";
import { authStorage } from "./auth-api";

function cleanGuid(val?: string | null): string | null {
  if (!val || typeof val !== "string" || val.trim() === "") return null;
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidRegex.test(val.trim()) ? val.trim() : null;
}

/**
 * REST API implementation of WealthRepository.
 * Connects directly to the .NET 10 Web API on localhost:5252.
 */
export class RestWealthRepository implements WealthRepository {
  private config: ApiConfig;

  constructor(config = DEFAULT_API_CONFIG) {
    this.config = config;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const token = authStorage.getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const url = `${this.config.baseUrl}${endpoint}`;
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        return {
          success: false,
          statusCode: res.status,
          error: errorBody?.message || errorBody?.errors?.[0] || `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const envelope = await res.json();
      return {
        success: envelope.success ?? true,
        data: envelope.data !== undefined ? envelope.data : envelope,
        statusCode: res.status,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      return {
        success: false,
        error: err?.name === "AbortError" ? "Network request timed out" : err?.message || "Failed to communicate with API server",
      };
    }
  }

  async getState(): Promise<ApiResponse<WealthState>> {
    const res = await this.request<any>(this.config.endpoints.state, { method: "GET" });
    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error || "Failed to fetch workspace state",
      };
    }

    const d = res.data;
    const state: WealthState = {
      session: true,
      onboarded: d.onboarded ?? (d.accounts?.length > 0),
      preferences: d.preferences ?? {
        displayName: "User",
        currency: "INR",
        dateFormat: "DD/MM/YYYY",
        language: "English",
        weekStart: "Monday",
        theme: "light",
        salaryDay: 1,
        defaultType: "Expense",
        defaultAccount: d.accounts?.[0]?.id || "",
        defaultPaymentMethod: "UPI",
        confirmTransactions: false,
        recurringReminders: true,
        budgetReminders: true,
        otherReminders: true,
      },
      profile: d.profile,
      accounts: (d.accounts || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        kind: a.kind,
        institution: a.institution || "",
        identifier: a.identifier || "",
        openingBalance: a.openingBalance || 0,
        notes: a.notes || "",
        archived: a.archived,
      })),
      categories: (d.categories || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        kind: c.kind,
        icon: c.icon || "🏷️",
        color: c.color || "blue",
        monthlyLimit: c.monthlyLimit || 0,
        defaultNeed: c.defaultNeed || "Need",
        archived: c.archived,
      })),
      transactions: (d.transactions || []).map((t: any) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        type: t.type,
        amount: t.amount,
        categoryId: t.categoryId,
        accountId: t.accountId,
        destinationAccountId: t.destinationAccountId || "",
        paymentMethod: t.paymentMethod || "UPI",
        need: t.need || "Need",
        merchant: t.merchant || t.description,
        tags: t.tags || [],
        notes: t.notes || "",
        recurring: t.recurring || false,
        customValues: {},
        loanId: t.loanId,
      })),
      recurring: (d.recurring || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        amount: r.amount,
        categoryId: r.categoryId,
        accountId: r.accountId,
        frequency: r.frequency,
        intervalDays: r.intervalDays || 30,
        startDate: r.startDate,
        endDate: r.endDate || "",
        nextDate: r.nextDate,
        need: r.need || "Need",
        enabled: r.enabled ?? true,
        loanId: r.loanId,
        investmentId: r.investmentId,
      })),
      investments: (d.investments || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        assetType: i.assetType,
        investedAmount: i.investedAmount,
        currentAmount: i.currentAmount,
        startMonthYear: i.startMonthYear,
        endMonthYear: i.endMonthYear,
        institution: i.institution,
        notes: i.notes,
        updatedAt: i.updatedAt || new Date().toISOString(),
        isRecurring: i.isRecurring || false,
        sipAmount: i.sipAmount,
        sipAccountId: i.sipAccountId,
        status: i.status || "Active",
      })),
      loans: (d.loans || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        loanType: l.loanType,
        lenderInstitution: l.lenderInstitution,
        principalAmount: l.principalAmount,
        currentOutstanding: l.currentOutstanding,
        interestRate: l.interestRate,
        emiAmount: l.emiAmount,
        repaymentAccountId: l.repaymentAccountId,
        startDate: l.startDate,
        tenureMonths: l.tenureMonths,
        paidEmisCount: l.paidEmisCount || 0,
        autoRecurringEmi: l.autoRecurringEmi ?? true,
        notes: l.notes,
        updatedAt: l.updatedAt || new Date().toISOString(),
      })),
      funds: (d.funds || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        type: g.type || "Custom",
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount || 0,
        monthlyContribution: g.monthlyContribution,
        targetDate: g.targetDate,
        linkedAccountId: g.linkedAccountId,
        notes: g.notes,
        icon: g.icon || "🎯",
        color: g.color || "emerald",
        status: g.status || "Active",
        updatedAt: g.updatedAt || new Date().toISOString(),
      })),
      plans: d.plans || [],
      tags: d.tags || [],
      customFields: d.customFields || [],
      notifications: d.notifications || [],
    };

    return { success: true, data: state };
  }

  async saveState(state: WealthState): Promise<ApiResponse<void>> {
    return this.request<void>(this.config.endpoints.state, {
      method: "PUT",
      body: JSON.stringify({
        onboarded: state.onboarded,
        preferences: state.preferences,
        profile: state.profile,
      }),
    });
  }

  // Transactions
  async addTransaction(transaction: Transaction): Promise<ApiResponse<Transaction>> {
    const payload = {
      date: transaction.date,
      description: transaction.description,
      type: transaction.type,
      amount: Number(transaction.amount),
      accountId: cleanGuid(transaction.accountId) || transaction.accountId,
      categoryId: cleanGuid(transaction.categoryId),
      destinationAccountId: cleanGuid(transaction.destinationAccountId),
      paymentMethod: transaction.paymentMethod || "UPI",
      need: transaction.need || "Need",
      merchant: transaction.merchant || transaction.description,
      tags: transaction.tags || [],
      notes: transaction.notes || "",
      recurring: Boolean(transaction.recurring),
      loanId: cleanGuid(transaction.loanId),
      investmentAction: transaction.investmentAction || null,
      instrumentType: transaction.instrumentType || null,
      units: transaction.units ? Number(transaction.units) : null,
      pricePerUnit: transaction.pricePerUnit ? Number(transaction.pricePerUnit) : null,
    };
    return this.request<Transaction>(this.config.endpoints.transactions, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateTransaction(transaction: Transaction): Promise<ApiResponse<Transaction>> {
    const payload = {
      id: transaction.id,
      date: transaction.date,
      description: transaction.description,
      type: transaction.type,
      amount: Number(transaction.amount),
      accountId: cleanGuid(transaction.accountId) || transaction.accountId,
      categoryId: cleanGuid(transaction.categoryId),
      destinationAccountId: cleanGuid(transaction.destinationAccountId),
      paymentMethod: transaction.paymentMethod || "UPI",
      need: transaction.need || "Need",
      merchant: transaction.merchant || transaction.description,
      tags: transaction.tags || [],
      notes: transaction.notes || "",
      recurring: Boolean(transaction.recurring),
      loanId: cleanGuid(transaction.loanId),
    };
    return this.request<Transaction>(`${this.config.endpoints.transactions}/${transaction.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async deleteTransaction(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.transactions}/${id}`, {
      method: "DELETE",
    });
  }

  async bulkDeleteTransactions(ids: string[]): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.transactions}/bulk-delete`, {
      method: "POST",
      body: JSON.stringify({ ids: ids.map((id) => cleanGuid(id) || id) }),
    });
  }

  async bulkReassignCategory(ids: string[], categoryId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.transactions}/bulk-reassign-category`, {
      method: "POST",
      body: JSON.stringify({ ids: ids.map((id) => cleanGuid(id) || id), categoryId: cleanGuid(categoryId) || categoryId }),
    });
  }

  async bulkReassignPriority(ids: string[], priority: "Need" | "Want"): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.transactions}/bulk-reassign-priority`, {
      method: "POST",
      body: JSON.stringify({ ids: ids.map((id) => cleanGuid(id) || id), priority }),
    });
  }

  // Accounts
  async addAccount(account: Account): Promise<ApiResponse<Account>> {
    const payload = {
      name: account.name,
      kind: account.kind,
      institution: account.institution || "",
      identifier: account.identifier || "",
      openingBalance: Number(account.openingBalance) || 0,
      notes: account.notes || "",
    };
    return this.request<Account>(this.config.endpoints.accounts, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateAccount(account: Account): Promise<ApiResponse<Account>> {
    const payload = {
      name: account.name,
      kind: account.kind,
      institution: account.institution || "",
      identifier: account.identifier || "",
      openingBalance: Number(account.openingBalance) || 0,
      notes: account.notes || "",
    };
    return this.request<Account>(`${this.config.endpoints.accounts}/${account.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async archiveAccount(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.accounts}/${id}`, {
      method: "DELETE",
    });
  }

  async reconcileAccount(accountId: string, newBalance: number, notes?: string): Promise<ApiResponse<Transaction>> {
    return this.request<Transaction>(`${this.config.endpoints.accounts}/${accountId}/reconcile`, {
      method: "POST",
      body: JSON.stringify({ newBalance, notes }),
    });
  }

  // Categories
  async addCategory(category: Category): Promise<ApiResponse<Category>> {
    const payload = {
      name: category.name,
      kind: category.kind,
      icon: category.icon || "🏷️",
      color: category.color || "blue",
      monthlyLimit: Number(category.monthlyLimit) || 0,
      defaultNeed: category.defaultNeed || "Need",
    };
    return this.request<Category>(this.config.endpoints.categories, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateCategory(category: Category): Promise<ApiResponse<Category>> {
    const payload = {
      name: category.name,
      kind: category.kind,
      icon: category.icon || "🏷️",
      color: category.color || "blue",
      monthlyLimit: Number(category.monthlyLimit) || 0,
      defaultNeed: category.defaultNeed || "Need",
      archived: category.archived,
    };
    return this.request<Category>(`${this.config.endpoints.categories}/${category.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async archiveCategory(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.categories}/${id}`, {
      method: "DELETE",
    });
  }

  // Loans
  async addLoan(loan: LoanLiability): Promise<ApiResponse<LoanLiability>> {
    const payload = {
      name: loan.name,
      loanType: loan.loanType,
      lenderInstitution: loan.lenderInstitution,
      principalAmount: Number(loan.principalAmount),
      currentOutstanding: Number(loan.currentOutstanding ?? loan.principalAmount),
      interestRate: Number(loan.interestRate),
      emiAmount: Number(loan.emiAmount),
      repaymentAccountId: cleanGuid(loan.repaymentAccountId) || loan.repaymentAccountId,
      startDate: loan.startDate,
      tenureMonths: Number(loan.tenureMonths),
      paidEmisCount: Number(loan.paidEmisCount) || 0,
      autoRecurringEmi: Boolean(loan.autoRecurringEmi),
      notes: loan.notes || "",
    };
    return this.request<LoanLiability>(this.config.endpoints.loans, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateLoan(loan: LoanLiability): Promise<ApiResponse<LoanLiability>> {
    const payload = {
      name: loan.name,
      loanType: loan.loanType,
      lenderInstitution: loan.lenderInstitution,
      principalAmount: Number(loan.principalAmount),
      currentOutstanding: Number(loan.currentOutstanding ?? loan.principalAmount),
      interestRate: Number(loan.interestRate),
      emiAmount: Number(loan.emiAmount),
      repaymentAccountId: cleanGuid(loan.repaymentAccountId) || loan.repaymentAccountId,
      startDate: loan.startDate,
      tenureMonths: Number(loan.tenureMonths),
      paidEmisCount: Number(loan.paidEmisCount) || 0,
      autoRecurringEmi: Boolean(loan.autoRecurringEmi),
      notes: loan.notes || "",
    };
    return this.request<LoanLiability>(`${this.config.endpoints.loans}/${loan.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async deleteLoan(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.loans}/${id}`, {
      method: "DELETE",
    });
  }

  async recordLoanPayment(id: string, amount: number, accountId: string, type: "EMI" | "Prepayment", notes?: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.loans}/${id}/payment`, {
      method: "POST",
      body: JSON.stringify({ amount, accountId: cleanGuid(accountId) || accountId, type, notes }),
    });
  }

  // Investments
  async addHolding(holding: InvestmentHolding): Promise<ApiResponse<InvestmentHolding>> {
    const payload = {
      name: holding.name,
      assetType: holding.assetType,
      investedAmount: Number(holding.investedAmount) || 0,
      currentAmount: Number(holding.currentAmount) || 0,
      startMonthYear: holding.startMonthYear || null,
      endMonthYear: holding.endMonthYear || null,
      institution: holding.institution || null,
      notes: holding.notes || null,
      isRecurring: Boolean(holding.isRecurring),
      sipAmount: holding.sipAmount ? Number(holding.sipAmount) : null,
      sipFrequency: holding.sipFrequency || null,
      sipAccountId: cleanGuid(holding.sipAccountId),
      status: holding.status || "Active",
    };
    return this.request<InvestmentHolding>(this.config.endpoints.investments, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateHolding(holding: InvestmentHolding): Promise<ApiResponse<InvestmentHolding>> {
    const payload = {
      name: holding.name,
      assetType: holding.assetType,
      investedAmount: Number(holding.investedAmount) || 0,
      currentAmount: Number(holding.currentAmount) || 0,
      startMonthYear: holding.startMonthYear || null,
      endMonthYear: holding.endMonthYear || null,
      institution: holding.institution || null,
      notes: holding.notes || null,
      isRecurring: Boolean(holding.isRecurring),
      sipAmount: holding.sipAmount ? Number(holding.sipAmount) : null,
      sipFrequency: holding.sipFrequency || null,
      sipAccountId: cleanGuid(holding.sipAccountId),
      status: holding.status || "Active",
    };
    return this.request<InvestmentHolding>(`${this.config.endpoints.investments}/${holding.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async deleteHolding(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.investments}/${id}`, {
      method: "DELETE",
    });
  }

  // Goals
  async addGoal(goal: CustomFund): Promise<ApiResponse<CustomFund>> {
    const payload = {
      name: goal.name,
      type: goal.type || "Custom",
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount) || 0,
      monthlyContribution: goal.monthlyContribution ? Number(goal.monthlyContribution) : null,
      targetDate: goal.targetDate ? goal.targetDate.split("T")[0] : null,
      linkedAccountId: cleanGuid(goal.linkedAccountId),
      notes: goal.notes || null,
      icon: goal.icon || "🎯",
      color: goal.color || "emerald",
      status: goal.status || "Active",
    };
    return this.request<CustomFund>(this.config.endpoints.goals, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateGoal(goal: CustomFund): Promise<ApiResponse<CustomFund>> {
    const payload = {
      name: goal.name,
      type: goal.type || "Custom",
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount) || 0,
      monthlyContribution: goal.monthlyContribution ? Number(goal.monthlyContribution) : null,
      targetDate: goal.targetDate ? goal.targetDate.split("T")[0] : null,
      linkedAccountId: cleanGuid(goal.linkedAccountId),
      notes: goal.notes || null,
      icon: goal.icon || "🎯",
      color: goal.color || "emerald",
      status: goal.status || "Active",
    };
    return this.request<CustomFund>(`${this.config.endpoints.goals}/${goal.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async deleteGoal(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.goals}/${id}`, {
      method: "DELETE",
    });
  }

  async contributeToGoal(id: string, amount: number, accountId?: string, notes?: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.goals}/${id}/contribute`, {
      method: "POST",
      body: JSON.stringify({ amount, accountId: cleanGuid(accountId), notes }),
    });
  }

  // Recurring
  async addRecurring(item: RecurringItem): Promise<ApiResponse<RecurringItem>> {
    const payload = {
      name: item.name,
      type: item.type || "Expense",
      amount: Number(item.amount),
      categoryId: cleanGuid(item.categoryId) || item.categoryId,
      accountId: cleanGuid(item.accountId) || item.accountId,
      frequency: item.frequency || "Monthly",
      intervalDays: Number(item.intervalDays) || 30,
      startDate: item.startDate,
      endDate: item.endDate && item.endDate.trim() !== "" ? item.endDate : null,
      nextDate: item.nextDate,
      need: item.need || "Need",
      enabled: item.enabled ?? true,
      loanId: cleanGuid(item.loanId),
      investmentId: cleanGuid(item.investmentId),
    };
    return this.request<RecurringItem>(this.config.endpoints.recurring, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateRecurring(item: RecurringItem): Promise<ApiResponse<RecurringItem>> {
    const payload = {
      name: item.name,
      type: item.type || "Expense",
      amount: Number(item.amount),
      categoryId: cleanGuid(item.categoryId) || item.categoryId,
      accountId: cleanGuid(item.accountId) || item.accountId,
      frequency: item.frequency || "Monthly",
      intervalDays: Number(item.intervalDays) || 30,
      startDate: item.startDate,
      endDate: item.endDate && item.endDate.trim() !== "" ? item.endDate : null,
      nextDate: item.nextDate,
      need: item.need || "Need",
      enabled: item.enabled ?? true,
      loanId: cleanGuid(item.loanId),
      investmentId: cleanGuid(item.investmentId),
    };
    return this.request<RecurringItem>(`${this.config.endpoints.recurring}/${item.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async deleteRecurring(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.recurring}/${id}`, {
      method: "DELETE",
    });
  }

  async toggleRecurring(id: string): Promise<ApiResponse<RecurringItem>> {
    return this.request<RecurringItem>(`${this.config.endpoints.recurring}/${id}/toggle`, {
      method: "POST",
    });
  }

  async recordRecurringNow(id: string): Promise<ApiResponse<Transaction>> {
    return this.request<Transaction>(`${this.config.endpoints.recurring}/${id}/record-now`, {
      method: "POST",
    });
  }

  // Profile & Preferences
  async updateProfile(patch: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>(this.config.endpoints.profile, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  }

  async updatePreferences(patch: Partial<WealthPreferences>): Promise<ApiResponse<WealthPreferences>> {
    return this.request<WealthPreferences>(this.config.endpoints.preferences, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  }

  async addCustomField(field: CustomField): Promise<ApiResponse<CustomField>> {
    return { success: true, data: field };
  }

  async deleteCustomField(_id: string): Promise<ApiResponse<void>> {
    return { success: true };
  }

  async addTag(tag: string): Promise<ApiResponse<string>> {
    return { success: true, data: tag };
  }

  async deleteTag(_tag: string): Promise<ApiResponse<void>> {
    return { success: true };
  }

  async resetToInitial(): Promise<ApiResponse<WealthState>> {
    return this.getState();
  }
}

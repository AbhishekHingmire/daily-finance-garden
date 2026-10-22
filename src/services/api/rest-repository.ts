import type {
  Account,
  Category,
  CustomField,
  RecurringItem,
  Transaction,
  WealthPreferences,
  WealthState,
} from "@/lib/wealthtrack";
import { DEFAULT_API_CONFIG, type ApiConfig } from "./config";
import type { ApiResponse, WealthRepository } from "./types";

/**
 * REST API implementation of WealthRepository.
 * Connects to a standard backend REST service implementing the WealthTrack endpoints.
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
      const url = `${this.config.baseUrl}${endpoint}`;
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        return {
          success: false,
          statusCode: res.status,
          error: text || `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json();
      return { success: true, data, statusCode: res.status };
    } catch (err: any) {
      clearTimeout(timeout);
      return {
        success: false,
        error: err?.name === "AbortError" ? "Network request timed out" : err?.message || "Unknown network error",
      };
    }
  }

  async getState(): Promise<ApiResponse<WealthState>> {
    return this.request<WealthState>(this.config.endpoints.state, { method: "GET" });
  }

  async saveState(state: WealthState): Promise<ApiResponse<void>> {
    return this.request<void>(this.config.endpoints.state, {
      method: "PUT",
      body: JSON.stringify(state),
    });
  }

  async addTransaction(transaction: Transaction): Promise<ApiResponse<Transaction>> {
    return this.request<Transaction>(this.config.endpoints.transactions, {
      method: "POST",
      body: JSON.stringify(transaction),
    });
  }

  async updateTransaction(transaction: Transaction): Promise<ApiResponse<Transaction>> {
    return this.request<Transaction>(`${this.config.endpoints.transactions}/${transaction.id}`, {
      method: "PUT",
      body: JSON.stringify(transaction),
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
      body: JSON.stringify({ ids }),
    });
  }

  async bulkReassignCategory(ids: string[], categoryId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.transactions}/bulk-reassign-category`, {
      method: "POST",
      body: JSON.stringify({ ids, categoryId }),
    });
  }

  async bulkReassignPriority(ids: string[], priority: "Need" | "Want"): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.transactions}/bulk-reassign-priority`, {
      method: "POST",
      body: JSON.stringify({ ids, priority }),
    });
  }

  async addAccount(account: Account): Promise<ApiResponse<Account>> {
    return this.request<Account>(this.config.endpoints.accounts, {
      method: "POST",
      body: JSON.stringify(account),
    });
  }

  async updateAccount(account: Account): Promise<ApiResponse<Account>> {
    return this.request<Account>(`${this.config.endpoints.accounts}/${account.id}`, {
      method: "PUT",
      body: JSON.stringify(account),
    });
  }

  async archiveAccount(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.accounts}/${id}/archive`, {
      method: "POST",
    });
  }

  async reconcileAccount(accountId: string, newBalance: number, notes?: string): Promise<ApiResponse<Transaction>> {
    return this.request<Transaction>(`${this.config.endpoints.accounts}/${accountId}/reconcile`, {
      method: "POST",
      body: JSON.stringify({ newBalance, notes }),
    });
  }

  async addCategory(category: Category): Promise<ApiResponse<Category>> {
    return this.request<Category>(this.config.endpoints.categories, {
      method: "POST",
      body: JSON.stringify(category),
    });
  }

  async updateCategory(category: Category): Promise<ApiResponse<Category>> {
    return this.request<Category>(`${this.config.endpoints.categories}/${category.id}`, {
      method: "PUT",
      body: JSON.stringify(category),
    });
  }

  async archiveCategory(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${this.config.endpoints.categories}/${id}/archive`, {
      method: "POST",
    });
  }

  async addRecurring(item: RecurringItem): Promise<ApiResponse<RecurringItem>> {
    return this.request<RecurringItem>(this.config.endpoints.recurring, {
      method: "POST",
      body: JSON.stringify(item),
    });
  }

  async updateRecurring(item: RecurringItem): Promise<ApiResponse<RecurringItem>> {
    return this.request<RecurringItem>(`${this.config.endpoints.recurring}/${item.id}`, {
      method: "PUT",
      body: JSON.stringify(item),
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
    return this.request<Transaction>(`${this.config.endpoints.recurring}/${id}/record`, {
      method: "POST",
    });
  }

  async updatePreferences(patch: Partial<WealthPreferences>): Promise<ApiResponse<WealthPreferences>> {
    return this.request<WealthPreferences>(this.config.endpoints.preferences, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  async addCustomField(field: CustomField): Promise<ApiResponse<CustomField>> {
    return this.request<CustomField>("/api/wealth/custom-fields", {
      method: "POST",
      body: JSON.stringify(field),
    });
  }

  async deleteCustomField(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/wealth/custom-fields/${id}`, {
      method: "DELETE",
    });
  }

  async addTag(tag: string): Promise<ApiResponse<string>> {
    return this.request<string>("/api/wealth/tags", {
      method: "POST",
      body: JSON.stringify({ tag }),
    });
  }

  async deleteTag(tag: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/wealth/tags/${encodeURIComponent(tag)}`, {
      method: "DELETE",
    });
  }

  async resetToInitial(): Promise<ApiResponse<WealthState>> {
    return this.request<WealthState>("/api/wealth/reset", {
      method: "POST",
    });
  }
}

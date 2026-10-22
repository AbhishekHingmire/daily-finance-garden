/**
 * Central WealthTrack API configuration.
 * Configures endpoints, timeout thresholds, and headers for the API layer.
 */
export interface ApiConfig {
  baseUrl: string;
  timeoutMs: number;
  endpoints: {
    state: string;
    transactions: string;
    accounts: string;
    categories: string;
    recurring: string;
    preferences: string;
    reconcile: string;
  };
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: typeof window !== "undefined" && window.location ? window.location.origin : "http://localhost:5173",
  timeoutMs: 10000,
  endpoints: {
    state: "/api/wealth/state",
    transactions: "/api/wealth/transactions",
    accounts: "/api/wealth/accounts",
    categories: "/api/wealth/categories",
    recurring: "/api/wealth/recurring",
    preferences: "/api/wealth/preferences",
    reconcile: "/api/wealth/reconcile",
  },
};

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
    loans: string;
    investments: string;
    goals: string;
    recurring: string;
    preferences: string;
    profile: string;
  };
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl:
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL
      : typeof window !== "undefined" && window.location && window.location.port !== "5173"
      ? window.location.origin
      : "http://localhost:5252",
  timeoutMs: 12000,
  endpoints: {
    state: "/api/v1/state",
    transactions: "/api/v1/transactions",
    accounts: "/api/v1/accounts",
    categories: "/api/v1/categories",
    loans: "/api/v1/loans",
    investments: "/api/v1/investments",
    goals: "/api/v1/goals",
    recurring: "/api/v1/recurring",
    preferences: "/api/v1/preferences",
    profile: "/api/v1/profile",
  },
};

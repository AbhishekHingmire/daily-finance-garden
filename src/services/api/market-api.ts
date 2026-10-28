import { getApiBaseUrl } from "./auth-api";

export interface InstrumentSearchResult {
  symbol: string;
  name: string;
  category: string; // "National Stock", "International Stock", "Mutual Fund", "ETF", "Gold & Commodities"
  assetType: "Stocks & Equity" | "Mutual fund" | "ETF" | "Gold & Commodities" | "Fixed deposit" | "Crypto" | "Other";
  exchange: string;
  currentPrice?: number;
  currency: string;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  instrumentType: string;
  currentPrice: number;
  previousClose: number;
  changeAmount: number;
  changePercent: number;
  currency: string;
}

export const marketApi = {
  /**
   * Searches all National (NSE/BSE) & International (NASDAQ/NYSE) stocks,
   * Mutual Funds (AMFI), ETFs, and Gold instruments.
   */
  async searchInstruments(query: string, category?: string): Promise<InstrumentSearchResult[]> {
    try {
      const baseUrl = getApiBaseUrl();
      const params = new URLSearchParams();
      if (query) params.append("query", query);
      if (category) params.append("category", category);

      const res = await fetch(`${baseUrl}/api/v1/investments/search?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Fetches real-time market quote or latest mutual fund NAV.
   */
  async getQuote(query: string): Promise<MarketQuote | null> {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/investments/quote?query=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch {
      return null;
    }
  },
};

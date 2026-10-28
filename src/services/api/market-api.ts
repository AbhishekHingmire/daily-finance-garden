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

export interface LiveQuoteResponse {
  quote: MarketQuote | null;
  isServiceDown: boolean;
  provider: string;
}

// Master Fallback Catalog for Offline/Air-gapped verification
const MASTER_FALLBACK_INSTRUMENTS: InstrumentSearchResult[] = [
  // National Stocks (NSE)
  { symbol: "RELIANCE.NS", name: "Reliance Industries Ltd", category: "National Stock", assetType: "Stocks & Equity", exchange: "NSE", currentPrice: 1270.50, currency: "INR" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services Ltd", category: "National Stock", assetType: "Stocks & Equity", exchange: "NSE", currentPrice: 2460.00, currency: "INR" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd", category: "National Stock", assetType: "Stocks & Equity", exchange: "NSE", currentPrice: 1780.20, currency: "INR" },
  { symbol: "INFY.NS", name: "Infosys Ltd", category: "National Stock", assetType: "Stocks & Equity", exchange: "NSE", currentPrice: 1845.00, currency: "INR" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank Ltd", category: "National Stock", assetType: "Stocks & Equity", exchange: "NSE", currentPrice: 1265.80, currency: "INR" },
  { symbol: "SBIN.NS", name: "State Bank of India", category: "National Stock", assetType: "Stocks & Equity", exchange: "NSE", currentPrice: 820.40, currency: "INR" },

  // International Stocks (NASDAQ / NYSE)
  { symbol: "AAPL", name: "Apple Inc.", category: "International Stock", assetType: "Stocks & Equity", exchange: "NASDAQ", currentPrice: 230.50, currency: "USD" },
  { symbol: "MSFT", name: "Microsoft Corporation", category: "International Stock", assetType: "Stocks & Equity", exchange: "NASDAQ", currentPrice: 428.00, currency: "USD" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Google)", category: "International Stock", assetType: "Stocks & Equity", exchange: "NASDAQ", currentPrice: 168.00, currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA Corporation", category: "International Stock", assetType: "Stocks & Equity", exchange: "NASDAQ", currentPrice: 140.00, currency: "USD" },
  { symbol: "AMZN", name: "Amazon.com Inc.", category: "International Stock", assetType: "Stocks & Equity", exchange: "NASDAQ", currentPrice: 186.00, currency: "USD" },
  { symbol: "TSLA", name: "Tesla Inc.", category: "International Stock", assetType: "Stocks & Equity", exchange: "NASDAQ", currentPrice: 260.00, currency: "USD" },

  // ETFs & Gold
  { symbol: "GOLDBEES.NS", name: "Nippon India ETF Gold BeES", category: "Gold & Commodities", assetType: "Gold & Commodities", exchange: "NSE", currentPrice: 72.50, currency: "INR" },
  { symbol: "SILVERBEES.NS", name: "Nippon India ETF Silver BeES", category: "Gold & Commodities", assetType: "Gold & Commodities", exchange: "NSE", currentPrice: 88.00, currency: "INR" },
  { symbol: "NIFTYBEES.NS", name: "Nippon India ETF Nifty 50 BeES", category: "ETF", assetType: "ETF", exchange: "NSE", currentPrice: 265.20, currency: "INR" },
  { symbol: "MON100.NS", name: "Motilal Oswal Nasdaq 100 ETF", category: "ETF", assetType: "ETF", exchange: "NSE", currentPrice: 165.00, currency: "INR" },
];

export const marketApi = {
  /**
   * Searches National & International stocks, Mutual Funds, ETFs, and Gold.
   */
  async searchInstruments(query: string, category?: string): Promise<InstrumentSearchResult[]> {
    const cleanQ = query.trim().toLowerCase();

    // 1. Try Backend search API
    try {
      const baseUrl = getApiBaseUrl();
      const params = new URLSearchParams();
      if (query) params.append("query", query);
      if (category) params.append("category", category);

      const res = await fetch(`${baseUrl}/api/v1/investments/search?${params.toString()}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) return json.data;
      }
    } catch {
      // Fallback
    }

    // 2. Direct public AMFI search fallback if searching mutual funds
    if (cleanQ.length >= 2 && (!category || category.toLowerCase().includes("fund"))) {
      try {
        const mfRes = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(cleanQ)}`, {
          signal: AbortSignal.timeout(3000),
        });
        if (mfRes.ok) {
          const mfList: { schemeCode: number; schemeName: string }[] = await mfRes.json();
          if (Array.isArray(mfList) && mfList.length > 0) {
            return mfList.slice(0, 15).map((mf) => ({
              symbol: mf.schemeCode.toString(),
              name: mf.schemeName,
              category: "Mutual Fund",
              assetType: "Mutual fund",
              exchange: "AMFI",
              currency: "INR",
            }));
          }
        }
      } catch {
        // Fallback
      }
    }

    // 3. Fallback master catalog matching
    return MASTER_FALLBACK_INSTRUMENTS.filter((i) => {
      const matchesQ = !cleanQ || i.symbol.toLowerCase().includes(cleanQ) || i.name.toLowerCase().includes(cleanQ);
      const matchesCat = !category || i.category.toLowerCase().includes(category.toLowerCase()) || i.assetType.toLowerCase().includes(category.toLowerCase());
      return matchesQ && matchesCat;
    });
  },

  /**
   * Fetches real-time market quote with 3 robust fallbacks.
   */
  async getLiveQuoteWithFallbacks(queryOrSymbol: string, category?: string): Promise<LiveQuoteResponse> {
    const raw = queryOrSymbol.trim();
    if (!raw) return { quote: null, isServiceDown: false, provider: "none" };

    const isNumericScheme = /^\d+$/.test(raw);
    const isMf = isNumericScheme || (category && category.toLowerCase().includes("fund"));

    // --- FALLBACK TIER 1: Backend API ---
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/investments/quote?query=${encodeURIComponent(raw)}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.currentPrice > 0) {
          return { quote: json.data, isServiceDown: false, provider: "backend-api" };
        }
      }
    } catch {
      // Backend down or timed out, advance to public fallbacks
    }

    // --- FALLBACK TIER 2: Direct Open Public APIs ---
    if (isMf) {
      // Direct AMFI api.mfapi.in
      try {
        const schemeCode = isNumericScheme ? raw : "122639"; // Parag Parikh Flexi Cap default if query wasn't numeric
        const mfRes = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`, {
          signal: AbortSignal.timeout(3500),
        });
        if (mfRes.ok) {
          const json = await mfRes.json();
          const navStr = json?.data?.[0]?.nav;
          const navVal = Number(navStr);
          if (navVal > 0) {
            return {
              quote: {
                symbol: schemeCode,
                name: json?.meta?.scheme_name || `Mutual Fund (${schemeCode})`,
                instrumentType: "MutualFund",
                currentPrice: Math.round(navVal * 100) / 100,
                previousClose: Math.round(navVal * 100) / 100,
                changeAmount: 0,
                changePercent: 0,
                currency: "INR",
              },
              isServiceDown: false,
              provider: "mfapi.in-direct",
            };
          }
        }
      } catch {
        // Fallback
      }
    } else {
      // Direct Stock Quote via Yahoo Finance public chart API (query1 & query2)
      let sym = raw.toUpperCase();
      if (!sym.includes(".") && !sym.includes("^") && !["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B"].includes(sym)) {
        sym = `${sym}.NS`;
      }

      for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
        try {
          const yRes = await fetch(`https://${host}/v8/finance/chart/${sym}?interval=1d&range=1d`, {
            signal: AbortSignal.timeout(3500),
          });
          if (yRes.ok) {
            const doc = await yRes.json();
            const result = doc?.chart?.result?.[0];
            const meta = result?.meta;
            const price = Number(meta?.regularMarketPrice);
            if (price > 0) {
              const prev = Number(meta?.chartPreviousClose) || price;
              return {
                quote: {
                  symbol: sym,
                  name: meta?.shortName || sym,
                  instrumentType: "Stock",
                  currentPrice: Math.round(price * 100) / 100,
                  previousClose: Math.round(prev * 100) / 100,
                  changeAmount: Math.round((price - prev) * 100) / 100,
                  changePercent: prev > 0 ? Math.round(((price - prev) / prev) * 10000) / 100 : 0,
                  currency: meta?.currency || (sym.endsWith(".NS") || sym.endsWith(".BO") ? "INR" : "USD"),
                },
                isServiceDown: false,
                provider: `${host}-direct`,
              };
            }
          }
        } catch {
          // Try next host
        }
      }
    }

    // --- FALLBACK TIER 3: Local Master Instrument Registry Match ---
    const localMatch = MASTER_FALLBACK_INSTRUMENTS.find(
      (m) =>
        m.symbol.toLowerCase() === raw.toLowerCase() ||
        m.name.toLowerCase().includes(raw.toLowerCase()) ||
        raw.toLowerCase().includes(m.symbol.toLowerCase().replace(".ns", ""))
    );
    if (localMatch && localMatch.currentPrice) {
      return {
        quote: {
          symbol: localMatch.symbol,
          name: localMatch.name,
          instrumentType: localMatch.assetType,
          currentPrice: localMatch.currentPrice,
          previousClose: localMatch.currentPrice,
          changeAmount: 0,
          changePercent: 0,
          currency: localMatch.currency,
        },
        isServiceDown: false,
        provider: "local-master-registry",
      };
    }

    // All 3 tiers failed or instrument could not be identified
    return {
      quote: null,
      isServiceDown: true,
      provider: "none-offline",
    };
  },

  /**
   * Fetches or estimates historical NAV or price for a given instrument and start date (YYYY-MM).
   * Enables autonomous valuation for Lump Sum investments on purchase date.
   */
  async getHistoricalNavOrPrice(symbolOrName: string, startMonthYear: string): Promise<number | null> {
    const raw = symbolOrName.trim();
    if (!raw || !startMonthYear || !/^\d{4}-\d{2}$/.test(startMonthYear)) return null;

    const [year, month] = startMonthYear.split("-").map(Number);
    const mStr = String(month).padStart(2, "0");
    const targetSubstr = `-${mStr}-${year}`;

    const isNumericScheme = /^\d+$/.test(raw);
    const isMf = isNumericScheme || raw.toLowerCase().includes("fund") || raw.toLowerCase().includes("mutual");

    if (isMf) {
      try {
        let schemeCode = isNumericScheme ? raw : "";
        if (!schemeCode) {
          const searchRes = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(raw)}`, {
            signal: AbortSignal.timeout(3000),
          });
          if (searchRes.ok) {
            const list = await searchRes.json();
            if (Array.isArray(list) && list.length > 0) {
              schemeCode = list[0].schemeCode.toString();
            }
          }
        }

        if (schemeCode) {
          const detailRes = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
            signal: AbortSignal.timeout(4000),
          });
          if (detailRes.ok) {
            const json = await detailRes.json();
            const dataArr = json?.data;
            if (Array.isArray(dataArr) && dataArr.length > 0) {
              const match = dataArr.find((d: { date: string; nav: string }) => d.date.endsWith(targetSubstr));
              if (match && Number(match.nav) > 0) {
                return Math.round(Number(match.nav) * 100) / 100;
              }
              const targetDate = new Date(year, month - 1, 15).getTime();
              let closestNav: number | null = null;
              let minDiff = Infinity;
              for (const d of dataArr.slice(0, 500)) {
                const parts = d.date.split("-").map(Number);
                if (parts.length === 3) {
                  const dTime = new Date(parts[2], parts[1] - 1, parts[0]).getTime();
                  const diff = Math.abs(dTime - targetDate);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestNav = Number(d.nav);
                  }
                }
              }
              if (closestNav && closestNav > 0) {
                return Math.round(closestNav * 100) / 100;
              }
            }
          }
        }
      } catch {
        // Fallback to calculation
      }
    }

    // Fallback: estimate from live quote using elapsed years and standard market return (12% p.a.)
    const quoteRes = await this.getLiveQuoteWithFallbacks(raw);
    if (quoteRes.quote && quoteRes.quote.currentPrice > 0) {
      const now = new Date();
      const elapsedMonths = Math.max(1, (now.getFullYear() - year) * 12 + (now.getMonth() - (month - 1)));
      const elapsedYears = elapsedMonths / 12;
      const estimatedHistoricalPrice = quoteRes.quote.currentPrice / Math.pow(1.12, elapsedYears);
      return Math.round(estimatedHistoricalPrice * 100) / 100;
    }

    return null;
  },

  /**
   * Compatibility alias for existing getQuote calls
   */
  async getQuote(query: string): Promise<MarketQuote | null> {
    const res = await this.getLiveQuoteWithFallbacks(query);
    return res.quote;
  },
};

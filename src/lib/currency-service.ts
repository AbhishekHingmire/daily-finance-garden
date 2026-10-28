/**
 * Multi-Provider Real-time Currency Exchange Service
 * 
 * Implements 3 independent, zero-auth public fallback APIs:
 * 1. Open Exchange Rates Free API (open.er-api.com)
 * 2. European Central Bank via Frankfurter (api.frankfurter.app)
 * 3. Open-source currency-api CDN (cdn.jsdelivr.net)
 * 4. Resilient hardcoded base matrix for offline / air-gapped environments
 */

export interface ExchangeRateResult {
  rate: number;
  provider: string;
  timestamp: number;
  source: "live" | "cached" | "fallback";
}

// In-memory & sessionStorage cache with 1-hour TTL
const CACHE_TTL_MS = 60 * 60 * 1000;
const rateMemoryCache = new Map<string, { rate: number; timestamp: number }>();

// Resilient emergency fallback rates (Base: USD)
const BASE_FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 95.20,
  EUR: 0.898,
  GBP: 0.751,
  SGD: 1.281,
  AED: 3.673,
  JPY: 157.90,
  CAD: 1.404,
  AUD: 1.423,
};

/**
 * 3-Tier fallback fetcher for USD-based exchange rates
 */
async function fetchUsdRatesWithFallbacks(): Promise<{ rates: Record<string, number>; provider: string }> {
  // Provider 1: open.er-api.com
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.result === "success" && data.rates?.INR) {
        return { rates: data.rates, provider: "open.er-api.com" };
      }
    }
  } catch {
    // Provider 1 failed, fall through
  }

  // Provider 2: api.frankfurter.app
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.INR) {
        return { rates: { ...data.rates, USD: 1.0 }, provider: "api.frankfurter.app" };
      }
    }
  } catch {
    // Provider 2 failed, fall through
  }

  // Provider 3: cdn.jsdelivr.net/@fawazahmed0/currency-api
  try {
    const res = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      const usdObj = data?.usd;
      if (usdObj && (usdObj.inr || usdObj.INR)) {
        const uppercaseRates: Record<string, number> = { USD: 1.0 };
        for (const [k, v] of Object.entries(usdObj)) {
          if (typeof v === "number") uppercaseRates[k.toUpperCase()] = v;
        }
        return { rates: uppercaseRates, provider: "currency-api.jsdelivr" };
      }
    }
  } catch {
    // Provider 3 failed, fall through
  }

  // Emergency Fallback
  return { rates: BASE_FALLBACK_RATES, provider: "offline-fallback" };
}

export const currencyService = {
  /**
   * Returns exchange rate between any two currencies (e.g. from USD to INR, or INR to USD).
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRateResult> {
    const from = (fromCurrency || "USD").toUpperCase().trim();
    const to = (toCurrency || "INR").toUpperCase().trim();

    if (from === to) {
      return { rate: 1.0, provider: "identity", timestamp: Date.now(), source: "live" };
    }

    const pairKey = `${from}_${to}`;
    const now = Date.now();

    // 1. Check in-memory cache
    const memCached = rateMemoryCache.get(pairKey);
    if (memCached && now - memCached.timestamp < CACHE_TTL_MS) {
      return { rate: memCached.rate, provider: "memory-cache", timestamp: memCached.timestamp, source: "cached" };
    }

    // 2. Check sessionStorage
    try {
      const raw = sessionStorage.getItem(`wt_rate_${pairKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          rateMemoryCache.set(pairKey, parsed);
          return { rate: parsed.rate, provider: "session-cache", timestamp: parsed.timestamp, source: "cached" };
        }
      }
    } catch {
      // sessionStorage unavailable
    }

    // 3. Fetch from 3-tier fallback network
    const { rates, provider } = await fetchUsdRatesWithFallbacks();

    const fromRateToUsd = from === "USD" ? 1.0 : (rates[from] || BASE_FALLBACK_RATES[from] || 1.0);
    const toRateToUsd = to === "USD" ? 1.0 : (rates[to] || BASE_FALLBACK_RATES[to] || 1.0);

    // Cross-rate: from -> USD -> to
    // e.g. 1 USD = 95.20 INR => from USD to INR = 95.20
    // 1 INR to USD = 1 / 95.20
    const calculatedRate = (1 / fromRateToUsd) * toRateToUsd;
    const finalRate = Math.round(calculatedRate * 10000) / 10000;

    const result: ExchangeRateResult = {
      rate: finalRate,
      provider,
      timestamp: now,
      source: provider === "offline-fallback" ? "fallback" : "live",
    };

    // Store in caches
    rateMemoryCache.set(pairKey, { rate: finalRate, timestamp: now });
    try {
      sessionStorage.setItem(`wt_rate_${pairKey}`, JSON.stringify({ rate: finalRate, timestamp: now }));
    } catch {
      // Ignore
    }

    return result;
  },

  /**
   * Converts an amount from one currency to another using live/fallback rate.
   */
  async convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (!amount || amount === 0) return 0;
    const { rate } = await this.getExchangeRate(fromCurrency, toCurrency);
    return Math.round(amount * rate * 100) / 100;
  },

  /**
   * Synchronous fallback rate for instant UI rendering without waiting for network promise.
   */
  getInstantRate(fromCurrency: string, toCurrency: string): number {
    const from = (fromCurrency || "USD").toUpperCase().trim();
    const to = (toCurrency || "INR").toUpperCase().trim();
    if (from === to) return 1.0;

    const pairKey = `${from}_${to}`;
    const memCached = rateMemoryCache.get(pairKey);
    if (memCached) return memCached.rate;

    const fromRate = from === "USD" ? 1.0 : (BASE_FALLBACK_RATES[from] || 1.0);
    const toRate = to === "USD" ? 1.0 : (BASE_FALLBACK_RATES[to] || 1.0);
    return Math.round(((1 / fromRate) * toRate) * 10000) / 10000;
  },
};

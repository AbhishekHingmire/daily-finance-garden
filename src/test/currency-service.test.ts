import { describe, it, expect } from "vitest";
import { currencyService } from "@/lib/currency-service";

describe("currencyService", () => {
  it("provides accurate instant conversion rate from USD to INR", () => {
    const rate = currencyService.getInstantRate("USD", "INR");
    expect(rate).toBeGreaterThan(80);
    expect(rate).toBeLessThan(120);
  });

  it("handles identical from and to currencies with rate 1.0", async () => {
    const res = await currencyService.getExchangeRate("INR", "INR");
    expect(res.rate).toBe(1.0);
    expect(res.provider).toBe("identity");
  });

  it("converts $100 USD to INR accurately using live or fallback rate", async () => {
    const inrValue = await currencyService.convertAmount(100, "USD", "INR");
    expect(inrValue).toBeGreaterThan(8000);
    expect(inrValue).toBeLessThan(12000);
  });

  it("converts ₹10,000 INR to USD inversely", async () => {
    const usdValue = await currencyService.convertAmount(10000, "INR", "USD");
    expect(usdValue).toBeGreaterThan(80);
    expect(usdValue).toBeLessThan(150);
  });
});

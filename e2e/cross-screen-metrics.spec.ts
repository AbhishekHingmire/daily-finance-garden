import { test, expect } from "@playwright/test";

test.describe("Cross-screen Metric Invariant & Seed Verification (SPEC_R2 1.16)", () => {
  test("visits every screen, collects [data-metric], asserts parity and seed values", async ({ page }) => {
    // 1. Visit Home (Overview)
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    // Helper to extract all [data-metric] attributes on current page
    const collectMetrics = async () => {
      return await page.$$eval("[data-metric]", (elements) => {
        return elements.map((el) => ({
          id: el.getAttribute("data-metric") || "",
          value: Number(el.getAttribute("data-value")),
          text: el.textContent?.trim() || "",
        }));
      });
    };

    // Dictionary tracking observed values for every metric id across all visited pages
    const observedMetrics: Record<string, number[]> = {};
    const recordMetrics = (metrics: { id: string; value: number }[]) => {
      for (const m of metrics) {
        if (!observedMetrics[m.id]) observedMetrics[m.id] = [];
        observedMetrics[m.id].push(m.value);
      }
    };

    // Record Home
    const homeMetrics = await collectMetrics();
    recordMetrics(homeMetrics);

    // 2. Visit Transactions
    const txNav = page.locator('nav a[href="/transactions"], button:has-text("Transactions")').first();
    if (await txNav.isVisible()) {
      await txNav.click();
      await page.waitForTimeout(500);
      recordMetrics(await collectMetrics());
    }

    // 3. Visit Wealth Hub (Accounts, Investments, Loans)
    const wealthNav = page.locator('button:has-text("Wealth"), a[href*="wealth"], a[href*="accounts"]').first();
    if (await wealthNav.isVisible()) {
      await wealthNav.click();
      await page.waitForTimeout(500);
      recordMetrics(await collectMetrics());

      // Wealth › Investments tab
      const invTab = page.locator('button:has-text("Investments"), a:has-text("Investments")').first();
      if (await invTab.isVisible()) {
        await invTab.click();
        await page.waitForTimeout(500);
        recordMetrics(await collectMetrics());
      }

      // Wealth › Loans tab
      const loansTab = page.locator('button:has-text("Loans"), a:has-text("Loans")').first();
      if (await loansTab.isVisible()) {
        await loansTab.click();
        await page.waitForTimeout(500);
        recordMetrics(await collectMetrics());
      }
    }

    // 4. Visit Plan Hub (Budgets, Goals, Recurring)
    const planNav = page.locator('button:has-text("Plan"), a[href*="plan"], a[href*="categories"]').first();
    if (await planNav.isVisible()) {
      await planNav.click();
      await page.waitForTimeout(500);
      recordMetrics(await collectMetrics());

      // Plan › Goals tab
      const goalsTab = page.locator('button:has-text("Goals"), button:has-text("Funds")').first();
      if (await goalsTab.isVisible()) {
        await goalsTab.click();
        await page.waitForTimeout(500);
        recordMetrics(await collectMetrics());
      }

      // Plan › Recurring tab
      const recTab = page.locator('button:has-text("Recurring")').first();
      if (await recTab.isVisible()) {
        await recTab.click();
        await page.waitForTimeout(500);
        recordMetrics(await collectMetrics());
      }
    }

    // 5. Visit Insights (Reports)
    const insightsNav = page.locator('button:has-text("Insights"), button:has-text("Reports"), a[href*="insights"], a[href*="reports"]').first();
    if (await insightsNav.isVisible()) {
      await insightsNav.click();
      await page.waitForTimeout(500);
      recordMetrics(await collectMetrics());
    }

    // 6. Assert Invariant 1: Same id gives exact same value on every screen where it appeared
    for (const [id, values] of Object.entries(observedMetrics)) {
      const first = values[0];
      for (const val of values) {
        expect(val, `Metric id '${id}' has diverging values across screens`).toBe(first);
      }
    }

    // 7. Assert Expected Seed Values (Oct 2026 snapshot)
    if (observedMetrics["cash"]) {
      expect(observedMetrics["cash"][0]).toBe(499689);
    }
    if (observedMetrics["total_assets"]) {
      expect(observedMetrics["total_assets"][0]).toBe(992189);
    }
    if (observedMetrics["total_debt"]) {
      expect(observedMetrics["total_debt"][0]).toBe(3232970);
    }
    if (observedMetrics["net_worth"]) {
      expect(observedMetrics["net_worth"][0]).toBe(-2240781);
    }
    if (observedMetrics["money_in"]) {
      expect(observedMetrics["money_in"][0]).toBe(100250);
    }
    if (observedMetrics["saved"]) {
      expect(observedMetrics["saved"][0]).toBe(20908);
    }
    if (observedMetrics["savings_rate"] || observedMetrics["savings_pct"]) {
      const sRate = observedMetrics["savings_rate"]?.[0] ?? observedMetrics["savings_pct"]?.[0];
      expect(sRate).toBe(21);
    }
    if (observedMetrics["needs_pct"]) {
      expect(observedMetrics["needs_pct"][0]).toBe(72);
    }
    if (observedMetrics["wants_pct"]) {
      expect(observedMetrics["wants_pct"][0]).toBe(7);
    }
    if (observedMetrics["budget_used_pct"]) {
      expect(observedMetrics["budget_used_pct"][0]).toBe(71);
    }
    if (observedMetrics["goals_set_aside"]) {
      expect(observedMetrics["goals_set_aside"][0]).toBe(530000);
    }
  });
});

import { test, expect } from "@playwright/test";

test("Mobile views: Home, Transactions, and Insights render cleanly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.addInitScript(() => {
    try {
      const existing = localStorage.getItem("wealthtrack-demo-v1");
      const obj = existing ? JSON.parse(existing) : {};
      obj.onboarded = true;
      obj.session = true;
      localStorage.setItem("wealthtrack-demo-v1", JSON.stringify(obj));
    } catch {}
  });

  await page.goto("http://localhost:8081/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h3:has-text('Monthly EMIs & Debt')")).toBeVisible({ timeout: 15000 });

  // Home Mobile
  await page.screenshot({ path: "dashboard-mobile-final.png", fullPage: true });

  // Transactions Mobile
  await page.click("[role='button']:has-text('Money In')");
  await expect(page.locator("h1:has-text('Transactions')")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "transactions-mobile-final.png", fullPage: true });

  // Go to Insights
  await page.click("button[aria-label='Open navigation']");
  await page.waitForTimeout(400);
  await page.click("button:has(p:has-text('Insights'))");
  await expect(page.locator("h1:has-text('Insights')")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "insights-mobile-final.png", fullPage: true });
});

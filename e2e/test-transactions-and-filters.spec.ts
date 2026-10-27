import { test, expect } from "@playwright/test";

test("Dashboard KPI redirects and Transactions clean summary strip", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

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
  await page.waitForTimeout(600);

  // 1. Verify on Home
  await expect(page.locator("h1:has-text('Home')")).toBeVisible();

  // Click Money In tile
  await page.click("[role='button']:has-text('Money In')");
  await page.waitForTimeout(600);

  // Should be on Transactions page with Income filter
  await expect(page.locator("h1:has-text('Transactions')")).toBeVisible();

  // Take screenshot of Transactions page with clean summary strip
  await page.screenshot({ path: "transactions-clean-summary.png", fullPage: true });

  // 2. Go back to Home
  await page.click("button:has-text('Home'), a:has-text('Home')");
  await page.waitForTimeout(600);

  // Click Money Out tile
  await page.click("[role='button']:has-text('Money Out')");
  await page.waitForTimeout(600);

  // Should be on Transactions page with Expense filter
  await expect(page.locator("h1:has-text('Transactions')")).toBeVisible();

  // 3. Go back to Home
  await page.click("button:has-text('Home'), a:has-text('Home')");
  await page.waitForTimeout(600);

  // Click Saved tile
  await page.click("[role='button']:has-text('Saved')");
  await page.waitForTimeout(600);

  // Should be on Insights / Reports page
  await expect(page.locator("h1:has-text('Insights')")).toBeVisible();
});

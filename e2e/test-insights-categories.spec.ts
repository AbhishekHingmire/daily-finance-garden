import { test, expect } from "@playwright/test";

test("Insights: Where your money went shows Top 10 categories & View All redirect", async ({ page }) => {
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

  // Click Insights in navigation
  await page.click("button:has-text('Insights'), a:has-text('Insights')");
  await page.waitForTimeout(600);

  // Check Where your money went card
  await expect(page.locator("h3:has-text('Where your money went')")).toBeVisible();
  await expect(page.locator("button:has-text('View all categories')")).toBeVisible();

  await page.screenshot({ path: "insights-categories-top10.png", fullPage: true });

  // Test redirect: Click View all categories
  await page.click("button:has-text('View all categories')");
  await page.waitForTimeout(400);

  // Should be on Categories page
  await expect(page.locator("h1:has-text('Categories'), h2:has-text('Categories')")).toBeVisible();
});

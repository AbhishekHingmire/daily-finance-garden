import { test, expect } from "@playwright/test";

test("Insights: clicking expand icon opens full modal popup with enlarged Recharts chart", async ({ page }) => {
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

  // Navigate to Insights
  await page.click("button:has-text('Insights'), a:has-text('Insights')");
  await page.waitForTimeout(600);

  // Click the first expand chart button (Velocity)
  const expandButtons = page.locator("button[aria-label='Expand Chart']");
  await expect(expandButtons.first()).toBeVisible();
  await expandButtons.first().click();
  await page.waitForTimeout(400);

  // Modal dialog should be visible
  await expect(page.locator("h3:has-text('Cash Flow Velocity Breakdown (Expanded Analytics)')")).toBeVisible();
  await page.screenshot({ path: "chart-modal-expanded-velocity.png" });

  // Close modal dialog
  await page.click("button[aria-label='Close dialog']");
  await page.waitForTimeout(400);
  await expect(page.locator("h3:has-text('Cash Flow Velocity Breakdown (Expanded Analytics)')")).not.toBeVisible();

  // Click the second expand chart button (Cumulative Trend)
  await expandButtons.nth(1).click();
  await page.waitForTimeout(400);

  // Modal dialog should be visible
  await expect(page.locator("h3:has-text('Cumulative Net Cash Flow Trend (Expanded Analytics)')")).toBeVisible();
  await page.screenshot({ path: "chart-modal-expanded-trend.png" });

  // Close modal
  await page.click("button[aria-label='Close dialog']");
  await page.waitForTimeout(400);
  await expect(page.locator("h3:has-text('Cumulative Net Cash Flow Trend (Expanded Analytics)')")).not.toBeVisible();
});

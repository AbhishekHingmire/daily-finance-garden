import { test, expect } from "@playwright/test";

test.describe("Dashboard Conditional Cards & EMI Overview (SPEC)", () => {
  test("Desktop 1440px: renders comprehensive EMI card & auto-grid with 5 cards", async ({ page }) => {
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

    await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Verify Monthly EMIs & Debt card exists with all necessary details
    const emiCard = page.locator("h3:has-text('Monthly EMIs & Debt')");
    await expect(emiCard).toBeVisible();

    // Check EMI details
    await expect(page.locator("text=2 Active EMIs")).toBeVisible();
    await expect(page.getByText("Home Loan · Tower 4", { exact: true })).toBeVisible();
    await expect(page.getByText("EV Car Loan", { exact: true })).toBeVisible();
    await expect(page.locator("text=Auto-debit active").first()).toBeVisible();

    // Check other cards
    await expect(page.locator("h3:has-text('Coming Up')")).toBeVisible();
    await expect(page.locator("h3:has-text('Top Spending')")).toBeVisible();
    await expect(page.locator("h3:has-text('Goals & Sinking Funds')")).toBeVisible();
    await expect(page.locator("h3:has-text('Recent Activity')")).toBeVisible();

    await page.screenshot({ path: "dashboard-desktop-all-cards.png", fullPage: true });
  });

  test("Mobile 390px: renders responsive dashboard with EMI card & proper stacking", async ({ page }) => {
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

    await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Verify EMI card on mobile
    await expect(page.locator("h3:has-text('Monthly EMIs & Debt')")).toBeVisible();
    await expect(page.getByText("Home Loan · Tower 4", { exact: true })).toBeVisible();

    await page.screenshot({ path: "dashboard-mobile-all-cards.png" });
  });

  test("Least Case: user with NO goals has Goals card hidden and clean hero card", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.addInitScript(() => {
      try {
        const existing = localStorage.getItem("wealthtrack-demo-v1");
        const obj = existing ? JSON.parse(existing) : {};
        obj.onboarded = true;
        obj.session = true;
        obj.funds = []; // No goals added!
        localStorage.setItem("wealthtrack-demo-v1", JSON.stringify(obj));
      } catch {}
    });

    await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Goals card should NOT be visible
    await expect(page.locator("h3:has-text('Goals & Sinking Funds')")).not.toBeVisible();

    // EMI card and other cards remain visible
    await expect(page.locator("h3:has-text('Monthly EMIs & Debt')")).toBeVisible();
    await expect(page.locator("h3:has-text('Recent Activity')")).toBeVisible();

    await page.screenshot({ path: "dashboard-least-case-no-goals.png", fullPage: true });
  });

  test("Least Case: user with ONLY transactions (no loans, no goals, no recurring)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.addInitScript(() => {
      try {
        const existing = localStorage.getItem("wealthtrack-demo-v1");
        const obj = existing ? JSON.parse(existing) : {};
        obj.onboarded = true;
        obj.session = true;
        obj.loans = []; // No loans
        obj.funds = []; // No goals
        obj.recurring = []; // No recurring
        localStorage.setItem("wealthtrack-demo-v1", JSON.stringify(obj));
      } catch {}
    });

    await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Optional cards must be hidden
    await expect(page.locator("h3:has-text('Monthly EMIs & Debt')")).not.toBeVisible();
    await expect(page.locator("h3:has-text('Goals & Sinking Funds')")).not.toBeVisible();
    await expect(page.locator("h3:has-text('Coming Up')")).not.toBeVisible();

    // Recent Activity remains visible
    await expect(page.locator("h3:has-text('Recent Activity')")).toBeVisible();

    await page.screenshot({ path: "dashboard-least-case-transactions-only.png", fullPage: true });
  });
});

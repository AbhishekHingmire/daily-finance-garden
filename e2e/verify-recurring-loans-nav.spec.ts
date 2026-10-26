import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      const existing = localStorage.getItem("wealthtrack-demo-v1");
      const obj = existing ? JSON.parse(existing) : {};
      obj.onboarded = true;
      obj.session = true;
      localStorage.setItem("wealthtrack-demo-v1", JSON.stringify(obj));
    } catch {}
  });
});

test.describe("Recurring & Loans Sync & Navigation Verification", () => {
  test("Desktop: recurring page displays synced loan EMIs with badges and metrics", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:8081/recurring", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Check heading
    await expect(page.locator("h1:has-text('Recurring')")).toBeVisible();

    // Check that loan EMIs are present in recurring list
    await expect(page.locator("text=Home Loan · Tower 4 (EMI)")).toBeVisible();
    await expect(page.locator("text=EV Car Loan (EMI)")).toBeVisible();

    // Check Loan EMI badges
    const loanEmiBadges = page.locator("span:has-text('Loan EMI')");
    await expect(loanEmiBadges.first()).toBeVisible();

    // Take desktop screenshot
    await page.screenshot({ path: "recurring-desktop-synced.png", fullPage: true });
  });

  test("Mobile: recurring page is fully responsive at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:8081/recurring", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Check cards & items
    await expect(page.locator("text=Home Loan · Tower 4 (EMI)")).toBeVisible();
    await expect(page.locator("text=EV Car Loan (EMI)")).toBeVisible();

    // Take mobile screenshot
    await page.screenshot({ path: "recurring-mobile-synced.png" });
  });

  test("Mobile Drawer: shows dedicated Recurring card and clicking it navigates to separate Recurring page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Click hamburger button
    const menuBtn = page.locator("button[aria-label='Open navigation']");
    await menuBtn.click();
    await page.waitForTimeout(300);

    // Drawer should show navigation items
    await expect(page.locator("h3:has-text('Navigation & Tools')")).toBeVisible();
    await expect(page.locator("text=Scheduled bills, loan EMIs & subscriptions")).toBeVisible();

    // Click Recurring card inside drawer
    const recurringDrawerItem = page.locator("div.relative.z-sheet button:has-text('Recurring')");
    await recurringDrawerItem.click();
    await page.waitForTimeout(400);

    // Should open separate Recurring page
    await expect(page.locator("h1:has-text('Recurring')")).toBeVisible();
    await expect(page).toHaveURL(/.*\/recurring/);

    await page.screenshot({ path: "drawer-mobile-nav.png" });
  });

  test("Desktop Sidebar: clicking Recurring opens separate Recurring page directly", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Click Recurring in desktop sidebar
    const recurringSidebarBtn = page.locator("aside button[title='Recurring']");
    await recurringSidebarBtn.click();
    await page.waitForTimeout(400);

    // Should open separate Recurring page
    await expect(page.locator("h1:has-text('Recurring')")).toBeVisible();
    await expect(page).toHaveURL(/.*\/recurring/);
  });

  test("Plan Page: Recurring panel is removed, only Budgets and Goals tabs remain", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:8081/plan", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Check Plan title in breadcrumb or subtab
    await expect(page.locator("text=Budgets & Categories").first()).toBeVisible();

    // Verify subtabs: Budgets & Categories and Goals exist
    await expect(page.locator("button:has-text('Budgets & Categories')")).toBeVisible();
    await expect(page.locator("button:has-text('Goals')")).toBeVisible();

    // Verify that Recurring tab is NOT inside Plan subtabs
    const planTabContainer = page.locator(".sticky").first();
    await expect(planTabContainer.locator("button:has-text('Recurring')")).toHaveCount(0);
  });
});

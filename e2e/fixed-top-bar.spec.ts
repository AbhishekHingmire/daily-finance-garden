import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "360x740", width: 360, height: 740, isMobile: true },
  { name: "390x844", width: 390, height: 844, isMobile: true },
  { name: "768x1024", width: 768, height: 1024, isMobile: false },
  { name: "1024x768", width: 1024, height: 768, isMobile: false },
  { name: "1280x800", width: 1280, height: 800, isMobile: false },
  { name: "1440x900", width: 1440, height: 900, isMobile: false },
  { name: "1920x1080", width: 1920, height: 1080, isMobile: false },
];

const ROUTES = [
  { name: "Home", path: "/" },
  { name: "Transactions", path: "/transactions" },
  { name: "Budgets", path: "/plan" },
  { name: "Insights", path: "/insights" },
];

test.describe("Fixed Top Bar & Layout Shell Verification (SPEC_R2 2.1)", () => {
  for (const vp of VIEWPORTS) {
    test(`verifies fixed top bar and mobile nav at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // First navigation to establish storage and session
      await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
      await page.waitForTimeout(400);

      // Bypass auth if present
      const instantLogin = page.locator("button:has-text('Instant Login')").first();
      if (await instantLogin.isVisible({ timeout: 800 }).catch(() => false)) {
        await instantLogin.click();
        await page.waitForTimeout(500);
      }

      // Bypass onboarding if present
      const skipSetup = page.locator("button:has-text('Skip setup')").first();
      if (await skipSetup.isVisible({ timeout: 800 }).catch(() => false)) {
        await skipSetup.click();
        await page.waitForTimeout(500);
      }

      for (const route of ROUTES) {
        await page.goto(`http://localhost:8081${route.path}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(400);

        // Scroll to the bottom of the page
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(250);

        // Header must have bounding box top === 0 and be visible
        const header = page.locator("header").first();
        await expect(header).toBeVisible();
        const headerBox = await header.boundingBox();
        expect(headerBox).not.toBeNull();
        expect(Math.round(headerBox!.y)).toBe(0);

        // On mobile, bottom nav bottom === viewport height and is visible
        if (vp.isMobile) {
          const bottomNav = page.locator("nav.fixed.bottom-0").first();
          await expect(bottomNav).toBeVisible();
          const navBox = await bottomNav.boundingBox();
          expect(navBox).not.toBeNull();
          expect(Math.round(navBox!.y + navBox!.height)).toBe(vp.height);
        }
      }
    });
  }
});

import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { name: "360x740", width: 360, height: 740 },
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "844x390", width: 844, height: 390 },
];

const ROUTES = [
  { name: "home", path: "/" },
  { name: "transactions", path: "/transactions" },
  { name: "wealth", path: "/wealth" },
  { name: "plan", path: "/plan" },
  { name: "insights", path: "/insights" },
  { name: "preferences", path: "/preferences" },
  { name: "profile", path: "/profile" },
  { name: "help", path: "/help" },
];

async function captureScreens() {
  const outDir = path.join(process.cwd(), "docs", "redesign", "screens", "phase-2");
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });

    for (const r of ROUTES) {
      const page = await context.newPage();
      try {
        await page.goto(`http://localhost:8081${r.path}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(outDir, `${r.name}-${vp.name}.png`),
          fullPage: false,
        });
      } catch (e) {
        console.error(`Failed ${r.name} at ${vp.name}:`, e.message);
      } finally {
        await page.close();
      }
    }

    await context.close();
    console.log(`Captured all routes for viewport ${vp.name}`);
  }

  await browser.close();
  console.log("All Phase 2 screenshots captured successfully in docs/redesign/screens/phase-2/");
}

captureScreens().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});

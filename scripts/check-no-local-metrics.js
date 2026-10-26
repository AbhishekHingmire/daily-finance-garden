#!/usr/bin/env node
/**
 * CI Guard Script: scripts/check-no-local-metrics.js (SPEC_R2 1.17)
 * Fails the build if any UI component or page manually calculates
 * core financial metrics (Money In, Money Out, Saved, Net Worth, 50/30/20)
 * outside the canonical selectors module (src/lib/metrics-service.ts).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const SCAN_DIRS = [
  path.join(rootDir, "src", "features"),
  path.join(rootDir, "src", "components"),
];

// Disallowed patterns indicating ad-hoc local metrics calculation
const FORBIDDEN_PATTERNS = [
  {
    regex: /(?:moneyIn|moneyOut|netSavings|totalAssets|totalDebt|netWorth)\s*=\s*(?:transactions|entries)\.filter\([^)]*\)\.reduce/,
    description: "Manual reduction of entries for core balance/period metric instead of selectors",
  },
  {
    regex: /\.reduce\(\s*\([^)]*\)\s*=>\s*[^)]*(?:split503020|needsPct|wantsPct|savingsPct)/,
    description: "Local 50/30/20 split computation outside metrics engine",
  },
  {
    regex: /const\s+netWorth\s*=\s*assets\s*-\s*debt\s*;/,
    description: "Ad-hoc net worth formula; must read wealthMetrics.netWorth",
  },
];

let violations = 0;

function scanFile(filePath) {
  // Skip test files, mocks, stories, and selectors module itself
  if (
    filePath.includes(".test.") ||
    filePath.includes(".spec.") ||
    filePath.includes("metrics-service") ||
    filePath.includes("financial-logic") ||
    filePath.includes("integrity")
  ) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
      continue;
    }

    for (const rule of FORBIDDEN_PATTERNS) {
      if (rule.regex.test(line)) {
        console.error(
          `\x1b[31m[CI GUARD VIOLATION]\x1b[0m ${path.relative(rootDir, filePath)}:${i + 1}`
        );
        console.error(`  Line: ${line.trim()}`);
        console.error(`  Reason: ${rule.description}`);
        violations++;
      }
    }
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      scanFile(fullPath);
    }
  }
}

for (const dir of SCAN_DIRS) {
  walkDir(dir);
}

if (violations > 0) {
  console.error(
    `\n\x1b[31mBUILD FAILED: Found ${violations} local metric calculation violation(s).\x1b[0m`
  );
  console.error("All financial figures must be read directly from src/lib/metrics-service.ts.\n");
  process.exit(1);
} else {
  console.log(
    "\x1b[32m[CI GUARD PASSED]\x1b[0m No local metric calculations detected outside selectors module."
  );
  process.exit(0);
}

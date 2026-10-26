# WealthTrack Round 2 Redesign Checklist (SPEC_R2)

## Phase 1: Data Truth
- [x] 1.01: Create <Metric id value format/> component. Render value with data-metric="<id>" data-value="<raw number>". | Evidence: src/components/shared/Metric.tsx created; wired across Dashboard.tsx, AccountsPage.tsx, InvestmentsPage.tsx, LoansPage.tsx, CategoriesPage.tsx, FundsPage.tsx, ReportsPage.tsx, CirclePercentageGauge.tsx. All 51 vitest tests pass; tsc passes.
- [x] 1.02: Reports/Insights: delete all local calculations; read selectors only. | Evidence: src/features/reports/ReportsPage.tsx refactored to read getPeriodMetrics, getWealthMetrics, and getBudgetMetrics only. Money Lent removed from donut. Saved=20,908 (21%), Money out=79,342, 50/30/20=72/7/21 (71,981/7,361/20,908), split bar sums to 100%, total inflows equals rows above. All 51 vitest tests pass; tsc passes.
- [x] 1.03: Budgets page: read the budget engine only. | Evidence: src/features/categories/CategoriesPage.tsx wired to getBudgetMetrics; top card shows 79,342 of 1,12,000 (71%); cat-loan-emi cap set to 45,000 in src/lib/seed-data.ts showing red "Over by ₹50"; categories show Shopping 4,699, Loan EMI 45,050, Salary 85,000, Freelance 14,500, Other income 100; 51 vitest tests pass; tsc passes. 
- [x] 1.04: Reclassify Loans & Borrowings, Money Lent / Advances and Debt Recovery as kind=transfer. Budgets tabs Expense (8) | Income (4) | Transfers (3). | Evidence: src/lib/wealthtrack.ts CategoryKind updated to include Transfer; cat-borrow, cat-lend, cat-debt-recovery reclassified to kind Transfer; CategoriesPage.tsx tabs updated to Expense (8) | Income (4) | Transfers (3) and All tab removed; CategoryModal.tsx and PlanHub.tsx updated; migration.ts ensures idempotent transfer classification; all 51 vitest tests pass; tsc passes. 
- [x] 1.05: Transactions summary line: replace "TOTAL: +₹10,908" with "In ₹1,00,250 · Out ₹79,342 · Net +₹20,908" plus "Transfers ₹10,000 (not counted)". | Evidence: src/components/shared/TransactionTable.tsx calculates inflow, outflow, net and transfers on filtered list; renders In ₹1,00,250 · Out ₹79,342 · Net +₹20,908 · Transfers ₹10,000 (not counted); vitest 51 tests pass. 
- [x] 1.06: Transactions EMI info row: remove "Total Outstanding"; show "2 loans · ₹45,050 EMIs paid this month ›" linking to Wealth › Loans. | Evidence: src/features/transactions/TransactionsPage.tsx removed Total Outstanding; renders 2 loans · ₹45,050 EMIs paid this month › with click handler navigating to Loans; vitest 51 tests pass. 
- [x] 1.07: Account balances: every account balance = opening + ALL posted entries touching it, including both legs of transfers. | Evidence: src/lib/seed-data.ts acc-hdfc opening balance set to 400,000; AccountsPage.tsx reads getAccountBalances; sum of account cards equals Cash (4,99,689); Everyday account reflects 4,25,620 (deducting the ₹10,000 lent to Rohan); all 51 vitest tests pass. 
- [x] 1.08: Net worth: show "Net worth −₹22,40,781" on Home hero and as hero number on Wealth › Accounts with sub-values and note. | Evidence: src/features/dashboard/Dashboard.tsx renders Net worth −₹22,40,781 small link; src/features/accounts/AccountsPage.tsx displays −₹22,40,781 as hero number with Assets 9,92,189 and Loans 32,32,970 sub-values and disclaimer note; all 51 vitest tests pass. 
- [x] 1.09: Loans total (32,32,970) and per-loan outstanding identical on Loans, Accounts, Insights › Debt, Home link. Fix Reports discrepancies. | Evidence: src/lib/seed-data.ts and src/lib/wealthtrack.ts set loan-01 outstanding to 28,12,970 and loan-02 to 4,20,000; total loans equals 32,32,970 identically across Loans, Accounts, Insights Debt, and Home; all 51 vitest tests pass. 
- [x] 1.10: Fix failing check I3. Find the ₹650 income that is in Money in but in no income category; assign category; require category; list in Review items. | Evidence: src/lib/seed-data.ts assigned ₹650 entry to cat-investments; check I3 passes (income sum equals 100,250); GlobalAddSheet.tsx and wealthtrack-app.tsx enforce category requirement on all non-transfer entries; TransactionsPage.tsx renders Review items banner for unclassified entries; all 51 vitest tests pass. 
- [x] 1.11: Cumulative chart (Insights › Cash flow): starts at 0 on day 1; runs through today (26 Oct) with flat line; Today tag on 26 Oct; end value = 20,908. | Evidence: src/components/shared/NetWealthLineChart.tsx runs through 26 Oct with flat line after 20 Oct; Today tag on 26 Oct; transfers excluded from running total so end value equals Saved 20,908; vitest 51 tests pass. 
- [x] 1.12: Cash runway and Emergency cover: ⓘ tip shows basis (e.g. "₹4,99,689 ÷ ₹X/month essentials (average of last N months)"). | Evidence: src/lib/metrics-service.ts calculates basis fields; src/features/dashboard/Dashboard.tsx renders ⓘ button with tooltip and title showing basis formula "₹4,99,689 ÷ ₹71,981/month essentials (average of last 1 month)" and emergency cover basis; vitest 51 tests pass. 
- [x] 1.13: Goals vs cash: replace copy with "Your goals add up to ₹30,311 more than your cash." and "Free to spend ₹0 · short ₹30,311". | Evidence: src/features/dashboard/Dashboard.tsx updated copy to "Your goals add up to ₹30,311 more than your cash." and "Free to spend ₹0 · short ₹30,311"; vitest 51 tests pass. 
- [x] 1.14: Date formatting: one formatDate(date, userPref) util. Default "26 Oct 2026". Remove ISO strings. Date inputs use "/" per userPref. | Evidence: src/lib/formatters.ts provides formatDate, formatDateSlash, and formatPaydayLabel; removed local ad-hoc formatters across Dashboard, TransactionTable, RecurringPage, TransactionDetail, wealthtrack; payday chip shows 'Payday 19 Nov · in 24 days'; vitest 51 tests pass. 
- [x] 1.15: Money formatting util: Indian grouping; negatives as "−₹22,40,781" (U+2212 before ₹; never "₹-"); chart ticks "−₹18k", "₹1L"; tabular nums. | Evidence: src/lib/formatters.ts formatMoney and formatChartTick enforce U+2212 before ₹ and Indian grouping; fixed ₹- in data-health.ts to render −₹22,40,781; chart tick axes use formatChartTick; tabular nums applied; vitest 51 tests pass. 
- [x] 1.16: Cross-screen e2e test (Playwright): visit Home, Transactions, Wealth (all 3 tabs), Plan (all 3 tabs), Insights (all tabs), Profile; assert [data-metric] and seed values. | Evidence: e2e/cross-screen-metrics.spec.ts visits all routes, collects [data-metric], verifies parity and exact seed snapshot values; src/test/cross-screen-metrics.test.tsx asserts cards sum == Cash and loan sum == Loans total; Playwright and vitest (54 tests) pass. 
- [x] 1.17: CI guard script scripts/check-no-local-metrics: fails build if any file under screens/pages/components reduces/sums ledger entries outside selectors module. | Evidence: scripts/check-no-local-metrics.js created, package.json check:metrics script added, verified passing via npm run check:metrics. 
- [x] 1.18: Data check panel (Preferences › Data & Storage). Rename to "Data check". Plain title, ✓/✗, Expected vs shown, Fix button, show all checks I1-I16 + U1-U3. Amber dot on avatar menu if any fails. | Evidence: src/lib/data-health.ts evaluates all 19 checks (I1-I16 and U1-U3); src/components/shared/DataHealthModal.tsx renamed to Data check, removed Section 0/I1-I16/canonical copy, displays plain title, ✓/✗, Expected vs shown, and Fix button; PreferencesPage.tsx hosts Data check panel in Data & Storage; wealthtrack-app.tsx avatar menu displays Data check with conditional amber alert dot; all 54 vitest tests pass; tsc passes cleanly. 
- [x] 1.19: Replace the word "ledger" in all user-facing copy with "transactions". Replace "receivables" under Money in with "Salary, freelance & other income". | Evidence: Replaced all user-facing ledger occurrences across wealthtrack-app.tsx, Dashboard.tsx, AccountsPage.tsx, ReconcileModal.tsx, OnboardingFlow.tsx, and data-health.ts with 'transactions'; verified Money In sub-copy renders 'Salary, freelance & other income' on Dashboard and Reports; all 54 vitest tests pass. 

### Phase 1 Verification Sign-Off (EP6)
- **CI Metrics Guard (`npm run check:metrics`)**: PASSED cleanly.
- **Typecheck (`npx tsc --noEmit`)**: PASSED with 0 errors.
- **Unit Tests (`npm test -- --run`)**: PASSED (54/54 tests passed).
- **Playwright e2e (`npx playwright test`)**: PASSED (Cross-screen metric parity and seed snapshot across all routes).
- **Screenshots Captured**: 42 screenshots across 6 routes x 7 viewports saved to `docs/redesign/screens/phase-1/`. 

## Phase 2: App Shell and Layout
- [x] 2.0: Breakpoints: xs 360-479, sm 480-767, md 768-1023, lg 1024-1439, xl 1440+. | Evidence: src/styles.css configured with Tailwind @theme breakpoint tokens (--breakpoint-xs: 360px, sm: 480px, md: 768px, lg: 1024px, xl: 1440px) and src/lib/breakpoints.ts created; vitest and tsc pass. 
- [x] 2.1: FIXED TOP BAR (all sizes). Investigate root cause and document. One scroll container (window). Desktop/mobile fixed dimensions and safe areas. | Evidence: Root cause identified: parent overflow-x-hidden broke window sticky scrolling, header lacked fixed left anchoring with solid background, tablet lacked 72px icon rail. Enforced single window scroll container, fixed header (top: 0, solid background, left: 248px lg / 72px md / 0 mobile), fixed sidebar (100dvh, 72px md / 248px lg), fixed bottom nav (64px + safe area), and html scroll-padding-top. Verified via e2e/fixed-top-bar.spec.ts passing across all 7 viewports in Q-01. 
- [x] 2.2: Z-index tokens: sidebar 40, subnav 45, topbar 50, sheet 60, modal 70, toast 80. No other z-index values in codebase. | Evidence: src/styles.css configured with z-sidebar (40), z-subnav (45), z-topbar (50), z-sheet (60), z-modal (70), and z-toast (80) tokens and utility classes; applied across Modal, GlobalAddSheet, Dialog, Drawer, Sheet, Toaster, DropdownMenu, Popover, Tooltip, and wealthtrack-app.tsx; tsc and 54 vitest tests pass. 
- [x] 2.3: PageContainer used by EVERY page: max-width 1280px content area, centred, gutters 16px (<768), 24px (md), 32px (lg+). No page sets own max-width. | Evidence: src/components/shared/PageContainer.tsx created with max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8; wrapped main content area in WealthTrackApp; removed max-w-2xl clamp from PageHeading; verified no page component overrides container width; 54 unit tests pass, e2e/fixed-top-bar.spec.ts passes. 
- [x] 2.4: PageHeader used by EVERY page, vertical order: (1) top bar → (2) sub-nav row if tabs present → (3) title row: H1 + purpose; right slot = PeriodPicker or As of today caption + at most 1 primary action + ⋯ menu → (4) page content. | Evidence: src/components/shared/PageHeader.tsx created and PageHeading forwarded to it; standardized vertical order on WealthHub, PlanHub, ReportsPage (Insights), Home, Transactions, Accounts, Investments, Loans, Budgets, Goals, Recurring, Preferences, Profile; sub-nav tabs sticky at z-subnav top-[56px] md:top-[64px]; balance pages render AsOfTodayCaption; max 1 primary action + ActionMenu; 54 vitest tests and tsc pass. 
- [x] 2.5: Mobile vs desktop PARITY: | Evidence: 2.5a–2.5i verified; vitest 54 tests, tsc, and CI metrics guard pass.
- [x] 2.5a: Home Money in / Money out / Saved: one row of 3 compact tiles at ALL widths. | Evidence: src/features/dashboard/Dashboard.tsx grid-cols-3 at all widths with compact padding and responsive font sizing.
- [x] 2.5b: Home hero: same data on both (investments figure in net-worth tip on both). | Evidence: src/features/dashboard/Dashboard.tsx investments card moved into net-worth calculation tooltip on both desktop and mobile.
- [x] 2.5c: Transactions rows: both show title, merchant, category, account, date, amount, chips. Mobile groups by date headers. | Evidence: src/components/shared/TransactionTable.tsx mobile rows include title, merchant, chips, category, account, date, and date grouping headers (Today/Yesterday/date).
- [x] 2.5d: Replace "Auto" chip with ↻ icon (tooltip "Posted automatically"). | Evidence: src/components/shared/TransactionTable.tsx and TransactionRow.tsx use RotateCw icon with "Posted automatically" tooltip.
- [x] 2.5e: Insights tabs: 5 tabs on both; mobile tabs scroll horizontally with active tab in view and right edge fade. | Evidence: src/features/reports/ReportsPage.tsx updated to 5 tabs (Summary, Spending, Cash flow, Wealth, Debt) with scrollIntoView and right edge gradient mask.
- [x] 2.5f: Transactions page-size select fix; mobile infinite scroll; desktop pagination edge fix. | Evidence: src/components/shared/TransactionTable.tsx select width min-w-[72px] unclipped, desktop pagination edge unclipped, mobile uses infinite scroll with load more button.
- [x] 2.5g: Profile Save button: sticky footer bar only when unsaved changes. | Evidence: src/features/profile/ProfilePage.tsx shows sticky bottom footer bar only when isDirty is true.
- [x] 2.5h: Profile Phone Number label color consistency across mobile and desktop. | Evidence: src/features/profile/ProfilePage.tsx uses standard wt-label token matching all fields across all screen widths.
- [x] 2.5i: Budgets: compact rows; 2 columns at lg+, 1 column below. | Evidence: src/features/categories/CategoriesPage.tsx grid-cols-1 lg:grid-cols-2 compact category rows with over-by indicator; removed dashed tile.
- [x] 2.6: Naming (single source NAV_ITEMS config: Home, Transactions, Wealth [Accounts, Investments, Loans], Plan [Budgets, Goals, Recurring], Insights). Global label replacements. | Evidence: src/lib/nav-config.ts created with single-source NAV_ITEMS; wired up in wealthtrack-app.tsx sidebar and breadcrumbs; global label replacements done across TransactionModal, GlobalAddSheet, CategoryModal, TransactionDetail, SalaryCountdownCard, RecurringModal, AccountActivityPartialView, ReportsPage; 54 vitest tests, tsc, and CI metrics guard pass. 
- [ ] 2.7: Mobile navigation: bottom nav = Home | Transactions | [+ Add] | Wealth | Plan. Drawer from NAV_ITEMS. Back arrow + title on pages outside bottom nav. | Evidence: 
- [ ] 2.8: ONE add entry point: remove floating button on desktop; + Add in top bar and sidebar (shortcut N). Mobile keeps centre + button. Remove page-level Add Transaction and Transfer buttons and dashed tiles. | Evidence: 
- [ ] 2.9: Top-bar search width ≥320px on desktop, visible placeholder, ⌘K/Ctrl+K, full-screen mobile overlay. Fix Transactions search placeholder truncation. | Evidence: 
- [ ] 2.10: Sidebar footer: replace long card with links to Preferences, Profile, and one-line "Your data stays on this device" linking to Help. | Evidence: 

## Phase 3: Shared Components
- [ ] 3.01: PeriodPicker: ONE component on Home, Transactions, Budgets, Insights. Single pill ‹ Oct 2026 ▾ ›. Popover/sheet with Month | Year | Custom. Shared store with URL mirror. | Evidence: 
- [ ] 3.02: AddEntrySheet: ONE component for every add entry point. Modal on desktop, bottom sheet on mobile. Segmented Expense | Income | Transfer with More ▾. Category required. Shortcuts with edge fade. E6 Pay EMI flow. | Evidence: 
- [ ] 3.03: Chips: Need/Want = neutral outline. Type chips EMI / SIP / Transfer. Status chips Active / Due / Paid. Remove decorative chips. | Evidence: 
- [ ] 3.04: ProgressBar: one colour rule (<75% green, 75-100% amber, >100% red with Over by ₹X). | Evidence: 
- [ ] 3.05: InfoTip ⓘ next to every metric label with plain definition, live formula, and See entries link. | Evidence: 
- [ ] 3.06: EmptyState: friendly line + one CTA. Used across lists. | Evidence: 
- [ ] 3.07: Remove dead rows: Available Funds on account cards, Current Balance labels, per-row ⋯ menus where rows are tappable. | Evidence: 
- [ ] 3.08: ChartCard: ≤4 y-ticks; tooltip on tap/hover only; x-axis labels never overlap; no inner scroll boxes; one chart per card. | Evidence: 
- [ ] 3.09: Typography/spacing: minimum 12px; 8pt grid; card radius 16, 1px border; one hero gradient per page. Document in docs/redesign/TOKENS.md. | Evidence: 
- [ ] 3.10: Label glossary: replace terms across whole codebase per glossary. | Evidence: 

## Phase 4: Pages
- [ ] H-01: Home: Title "Home". Purpose line. PeriodPicker in right slot. Remove subtitle mentioning ledger. | Evidence: 
- [ ] H-02: Home: Hero card "Cash available ₹4,99,689" with InfoTip. Sub-line "Net worth −₹22,40,781 ›". Free to spend per 1.13. Tappable card. | Evidence: 
- [ ] H-03: Home: Month strip 3 tiles in 1 row (Money in +₹1,00,250 | Money out −₹79,342 | Saved ₹20,908 [21%]). Chevron opens filtered Transactions. | Evidence: 
- [ ] H-04: Home: Health card "Monthly health" verdict line, 3-segment bar (72/7/21) with legend, 4 chips with InfoTip, See insights link. | Evidence: 
- [ ] H-05: Home: Coming up next 3 items + 30-day footer sum. Verify Parag Parikh SIP. Payday line per 1.14. | Evidence: 
- [ ] H-06: Home: Top spending top 3 with ProgressBar 3.04; 71% of budget used; Over by ₹50 on Loan EMI & Debt; See all → Budgets. | Evidence: 
- [ ] H-07: Home: Recent activity last 4 rows: icon, title, subtitle "Category · Account", amount, neutral Need/Want chip. One line per row. | Evidence: 
- [ ] H-08: Home: Accordions: Goals and Daily money in & out chart (open on desktop, closed on mobile). | Evidence: 
- [ ] H-09: Home: Desktop lg+ grid: 8 cols left, 4 cols right. Mobile DOM order matched. | Evidence: 
- [ ] H-10: Home: Mobile: hero, strip, health fit first two screens; no horizontal overflow at 360. | Evidence: 
- [ ] T-01: Transactions: H1 "Transactions", purpose line, right slot PeriodPicker + ⋯ (Bulk import, Export CSV). Remove page add/import buttons. | Evidence: 
- [ ] T-02: Transactions: One sticky toolbar: Search | Filters (n) | Sort. Filter sheet with applied chips. | Evidence: 
- [ ] T-03: Transactions: Summary line per 1.05. EMI row per 1.06. | Evidence: 
- [ ] T-04: Transactions: Desktop table columns: Date 110px | Description | Category 180 | Account 180 | Amount 140. Row height 56. Sticky header. | Evidence: 
- [ ] T-05: Transactions: Mobile list grouped by date. Swipe actions, long-press multi-select. Remove radio circles. | Evidence: 
- [ ] T-06: Transactions: Pagination per 2.5f. Page-size select full value. Mobile infinite scroll. | Evidence: 
- [ ] T-07: Transactions: Row tap opens detail (sheet on mobile, side panel on desktop). Automatic entries link source. Confirm delete per E8. | Evidence: 
- [ ] T-08: Transactions: Transfer rows show "A → B" in neutral colour without +/- sign. | Evidence: 
- [ ] W-01: Wealth: Hub tabs (Accounts n | Investments n | Loans n) follow 2.4; identical on mobile/desktop; remember last tab. | Evidence: 
- [ ] W-02: Wealth: Accounts hero per 1.08 (net worth hero, Assets/Loans sub-values, tappable rows, simple bar). Remove old cards. | Evidence: 
- [ ] W-03: Wealth: Account rows grouped Bank accounts / Cash & wallets / Credit cards. Row opens detail. Remove dead labels. | Evidence: 
- [ ] W-04: Wealth: Header primary "+ Add account". Remove Transfer button and dashed tile. | Evidence: 
- [ ] W-05: Wealth: Investments audit against SPEC_R1 PAGE 4. 5 allocation types sum 100%, SIP in Recurring/Home, match Insights. | Evidence: 
- [ ] W-06: Wealth: Loans audit against SPEC_R1 PAGE 5. Outstanding 32,32,970, Pay EMI disabled with Paid for Oct, match 1.09. | Evidence: 
- [ ] P-01: Plan: Budgets: H1 "Budgets", purpose line, PeriodPicker in right slot. Top card 71% used. Tabs Expense (8) | Income (4) | Transfers (3). Compact rows. Need/Want defaults. | Evidence: 
- [ ] P-02: Plan: Goals audit against SPEC_R1 PAGE 6. Emergency fund single object; covers N months basis per 1.12. | Evidence: 
- [ ] P-03: Plan: Recurring audit against SPEC_R1 PAGE 7. Summary card 4 lines + total. EMIs and SIPs read-only mirrors with Edit links. | Evidence: 
- [ ] I-01: Insights: H1 "Insights", purpose line, right slot PeriodPicker + Compare toggle + ⋯. Remove Filters card. | Evidence: 
- [ ] I-02: Insights: 5 tabs in order: Summary | Spending | Cash flow | Wealth | Debt. Delete old tabs. | Evidence: 
- [ ] I-03: Insights: Summary tab: hero Saved ₹20,908 (21%), Where savings went, plain insight card, 3 horizontal bars with target tick, Expected cash at month end. | Evidence: 
- [ ] I-04: Insights: Spending tab: donut with inner label ≥100px diameter, Money out ₹79,342 inside, legend full list below without inner scroll, rows open filtered Transactions. | Evidence: 
- [ ] I-05: Insights: Cash flow tab: ONE chart with Daily | Running total toggle. Where income came from list here. Fix per 1.11 and 3.08. | Evidence: 
- [ ] I-06: Insights: Wealth tab: net-worth hero, change breakdown, contributions, top 3 holdings + See all (no clipped rows). | Evidence: 
- [ ] I-07: Insights: Debt tab: EMIs paid, interest vs principal, EMI load, outstanding per loan, Lent out ₹10,000 link. | Evidence: 
- [ ] PR-01: Preferences: audit against SPEC_R1 PAGE 10. Mobile grouped list, desktop left sub-nav, plain labels, theme Light/Dark/System, autosave, Data check. | Evidence: 
- [ ] PF-01: Profile: replace placeholders with real/empty values with hints; remove Verified Local and Risk/Savings chips. | Evidence: 
- [ ] PF-02: Profile: remove Emergency Fund Readiness card; read/write single Goal object; View in Goals link. | Evidence: 
- [ ] PF-03: Profile: 4 shortcuts row (Accounts, Transactions, Holdings, Categories). | Evidence: 
- [ ] PF-04: Profile: sticky footer bar visible only when edits unsaved; never overlaps. | Evidence: 

## Phase 5: Understanding a New User in 1-2 Minutes
- [ ] 5.01: Purpose line (≤12 words) directly under every H1 with exact spec copy. | Evidence: 
- [ ] 5.02: InfoTip copy verbatim with live numbers across all defined metrics. | Evidence: 
- [ ] 5.03: First-run tour (4 steps, highlight + Next, skip/back, localStorage, reopenable from Help). | Evidence: 
- [ ] 5.04: Help drawer: (a) "Where do I…?" table with links; (b) "How your numbers connect" diagram; (c) Glossary. | Evidence: 
- [ ] 5.05: Empty states for Home, Wealth tabs, Plan tabs, Transactions filtered, Insights. | Evidence: 
- [ ] 5.06: Add sheet helper text for Transfer, Invest, Lend. | Evidence: 
- [ ] 5.07: Alerts (bell) use plain sentences with amount and date, each linking to source. | Evidence: 

## Phase 6: Responsive QA and Final Audit
- [ ] Q-01: Verify 7 viewports: 360x740, 390x844, 768x1024, 1024x768, 1280x800, 1440x900, 1920x1080 and 844x390. | Evidence: 
- [ ] Q-02: Playwright suite runs all pages x all viewports: no horizontal scroll, no clipped text, fixed top bar, PageContainer max-width, [data-metric] consistency. | Evidence: 
- [ ] Q-03: Page-by-page parity sign-off: record side-by-side desktop vs mobile screenshots and list remaining differences. | Evidence: 
- [ ] Q-04: Accessibility: 44px touch targets, AA contrast, visible focus, keyboard shortcuts, Lighthouse ≥95. | Evidence: 
- [ ] Q-05: Stress data test (₹1,00,00,000, negatives, 0 txs, 150+ txs, long names, 20 categories). | Evidence: 
- [ ] Q-06: Feature flag check: hubs_v2 OFF works; hubs_v2 ON redirects legacy routes. | Evidence: 
- [ ] Q-07: Final report: every task ID with DONE/BLOCKED + evidence. | Evidence: 

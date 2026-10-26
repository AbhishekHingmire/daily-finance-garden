WEALTHTRACK ROUND 2 SPEC (SPEC_R2)
SPEC_R1 (previous prompt: Sections 0-5 data rules, Pages 1-11) stays binding wherever this spec is silent. If they conflict, R2 wins.

=====================================================================
0. EXECUTION PROTOCOL (mandatory; violating any rule = task failed)
=====================================================================
EP1. First action: create docs/redesign/CHECKLIST.md. Copy EVERY task ID in this spec into it, one line each, status [ ]. Do not summarise or merge tasks.
EP2. Execute tasks strictly in ID order within each phase. Phases run 1 to 6 in order. Never skip a task. Never write "similar for other pages", "etc." or "and so on" as a substitute for doing the work; every page/viewport named must be done individually.
EP3. A task is DONE only when its "Done when" condition (or its stated behaviour) is verified AND evidence is written next to it in CHECKLIST.md (files changed, test name, or screenshot path). No evidence = not done.
EP4. If a task is impossible or ambiguous, mark BLOCKED with the exact reason, continue with independent tasks, and list all BLOCKED items in the final report. Do not silently drop, simplify or reinterpret a task. Do not ask me questions between phases; make the best decision consistent with this spec and note it.
EP5. Commit after each task (if git exists) with message "R2 <task-id>: <summary>".
EP6. End of every phase: run lint, typecheck, unit tests, e2e tests; save screenshots of every page touched at the 7 viewports in Q-01 to docs/redesign/screens/phase-N/; update CHECKLIST.md; print a table: task ID | status | evidence. Fix failures before the next phase.
EP7. At the start of each phase re-read that phase in SPEC_R2.md (do not work from memory).
EP8. Final step: completeness audit. Re-read SPEC_R2.md top to bottom; for every task ID confirm it is in CHECKLIST.md with status DONE or BLOCKED+reason. Any ID missing or marked DONE without evidence = go back and do it. Only then post the final report.
EP9. Do NOT: remove any feature/field/calculation (relocate, collapse, relabel only); change route paths; add UI libraries without checking the stack (exception: Playwright as a dev dependency if no e2e runner exists); compute any metric outside the shared selectors; silently alter user data.
EP10. IGNORE (screenshot-tool artifacts, do not "fix"): duplicated sections inside modals, sidebar ending mid-page in full-page captures, floating button appearing mid-page in tall captures.

Seed-data values that must hold on EVERY screen for Oct 2026 (use as e2e snapshot):
Money in 1,00,250 | Money out 79,342 (incl. EMIs 45,050) | Saved 20,908 (21%) | Needs 71,981 (72%) | Wants 7,361 (7%) | Savings 21% | Cash 4,99,689 | Investments 4,82,500 | Lent out 10,000 | Total assets 9,92,189 | Loans 32,32,970 | Net worth -22,40,781 | EMI load 45% | Budget used 71% (79,342 of 1,12,000) | Set aside for goals 5,30,000 (short by 30,311 vs cash).
Categories: Loan EMI & Debt 45,050 (cap 45,000, over) | Housing 22,000 | Shopping 4,699 | Food & dining 4,642 | Transport 1,312 | Bills & utilities 999 | Health 640 | Entertainment 0. Income: Salary 85,000 | Freelance 14,500 | Other income 100 | unaccounted 650 (see 1.10).

=====================================================================
PHASE 1: DATA TRUTH (no visual work until all done)
=====================================================================
1.01 Create <Metric id value format/> component. It renders the value with data-metric="<id>" data-value="<raw number>". Every figure in this list MUST render through it, on every screen: cash, total_assets, total_debt, net_worth, money_in, money_out, saved, savings_rate, needs_amt, wants_amt, needs_pct, wants_pct, savings_pct, runway_months, emergency_cover_months, emi_load_pct, budget_used_pct, goals_set_aside, free_to_spend, lent_out, invested, portfolio_value, monthly_emi_total, category_total:<id>, account_balance:<id>, loan_outstanding:<id>, goal_current:<id>.
1.02 Reports/Insights: delete all local calculations; read selectors only. Done when: Saved = 20,908 (21%); Money out = 79,342 (donut centre, hero, list); Money Lent / Advances removed from the donut; 50/30/20 = 72/7/21 with 71,981 / 7,361 / 20,908; the split bar sums to exactly 100%; Total inflows row equals the sum of the rows listed above it.
1.03 Budgets page: read the budget engine only. Done when: Shopping 4,699; Loan EMI & Debt 45,050 of 45,000 (red, shows "Over by ₹50"); Salary 85,000; Freelance 14,500; Other income 100; and the top card (79,342 of 1,12,000, 71%) equals the sum of capped-category rows.
1.04 Reclassify Loans & Borrowings, Money Lent / Advances and Debt Recovery as kind=transfer (SPEC_R1 Section 1). Budgets tabs become Expense (8) | Income (4) | Transfers (3). Remove the "All" tab. Transfers never count in budgets, Money in/out or 50/30/20. Existing entries migrate idempotently; nothing is deleted.
1.05 Transactions summary line: replace "TOTAL: +₹10,908" with "In ₹1,00,250 · Out ₹79,342 · Net +₹20,908" plus "Transfers ₹10,000 (not counted)" when transfers exist in the filtered list. Applies to desktop and mobile. Net is computed by the selector for the filtered list.
1.06 Transactions EMI info row: remove "Total Outstanding"; show "2 loans · ₹45,050 EMIs paid this month ›" linking to Wealth › Loans.
1.07 Account balances: every account balance (cards, rows, detail) = opening + ALL posted entries touching it, including both legs of transfers (lend, recover, invest, prepay). Done when: the sum of account cards equals Cash (4,99,689) and the account the ₹10,000 was lent from shows 10,000 less than today. If the lend entry has no source account, make source account mandatory for every transfer and flag the entry in "Review items" instead of guessing.
1.08 Net worth: show "Net worth −₹22,40,781" on Home hero (small link) and as the hero number on Wealth › Accounts (Assets 9,92,189 and Loans 32,32,970 as sub-values). Add this line under it: "Your loans are counted in full; a home or car you own isn't tracked as an asset yet."
1.09 Loans total (32,32,970) and per-loan outstanding identical on Loans, Accounts, Insights › Debt, Home link. Reports currently shows 28,40,000 / 4,20,000 / 32,60,000: fix.
1.10 Fix failing check I3. Find the ₹650 income that is in Money in but in no income category (likely on page 2 of Transactions). Assign or require a category; add a rule that an entry cannot be saved without a category; list any such existing entries in "Review items".
1.11 Cumulative chart (Insights › Cash flow): starts at 0 on day 1 unless entries exist; runs through today (26 Oct) with a flat line after the last entry; the "Today" tag appears only on today's date (currently 22 Oct is tagged Today); the end value equals Saved 20,908 (transfers excluded).
1.12 Cash runway and Emergency cover: the ⓘ tip must show the basis, e.g. "₹4,99,689 ÷ ₹X/month essentials (average of last N months)". Show N and X using the real values. If X differs from this month's Needs by more than 25%, add "Based on N months of history" in the tip. Never show a runway without a visible basis.
1.13 Goals vs cash: replace "Earmarks exceed current liquid balance by ₹30,311" with "Your goals add up to ₹30,311 more than your cash." Replace "−₹30,311 free to spend" with "Free to spend ₹0 · short ₹30,311". When earmarks fit: "₹X set aside for goals · ₹Y free to spend".
1.14 Date formatting: one formatDate(date, userPref) util. Display default "26 Oct 2026". Remove ISO strings from the UI ("2026-11-19" in the payday chip becomes "Payday 19 Nov · in 24 days"). Date inputs display per the Preferences format (DD/MM/YYYY uses "/", never "-"). Replace every ad-hoc date format in the codebase.
1.15 Money formatting util: Indian grouping; negatives as "−₹22,40,781" (U+2212 before ₹; never "₹-"); chart ticks "−₹18k", "₹1L"; tabular numerals. Fix the "₹-" in the Data check popup and chart axes.
1.16 Cross-screen e2e test (Playwright): for period Oct 2026, visit Home, Transactions, Wealth (all 3 tabs), Plan (all 3 tabs), Insights (all tabs), Profile; collect every [data-metric]; assert same id gives same value on every route; assert the seed values above. Also assert: account cards sum = Cash; per-loan outstanding sum = Loans total.
1.17 CI guard script scripts/check-no-local-metrics: fails the build if any file under screens/pages/components reduces/sums ledger entries outside the selectors module.
1.18 Data check panel (Preferences › Data & Storage). Rename "System Data Health & Ledger Invariants" to "Data check". Remove the words "Section 0", "I1-I16", "canonical ledger invariants" from all UI copy. Each row: plain title, ✓/✗, "Expected vs shown", a "Fix" button for failures. Show ALL checks (I1-I16 plus new U1 screens agree, U2 accounts add up to cash, U3 loans add up everywhere). Done when all pass on seed data. If any check fails in production, show an amber dot on the avatar menu entry "Data check".
1.19 Replace the word "ledger" in all user-facing copy with "transactions". Replace "receivables" under Money in with "Salary, freelance & other income".

=====================================================================
PHASE 2: APP SHELL AND LAYOUT
=====================================================================
2.0 Breakpoints (use everywhere): xs 360-479, sm 480-767, md 768-1023, lg 1024-1439, xl 1440+.

2.1 FIXED TOP BAR (all sizes). The top bar currently scrolls away. Investigate the root cause first (header not fixed/sticky, an ancestor with overflow/transform/contain, or a nested scroll container) and note it in CHECKLIST.
   - Use ONE scroll container: the window/document. No nested page-level scroll areas (only modals, dropdowns, table overflow-x).
   - Desktop lg+: sidebar position:fixed; top:0; left:0; width:248px; height:100dvh; overflow-y:auto. Top bar position:fixed; top:0; left:248px; right:0; height:64px; solid background (no transparency), 1px bottom border. Main: margin-left:248px; padding-top:64px.
   - Tablet md: icon rail 72px wide, same fixed pattern.
   - Mobile <768: top bar fixed; top:0; height:56px plus env(safe-area-inset-top). Bottom nav fixed; bottom:0; height:64px plus env(safe-area-inset-bottom). Main padding-top and padding-bottom equal those heights so nothing hides underneath. Use 100dvh, not 100vh.
   - Set html scroll-padding-top to the total sticky height.
   - Done when e2e test: at every viewport in Q-01, scroll to the bottom of Home, Transactions, Budgets, Insights; the top bar bounding box top = 0 and is visible; the bottom nav (mobile) bottom = viewport bottom; the last content element is fully visible above the bottom nav.
2.2 Z-index tokens: sidebar 40, subnav 45, topbar 50, sheet 60, modal 70, toast 80. No other z-index values in the codebase.
2.3 PageContainer used by EVERY page: max-width 1280px content area, centred, gutters 16px (<768), 24px (md), 32px (lg+). No page sets its own max-width. Delete page-level width clamps (e.g. the Budgets subtitle).
2.4 PageHeader used by EVERY page, same vertical order:
   (1) top bar → (2) sub-nav row if the page has tabs (hub tabs, Insights tabs): sticky directly under the top bar → (3) title row: H1 + one-line purpose; right slot = PeriodPicker (period pages) OR "As of today · 26 Oct 2026" caption (balance pages) + at most ONE primary action + "⋯" menu → (4) page content.
   Sticky stack rule: top bar always fixed; plus exactly one sticky row below it: the sub-nav if present, otherwise the page toolbar (Transactions) or PeriodPicker. Never stack more than two sticky rows.
   Hub pages currently put tabs above the title and Reports puts tabs below the filter card: make all identical to the order above.
2.5 Mobile vs desktop PARITY (do each; evidence = side-by-side screenshots at 390 and 1440):
   a) Home Money in / Money out / Saved: one row of 3 compact tiles at ALL widths (mobile currently stacks 3 full-width cards).
   b) Home hero: the same data on both (desktop shows Investments, mobile does not). Put the investments figure in the net-worth tip on both.
   c) Transactions rows: both show title, merchant, category, account, date, amount, chips. Mobile groups by date headers (Today / Yesterday / 20 Oct).
   d) "Auto" chip appears only on desktop: replace on both with a ↻ icon (tooltip "Posted automatically").
   e) Insights tabs: 5 tabs on both; mobile tabs scroll horizontally with the active tab scrolled into view and a right edge fade (currently "Spending Allocat…" is clipped).
   f) Transactions page-size select shows "1" on mobile (clipped); desktop pagination is clipped at the right edge ("Next ›", "Last »"). Fix both; mobile uses infinite scroll.
   g) Profile Save button is hidden by the floating button on desktop, floating on mobile. Both: sticky footer bar that appears only when there are unsaved changes.
   h) Profile "Phone Number" label is a different colour on mobile only. Make all labels identical, and use error colour only with error text.
   i) Budgets: desktop 3-column cards, mobile tall cards. Both use compact rows (see P-01); 2 columns at lg+, 1 column below.
2.6 Naming (single source: one NAV_ITEMS config feeding sidebar, icon rail, mobile drawer, bottom nav, breadcrumbs, page H1). Label = breadcrumb = H1:
   Home (was Overview / Dashboard) | Transactions | Wealth (was Wealth Hub) → tabs Accounts / Investments / Loans | Plan (was Plan Hub) → tabs Budgets / Goals / Recurring | Insights (was Reports & Insights / Reports & Analytics). H1 for Budgets tab is "Budgets" (was "Budgets & Categories"). Routes do not change.
   Global label replacements (search whole codebase): "Add Transaction", "New Transaction", "Quick Add Transaction" → "Add transaction". "50/30/20 Classification" → "Need or want?". See the glossary in 3.10 for metric labels.
2.7 Mobile navigation: bottom nav = Home | Transactions | [+ Add] | Wealth | Plan. The hamburger stays but opens a drawer generated from NAV_ITEMS (Home, Transactions, Wealth, Plan, Insights, then Preferences, Profile, Help); the drawer is the route to Insights on mobile. Pages outside the bottom nav (Insights, Profile, Preferences, Help) show a back arrow plus the page title in the top bar so location is never unclear.
2.8 ONE add entry point. Remove the floating "New Transaction" button on desktop/tablet (it overlaps content on Dashboard, Reports, Transactions pagination and Profile Save). Replace with a primary "+ Add" button in the top bar (and at the top of the sidebar), shortcut N. Mobile keeps the centre + button. Remove page-level "Add Transaction" and "Transfer" buttons (Transactions, Accounts). Page-level primary actions remain only for other things (Add account, Add category, Add loan, Add investment, Add goal, Add schedule). Remove the dashed "Add new…" tiles on every page (Accounts, Budgets, Investments, Loans, Goals, Recurring).
2.9 Top-bar search: width ≥320px on desktop; placeholder "Search transactions, accounts…" fully visible; ⌘K / Ctrl+K; full-screen overlay on mobile. Same truncation fix for the Transactions search placeholder ("Search description, i…").
2.10 Sidebar footer: replace the long "100% Offline & Private … access Profile and Preferences from the top-right" card with two visible links (Preferences, Profile) and a one-line "Your data stays on this device" linking to Help. Keep the avatar menu entries too.

=====================================================================
PHASE 3: SHARED COMPONENTS
=====================================================================
3.01 PeriodPicker (ONE component, used on Home, Transactions, Budgets, Insights):
   - Trigger: single pill "‹  Oct 2026 ▾  ›". Height 44px on mobile, 40px desktop. Prev/next arrows step by the current mode's unit. Next is disabled at the current month.
   - Tapping the label opens a popover (desktop) / bottom sheet (mobile) with a segmented control Month | Year | Custom.
     Month: year header with arrows plus a 12-month grid. Year: year list; label shows "2026". Custom: From/To date inputs plus presets: This month, Last month, Last 3 months, This financial year (Apr-Mar), Last financial year.
   - Label text: "Oct 2026", "2026", "1 Oct – 15 Oct 2026".
   - Delete everywhere: year stepper, native month <select>, "All 2026" / "Custom" buttons, bold "October 2026" status label, the static "October 2026" chip on the Budgets card.
   - State: one shared store (SPEC_R1 E25); mirrors to URL (?period=2026-10 | 2026 | from=...&to=...) and localStorage; deep links work; survives reload and navigation.
   - Position: right slot of the PageHeader title row on desktop; first row under the sub-nav on mobile, full-width.
   - Non-period pages (Accounts, Investments, Loans, Goals, Recurring, Profile, Preferences) show the non-interactive caption "As of today · 26 Oct 2026" in the same slot.
   - Every period-dependent label derives from the picker (tile labels, "71% of total budget used in Oct 2026", chart titles). Non-month ranges: budget caps scale by the number of months in range.
   - Done when e2e: change period on Home, open each period page, same value shown; reload keeps it; deep link opens it; no other date control exists on any period page.
3.02 AddEntrySheet (ONE component for every add entry point: top-bar +, sidebar +, mobile centre +, keyboard N, "Pay EMI", "Add money", Account detail, empty-state CTAs). Desktop: centred modal, max-width 560. Mobile: bottom sheet ≤92dvh, sticky footer, safe-area padding, keyboard-aware. ESC/X closes; focus trap; scroll lock.
   Layout, in this order:
   (1) Segmented: Expense | Income | Transfer. A "More ▾" row adds Invest, Pay loan, Lend, Recover, Borrow (SPEC_R1 E5-E17).
   (2) Amount: large, autofocus, inputmode=decimal, NO spinner arrows, label "Amount" (not "Amount to Pay").
   (3) Category (required; NO silent default; show 4 suggested chips from recent use; "+ New category" inside the picker).
   (4) Account (default from Preferences). Transfer shows From → To.
   (5) Date (default today; shown per user format; native picker).
   (6) "More details" collapsed: Note, Merchant/Payee, "Need or want?" (inherits category, overridable).
   (7) "Repeat" toggle (creates a schedule).
   Footer: primary "Save", secondary "Save & add another". Desktop right-aligned; mobile full-width stacked. No separate Cancel row. Primary label changes with type ("Save expense", "Save income", "Save transfer").
   Select labels are plain and never truncated: "Expense", not "Expense (Money spen…".
   Shortcuts row (Pay Loan EMI, Groceries & Food, Bills…): no visible scrollbar; edge fade. "Pay Loan EMI" MUST open the E6 Pay EMI flow (loan picker, installment prefilled, disabled if already paid), never a plain expense, to prevent double-debit.
   Done when: Add sheet opened from Home, Transactions, Insights, Wealth, Plan on desktop and mobile is the identical component; e2e creates an expense, income, transfer and a loan EMI from it; no other transaction form exists in the codebase.
3.03 Chips: Need/Want = neutral outline (no green/amber: green means good, amber means warning). Type chips EMI / SIP / Transfer. Status chips Active / Due / Paid. Remove "Expense" and "Income" chips inside Budgets rows (the tab already says it), "Auto" (see 2.5d), and any decorative chip.
3.04 ProgressBar: one colour rule used on Home Top spending, Budgets, Goals: green <75%, amber 75-100%, red >100% (with "Over by ₹X" text). Home currently shows Shopping blue while Budgets shows it green.
3.05 InfoTip ⓘ next to every metric label (copy in 5.02). Tap/hover shows: plain definition, live formula with numbers, "See the entries" link.
3.06 EmptyState: friendly line + one CTA. Used when a list/metric has no data; never show repeated "₹0 / 0%" cards (use "Not used this month (n)" collapse in Budgets).
3.07 Remove dead rows: "Available Funds" on account cards (no value), "Current Balance" labels, per-row "⋯" menus where SPEC_R1 says rows are tappable. Whole row opens detail.
3.08 ChartCard: ≤4 y-ticks; tooltip on tap/hover only (remove the default "26 October 2026 · Today +₹0 −₹0 Net ₹0" strip); x-axis labels never overlap (fix "Day 26" garbling); no inner scroll boxes; one chart per card.
3.09 Typography/spacing: minimum 12px anywhere; 8pt grid; card radius 16, 1px border; one hero gradient per page. Document tokens in docs/redesign/TOKENS.md.
3.10 Label glossary: replace across the whole codebase:
   Net Surplus Retained / Retained / Net Velocity Flow / Net Savings Retained → Saved
   Period Inflows / Total Inflows / Cash Inflows (Incoming) → Money in
   Period Outflows / Total Outflow / Cash Outflows (Outgoing) → Money out
   Consolidated Assets & Wealth → Total assets
   Debt (Liabilities) → Loans
   Earmarks / Earmarked → Set aside for goals
   Liquid cash / liquid balance / Liquid Runway Buffer → Cash / Cash runway
   Cash Flow Velocity (Chart/Breakdown) → Daily money in & out
   Cumulative Net Cash Flow Trend → Running total (month so far)
   Expense Allocation Donut → Where your money went
   50/30/20 Diagnostic / Rule Check / Discipline → Needs, wants & savings
   Investment Deployment / Capital Deployed → Investments
   Debt & Loan Servicing → Loans & EMIs
   Income Streams → Where your income came from
   Remove chips "Donut Chart", "Cumulative Trend", "Day-by-Day Flow", "Rule Check", "Verified Local", "Goals", "Auto" (header chip).

=====================================================================
PHASE 4: PAGES (each page: desktop AND mobile; both screenshotted)
=====================================================================
HOME
H-01 Title "Home". Purpose: "Your money today: what you have, what you spent, what's next." PeriodPicker in the right slot. Remove the subtitle that mentions "ledger".
H-02 Hero (only gradient card): "Cash available ₹4,99,689" with the ⓘ tip. Sub-line "Net worth −₹22,40,781 ›" (links to Wealth › Accounts). Second line per 1.13. Remove the "Cash available" chip, "in bank, cash & wallets" text, the "View Wealth Hub" button and the desktop-only Investments block; the whole card is tappable.
H-03 Month strip: 3 tiles in one row at all widths: Money in +₹1,00,250 | Money out −₹79,342 ("incl. ₹45,050 EMIs") | Saved ₹20,908 ("21%"). Tile label shows the period ("Oct 2026"). Remove "Tap any tile to inspect entries"; each tile has a chevron and opens filtered Transactions.
H-04 Health card (title "Monthly health"): verdict line "Saving 21% of income. Your target is 35%." One 3-segment bar Needs 72% / Wants 7% / Saved 21% with a legend row beneath. 4 chips with ⓘ: Cash runway, Emergency cover, EMI load, Budget used. "See insights" link in the title row on both mobile and desktop.
H-05 Coming up: next 3 dated items from recurring + EMIs + SIPs (date badge, name, "in 10 days · EMI", signed amount), "See all N" link. Footer line: "Due in the next 30 days: ₹X out · ₹Y in" (sum of ALL scheduled items in 30 days, not just the 3 shown). Replace "Total monthly commitments ₹1,11,049" here (that figure belongs on Plan › Recurring with its 4-line breakdown). Payday line per 1.14. Verify the ₹10,000 Parag Parikh SIP appears here and in Recurring; if no SIP is configured, Recurring shows "No SIPs set up" with a CTA.
H-06 Top spending: top 3 with ProgressBar 3.04; line "71% of budget used"; "Over by ₹50" on Loan EMI & Debt; "See all" → Plan › Budgets.
H-07 Recent activity: last 4 rows: icon, title, subtitle "Category · Account", amount, neutral Need/Want chip. One line per row on desktop too (remove the 4-column spread and the duplicate category text).
H-08 Accordions: "Goals · 3 active · ₹43,000/month set aside" and "Daily money in & out" (chart). Chart open by default on desktop, closed on mobile.
H-09 Desktop lg+ grid: left 8 columns = hero, month strip, health, chart; right 4 columns = coming up, top spending, recent, goals accordion. DOM order = mobile order: hero, strip, health, coming up, top spending, recent, goals, chart.
H-10 Mobile: hero, strip and health fit in the first two screens; no horizontal overflow at 360.

TRANSACTIONS
T-01 H1 "Transactions". Purpose: "Every rupee in and out. Tap a row for details." Right slot: PeriodPicker + "⋯" (Bulk import, Export CSV). Remove the Bulk Import, Export CSV and Add Transaction buttons.
T-02 One sticky toolbar: Search | Filters (n) | Sort. Filters open a sheet (Type: Income/Expense/Transfer/Investment/EMI/Goal allocations/Scheduled; Need or want; Category; Account; Apply/Reset). Applied filters show as removable chips beneath.
T-03 Summary line per 1.05. EMI row per 1.06.
T-04 Desktop table columns: Date 110px | Description (flexible: title, merchant beneath) | Category 180 | Account 180 | Amount 140 right-aligned. Row height 56. Remove the large empty gap between Description and Category. Sticky header. Checkbox visible on hover or in select mode. Row ⋯ menu on hover only.
T-05 Mobile list: grouped by date; row shows icon, title (wraps to 2 lines, no "Oct…" ellipsis), "Merchant · Category · Account", amount, chips. Swipe left = delete, swipe right = edit; long-press = multi-select. Remove radio circles and per-row ⋯.
T-06 Pagination per 2.5f. Page-size select shows its full value.
T-07 Row tap opens detail (sheet on mobile, side panel on desktop): all fields, edit, delete, duplicate; automatic entries show "From: Home Loan · installment 29 of 180" with a link; deleting asks the SPEC_R1 E8 confirmation.
T-08 Transfer rows show "A → B" in neutral colour with no +/− sign (including the ₹10,000 lent).

WEALTH
W-01 Hub tabs (Accounts n | Investments n | Loans n) follow 2.4; identical on mobile and desktop; remember last tab.
W-02 Accounts hero per 1.08 (net worth hero, Assets/Loans sub-values, tappable rows Cash / Investments / Lent out / Loans, simple Assets-vs-Loans bar). Remove "Consolidated Assets & Wealth", the four sub-cards and the multi-colour percentage bar.
W-03 Account rows grouped Bank accounts / Cash & wallets / Credit cards (when present): logo, name, "HDFC Bank · 4281", balance right-aligned; whole row opens account detail (entries, opening balance edit). Remove "Current Balance", "Available Funds", "View Details →".
W-04 Header: one primary "+ Add account". Remove Transfer button (now in AddEntrySheet) and the dashed tile.
W-05 Investments: audit against SPEC_R1 PAGE 4 and apply every item; Done when allocation legend lists all 5 types summing to 100%, SIP appears in Recurring and Home › Coming up, and numbers match Insights › Wealth.
W-06 Loans: audit against SPEC_R1 PAGE 5; Done when outstanding = 32,32,970 total, "Pay EMI" disabled with "Paid for Oct" when posted, and the 1.09 values match.

PLAN
P-01 Budgets: H1 "Budgets". Purpose: "Set monthly limits and see how much you've used." PeriodPicker in the right slot. Top card "₹79,342 of ₹1,12,000 · 71% used" + "Not budgeted ₹X" when relevant. Tabs per 1.04. Expense rows (compact, 2 columns at lg+, 1 below): icon, name, "₹4,642 of ₹12,000", bar per 3.04, neutral Need/Want text; sorted by % used descending; zero-spend rows collapse under "Not used this month (n)". Income rows: name + amount received, no bars. Transfers rows: name + net amount. Tap a row → sheet (edit cap, default Need/Want rule "category default, overridable per entry", entries). Remove per-card ⋯ and the dashed tile. Header primary "+ Add category". Fix category defaults so Entertainment and Shopping default to Want.
P-02 Goals: audit against SPEC_R1 PAGE 6. Emergency fund appears once (hero) from the single Goal object; Profile and Home read it; "covers N months" uses the 1.12 basis.
P-03 Recurring: audit against SPEC_R1 PAGE 7. Summary card with 4 lines (Bills & recurring, EMIs, SIPs, Goal contributions) + total; the total equals what Home and the data check use; EMIs and SIPs appear as read-only mirrors with "Edit in Loans / Investments".

INSIGHTS
I-01 H1 "Insights". Purpose: "Understand where your money went and how you're doing." PeriodPicker in the right slot + "Compare with last month" toggle (▲▼ chips) + "⋯" (Export CSV). Remove the Filters card.
I-02 Tabs (5, in this order, one theme each, no section repeated in two tabs): Summary | Spending | Cash flow | Wealth | Debt. Delete "Overview & All", "50/30/20 Discipline", "Income & Debt", "Wealth & SIPs", "Spending Allocation".
I-03 Summary: hero "Saved ₹20,908 (21%)"; "Where your savings went" (sums to Saved: kept in cash ₹10,908 + lent out ₹10,000); plain-language insight card ("EMIs are 45% of your income. Needs are 72% against a 50% guideline. To reach your 35% savings target, spend ₹X less."); Needs/Wants/Saved as 3 horizontal bars with a target tick (replaces the three rings and the text-only "Adjustments Recommended"); "Expected cash at month end".
I-04 Spending: donut with the centre label fixed so "Money out ₹79,342" fits inside the inner circle (inner diameter ≥100px, no overlap with the ring on mobile or desktop); legend as a plain full list below (no inner scroll box, no "Scroll for more"); each row opens filtered Transactions; transfers excluded.
I-05 Cash flow: ONE chart with toggle Daily | Running total (delete the second stacked chart and the ↗ expand icons); fix per 1.11 and 3.08; "Where your income came from" list lives here.
I-06 Wealth: net-worth hero, change breakdown (Saved + principal repaid + investment gain), contributions this month, top 3 holdings + "See all" (no inner scroll box; the Tata Motors row is currently cut off).
I-07 Debt: EMIs paid, interest vs principal, EMI load, outstanding per loan (equal to Loans page), "Lent out ₹10,000" with link.

PREFERENCES AND PROFILE
PR-01 Preferences: audit against SPEC_R1 PAGE 10. Mobile grouped list; desktop left sub-nav; plain option labels (no "(Clean crisp surfaces)", "(Standard financial cycle)"); theme Light/Dark/System; autosave with toast. Data & Storage hosts the Data check (1.18).
PF-01 Profile: replace placeholders (demo@wealthtrack.app, "Senior Product Designer & Engineer", +91 98765 43210) with the real user's values or empty fields with hints; remove "Verified Local" and the Risk/Savings-target chips.
PF-02 Remove the "Emergency Fund Readiness 121% / Current Liquid ₹1,81,700" card. Emergency fund fields read and write the single Goal object; add the link "View in Goals".
PF-03 The four stat tiles become one row of 4 shortcuts (Accounts, Transactions, Holdings, Categories). "15 Spending categories" is wrong (includes income and transfer): label "Categories".
PF-04 Save: sticky footer bar visible only when edits are unsaved; never overlaps other controls at any width.

=====================================================================
PHASE 5: UNDERSTANDING A NEW USER IN 1-2 MINUTES
=====================================================================
5.01 Purpose line (≤12 words) directly under every H1, exact copy: Home / Transactions / Budgets / Insights as in H-01, T-01, P-01, I-01. Others: Accounts "Where your money is kept right now." | Investments "What you've invested and how it's doing." | Loans "What you owe and how much you've repaid." | Goals "Money you're setting aside for things that matter." | Recurring "Bills, EMIs, SIPs and salary that repeat." | Preferences "Display, defaults and data." | Profile "Your details and money targets."
5.02 InfoTip copy (use verbatim; fill live numbers):
   Cash available: "Money you can spend now: bank balances + cash + wallets."
   Net worth: "What you own minus what you owe. Assets ₹X − loans ₹Y."
   Money in: "Salary, freelance and other income received this period."
   Money out: "Everything you spent, including EMIs. Transfers and investments are not spending."
   Saved: "Money in minus money out. It stays as cash, investments or money lent."
   Needs / Wants / Saved: "Needs: essentials and EMIs. Wants: optional spending. Guideline 50 / 30 / 20 of income."
   Cash runway: "How many months your cash lasts at your average essential spending."
   Emergency cover: "How many months your emergency fund covers at that same spending."
   EMI load: "EMIs as a share of income. Lenders usually prefer under 40-50%."
   Budget used: "Spent in budgeted categories divided by their monthly limits."
   Set aside for goals / Free to spend: "Goals are labels on your cash, not separate accounts. Free to spend = cash − set aside."
   Coming up: "Bills, EMIs and SIPs due in the next 30 days."
5.03 First-run tour (shown once; stored in local storage; reopenable from Help): 4 steps with highlight and "Next": (1) "Add your accounts" → Wealth › Accounts. (2) "Add transactions with + Add. EMIs, SIPs and bills post automatically once set up in Loans, Investments or Recurring." (3) "Set budgets and goals" → Plan. (4) "Read Home for today, Insights for why." Skip and Back always available.
5.04 Help ("?" icon in the top bar, desktop and mobile; also in the drawer): a drawer with three parts. (a) "Where do I…?" table: Add an expense → + Add; Move money between accounts → + Add › Transfer; Add a loan → Wealth › Loans; Auto-pay a bill → Plan › Recurring; Lend money → + Add › More › Lend; Set a monthly limit → Plan › Budgets; Save for something → Plan › Goals; See why I overspent → Insights › Spending; Export data → Transactions ⋯. Every row is a link. (b) "How your numbers connect": a simple diagram: Transactions → balances, budgets, Insights; Loans / Investments / Recurring → create transactions automatically → everything updates. (c) Glossary of the Phase 3.10 terms.
5.05 Empty states (3.06) for: Home with no data, each Wealth tab, each Plan tab, Transactions with filters returning nothing (with "Clear filters"), Insights with no data in the period.
5.06 Add sheet helper text: Transfer = "Moving your own money. Not counted as spending." Invest = "Counts toward Saved, not Money out." Lend = "You'll get this back. Not counted as spending."
5.07 Alerts (bell) use plain sentences with the amount and date, each linking to its source ("Everyday account may be short for the 10 Nov EMI of ₹30,850").

=====================================================================
PHASE 6: RESPONSIVE QA AND FINAL AUDIT
=====================================================================
Q-01 Viewports: 360x740, 390x844, 768x1024, 1024x768, 1280x800, 1440x900, 1920x1080. Also 844x390 (phone landscape).
Q-02 Playwright suite runs on all pages x all viewports in Q-01 and asserts: no horizontal page scroll; no element with scrollWidth > clientWidth whose text is clipped without a tooltip/title (catches "Search worksp…", clipped selects, clipped tabs); top bar fixed (2.1); one sticky row max below it; PageContainer max-width honoured; every [data-metric] consistent (1.16).
Q-03 Page-by-page parity sign-off: for Home, Transactions, Accounts, Investments, Loans, Budgets, Goals, Recurring, Insights (each tab), Preferences, Profile, record side-by-side desktop vs mobile screenshots and list any remaining difference in CHECKLIST.md. Every difference must be layout-only; data and actions must be identical.
Q-04 Accessibility: 44px touch targets, AA contrast, visible focus, keyboard: N = add, / or ⌘K = search, ESC closes overlays; Lighthouse accessibility ≥95 on Home, Transactions, Budgets, Insights.
Q-05 Stress data: ₹1,00,00,000 values, negative values, 0 transactions, 150+ transactions, very long names, 20 categories: no overflow, no layout shift.
Q-06 Feature flag: with hubs_v2 OFF the old navigation still works; with it ON the legacy routes redirect (SPEC_R1 Section 8). Confirm nothing in this spec broke either mode.
Q-07 Final report: for every task ID (EP8) a row: ID | DONE/BLOCKED | evidence. List all BLOCKED items with reasons. Include a before/after screenshot gallery path.

ACCEPTANCE (all must be true)
- Every [data-metric] id has one value across all screens; seed values match; Data check shows all passed.
- One PeriodPicker; one AddEntrySheet; one PageHeader; one PageContainer; one NAV_ITEMS config.
- Top bar visible at scroll bottom on every page and viewport in Q-01.
- A new user, in under 2 minutes using only the first-run tour, Help and ⓘ tips, can say where to add an expense, how to set up an EMI and what "Saved" means.
- Zero clipped labels, zero horizontal scroll, zero overlapping controls at 360px.

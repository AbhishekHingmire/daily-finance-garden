# Daily Finance Garden

Build WealthTrack: Fully Functional Frontend-Only Finance Management App



1. Project Objective



Build a polished, modern, mobile-responsive personal expense and wealth management web application named WealthTrack.



This is a frontend-only application. Do not create or connect any backend, database, server, API, Supabase, Firebase, real authentication provider or payment/banking integration.



Everything must work through frontend logic, realistic mock data, browser localStorage and simulated interactions. The app must feel like a real, usable product rather than a static design prototype.



Critical requirement: Every visible button, link, form, dropdown, filter, tab, modal, menu and action must work. No dead buttons, fake links, nonfunctional controls or unfinished placeholder screens.



2. Design System and UI/UX



Create a premium fintech SaaS interface with a clean, modern, professional appearance.



- Product name: WealthTrack.

- Default theme: white/light backgrounds, deep navy text and vivid blue primary actions.

- Use subtle borders, soft shadows, rounded cards and consistent spacing.

- Use a professional sans-serif font, consistent iconography and clear visual hierarchy.

- Use green for income/positive values and red for expenses/negative values.

- Use realistic charts, tables, summary cards, empty states, loading states and helpful tooltips.

- Create a consistent design system for buttons, inputs, dropdowns, badges, cards, tables, drawers, dialogs and notifications.

- Include light/dark theme switching if feasible.

- Do not overcrowd screens or use excessive gradients, oversized text or decorative animations.



Responsive behaviour



The app must work smoothly on desktop, tablets and mobile phones.



- Desktop: persistent sidebar, top header, spacious dashboard and tables.

- Tablet: compact navigation and adaptable grid layouts.

- Mobile: collapsible navigation or bottom navigation, stacked cards, touch-friendly controls, mobile-friendly forms and responsive transaction lists.

- Modals must fit mobile screens, with scrolling when necessary.

- Tables must adapt into readable mobile cards or responsive layouts.

- Never allow horizontal overflow on small screens.



3. Authentication Simulation



Create complete dummy authentication flows without real authentication.



Sign-in



- Email and password fields.

- Required-field validation and email-format validation.

- Password visibility toggle.

- Remember-me checkbox.

- Forgot-password link.

- Sign-in button.

- Google and Apple sign-in buttons that simulate success using a toast or informational dialog.

- Create-account navigation.

- Inline validation errors and loading feedback.



For demonstration, accept a documented demo account such as "demo@wealthtrack.app" with password "Demo123!", or allow any valid email and nonempty password with clear demo-mode messaging.



Sign-up



- Full name, email, password and confirm-password fields.

- Validate required fields, email format, password strength and matching passwords.

- Terms and privacy consent checkbox.

- Password visibility controls.

- Submit button with loading state.

- Simulated success and navigation to onboarding.

- Duplicate-email simulation using mock data.



Forgot password



- Email form.

- Validate email.

- Simulate sending a reset link and show a success notification.

- Include a return-to-sign-in action.



Session simulation



- Store mock session state in localStorage.

- Keep the demo user signed in after refresh.

- Protect authenticated screens through frontend routing.

- Implement sign-out confirmation and return to the sign-in screen.

- Clearly indicate that authentication is simulated and provides no real security.



4. Onboarding



Create a multi-step onboarding wizard with progress indication, Back, Next, Skip where appropriate and Finish actions.



Step 1: Welcome



Explain the app's expense tracking and financial overview features.



Step 2: Preferences



- Currency, default INR (₹).

- Date format.

- Language preference, initially English.

- Salary-credit day, optional.

- Week-start preference.

- Theme preference.



Step 3: Accounts



Let users add starting accounts such as bank accounts, cash and digital wallets, including opening balances.



Step 4: Categories



Display sensible default income and expense categories and allow users to customize them.



Step 5: Finish



Show a setup summary and navigate to the dashboard.



Persist completed onboarding state in localStorage. Allow users to change these settings later.



5. Main Application Navigation



Create these primary sections:



1. Dashboard

2. Transactions

3. Accounts

4. Categories

5. Reports

6. Settings



Include a global Add Transaction button, global search, notification menu, user profile menu and contextual page actions.



Each page must have working navigation and realistic mock data.



6. Dashboard



Display summary cards for:



- Total income.

- Total expenses.

- Net cash flow.

- Total account balance.



Include:



- Income-versus-expense chart.

- Spending-by-category chart.

- Monthly spending trend.

- Recent transactions.

- Account balance overview.

- Upcoming recurring transactions.

- Quick actions for adding expenses, income and transfers.



Add date-range filters and appropriate drill-down navigation.



Clicking a summary card or chart category must open a relevant filtered report or transaction list. Date changes must update the displayed mock data and calculations.



7. Transactions



Create a complete transaction management interface.



Transaction list



Display:



- Date.

- Description.

- Category.

- Account.

- Transaction type.

- Payment method.

- Amount.

- Actions.



Support:



- Search by description, merchant and notes.

- Filter by date range, transaction type, category, account, payment method and tags.

- Sorting by date, amount and description.

- Pagination or functional load-more behaviour.

- Select-all and individual selection.

- Bulk delete and bulk category reassignment.

- Add, view, edit, duplicate and delete transactions.

- CSV export and CSV import simulation.

- Empty states and clear-filter actions.



Add/Edit Transaction form



Create a reusable form with these fields:



- Date and time.

- Description.

- Transaction type: Expense, Income, Refund, Adjustment or Transfer.

- Amount.

- Category and subcategory.

- Account.

- Source and destination accounts for transfers.

- Payment method.

- Need versus want.

- Merchant or recipient.

- Tags.

- Notes.

- Recurring transaction option.

- Receipt attachment UI.

- Custom fields configured by the user.



Conditional form behaviour



- Expense: show source account and expense category.

- Income: show destination account and income category.

- Transfer: show source account and destination account, and hide category.

- Refund: show the relevant account and refund details.

- Adjustment: allow balance correction with a reason.



Validation



- Required fields must be validated.

- Amount must be a valid positive number where applicable.

- Source and destination accounts must differ.

- Account and category selections must be valid.

- Display clear inline errors.

- Prevent invalid submission.

- Show a success toast after saving.

- Provide Cancel and unsaved-changes confirmation.



Changes must update the transaction list, account balances, dashboard cards and reports immediately.



Transaction details



Open a detail drawer or child screen with all transaction information and working Edit, Duplicate and Delete actions.



Delete confirmation



Display the transaction description and amount, with Cancel and Delete buttons. Deletion must update all dependent frontend views.



8. Accounts



Support mock accounts of types:



- Bank account.

- Cash.

- Digital wallet.

- Credit card.

- Other account.



Create the following screens and interactions:



- Accounts overview.

- Add-account modal.

- Edit-account modal.

- Account detail screen.

- Account transaction history.

- Transfer money modal.

- Opening balance setup.

- Balance reconciliation modal.

- Archive-account confirmation.



Account fields should include name, type, institution, optional account identifier, currency, opening balance and notes.



Implement frontend balance calculations. Expenses decrease the source account; income increases the destination account; transfers decrease one account and increase the other.



Transfers must never count as income or expenses.



When an account is referenced by transactions, warn users before archiving or deleting it. Do not silently destroy related history.



9. Categories, Subcategories and Tags



Create separate income and expense category views.



Features:



- Add, edit, archive and delete categories.

- Create and manage subcategories.

- Configure category name, icon, colour and optional monthly limit.

- Reorder categories.

- Search and filter categories.

- Display category usage counts.

- Create and manage custom tags.

- Assign categories and tags to transactions.



When deleting a category that is already used, show a confirmation dialog and offer reassignment to another category or archival instead.



Custom transaction fields



Provide a simple field builder supporting:



- Text.

- Number.

- Date.

- Dropdown/select.

- Checkbox.



Allow field name, options and required/optional configuration. Custom fields must appear in the Add/Edit Transaction form and be stored with mock transactions.



10. Reports



Create a Reports section with:



- Expense report.

- Income report.

- Cash-flow report.

- Category breakdown.

- Account summary.

- Monthly and yearly trends.

- Custom date-range reports.



Provide working date filters, category filters, account filters, chart interactions and transaction drill-down.



Calculations must use the current mock transaction data, not hardcoded totals disconnected from the transactions.



Allow CSV export of filtered report data and show a download-success notification.



11. Recurring Transactions



Create a recurring transaction manager with:



- Recurring transaction list.

- Add/edit recurring template.

- Frequency selection: weekly, monthly, yearly or custom interval.

- Start date and optional end date.

- Next scheduled date.

- Enable/disable controls.

- Delete confirmation.

- Upcoming transaction reminders.



In this frontend-only demo, simulate scheduled behaviour and reminders. Do not claim that background jobs or actual automatic bank transactions exist.



12. Settings



Create working settings pages for:



General



Currency, date format, language, week start and theme.



Salary cycle



Salary-credit day, salary-cycle display and relevant reporting preferences.



Transaction preferences



Default transaction type, default account, default payment method and optional confirmation settings.



Notifications



Enable or disable simulated reminders for recurring transactions, budget thresholds and other supported events.



Data management



- Export mock data.

- Import CSV files.

- Preview import rows.

- Validate file columns.

- Show invalid rows and error messages.

- Confirm before applying an import.

- Prevent accidental duplicate imports where feasible.

- Reset demo data with a strong confirmation dialog.



Privacy and session



Show that this is a local demo without a backend. Include sign-out and local demo-data reset actions.



Persist preferences in localStorage.



13. Global UI Components



Build reusable components for:



- Primary, secondary, danger and icon buttons.

- Text, email, password, number and date inputs.

- Select menus, searchable dropdowns and multi-select controls.

- Date-range picker.

- Tooltips.

- Toast notifications.

- Confirmation dialogs.

- Side drawers.

- Context menus.

- Tabs.

- Tables.

- Pagination.

- Empty states.

- Loading indicators.

- Inline validation errors.

- Success and error banners.



Every modal must support its intended actions, close button, Cancel button, appropriate validation, and keyboard-friendly focus behaviour.



Clicking outside a dialog may close it where appropriate, but unsaved forms must warn before losing changes.



14. Notifications and Alerts



Create a functional notification centre with mock notifications for:



- Upcoming recurring payments.

- Successful transaction additions.

- Import completion.

- Validation or import errors.

- Account reconciliation results.

- Other relevant demo events.



Allow users to mark notifications as read, mark all as read and clear notifications where appropriate.



Use toast notifications for immediate actions and dialogs for decisions that need confirmation.



15. Global Search and User Menu



Global search must search available mock transactions, accounts and categories, show relevant results and navigate to the selected result.



The profile menu must include:



- Profile.

- Preferences.

- Help.

- Reset demo data.

- Sign out.



All menu items must work.



16. Frontend Data and State Rules



Use realistic mock data and a central frontend state model.



- Seed the app with believable Indian personal-finance transactions and accounts.

- Make it obvious that the initial records are sample data.

- Store mock data in localStorage so changes survive page refreshes.

- Use reusable frontend functions for calculations.

- Update all dependent views immediately after changes.

- Keep account balances, transaction lists, dashboard metrics and reports consistent.

- Ensure transfers do not inflate income or expense totals.

- Refunds, adjustments and archived records must follow clearly defined calculation rules.

- Handle invalid, empty and missing data gracefully.

- Provide a Reset Demo Data action to restore the original sample dataset.



Do not rely on hardcoded dashboard numbers once the user starts editing data.



17. Functional Acceptance Criteria



Before considering the frontend complete, verify the following manually:



1. Sign-up, sign-in, sign-out and forgot-password simulations work.

2. Onboarding works from start to finish and can be revisited through Settings.

3. Transactions can be added, viewed, edited, duplicated, filtered and deleted.

4. Invalid forms display errors and do not submit.

5. Account balances recalculate correctly after transactions and transfers.

6. Category changes appear in all dependent views.

7. Dashboard metrics and reports reflect current mock data.

8. CSV import validates files and provides an understandable preview and result.

9. CSV export produces a downloadable file.

10. Recurring transaction settings and simulated reminders work.

11. Confirmation dialogs and notifications behave correctly.

12. Settings persist after refreshing the page.

13. All major screens are usable on mobile and desktop.

14. No visible button is dead or misleading.

15. There are no broken routes, console errors, horizontal overflow or unfinished placeholder pages.



18. Important Scope Restrictions



This is a frontend-only application and prototype.



Do not create a backend, database, server-side functions, real authentication, real email sending, real banking integrations, real payment processing or real financial account connections.



Do not imply that demo authentication is secure or that localStorage is encrypted.



Simulate backend-like behaviour using local mock data, frontend validation, asynchronous-looking loading states, success/error notifications and localStorage persistence.



Build the complete working frontend, not merely screenshots or static mockups. Prioritize a cohesive design system, accurate client-side calculations, complete interactions, robust validation and excellent mobile responsiveness.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/89c2b2ff-9f46-4602-b57f-748db68d4377).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

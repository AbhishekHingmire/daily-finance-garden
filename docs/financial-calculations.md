# WealthTrack Financial Calculations & Accounting Rules

This document details the financial models, accounting conventions, and calculation formulas utilized across the WealthTrack application.

---

## 1. Cash Flow & Net Balance

### 1.1 Account Balance
Each financial account maintains an opening balance. The live balance is derived deterministically by applying all transactions linked to that account:

$$\text{Balance}(\text{acc}) = \text{OpeningBalance}(\text{acc}) + \sum_{t \in T} \Delta(t, \text{acc})$$

Where $\Delta(t, \text{acc})$ represents the signed cash-flow impact of transaction $t$:

- **Income**: $+t.\text{amount}$ (credited to `accountId`)
- **Expense**: $-t.\text{amount}$ (debited from `accountId`)
- **Refund**: $+t.\text{amount}$ (credited back to `accountId`)
- **Adjustment**: $+t.\text{amount}$ (direct reconciliation credit or debit; signed)
- **Transfer**:
  - If $t.\text{accountId} = \text{acc}$: $-t.\text{amount}$ (outflow from source)
  - If $t.\text{destinationAccountId} = \text{acc}$: $+t.\text{amount}$ (inflow to destination)
- **Investment**:
  - **Contribution / Purchase / Fee** (Outflow actions): $-t.\text{amount}$
  - **Sale / Maturity / Dividend** (Inflow actions): $+t.\text{amount}$
  - **Valuation**: $0$ (Valuation entries note market worth; no cash is transferred)

All numeric inputs are sanitized via `safeAmount(val)` ensuring non-finite values (such as `NaN`, `null`, or `undefined`) evaluate safely to $0$.

### 1.2 Total Liquid Net Worth
Total liquid net worth aggregates balances across all non-archived accounts:

$$\text{NetWorth} = \sum_{\text{acc} \in \text{Accounts}_{\text{active}}} \text{Balance}(\text{acc})$$

---

## 2. Income vs. Expense & Net Cash Flow

Transactions categorized as **Transfer** and **Investment** are capital reallocations rather than ordinary operational income or expenses. They are excluded from operational income/expense summaries to prevent double-counting.

- **Operational Income**:
  $$\text{Income} = \sum_{t \in T, t.\text{type} = \text{"Income"}} \text{safeAmount}(t.\text{amount})$$
- **Operational Expense**:
  $$\text{ExpenseGross} = \sum_{t \in T, t.\text{type} = \text{"Expense"}} \text{safeAmount}(t.\text{amount})$$
  $$\text{RefundTotal} = \sum_{t \in T, t.\text{type} = \text{"Refund"}} \text{safeAmount}(t.\text{amount})$$
  $$\text{ExpenseNet} = \max(0, \text{ExpenseGross} - \text{RefundTotal})$$
- **Net Operational Surplus (Savings)**:
  $$\text{NetSurplus} = \text{Income} - \text{ExpenseNet}$$
- **Savings Rate**:
  $$\text{SavingsRate} = \begin{cases} 
    \text{round}\left(\frac{\text{NetSurplus}}{\text{Income}} \times 100\right)\% & \text{if } \text{Income} > 0 \\ 
    0\% & \text{otherwise} 
  \end{cases}$$

---

## 3. The 50 / 30 / 20 Budgeting Rule & Diagnostic

WealthTrack implements the classical 50/30/20 financial planning rule:

- **Needs (≤ 50%)**: Essential baseline expenditures (rent/mortgage, groceries, utilities, healthcare, debt service).
- **Wants (≤ 30%)**: Discretionary lifestyle expenditures (dining out, entertainment, shopping, hobbies).
- **Savings / Investments (≥ 20%)**: Wealth accumulation, retirement contributions, emergency buffer.

### Distribution Percentages:
$$\text{NeedsPct} = \text{round}\left(\frac{\text{NeedsSpend}}{\max(1, \text{Income})} \times 100\right)$$
$$\text{WantsPct} = \text{round}\left(\frac{\text{WantsSpend}}{\max(1, \text{Income})} \times 100\right)$$
$$\text{SavingsPct} = \max\left(0, \text{round}\left(\frac{\text{NetSurplus}}{\max(1, \text{Income})} \times 100\right)\right)$$

### Advisory Thresholds:
- If $\text{WantsPct} > 30\%$: Advisory warning for discretionary spending cutbacks.
- If $\text{NeedsPct} > 50\%$: Advisory notice to review fixed recurring overheads.
- If $\text{WantsPct} \le 30\%$ and $\text{NeedsPct} \le 50\%$: Optimal financial discipline rating.

---

## 4. Category Spending & Budget Limits

Category budgets are defined as **monthly caps** (`monthlyLimit`). Therefore, budget utilization is computed strictly against transactions in the active calendar month:

$$\text{Spend}(\text{cat}, \text{month}) = \sum_{t \in T_{\text{month}}, t.\text{categoryId} = \text{cat}} \left(\mathbb{I}_{t.\text{type}=\text{Expense}} \cdot t.\text{amount} - \mathbb{I}_{t.\text{type}=\text{Refund}} \cdot t.\text{amount}\right)$$

$$\text{Utilization}(\text{cat}) = \begin{cases}
  \text{round}\left(\frac{\text{Spend}(\text{cat}, \text{month})}{\text{cat}.\text{monthlyLimit}} \times 100\right)\% & \text{if } \text{cat}.\text{monthlyLimit} > 0 \\
  0\% & \text{otherwise}
\end{cases}$$

---

## 5. Recurring Schedule Advancements

When a recurring schedule is triggered (`Record now` or scheduled date reached), the next occurrence date (`nextDate`) advances according to its frequency:

- **Weekly**: $+7\text{ days}$
- **Custom interval**: $+N\text{ days}$ ($N \ge 1$)
- **Yearly**: $+1\text{ year}$
- **Monthly**: Clamped to the last calendar day of the target month if overflow would occur (e.g., January 31 $\rightarrow$ February 28/29, avoiding unintentional skipping to March 2 or 3).

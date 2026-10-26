import { describe, expect, it } from "vitest";
import {
  calculateNextSalaryInfo,
  createInitialState,
  getAccountBalance,
  getAllAccountBalances,
  getHoldingsSummary,
  getLoansSummary,
  getNextRecurringDate,
  processDueRecurringTransactions,
  safeAmount,
  type Account,
  type RecurringItem,
  type Transaction,
  type WealthState,
} from "@/lib/wealthtrack";
import { resolveInstitution } from "@/lib/institution-registry";
import { matchesDateRange } from "@/components/shared/DateRangeFilter";

describe("Financial Engine & Calculations", () => {
  it("safeAmount guards against NaN, undefined, null, and non-numeric values", () => {
    expect(safeAmount(undefined)).toBe(0);
    expect(safeAmount(null)).toBe(0);
    expect(safeAmount(NaN)).toBe(0);
    expect(safeAmount("")).toBe(0);
    expect(safeAmount("invalid")).toBe(0);
    expect(safeAmount(42.5)).toBe(42.5);
    expect(safeAmount(-15.2)).toBe(-15.2);
    expect(safeAmount("123.45")).toBe(123.45);
  });

  it("calculates account balances accurately across Income, Expense, Transfer, and Adjustment", () => {
    const checking: Account = {
      id: "acc-chk",
      name: "Checking",
      kind: "Checking",
      institution: "Bank",
      identifier: "1234",
      openingBalance: 1000,
      currency: "INR",
      color: "blue",
    };

    const savings: Account = {
      id: "acc-sav",
      name: "Savings",
      kind: "Savings",
      institution: "Bank",
      identifier: "5678",
      openingBalance: 500,
      currency: "INR",
      color: "emerald",
    };

    const txs: Transaction[] = [
      // Income into checking: +500
      {
        id: "t1",
        date: "2026-10-01",
        description: "Salary",
        type: "Income",
        amount: 500,
        categoryId: "c-inc",
        accountId: "acc-chk",
        paymentMethod: "UPI",
        need: "Need",
      },
      // Expense from checking: -200
      {
        id: "t2",
        date: "2026-10-02",
        description: "Groceries",
        type: "Expense",
        amount: 200,
        categoryId: "c-groc",
        accountId: "acc-chk",
        paymentMethod: "UPI",
        need: "Need",
      },
      // Transfer: Checking -> Savings: 300
      {
        id: "t3",
        date: "2026-10-03",
        description: "Transfer to Savings",
        type: "Transfer",
        amount: 300,
        categoryId: "",
        accountId: "acc-chk",
        destinationAccountId: "acc-sav",
        paymentMethod: "Transfer",
        need: "Need",
      },
      // Adjustment to savings: -50
      {
        id: "t4",
        date: "2026-10-04",
        description: "Bank fee adjustment",
        type: "Adjustment",
        amount: -50,
        categoryId: "",
        accountId: "acc-sav",
        paymentMethod: "Adjustment",
        need: "Need",
      },
    ];

    // Checking: 1000 starting + 500 income - 200 expense - 300 transfer out = 1000
    expect(getAccountBalance(checking, txs)).toBe(1000);

    // Savings: 500 starting + 300 transfer in - 50 adjustment = 750
    expect(getAccountBalance(savings, txs)).toBe(750);

    // High performance single-pass getAllAccountBalances matches individual calls
    const allBalances = getAllAccountBalances([checking, savings], txs);
    expect(allBalances.get("acc-chk")).toBe(1000);
    expect(allBalances.get("acc-sav")).toBe(750);
  });

  it("ensures Transfer transactions do not affect net worth or double-count", () => {
    const acc1: Account = {
      id: "a1",
      name: "Wallet A",
      kind: "Checking",
      institution: "Bank",
      openingBalance: 1000,
      currency: "INR",
      color: "blue",
    };
    const acc2: Account = {
      id: "a2",
      name: "Wallet B",
      kind: "Savings",
      institution: "Bank",
      openingBalance: 2000,
      currency: "INR",
      color: "green",
    };

    const initialTotal = getAccountBalance(acc1, []) + getAccountBalance(acc2, []);
    expect(initialTotal).toBe(3000);

    const transferTx: Transaction = {
      id: "tr-1",
      date: "2026-10-05",
      description: "Inter-account transfer",
      type: "Transfer",
      amount: 450,
      categoryId: "",
      accountId: "a1",
      destinationAccountId: "a2",
      paymentMethod: "Transfer",
      need: "Need",
    };

    const updatedTotal =
      getAccountBalance(acc1, [transferTx]) + getAccountBalance(acc2, [transferTx]);
    // The sum of balances before and after transfer must remain identical
    expect(updatedTotal).toBe(3000);
    expect(getAccountBalance(acc1, [transferTx])).toBe(550);
    expect(getAccountBalance(acc2, [transferTx])).toBe(2450);
  });

  it("handles Investment transactions accurately for cash outflow vs valuation changes", () => {
    const invAcc: Account = {
      id: "inv-1",
      name: "Zerodha Demat",
      kind: "Investment",
      institution: "Zerodha",
      openingBalance: 10000,
      currency: "INR",
      color: "purple",
    };

    // Purchase: decreases cash balance in account (or requires funding)
    const purchaseTx: Transaction = {
      id: "inv-buy",
      date: "2026-10-06",
      description: "Buy NIFTY ETF",
      type: "Investment",
      investmentAction: "Purchase",
      instrumentType: "Mutual Fund",
      instrumentName: "NIFTY ETF",
      units: 10,
      pricePerUnit: 250,
      amount: 2500,
      categoryId: "",
      accountId: "inv-1",
      paymentMethod: "NetBanking",
      need: "Need",
    };

    // Valuation: unrealized gain/loss does not count as cash inflow/outflow
    const valuationTx: Transaction = {
      id: "inv-val",
      date: "2026-10-07",
      description: "Quarterly portfolio valuation",
      type: "Investment",
      investmentAction: "Valuation",
      amount: 300,
      categoryId: "",
      accountId: "inv-1",
      paymentMethod: "Valuation",
      need: "Need",
    };

    const balanceAfterBuy = getAccountBalance(invAcc, [purchaseTx]);
    expect(balanceAfterBuy).toBe(7500);

    // Valuation does not alter liquid ledger balance
    const balanceAfterVal = getAccountBalance(invAcc, [purchaseTx, valuationTx]);
    expect(balanceAfterVal).toBe(7500);
  });

  it("advances recurring items safely across month ends and leap years", () => {
    // Jan 31 + 1 month should clamp to Feb 28 (or Feb 29 in leap year)
    const nextDate = getNextRecurringDate("2026-01-31", "monthly");
    expect(nextDate).toBe("2026-02-28");

    // Feb 28 + 1 month should be March 28
    const marchDate = getNextRecurringDate("2026-02-28", "monthly");
    expect(marchDate).toBe("2026-03-28");

    // Weekly advancement
    const nextWeek = getNextRecurringDate("2026-10-01", "weekly");
    expect(nextWeek).toBe("2026-10-08");

    // Yearly advancement
    const nextYear = getNextRecurringDate("2026-10-22", "yearly");
    expect(nextYear).toBe("2027-10-22");
  });

  it("initializes seed data with non-empty accounts and categories", () => {
    const state = createInitialState();
    expect(state.accounts.length).toBeGreaterThanOrEqual(4);
    expect(state.categories.length).toBeGreaterThanOrEqual(8);
    expect(state.transactions.length).toBeGreaterThan(0);
    expect(state.preferences.currency).toBe("INR");
  });

  it("automatically records due recurring items without manual clicking", () => {
    const dummyState: WealthState = {
      ...createInitialState(),
      transactions: [],
      recurring: [
        {
          id: "rec-1",
          name: "Netflix Auto-Pay",
          type: "Expense",
          amount: 649,
          frequency: "Monthly",
          intervalDays: 30,
          accountId: "acc-chk",
          categoryId: "cat-ent",
          nextDate: "2026-10-20", // Past due (reference date is 2026-10-22)
          enabled: true,
          need: "Want",
        },
        {
          id: "rec-2",
          name: "Future Salary",
          type: "Income",
          amount: 85000,
          frequency: "Monthly",
          intervalDays: 30,
          accountId: "acc-chk",
          categoryId: "cat-sal",
          nextDate: "2026-10-31", // Future date
          enabled: true,
          need: "Need",
        },
        {
          id: "rec-3",
          name: "Gym (Paused)",
          type: "Expense",
          amount: 1500,
          frequency: "Monthly",
          intervalDays: 30,
          accountId: "acc-chk",
          categoryId: "cat-fit",
          nextDate: "2026-10-15", // Due, but paused/disabled
          enabled: false,
          need: "Want",
        },
      ],
    };

    const { updatedState, processedCount, processedItems } = processDueRecurringTransactions(
      dummyState,
      "2026-10-22"
    );

    // Only rec-1 should be auto-processed
    expect(processedCount).toBe(1);
    expect(processedItems[0]?.name).toBe("Netflix Auto-Pay");
    expect(updatedState.transactions.length).toBe(1);
    expect(updatedState.transactions[0]?.amount).toBe(649);
    expect(updatedState.transactions[0]?.paymentMethod).toBe("Auto-debit");

    // The recurring item's nextDate must have advanced to next month (2026-11-20)
    const updatedRec1 = updatedState.recurring.find((r) => r.id === "rec-1");
    expect(updatedRec1?.nextDate).toBe("2026-11-20");

    // The future and paused recurring items should remain untouched
    const updatedRec2 = updatedState.recurring.find((r) => r.id === "rec-2");
    expect(updatedRec2?.nextDate).toBe("2026-10-31");
    const updatedRec3 = updatedState.recurring.find((r) => r.id === "rec-3");
    expect(updatedRec3?.nextDate).toBe("2026-10-15");
  });

  it("auto-increments linked investment holding value when recurring SIP installment runs", () => {
    const dummyState: WealthState = {
      ...createInitialState(),
      investments: [
        {
          id: "inv-sip-1",
          name: "Parag Parikh Flexi Cap",
          assetType: "Mutual fund",
          investedAmount: 50000,
          currentAmount: 58000,
          isRecurring: true,
          sipAmount: 5000,
          status: "Active",
          updatedAt: "2026-09-10",
        },
      ],
      transactions: [],
      recurring: [
        {
          id: "rec-sip-1",
          name: "Parag Parikh Flexi Cap (SIP)",
          type: "Investment",
          amount: 5000,
          frequency: "Monthly",
          intervalDays: 30,
          startDate: "2026-05-10",
          endDate: "",
          accountId: "acc-hdfc",
          categoryId: "cat-investments",
          nextDate: "2026-10-10", // Due before 2026-10-22
          enabled: true,
          need: "Need",
          investmentId: "inv-sip-1",
          instrumentType: "Mutual fund",
        },
      ],
    };

    const { updatedState, processedCount, processedItems } = processDueRecurringTransactions(
      dummyState,
      "2026-10-22"
    );

    expect(processedCount).toBe(1);
    expect(processedItems[0]?.name).toBe("Parag Parikh Flexi Cap (SIP)");
    expect(processedItems[0]?.amount).toBe(5000);

    // Verify transaction created
    expect(updatedState.transactions.length).toBe(1);
    const tx = updatedState.transactions[0];
    expect(tx?.type).toBe("Investment");
    expect(tx?.investmentAction).toBe("Contribution");
    expect(tx?.amount).toBe(5000);

    // Verify linked holding investedAmount and currentAmount were both auto-incremented by 5000
    const holding = updatedState.investments?.find((i) => i.id === "inv-sip-1");
    expect(holding?.investedAmount).toBe(55000); // 50,000 + 5,000
    expect(holding?.currentAmount).toBe(63000); // 58,000 + 5,000
    expect(holding?.updatedAt).toBe("2026-10-10");
  });

  it("filters date ranges strictly according to 1M, 6M, 12M, and Custom Range", () => {
    const ref = new Date(2026, 9, 22); // 2026-10-22

    // 1 Month preset: current month (2026-10)
    expect(matchesDateRange("2026-10-05", { preset: "1m" }, ref)).toBe(true);
    expect(matchesDateRange("2026-09-30", { preset: "1m" }, ref)).toBe(false);

    // 6 Months preset: May 2026 to Oct 2026
    expect(matchesDateRange("2026-05-01", { preset: "6m" }, ref)).toBe(true);
    expect(matchesDateRange("2026-04-30", { preset: "6m" }, ref)).toBe(false);

    // 12 Months preset: Nov 2025 to Oct 2026
    expect(matchesDateRange("2025-11-15", { preset: "12m" }, ref)).toBe(true);
    expect(matchesDateRange("2025-10-31", { preset: "12m" }, ref)).toBe(false);

    // Month-by-month year selection (e.g. October 2026)
    expect(matchesDateRange("2026-10-18", { preset: "month", year: 2026, month: 10 }, ref)).toBe(true);
    expect(matchesDateRange("2026-09-28", { preset: "month", year: 2026, month: 10 }, ref)).toBe(false);

    // Full year selection (All 2026)
    expect(matchesDateRange("2026-05-19", { preset: "year", year: 2026 }, ref)).toBe(true);
    expect(matchesDateRange("2025-12-31", { preset: "year", year: 2026 }, ref)).toBe(false);

    // Custom range
    expect(
      matchesDateRange("2026-07-15", {
        preset: "custom",
        customFrom: "2026-07-01",
        customTo: "2026-07-31",
      }, ref)
    ).toBe(true);
    expect(
      matchesDateRange("2026-08-01", {
        preset: "custom",
        customFrom: "2026-07-01",
        customTo: "2026-07-31",
      }, ref)
    ).toBe(false);
  });

  it("calculates investment holdings summary with accurate earned returns and P&L %", () => {
    const state = createInitialState();
    expect(state.investments).toBeDefined();
    expect(state.investments?.length).toBeGreaterThan(0);

    const summary = getHoldingsSummary(state.investments);

    expect(summary.totalInvested).toBe(395000);
    expect(summary.currentValue).toBe(482500);
    expect(summary.totalReturns).toBe(87500);
    expect(summary.returnPercentage).toBeCloseTo(22.15, 1);
  });

  it("initializes separate UserProfile with financial targets and risk profile", () => {
    const state = createInitialState();
    expect(state.profile).toBeDefined();
    expect(state.profile?.fullName).toBe("Abhishek Hingmire");
    expect(state.profile?.monthlyIncomeTarget).toBe(100000);
    expect(state.profile?.emergencyFundTarget).toBe(150000);
    expect(state.profile?.riskProfile).toBe("Balanced");
  });

  it("calculates loan liabilities summary with total debt, outstanding, and repayment %", () => {
    const state = createInitialState();
    expect(state.loans).toBeDefined();
    expect(state.loans?.length).toBeGreaterThan(0);

    const summary = getLoansSummary(state.loans);
    expect(summary.totalPrincipal).toBe(4350000);
    expect(summary.totalOutstanding).toBe(3232970);
    expect(summary.totalMonthlyEmi).toBe(45050);
    expect(summary.totalPaid).toBe(1117030);
    expect(summary.payoffPercentage).toBeCloseTo(25.68, 1);
  });

  it("calculates account balances and cash flows across debt types: EMI, Borrow, Lend, and Recovery", () => {
    const bankAccount: Account = {
      id: "acc-bank",
      name: "Primary Bank",
      kind: "Bank account",
      institution: "HDFC",
      identifier: "1111",
      openingBalance: 50000,
      notes: "",
    };

    const debtTxs: Transaction[] = [
      // Borrowing ₹20,000 increases bank balance
      {
        id: "d1",
        date: "2026-10-01",
        description: "Personal Loan Disbursed",
        type: "Borrow / Loan Taken",
        amount: 20000,
        categoryId: "cat-borrow",
        accountId: "acc-bank",
        destinationAccountId: "",
        paymentMethod: "Bank transfer",
        need: "Need",
        merchant: "Bank",
        tags: [],
        notes: "",
        recurring: false,
        customValues: {},
      },
      // Paying EMI ₹5,000 decreases bank balance
      {
        id: "d2",
        date: "2026-10-05",
        description: "Loan EMI Payment",
        type: "EMI / Loan Payment",
        amount: 5000,
        categoryId: "cat-loan-emi",
        accountId: "acc-bank",
        destinationAccountId: "",
        paymentMethod: "Auto-debit",
        need: "Need",
        merchant: "Bank",
        tags: [],
        notes: "",
        recurring: true,
        customValues: {},
      },
      // Lending ₹8,000 to a friend decreases bank balance
      {
        id: "d3",
        date: "2026-10-08",
        description: "Loan to Rahul",
        type: "Lend / Loan Given",
        amount: 8000,
        categoryId: "cat-lend",
        accountId: "acc-bank",
        destinationAccountId: "",
        paymentMethod: "UPI",
        need: "Want",
        merchant: "Rahul",
        tags: [],
        notes: "",
        recurring: false,
        customValues: {},
      },
      // Recovering ₹3,000 from a previous debtor increases bank balance
      {
        id: "d4",
        date: "2026-10-12",
        description: "Repayment from Amit",
        type: "Debt Recovery",
        amount: 3000,
        categoryId: "cat-debt-recovery",
        accountId: "acc-bank",
        destinationAccountId: "",
        paymentMethod: "UPI",
        need: "Need",
        merchant: "Amit",
        tags: [],
        notes: "",
        recurring: false,
        customValues: {},
      },
    ];

    // Starting: 50,000 + 20,000 (borrow) - 5,000 (emi) - 8,000 (lend) + 3,000 (recovery) = 60,000
    const finalBalance = getAccountBalance(bankAccount, debtTxs);
    expect(finalBalance).toBe(60000);
  });

  it("calculates salary countdown & payday remaining accurately across all calendar boundaries", () => {
    // Reference date: 2026-10-22
    // Case 1: Payday is 19th -> has already passed in October, next is Nov 19, 2026 (28 days)
    const oct19 = calculateNextSalaryInfo(19, "2026-10-22");
    expect(oct19.nextDate).toBe("2026-11-19");
    expect(oct19.daysRemaining).toBe(28);
    expect(oct19.isToday).toBe(false);

    // Case 2: Payday is 22nd -> is today!
    const oct22 = calculateNextSalaryInfo(22, "2026-10-22");
    expect(oct22.nextDate).toBe("2026-10-22");
    expect(oct22.daysRemaining).toBe(0);
    expect(oct22.isToday).toBe(true);

    // Case 3: Payday is 25th -> 3 days remaining in current month
    const oct25 = calculateNextSalaryInfo(25, "2026-10-22");
    expect(oct25.nextDate).toBe("2026-10-25");
    expect(oct25.daysRemaining).toBe(3);
    expect(oct25.isToday).toBe(false);

    // Case 4: Payday 31st in a 30-day month (e.g. ref date 2026-11-20, salary day 31 -> clamped to Nov 30)
    const nov31 = calculateNextSalaryInfo(31, "2026-11-20");
    expect(nov31.nextDate).toBe("2026-11-30");
    expect(nov31.daysRemaining).toBe(10);

    // Case 5: Default fallback when null/undefined passed
    const fallback = calculateNextSalaryInfo(null, "2026-10-22");
    expect(fallback.dayOfMonth).toBe(19);
    expect(fallback.nextDate).toBe("2026-11-19");
  });

  it("resolves authentic banking and institution metadata accurately", () => {
    // Exact and alias matching
    expect(resolveInstitution("HDFC Bank")?.id).toBe("HDFC");
    expect(resolveInstitution("hdfc")?.id).toBe("HDFC");
    expect(resolveInstitution("State Bank of India")?.id).toBe("SBI");
    expect(resolveInstitution("sbi bank")?.id).toBe("SBI");
    expect(resolveInstitution("ICICI Bank Ltd")?.id).toBe("ICICI");
    expect(resolveInstitution("Axis Bank")?.id).toBe("AXIS");
    expect(resolveInstitution("Kotak Mahindra Bank")?.id).toBe("KOTAK");
    expect(resolveInstitution("Paytm Payments Bank")?.id).toBe("PAYTM");
    expect(resolveInstitution("phonepe")?.id).toBe("PHONEPE");
    expect(resolveInstitution("Google Pay")?.id).toBe("GPAY");
    expect(resolveInstitution("Zerodha Kite")?.id).toBe("ZERODHA");
    expect(resolveInstitution("Groww")?.id).toBe("GROWW");
    expect(resolveInstitution("Cash wallet")?.id).toBe("CASH");
    expect(resolveInstitution("Bank of America")?.id).toBe("BOA");

    // Unknown institution returns null for graceful fallback
    expect(resolveInstitution("Unknown Co-op Bank")).toBeNull();
    expect(resolveInstitution("")).toBeNull();
  });

  it("synchronizes monthly salary values across preferences, profile, and recurring schedules", () => {
    const state = createInitialState();
    const initialSalaryItem = state.recurring.find(
      (r) => r.id === "rec-salary" || (r.type === "Income" && r.name.toLowerCase().includes("salary"))
    );
    expect(initialSalaryItem).toBeDefined();
    expect(state.preferences.salaryDay).toBe(19);

    // Simulate updating salary to ₹95,000 on day 25
    const newAmount = 95000;
    const newDay = 25;
    const salaryInfo = calculateNextSalaryInfo(newDay, "2026-10-22");

    const updatedRecurring = state.recurring.map((item) =>
      item.id === "rec-salary"
        ? {
            ...item,
            amount: newAmount,
            nextDate: salaryInfo.nextDate,
          }
        : item
    );

    const updatedPreferences = { ...state.preferences, salaryDay: newDay };
    const updatedProfile = state.profile ? { ...state.profile, monthlyIncomeTarget: newAmount } : undefined;

    expect(updatedPreferences.salaryDay).toBe(25);
    expect(updatedProfile?.monthlyIncomeTarget).toBe(95000);
    const updatedSalaryItem = updatedRecurring.find((r) => r.id === "rec-salary");
    expect(updatedSalaryItem?.amount).toBe(95000);
    expect(updatedSalaryItem?.nextDate).toBe("2026-10-25");
  });
});

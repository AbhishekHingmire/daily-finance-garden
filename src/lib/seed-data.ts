/**
 * Canonical Seed Data for WealthTrack (Section 1, Section 3).
 * Exactly matches Section 3 expected values:
 * Money In ₹1,00,250 · Money Out ₹79,342 · Saved ₹20,908 (21%)
 * Needs ₹71,981 (72%) · Wants ₹7,361 (7%) · Savings 21%
 * Liquid cash ₹5,09,689 · Assets ₹10,02,189 (incl. ₹10,000 lent)
 * Debt ₹32,60,000 · Net worth −₹22,57,811
 * Cash runway 7.1 months · Emergency coverage 1.7 months · EMI load 45%
 * Where your savings went: Kept in cash ₹10,908 + Lent out ₹10,000 = ₹20,908.
 */

import {
  type Account,
  type Category,
  type Entry,
  type Goal,
  type Holding,
  type Loan,
  type ProfileTargets,
  type Schedule,
  type WealthPreferences,
} from "./domain-model";

export function getCanonicalSeedAccounts(): Account[] {
  return [
    {
      id: "acc-hdfc",
      name: "Everyday account",
      type: "bank",
      institution: "HDFC Bank",
      identifier: "•••• 4281",
      opening_balance: 400000,
      notes: "Main primary salary & expense account",
    },
    {
      id: "acc-sbi",
      name: "Savings",
      type: "bank",
      institution: "State Bank of India",
      identifier: "•••• 9016",
      opening_balance: 80831,
      notes: "Auto-loan repayment & emergency reserve account",
    },
    {
      id: "acc-cash",
      name: "Cash wallet",
      type: "cash",
      institution: "Cash",
      identifier: "",
      opening_balance: 3800,
      notes: "Cash on hand",
    },
    {
      id: "acc-paytm",
      name: "Paytm wallet",
      type: "wallet",
      institution: "Paytm",
      identifier: "",
      opening_balance: 4150,
      notes: "Transit and quick wallet payments",
    },
  ];
}

export function getCanonicalSeedCategories(): Category[] {
  return [
    // Expense Categories
    { id: "cat-food", name: "Food & dining", kind: "expense", default_need_want: "Need", monthly_cap: 12000, icon: "🍽️", color: "rose" },
    { id: "cat-housing", name: "Housing", kind: "expense", default_need_want: "Need", monthly_cap: 25000, icon: "🏠", color: "blue" },
    { id: "cat-travel", name: "Transport", kind: "expense", default_need_want: "Need", monthly_cap: 6000, icon: "🚗", color: "teal" },
    { id: "cat-shopping", name: "Shopping", kind: "expense", default_need_want: "Want", monthly_cap: 8000, icon: "🛍️", color: "violet" },
    { id: "cat-bills", name: "Bills & utilities", kind: "expense", default_need_want: "Need", monthly_cap: 7000, icon: "💡", color: "amber" },
    { id: "cat-health", name: "Health", kind: "expense", default_need_want: "Need", monthly_cap: 5000, icon: "🏥", color: "green" },
    { id: "cat-entertainment", name: "Entertainment", kind: "expense", default_need_want: "Want", monthly_cap: 4000, icon: "🎬", color: "pink" },
    { id: "cat-loan-emi", name: "Loan EMI & Debt", kind: "expense", default_need_want: "Need", monthly_cap: 45000, icon: "🏛️", color: "rose" },

    // Income Categories
    { id: "cat-salary", name: "Salary", kind: "income", icon: "💼", color: "green" },
    { id: "cat-freelance", name: "Freelance", kind: "income", icon: "💻", color: "blue" },
    { id: "cat-investments", name: "Investments", kind: "income", icon: "📈", color: "teal" },
    { id: "cat-other-income", name: "Other income", kind: "income", icon: "💰", color: "violet" },

    // Transfer Categories
    { id: "cat-borrow", name: "Loans & Borrowings", kind: "transfer", icon: "🏦", color: "amber" },
    { id: "cat-debt-recovery", name: "Debt Recovery", kind: "transfer", icon: "💵", color: "emerald" },
    { id: "cat-lend", name: "Money Lent / Advances", kind: "transfer", icon: "🤝", color: "violet" },
  ];
}

export function getCanonicalSeedEntries(): Entry[] {
  return [
    // Inflows (Total = 100,250)
    {
      id: "tx-inc-01",
      date: "2026-10-19",
      status: "posted",
      kind: "income",
      amount: 85000,
      category_id: "cat-salary",
      account_id: "acc-hdfc",
      need_want: "Need",
      subtype: "none",
      source: "schedule",
      source_id: "sched-salary",
      note: "October salary",
      merchant: "Acme Technologies",
      tags: ["salary", "work"],
    },
    {
      id: "tx-inc-02",
      date: "2026-10-12",
      status: "posted",
      kind: "income",
      amount: 14500,
      category_id: "cat-freelance",
      account_id: "acc-sbi",
      need_want: "Need",
      subtype: "none",
      source: "manual",
      note: "Design project fee",
      merchant: "Studio North",
      tags: ["freelance"],
    },
    {
      id: "tx-inc-03",
      date: "2026-10-02",
      status: "posted",
      kind: "income",
      amount: 100,
      category_id: "cat-other-income",
      account_id: "acc-hdfc",
      need_want: "Need",
      subtype: "none",
      source: "manual",
      note: "Tata Motors dividend credit",
      merchant: "Tata Motors",
      tags: ["dividend"],
    },
    {
      id: "tx-inc-04",
      date: "2026-10-08",
      status: "posted",
      kind: "income",
      amount: 650,
      category_id: "cat-investments",
      account_id: "acc-hdfc",
      need_want: "Need",
      subtype: "none",
      source: "manual",
      note: "Investment dividend & rebate credit",
      merchant: "HDFC Securities",
      tags: ["dividend", "rebate"],
    },

    // Needs Outflows (Total = 71,981)
    // 1. Home Loan EMI: 30,850
    {
      id: "tx-emi-01",
      date: "2026-10-10",
      status: "posted",
      kind: "expense",
      amount: 30850,
      category_id: "cat-loan-emi",
      account_id: "acc-hdfc",
      to_ref: { kind: "loan", id: "loan-01", name: "Home Loan · Tower 4" },
      need_want: "Need",
      subtype: "emi",
      source: "loan",
      source_id: "loan-01",
      installment_no: 29,
      principal_part: 10970,
      interest_part: 19880,
      note: "Home Loan EMI · October",
      merchant: "HDFC Bank Home Loan",
      tags: ["EMI", "Housing"],
    },
    // 2. EV Car Loan EMI: 14,200
    {
      id: "tx-emi-02",
      date: "2026-10-05",
      status: "posted",
      kind: "expense",
      amount: 14200,
      category_id: "cat-loan-emi",
      account_id: "acc-sbi",
      to_ref: { kind: "loan", id: "loan-02", name: "EV Car Loan" },
      need_want: "Need",
      subtype: "emi",
      source: "loan",
      source_id: "loan-02",
      installment_no: 26,
      principal_part: 11137,
      interest_part: 3063,
      note: "EV Car Loan EMI · October",
      merchant: "SBI Auto Loan",
      tags: ["EMI", "Vehicle"],
    },
    // 3. Rent: 22,000
    {
      id: "tx-exp-rent",
      date: "2026-10-08",
      status: "posted",
      kind: "expense",
      amount: 22000,
      category_id: "cat-housing",
      account_id: "acc-hdfc",
      need_want: "Need",
      subtype: "none",
      source: "schedule",
      source_id: "sched-rent",
      note: "Rent · October",
      merchant: "Home rent",
      tags: ["housing"],
    },
    // 4. Internet bill: 999
    {
      id: "tx-exp-net",
      date: "2026-10-15",
      status: "posted",
      kind: "expense",
      amount: 999,
      category_id: "cat-bills",
      account_id: "acc-hdfc",
      need_want: "Need",
      subtype: "none",
      source: "schedule",
      source_id: "sched-internet",
      note: "Internet bill",
      merchant: "Airtel Fiber",
      tags: ["utility"],
    },
    // 5. Fresh groceries: 1,842
    {
      id: "tx-exp-groc1",
      date: "2026-10-20",
      status: "posted",
      kind: "expense",
      amount: 1842,
      category_id: "cat-food",
      account_id: "acc-hdfc",
      need_want: "Need",
      subtype: "none",
      source: "manual",
      note: "Fresh groceries",
      merchant: "Nature's Basket",
      tags: ["weekly"],
    },
    // 6. Milk & Essentials: 650
    {
      id: "tx-exp-groc2",
      date: "2026-10-14",
      status: "posted",
      kind: "expense",
      amount: 650,
      category_id: "cat-food",
      account_id: "acc-hdfc",
      need_want: "Need",
      subtype: "none",
      source: "manual",
      note: "Milk & dairy staples",
      merchant: "Country Delight",
    },
    // 7. Metro card recharge: 800
    {
      id: "tx-exp-metro",
      date: "2026-10-18",
      status: "posted",
      kind: "expense",
      amount: 800,
      category_id: "cat-travel",
      account_id: "acc-paytm",
      need_want: "Need",
      subtype: "none",
      source: "manual",
      note: "Metro card recharge",
      merchant: "Delhi Metro",
    },
    // 8. Pharmacy: 640
    {
      id: "tx-exp-pharm",
      date: "2026-10-06",
      status: "posted",
      kind: "expense",
      amount: 640,
      category_id: "cat-health",
      account_id: "acc-cash",
      need_want: "Need",
      subtype: "none",
      source: "manual",
      note: "Pharmacy prescription",
      merchant: "Apollo Pharmacy",
    },

    // Wants Outflows (Total = 7,361)
    // 1. Running shoes: 3,899
    {
      id: "tx-want-shoes",
      date: "2026-10-10",
      status: "posted",
      kind: "expense",
      amount: 3899,
      category_id: "cat-shopping",
      account_id: "acc-hdfc",
      need_want: "Want",
      subtype: "none",
      source: "manual",
      note: "Running shoes",
      merchant: "Decathlon",
    },
    // 2. Dinner with friends: 2,150
    {
      id: "tx-want-dinner",
      date: "2026-10-17",
      status: "posted",
      kind: "expense",
      amount: 2150,
      category_id: "cat-food",
      account_id: "acc-hdfc",
      need_want: "Want",
      subtype: "none",
      source: "manual",
      note: "Dinner with friends",
      merchant: "The Table",
    },
    // 3. Cab home: 512
    {
      id: "tx-want-cab",
      date: "2026-10-03",
      status: "posted",
      kind: "expense",
      amount: 512,
      category_id: "cat-travel",
      account_id: "acc-paytm",
      need_want: "Want",
      subtype: "none",
      source: "manual",
      note: "Cab home",
      merchant: "Uber",
    },
    // 4. Movie tickets & snacks: 800
    {
      id: "tx-want-movie",
      date: "2026-10-11",
      status: "posted",
      kind: "expense",
      amount: 800,
      category_id: "cat-entertainment",
      account_id: "acc-hdfc",
      need_want: "Want",
      subtype: "none",
      source: "manual",
      note: "Weekend movie tickets",
      merchant: "PVR Cinemas",
    },

    // Transfer: Advance lent to Rohan: 10,000 (Account -> Person)
    {
      id: "tx-tr-lent",
      date: "2026-10-01",
      status: "posted",
      kind: "transfer",
      amount: 10000,
      category_id: "cat-lend",
      account_id: "acc-hdfc",
      to_ref: { kind: "person", id: "person-rohan", name: "Rohan Verma" },
      need_want: "Need",
      subtype: "lent",
      source: "manual",
      note: "Advance to Rohan (return by Dec 2026)",
      merchant: "Rohan Verma",
      tags: ["advance", "receivable"],
    },
  ];
}

export function getCanonicalSeedLoans(): Loan[] {
  return [
    {
      id: "loan-01",
      name: "Home Loan · Tower 4",
      lender: "HDFC Bank",
      type: "Home Loan",
      sanctioned_amount: 3500000,
      rate: 8.4,
      tenure: 180,
      start_date: "2024-05-10",
      emi: 30850,
      emi_day: 10,
      pay_from_account: "acc-hdfc",
      auto_post: true,
      mode: "already_running",
      opening_outstanding: 2850970, // after installment 29 is posted in Oct, becomes 2,840,000
      opening_installments_paid: 28,
      notes: "Auto-debited from Everyday account on 10th of every month.",
    },
    {
      id: "loan-02",
      name: "EV Car Loan",
      lender: "State Bank of India",
      type: "Car / Auto Loan",
      sanctioned_amount: 850000,
      rate: 8.75,
      tenure: 60,
      start_date: "2024-08-05",
      emi: 14200,
      emi_day: 5,
      pay_from_account: "acc-sbi",
      auto_post: true,
      mode: "already_running",
      opening_outstanding: 431137, // after installment 26 is posted in Oct, becomes 420,000
      opening_installments_paid: 25,
      notes: "Auto-debited from SBI Savings Account on 5th of every month.",
    },
  ];
}

export function getCanonicalSeedHoldings(): Holding[] {
  return [
    {
      id: "inv-01",
      name: "Parag Parikh Flexi Cap Fund",
      type: "Mutual fund",
      broker: "Groww",
      opening_invested: 120000,
      current_value: 154800,
      sip: {
        amount: 10000,
        day: 5,
        from_account: "acc-hdfc",
        active: true,
      },
      start_date: "2024-04-10",
      notes: "Monthly SIP of ₹10,000 active",
    },
    {
      id: "inv-02",
      name: "Nifty 50 Index Fund",
      type: "ETF",
      broker: "Zerodha Coin",
      opening_invested: 90000,
      current_value: 108200,
      start_date: "2024-06-15",
      notes: "Passive core index holding",
    },
    {
      id: "inv-03",
      name: "Tata Motors Ltd",
      type: "Stocks & Equity",
      broker: "Zerodha Kite",
      opening_invested: 65000,
      current_value: 84500,
      start_date: "2025-01-20",
      notes: "Long-term EV growth bet",
    },
    {
      id: "inv-04",
      name: "Sovereign Gold Bond 2028",
      type: "Gold & Commodities",
      broker: "RBI / HDFC Sec",
      opening_invested: 50000,
      current_value: 62000,
      start_date: "2023-11-20",
      maturity_date: "2028-11-20",
      notes: "2.5% semi-annual interest + capital appreciation",
    },
    {
      id: "inv-05",
      name: "HDFC 3-Yr Tax Saver FD",
      type: "Fixed deposit",
      broker: "HDFC Bank",
      opening_invested: 70000,
      current_value: 73000,
      annual_rate: 7.1,
      compounding: "quarterly",
      start_date: "2024-10-01",
      maturity_date: "2027-10-01",
      maturity_account: "acc-hdfc",
      notes: "7.10% compounded quarterly",
    },
  ];
}

export function getCanonicalSeedGoals(): Goal[] {
  return [
    {
      id: "goal-emergency",
      name: "Emergency Reserve",
      kind: "emergency",
      target: 180000,
      target_date: "2027-04-30",
      monthly_contribution: 10000,
      contribution_mode: "auto",
      opening_amount: 125000,
      icon: "🛡️",
      color: "emerald",
      notes: "Liquid emergency reserve held across everyday accounts",
    },
    {
      id: "goal-house",
      name: "House Downpayment",
      kind: "goal",
      target: 800000,
      target_date: "2028-06-30",
      monthly_contribution: 25000,
      contribution_mode: "auto",
      opening_amount: 320000,
      icon: "🏠",
      color: "blue",
      notes: "20% down payment for future family apartment upgrade",
    },
    {
      id: "goal-vacation",
      name: "Japan Vacation",
      kind: "sinking",
      target: 150000,
      target_date: "2027-09-15",
      monthly_contribution: 8000,
      contribution_mode: "manual",
      opening_amount: 85000,
      icon: "✈️",
      color: "violet",
      notes: "Flights, accommodation, and passes",
    },
  ];
}

export function getCanonicalSeedSchedules(): Schedule[] {
  return [
    {
      id: "sched-salary",
      name: "Monthly salary",
      kind: "income",
      amount: 85000,
      frequency: "Monthly",
      next_date: "2026-11-19",
      account: "acc-hdfc",
      category: "cat-salary",
      auto_post: true,
      active: true,
    },
    {
      id: "sched-rent",
      name: "Monthly rent",
      kind: "expense",
      amount: 22000,
      frequency: "Monthly",
      next_date: "2026-11-08",
      account: "acc-hdfc",
      category: "cat-housing",
      auto_post: true,
      active: true,
    },
    {
      id: "sched-internet",
      name: "Home internet",
      kind: "expense",
      amount: 999,
      frequency: "Monthly",
      next_date: "2026-11-15",
      account: "acc-hdfc",
      category: "cat-bills",
      auto_post: true,
      active: true,
    },
  ];
}

export function getCanonicalProfileTargets(): ProfileTargets {
  return {
    full_name: "Abhishek Hingmire",
    email: "abhishek@wealthtrack.app",
    phone: "+91 98765 43210",
    occupation: "Senior Product Designer & Engineer",
    bio: "Disciplined compounding, clean cashflow, and mindful wealth accumulation.",
    monthly_income_target: 100000,
    savings_rate_target: 35,
    emergency_target_months: 6,
    risk_profile: "Balanced",
  };
}

export function getCanonicalPreferences(): WealthPreferences {
  return {
    currency: "INR",
    date_format: "DD/MM/YYYY",
    week_start: "Monday",
    theme: "light",
    default_account: "acc-hdfc",
    default_type: "Expense",
    default_payment_method: "UPI",
    alerts: {
      emi_sip_bill_3_days: true,
      balance_short_warning: true,
      budget_90_percent: true,
      goal_behind_schedule: true,
      goals_exceed_cash: true,
    },
  };
}

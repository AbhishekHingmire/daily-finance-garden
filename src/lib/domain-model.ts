/**
 * Single Canonical Domain Model for WealthTrack (Section 1).
 * All data in the app is derived from these ledger entities.
 */

export type AccountType = "bank" | "cash" | "wallet" | "credit_card";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  identifier?: string; // e.g. "•••• 4281"
  opening_balance: number;
  opening_date?: string; // YYYY-MM-DD
  archived?: boolean;
  notes?: string;
}

export type EntryStatus = "posted" | "scheduled";
export type EntryKind = "income" | "expense" | "transfer";
export type NeedWant = "Need" | "Want";

export type EntrySubtype =
  | "none"
  | "emi"
  | "sip"
  | "lump_sum"
  | "prepayment"
  | "lent"
  | "recovered"
  | "borrowed"
  | "goal_allocation"
  | "redemption"
  | "card_payment";

export type EntrySource = "manual" | "schedule" | "loan" | "sip" | "import";

export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD
  status: EntryStatus;
  kind: EntryKind;
  amount: number;
  category_id?: string;
  account_id: string; // From account
  to_ref?: {
    kind: "account" | "holding" | "loan" | "person";
    id: string;
    name?: string;
  };
  need_want: NeedWant;
  subtype: EntrySubtype;
  source: EntrySource;
  source_id?: string;
  installment_no?: number;
  principal_part?: number;
  interest_part?: number;
  transfer_id?: string; // Links the two legs of a transfer
  note: string;
  merchant?: string;
  tags?: string[];
}

export type CategoryKind = "expense" | "income" | "transfer";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  default_need_want?: NeedWant;
  monthly_cap?: number;
  icon: string;
  color?: string;
  archived?: boolean;
}

export type LoanType =
  | "Home Loan"
  | "Personal Loan"
  | "Car / Auto Loan"
  | "Education Loan"
  | "Credit Line"
  | "Other";

export interface Loan {
  id: string;
  name: string;
  lender: string;
  type: LoanType;
  sanctioned_amount: number;
  rate: number; // Annual %
  tenure: number; // Total months
  start_date: string; // YYYY-MM-DD
  emi: number;
  emi_day: number;
  pay_from_account: string;
  auto_post: boolean;
  mode: "new" | "already_running";
  opening_outstanding?: number;
  opening_installments_paid?: number;
  notes?: string;
}

export type AssetType =
  | "Mutual fund"
  | "Stocks & Equity"
  | "ETF"
  | "Gold & Commodities"
  | "Fixed deposit"
  | "Crypto"
  | "Other";

export interface HoldingSip {
  amount: number;
  day: number;
  from_account: string;
  active: boolean;
}

export interface Holding {
  id: string;
  type: AssetType;
  broker: string;
  name: string;
  opening_invested: number; // Historical principal from before tracking began
  current_value: number;
  sip?: HoldingSip;
  maturity_date?: string;
  maturity_account?: string;
  annual_rate?: number; // For FDs or bonds accrual
  compounding?: "monthly" | "quarterly" | "annual";
  start_date?: string;
  notes?: string;
}

export type GoalKind = "emergency" | "goal" | "sinking";

export interface Goal {
  id: string;
  name: string;
  kind: GoalKind;
  target: number;
  target_date?: string; // YYYY-MM-DD
  monthly_contribution: number;
  contribution_mode: "auto" | "manual";
  opening_amount: number;
  icon?: string;
  color?: string;
  notes?: string;
}

export type ScheduleFrequency = "Weekly" | "Monthly" | "Yearly";

export interface Schedule {
  id: string;
  name: string;
  kind: "income" | "expense" | "transfer";
  amount: number;
  frequency: ScheduleFrequency;
  next_date: string; // YYYY-MM-DD
  account: string;
  category: string;
  auto_post: boolean;
  active: boolean;
  need_want?: NeedWant;
  subtype?: EntrySubtype;
}

export interface ProfileTargets {
  full_name: string;
  email: string;
  phone?: string;
  occupation?: string;
  bio?: string;
  monthly_income_target: number;
  savings_rate_target: number; // % (e.g. 35)
  emergency_target_months: number; // default 6
  risk_profile: "Conservative" | "Balanced" | "Aggressive";
}

export interface WealthPreferences {
  currency: "INR" | "USD" | "GBP" | "EUR";
  date_format: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  week_start: "Monday" | "Sunday";
  theme: "light" | "dark" | "system";
  default_account: string;
  default_type: "Expense" | "Income";
  default_payment_method: string;
  alerts: {
    emi_sip_bill_3_days: boolean;
    balance_short_warning: boolean;
    budget_90_percent: boolean;
    goal_behind_schedule: boolean;
    goals_exceed_cash: boolean;
  };
}

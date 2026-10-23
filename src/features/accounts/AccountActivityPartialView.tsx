import { useState } from "react";
import {
  ArrowLeftRight,
  CreditCard,
  Plus,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstitutionLogo } from "@/components/shared/InstitutionLogo";
import { TransactionTable } from "@/components/shared/TransactionTable";
import {
  getAccountBalance,
  INVESTMENT_OUTFLOW_ACTIONS,
  type Account,
  type Transaction,
  type WealthState,
} from "@/lib/wealthtrack";

export function AccountActivityPartialView({
  account,
  data,
  money,
  onClose,
  onAddTransaction,
  onTransfer,
  onSelectTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onBulkDeleteTransactions,
}: {
  account: Account;
  data: WealthState;
  money: (amount: number) => string;
  onClose: () => void;
  onAddTransaction: (accountId: string) => void;
  onTransfer: (account: Account) => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
  onBulkDeleteTransactions?: (ids?: string[]) => void;
}) {
  const [filterType, setFilterType] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");

  const balance = getAccountBalance(account, data.transactions);
  const allAccountTxs = data.transactions.filter(
    (t) => t.accountId === account.id || t.destinationAccountId === account.id
  );

  const totalInflow = allAccountTxs
    .filter(
      (t) =>
        t.type === "Income" ||
        t.type === "Refund" ||
        t.type === "Borrow / Loan Taken" ||
        t.type === "Debt Recovery" ||
        (t.type === "Transfer" && t.destinationAccountId === account.id) ||
        (t.type === "Adjustment" && t.amount > 0) ||
        (t.type === "Investment" &&
          t.investmentAction &&
          !INVESTMENT_OUTFLOW_ACTIONS.includes(t.investmentAction) &&
          t.investmentAction !== "Valuation")
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflow = allAccountTxs
    .filter(
      (t) =>
        t.type === "Expense" ||
        t.type === "EMI / Loan Payment" ||
        t.type === "Lend / Loan Given" ||
        (t.type === "Transfer" && t.accountId === account.id) ||
        (t.type === "Adjustment" && t.amount < 0) ||
        (t.type === "Investment" &&
          t.investmentAction &&
          INVESTMENT_OUTFLOW_ACTIONS.includes(t.investmentAction))
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const filtered = allAccountTxs.filter((tx) => {
    if (filterType !== "All" && tx.type !== filterType) return false;
    if (filterPriority !== "All" && tx.need !== filterPriority) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-3.5">
            <InstitutionLogo name={account.institution || account.name} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {account.kind}
                </span>
                {account.identifier && (
                  <span className="text-xs text-muted-foreground">· {account.identifier}</span>
                )}
              </div>
              <h2 className="text-xl font-black text-foreground">{account.name}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Account Balance Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Current Balance
            </span>
            <span
              className={`text-lg font-black mt-0.5 block tabular-nums ${
                balance >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {money(balance)}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Inflows
            </span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
              +{money(totalInflow)}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Outflows
            </span>
            <span className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5 block tabular-nums">
              −{money(totalOutflow)}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Ledger Items
            </span>
            <span className="text-base font-bold text-foreground mt-0.5 block">
              {allAccountTxs.length} items
            </span>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onAddTransaction(account.id)}
              className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
            >
              <Plus size={14} /> Add Transaction
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTransfer(account)}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <ArrowLeftRight size={13} /> Transfer
            </Button>
          </div>
        </div>

        {/* Reused Shared TransactionTable Component */}
        <TransactionTable
          transactions={filtered}
          data={data}
          money={money}
          onView={onSelectTransaction}
          onEdit={onEditTransaction}
          onDelete={onDeleteTransaction}
          onBulkDelete={onBulkDeleteTransactions}
          showAccountColumn={false}
          searchPlaceholder="Search this account's transactions…"
          headerActions={
            <div className="flex items-center gap-1.5">
              <select
                className="wt-field h-8 text-xs py-0 pl-2.5 pr-8 font-semibold bg-background w-auto min-w-[120px] sm:min-w-[130px] cursor-pointer"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filter by type"
              >
                <option value="All">All Types</option>
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
                <option value="EMI / Loan Payment">EMI</option>
                <option value="Borrow / Loan Taken">Borrowed</option>
                <option value="Lend / Loan Given">Lent</option>
                <option value="Debt Recovery">Recovery</option>
                <option value="Transfer">Transfer</option>
                <option value="Adjustment">Adjustment</option>
              </select>
              <select
                className="wt-field h-8 text-xs py-0 pl-2.5 pr-8 font-semibold bg-background w-auto min-w-[125px] sm:min-w-[130px] cursor-pointer"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                aria-label="Priority Classification"
              >
                <option value="All">All Priorities</option>
                <option value="Need">Need</option>
                <option value="Want">Want</option>
              </select>
            </div>
          }
        />
      </div>
    </div>
  );
}

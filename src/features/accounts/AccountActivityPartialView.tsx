import { useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  CreditCard,
  Landmark,
  Pencil,
  Plus,
  Scale,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { InstitutionLogo } from "@/components/shared/InstitutionLogo";
import { TransactionTable } from "@/components/shared/TransactionTable";
import {
  getAccountBalance,
  INVESTMENT_OUTFLOW_ACTIONS,
  safeAmount,
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
  onEdit,
  onReconcile,
  onArchive,
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
  onEdit?: (account: Account) => void;
  onReconcile?: (account: Account) => void;
  onArchive?: (account: Account) => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
  onBulkDeleteTransactions?: (ids?: string[]) => void;
}) {
  const [filterType, setFilterType] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const hasActiveFilters = filterType !== "All" || filterPriority !== "All";

  const balance = getAccountBalance(account, data.transactions);
  const allAccountTxs = data.transactions.filter(
    (t) => t.accountId === account.id || t.destinationAccountId === account.id
  );

  // Associated / Linked Loans serviced by this account
  const linkedLoans = (data.loans || []).filter(
    (l) => l.repaymentAccountId === account.id || (l as any).linkedAccountId === account.id
  );
  const linkedLoanDebt = linkedLoans.reduce((sum, l) => sum + safeAmount(l.currentOutstanding), 0);

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
    <div
      id="account-activity-partial-view"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto wt-scrollbar rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6">
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
          <div className="flex items-center gap-2">
            <ActionMenu
              items={[
                {
                  label: "Transfer funds",
                  icon: <ArrowLeftRight size={13} />,
                  onClick: () => onTransfer(account),
                },
                ...(onReconcile
                  ? [
                      {
                        label: "Reconcile balance",
                        icon: <Scale size={13} />,
                        onClick: () => onReconcile(account),
                      },
                    ]
                  : []),
                ...(onEdit
                  ? [
                      {
                        label: "Edit account",
                        icon: <Pencil size={13} />,
                        onClick: () => onEdit(account),
                      },
                    ]
                  : []),
                ...(onArchive
                  ? [
                      {
                        label: "Archive account",
                        icon: <Trash2 size={13} />,
                        destructive: true,
                        onClick: () => onArchive(account),
                      },
                    ]
                  : []),
              ]}
            />
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
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
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                Linked Debt & Loans
              </span>
              {linkedLoans.length > 0 && (
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.2 rounded shrink-0">
                  {linkedLoans.length} active
                </span>
              )}
            </div>
            <span
              className={`text-base font-bold mt-0.5 block tabular-nums ${
                linkedLoanDebt > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              }`}
            >
              {linkedLoanDebt > 0 ? money(linkedLoanDebt) : "₹0 (No debt)"}
            </span>
          </div>
        </div>

        {/* Associated Loans Banner (if any loans are serviced by this account) */}
        {linkedLoans.length > 0 && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                <Landmark size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground">
                    {linkedLoans.map((l) => l.name).join(", ")}
                  </span>
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
                    Repayment Account
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {linkedLoans.length} active loan{linkedLoans.length > 1 ? "s" : ""} serviced from this account · Monthly EMI:{" "}
                  <strong className="text-foreground">
                    {money(linkedLoans.reduce((sum, l) => sum + safeAmount(l.emiAmount), 0))}
                  </strong>
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                Total Loan Balance
              </span>
              <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                {money(linkedLoanDebt)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
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
            {onReconcile && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReconcile(account)}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Scale size={13} /> Reconcile
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            {allAccountTxs.length} transaction{allAccountTxs.length === 1 ? "" : "s"}
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
              {/* Mobile Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterExpanded((prev) => !prev)}
                className={`h-8 gap-1 px-2 text-xs font-bold transition-all cursor-pointer ${
                  hasActiveFilters
                    ? "border-primary/40 bg-primary/10 text-primary shadow-2xs"
                    : "text-muted-foreground hover:text-foreground border-border/80"
                }`}
                aria-expanded={isFilterExpanded}
                aria-label="Toggle filters"
              >
                <SlidersHorizontal size={12} className={hasActiveFilters ? "text-primary" : "text-muted-foreground"} />
                {hasActiveFilters && (
                  <span className="grid size-4 place-items-center rounded-full bg-primary text-[9.5px] font-bold text-primary-foreground leading-none">
                    {(filterType !== "All" ? 1 : 0) + (filterPriority !== "All" ? 1 : 0)}
                  </span>
                )}
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${isFilterExpanded ? "rotate-180" : ""}`}
                />
              </Button>

              <div className={`${isFilterExpanded ? "flex" : "hidden"} items-center gap-1.5 animate-in fade-in-50 duration-150`}>
                <select
                  className="wt-field h-8 text-xs py-0 pl-2 pr-7 font-semibold bg-background w-auto min-w-[95px] sm:min-w-[115px] cursor-pointer"
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
                  className="wt-field h-8 text-xs py-0 pl-2 pr-7 font-semibold bg-background w-auto min-w-[95px] sm:min-w-[110px] cursor-pointer"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  aria-label="Priority Classification"
                >
                  <option value="All">All Priorities</option>
                  <option value="Need">Need</option>
                  <option value="Want">Want</option>
                </select>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}

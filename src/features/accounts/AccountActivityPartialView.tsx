import { useState } from "react";
import {
  ArrowLeftRight,
  CreditCard,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import {
  getAccountBalance,
  INVESTMENT_OUTFLOW_ACTIONS,
  type Account,
  type Transaction,
  type WealthState,
} from "@/lib/wealthtrack";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

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
}) {
  const [search, setSearch] = useState("");
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
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchMerchant = tx.merchant?.toLowerCase().includes(q);
      const cat = data.categories.find((c) => c.id === tx.categoryId);
      const matchCat = cat?.name.toLowerCase().includes(q);
      if (!matchDesc && !matchMerchant && !matchCat) return false;
    }
    return true;
  });

  return (
    <div
      id="account-activity-partial-view"
      className="mt-8 scroll-mt-20 rounded-2xl border-2 border-primary/35 bg-card p-5 sm:p-6 shadow-xl transition-all"
    >
      <div className="space-y-4">
        {/* Account Header Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-muted/40 p-4 border border-border">
          <div className="flex items-center gap-3.5">
            <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              {account.kind === "Credit card" ? (
                <CreditCard size={22} />
              ) : account.kind === "Investment" ? (
                <TrendingUp size={22} />
              ) : (
                <Wallet size={22} />
              )}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">{account.name}</h2>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground border border-border">
                  {account.kind}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  Account Ledger
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {account.institution || "Local Account"}{" "}
                {account.identifier ? `· ${account.identifier}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
            <div className="text-left sm:text-right">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                Current Balance
              </span>
              <span className="wt-display text-2xl font-extrabold text-foreground tabular-nums">
                {money(balance)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 gap-1.5 text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Close account ledger view"
            >
              <X size={14} /> Close Activity
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Inflow
            </span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
              +{money(totalInflow)}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Outflow
            </span>
            <span className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5 block tabular-nums">
              −{money(totalOutflow)}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Net Flow
            </span>
            <span
              className={`text-base font-bold mt-0.5 block tabular-nums ${
                totalInflow >= totalOutflow
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {totalInflow >= totalOutflow ? "+" : "−"}
              {money(Math.abs(totalInflow - totalOutflow))}
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

        {/* Action Toolbar & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onAddTransaction(account.id)}
              className="h-8 gap-1.5 text-xs font-semibold"
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
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="wt-field h-8 w-36 sm:w-48 text-xs"
              placeholder="Search ledger…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="wt-field h-8 w-28 text-xs py-0"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Filter by type"
            >
              <option value="All">All Types</option>
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
              <option value="Transfer">Transfer</option>
              <option value="Investment">Investment</option>
              <option value="Adjustment">Adjustment</option>
            </select>
            <select
              className="wt-field h-8 w-32 text-xs py-0"
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

        {/* Ledger Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden grid-cols-[minmax(0,1.3fr)_120px_90px_95px_110px_48px] items-center gap-2 bg-muted/75 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground md:grid border-b border-border">
            <span>Transaction</span>
            <span>Category</span>
            <span>Priority</span>
            <span>Date</span>
            <span className="text-right">Amount</span>
            <span className="text-center font-bold text-foreground">Actions</span>
          </div>
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
            {filtered.length ? (
              filtered.map((tx) => {
                const positive =
                  tx.type === "Income" ||
                  tx.type === "Refund" ||
                  (tx.type === "Adjustment" && tx.amount > 0) ||
                  (tx.type === "Transfer" && tx.destinationAccountId === account.id) ||
                  (tx.type === "Investment" &&
                    tx.investmentAction &&
                    !INVESTMENT_OUTFLOW_ACTIONS.includes(tx.investmentAction) &&
                    tx.investmentAction !== "Valuation");

                const cat = data.categories.find((c) => c.id === tx.categoryId);

                return (
                  <div
                    key={tx.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto_36px] items-center gap-2 px-3.5 py-2.5 text-xs hover:bg-muted/30 transition-colors md:grid-cols-[minmax(0,1.3fr)_120px_90px_95px_110px_48px]"
                  >
                    <button
                      className="min-w-0 text-left"
                      onClick={() => onSelectTransaction(tx)}
                      type="button"
                    >
                      <span className="block truncate font-semibold text-sm hover:text-primary text-foreground">
                        {tx.description}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground md:hidden">
                        {cat ? `${cat.icon} ${cat.name}` : tx.type} · {formatDate(tx.date)}
                      </span>
                      {tx.merchant && (
                        <span className="block truncate text-[11px] text-muted-foreground hidden md:block">
                          {tx.merchant}
                        </span>
                      )}
                    </button>
                    <span className="hidden truncate md:block font-medium text-foreground">
                      {cat ? `${cat.icon} ${cat.name}` : tx.type === "Transfer" ? "Transfer" : "—"}
                    </span>
                    <span className="hidden md:block">
                      {tx.type === "Expense" ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            tx.need === "Want"
                              ? "border border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {tx.need === "Want" ? "Want" : "Need"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </span>
                    <span className="hidden text-muted-foreground md:block">{formatDate(tx.date)}</span>
                    <span
                      className={`text-right font-bold sm:text-sm tabular-nums ${
                        positive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : tx.type === "Expense"
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground"
                      }`}
                    >
                      {positive ? "+" : tx.type === "Expense" ? "−" : ""}
                      {money(tx.amount)}
                    </span>
                    <div className="flex items-center justify-center">
                      <ActionMenu
                        items={[
                          {
                            label: "Edit transaction",
                            icon: <Pencil size={13} />,
                            onClick: () => onEditTransaction(tx),
                          },
                          {
                            label: "Delete transaction",
                            icon: <Trash2 size={13} />,
                            destructive: true,
                            onClick: () => onDeleteTransaction(tx),
                          },
                        ]}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No matching transactions recorded in this account.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
            {allAccountTxs.length} transactions
          </span>
        </div>
      </div>
    </div>
  );
}

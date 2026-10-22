import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  CreditCard,
  Eye,
  Pencil,
  Plus,
  Scale,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { PageHeading } from "@/components/shared/PageHeading";
import { AccountActivityPartialView } from "./AccountActivityPartialView";
import { ReconcileModal } from "./ReconcileModal";
import {
  getAccountBalance,
  type Account,
  type Transaction,
  type WealthState,
} from "@/lib/wealthtrack";

export function AccountsPage({
  data,
  money,
  selected,
  setSelected,
  onAdd,
  onEdit,
  onTransfer,
  onReconcile,
  onArchive,
  onSelectTransaction,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}: {
  data: WealthState;
  money: (amount: number) => string;
  selected: Account | null;
  setSelected: (account: Account | null) => void;
  onAdd: () => void;
  onEdit: (account: Account) => void;
  onTransfer: (account: Account) => void;
  onReconcile: (accountId: string, newBalance: number, notes?: string) => void;
  onArchive: (account: Account) => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onAddTransaction: (accountId: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
}) {
  const [reconcilingAccount, setReconcilingAccount] = useState<Account | null>(null);

  const activeAccounts = data.accounts.filter((a) => !a.archived);
  const totalBalance = activeAccounts.reduce(
    (sum, acc) => sum + getAccountBalance(acc, data.transactions),
    0
  );

  // Asset accounts vs Liability accounts (Credit cards)
  const assetAccounts = activeAccounts.filter((a) => a.kind !== "Credit card");
  const liabilityAccounts = activeAccounts.filter((a) => a.kind === "Credit card");
  const totalAssets = assetAccounts.reduce(
    (sum, acc) => sum + Math.max(0, getAccountBalance(acc, data.transactions)),
    0
  );
  const totalLiabilities = liabilityAccounts.reduce(
    (sum, acc) => sum + Math.abs(getAccountBalance(acc, data.transactions)),
    0
  );

  // Balanced grid class: when 4 accounts, render 2-col on tablet and 4-col on desktop
  // to avoid leaving an orphan 4th card on a second row
  const gridColsClass =
    activeAccounts.length === 4
      ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      : activeAccounts.length % 3 === 0
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      : activeAccounts.length % 2 === 0
      ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  // Auto-scroll to partial view smoothly when an account is selected
  useEffect(() => {
    if (selected) {
      const timer = setTimeout(() => {
        const el = document.getElementById("account-activity-partial-view");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [selected?.id]);

  const activeSelected = selected
    ? activeAccounts.find((a) => a.id === selected.id) || selected
    : null;

  return (
    <>
      <PageHeading
        title="Accounts"
        description="Bank accounts, digital wallets, cash reserves, and liabilities."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTransfer(activeAccounts[0])}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <ArrowLeftRight size={14} /> Transfer
            </Button>
            <Button size="sm" onClick={onAdd} className="h-9 gap-1.5 text-xs font-semibold shadow-xs">
              <Plus size={15} /> Add Account
            </Button>
          </div>
        }
      />

      {/* Net Worth & Assets/Liabilities Overview Card */}
      <div className="mb-6 grid gap-4 rounded-xl border border-border bg-card p-5 wt-shadow sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Liquid Net Worth
          </p>
          <p className="wt-display mt-1 text-3xl font-extrabold text-primary tabular-nums">
            {money(totalBalance)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {activeAccounts.length} active financial accounts
          </p>
        </div>
        <div className="border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Liquid Assets
          </p>
          <p className="wt-display mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {money(totalAssets)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {assetAccounts.length} Bank, Cash & Wallet accounts
          </p>
        </div>
        <div className="border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Liabilities & Credit Outstandings
          </p>
          <p className="wt-display mt-1 text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {money(totalLiabilities)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {liabilityAccounts.length} Credit Card & liability accounts
          </p>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className={gridColsClass}>
        {activeAccounts.map((account) => {
          const balance = getAccountBalance(account, data.transactions);
          const isSelected = selected?.id === account.id;
          const isCard = account.kind === "Credit card";

          return (
            <div
              key={account.id}
              className={`rounded-xl border p-5 transition-all wt-shadow bg-card ${
                isSelected
                  ? "border-primary ring-2 ring-primary/25 shadow-md bg-accent/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {account.kind}
                    </span>
                    {isCard && (
                      <span className="inline-block rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        Liability
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-foreground">{account.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {account.institution || "Local account"}{" "}
                    {account.identifier ? `· ${account.identifier}` : ""}
                  </p>
                </div>
                <span
                  className={`grid size-10 place-items-center rounded-xl transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {isCard ? (
                    <CreditCard size={19} />
                  ) : account.kind === "Investment" ? (
                    <TrendingUp size={19} />
                  ) : (
                    <Wallet size={19} />
                  )}
                </span>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  {isCard ? "Outstanding Balance" : "Current Balance"}
                </p>
                <p className="wt-display mt-0.5 text-2xl font-extrabold text-foreground tabular-nums">
                  {money(balance)}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <Button
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  className="h-8 gap-1.5 text-xs font-semibold"
                  onClick={() => setSelected(isSelected ? null : account)}
                >
                  <Eye size={13} /> {isSelected ? "Hide Activity" : "View Activity"}
                </Button>
                <ActionMenu
                  items={[
                    {
                      label: isSelected ? "Hide activity ledger" : "View activity ledger",
                      icon: <Eye size={13} />,
                      onClick: () => setSelected(isSelected ? null : account),
                    },
                    {
                      label: "Transfer funds",
                      icon: <ArrowLeftRight size={13} />,
                      onClick: () => onTransfer(account),
                    },
                    {
                      label: "Reconcile balance",
                      icon: <Scale size={13} />,
                      onClick: () => setReconcilingAccount(account),
                    },
                    {
                      label: "Edit account",
                      icon: <Pencil size={13} />,
                      onClick: () => onEdit(account),
                    },
                    {
                      label: "Archive account",
                      icon: <Trash2 size={13} />,
                      destructive: true,
                      onClick: () => onArchive(account),
                    },
                  ]}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Account Activity Partial View */}
      {activeSelected && (
        <AccountActivityPartialView
          account={activeSelected}
          data={data}
          money={money}
          onClose={() => setSelected(null)}
          onAddTransaction={onAddTransaction}
          onTransfer={onTransfer}
          onSelectTransaction={onSelectTransaction}
          onEditTransaction={onEditTransaction}
          onDeleteTransaction={onDeleteTransaction}
        />
      )}

      {/* Reconcile Modal (Replaces window.prompt per spec) */}
      {reconcilingAccount && (
        <ReconcileModal
          account={reconcilingAccount}
          currentBalance={getAccountBalance(reconcilingAccount, data.transactions)}
          currency={data.preferences.currency}
          onClose={() => setReconcilingAccount(null)}
          onReconcile={(accId, newBal, notes) => {
            onReconcile(accId, newBal, notes);
            setReconcilingAccount(null);
          }}
        />
      )}
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ChevronRight,
  CreditCard,
  Eye,
  Landmark,
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
import { InstitutionLogo } from "@/components/shared/InstitutionLogo";
import { AccountActivityPartialView } from "./AccountActivityPartialView";
import { ReconcileModal } from "./ReconcileModal";
import {
  getAccountBalance,
  getAllAccountBalances,
  getLoansSummary,
  safeAmount,
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
  onBulkDeleteTransactions,
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
  onBulkDeleteTransactions?: (ids?: string[]) => void;
}) {
  const [reconcilingAccount, setReconcilingAccount] = useState<Account | null>(null);

  const accountBalances = useMemo(
    () => getAllAccountBalances(data.accounts, data.transactions),
    [data.accounts, data.transactions]
  );

  const activeAccounts = useMemo(
    () => data.accounts.filter((a) => !a.archived),
    [data.accounts]
  );

  const { totalBalance, totalAssets, totalLiabilities, assetAccounts, liabilityAccounts, totalLoanDebt } = useMemo(() => {
    let balance = 0;
    let assets = 0;
    let ccLiabilities = 0;
    const assetsList: Account[] = [];
    const liabilitiesList: Account[] = [];

    for (const acc of activeAccounts) {
      const b = accountBalances.get(acc.id) ?? (acc.openingBalance || 0);
      balance += b;
      if (acc.kind === "Credit card") {
        liabilitiesList.push(acc);
        ccLiabilities += Math.abs(b);
      } else {
        assetsList.push(acc);
        assets += Math.max(0, b);
      }
    }

    const loansSummary = getLoansSummary(data.loans || []);
    const totalLiab = ccLiabilities + loansSummary.totalOutstanding;

    return {
      totalBalance: balance,
      totalAssets: assets,
      totalLiabilities: totalLiab,
      totalLoanDebt: loansSummary.totalOutstanding,
      assetAccounts: assetsList,
      liabilityAccounts: liabilitiesList,
    };
  }, [activeAccounts, accountBalances, data.loans]);

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
    <div className="space-y-6">
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
      <div className="rounded-xl sm:rounded-2xl border border-border/80 bg-card p-3 sm:p-5 wt-shadow divide-y divide-border/60 sm:divide-y-0 sm:grid sm:grid-cols-3 sm:gap-4">
        {/* Section 1: Total Liquid Net Worth */}
        <div className="pb-2.5 sm:pb-0 flex items-center justify-between gap-3 sm:block">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Liquid Net Worth
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              Across {activeAccounts.length} active financial accounts
            </p>
          </div>
          <p className="wt-display text-base sm:text-3xl font-extrabold text-primary tabular-nums whitespace-nowrap shrink-0 sm:mt-1">
            {money(totalBalance)}
          </p>
        </div>

        {/* Section 2: Liquid Assets */}
        <div className="py-2.5 sm:py-0 sm:border-l sm:border-border/60 sm:pl-4 flex items-center justify-between gap-3 sm:block">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Liquid Assets
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              {assetAccounts.length} Bank, Cash & Wallet accounts
            </p>
          </div>
          <p className="wt-display text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap shrink-0 sm:mt-1">
            {money(totalAssets)}
          </p>
        </div>

        {/* Section 3: Liabilities */}
        <div className="pt-2.5 sm:pt-0 sm:border-l sm:border-border/60 sm:pl-4 flex items-center justify-between gap-3 sm:block">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Liabilities & Debt
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
              {data.loans && data.loans.length > 0
                ? `${liabilityAccounts.length} Cards · ${data.loans.length} active loans`
                : `${liabilityAccounts.length} Credit Card & liability accounts`}
            </p>
          </div>
          <p className="wt-display text-base sm:text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap shrink-0 sm:mt-1">
            {money(totalLiabilities)}
          </p>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className={gridColsClass}>
        {activeAccounts.map((account) => {
          const balance = accountBalances.get(account.id) ?? (account.openingBalance || 0);
          const isSelected = selected?.id === account.id;
          const isCard = account.kind === "Credit card";

          return (
            <div
              key={account.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => setSelected(isSelected ? null : account)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(isSelected ? null : account);
                }
              }}
              className={`group cursor-pointer rounded-xl border p-4 sm:p-5 transition-all wt-shadow bg-card hover:border-primary/50 hover:shadow-xs flex flex-col justify-between select-none ${
                isSelected
                  ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]"
                  : "border-border/70"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {account.kind}
                      </span>
                      {isCard && (
                        <span className="inline-block rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider">
                          Liability
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {account.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {account.institution || "Local account"}{" "}
                      {account.identifier ? `· ${account.identifier}` : ""}
                    </p>
                  </div>
                  <InstitutionLogo
                    name={account.institution || account.name}
                    size="md"
                    className={`shrink-0 transition-transform group-hover:scale-105 ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                  />
                </div>

                <div className="mt-4 pt-3 border-t border-border/50">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {isCard ? "Outstanding Balance" : "Current Balance"}
                  </span>
                  <p className="wt-display mt-0.5 text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                    {money(balance)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-muted-foreground/80">
                  {isCard ? "Credit Account" : "Available Funds"}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                  {isSelected ? "Active Ledger ↑" : "View Details →"}
                </span>
              </div>
            </div>
          );
        })}

        {/* Add Bank / Account Card */}
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl border-2 border-dashed border-border/70 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 p-5 transition-all flex flex-col items-center justify-center text-center gap-2.5 min-h-[170px] group cursor-pointer"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-2xs">
            <Plus size={20} />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground block group-hover:text-primary transition-colors">
              Add New Account
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
              Bank, Credit Card, or Wallet
            </span>
          </div>
        </button>
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
          onEdit={onEdit}
          onReconcile={(acc) => setReconcilingAccount(acc)}
          onArchive={onArchive}
          onSelectTransaction={onSelectTransaction}
          onEditTransaction={onEditTransaction}
          onDeleteTransaction={onDeleteTransaction}
          onBulkDeleteTransactions={onBulkDeleteTransactions}
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
    </div>
  );
}

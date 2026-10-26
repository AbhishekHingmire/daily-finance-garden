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
  Sparkles,
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
  getInvestmentSummary,
  getLoansSummary,
  safeAmount,
  type Account,
  type Section,
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
  onNavigate,
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
  onNavigate?: (section: Section) => void;
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

  const holdingsValuation = useMemo(() => {
    return (data.investments ?? []).reduce((sum, h) => sum + (h.currentAmount || 0), 0);
  }, [data.investments]);

  const investmentSummary = useMemo(() => {
    return getInvestmentSummary(data.transactions);
  }, [data.transactions]);

  const effectiveInvestmentsVal = holdingsValuation > 0
    ? holdingsValuation
    : (investmentSummary.currentValue ?? investmentSummary.contributions);

  const totalNetWorth = totalBalance + effectiveInvestmentsVal;

  const totalAssetsSum = Math.max(1, totalAssets + effectiveInvestmentsVal + totalLiabilities);
  const liquidPct = Math.round((totalAssets / totalAssetsSum) * 100);
  const invPct = Math.round((effectiveInvestmentsVal / totalAssetsSum) * 100);
  const liabilityPct = Math.round((totalLiabilities / totalAssetsSum) * 100);

  const monthIncome = useMemo(
    () =>
      data.transactions
        .filter((t) => t.type === "Income" || t.type === "Borrow / Loan Taken" || t.type === "Debt Recovery" || t.type === "Refund")
        .reduce((sum, item) => sum + item.amount, 0),
    [data.transactions]
  );
  const monthExpenses = useMemo(
    () =>
      data.transactions
        .filter((t) => t.type === "Expense" || t.type === "EMI / Loan Payment" || t.type === "Lend / Loan Given")
        .reduce((sum, item) => sum + item.amount, 0),
    [data.transactions]
  );
  const netCashFlow = monthIncome - monthExpenses;
  const savingsRate = monthIncome > 0 ? Math.round((netCashFlow / monthIncome) * 100) : 0;

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

      {/* Portfolio Net Worth Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 sm:p-6 wt-shadow hover:border-border transition-all">
        <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Consolidated Net Worth
              </span>
              {totalLiabilities > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  True Net Worth (Assets − Debt): <strong className="text-foreground ml-0.5 tabular-nums">{money(totalAssets + effectiveInvestmentsVal - totalLiabilities)}</strong>
                </span>
              )}
              {savingsRate > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <Sparkles size={10} /> +{savingsRate}% Saved this period
                </span>
              )}
            </div>

            <p className="wt-display mt-1.5 text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight tabular-nums whitespace-nowrap">
              {money(totalNetWorth)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Consolidated asset holdings across active accounts and investments
            </p>
          </div>

          {/* Interactive Sub-KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 border-t border-border/60 pt-4 sm:pt-5 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div
              className="group flex items-center justify-between sm:block rounded-xl border border-border/60 bg-muted/20 hover:bg-card hover:border-border/90 p-3 transition-all"
            >
              <div className="flex items-center justify-between sm:w-full">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Liquid Cash
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5 sm:hidden">
                    {liquidPct}% of portfolio
                  </span>
                </div>
                <span className="grid size-6 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hidden sm:grid">
                  <Wallet size={12} />
                </span>
              </div>
              <div className="flex items-center gap-2 sm:block sm:mt-1.5 shrink-0">
                <p className="text-sm sm:text-base font-bold text-foreground tabular-nums whitespace-nowrap">
                  {money(totalAssets)}
                </p>
                <span className="grid size-6 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 sm:hidden">
                  <Wallet size={12} />
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:block mt-0.5">
                {liquidPct}% of portfolio
              </span>
            </div>

            <div
              className={`group flex items-center justify-between sm:block rounded-xl border border-border/60 bg-muted/20 hover:bg-card hover:border-border/90 p-3 transition-all ${
                onNavigate ? "cursor-pointer" : ""
              }`}
              onClick={() => onNavigate?.("Investments")}
            >
              <div className="flex items-center justify-between sm:w-full">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Investments
                  </span>
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium block mt-0.5 sm:hidden">
                    {invPct}% of portfolio
                  </span>
                </div>
                <span className="grid size-6 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 hidden sm:grid">
                  <TrendingUp size={12} />
                </span>
              </div>
              <div className="flex items-center gap-2 sm:block sm:mt-1.5 shrink-0">
                <p className="text-sm sm:text-base font-bold text-foreground tabular-nums whitespace-nowrap">
                  {money(effectiveInvestmentsVal)}
                </p>
                <span className="grid size-6 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 sm:hidden">
                  <TrendingUp size={12} />
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:block mt-0.5">
                {invPct}% of portfolio
              </span>
            </div>

            <div
              className={`group flex items-center justify-between sm:block rounded-xl border border-border/60 bg-muted/20 hover:bg-card hover:border-border/90 p-3 transition-all ${
                onNavigate ? "cursor-pointer" : ""
              }`}
              onClick={() => onNavigate?.("Loans")}
            >
              <div className="flex items-center justify-between sm:w-full">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Liabilities & Debt
                  </span>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium block mt-0.5 sm:hidden">
                    {(data.loans ?? []).length} loans · {liabilityPct}%
                  </span>
                </div>
                <span className="grid size-6 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hidden sm:grid">
                  <Landmark size={12} />
                </span>
              </div>
              <div className="flex items-center gap-2 sm:block sm:mt-1.5 shrink-0">
                <p className="text-sm sm:text-base font-bold text-foreground tabular-nums whitespace-nowrap">
                  {money(totalLiabilities)}
                </p>
                <span className="grid size-6 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 sm:hidden">
                  <Landmark size={12} />
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:block mt-0.5">
                {(data.loans ?? []).length} loans · {liabilityPct}% of total
              </span>
            </div>
          </div>
        </div>

        {/* Proportional Asset Breakdown Bar */}
        <div className="mt-6 border-t border-border/60 pt-4 relative z-10">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted flex shadow-inner">
            <div
              style={{ width: `${liquidPct}%` }}
              className="h-full bg-emerald-500 transition-all"
              title={`Liquid Cash: ${liquidPct}%`}
            />
            <div
              style={{ width: `${invPct}%` }}
              className="h-full bg-violet-500 transition-all"
              title={`Investments: ${invPct}%`}
            />
            <div
              style={{ width: `${liabilityPct}%` }}
              className="h-full bg-rose-500 transition-all"
              title={`Liabilities: ${liabilityPct}%`}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> Liquid Cash ({liquidPct}%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-violet-500" /> Investments ({invPct}%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-500" /> Liabilities ({liabilityPct}%)
              </span>
            </div>
            <span className="text-muted-foreground/80 hidden sm:inline">
              Portfolio Distribution
            </span>
          </div>
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

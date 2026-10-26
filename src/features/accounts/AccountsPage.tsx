import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ChevronRight,
  CreditCard,
  Eye,
  HandCoins,
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
import { Metric } from "@/components/shared/Metric";
import { migrateLegacyState } from "@/lib/migration";
import { getWealthMetrics, getAccountBalances } from "@/lib/metrics-service";
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

  const unified = useMemo(() => migrateLegacyState(data), [data]);
  const accountBalances = useMemo(
    () => getAccountBalances(unified.accounts, unified.entries),
    [unified]
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

  const wealthMetrics = useMemo(
    () =>
      getWealthMetrics(
        unified.accounts,
        unified.entries,
        unified.holdings,
        unified.loans,
        unified.goals
      ),
    [unified]
  );

  const totalAssetsSum = Math.max(1, wealthMetrics.totalAssets + wealthMetrics.totalDebt);
  const assetsPct = Math.round((wealthMetrics.totalAssets / totalAssetsSum) * 100);
  const debtPct = 100 - assetsPct;

  const totalAssetsValue = wealthMetrics.totalAssets;
  const cashPct = totalAssetsValue > 0 ? Math.round((wealthMetrics.liquidCash / totalAssetsValue) * 100) : 0;
  const invPct = totalAssetsValue > 0 ? Math.round((wealthMetrics.investmentsValue / totalAssetsValue) * 100) : 0;
  const recPct = Math.max(0, 100 - cashPct - invPct);

  const totalNetWorth = wealthMetrics.netWorth;
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
        isBalancePage
        primaryAction={
          <Button size="sm" onClick={onAdd} className="h-9 gap-1.5 text-xs font-semibold shadow-xs">
            <Plus size={15} /> Add account
          </Button>
        }
        moreMenuItems={[
          {
            label: "Transfer",
            icon: <ArrowLeftRight size={14} />,
            onClick: () => onTransfer(activeAccounts[0]),
          },
        ]}
      />

      {/* Portfolio Net Worth & Wealth Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 sm:p-6 wt-shadow hover:border-border transition-all space-y-4">
        <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between relative">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                Net Worth
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground flex-wrap max-w-full">
                <span>Assets: <strong className="text-foreground ml-0.5 tabular-nums"><Metric id="total_assets" value={wealthMetrics.totalAssets} /></strong></span>
                <span>·</span>
                <span>Loans: <strong className="text-foreground ml-0.5 tabular-nums"><Metric id="total_debt" value={wealthMetrics.totalDebt} /></strong></span>
              </span>
            </div>

            <p className="wt-display mt-1.5 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight tabular-nums truncate max-w-full">
              <Metric id="net_worth" value={wealthMetrics.netWorth} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your loans are counted in full; a home or car you own isn't tracked as an asset yet.
            </p>
          </div>

          {/* 4 Interactive Sub-KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 border-t border-border/60 pt-4 sm:pt-5 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div className="group rounded-xl border border-border/60 bg-muted/20 hover:bg-card hover:border-border/90 p-2.5 sm:p-3 transition-all">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Cash
              </span>
              <p className="text-xs sm:text-sm font-bold text-foreground tabular-nums mt-1 truncate">
                <Metric id="cash" value={wealthMetrics.liquidCash} />
              </p>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {activeAccounts.length} accounts
              </span>
            </div>

            <div
              className="group rounded-xl border border-border/60 bg-muted/20 hover:bg-card hover:border-border/90 p-2.5 sm:p-3 transition-all cursor-pointer"
              onClick={() => onNavigate?.("Investments")}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Investments
              </span>
              <p className="text-xs sm:text-sm font-bold text-foreground tabular-nums mt-1 truncate">
                <Metric id="invested" value={wealthMetrics.investmentsValue} />
              </p>
              <span className="text-[10px] text-primary block mt-0.5">
                {(data.investments ?? []).length} holdings ›
              </span>
            </div>

            <div className="group rounded-xl border border-border/60 bg-muted/20 hover:bg-card hover:border-border/90 p-2.5 sm:p-3 transition-all">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Lent Out
              </span>
              <p className="text-xs sm:text-sm font-bold text-foreground tabular-nums mt-1 truncate">
                <Metric id="lent_out" value={wealthMetrics.receivablesValue} />
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                Receivables
              </span>
            </div>

            <div
              className="group rounded-xl border border-border/60 bg-muted/20 hover:bg-card hover:border-border/90 p-2.5 sm:p-3 transition-all cursor-pointer"
              onClick={() => onNavigate?.("Loans")}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Debt (Liabilities)
              </span>
              <p className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-1 truncate">
                <Metric id="total_debt" value={wealthMetrics.totalDebt} />
              </p>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block mt-0.5">
                {(data.loans ?? []).length} loans ›
              </span>
            </div>
          </div>
        </div>

        {/* Asset Composition Proportion Bar */}
        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${cashPct}%` }}
              className="bg-emerald-500 h-full transition-all"
              title={`Cash: ${cashPct}%`}
            />
            <div
              style={{ width: `${invPct}%` }}
              className="bg-blue-500 h-full transition-all"
              title={`Investments: ${invPct}%`}
            />
            {recPct > 0 && (
              <div
                style={{ width: `${recPct}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Receivables: ${recPct}%`}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1 font-medium">
                <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                Cash: <strong className="text-foreground">{money(wealthMetrics.liquidCash)}</strong> ({cashPct}%)
              </span>
              <span className="inline-flex items-center gap-1 font-medium">
                <span className="size-2 rounded-full bg-blue-500 inline-block" />
                Investments: <strong className="text-foreground">{money(wealthMetrics.investmentsValue)}</strong> ({invPct}%)
              </span>
              {wealthMetrics.receivablesValue > 0 && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <span className="size-2 rounded-full bg-amber-500 inline-block" />
                  Lent: <strong className="text-foreground">{money(wealthMetrics.receivablesValue)}</strong> ({recPct}%)
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Total Debt: <span className="font-semibold text-rose-600 dark:text-rose-400">{money(wealthMetrics.totalDebt)}</span> (serviced via EMIs)
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className={`${gridColsClass} w-full max-w-full`}>
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
              className={`group cursor-pointer rounded-xl border p-4 sm:p-5 transition-all wt-shadow bg-card hover:border-primary/50 hover:shadow-xs flex flex-col justify-between select-none w-full min-w-0 max-w-full overflow-hidden ${
                isSelected
                  ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]"
                  : "border-border/70"
              }`}
            >
              <div className="w-full min-w-0">
                <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                  <p className="wt-display mt-0.5 text-xl sm:text-2xl font-bold text-foreground tabular-nums truncate">
                    <Metric id={`account_balance:${account.id}`} value={balance} />
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2 text-xs w-full min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground/80 truncate">
                  {isCard ? "Credit Account" : "Available Funds"}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform shrink-0">
                  {isSelected ? "Active Transactions ↑" : "View Details →"}
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

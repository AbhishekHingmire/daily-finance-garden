import { useState, useEffect } from "react";
import { Landmark, TrendingUp, Wallet } from "lucide-react";
import { AccountsPage } from "@/features/accounts/AccountsPage";
import { InvestmentsPage } from "@/features/investments/InvestmentsPage";
import { LoansPage } from "@/features/loans/LoansPage";
import type { Account, InvestmentHolding, LoanLiability, Section, Transaction, WealthState } from "@/lib/wealthtrack";

export type WealthSubtab = "accounts" | "investments" | "loans";

export interface WealthHubProps {
  initialSubtab?: WealthSubtab;
  data: WealthState;
  money: (amount: number) => string;
  selectedAccount: Account | null;
  setSelectedAccount: (acc: Account | null) => void;
  onAddAccount: () => void;
  onEditAccount: (acc: Account) => void;
  onTransfer: (acc: Account) => void;
  onReconcile: (accountId: string, newBalance: number, notes?: string) => void;
  onArchiveAccount: (acc: Account) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onAddTransaction: (accId: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onBulkDeleteTransactions: (ids?: string[]) => void;
  onNavigate: (section: Section) => void;
  onAddHolding: () => void;
  onEditHolding: (holding: InvestmentHolding) => void;
  onDeleteHolding: (holding: InvestmentHolding) => void;
  onToggleSip: (holding: InvestmentHolding) => void;
  onAddLoan: () => void;
  onEditLoan: (loan: LoanLiability) => void;
  onDeleteLoan: (loan: LoanLiability) => void;
  onRecordEmiPayment: (loan: LoanLiability) => void;
}

export function WealthHub({
  initialSubtab = "accounts",
  data,
  money,
  selectedAccount,
  setSelectedAccount,
  onAddAccount,
  onEditAccount,
  onTransfer,
  onReconcile,
  onArchiveAccount,
  onSelectTransaction,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onBulkDeleteTransactions,
  onNavigate,
  onAddHolding,
  onEditHolding,
  onDeleteHolding,
  onToggleSip,
  onAddLoan,
  onEditLoan,
  onDeleteLoan,
  onRecordEmiPayment,
}: WealthHubProps) {
  const [tab, setTab] = useState<WealthSubtab>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("wt_wealth_subtab") as WealthSubtab;
      if (stored && ["accounts", "investments", "loans"].includes(stored)) {
        return initialSubtab || stored;
      }
    }
    return initialSubtab || "accounts";
  });

  useEffect(() => {
    if (initialSubtab && initialSubtab !== tab) {
      setTab(initialSubtab);
    }
  }, [initialSubtab]);

  const handleTabChange = (nextTab: WealthSubtab) => {
    setTab(nextTab);
    if (typeof window !== "undefined") {
      localStorage.setItem("wt_wealth_subtab", nextTab);
    }
  };

  const tabs: { id: WealthSubtab; label: string; icon: typeof Wallet; count?: number }[] = [
    { id: "accounts", label: "Accounts", icon: Wallet, count: data.accounts.length },
    { id: "investments", label: "Investments", icon: TrendingUp, count: (data.investments ?? []).length },
    { id: "loans", label: "Loans", icon: Landmark, count: (data.loans ?? []).length },
  ];

  return (
    <div className="space-y-6">
      {/* Subtab Segmented Switcher */}
      <div className="w-full max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-border/80 pb-3">
        <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start rounded-xl bg-muted/60 p-1 border border-border/60 shadow-2xs">
          {tabs.map(({ id, label, icon: Icon, count }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTabChange(id)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-2 rounded-lg px-2 sm:px-3.5 py-1.5 text-xs font-semibold transition-all min-w-0 overflow-hidden ${
                  isActive
                    ? "bg-card text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={14} className={`shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-[11px] sm:text-xs truncate">{label}</span>
                {typeof count === "number" && (
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold ${
                      isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Selected View */}
      {tab === "accounts" && (
        <AccountsPage
          data={data}
          money={money}
          selected={selectedAccount}
          setSelected={setSelectedAccount}
          onAdd={onAddAccount}
          onEdit={onEditAccount}
          onTransfer={onTransfer}
          onReconcile={onReconcile}
          onArchive={onArchiveAccount}
          onSelectTransaction={onSelectTransaction}
          onAddTransaction={onAddTransaction}
          onEditTransaction={onEditTransaction}
          onDeleteTransaction={onDeleteTransaction}
          onBulkDeleteTransactions={onBulkDeleteTransactions}
          onNavigate={onNavigate}
        />
      )}

      {tab === "investments" && (
        <InvestmentsPage
          data={data}
          money={money}
          onAddHolding={onAddHolding}
          onEditHolding={onEditHolding}
          onDeleteHolding={onDeleteHolding}
          onToggleSip={onToggleSip}
        />
      )}

      {tab === "loans" && (
        <LoansPage
          data={data}
          money={money}
          onAddLoan={onAddLoan}
          onEditLoan={onEditLoan}
          onDeleteLoan={onDeleteLoan}
          onRecordEmiPayment={onRecordEmiPayment}
        />
      )}
    </div>
  );
}

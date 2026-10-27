import { useMemo, useState } from "react";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  CreditCard,
  Landmark,
  Pencil,
  Percent,
  PieChart,
  PiggyBank,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/shared/PageHeading";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { Metric } from "@/components/shared/Metric";
import {
  getLoansSummary,
  safeAmount,
  type LoanLiability,
  type LoanType,
  type WealthState,
} from "@/lib/wealthtrack";

export function LoansPage({
  data,
  money,
  onAddLoan,
  onEditLoan,
  onDeleteLoan,
  onRecordEmiPayment,
}: {
  data: WealthState;
  money: (val: number) => string;
  onAddLoan: () => void;
  onEditLoan: (loan: LoanLiability) => void;
  onDeleteLoan: (loan: LoanLiability) => void;
  onRecordEmiPayment: (loan: LoanLiability) => void;
}) {
  const loans = data.loans ?? [];
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");

  const summary = useMemo(() => getLoansSummary(loans), [loans]);

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const matchesSearch =
        search === "" ||
        loan.name.toLowerCase().includes(search.toLowerCase()) ||
        loan.lenderInstitution.toLowerCase().includes(search.toLowerCase()) ||
        (loan.notes && loan.notes.toLowerCase().includes(search.toLowerCase()));

      const matchesType = selectedType === "All" || loan.loanType === selectedType;
      return matchesSearch && matchesType;
    });
  }, [loans, search, selectedType]);

  const loanTypes = useMemo(() => {
    const set = new Set<string>();
    loans.forEach((l) => set.add(l.loanType));
    return ["All", ...Array.from(set)];
  }, [loans]);

  const getAccountName = (id: string) => {
    return data.accounts.find((a) => a.id === id)?.name ?? "Linked Account";
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Loans"
        description="Manage borrowings, mortgages, debt payoff progress, and linked auto-recurring bank EMIs."
        isBalancePage
        primaryAction={
          <Button
            onClick={onAddLoan}
            className="h-9 gap-1.5 px-3.5 text-xs font-semibold shadow-xs"
          >
            <Plus size={15} /> Add loan
          </Button>
        }
      />

      {/* Top Liabilities Hero Card */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-border/80 bg-linear-to-br from-card via-card to-rose-500/5 p-4 sm:p-6 wt-shadow">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-12 md:items-center">
          {/* Main Debt & Payoff Metric */}
          <div className="md:col-span-7 space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 sm:size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Landmark className="size-3.5 sm:size-4" />
              </span>
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Outstanding Debt
              </p>
            </div>

            <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-3">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground tabular-nums whitespace-nowrap">
                <Metric id="total_debt" value={summary.totalOutstanding} />
              </h2>

              <div className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-emerald-500/15 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                <PiggyBank className="size-3 sm:size-3.5" />
                <span className="whitespace-nowrap">{summary.payoffPercentage.toFixed(1)}% Repaid</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-6 pt-1 text-xs text-muted-foreground">
              <div>
                <span className="block text-[10px] sm:text-[11px] font-medium">Monthly EMI Outflow</span>
                <span className="font-bold text-destructive text-xs sm:text-sm whitespace-nowrap">
                  <Metric id="monthly_emi_total" value={summary.totalMonthlyEmi} />/mo
                </span>
              </div>
              <div className="h-5 sm:h-6 w-px bg-border" />
              <div>
                <span className="block text-[10px] sm:text-[11px] font-medium">Principal Repaid</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm whitespace-nowrap">
                  {money(summary.totalPaid)}
                </span>
              </div>
              <div className="h-5 sm:h-6 w-px bg-border" />
              <div>
                <span className="block text-[10px] sm:text-[11px] font-medium">Active Loans</span>
                <span className="font-bold text-foreground text-xs sm:text-sm whitespace-nowrap">{loans.length} debts</span>
              </div>
            </div>
          </div>

          {/* Payoff Visual Progress Container */}
          <div className="md:col-span-5 rounded-xl border border-border/60 bg-muted/30 p-3 sm:p-4 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-foreground">Debt Freedom Progress</span>
              <span className="text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                {money(summary.totalPaid)} Paid
              </span>
            </div>

            {/* Payoff Bar */}
            <div className="h-2.5 sm:h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${Math.min(summary.payoffPercentage, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground pt-0.5">
              <span className="whitespace-nowrap">Sanctioned: {money(summary.totalPrincipal)}</span>
              <span className="whitespace-nowrap">Remaining: {money(summary.totalOutstanding)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Loan Type Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {loanTypes.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={selectedType === t ? "default" : "outline"}
              className="h-8 rounded-full text-xs font-semibold px-3"
              onClick={() => setSelectedType(t)}
            >
              {t}
              {t !== "All" && (
                <span className="ml-1.5 rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
                  {loans.filter((l) => l.loanType === t).length}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            className="wt-field h-9 pl-9 text-xs"
            placeholder="Search loan or lender…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Loans Grid */}
      {filteredLoans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
          <Landmark className="mx-auto size-10 text-muted-foreground/60 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No loans or debts found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {search || selectedType !== "All"
              ? "No loans match your current search filters."
              : "Track your home loan, auto loan, or student loans and align auto-recurring EMIs."}
          </p>
          <Button onClick={onAddLoan} size="sm" className="mt-4 gap-1.5 text-xs font-semibold">
            <Plus size={15} /> Add First Loan
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
          {filteredLoans.map((loan) => {
            const principal = safeAmount(loan.principalAmount);
            const outstanding = safeAmount(loan.currentOutstanding);
            const paid = Math.max(0, principal - outstanding);
            const pctPaid = principal > 0 ? (paid / principal) * 100 : 0;
            const accountName = getAccountName(loan.repaymentAccountId);
            const paidCount = loan.paidEmisCount || 0;
            const tenure = loan.tenureMonths || 0;
            const remainingEmis = Math.max(0, tenure - paidCount);

            return (
              <div
                key={loan.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-border hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          {loan.loanType}
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground truncate">
                          {loan.lenderInstitution}
                        </span>
                      </div>
                      <h4 className="mt-1.5 font-bold text-sm text-foreground truncate" title={loan.name}>
                        {loan.name}
                      </h4>
                    </div>

                    <ActionMenu
                      items={[
                        {
                          label: "Record EMI Payment",
                          icon: <Wallet size={14} />,
                          onClick: () => onRecordEmiPayment(loan),
                        },
                        {
                          label: "Edit Loan Details",
                          icon: <Pencil size={14} />,
                          onClick: () => onEditLoan(loan),
                        },
                        {
                          label: "Delete Loan",
                          icon: <Trash2 size={14} />,
                          destructive: true,
                          onClick: () => onDeleteLoan(loan),
                        },
                      ]}
                    />
                  </div>

                  {loan.notes && (
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                      {loan.notes}
                    </p>
                  )}
                </div>

                {/* Progress Bar & EMIs Paid vs Left */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{paidCount} paid</span>
                      <span className="text-muted-foreground/60">/</span>
                      <span className="tabular-nums">{tenure} total</span>
                    </span>
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                      {remainingEmis} EMIs left
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.min(pctPaid, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="tabular-nums">{money(paid)} paid ({pctPaid.toFixed(1)}%)</span>
                    <span className="tabular-nums">{money(outstanding)} left</span>
                  </div>
                </div>

                {/* Financial Stats Matrix */}
                <div className="mt-3 pt-3 border-t border-border/60 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Outstanding
                      </span>
                      <span className="text-sm font-extrabold text-foreground">
                        <Metric id={`loan_outstanding:${loan.id}`} value={outstanding} />
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Monthly EMI
                      </span>
                      <span className="text-xs font-bold text-destructive">
                        {money(loan.emiAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Debit Linked Bank Badge */}
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <Wallet size={13} className="text-primary shrink-0" />
                      <span className="truncate text-[11px] font-semibold text-foreground">
                        {accountName}
                      </span>
                    </div>
                    {loan.autoRecurringEmi && (
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                        Auto-EMI Sync
                      </span>
                    )}
                  </div>

                  {/* Quick Action: Pay EMI */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-muted-foreground">
                      Rate: <strong className="text-foreground">{loan.interestRate}% p.a.</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onRecordEmiPayment(loan)}
                      className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                    >
                      <Wallet size={12} /> Pay EMI
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

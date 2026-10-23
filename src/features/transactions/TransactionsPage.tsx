import React from "react";
import {
  Download,
  FileUp,
  Landmark,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, matchesDateRange, type DateRangeValue } from "@/components/shared/DateRangeFilter";
import { PageHeading } from "@/components/shared/PageHeading";
import { SelectField } from "@/components/shared/FormFields";
import { TransactionTable } from "@/components/shared/TransactionTable";
import {
  getLoansSummary,
  type Transaction,
  type WealthState,
} from "@/lib/wealthtrack";

export function TransactionsPage({
  data,
  rows,
  search,
  setSearch,
  dateRange,
  setDateRange,
  txType,
  setTxType,
  txPriority,
  setTxPriority,
  txCategory,
  setTxCategory,
  txAccount,
  setTxAccount,
  txSort,
  setTxSort,
  money,
  onAdd,
  onEdit,
  onView,
  onExport,
  onImport,
  selectedIds,
  setSelectedIds,
  toggleSelected,
  toggleAll,
  onDelete,
  onBulkDelete,
  onBulkReassign,
  onBulkReassignPriority,
}: {
  data: WealthState;
  rows: Transaction[];
  search: string;
  setSearch: (value: string) => void;
  dateRange: DateRangeValue;
  setDateRange: (range: DateRangeValue) => void;
  txType: string;
  setTxType: (value: string) => void;
  txPriority: string;
  setTxPriority: (value: string) => void;
  txCategory: string;
  setTxCategory: (value: string) => void;
  txAccount: string;
  setTxAccount: (value: string) => void;
  txSort: string;
  setTxSort: (value: string) => void;
  money: (amount: number) => string;
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
  onView: (transaction: Transaction) => void;
  onExport: () => void;
  onImport: () => void;
  selectedIds?: string[];
  setSelectedIds?: (ids: string[]) => void;
  toggleSelected?: (id: string) => void;
  toggleAll?: () => void;
  onDelete: (transaction: Transaction) => void;
  onBulkDelete: (ids?: string[]) => void;
  onBulkReassign: (categoryId: string) => void;
  onBulkReassignPriority: (priority: "Need" | "Want") => void;
}) {
  const clearFilters = () => {
    setSearch("");
    setTxType("All types");
    setTxPriority("All priorities");
    setTxCategory("All categories");
    setTxAccount("All accounts");
    setDateRange({ preset: "1m" });
  };

  const hasFilter = Boolean(
    search ||
      txType !== "All types" ||
      txPriority !== "All priorities" ||
      txCategory !== "All categories" ||
      txAccount !== "All accounts" ||
      dateRange.preset !== "1m"
  );

  const activeLoans = React.useMemo(() => data.loans ?? [], [data.loans]);
  const loansSummary = React.useMemo(() => getLoansSummary(activeLoans), [activeLoans]);

  const periodTransactions = React.useMemo(() => {
    return data.transactions.filter((tx) => matchesDateRange(tx.date, dateRange));
  }, [data.transactions, dateRange]);

  const { periodEmi, periodEmiCount } = React.useMemo(() => {
    let emi = 0;
    let count = 0;
    for (const tx of periodTransactions) {
      if (tx.type === "EMI / Loan Payment") {
        emi += Math.abs(tx.amount);
        count++;
      }
    }
    return { periodEmi: emi, periodEmiCount: count };
  }, [periodTransactions]);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Transactions"
        description="Every financial movement, categorized and accounted for."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold"
              onClick={onImport}
            >
              <FileUp size={15} /> Bulk Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold"
              onClick={onExport}
            >
              <Download size={15} /> Export CSV
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
              onClick={onAdd}
            >
              <Plus size={15} /> Add Transaction
            </Button>
          </div>
        }
      />

      {/* Top Filter Bar: Compact Responsive Date Range Filter & Dropdown Filters */}
      <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-3.5 wt-shadow hover:border-border transition-colors space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
          <div className="flex-1 min-w-0">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 sm:h-8 gap-1 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground shrink-0"
              onClick={clearFilters}
            >
              <RotateCcw size={12} /> Reset
            </Button>
          )}
        </div>

        {/* 4 Compact Dropdown Selectors: 2 Columns on Mobile, 4 Columns on Desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
          <SelectField
            compact
            label="Type"
            value={txType}
            onChange={setTxType}
            options={[
              "All types",
              "Expense",
              "Income",
              "EMI / Loan Payment",
              "Borrow / Loan Taken",
              "Lend / Loan Given",
              "Debt Recovery",
              "Refund",
              "Transfer",
              "Investment",
              "Adjustment",
            ].map((value) => ({ value, label: value }))}
          />

          <SelectField
            compact
            label="Priority"
            value={txPriority}
            onChange={setTxPriority}
            options={[
              { value: "All priorities", label: "All Priorities" },
              { value: "Need", label: "Need" },
              { value: "Want", label: "Want" },
            ]}
          />

          <SelectField
            compact
            label="Category"
            value={txCategory}
            onChange={setTxCategory}
            options={[
              { value: "All categories", label: "All Categories" },
              ...data.categories
                .filter((item) => !item.archived)
                .map((item) => ({ value: item.id, label: `${item.icon} ${item.name}` })),
            ]}
          />

          <SelectField
            compact
            label="Account"
            value={txAccount}
            onChange={setTxAccount}
            options={[
              { value: "All accounts", label: "All Accounts" },
              ...data.accounts
                .filter((item) => !item.archived)
                .map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
        </div>
      </div>

      {/* Dedicated Section for EMIs & Loan Obligations */}
      {activeLoans.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 sm:px-4 sm:py-3 text-xs wt-shadow">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <span className="grid size-7.5 place-items-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
              <Landmark size={15} />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-foreground flex items-center gap-2 flex-wrap">
                <span>Active Loans & EMI Obligations</span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {activeLoans.length} {activeLoans.length === 1 ? "Loan" : "Loans"} Active
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Total Outstanding: <strong className="text-foreground tabular-nums">{money(loansSummary.totalOutstanding)}</strong> · Monthly EMI: <strong className="text-foreground tabular-nums">{money(loansSummary.totalMonthlyEmi)}/mo</strong> · Paid in selection: <strong className="text-amber-700 dark:text-amber-300 tabular-nums">{money(periodEmi)}</strong> ({periodEmiCount} {periodEmiCount === 1 ? "payment" : "payments"})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              variant={txType === "EMI / Loan Payment" ? "secondary" : "outline"}
              size="sm"
              className="h-7.5 text-xs font-semibold gap-1.5 border-amber-500/30 text-amber-800 dark:text-amber-200 hover:bg-amber-500/10"
              onClick={() => setTxType(txType === "EMI / Loan Payment" ? "All types" : "EMI / Loan Payment")}
            >
              <Landmark size={12} />
              {txType === "EMI / Loan Payment" ? "Show All Types" : "View EMI Transactions"}
            </Button>
          </div>
        </div>
      )}

      {/* Premium Reusable Transactions Table with Integrated Top Search Bar */}
      <TransactionTable
        transactions={rows}
        data={data}
        money={money}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        onBulkReassignPriority={onBulkReassignPriority}
        onBulkDelete={(ids) => onBulkDelete(ids)}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        searchPlaceholder="Search description, merchant, tags, notes…"
      />
    </div>
  );
}

import React from "react";
import { Download, FileUp, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, type DateRangeValue } from "@/components/shared/DateRangeFilter";
import { PageHeading } from "@/components/shared/PageHeading";
import { SelectField } from "@/components/shared/FormFields";
import { TransactionTable } from "@/components/shared/TransactionTable";
import {
  INVESTMENT_OUTFLOW_ACTIONS,
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
  selectedIds: string[];
  toggleSelected: (id: string) => void;
  toggleAll: () => void;
  onDelete: (transaction: Transaction) => void;
  onBulkDelete: () => void;
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

  // Live dynamic totals for filtered transactions
  const { filteredNet, filteredInflow, filteredOutflow } = React.useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let net = 0;
    for (const tx of rows) {
      const isInvestmentOutflow =
        tx.type === "Investment" &&
        (!tx.investmentAction ||
          INVESTMENT_OUTFLOW_ACTIONS.includes(tx.investmentAction));

      const isPositive =
        tx.type === "Income" ||
        tx.type === "Refund" ||
        tx.type === "Borrow / Loan Taken" ||
        tx.type === "Debt Recovery" ||
        (tx.type === "Adjustment" && tx.amount > 0) ||
        (tx.type === "Investment" &&
          !isInvestmentOutflow &&
          tx.investmentAction !== "Valuation");

      const isNegative =
        tx.type === "Expense" ||
        tx.type === "EMI / Loan Payment" ||
        tx.type === "Lend / Loan Given" ||
        isInvestmentOutflow ||
        (tx.type === "Adjustment" && tx.amount < 0);

      if (isPositive) {
        inflow += Math.abs(tx.amount);
        net += Math.abs(tx.amount);
      } else if (isNegative) {
        outflow += Math.abs(tx.amount);
        net -= Math.abs(tx.amount);
      }
    }
    return { filteredNet: net, filteredInflow: inflow, filteredOutflow: outflow };
  }, [rows]);

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
      <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 wt-shadow space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
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

      {/* Dynamic Filtered Transactions Financial Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 wt-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Filtered Net Total
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {rows.length} {rows.length === 1 ? "record" : "records"}
            </span>
          </div>
          <p
            className={`wt-display mt-1 text-2xl sm:text-3xl font-extrabold tabular-nums ${
              filteredNet > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : filteredNet < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground"
            }`}
          >
            {filteredNet > 0
              ? `+${money(filteredNet)}`
              : filteredNet < 0
              ? `−${money(Math.abs(filteredNet))}`
              : money(0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filteredNet >= 0
              ? "Net positive cash flow"
              : "Net cash outflow for active selection"}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 wt-shadow">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Total Inflows
          </span>
          <p className="wt-display mt-1 text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{money(filteredInflow)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Income, borrowings, debt recoveries & refunds
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 wt-shadow">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Total Outflows
          </span>
          <p className="wt-display mt-1 text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            −{money(filteredOutflow)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Expenses, EMIs, loans given & investments
          </p>
        </div>
      </div>

      {/* Premium Reusable Transactions Table with Integrated Top Search Bar */}
      <TransactionTable
        transactions={rows}
        data={data}
        money={money}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        onBulkReassignPriority={onBulkReassignPriority}
        onBulkDelete={() => onBulkDelete()}
        searchPlaceholder="Search description, merchant, tags, notes…"
      />
    </div>
  );
}

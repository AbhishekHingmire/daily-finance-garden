import React from "react";
import { Download, FileUp, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, type DateRangeValue } from "@/components/shared/DateRangeFilter";
import { PageHeading } from "@/components/shared/PageHeading";
import { SelectField } from "@/components/shared/FormFields";
import { TransactionTable } from "@/components/shared/TransactionTable";
import type { Transaction, WealthState } from "@/lib/wealthtrack";

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

      {/* Top Filter Bar: Date Range Filter & Dropdown Filters */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 wt-shadow space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
            >
              <RotateCcw size={13} /> Reset Filters
            </Button>
          )}
        </div>

        {/* 4 Clean Dropdown Selectors */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <SelectField
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
            label="Priority Classification"
            value={txPriority}
            onChange={setTxPriority}
            options={[
              { value: "All priorities", label: "All Priorities" },
              { value: "Need", label: "Need" },
              { value: "Want", label: "Want" },
            ]}
          />

          <SelectField
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

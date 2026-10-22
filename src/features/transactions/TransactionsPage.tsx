import React from "react";
import {
  Download,
  FileUp,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { DateRangeFilter, type DateRangeValue } from "@/components/shared/DateRangeFilter";
import { PageHeading } from "@/components/shared/PageHeading";
import { SelectField } from "@/components/shared/FormFields";
import {
  INVESTMENT_OUTFLOW_ACTIONS,
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

function accountLabel(data: WealthState, id: string) {
  return data.accounts.find((item) => item.id === id)?.name ?? "Unknown account";
}

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
    setDateRange({ preset: "1m", selectedMonth: "2026-10" });
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
    <>
      <PageHeading
        eyebrow="TRANSACTION HISTORY"
        title="Transactions"
        description="Every financial movement, categorized and accounted for."
        actions={
          <>
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
          </>
        }
      />

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 wt-shadow">
        {/* Unified Filter Toolbar with DateRangeFilter */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <label className="block min-w-0">
            <span className="wt-label">Search</span>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
              <input
                className="wt-field pl-9"
                aria-label="Search transactions"
                placeholder="Description, notes…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </label>

          <div>
            <span className="wt-label">Date Range</span>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>

          <SelectField
            label="Type"
            value={txType}
            onChange={setTxType}
            options={[
              "All types",
              "Expense",
              "Income",
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

        {/* Filter Status Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 font-semibold text-foreground">
              <Filter size={13} /> {rows.length} {rows.length === 1 ? "transaction" : "transactions"} found
            </span>
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                onClick={clearFilters}
              >
                Clear all filters
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <select
              className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
              value={txSort}
              onChange={(e) => setTxSort(e.target.value)}
              aria-label="Sort transactions"
            >
              {[
                "Newest first",
                "Oldest first",
                "Amount: high to low",
                "Amount: low to high",
                "Description",
              ].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedIds.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 rounded-xl bg-accent/70 p-3">
            <span className="mr-auto text-xs font-bold text-accent-foreground">
              {selectedIds.length} selected
            </span>
            <select
              aria-label="Reassign category"
              className="wt-field min-h-9 w-auto py-1 text-xs"
              value=""
              onChange={(event) => {
                if (event.target.value) onBulkReassign(event.target.value);
              }}
            >
              <option value="">Reassign category…</option>
              {data.categories
                .filter((item) => !item.archived)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
            </select>
            <select
              aria-label="Reassign priority"
              className="wt-field min-h-9 w-auto py-1 text-xs"
              value=""
              onChange={(event) => {
                if (event.target.value) onBulkReassignPriority(event.target.value as "Need" | "Want");
              }}
            >
              <option value="">Set Priority…</option>
              <option value="Need">Set as Need</option>
              <option value="Want">Set as Want</option>
            </select>
            <Button size="sm" variant="destructive" onClick={onBulkDelete} className="gap-1.5 text-xs">
              <Trash2 size={13} /> Delete
            </Button>
          </div>
        )}

        {/* Transactions Table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          {/* Desktop Table Header */}
          <div className="hidden grid-cols-[36px_minmax(0,1.8fr)_150px_130px_110px_120px_52px] items-center gap-3 bg-muted/75 px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
            <Checkbox
              aria-label="Select all transactions"
              checked={rows.length > 0 && rows.every((item) => selectedIds.includes(item.id))}
              onCheckedChange={toggleAll}
            />
            <span>Transaction</span>
            <span>Category</span>
            <span>Account</span>
            <span>Date</span>
            <span className="text-right pr-2">Amount</span>
            <span className="text-center font-bold text-foreground">Actions</span>
          </div>

          {rows.length ? (
            rows.map((transaction) => {
              const isInvestmentOutflow =
                transaction.type === "Investment" &&
                transaction.investmentAction &&
                INVESTMENT_OUTFLOW_ACTIONS.includes(transaction.investmentAction);

              const positive =
                transaction.type === "Income" ||
                transaction.type === "Refund" ||
                (transaction.type === "Adjustment" && transaction.amount > 0) ||
                (transaction.type === "Investment" && !isInvestmentOutflow && transaction.investmentAction !== "Valuation");

              const category = data.categories.find((item) => item.id === transaction.categoryId);

              return (
                <div key={transaction.id} className="border-t border-border first:border-t-0">
                  {/* Desktop Row */}
                  <div className="hidden md:grid grid-cols-[36px_minmax(0,1.8fr)_150px_130px_110px_120px_52px] items-center gap-3 px-3.5 py-2.5 hover:bg-muted/30 transition-colors">
                    <Checkbox
                      aria-label={`Select ${transaction.description}`}
                      checked={selectedIds.includes(transaction.id)}
                      onCheckedChange={() => toggleSelected(transaction.id)}
                    />
                    <button
                      className="min-w-0 text-left group cursor-pointer"
                      onClick={() => onView(transaction)}
                      title="Click to view details"
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold group-hover:text-primary transition-colors text-foreground">
                          {transaction.description}
                        </span>
                        {transaction.type === "Expense" && (
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              transaction.need === "Want"
                                ? "border border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {transaction.need === "Want" ? "Want" : "Need"}
                          </span>
                        )}
                      </div>
                      {transaction.merchant && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {transaction.merchant}
                        </span>
                      )}
                    </button>
                    <span className="truncate text-xs font-medium text-foreground">
                      {category ? `${category.icon} ${category.name}` : transaction.type === "Transfer" ? "Transfer" : "—"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {accountLabel(data, transaction.accountId)}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(transaction.date)}</span>
                    <div className="text-right pr-2">
                      <span
                        className={`whitespace-nowrap text-sm font-bold tabular-nums ${
                          positive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : transaction.type === "Expense" || isInvestmentOutflow
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-foreground"
                        }`}
                      >
                        {positive ? "+" : transaction.type === "Expense" || isInvestmentOutflow ? "−" : ""}
                        {money(transaction.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-center">
                      <ActionMenu
                        items={[
                          {
                            label: "Edit transaction",
                            icon: <Pencil size={13} />,
                            onClick: () => onEdit(transaction),
                          },
                          {
                            label: "Delete transaction",
                            icon: <Trash2 size={13} />,
                            destructive: true,
                            onClick: () => onDelete(transaction),
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="flex items-center justify-between gap-3 px-3 py-3 md:hidden hover:bg-muted/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Checkbox
                        aria-label={`Select ${transaction.description}`}
                        checked={selectedIds.includes(transaction.id)}
                        onCheckedChange={() => toggleSelected(transaction.id)}
                      />
                      <button
                        className="flex items-center gap-2.5 min-w-0 text-left"
                        onClick={() => onView(transaction)}
                        type="button"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-base">
                          {category ? category.icon : transaction.type === "Transfer" ? "↔" : "💳"}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {transaction.description}
                            </span>
                            {transaction.type === "Expense" && (
                              <span
                                className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider ${
                                  transaction.need === "Want"
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                {transaction.need === "Want" ? "Want" : "Need"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                            <span>{accountLabel(data, transaction.accountId)}</span>
                            <span>·</span>
                            <span>{formatDate(transaction.date)}</span>
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`whitespace-nowrap text-sm font-bold tabular-nums ${
                          positive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : transaction.type === "Expense" || isInvestmentOutflow
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-foreground"
                        }`}
                      >
                        {positive ? "+" : transaction.type === "Expense" || isInvestmentOutflow ? "−" : ""}
                        {money(transaction.amount)}
                      </span>
                      <ActionMenu
                        items={[
                          {
                            label: "Edit transaction",
                            icon: <Pencil size={13} />,
                            onClick: () => onEdit(transaction),
                          },
                          {
                            label: "Delete transaction",
                            icon: <Trash2 size={13} />,
                            destructive: true,
                            onClick: () => onDelete(transaction),
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-14 text-center">
              <p className="font-bold text-sm text-foreground">No transactions found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try clearing filters or add your first transaction.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                {hasFilter && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
                <Button size="sm" onClick={onAdd}>
                  <Plus size={14} className="mr-1" /> Add transaction
                </Button>
              </div>
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {rows.length} of {data.transactions.length} total transactions
            </span>
            <span>All records stored locally</span>
          </div>
        )}
      </div>
    </>
  );
}

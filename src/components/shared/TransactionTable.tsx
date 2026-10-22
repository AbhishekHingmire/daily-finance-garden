import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Copy,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InstitutionLogo } from "@/components/shared/InstitutionLogo";
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

export function TransactionTable({
  transactions,
  data,
  money,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onBulkReassignPriority,
  onBulkDelete,
  showAccountColumn = true,
  searchPlaceholder = "Search description, merchant, notes…",
  headerActions,
}: {
  transactions: Transaction[];
  data: WealthState;
  money: (amount: number) => string;
  onView: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onDuplicate?: (transaction: Transaction) => void;
  onBulkReassignPriority?: (priority: "Need" | "Want") => void;
  onBulkDelete?: (ids: string[]) => void;
  showAccountColumn?: boolean;
  searchPlaceholder?: string;
  headerActions?: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Search filtering
  const searchedTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((t) => {
      const cat = data.categories.find((c) => c.id === t.categoryId);
      const acc = data.accounts.find((a) => a.id === t.accountId);
      return (
        t.description.toLowerCase().includes(q) ||
        (t.merchant && t.merchant.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (cat && cat.name.toLowerCase().includes(q)) ||
        (acc && acc.name.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    });
  }, [transactions, search, data.categories, data.accounts]);

  // Sorting
  const sortedTransactions = useMemo(() => {
    return [...searchedTransactions].sort((a, b) => {
      if (sortOrder === "newest") return b.date.localeCompare(a.date);
      if (sortOrder === "oldest") return a.date.localeCompare(b.date);
      if (sortOrder === "highest") return b.amount - a.amount;
      if (sortOrder === "lowest") return a.amount - b.amount;
      return 0;
    });
  }, [searchedTransactions, sortOrder]);

  // Dynamic Net, Inflow, and Outflow Totals for the currently displayed transactions
  const { totalNet, totalInflow, totalOutflow } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let net = 0;
    for (const tx of sortedTransactions) {
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
    return { totalNet: net, totalInflow: inflow, totalOutflow: outflow };
  }, [sortedTransactions]);

  // Pagination State (Default 15 records per page as requested)
  const [pageSize, setPageSize] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Auto-reset page when search, total records, sort order, or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortedTransactions.length, sortOrder, pageSize]);

  const totalRecords = sortedTransactions.length;
  const totalPages =
    pageSize === -1
      ? 1
      : Math.max(1, Math.ceil(totalRecords / (pageSize || 15)));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = pageSize === -1 ? 0 : (safePage - 1) * pageSize;
  const endIndex =
    pageSize === -1 ? totalRecords : Math.min(totalRecords, startIndex + pageSize);

  const paginatedTransactions = useMemo(() => {
    if (pageSize === -1) return sortedTransactions;
    return sortedTransactions.slice(startIndex, endIndex);
  }, [sortedTransactions, startIndex, endIndex, pageSize]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedTransactions.map((t) => t.id));
    }
  };

  const isAllSelected =
    paginatedTransactions.length > 0 &&
    selectedIds.length === paginatedTransactions.length;

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden wt-shadow">
      {/* Integrated Top Search & Controls Bar Inside the Table */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          {/* Integrated Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              className="wt-field h-9 pl-9 pr-8 text-xs font-medium bg-background"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              {sortedTransactions.length} transaction{sortedTransactions.length !== 1 ? "s" : ""}
            </span>
            <span className="text-muted-foreground/40 hidden sm:inline">·</span>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums border ${
                totalNet > 0
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                  : totalNet < 0
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Total:</span>
              <span>
                {totalNet > 0
                  ? `+${money(totalNet)}`
                  : totalNet < 0
                  ? `−${money(Math.abs(totalNet))}`
                  : money(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls: Sort & Custom Header Actions */}
        <div className="flex items-center gap-1.5">
          {headerActions}
          <select
            className="wt-field h-8 py-0 px-2.5 text-xs font-semibold bg-background rounded-xl border border-border/80 w-36 sm:w-40 cursor-pointer"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            aria-label="Sort transactions"
          >
            <option value="newest">Sort: Newest first</option>
            <option value="oldest">Sort: Oldest first</option>
            <option value="highest">Sort: Highest amount</option>
            <option value="lowest">Sort: Lowest amount</option>
          </select>
        </div>
      </div>

      {/* Floating Bulk Action Bar when items selected */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-primary/10 border-b border-primary/20 px-4 py-2.5 text-xs animate-in fade-in-50 duration-150">
          <span className="font-bold text-primary">
            {selectedIds.length} transaction{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            {onBulkReassignPriority && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-semibold bg-card"
                  onClick={() => {
                    onBulkReassignPriority("Need");
                    setSelectedIds([]);
                  }}
                >
                  Mark Need
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-semibold bg-card"
                  onClick={() => {
                    onBulkReassignPriority("Want");
                    setSelectedIds([]);
                  }}
                >
                  Mark Want
                </Button>
              </div>
            )}
            {onBulkDelete && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs font-semibold gap-1"
                onClick={() => {
                  onBulkDelete(selectedIds);
                  setSelectedIds([]);
                }}
              >
                <Trash2 size={12} /> Delete
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Balanced Compact Table Grid Header */}
      <div
        className={`hidden md:grid items-center gap-3 bg-muted/30 px-4 py-1.5 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 border-b border-border/70 select-none ${
          showAccountColumn
            ? "grid-cols-[36px_minmax(0,1.2fr)_150px_130px_105px_120px_48px]"
            : "grid-cols-[36px_minmax(0,1.4fr)_160px_110px_120px_48px]"
        }`}
      >
        <div className="flex items-center justify-center">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={toggleSelectAll}
            aria-label="Select all transactions"
          />
        </div>
        <span>Transaction</span>
        <span>Category</span>
        {showAccountColumn && <span>Account</span>}
        <span>Date</span>
        <span className="text-right pr-2">Amount</span>
        <span className="text-center font-semibold text-muted-foreground/80">Actions</span>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-border/60">
        {paginatedTransactions.length ? (
          paginatedTransactions.map((tx) => {
            const isSelected = selectedIds.includes(tx.id);
            const isInvestmentOutflow =
              tx.type === "Investment" &&
              tx.investmentAction &&
              INVESTMENT_OUTFLOW_ACTIONS.includes(tx.investmentAction);

            const isPositive =
              tx.type === "Income" ||
              tx.type === "Refund" ||
              tx.type === "Borrow / Loan Taken" ||
              tx.type === "Debt Recovery" ||
              (tx.type === "Adjustment" && tx.amount > 0) ||
              (tx.type === "Investment" &&
                !isInvestmentOutflow &&
                tx.investmentAction !== "Valuation");

            const isOutflow =
              tx.type === "Expense" ||
              tx.type === "EMI / Loan Payment" ||
              tx.type === "Lend / Loan Given" ||
              isInvestmentOutflow ||
              (tx.type === "Adjustment" && tx.amount < 0);

            const category = data.categories.find((c) => c.id === tx.categoryId);
            const account = data.accounts.find((a) => a.id === tx.accountId);

            return (
              <div
                key={tx.id}
                className={`transition-colors hover:bg-muted/30 ${
                  isSelected ? "bg-primary/[0.04]" : ""
                }`}
              >
                {/* Desktop Grid Row */}
                <div
                  className={`hidden md:grid items-center gap-3 px-4 py-2.5 text-xs ${
                    showAccountColumn
                      ? "grid-cols-[36px_minmax(0,1.2fr)_150px_130px_105px_120px_48px]"
                      : "grid-cols-[36px_minmax(0,1.4fr)_160px_110px_120px_48px]"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(tx.id)}
                      aria-label={`Select ${tx.description}`}
                    />
                  </div>

                  {/* Transaction Description & Payee */}
                  <button
                    className="min-w-0 text-left group cursor-pointer"
                    onClick={() => onView(tx)}
                    title="Click to view details"
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold group-hover:text-primary transition-colors text-foreground">
                        {tx.description}
                      </span>

                      {/* Status Badges */}
                      {tx.type === "Expense" ? (
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            tx.need === "Want"
                              ? "border border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {tx.need === "Want" ? "Want" : "Need"}
                        </span>
                      ) : tx.type === "EMI / Loan Payment" ? (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-rose-500/25 bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                          EMI
                        </span>
                      ) : tx.type === "Borrow / Loan Taken" ? (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-amber-500/25 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          Borrowed
                        </span>
                      ) : tx.type === "Lend / Loan Given" ? (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-violet-500/25 bg-violet-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                          Lent
                        </span>
                      ) : tx.type === "Debt Recovery" ? (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Recovery
                        </span>
                      ) : null}

                      {tx.recurring && (
                        <span className="inline-flex shrink-0 items-center rounded-md bg-primary/10 px-1.5 py-0.2 text-[8px] font-bold text-primary">
                          Auto
                        </span>
                      )}
                    </div>
                    {tx.merchant && tx.merchant !== tx.description && (
                      <span className="block truncate text-[11px] text-muted-foreground mt-0.5">
                        {tx.merchant}
                      </span>
                    )}
                  </button>

                  {/* Category */}
                  <span className="truncate text-xs font-medium text-foreground">
                    {category ? `${category.icon} ${category.name}` : tx.type === "Transfer" ? "Transfer" : "—"}
                  </span>

                  {/* Account */}
                  {showAccountColumn && (
                    <span className="truncate text-xs text-muted-foreground flex items-center gap-1.5">
                      {account && (
                        <InstitutionLogo
                          name={account.institution || account.name}
                          size="xs"
                        />
                      )}
                      <span className="truncate">{account?.name || "—"}</span>
                    </span>
                  )}

                  {/* Date */}
                  <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>

                  {/* Amount */}
                  <div className="text-right pr-2">
                    <span
                      className={`whitespace-nowrap text-sm font-bold tabular-nums ${
                        isPositive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isOutflow
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground"
                      }`}
                    >
                      {isPositive ? "+" : isOutflow ? "−" : ""}
                      {money(tx.amount)}
                    </span>
                  </div>

                  {/* Actions Menu */}
                  <div className="flex items-center justify-center">
                    <ActionMenu
                      items={[
                        {
                          label: "Edit transaction",
                          icon: <Pencil size={13} />,
                          onClick: () => onEdit(tx),
                        },
                        ...(onDuplicate
                          ? [
                              {
                                label: "Duplicate",
                                icon: <Copy size={13} />,
                                onClick: () => onDuplicate(tx),
                              },
                            ]
                          : []),
                        {
                          label: "Delete",
                          icon: <Trash2 size={13} />,
                          destructive: true,
                          onClick: () => onDelete(tx),
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* Mobile View */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 md:hidden">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(tx.id)}
                      aria-label={`Select ${tx.description}`}
                    />
                    <button
                      className="flex items-center gap-2.5 min-w-0 text-left"
                      onClick={() => onView(tx)}
                      type="button"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-base">
                        {category ? category.icon : tx.type === "Transfer" ? "↔" : "💳"}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {tx.description}
                          </span>
                          {tx.type === "Expense" ? (
                            <span
                              className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider ${
                                tx.need === "Want"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              {tx.need === "Want" ? "Want" : "Need"}
                            </span>
                          ) : tx.type === "EMI / Loan Payment" ? (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-rose-500/15 px-1.5 py-0.2 text-[8px] font-bold uppercase text-rose-700 dark:text-rose-300">
                              EMI
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                          {showAccountColumn && <span>{account?.name} · </span>}
                          <span>{formatDate(tx.date)}</span>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`whitespace-nowrap text-sm font-bold tabular-nums ${
                        isPositive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isOutflow
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground"
                      }`}
                    >
                      {isPositive ? "+" : isOutflow ? "−" : ""}
                      {money(tx.amount)}
                    </span>
                    <ActionMenu
                      items={[
                        {
                          label: "Edit",
                          icon: <Pencil size={13} />,
                          onClick: () => onEdit(tx),
                        },
                        {
                          label: "Delete",
                          icon: <Trash2 size={13} />,
                          destructive: true,
                          onClick: () => onDelete(tx),
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground text-sm">No transactions found</p>
            <p>
              {search
                ? `No results matching "${search}". Try clearing your search.`
                : "No transactions recorded for the selected filter criteria."}
            </p>
            {search && (
              <Button size="sm" variant="outline" className="h-7 text-xs font-semibold mt-1" onClick={() => setSearch("")}>
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Pagination & Rows-Per-Page Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-4 py-3 text-xs">
        {/* Left: Showing range */}
        <div className="flex items-center gap-2 text-muted-foreground font-medium">
          <span>
            {totalRecords > 0 ? (
              <>
                Showing <strong className="text-foreground font-bold">{startIndex + 1}–{endIndex}</strong> of{" "}
                <strong className="text-foreground font-bold">{totalRecords}</strong> transaction{totalRecords !== 1 ? "s" : ""}
              </>
            ) : (
              "0 transactions"
            )}
          </span>
        </div>

        {/* Center: Rows per page selector */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium whitespace-nowrap">Rows per page:</span>
          <select
            className="wt-field h-8 py-0 px-2 text-xs font-semibold bg-background w-20 cursor-pointer"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={-1}>All</option>
          </select>
        </div>

        {/* Right: Page navigation buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage(1)}
            title="First page"
          >
            « First
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            title="Previous page"
          >
            ‹ Prev
          </Button>

          <span className="px-2 font-bold text-foreground tabular-nums whitespace-nowrap">
            Page {safePage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            title="Next page"
          >
            Next ›
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            title="Last page"
          >
            Last »
          </Button>
        </div>
      </div>
    </div>
  );
}

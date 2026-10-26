import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Copy,
  Pencil,
  RotateCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InstitutionLogo } from "@/components/shared/InstitutionLogo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  INVESTMENT_OUTFLOW_ACTIONS,
  type Transaction,
  type WealthState,
} from "@/lib/wealthtrack";
import { formatDate } from "@/lib/formatters";

function formatDateGroupHeader(dateStr: string): string {
  const txDate = dateStr.slice(0, 10);
  const todayStr = "2026-10-26";
  const yesterdayStr = "2026-10-25";

  if (txDate === todayStr) return "Today";
  if (txDate === yesterdayStr) return "Yesterday";

  const parts = txDate.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[monthIdx] || ""}`;
  }
  return dateStr;
}

function renderTransactionChips(tx: Transaction) {
  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      {tx.type === "Expense" ? (
        <span
          className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider ${
            tx.need === "Want"
              ? "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {tx.need === "Want" ? "Want" : "Need"}
        </span>
      ) : tx.type === "EMI / Loan Payment" ? (
        <span className="inline-flex shrink-0 items-center rounded-md border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
          EMI
        </span>
      ) : tx.type === "Borrow / Loan Taken" ? (
        <span className="inline-flex shrink-0 items-center rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          Borrowed
        </span>
      ) : tx.type === "Lend / Loan Given" ? (
        <span className="inline-flex shrink-0 items-center rounded-md border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
          Lent
        </span>
      ) : tx.type === "Debt Recovery" ? (
        <span className="inline-flex shrink-0 items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          Recovery
        </span>
      ) : null}

      {tx.recurring && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex shrink-0 items-center justify-center size-4 rounded-full bg-primary/10 text-primary cursor-help"
                aria-label="Posted automatically"
              >
                <RotateCw size={10} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px] py-1 px-2 z-tooltip">
              Posted automatically
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  );
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
  selectedIds: propSelectedIds,
  onSelectedIdsChange,
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
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  showAccountColumn?: boolean;
  searchPlaceholder?: string;
  headerActions?: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const selectedIds = propSelectedIds !== undefined ? propSelectedIds : internalSelectedIds;

  const updateSelectedIds = (next: string[] | ((prev: string[]) => string[])) => {
    const nextVal = typeof next === "function" ? next(selectedIds) : next;
    if (onSelectedIdsChange) {
      onSelectedIdsChange(nextVal);
    }
    setInternalSelectedIds(nextVal);
  };

  // Pre-indexed category & account maps for O(1) high-speed search lookups
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data.categories) {
      map.set(c.id, c.name.toLowerCase());
    }
    return map;
  }, [data.categories]);

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of data.accounts) {
      map.set(a.id, a.name.toLowerCase());
    }
    return map;
  }, [data.accounts]);

  // Search filtering
  const searchedTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((t) => {
      const catName = categoryMap.get(t.categoryId);
      const accName = accountMap.get(t.accountId);
      return (
        t.description.toLowerCase().includes(q) ||
        (t.merchant && t.merchant.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (catName && catName.includes(q)) ||
        (accName && accName.includes(q)) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    });
  }, [transactions, search, categoryMap, accountMap]);

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

  // Dynamic Net, Inflow, Outflow, and Transfer Totals for the currently displayed transactions
  const { totalNet, totalInflow, totalOutflow, totalTransfers } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let transfers = 0;

    for (const tx of sortedTransactions) {
      const cat = data?.categories?.find((c) => c.id === tx.categoryId);
      const isTransferCategory =
        cat?.kind === "Transfer" ||
        tx.categoryId === "cat-lend" ||
        tx.categoryId === "cat-borrow" ||
        tx.categoryId === "cat-debt-recovery";

      const isTransfer =
        isTransferCategory ||
        tx.type === "Transfer" ||
        tx.type === "Lend / Loan Given" ||
        tx.type === "Debt Recovery" ||
        tx.type === "Borrow / Loan Taken" ||
        tx.type === "Investment";

      if (isTransfer) {
        transfers += Math.abs(tx.amount);
        continue;
      }

      const isIncome =
        tx.type === "Income" ||
        tx.type === "Refund" ||
        cat?.kind === "Income" ||
        (tx.type === "Adjustment" && tx.amount > 0);

      const isExpense =
        tx.type === "Expense" ||
        tx.type === "EMI / Loan Payment" ||
        cat?.kind === "Expense" ||
        (tx.type === "Adjustment" && tx.amount < 0);

      if (isIncome) {
        inflow += Math.abs(tx.amount);
      } else if (isExpense) {
        outflow += Math.abs(tx.amount);
      }
    }

    const net = inflow - outflow;
    return { totalNet: net, totalInflow: inflow, totalOutflow: outflow, totalTransfers: transfers };
  }, [sortedTransactions, data?.categories]);

  // Pagination State (Default 15 records per page as requested)
  const [pageSize, setPageSize] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [mobileLimit, setMobileLimit] = useState<number>(20);

  // Auto-reset page when search, total records, sort order, or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
    setMobileLimit(20);
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

  const mobileTransactions = useMemo(() => {
    return sortedTransactions.slice(0, mobileLimit);
  }, [sortedTransactions, mobileLimit]);

  const toggleSelect = (id: string) => {
    updateSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedTransactions.map((t) => t.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allPageSelected) {
      updateSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      updateSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const clearSelection = () => {
    updateSelectedIds([]);
  };

  const isAllSelected =
    paginatedTransactions.length > 0 &&
    paginatedTransactions.every((t) => selectedIds.includes(t.id));

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden wt-shadow hover:border-border transition-colors">
      {/* Integrated Top Search & Controls Bar Inside the Table */}
      <div className="border-b border-border/50 bg-muted/15 px-3 sm:px-4 py-2.5">
        {/* Mobile Expanded Search Bar */}
        {isMobileSearchOpen ? (
          <div className="flex items-center gap-2 sm:hidden animate-in fade-in-50 duration-150">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                className="wt-field h-8.5 pl-9 pr-8 text-xs font-medium bg-background w-full"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8.5 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => {
                setIsMobileSearchOpen(false);
                setSearch("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-2.5">
            {/* Left: Mobile Search Button or Desktop Input + Record Count */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink min-w-0">
              {/* Mobile Search Toggle Icon */}
              <Button
                variant="outline"
                size="sm"
                className="sm:hidden size-8 p-0 shrink-0 border-border/70 bg-background"
                onClick={() => setIsMobileSearchOpen(true)}
                title="Search transactions"
                aria-label="Open search input"
              >
                <Search size={14} className="text-muted-foreground" />
              </Button>

              {/* Desktop Search Input (Always visible on sm and up) */}
              <div className="relative hidden sm:block w-60 sm:w-72 md:w-80 shrink min-w-[180px]">
                <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  className="wt-field h-8.5 pl-8 pr-7 text-xs font-medium bg-background"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Transaction count & Summary line */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {sortedTransactions.length} tx{sortedTransactions.length !== 1 ? "s" : ""}
                </span>
                <span className="text-muted-foreground/40 hidden md:inline">·</span>
                <div
                  className="hidden md:inline-flex items-center flex-wrap gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums border border-border/80 bg-muted/30 text-foreground shrink-0"
                >
                  <span>In {money(totalInflow)}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>Out {money(totalOutflow)}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span
                    className={
                      totalNet > 0
                        ? "text-emerald-700 dark:text-emerald-400 font-bold"
                        : totalNet < 0
                        ? "text-rose-700 dark:text-rose-400 font-bold"
                        : "text-muted-foreground font-bold"
                    }
                  >
                    Net {totalNet > 0 ? `+${money(totalNet)}` : totalNet < 0 ? `−${money(Math.abs(totalNet))}` : money(0)}
                  </span>
                  {totalTransfers > 0 && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-muted-foreground font-medium">
                        Transfers {money(totalTransfers)} (not counted)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Controls: Sort & Custom Header Actions */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              {headerActions}
              <select
                className="wt-field h-8 py-0 pl-2 pr-7 text-xs font-semibold bg-background rounded-lg border border-border/70 w-auto min-w-[125px] sm:min-w-[145px] cursor-pointer"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                aria-label="Sort transactions"
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="highest">Sort: Highest</option>
                <option value="lowest">Sort: Lowest</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar when items selected */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-primary/10 border-b border-primary/20 px-4 py-2 text-xs animate-in fade-in-50 duration-150">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary">
              {selectedIds.length} transaction{selectedIds.length > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {onBulkReassignPriority && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-semibold bg-card"
                  onClick={() => {
                    onBulkReassignPriority("Need");
                    clearSelection();
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
                    clearSelection();
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
                className="h-7 text-xs font-semibold gap-1.5 shadow-2xs"
                onClick={() => {
                  onBulkDelete(selectedIds);
                  clearSelection();
                }}
              >
                <Trash2 size={13} />
                Delete {selectedIds.length > 1 ? `(${selectedIds.length})` : "selected"}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearSelection}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Balanced Compact Table Grid Header */}
      <div
        className={`hidden md:grid items-center gap-3 bg-muted/30 px-4 py-1.5 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 border-b border-border/70 select-none ${
          showAccountColumn
            ? "grid-cols-[36px_minmax(0,1.2fr)_150px_130px_105px_120px_60px]"
            : "grid-cols-[36px_minmax(0,1.4fr)_160px_110px_120px_60px]"
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

      {/* Table Rows (Desktop) */}
      <div className="hidden md:block divide-y divide-border/60">
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
                key={`desktop-${tx.id}`}
                className={`group/row transition-colors hover:bg-muted/30 ${
                  isSelected ? "bg-primary/[0.04]" : ""
                }`}
              >
                <div
                  className={`grid items-center gap-3 px-4 py-2.5 text-xs ${
                    showAccountColumn
                      ? "grid-cols-[36px_minmax(0,1.2fr)_150px_130px_105px_120px_60px]"
                      : "grid-cols-[36px_minmax(0,1.4fr)_160px_110px_120px_60px]"
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
                      {renderTransactionChips(tx)}
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

      {/* Table Rows (Mobile with Date Grouping Headers) */}
      <div className="md:hidden divide-y divide-border/60">
        {mobileTransactions.length ? (
          mobileTransactions.map((tx, idx) => {
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

            const currentHeader = formatDateGroupHeader(tx.date);
            const prevHeader = idx > 0 ? formatDateGroupHeader(mobileTransactions[idx - 1].date) : null;
            const showDateHeader = idx === 0 || currentHeader !== prevHeader;

            return (
              <React.Fragment key={`mobile-${tx.id}`}>
                {showDateHeader && (
                  <div className="px-4 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/40 border-y border-border/40 select-none">
                    {currentHeader}
                  </div>
                )}
                <div
                  className={`flex items-center justify-between gap-2.5 sm:gap-3 px-3 sm:px-4 py-2 min-h-[54px] transition-colors hover:bg-muted/30 ${
                    isSelected ? "bg-primary/[0.04]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex items-center shrink-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(tx.id)}
                        aria-label={`Select ${tx.description}`}
                      />
                    </div>
                    <button
                      className="flex items-center gap-2.5 min-w-0 text-left flex-1 cursor-pointer"
                      onClick={() => onView(tx)}
                      type="button"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted/60 text-sm">
                        {category ? category.icon : tx.type === "Transfer" ? "↔" : "💳"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate text-xs sm:text-sm font-semibold text-foreground">
                            {tx.description}
                          </span>
                          {renderTransactionChips(tx)}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate mt-0.5">
                          {category && <span className="truncate">{category.name}</span>}
                          {account && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="truncate">{account.name}</span>
                            </>
                          )}
                          {tx.merchant && tx.merchant !== tx.description && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="truncate">{tx.merchant}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`whitespace-nowrap text-xs sm:text-sm font-bold tabular-nums ${
                        isPositive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      {isPositive ? "+" : "−"}
                      {money(tx.amount)}
                    </span>
                    <ActionMenu
                      triggerClassName="size-7 rounded-md"
                      items={[
                        {
                          label: "Edit",
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
              </React.Fragment>
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

      {/* Desktop Pagination & Rows-Per-Page Controls Bar (Hidden on Mobile) */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-4 py-3 text-xs overflow-x-auto [scrollbar-width:none]">
        {/* Left: Showing range */}
        <div className="flex items-center gap-2 text-muted-foreground font-medium shrink-0">
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
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-muted-foreground font-medium whitespace-nowrap">Rows per page:</span>
          <select
            className="wt-field h-8 py-0 pl-2.5 pr-7 text-xs font-semibold bg-background min-w-[72px] sm:min-w-[80px] w-auto cursor-pointer"
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
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold shrink-0"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage(1)}
            title="First page"
          >
            « First
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold shrink-0"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            title="Previous page"
          >
            ‹ Prev
          </Button>

          <span className="px-2 font-bold text-foreground tabular-nums whitespace-nowrap shrink-0">
            Page {safePage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold shrink-0"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            title="Next page"
          >
            Next ›
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold shrink-0"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            title="Last page"
          >
            Last »
          </Button>
        </div>
      </div>

      {/* Mobile Infinite Scroll Footer */}
      <div className="md:hidden border-t border-border/70 bg-muted/20 px-4 py-3 text-xs">
        {totalRecords > 0 && (
          mobileLimit < totalRecords ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold h-8.5 cursor-pointer"
              onClick={() => setMobileLimit((prev) => Math.min(totalRecords, prev + 20))}
            >
              Load more ({totalRecords - mobileLimit} remaining)
            </Button>
          ) : (
            <p className="text-center text-[11px] text-muted-foreground font-medium">
              All {totalRecords} transactions loaded
            </p>
          )
        )}
      </div>
    </div>
  );
}

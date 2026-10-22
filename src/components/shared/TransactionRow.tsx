import React from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import {
  INVESTMENT_OUTFLOW_ACTIONS,
  type Account,
  type Category,
  type Transaction,
} from "@/lib/wealthtrack";

export function TransactionRow({
  transaction,
  category,
  account,
  money,
  onClick,
}: {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  money: (amount: number) => string;
  onClick: () => void;
}) {
  const isInvestmentOutflow =
    transaction.type === "Investment" &&
    transaction.investmentAction &&
    INVESTMENT_OUTFLOW_ACTIONS.includes(transaction.investmentAction);

  const isPositive =
    transaction.type === "Income" ||
    transaction.type === "Refund" ||
    (transaction.type === "Adjustment" && transaction.amount > 0) ||
    (transaction.type === "Investment" && !isInvestmentOutflow && transaction.investmentAction !== "Valuation");

  return (
    <button
      onClick={onClick}
      type="button"
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-muted/50 transition-colors sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.8fr)_auto]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-lg ${
            isPositive
              ? "wt-success-bg text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-foreground"
          }`}
        >
          {transaction.type === "Income" ? (
            <ArrowDownLeft size={16} />
          ) : transaction.type === "Transfer" ? (
            <ArrowLeftRight size={15} />
          ) : (
            <ArrowUpRight size={16} />
          )}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">
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
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {transaction.merchant || category?.name || transaction.type}
          </span>
        </span>
      </span>
      <span className="hidden truncate text-xs text-muted-foreground sm:block font-medium">
        {category ? `${category.icon} ${category.name}` : transaction.type}
      </span>
      <span className="hidden truncate text-xs text-muted-foreground sm:block">
        {account?.name || "—"}
      </span>
      <span
        className={`text-right text-sm font-bold tabular-nums ${
          isPositive
            ? "text-emerald-600 dark:text-emerald-400"
            : transaction.type === "Expense" || isInvestmentOutflow
            ? "text-rose-600 dark:text-rose-400"
            : "text-foreground"
        }`}
      >
        {transaction.type === "Expense" || isInvestmentOutflow ? "−" : isPositive ? "+" : ""}
        {money(transaction.amount)}
      </span>
    </button>
  );
}

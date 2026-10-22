import { Copy, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
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

export function TransactionDetail({
  transaction,
  data,
  money,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  transaction: Transaction;
  data: WealthState;
  money: (amount: number) => string;
  onClose: () => void;
  onEdit: (t: Transaction) => void;
  onDuplicate: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}) {
  const cat = data.categories.find((c) => c.id === transaction.categoryId);
  const acc = data.accounts.find((a) => a.id === transaction.accountId);
  const destAcc = data.accounts.find((a) => a.id === transaction.destinationAccountId);
  const linkedLoan = data.loans?.find((l) => l.id === transaction.loanId);
  const isInvestmentOutflow =
    transaction.type === "Investment" &&
    transaction.investmentAction &&
    INVESTMENT_OUTFLOW_ACTIONS.includes(transaction.investmentAction);

  const isInflow =
    transaction.type === "Income" ||
    transaction.type === "Refund" ||
    transaction.type === "Borrow / Loan Taken" ||
    transaction.type === "Debt Recovery" ||
    (transaction.type === "Adjustment" && transaction.amount > 0) ||
    (transaction.type === "Investment" &&
      !isInvestmentOutflow &&
      transaction.investmentAction !== "Valuation");

  return (
    <Modal title="Transaction Details" description={`ID: ${transaction.id}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Header Receipt Card */}
        <div className="rounded-2xl border border-border bg-muted/30 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <span className="grid size-12 place-items-center rounded-xl bg-card border border-border text-2xl shadow-2xs">
              {cat?.icon || "💸"}
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {transaction.type}
                  {transaction.type === "Investment" && transaction.investmentAction
                    ? ` · ${transaction.investmentAction}`
                    : ""}
                </span>
                {transaction.recurring && (
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                    Auto-Recurring
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-foreground mt-0.5">
                {transaction.description}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`wt-display text-2xl font-black tabular-nums block ${
                isInflow
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isInflow ? "+" : "−"}
              {money(transaction.amount)}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {transaction.paymentMethod || "Direct"}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground font-medium block">Date & Time</span>
            <p className="font-bold text-foreground mt-0.5">{formatDate(transaction.date)}</p>
          </div>

          <div>
            <span className="text-muted-foreground font-medium block">Account</span>
            <p className="font-bold text-foreground mt-0.5">{acc?.name ?? "—"}</p>
          </div>

          {transaction.type === "Transfer" && (
            <div>
              <span className="text-muted-foreground font-medium block">Destination Account</span>
              <p className="font-bold text-foreground mt-0.5">{destAcc?.name ?? "—"}</p>
            </div>
          )}

          <div>
            <span className="text-muted-foreground font-medium block">Category</span>
            <p className="font-bold text-foreground mt-0.5">
              {cat ? `${cat.icon} ${cat.name}` : "—"}
            </p>
          </div>

          {transaction.type === "Expense" && (
            <div>
              <span className="text-muted-foreground font-medium block">Priority Classification</span>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    transaction.need === "Want"
                      ? "border border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {transaction.need === "Want" ? "Want" : "Need"}
                </span>
              </div>
            </div>
          )}

          {transaction.merchant && (
            <div>
              <span className="text-muted-foreground font-medium block">
                {transaction.type === "Borrow / Loan Taken"
                  ? "Lender / Source"
                  : transaction.type === "Lend / Loan Given" || transaction.type === "Debt Recovery"
                  ? "Borrower / Person"
                  : "Merchant / Payee"}
              </span>
              <p className="font-bold text-foreground mt-0.5">{transaction.merchant}</p>
            </div>
          )}
        </div>

        {linkedLoan && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 text-xs">
            <span className="font-semibold text-rose-700 dark:text-rose-300 block mb-0.5">
              Linked Loan Liability:
            </span>
            <p className="font-bold text-foreground">
              {linkedLoan.name} ({linkedLoan.lenderInstitution})
            </p>
            <span className="text-muted-foreground text-[11px]">
              Current remaining debt: {money(linkedLoan.currentOutstanding)}
            </span>
          </div>
        )}

        {transaction.notes && (
          <div className="rounded-xl border border-border bg-muted/20 p-3.5 text-xs">
            <span className="font-semibold text-muted-foreground block mb-1">Reference Notes:</span>
            <p className="text-foreground leading-relaxed">{transaction.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDuplicate(transaction)}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Copy size={13} /> Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(transaction)}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Pencil size={13} /> Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(transaction)}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Trash2 size={13} /> Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

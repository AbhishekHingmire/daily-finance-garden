import { Copy, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { InstitutionLogo } from "@/components/shared/InstitutionLogo";
import {
  INVESTMENT_OUTFLOW_ACTIONS,
  type Transaction,
  type WealthState,
} from "@/lib/wealthtrack";
import { formatDate } from "@/lib/formatters";

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
    <Modal title="Transaction Details" onClose={onClose}>
      <div className="space-y-4">
        {/* Header Hero Receipt Card */}
        <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid size-11 sm:size-12 shrink-0 place-items-center rounded-xl bg-primary/10 border border-primary/20 text-xl sm:text-2xl shadow-2xs">
                {cat?.icon || "💸"}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {transaction.type}
                    {transaction.type === "Investment" && transaction.investmentAction
                      ? ` · ${transaction.investmentAction}`
                      : ""}
                  </span>
                  {transaction.recurring && (
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                      Auto-recurring
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground mt-1 truncate">
                  {transaction.description}
                </h3>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`text-xl sm:text-2xl font-black tabular-nums block ${
                  isInflow
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground"
                }`}
              >
                {isInflow ? "+" : "−"}
                {money(transaction.amount)}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {transaction.paymentMethod || "Direct"}
              </span>
            </div>
          </div>
        </div>

        {/* Structured Details Card */}
        <div className="rounded-xl border border-border/70 bg-card p-4 grid grid-cols-2 gap-3.5 text-xs shadow-2xs">
          <div>
            <span className="text-muted-foreground font-medium block text-[11px]">Date</span>
            <p className="font-bold text-foreground mt-0.5">{formatDate(transaction.date)}</p>
          </div>

          <div>
            <span className="text-muted-foreground font-medium block text-[11px]">Account</span>
            <p className="font-bold text-foreground mt-0.5 flex items-center gap-1.5 truncate">
              {acc && <InstitutionLogo name={acc.institution || acc.name} size="xs" />}
              <span className="truncate">{acc?.name ?? "—"}</span>
            </p>
          </div>

          {transaction.type === "Transfer" && (
            <div>
              <span className="text-muted-foreground font-medium block text-[11px]">Destination</span>
              <p className="font-bold text-foreground mt-0.5 flex items-center gap-1.5 truncate">
                {destAcc && <InstitutionLogo name={destAcc.institution || destAcc.name} size="xs" />}
                <span className="truncate">{destAcc?.name ?? "—"}</span>
              </p>
            </div>
          )}

          <div>
            <span className="text-muted-foreground font-medium block text-[11px]">Category</span>
            <p className="font-bold text-foreground mt-0.5 truncate">
              {cat ? `${cat.icon} ${cat.name}` : "—"}
            </p>
          </div>

          {transaction.type === "Expense" && (
            <div>
              <span className="text-muted-foreground font-medium block text-[11px]">Priority</span>
              <div className="mt-0.5">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.2 text-[9.5px] font-bold uppercase tracking-wider ${
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
              <span className="text-muted-foreground font-medium block text-[11px]">
                {transaction.type === "Borrow / Loan Taken"
                  ? "Lender / Source"
                  : transaction.type === "Lend / Loan Given" || transaction.type === "Debt Recovery"
                  ? "Borrower / Person"
                  : "Merchant / Payee"}
              </span>
              <p className="font-bold text-foreground mt-0.5 truncate">{transaction.merchant}</p>
            </div>
          )}
        </div>

        {/* Linked Loan Notice */}
        {linkedLoan && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 text-xs shadow-2xs">
            <span className="font-bold text-rose-700 dark:text-rose-400 block mb-0.5">
              Linked Loan Obligation:
            </span>
            <p className="font-bold text-foreground">
              {linkedLoan.name} ({linkedLoan.lenderInstitution})
            </p>
            <span className="text-muted-foreground text-[11px]">
              Current remaining debt: {money(linkedLoan.currentOutstanding)}
            </span>
          </div>
        )}

        {/* Reference Notes */}
        {transaction.notes && (
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 text-xs shadow-2xs">
            <span className="font-semibold text-muted-foreground block mb-1">Notes:</span>
            <p className="text-foreground leading-relaxed">{transaction.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDuplicate(transaction)}
            className="h-8.5 gap-1.5 text-xs font-semibold"
          >
            <Copy size={13} /> Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(transaction)}
            className="h-8.5 gap-1.5 text-xs font-semibold hover:border-primary/50 hover:text-primary"
          >
            <Pencil size={13} /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(transaction)}
            className="h-8.5 gap-1.5 text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 size={13} /> Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

import { Pencil, Trash2 } from "lucide-react";
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
  const isInvestmentOutflow =
    transaction.type === "Investment" &&
    transaction.investmentAction &&
    INVESTMENT_OUTFLOW_ACTIONS.includes(transaction.investmentAction);

  return (
    <Modal title="Transaction Details" description={`ID: ${transaction.id}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4 border border-border">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {transaction.type}
              {transaction.type === "Investment" && transaction.investmentAction
                ? ` · ${transaction.investmentAction}`
                : ""}
            </p>
            <h3 className="text-xl font-extrabold text-foreground mt-0.5">{transaction.description}</h3>
          </div>
          <span
            className={`text-2xl font-black tabular-nums ${
              transaction.type === "Income" ||
              transaction.type === "Refund" ||
              (transaction.type === "Investment" && !isInvestmentOutflow && transaction.investmentAction !== "Valuation")
                ? "text-emerald-600 dark:text-emerald-400"
                : transaction.type === "Expense" || isInvestmentOutflow
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground"
            }`}
          >
            {transaction.type === "Expense" || isInvestmentOutflow ? "−" : transaction.type === "Income" || (transaction.type === "Investment" && !isInvestmentOutflow) ? "+" : ""}
            {money(transaction.amount)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Date</span>
            <p className="font-semibold text-foreground">{formatDate(transaction.date)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Account</span>
            <p className="font-semibold text-foreground">{acc?.name ?? "—"}</p>
          </div>
          {transaction.type === "Transfer" && (
            <div>
              <span className="text-xs text-muted-foreground">Destination Account</span>
              <p className="font-semibold text-foreground">{destAcc?.name ?? "—"}</p>
            </div>
          )}
          <div>
            <span className="text-xs text-muted-foreground">Category</span>
            <p className="font-semibold text-foreground">{cat ? `${cat.icon} ${cat.name}` : "—"}</p>
          </div>
          {transaction.type === "Investment" && (
            <>
              <div>
                <span className="text-xs text-muted-foreground">Instrument</span>
                <p className="font-semibold text-foreground">
                  {transaction.instrumentName || transaction.instrumentType || "—"}
                </p>
              </div>
              {transaction.units != null && transaction.pricePerUnit != null && (
                <div>
                  <span className="text-xs text-muted-foreground">Units @ Price</span>
                  <p className="font-semibold text-foreground">
                    {transaction.units} units @ {money(transaction.pricePerUnit)}
                  </p>
                </div>
              )}
            </>
          )}
          {transaction.type === "Expense" && (
            <div>
              <span className="text-xs text-muted-foreground">Priority Classification</span>
              <p className="font-semibold mt-0.5">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    transaction.need === "Want"
                      ? "border border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {transaction.need === "Want" ? "Want" : "Need"}
                </span>
              </p>
            </div>
          )}
          <div>
            <span className="text-xs text-muted-foreground">Payment Method</span>
            <p className="font-semibold text-foreground">{transaction.paymentMethod || "UPI"}</p>
          </div>
          {transaction.merchant && (
            <div>
              <span className="text-xs text-muted-foreground">Merchant / Entity</span>
              <p className="font-semibold text-foreground">{transaction.merchant}</p>
            </div>
          )}
        </div>

        {transaction.notes && (
          <div className="rounded-lg border border-border bg-card p-3 text-xs">
            <span className="font-semibold text-muted-foreground">Notes:</span>
            <p className="mt-1 text-foreground leading-relaxed">{transaction.notes}</p>
          </div>
        )}

        {transaction.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {transaction.tags.map((t) => (
              <span key={t} className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={() => onDuplicate(transaction)}>
            Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(transaction)} className="gap-1.5">
            <Pencil size={13} /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(transaction)} className="gap-1.5">
            <Trash2 size={13} /> Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

import { useState } from "react";
import { AlertCircle, CheckCircle2, CreditCard, Scale, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, type Account, type WealthPreferences } from "@/lib/wealthtrack";

export function ReconcileModal({
  account,
  currentBalance,
  currency = "INR",
  onClose,
  onReconcile,
}: {
  account: Account;
  currentBalance: number;
  currency?: WealthPreferences["currency"];
  onClose: () => void;
  onReconcile: (accountId: string, newBalance: number, notes?: string) => void;
}) {
  const [statementBalance, setStatementBalance] = useState<string>(String(currentBalance));
  const [notes, setNotes] = useState<string>("Bank statement balance reconciliation");
  const [error, setError] = useState<string>("");

  const parsedStatementBalance = Number(statementBalance);
  const isValidNumber = !Number.isNaN(parsedStatementBalance) && statementBalance.trim() !== "";
  const difference = isValidNumber ? parsedStatementBalance - currentBalance : 0;
  const isCreditCard = account.kind === "Credit card";

  const handleConfirm = () => {
    if (!isValidNumber) {
      setError("Please enter a valid numeric statement balance.");
      return;
    }
    onReconcile(account.id, parsedStatementBalance, notes);
    onClose();
  };

  const currencySymbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconcile-modal-title"
    >
      <div className="w-full max-w-lg rounded-t-xl border border-border bg-card p-5 wt-shadow sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Scale size={20} />
            </span>
            <div>
              <h2 id="reconcile-modal-title" className="wt-display text-xl font-bold">
                Reconcile Account Balance
              </h2>
              <p className="text-xs text-muted-foreground">
                Match your ledger with your official bank or card statement.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close dialog" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Account Details Banner */}
        <div className="mb-4 rounded-xl border border-border bg-muted/40 p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-md bg-card text-foreground">
                {isCreditCard ? <CreditCard size={16} /> : <Wallet size={16} />}
              </span>
              <div>
                <p className="text-sm font-bold">{account.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {account.institution || "Account"} {account.identifier ? `· ${account.identifier}` : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Tracked Balance
              </span>
              <span className="wt-display text-base font-extrabold text-foreground tabular-nums">
                {formatMoney(currentBalance, currency)}
              </span>
            </div>
          </div>

          {isCreditCard && (
            <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/20">
              <AlertCircle size={13} className="shrink-0" />
              <span>Credit Card accounts reflect your current outstanding liability balance.</span>
            </div>
          )}
        </div>

        {/* Statement Input Form */}
        <div className="space-y-4">
          <div>
            <label className="block min-w-0">
              <span className="wt-label">
                Actual Statement Balance ({currencySymbol}) <span className="text-destructive">*</span>
              </span>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  className="wt-field pl-8 text-lg font-bold"
                  value={statementBalance}
                  onChange={(e) => {
                    setStatementBalance(e.target.value);
                    if (error) setError("");
                  }}
                  autoFocus
                  placeholder="0.00"
                />
              </div>
            </label>
            {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
          </div>

          {/* Live Adjustment Calculation Preview */}
          <div className="rounded-xl border border-border bg-card p-3.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Reconciliation Summary
            </span>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Required Adjustment:</span>
              <span
                className={`text-base font-bold tabular-nums ${
                  difference === 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : difference > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {difference === 0 ? "No change needed" : `${difference > 0 ? "+" : "−"}${formatMoney(Math.abs(difference), currency)}`}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {difference === 0 ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={13} /> Your tracked balance already matches this statement.
                </span>
              ) : (
                `A balance adjustment transaction of ${formatMoney(Math.abs(difference), currency)} will be created to align your ledger.`
              )}
            </p>
          </div>

          <div>
            <label className="block min-w-0">
              <span className="wt-label">Reconciliation Notes (optional)</span>
              <input
                type="text"
                className="wt-field text-xs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. October bank statement check"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={!isValidNumber}>
              Confirm Reconciliation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

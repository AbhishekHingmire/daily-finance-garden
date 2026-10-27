import { useEffect, useState } from "react";
import { ArrowLeftRight, ArrowRight, CheckCircle2, CreditCard, Info, TrendingUp, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstitutionLogo } from "@/components/shared/InstitutionLogo";
import {
  formatMoney,
  getAccountBalance,
  type Account,
  type Transaction,
  type WealthPreferences,
} from "@/lib/wealthtrack";

export function TransferModal({
  accounts,
  transactions,
  initialFromAccountId,
  currency = "INR",
  onClose,
  onTransfer,
}: {
  accounts: Account[];
  transactions: Transaction[];
  initialFromAccountId?: string;
  currency?: WealthPreferences["currency"];
  onClose: () => void;
  onTransfer: (transfer: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    notes?: string;
  }) => void;
}) {
  const activeAccounts = accounts.filter((a) => !a.archived);

  const defaultFromId =
    initialFromAccountId && activeAccounts.some((a) => a.id === initialFromAccountId)
      ? initialFromAccountId
      : activeAccounts[0]?.id || "";

  const defaultToId =
    activeAccounts.find((a) => a.id !== defaultFromId)?.id || activeAccounts[1]?.id || "";

  const [fromAccountId, setFromAccountId] = useState<string>(defaultFromId);
  const [toAccountId, setToAccountId] = useState<string>(defaultToId);
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string>("");

  const fromAccount = activeAccounts.find((a) => a.id === fromAccountId);
  const toAccount = activeAccounts.find((a) => a.id === toAccountId);

  const fromBalance = fromAccount ? getAccountBalance(fromAccount, transactions) : 0;
  const toBalance = toAccount ? getAccountBalance(toAccount, transactions) : 0;

  const parsedAmount = Number(amount);
  const isValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0;

  // Swap From and To
  const handleSwap = () => {
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
    setError("");
  };

  // Quick increment amount
  const handleIncrement = (inc: number) => {
    const cur = Number(amount) || 0;
    setAmount(String(cur + inc));
    setError("");
  };

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fromAccountId || !toAccountId) {
      setError("Please select both source and destination accounts.");
      return;
    }
    if (fromAccountId === toAccountId) {
      setError("Source and destination accounts must be different.");
      return;
    }
    if (!isValidAmount) {
      setError("Please enter a transfer amount greater than zero.");
      return;
    }
    if (fromAccount && !["Credit card", "Loan"].includes(fromAccount.kind) && parsedAmount > fromBalance) {
      setError(`Insufficient balance in ${fromAccount.name}. Available: ${formatMoney(fromBalance, currency)}, Transfer: ${formatMoney(parsedAmount, currency)}`);
      return;
    }

    onTransfer({
      fromAccountId,
      toAccountId,
      amount: parsedAmount,
      date: date || new Date().toISOString().slice(0, 16),
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const currencySymbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";

  const getAccountIcon = (kind: string) => {
    if (kind === "Credit card") return <CreditCard size={15} />;
    if (kind === "Investment") return <TrendingUp size={15} />;
    return <Wallet size={15} />;
  };

  return (
    <div
      className="fixed inset-0 z-modal flex items-end justify-center bg-foreground/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
    >
      <div className="w-full max-w-lg rounded-t-xl border border-border bg-card p-5 wt-shadow sm:rounded-xl sm:p-6 animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <ArrowLeftRight size={20} />
            </span>
            <div>
              <h2 id="transfer-modal-title" className="wt-display text-xl font-bold">
                Transfer Funds
              </h2>
              <p className="text-xs text-muted-foreground">
                Move money cleanly between your liquid, savings, and credit accounts.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close transfer dialog" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transfer Route Visual Card */}
          <div className="rounded-xl border border-border bg-muted/30 p-3.5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              {/* From Account Preview */}
              <div className="rounded-lg border border-border/80 bg-card p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  From Account
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {fromAccount && (
                    <InstitutionLogo
                      name={fromAccount.institution || fromAccount.name}
                      size="xs"
                    />
                  )}
                  <p className="text-xs font-bold text-foreground truncate">
                    {fromAccount?.name || "Select account"}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                  {formatMoney(fromBalance, currency)}
                </p>
              </div>

              {/* Swap Button */}
              <div className="flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="grid size-8 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-2xs"
                  title="Swap source and destination accounts"
                  aria-label="Swap accounts"
                >
                  <ArrowLeftRight size={14} />
                </button>
              </div>

              {/* To Account Preview */}
              <div className="rounded-lg border border-border/80 bg-card p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  To Account
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {toAccount && (
                    <InstitutionLogo
                      name={toAccount.institution || toAccount.name}
                      size="xs"
                    />
                  )}
                  <p className="text-xs font-bold text-foreground truncate">
                    {toAccount?.name || "Select account"}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                  {formatMoney(toBalance, currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Account Selectors */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="from-account" className="mb-1 block text-xs font-semibold text-foreground">
                Transfer From
              </label>
              <select
                id="from-account"
                className="wt-field w-full text-xs"
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
              >
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatMoney(getAccountBalance(acc, transactions), currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="to-account" className="mb-1 block text-xs font-semibold text-foreground">
                Transfer To
              </label>
              <select
                id="to-account"
                className="wt-field w-full text-xs"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
              >
                {activeAccounts
                  .filter((acc) => acc.id !== fromAccountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatMoney(getAccountBalance(acc, transactions), currency)})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label htmlFor="transfer-amount" className="mb-1 block text-xs font-semibold text-foreground">
              Transfer Amount ({currencySymbol})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                {currencySymbol}
              </span>
              <input
                id="transfer-amount"
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                className="wt-field w-full pl-8 text-base font-bold tabular-nums"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                autoFocus
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="mt-2 flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] text-muted-foreground font-medium shrink-0">Quick add:</span>
              {[100, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleIncrement(amt)}
                  className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/60 hover:bg-primary/5 active:scale-95 transition-all shrink-0 cursor-pointer shadow-2xs"
                >
                  +{formatMoney(amt, currency)}
                </button>
              ))}
              {Number(amount) > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className="text-[11px] text-muted-foreground hover:text-rose-500 font-medium ml-auto pl-1 shrink-0 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Date & Reference Note */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="transfer-date" className="mb-1 block text-xs font-semibold text-foreground">
                Transfer Date
              </label>
              <input
                id="transfer-date"
                type="datetime-local"
                required
                className="wt-field w-full text-xs"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="transfer-notes" className="mb-1 block text-xs font-semibold text-foreground">
                Reference / Note (Optional)
              </label>
              <input
                id="transfer-notes"
                type="text"
                placeholder="e.g. Card bill, savings allocation"
                className="wt-field w-full text-xs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Balance Warning (if transferring more than available liquid cash) */}
          {isValidAmount && fromAccount?.kind !== "Credit card" && parsedAmount > fromBalance && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
              Notice: The amount ({formatMoney(parsedAmount, currency)}) exceeds the current tracked balance of {fromAccount?.name} ({formatMoney(fromBalance, currency)}).
            </div>
          )}

          {/* Informational Banner */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground border border-border/60">
            <Info size={14} className="shrink-0 mt-0.5 text-primary" />
            <span>
              Transfers move money between your own accounts. They will never distort your income or expense analytics.
            </span>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isValidAmount || fromAccountId === toAccountId}
              className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
            >
              <CheckCircle2 size={14} /> Confirm Transfer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

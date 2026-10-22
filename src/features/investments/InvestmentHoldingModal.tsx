import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { Modal } from "@/components/shared/Modal";
import type { AssetType, InvestmentHolding, WealthState } from "@/lib/wealthtrack";

const ASSET_TYPES: AssetType[] = [
  "Mutual fund",
  "Stocks & Equity",
  "ETF",
  "Gold & Commodities",
  "Fixed deposit",
  "Crypto",
  "Other",
];

export function InvestmentHoldingModal({
  data,
  existing,
  onClose,
  onSave,
}: {
  data: WealthState;
  existing: InvestmentHolding | null;
  onClose: () => void;
  onSave: (holding: InvestmentHolding) => void;
}) {
  const currencySymbol =
    data.preferences.currency === "INR"
      ? "₹"
      : data.preferences.currency === "USD"
      ? "$"
      : data.preferences.currency === "EUR"
      ? "€"
      : "£";

  const [name, setName] = useState(existing?.name ?? "");
  const [assetType, setAssetType] = useState<AssetType>(existing?.assetType ?? "Mutual fund");
  const [institution, setInstitution] = useState(existing?.institution ?? "");
  const [investedAmount, setInvestedAmount] = useState<number | "">(
    existing?.investedAmount !== undefined ? existing.investedAmount : ""
  );
  const [currentAmount, setCurrentAmount] = useState<number | "">(
    existing?.currentAmount !== undefined ? existing.currentAmount : ""
  );
  const [isRecurring, setIsRecurring] = useState<boolean>(existing?.isRecurring ?? false);
  const [sipAmount, setSipAmount] = useState<number | "">(
    existing?.sipAmount !== undefined ? existing.sipAmount : ""
  );
  const [sipFrequency, setSipFrequency] = useState<string>(existing?.sipFrequency ?? "Monthly");
  const [sipAccountId, setSipAccountId] = useState<string>(
    existing?.sipAccountId ?? data.accounts[0]?.id ?? ""
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const investedNum = Number(investedAmount) || 0;
  const currentNum = Number(currentAmount) || 0;

  const returnStats = useMemo(() => {
    const pnl = currentNum - investedNum;
    const pnlPct = investedNum > 0 ? (pnl / investedNum) * 100 : 0;
    return { pnl, pnlPct };
  }, [investedNum, currentNum]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Enter the name of the holding.";
    if (investedAmount === "" || investedNum < 0) errs.investedAmount = "Enter a valid invested amount.";
    if (currentAmount === "" || currentNum < 0) errs.currentAmount = "Enter a valid current valuation.";
    if (isRecurring && (!sipAmount || Number(sipAmount) <= 0)) {
      errs.sipAmount = "Enter a valid SIP installment amount.";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const holding: InvestmentHolding = {
      id: existing?.id ?? `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      assetType,
      institution: institution.trim() || undefined,
      investedAmount: investedNum,
      currentAmount: currentNum,
      isRecurring,
      recurringId: existing?.recurringId,
      sipAmount: isRecurring ? Number(sipAmount) || investedNum : undefined,
      sipFrequency: isRecurring ? sipFrequency : undefined,
      sipAccountId: isRecurring ? sipAccountId : undefined,
      status: existing?.status ?? "Active",
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    onSave(holding);
  };

  return (
    <Modal
      title={existing ? "Update Investment Holding" : "Add Investment Holding"}
      description="Track your portfolio with invested capital, current valuation, and real-time earned returns."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Holding / Asset Name"
          placeholder="e.g. Parag Parikh Flexi Cap, Nifty 50 ETF, Gold BeES"
          value={name}
          onChange={setName}
          error={errors.name}
          required
          autoFocus
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Asset Type"
            value={assetType}
            onChange={(v) => setAssetType(v as AssetType)}
            options={ASSET_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <InputField
            label="Broker / Platform (optional)"
            placeholder="e.g. Groww, Zerodha, HDFC"
            value={institution}
            onChange={setInstitution}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="wt-label">
              Invested Amount ({currencySymbol}) <span className="text-destructive">*</span>
            </span>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">
                {currencySymbol}
              </span>
              <input
                className="wt-field pl-8 font-semibold"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            {errors.investedAmount && (
              <span className="mt-1 block text-xs text-destructive">{errors.investedAmount}</span>
            )}
          </label>

          <label className="block">
            <span className="wt-label">
              Current Valuation ({currencySymbol}) <span className="text-destructive">*</span>
            </span>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">
                {currencySymbol}
              </span>
              <input
                className="wt-field pl-8 font-semibold"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            {errors.currentAmount && (
              <span className="mt-1 block text-xs text-destructive">{errors.currentAmount}</span>
            )}
          </label>
        </div>

        {/* Live Real-Time Earned Returns Preview */}
        {investedNum > 0 && currentNum >= 0 && (
          <div
            className={`rounded-xl border p-3.5 transition-all ${
              returnStats.pnl >= 0
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-destructive/30 bg-destructive/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {returnStats.pnl >= 0 ? (
                  <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="size-4 text-destructive" />
                )}
                <span className="text-xs font-semibold text-foreground">Earned Returns (P&L)</span>
              </div>
              <div className="text-right">
                <span
                  className={`text-sm font-extrabold ${
                    returnStats.pnl >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  {returnStats.pnl >= 0 ? "+" : ""}
                  {currencySymbol}
                  {Math.abs(returnStats.pnl).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  {" ("}
                  {returnStats.pnl >= 0 ? "+" : ""}
                  {returnStats.pnlPct.toFixed(2)}%
                  {")"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Investment Mode: One-time (Lumpsum) vs Recurring (SIP) */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Contribution Schedule Mode</span>
            <span className="text-[11px] text-muted-foreground">Auto-syncs with Recurring rules</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`rounded-lg border p-2.5 text-xs font-semibold text-center transition-all cursor-pointer ${
                !isRecurring
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
              onClick={() => setIsRecurring(false)}
            >
              One-time (Lumpsum)
            </button>
            <button
              type="button"
              className={`rounded-lg border p-2.5 text-xs font-semibold text-center transition-all cursor-pointer ${
                isRecurring
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
              onClick={() => {
                setIsRecurring(true);
                if (!sipAmount && investedNum > 0) setSipAmount(investedNum);
              }}
            >
              Recurring (SIP Auto-debit)
            </button>
          </div>

          {isRecurring && (
            <div className="pt-2 border-t border-border/60 grid gap-3 sm:grid-cols-3">
              <div>
                <span className="wt-label">SIP Amount ({currencySymbol}) *</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 5000"
                  className="wt-field font-semibold text-xs"
                  value={sipAmount}
                  onChange={(e) => setSipAmount(e.target.value === "" ? "" : Number(e.target.value))}
                />
                {errors.sipAmount && (
                  <span className="mt-1 block text-[10px] text-destructive">{errors.sipAmount}</span>
                )}
              </div>

              <div>
                <span className="wt-label">Cadence Frequency</span>
                <select
                  className="wt-field text-xs font-semibold"
                  value={sipFrequency}
                  onChange={(e) => setSipFrequency(e.target.value)}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
              </div>

              <div>
                <span className="wt-label">Debit Bank Account</span>
                <select
                  className="wt-field text-xs font-semibold"
                  value={sipAccountId}
                  onChange={(e) => setSipAccountId(e.target.value)}
                >
                  {data.accounts
                    .filter((a) => !a.archived)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <label className="block">
          <span className="wt-label">Notes or Strategy (optional)</span>
          <textarea
            className="wt-field min-h-16 resize-y text-xs"
            placeholder="e.g. SIP of ₹5,000 every 10th, emergency hedge, target ₹2L"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="text-xs font-semibold">
            {existing ? "Update Holding" : "Save Holding"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

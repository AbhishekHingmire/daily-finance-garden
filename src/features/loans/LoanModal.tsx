import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, Calculator, Landmark, Percent, PiggyBank, ShieldAlert, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { Modal } from "@/components/shared/Modal";
import { getAccountBalance, type LoanLiability, type LoanType, type WealthState } from "@/lib/wealthtrack";

const LOAN_TYPES: LoanType[] = [
  "Home Loan",
  "Personal Loan",
  "Car / Auto Loan",
  "Education Loan",
  "Credit Line",
  "Other",
];

export function LoanModal({
  data,
  existing,
  onClose,
  onSave,
}: {
  data: WealthState;
  existing: LoanLiability | null;
  onClose: () => void;
  onSave: (loan: LoanLiability) => void | Promise<void>;
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
  const [loanType, setLoanType] = useState<LoanType>(existing?.loanType ?? "Home Loan");
  const [lenderInstitution, setLenderInstitution] = useState(existing?.lenderInstitution ?? "");
  const [principalAmount, setPrincipalAmount] = useState<number | "">(
    existing?.principalAmount !== undefined ? existing.principalAmount : ""
  );
  const [currentOutstanding, setCurrentOutstanding] = useState<number | "">(
    existing?.currentOutstanding !== undefined ? existing.currentOutstanding : ""
  );
  const [interestRate, setInterestRate] = useState<number | "">(
    existing?.interestRate !== undefined ? existing.interestRate : 8.5
  );
  const [emiAmount, setEmiAmount] = useState<number | "">(
    existing?.emiAmount !== undefined ? existing.emiAmount : ""
  );
  const [repaymentAccountId, setRepaymentAccountId] = useState(
    existing?.repaymentAccountId ?? (data.accounts.find((a) => !a.archived)?.id ?? "")
  );
  const [startDate, setStartDate] = useState(
    existing?.startDate ?? new Date().toISOString().slice(0, 10)
  );
  const [tenureMonths, setTenureMonths] = useState<number | "">(
    existing?.tenureMonths !== undefined ? existing.tenureMonths : 60
  );
  const [paidEmisCount, setPaidEmisCount] = useState<number | "">(
    existing?.paidEmisCount !== undefined ? existing.paidEmisCount : 0
  );
  const [autoRecurringEmi, setAutoRecurringEmi] = useState<boolean>(
    existing?.autoRecurringEmi ?? true
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const principalNum = Number(principalAmount) || 0;
  const outstandingNum = Number(currentOutstanding) || 0;
  const tenureNum = Number(tenureMonths) || 0;
  const paidCount = Number(paidEmisCount) || 0;
  const emiNum = Number(emiAmount) || 0;

  // EMIs remaining calculation
  const remainingEmis = Math.max(0, tenureNum - paidCount);

  // Financial paid vs remaining stats
  const payoffStats = useMemo(() => {
    // Principal paid based on outstanding vs principal
    const paidByPrincipal = Math.max(0, principalNum - outstandingNum);
    const pctByPrincipal = principalNum > 0 ? (paidByPrincipal / principalNum) * 100 : 0;

    // Outflow paid based on EMIs
    const totalEmiCommitment = emiNum * tenureNum;
    const emiPaidTotal = emiNum * paidCount;
    const emiRemainingTotal = emiNum * remainingEmis;
    const emiProgressPct = tenureNum > 0 ? (paidCount / tenureNum) * 100 : 0;

    return {
      paidByPrincipal,
      pctByPrincipal,
      totalEmiCommitment,
      emiPaidTotal,
      emiRemainingTotal,
      emiProgressPct,
    };
  }, [principalNum, outstandingNum, emiNum, tenureNum, paidCount, remainingEmis]);

  // Handler to sync outstanding from EMIs paid
  const handleAutoComputeOutstanding = () => {
    if (principalNum <= 0) return;
    if (tenureNum <= 0) return;
    // Estimated outstanding balance after paidCount installments
    const estimated = Math.max(0, Math.round(principalNum * (1 - paidCount / tenureNum)));
    setCurrentOutstanding(estimated);
    // Clear outstanding error if present
    setErrors((prev) => {
      const next = { ...prev };
      delete next.currentOutstanding;
      return next;
    });
  };

  const handleTenureChange = (val: number | "") => {
    setTenureMonths(val);
    const newTenure = Number(val) || 0;
    if (paidCount > newTenure && newTenure > 0) {
      setPaidEmisCount(newTenure);
    }
  };

  const handlePaidEmisChange = (val: number | "") => {
    setPaidEmisCount(val);
    const newPaid = Number(val) || 0;
    // If outstanding is not set or matches previously calculated, auto-suggest
    if (principalNum > 0 && tenureNum > 0 && (currentOutstanding === "" || currentOutstanding === principalNum)) {
      const estimated = Math.max(0, Math.round(principalNum * (1 - newPaid / tenureNum)));
      setCurrentOutstanding(estimated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const errs: Record<string, string> = {};

    // 1. Title validation
    if (!name.trim()) {
      errs.name = "Enter the loan or liability title.";
    }

    // 2. Principal validation
    if (principalAmount === "" || principalNum <= 0) {
      errs.principalAmount = "Enter a valid sanction principal greater than 0.";
    }

    // 3. Tenure validation
    if (tenureMonths === "" || tenureNum <= 0) {
      errs.tenureMonths = "Total tenure must be at least 1 month.";
    } else if (tenureNum > 600) {
      errs.tenureMonths = "Tenure cannot exceed 600 months (50 years).";
    }

    // 4. EMIs Paid validation (Strict check against false values)
    if (paidEmisCount === "" || paidCount < 0) {
      errs.paidEmisCount = "EMIs paid cannot be negative.";
    } else if (tenureNum > 0 && paidCount > tenureNum) {
      errs.paidEmisCount = `EMIs paid (${paidCount}) cannot exceed total tenure (${tenureNum} months).`;
    }

    // 5. Current Outstanding validation (Cannot exceed principal)
    if (currentOutstanding === "" || outstandingNum < 0) {
      errs.currentOutstanding = "Enter current outstanding balance.";
    } else if (principalNum > 0 && outstandingNum > principalNum) {
      errs.currentOutstanding = `Outstanding balance (${currencySymbol}${outstandingNum.toLocaleString()}) cannot exceed original principal sanction (${currencySymbol}${principalNum.toLocaleString()}).`;
    }

    // 6. EMI Amount validation
    if (emiAmount === "" || emiNum <= 0) {
      errs.emiAmount = "Enter monthly EMI amount greater than 0.";
    }

    // 7. Interest Rate validation
    const rateNum = Number(interestRate) || 0;
    if (rateNum < 0 || rateNum > 100) {
      errs.interestRate = "Interest rate must be between 0% and 100% p.a.";
    }

    // 8. Repayment Account validation
    if (!repaymentAccountId) {
      errs.repaymentAccountId = "Select the repayment bank account.";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const loan: LoanLiability = {
      id: existing?.id ?? `loan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      loanType,
      lenderInstitution: lenderInstitution.trim() || "Lender",
      principalAmount: principalNum,
      currentOutstanding: outstandingNum,
      interestRate: rateNum,
      emiAmount: emiNum,
      repaymentAccountId,
      startDate,
      tenureMonths: tenureNum,
      paidEmisCount: paidCount,
      autoRecurringEmi,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    setIsSubmitting(true);
    try {
      await onSave(loan);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={existing ? "Edit Loan / Liability" : "Add Loan / Debt"}
      description="Track total tenure, EMIs paid, remaining installments, and outstanding balance."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Loan Identity */}
        <InputField
          label="Loan Title / Description"
          placeholder="e.g. HDFC Home Loan, SBI Auto Loan, Education Loan"
          value={name}
          onChange={setName}
          error={errors.name}
          required
          autoFocus
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Loan Type"
            value={loanType}
            onChange={(v) => setLoanType(v as LoanType)}
            options={LOAN_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <InputField
            label="Lender / Banking Institution"
            placeholder="e.g. HDFC Bank, SBI, ICICI"
            value={lenderInstitution}
            onChange={setLenderInstitution}
          />
        </div>

        {/* PROMINENT SECTION: ASK HOW MUCH PAID & HOW MUCH LEFT */}
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Calculator size={14} /> Repayment Tenure & EMIs Paid
            </span>
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-extrabold text-primary tabular-nums">
              {paidCount} of {tenureNum} EMIs Paid · {remainingEmis} Left
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* Total Tenure */}
            <label className="block">
              <span className="wt-label">
                Total Tenure (Months) <span className="text-destructive">*</span>
              </span>
              <input
                className="wt-field font-semibold bg-background"
                type="number"
                min="1"
                max="600"
                step="1"
                placeholder="e.g. 60"
                value={tenureMonths}
                onChange={(e) => handleTenureChange(e.target.value === "" ? "" : Math.floor(Number(e.target.value)))}
              />
              {errors.tenureMonths && (
                <span className="mt-1 block text-xs text-destructive">{errors.tenureMonths}</span>
              )}
            </label>

            {/* EMIs Paid (Asked directly: e.g. 4 or 10) */}
            <label className="block">
              <span className="wt-label">
                EMIs Already Paid <span className="text-destructive">*</span>
              </span>
              <input
                className="wt-field font-semibold text-emerald-600 dark:text-emerald-400 bg-background"
                type="number"
                min="0"
                max={tenureNum || 600}
                step="1"
                placeholder="e.g. 4 or 10"
                value={paidEmisCount}
                onChange={(e) => handlePaidEmisChange(e.target.value === "" ? "" : Math.floor(Number(e.target.value)))}
              />
              {errors.paidEmisCount && (
                <span className="mt-1 block text-xs text-destructive">{errors.paidEmisCount}</span>
              )}
            </label>

            {/* EMIs Left / Remaining (Calculated automatically) */}
            <label className="block">
              <span className="wt-label">EMIs Remaining</span>
              <div className="wt-field font-extrabold text-amber-600 dark:text-amber-400 bg-muted/60 flex items-center justify-between select-none">
                <span>{remainingEmis} EMIs left</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  {payoffStats.emiProgressPct.toFixed(1)}% paid
                </span>
              </div>
            </label>
          </div>

          {/* Quick Summary Pill of Paid vs Left */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-primary/10 text-xs text-muted-foreground">
            <span>
              {paidCount > 0 ? (
                <>Paid: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{paidCount} installments</strong></>
              ) : (
                "No EMIs paid yet (Brand new loan)"
              )}
            </span>
            <span>
              Left to pay: <strong className="text-amber-600 dark:text-amber-400 tabular-nums">{remainingEmis} installments</strong>
            </span>
          </div>
        </div>

        {/* Loan Financial Amounts & Balances */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Principal Sanction Amount */}
          <label className="block">
            <span className="wt-label">
              Original Principal Sanction ({currencySymbol}) <span className="text-destructive">*</span>
            </span>
            <input
              className="wt-field font-semibold"
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 500000"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value === "" ? "" : Number(e.target.value))}
            />
            {errors.principalAmount && (
              <span className="mt-1 block text-xs text-destructive">{errors.principalAmount}</span>
            )}
          </label>

          {/* Monthly EMI Amount */}
          <label className="block">
            <span className="wt-label">
              Monthly EMI Outflow ({currencySymbol}) <span className="text-destructive">*</span>
            </span>
            <input
              className="wt-field font-bold text-destructive"
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 15000"
              value={emiAmount}
              onChange={(e) => setEmiAmount(e.target.value === "" ? "" : Number(e.target.value))}
            />
            {errors.emiAmount && (
              <span className="mt-1 block text-xs text-destructive">{errors.emiAmount}</span>
            )}
          </label>
        </div>

        {/* Current Outstanding Balance with Auto-Calculation Helper */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="wt-label mb-0">
              Current Outstanding Balance ({currencySymbol}) <span className="text-destructive">*</span>
            </span>
            {principalNum > 0 && tenureNum > 0 && (
              <button
                type="button"
                onClick={handleAutoComputeOutstanding}
                className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                title="Calculate outstanding based on principal and EMIs paid"
              >
                <Calculator size={11} /> Auto-fill from {paidCount} EMIs paid
              </button>
            )}
          </div>
          <input
            className="wt-field font-bold text-destructive"
            type="number"
            min="0"
            max={principalNum || undefined}
            step="any"
            placeholder={principalNum > 0 ? `e.g. ${Math.round(principalNum * (1 - paidCount / (tenureNum || 1)))}` : "e.g. 385000"}
            value={currentOutstanding}
            onChange={(e) => setCurrentOutstanding(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {errors.currentOutstanding && (
            <span className="mt-1 block text-xs text-destructive">{errors.currentOutstanding}</span>
          )}
          {principalNum > 0 && outstandingNum <= principalNum && (
            <p className="text-[11px] text-muted-foreground">
              Principal paid off: <strong className="text-foreground tabular-nums">{currencySymbol}{Math.max(0, principalNum - outstandingNum).toLocaleString()}</strong> · Outstanding balance remaining: <strong className="text-foreground tabular-nums">{currencySymbol}{outstandingNum.toLocaleString()}</strong>
            </p>
          )}
        </div>

        {/* Visual Live Payoff & Progress Breakdown Container */}
        {principalNum > 0 && (
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <PiggyBank className="size-3.5 text-primary" /> Loan Payoff Status
              </span>
              <span className="font-extrabold text-foreground tabular-nums">
                {payoffStats.pctByPrincipal.toFixed(1)}% Principal Paid
              </span>
            </div>

            {/* Segmented Payoff Progress Bar */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(payoffStats.pctByPrincipal, 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 text-[11px]">
              <div className="rounded-lg bg-card p-2 border border-border/60">
                <span className="block text-[10px] text-muted-foreground uppercase font-bold">Principal</span>
                <span className="font-extrabold text-foreground tabular-nums">{currencySymbol}{principalNum.toLocaleString()}</span>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-2 border border-emerald-500/20">
                <span className="block text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold">{paidCount} Paid</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">{currencySymbol}{payoffStats.paidByPrincipal.toLocaleString()}</span>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2 border border-amber-500/20">
                <span className="block text-[10px] text-amber-700 dark:text-amber-300 uppercase font-bold">{remainingEmis} Left</span>
                <span className="font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">{currencySymbol}{outstandingNum.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Interest Rate & Start Date */}
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField
            label="Interest Rate (% p.a.)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="e.g. 8.5"
            value={interestRate}
            onChange={(v) => setInterestRate(v === "" ? "" : Number(v))}
            error={errors.interestRate}
          />

          <InputField
            label="Loan Start Date"
            type="date"
            value={startDate}
            onChange={setStartDate}
          />
        </div>

        {/* Bank Account Selection for EMI Auto-debit */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
          <SelectField
            label="Repayment Bank Account (Auto-Debit Source) *"
            value={repaymentAccountId}
            onChange={setRepaymentAccountId}
            options={data.accounts
              .filter((a) => !a.archived)
              .map((a) => {
                const bal = getAccountBalance(a, data.transactions);
                return {
                  value: a.id,
                  label: `${a.institution ? `${a.institution} · ` : ""}${a.name} (${currencySymbol}${bal.toLocaleString("en-IN")})`,
                };
              })}
            error={errors.repaymentAccountId}
            required
          />

          {(() => {
            const acc = data.accounts.find((a) => a.id === repaymentAccountId);
            if (!acc) return null;
            const bal = getAccountBalance(acc, data.transactions);
            const isInsufficient = emiNum > 0 && bal < emiNum;
            const isLow = emiNum > 0 && !isInsufficient && bal - emiNum < 2000;
            return (
              <div className="text-[11px] px-1">
                {isInsufficient ? (
                  <p className="text-destructive font-semibold flex items-center gap-1">
                    <AlertCircle size={12} className="shrink-0" />
                    Insufficient balance for EMI: Available {currencySymbol}{bal.toLocaleString("en-IN")} vs EMI {currencySymbol}{emiNum.toLocaleString("en-IN")}
                  </p>
                ) : isLow ? (
                  <p className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <ShieldAlert size={12} className="shrink-0" />
                    Low balance alert: Balance after EMI debit will be {currencySymbol}{(bal - emiNum).toLocaleString("en-IN")}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Available balance: {currencySymbol}{bal.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            );
          })()}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded accent-primary cursor-pointer"
              checked={autoRecurringEmi}
              onChange={(e) => setAutoRecurringEmi(e.target.checked)}
            />
            <div>
              <span className="block text-xs font-bold text-foreground">
                Sync with Recurring Bills & Schedules
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Automatically registers monthly EMI in the Recurring section so installments are tracked and accounted for each month.
              </span>
            </div>
          </label>
        </div>

        {/* Notes */}
        <label className="block">
          <span className="wt-label">Notes / Account Reference</span>
          <textarea
            className="wt-field min-h-16 resize-y text-xs"
            placeholder="e.g. Loan account no: 9028340192, floating repo linked rate"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} className="text-xs font-semibold px-5">
            {isSubmitting ? "Saving…" : existing ? "Update Loan" : "Save Loan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

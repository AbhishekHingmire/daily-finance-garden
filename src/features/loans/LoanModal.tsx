import { useMemo, useState } from "react";
import { Landmark, Percent, PiggyBank, ShieldAlert, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { Modal } from "@/components/shared/Modal";
import type { LoanLiability, LoanType, WealthState } from "@/lib/wealthtrack";

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
  onSave: (loan: LoanLiability) => void;
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
    existing?.tenureMonths !== undefined ? existing.tenureMonths : 120
  );
  const [paidEmisCount, setPaidEmisCount] = useState<number | "">(
    existing?.paidEmisCount !== undefined ? existing.paidEmisCount : 0
  );
  const [autoRecurringEmi, setAutoRecurringEmi] = useState<boolean>(
    existing?.autoRecurringEmi ?? true
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const principalNum = Number(principalAmount) || 0;
  const outstandingNum = Number(currentOutstanding) || 0;

  const payoffStats = useMemo(() => {
    const paid = Math.max(0, principalNum - outstandingNum);
    const pct = principalNum > 0 ? (paid / principalNum) * 100 : 0;
    return { paid, pct };
  }, [principalNum, outstandingNum]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Enter the loan or liability title.";
    if (principalAmount === "" || principalNum <= 0) errs.principalAmount = "Enter a valid sanction principal.";
    if (currentOutstanding === "" || outstandingNum < 0) errs.currentOutstanding = "Enter current outstanding balance.";
    if (!repaymentAccountId) errs.repaymentAccountId = "Select the repayment bank account.";
    if (emiAmount === "" || Number(emiAmount) <= 0) errs.emiAmount = "Enter monthly EMI amount.";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const loan: LoanLiability = {
      id: existing?.id ?? `loan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      loanType,
      lenderInstitution: lenderInstitution.trim() || "Lender",
      principalAmount: principalNum,
      currentOutstanding: outstandingNum,
      interestRate: Number(interestRate) || 0,
      emiAmount: Number(emiAmount) || 0,
      repaymentAccountId,
      startDate,
      tenureMonths: Number(tenureMonths) || 120,
      paidEmisCount: Number(paidEmisCount) || 0,
      autoRecurringEmi,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    onSave(loan);
  };

  return (
    <Modal
      title={existing ? "Edit Loan / Liability" : "Add Loan / Debt"}
      description="Track principal amount, current outstanding, interest rates, and auto-debit bank EMIs."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="wt-label">
              Original Principal Sanction ({currencySymbol}) <span className="text-destructive">*</span>
            </span>
            <input
              className="wt-field font-semibold"
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 3500000"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value === "" ? "" : Number(e.target.value))}
            />
            {errors.principalAmount && (
              <span className="mt-1 block text-xs text-destructive">{errors.principalAmount}</span>
            )}
          </label>

          <label className="block">
            <span className="wt-label">
              Current Outstanding Balance ({currencySymbol}) <span className="text-destructive">*</span>
            </span>
            <input
              className="wt-field font-semibold text-destructive"
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 2840000"
              value={currentOutstanding}
              onChange={(e) => setCurrentOutstanding(e.target.value === "" ? "" : Number(e.target.value))}
            />
            {errors.currentOutstanding && (
              <span className="mt-1 block text-xs text-destructive">{errors.currentOutstanding}</span>
            )}
          </label>
        </div>

        {/* Live Payoff Progress Preview */}
        {principalNum > 0 && (
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <PiggyBank className="size-3.5 text-primary" /> Debt Repaid So Far
              </span>
              <span className="font-extrabold text-foreground">
                {payoffStats.pct.toFixed(1)}% Repaid
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(payoffStats.pct, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Principal: {currencySymbol}{principalNum.toLocaleString()}</span>
              <span>Paid Off: {currencySymbol}{payoffStats.paid.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="wt-label">
              Monthly EMI Outflow ({currencySymbol}) <span className="text-destructive">*</span>
            </span>
            <input
              className="wt-field font-bold"
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 30850"
              value={emiAmount}
              onChange={(e) => setEmiAmount(e.target.value === "" ? "" : Number(e.target.value))}
            />
            {errors.emiAmount && (
              <span className="mt-1 block text-xs text-destructive">{errors.emiAmount}</span>
            )}
          </label>

          <InputField
            label="Interest Rate (% p.a.)"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 8.4"
            value={interestRate}
            onChange={(v) => setInterestRate(v === "" ? "" : Number(v))}
          />
        </div>

        {/* Bank Account Selection for EMI Auto-debit */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
          <SelectField
            label="Repayment Bank Account (Auto-Debit Source)"
            value={repaymentAccountId}
            onChange={setRepaymentAccountId}
            options={data.accounts
              .filter((a) => !a.archived)
              .map((a) => ({
                value: a.id,
                label: `${a.institution ? `${a.institution} · ` : ""}${a.name} (${currencySymbol}${a.openingBalance.toLocaleString()})`,
              }))}
            error={errors.repaymentAccountId}
            required
          />

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
                Automatically registers monthly EMI in the Recurring section so it is tracked and accounted for each month.
              </span>
            </div>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <InputField
            label="Loan Start Date"
            type="date"
            value={startDate}
            onChange={setStartDate}
          />
          <InputField
            label="Tenure (Months)"
            type="number"
            min="1"
            value={tenureMonths}
            onChange={(v) => setTenureMonths(v === "" ? "" : Number(v))}
          />
          <InputField
            label="EMIs Paid"
            type="number"
            min="0"
            value={paidEmisCount}
            onChange={(v) => setPaidEmisCount(v === "" ? "" : Number(v))}
          />
        </div>

        <label className="block">
          <span className="wt-label">Notes / Account Reference (optional)</span>
          <textarea
            className="wt-field min-h-16 resize-y text-xs"
            placeholder="e.g. Loan account no: 9028340192, floating repo linked rate"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="text-xs font-semibold px-5">
            {existing ? "Update Loan" : "Save Loan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

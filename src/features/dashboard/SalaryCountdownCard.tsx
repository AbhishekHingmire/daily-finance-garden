import React, { useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Landmark, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { InstitutionLogo } from "@/components/shared/InstitutionLogo";
import {
  calculateNextSalaryInfo,
  type Account,
  type RecurringItem,
  type WealthState,
} from "@/lib/wealthtrack";

interface SalaryCountdownCardProps {
  data: WealthState;
  money: (amount: number) => string;
  onUpdateSalary?: (amount: number, salaryDay: number, accountId: string) => void;
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export const SalaryCountdownCard: React.FC<SalaryCountdownCardProps> = ({
  data,
  money,
  onUpdateSalary,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Locate current salary recurring item
  const salaryRecurring = data.recurring.find(
    (r) => r.id === "rec-salary" || (r.type === "Income" && r.name.toLowerCase().includes("salary"))
  );

  const salaryDay = data.preferences.salaryDay ?? 19;
  const currentSalaryAmount =
    salaryRecurring?.amount ?? data.profile?.monthlyIncomeTarget ?? 85000;

  // Receiving account
  const salaryAccountId =
    salaryRecurring?.accountId ?? data.preferences.defaultAccount ?? data.accounts[0]?.id;
  const receivingAccount =
    data.accounts.find((a) => a.id === salaryAccountId) || data.accounts[0];

  // Calculate next salary date and days remaining using our verified reference engine
  const { nextDate, daysRemaining, isToday } = calculateNextSalaryInfo(
    salaryDay,
    "2026-10-22"
  );

  // Modal form states
  const [formAmount, setFormAmount] = useState<string>(String(currentSalaryAmount));
  const [formSalaryDay, setFormSalaryDay] = useState<number>(salaryDay);
  const [formAccountId, setFormAccountId] = useState<string>(salaryAccountId || "");

  const handleOpenModal = () => {
    setFormAmount(String(currentSalaryAmount));
    setFormSalaryDay(salaryDay);
    setFormAccountId(salaryAccountId || data.accounts[0]?.id || "");
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.max(1, Number(formAmount) || currentSalaryAmount);
    if (onUpdateSalary) {
      onUpdateSalary(parsedAmount, formSalaryDay, formAccountId);
    }
    setIsModalOpen(false);
  };

  // Preview for modal
  const previewInfo = calculateNextSalaryInfo(formSalaryDay, "2026-10-22");
  const previewAccount = data.accounts.find((a) => a.id === formAccountId) || receivingAccount;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.08] via-card to-card p-4 sm:p-5 wt-shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left section: Icon + Payday details */}
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CalendarDays size={22} />
              </span>
              <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                ₹
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Monthly Payroll & Payday
                </span>
                {isToday ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 animate-pulse">
                    <Sparkles size={11} /> Today is Payday!
                  </span>
                ) : daysRemaining === 1 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <Clock size={11} /> Tomorrow is Payday
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
                    <Clock size={11} /> {daysRemaining} Days Remaining
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-baseline gap-2.5">
                <span className="wt-display text-lg sm:text-xl font-black text-foreground tabular-nums">
                  {money(currentSalaryAmount)}
                </span>
                <span className="text-xs text-muted-foreground">
                  expected on <strong className="text-foreground">{formatDisplayDate(nextDate)}</strong>
                </span>
              </div>

              {/* Receiving account pill */}
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>Credit account:</span>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2 py-0.5 text-foreground font-semibold">
                  <InstitutionLogo name={receivingAccount?.institution || receivingAccount?.name} size="xs" />
                  <span>{receivingAccount?.name}</span>
                  {receivingAccount?.identifier && (
                    <span className="text-muted-foreground font-normal">{receivingAccount.identifier}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right section: Quick Edit CTA */}
          <div className="flex items-center gap-2 sm:self-center shrink-0 border-t border-border/60 pt-3 sm:border-t-0 sm:pt-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenModal}
              className="h-9 gap-1.5 text-xs font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/60 transition-colors shadow-2xs"
            >
              <Pencil size={13} /> Edit Salary
            </Button>
          </div>
        </div>
      </div>

      {/* Salary & Payday Quick-Edit Modal */}
      {isModalOpen && (
        <Modal
          title="Configure Salary & Payday Schedule"
          description="Update your monthly salary amount, deposit date, and destination account without confusion. All schedules stay perfectly synchronized."
          onClose={() => setIsModalOpen(false)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <InputField
              label="Monthly Take-Home Salary"
              type="number"
              min="1"
              step="1000"
              value={formAmount}
              onChange={setFormAmount}
              placeholder="e.g. 85000"
              required
            />

            <SelectField
              label="Salary Credit Day of Month"
              value={String(formSalaryDay)}
              onChange={(val) => setFormSalaryDay(Number(val) || 19)}
              options={Array.from({ length: 31 }, (_, i) => {
                const day = i + 1;
                const suffix =
                  day === 1 || day === 21 || day === 31
                    ? "st"
                    : day === 2 || day === 22
                    ? "nd"
                    : day === 3 || day === 23
                    ? "rd"
                    : "th";
                return {
                  value: String(day),
                  label: `${day}${suffix} of every month`,
                };
              })}
            />

            <SelectField
              label="Destination Bank Account"
              value={formAccountId}
              onChange={setFormAccountId}
              options={data.accounts
                .filter((a) => !a.archived && a.kind !== "Credit card")
                .map((a) => ({
                  value: a.id,
                  label: `${a.name} (${a.institution || a.kind})${a.identifier ? ` · ${a.identifier}` : ""}`,
                }))}
            />

            {/* Live Calculation Preview Banner */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                <CheckCircle2 size={14} /> Synchronized Schedule Preview
              </div>
              <p className="text-foreground">
                Next credit on <strong>{formatDisplayDate(previewInfo.nextDate)}</strong> (
                <strong>{previewInfo.daysRemaining} days remaining</strong>) of{" "}
                <strong>{money(Number(formAmount) || 0)}</strong> to{" "}
                <strong>{previewAccount?.name}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-9 text-xs font-semibold shadow-xs">
                Save Salary Schedule
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

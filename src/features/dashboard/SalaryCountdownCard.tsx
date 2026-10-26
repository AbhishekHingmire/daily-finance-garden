import React, { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Pencil,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/shared/Modal";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { InstitutionLogo } from "@/components/shared/InstitutionLogo";
import {
  calculateNextSalaryInfo,
  formatDisplayDate,
  type WealthState,
} from "@/lib/wealthtrack";

export { formatDisplayDate };

export interface SalaryUpdatePayload {
  name?: string;
  amount: number;
  salaryDay: number;
  accountId: string;
  categoryId?: string;
  need?: "Need" | "Want";
  enabled?: boolean;
  startDate?: string;
}

interface SalaryCountdownCardProps {
  data: WealthState;
  money: (amount: number) => string;
  onUpdateSalary?: (payload: SalaryUpdatePayload) => void;
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

  // Calculate next salary date and days remaining using verified calculation engine
  const { nextDate, daysRemaining, isToday } = calculateNextSalaryInfo(
    salaryDay,
    "2026-10-22"
  );

  // Modal form states
  const [formName, setFormName] = useState<string>(salaryRecurring?.name ?? "Monthly salary");
  const [formAmount, setFormAmount] = useState<string>(String(currentSalaryAmount));
  const [formSalaryDay, setFormSalaryDay] = useState<number>(salaryDay);
  const [formAccountId, setFormAccountId] = useState<string>(salaryAccountId || "");
  const [formCategoryId, setFormCategoryId] = useState<string>(
    salaryRecurring?.categoryId ??
      data.categories.find((c) => c.name.toLowerCase().includes("salary"))?.id ??
      data.categories[0]?.id ??
      ""
  );
  const [formNeed, setFormNeed] = useState<"Need" | "Want">(salaryRecurring?.need ?? "Need");
  const [formEnabled, setFormEnabled] = useState<boolean>(salaryRecurring?.enabled ?? true);
  const [formStartDate, setFormStartDate] = useState<string>(
    salaryRecurring?.startDate ?? new Date().toISOString().slice(0, 10)
  );

  const handleOpenModal = () => {
    setFormName(salaryRecurring?.name ?? "Monthly salary");
    setFormAmount(String(currentSalaryAmount));
    setFormSalaryDay(salaryDay);
    setFormAccountId(salaryAccountId || data.accounts[0]?.id || "");
    setFormCategoryId(
      salaryRecurring?.categoryId ??
        data.categories.find((c) => c.name.toLowerCase().includes("salary"))?.id ??
        data.categories[0]?.id ??
        ""
    );
    setFormNeed(salaryRecurring?.need ?? "Need");
    setFormEnabled(salaryRecurring?.enabled ?? true);
    setFormStartDate(
      salaryRecurring?.startDate ?? new Date().toISOString().slice(0, 10)
    );
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.max(1, Number(formAmount) || currentSalaryAmount);
    if (onUpdateSalary) {
      onUpdateSalary({
        name: formName.trim() || "Monthly salary",
        amount: parsedAmount,
        salaryDay: formSalaryDay,
        accountId: formAccountId,
        categoryId: formCategoryId,
        need: formNeed,
        enabled: formEnabled,
        startDate: formStartDate,
      });
    }
    setIsModalOpen(false);
  };

  // Preview for modal
  const previewInfo = calculateNextSalaryInfo(formSalaryDay, "2026-10-22");
  const previewAccount = data.accounts.find((a) => a.id === formAccountId) || receivingAccount;

  return (
    <>
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 wt-shadow hover:border-border transition-all">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left section: Icon + Payday details */}
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CalendarDays className="size-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Payroll & Payday
                </span>
                {isToday ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    <Sparkles size={10} /> Today
                  </span>
                ) : daysRemaining === 1 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    <Clock size={10} /> Tomorrow
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border/60 px-2 py-0.2 text-[10px] font-semibold text-muted-foreground">
                    <Clock size={10} /> In {daysRemaining} days
                  </span>
                )}
              </div>

              <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                <span className="wt-display text-base sm:text-lg font-bold text-foreground tabular-nums whitespace-nowrap">
                  {money(currentSalaryAmount)}
                </span>
                <span className="text-xs text-muted-foreground">
                  on <strong className="text-foreground font-semibold">{formatDisplayDate(nextDate)}</strong>
                </span>
                {receivingAccount && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    · <span className="text-foreground/90 font-medium">{receivingAccount.name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right section: Quick Edit CTA */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t border-border/50 pt-2.5 sm:border-t-0 sm:pt-0">
            {receivingAccount && (
              <span className="text-xs text-muted-foreground sm:hidden truncate max-w-[180px]">
                Account: <strong className="text-foreground font-medium">{receivingAccount.name}</strong>
              </span>
            )}
            <Button
              size="icon"
              variant="outline"
              onClick={handleOpenModal}
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shadow-2xs"
              title="Edit Payroll & Payday"
              aria-label="Edit Payroll & Payday"
            >
              <Pencil size={13} />
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
              label="Schedule Name / Description"
              value={formName}
              onChange={setFormName}
              placeholder="e.g. Monthly salary"
              required
            />

            <div className="grid gap-3 sm:grid-cols-2">
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
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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

              <SelectField
                label="Income Category"
                value={formCategoryId}
                onChange={setFormCategoryId}
                options={data.categories
                  .filter((c) => !c.archived && c.kind === "Income")
                  .map((c) => ({
                    value: c.id,
                    label: `${c.icon} ${c.name}`,
                  }))}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Need or want?"
                value={formNeed}
                onChange={(v) => setFormNeed(v as "Need" | "Want")}
                options={[
                  { value: "Need", label: "Need (Essential Inflow)" },
                  { value: "Want", label: "Want (Discretionary)" },
                ]}
              />

              <InputField
                label="Schedule Start Date"
                type="date"
                value={formStartDate}
                onChange={setFormStartDate}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                checked={formEnabled}
                onCheckedChange={(checked) => setFormEnabled(Boolean(checked))}
                id="salary-enabled-toggle"
              />
              <label htmlFor="salary-enabled-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
                Keep salary recurring schedule active (auto-records on payday)
              </label>
            </div>

            {/* Live Calculation Preview Banner */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                <CheckCircle2 size={14} /> Synchronized Schedule Preview
              </div>
              <p className="text-foreground">
                Next credit on <strong>{formatDisplayDate(previewInfo.nextDate)}</strong> (
                <strong>{previewInfo.daysRemaining} days remaining</strong>) of{" "}
                <strong>{money(Number(formAmount) || 0)}</strong> to{" "}
                <strong>{previewAccount?.name}</strong>. Automatically synchronized across Dashboard and Recurring schedules.
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

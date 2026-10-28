import { useState, useEffect } from "react";
import { ShieldCheck, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { InputField, SelectField } from "@/components/shared/FormFields";
import {
  type Account,
  type CustomFund,
  type FundType,
} from "@/lib/wealthtrack";

export function FundModal({
  open,
  onClose,
  onSave,
  fund,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (fund: CustomFund) => void;
  fund?: CustomFund | null;
  accounts: Account[];
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FundType>("Custom");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [icon, setIcon] = useState("🛡️");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setErrors({});
    if (fund) {
      setName(fund.name);
      setType(fund.type);
      setTargetAmount(String(fund.targetAmount || ""));
      setCurrentAmount(String(fund.currentAmount || ""));
      setMonthlyContribution(String(fund.monthlyContribution || ""));
      setTargetDate(fund.targetDate || "");
      setLinkedAccountId(fund.linkedAccountId || accounts[0]?.id || "");
      setIcon(fund.icon || "🛡️");
      setNotes(fund.notes || "");
    } else {
      setName("");
      setType("Custom");
      setTargetAmount("");
      setCurrentAmount("");
      setMonthlyContribution("");
      setTargetDate("");
      setLinkedAccountId(accounts[0]?.id || "");
      setIcon("🎯");
      setNotes("");
    }
  }, [fund, accounts, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Fund name is required.";
    }

    const targetNum = Number(targetAmount);
    if (!targetAmount || isNaN(targetNum) || targetNum <= 0) {
      newErrors.targetAmount = "Target amount must be greater than 0.";
    }

    const currentNum = Number(currentAmount);
    if (currentAmount !== "" && (isNaN(currentNum) || currentNum < 0)) {
      newErrors.currentAmount = "Current saved amount cannot be negative.";
    }

    if (monthlyContribution !== "") {
      const monthlyNum = Number(monthlyContribution);
      if (isNaN(monthlyNum) || monthlyNum < 0) {
        newErrors.monthlyContribution = "Monthly contribution cannot be negative.";
      }
    }

    if (!linkedAccountId && accounts.length > 0) {
      newErrors.linkedAccountId = "Please select a linked account.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const payload: CustomFund = {
      id: fund?.id || `fund-${Date.now()}`,
      name: name.trim(),
      type,
      targetAmount: Number(targetAmount) || 0,
      currentAmount: Number(currentAmount) || 0,
      monthlyContribution: Number(monthlyContribution) || 0,
      targetDate: targetDate || undefined,
      linkedAccountId: linkedAccountId || undefined,
      icon,
      color: type === "Emergency" ? "emerald" : type === "PurchaseGoal" ? "blue" : "violet",
      status: "Active",
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    onSave(payload);
    onClose();
  };

  const ICONS = ["🛡️", "🎯", "🏠", "🚗", "✈️", "💍", "💻", "🎓", "🏥", "💰"];

  if (!open) return null;

  return (
    <Modal
      title={fund ? "Edit Fund / Reserve" : "Create New Fund or Reserve"}
      description="Allocate liquid reserves towards an emergency safety net or specific savings goal."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name and Icon */}
        <div className="grid grid-cols-[auto_1fr] gap-3 items-end">
          <div>
            <label className="wt-label">Icon</label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="wt-field w-16 text-center text-lg py-1"
            >
              {ICONS.map((ic) => (
                <option key={ic} value={ic}>
                  {ic}
                </option>
              ))}
            </select>
          </div>
          <InputField
            label="Fund Name"
            placeholder="e.g. 6-Month Emergency Buffer, House Downpayment"
            value={name}
            onChange={(val) => {
              setName(val);
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            error={errors.name}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField
            label="Fund Type"
            value={type}
            onChange={(v) => setType(v as FundType)}
            options={[
              { value: "Emergency", label: "Emergency Safety Buffer" },
              { value: "PurchaseGoal", label: "Major Purchase Goal" },
              { value: "Custom", label: "Custom Sinking Fund" },
            ]}
          />
          <SelectField
            label="Linked Bank / Wallet *"
            value={linkedAccountId}
            onChange={(v) => {
              setLinkedAccountId(v);
              if (errors.linkedAccountId) setErrors((prev) => ({ ...prev, linkedAccountId: "" }));
            }}
            error={errors.linkedAccountId}
            options={accounts
              .filter((a) => !a.archived && a.kind !== "Credit card")
              .map((a) => ({
                value: a.id,
                label: `${a.name} (${a.institution}) · ₹${(a.openingBalance || 0).toLocaleString("en-IN")}`,
              }))}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Target Amount (₹)"
            type="number"
            placeholder="150000"
            value={targetAmount}
            onChange={(val) => {
              setTargetAmount(val);
              if (errors.targetAmount) setErrors((prev) => ({ ...prev, targetAmount: "" }));
            }}
            error={errors.targetAmount}
            required
          />
          <InputField
            label="Current Saved Amount (₹)"
            type="number"
            placeholder="50000"
            value={currentAmount}
            onChange={(val) => {
              setCurrentAmount(val);
              if (errors.currentAmount) setErrors((prev) => ({ ...prev, currentAmount: "" }));
            }}
            error={errors.currentAmount}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Monthly Contribution (₹)"
            type="number"
            placeholder="10000"
            value={monthlyContribution}
            onChange={(val) => {
              setMonthlyContribution(val);
              if (errors.monthlyContribution) setErrors((prev) => ({ ...prev, monthlyContribution: "" }));
            }}
            error={errors.monthlyContribution}
          />
          <InputField
            label="Target Completion Date"
            type="date"
            value={targetDate}
            onChange={setTargetDate}
          />
        </div>

        <InputField
          label="Notes & Purpose (Optional)"
          placeholder="e.g. Kept liquid for unforeseen medical or job transitions."
          value={notes}
          onChange={setNotes}
        />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button type="submit" size="sm" className="text-xs font-semibold">
            {fund ? "Update Fund" : "Create Fund"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

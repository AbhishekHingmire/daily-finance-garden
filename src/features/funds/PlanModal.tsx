import { useState, useEffect } from "react";
import { Sparkles, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { InputField, SelectField } from "@/components/shared/FormFields";
import {
  type PurchasePlan,
  type PlanCategory,
} from "@/lib/wealthtrack";

export function PlanModal({
  open,
  onClose,
  onSave,
  plan,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (plan: PurchasePlan) => void;
  plan?: PurchasePlan | null;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PlanCategory>("Vehicle");
  const [targetCost, setTargetCost] = useState("");
  const [downPaymentPercent, setDownPaymentPercent] = useState("20");
  const [targetDate, setTargetDate] = useState("2027-12");
  const [estimatedLoanRate, setEstimatedLoanRate] = useState("8.5");
  const [loanTenureYears, setLoanTenureYears] = useState("5");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setErrors({});
    if (plan) {
      setTitle(plan.title);
      setCategory(plan.category);
      setTargetCost(String(plan.targetCost || ""));
      setDownPaymentPercent(String(plan.downPaymentPercent || "20"));
      setTargetDate(plan.targetDate || "2027-12");
      setEstimatedLoanRate(String(plan.estimatedLoanRate || "8.5"));
      setLoanTenureYears(String(plan.loanTenureYears || "5"));
      setNotes(plan.notes || "");
    } else {
      setTitle("");
      setCategory("Vehicle");
      setTargetCost("");
      setDownPaymentPercent("20");
      setTargetDate("2027-12");
      setEstimatedLoanRate("8.5");
      setLoanTenureYears("5");
      setNotes("");
    }
  }, [plan, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Purchase title is required.";
    }

    const costNum = Number(targetCost);
    if (!targetCost || isNaN(costNum) || costNum <= 0) {
      newErrors.targetCost = "Estimated cost must be greater than 0.";
    }

    const dpNum = Number(downPaymentPercent);
    if (downPaymentPercent !== "" && (isNaN(dpNum) || dpNum < 0 || dpNum > 100)) {
      newErrors.downPaymentPercent = "Down payment portion must be between 0% and 100%.";
    }

    if (!targetDate) {
      newErrors.targetDate = "Target month is required.";
    }

    if (estimatedLoanRate !== "") {
      const rateNum = Number(estimatedLoanRate);
      if (isNaN(rateNum) || rateNum < 0 || rateNum > 50) {
        newErrors.estimatedLoanRate = "Interest rate must be between 0% and 50%.";
      }
    }

    if (loanTenureYears !== "") {
      const tenureNum = Number(loanTenureYears);
      if (isNaN(tenureNum) || tenureNum <= 0 || tenureNum > 50) {
        newErrors.loanTenureYears = "Tenure must be between 1 and 50 years.";
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const payload: PurchasePlan = {
      id: plan?.id || `plan-${Date.now()}`,
      title: title.trim(),
      category,
      targetCost: Number(targetCost) || 0,
      downPaymentPercent: Number(downPaymentPercent) || 20,
      targetDate: targetDate || "2027-12",
      estimatedLoanRate: Number(estimatedLoanRate) || 8.5,
      loanTenureYears: Number(loanTenureYears) || 5,
      notes: notes.trim(),
      status: "Active",
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    onSave(payload);
    onClose();
  };

  if (!open) return null;

  return (
    <Modal
      title={plan ? "Edit Purchase Plan" : "Plan a Major Purchase / Goal"}
      description="Simulate funding, required monthly savings, and loan feasibility with AI financial guidance."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Purchase / Goal Title"
          placeholder="e.g. 3BHK Apartment, Electric SUV, Higher Education"
          value={title}
          onChange={(val) => {
            setTitle(val);
            if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
          }}
          error={errors.title}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField
            label="Category"
            value={category}
            onChange={(v) => setCategory(v as PlanCategory)}
            options={[
              { value: "Real Estate", label: "Real Estate / Home" },
              { value: "Vehicle", label: "Car / Vehicle" },
              { value: "Asset", label: "Capital Asset" },
              { value: "Life Event", label: "Life Event / Wedding / Tour" },
              { value: "Gadget", label: "Tech / Equipment" },
              { value: "Custom", label: "Custom Goal" },
            ]}
          />
          <InputField
            label="Total Estimated Cost (₹)"
            type="number"
            placeholder="2500000"
            value={targetCost}
            onChange={(val) => {
              setTargetCost(val);
              if (errors.targetCost) setErrors((prev) => ({ ...prev, targetCost: "" }));
            }}
            error={errors.targetCost}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Down Payment Portion (%)"
            type="number"
            placeholder="20"
            value={downPaymentPercent}
            onChange={(val) => {
              setDownPaymentPercent(val);
              if (errors.downPaymentPercent) setErrors((prev) => ({ ...prev, downPaymentPercent: "" }));
            }}
            error={errors.downPaymentPercent}
            required
          />
          <InputField
            label="Target Month (YYYY-MM)"
            type="month"
            value={targetDate}
            onChange={(val) => {
              setTargetDate(val);
              if (errors.targetDate) setErrors((prev) => ({ ...prev, targetDate: "" }));
            }}
            error={errors.targetDate}
            required
          />
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Compass size={14} className="text-primary" />
            <span>Financing & Loan Assumptions (If applicable)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField
              label="Expected Loan Interest Rate (% p.a.)"
              type="number"
              step="0.05"
              placeholder="8.5"
              value={estimatedLoanRate}
              onChange={(val) => {
                setEstimatedLoanRate(val);
                if (errors.estimatedLoanRate) setErrors((prev) => ({ ...prev, estimatedLoanRate: "" }));
              }}
              error={errors.estimatedLoanRate}
            />
            <InputField
              label="Loan Tenure (Years)"
              type="number"
              placeholder="5"
              value={loanTenureYears}
              onChange={(val) => {
                setLoanTenureYears(val);
                if (errors.loanTenureYears) setErrors((prev) => ({ ...prev, loanTenureYears: "" }));
              }}
              error={errors.loanTenureYears}
            />
          </div>
        </div>

        <InputField
          label="Notes & Strategy"
          placeholder="e.g. Plan to trade in old vehicle and use mutual fund gains."
          value={notes}
          onChange={setNotes}
        />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button type="submit" size="sm" className="text-xs font-semibold">
            {plan ? "Update Plan" : "Generate Simulation Plan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

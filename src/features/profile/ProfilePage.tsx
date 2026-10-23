import { useState } from "react";
import {
  PiggyBank,
  Save,
  Target,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/shared/PageHeading";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { toast } from "sonner";
import {
  safeAmount,
  type UserProfile,
  type WealthState,
} from "@/lib/wealthtrack";

export function ProfilePage({
  data,
  money,
  onSaveProfile,
}: {
  data: WealthState;
  money: (val: number) => string;
  onSaveProfile: (profile: UserProfile) => void;
}) {
  const currentProfile = data.profile ?? {
    fullName: "Abhishek Hingmire",
    email: "demo@wealthtrack.app",
    phone: "+91 98765 43210",
    occupation: "Senior Product Designer & Engineer",
    monthlyIncomeTarget: 100000,
    emergencyFundTarget: 150000,
    savingsRateTarget: 35,
    riskProfile: "Balanced",
    bio: "Focused on mindful spending, disciplined compounding, and financial freedom.",
  };

  const [form, setForm] = useState<UserProfile>(currentProfile);

  // Compute liquid balance for emergency fund comparison
  const liquidBalance = data.accounts
    .filter((a) => !a.archived && a.kind !== "Credit card")
    .reduce((sum, a) => sum + safeAmount(a.openingBalance), 0);

  const emergencyFundPercent =
    form.emergencyFundTarget > 0 ? (liquidBalance / form.emergencyFundTarget) * 100 : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(form);
    toast.success("Profile updated successfully", {
      description: "Your financial targets and profile preferences have been saved locally.",
    });
  };

  const getInitials = (name: string) => {
    return (
      name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "WT"
    );
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="My Profile"
        description="Manage your identity, monthly income targets, emergency fund security, and investor risk profile."
      />

      {/* Profile Header Identity Card */}
      <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-xs">
              {getInitials(form.fullName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{form.fullName}</h2>
                <span className="rounded px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Verified Local
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{form.occupation}</p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">{form.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground">
              Risk: <strong className="font-semibold text-primary">{form.riskProfile}</strong>
            </span>
            <span className="rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground">
              Savings Target: <strong className="font-semibold text-primary">{form.savingsRateTarget}%</strong>
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <User className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
            </div>

            <InputField
              label="Full Name"
              value={form.fullName}
              onChange={(fullName) => setForm({ ...form, fullName })}
              placeholder="e.g. Abhishek Hingmire"
              required
            />

            <InputField
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(email) => setForm({ ...form, email })}
              placeholder="e.g. user@wealthtrack.app"
              required
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                label="Phone Number"
                value={form.phone}
                onChange={(phone) => setForm({ ...form, phone })}
                placeholder="+91 98765 43210"
              />
              <InputField
                label="Occupation / Role"
                value={form.occupation}
                onChange={(occupation) => setForm({ ...form, occupation })}
                placeholder="Product Designer"
              />
            </div>

            <label className="block">
              <span className="wt-label">Financial Philosophy / Bio</span>
              <textarea
                className="wt-field min-h-20 resize-y text-xs leading-relaxed"
                placeholder="Share your personal philosophy on savings, investments, or goals…"
                value={form.bio ?? ""}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </label>
          </div>

          {/* Financial Targets & Risk Profile */}
          <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <Target className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Financial Targets & Risk</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                label="Monthly Income Target (₹)"
                type="number"
                min="0"
                value={form.monthlyIncomeTarget}
                onChange={(v) => setForm({ ...form, monthlyIncomeTarget: Number(v) || 0 })}
                placeholder="100000"
              />
              <InputField
                label="Target Savings Rate (%)"
                type="number"
                min="0"
                max="100"
                value={form.savingsRateTarget}
                onChange={(v) => setForm({ ...form, savingsRateTarget: Number(v) || 0 })}
                placeholder="30"
              />
            </div>

            <InputField
              label="Emergency Fund Goal (₹)"
              type="number"
              min="0"
              value={form.emergencyFundTarget}
              onChange={(v) => setForm({ ...form, emergencyFundTarget: Number(v) || 0 })}
              placeholder="150000"
            />

            {/* Emergency Fund Progress Visual */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <PiggyBank className="size-3.5 text-primary" /> Emergency Fund Readiness
                </span>
                <span className="font-bold text-foreground">
                  {emergencyFundPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(emergencyFundPercent, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Current Liquid: {money(liquidBalance)}</span>
                <span>Goal: {money(form.emergencyFundTarget)}</span>
              </p>
            </div>

            <SelectField
              label="Investor Risk Profile"
              value={form.riskProfile}
              onChange={(riskProfile) =>
                setForm({ ...form, riskProfile: riskProfile as UserProfile["riskProfile"] })
              }
              options={[
                { value: "Conservative", label: "Conservative (FD, Debt, Capital Preservation)" },
                { value: "Balanced", label: "Balanced (Index, Flexi-cap, Multi-asset)" },
                { value: "Aggressive", label: "Aggressive (Direct Equity, Small Cap, High Growth)" },
              ]}
            />
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 text-center hover:border-border transition-all">
            <span className="block text-2xl font-bold text-foreground">{data.accounts.length}</span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Linked Accounts
            </span>
          </div>
          <div className="rounded-xl border border-border/70 bg-card p-4 text-center hover:border-border transition-all">
            <span className="block text-2xl font-bold text-foreground">{data.transactions.length}</span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Transactions Logged
            </span>
          </div>
          <div className="rounded-xl border border-border/70 bg-card p-4 text-center hover:border-border transition-all">
            <span className="block text-2xl font-bold text-foreground">
              {(data.investments ?? []).length}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Tracked Holdings
            </span>
          </div>
          <div className="rounded-xl border border-border/70 bg-card p-4 text-center hover:border-border transition-all">
            <span className="block text-2xl font-bold text-foreground">{data.categories.length}</span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Spending Categories
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" className="h-9 gap-2 px-5 text-xs font-semibold shadow-xs">
            <Save size={15} /> Save Profile Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

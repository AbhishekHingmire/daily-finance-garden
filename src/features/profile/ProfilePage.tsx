import { useState, useMemo } from "react";
import {
  Save,
  Target,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/shared/PageHeading";
import { InputField, SelectField } from "@/components/shared/FormFields";
import {
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
  onSaveProfile: (profile: UserProfile) => void | Promise<void>;
}) {
  const currentProfile: UserProfile = {
    fullName: data.profile?.fullName || "",
    email: data.profile?.email || "",
    phone: data.profile?.phone || "",
    occupation: data.profile?.occupation || "Professional",
    riskProfile: data.profile?.riskProfile || "Balanced",
    bio: data.profile?.bio || "",
  };

  const [form, setForm] = useState<UserProfile>(currentProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDirty = useMemo(() => {
    return (
      form.fullName !== currentProfile.fullName ||
      form.email !== currentProfile.email ||
      form.phone !== currentProfile.phone ||
      form.occupation !== currentProfile.occupation ||
      (form.bio ?? "") !== (currentProfile.bio ?? "") ||
      form.riskProfile !== currentProfile.riskProfile
    );
  }, [form, currentProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSaveProfile(form);
    } finally {
      setIsSubmitting(false);
    }
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
        title="Profile"
        description="Manage your identity, personal details, and investment risk profile."
        isBalancePage={!isDirty}
        primaryAction={
          isDirty ? (
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:flex">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                Unsaved changes
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold cursor-pointer"
                onClick={() => setForm(currentProfile)}
              >
                Discard
              </Button>
              <Button
                type="submit"
                form="profile-form"
                size="sm"
                loading={isSubmitting}
                className="h-8 gap-1.5 px-4 text-xs font-semibold shadow-xs cursor-pointer"
              >
                {!isSubmitting && <Save size={14} />} {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          ) : undefined
        }
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
          </div>
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSave} className="space-y-6">
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
              <span className="wt-label">Personal Note / Bio</span>
              <textarea
                className="wt-field min-h-20 resize-y text-xs leading-relaxed"
                placeholder="Share your personal philosophy on budgeting or financial goals…"
                value={form.bio ?? ""}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </label>
          </div>

          {/* Investor Risk Profile */}
          <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 hover:border-border hover:shadow-xs transition-all space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <Target className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Risk Profile</h3>
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
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your risk profile helps guide your investment decisions and asset allocation preferences.
            </p>
          </div>
        </div>

        {/* Expense Tracker Stats */}
        <div className="grid gap-3 sm:grid-cols-3">
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
      </form>
    </div>
  );
}

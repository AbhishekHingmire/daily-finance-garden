import { useState, useMemo } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Compass,
  Edit,
  Landmark,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/shared/PageHeading";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { EmptyInline } from "@/components/shared/EmptyInline";
import { FundModal } from "./FundModal";
import { PlanModal } from "./PlanModal";
import {
  getAccountBalance,
  getEmergencyFundSummary,
  getPlanSimulation,
  safeAmount,
  type Account,
  type CustomFund,
  type PurchasePlan,
  type WealthState,
} from "@/lib/wealthtrack";

export function FundsPage({
  data,
  money,
  onSaveFund,
  onDeleteFund,
  onSavePlan,
  onDeletePlan,
  onQuickDepositFund,
}: {
  data: WealthState;
  money: (amount: number) => string;
  onSaveFund: (fund: CustomFund) => void;
  onDeleteFund: (fundId: string) => void;
  onSavePlan: (plan: PurchasePlan) => void;
  onDeletePlan: (planId: string) => void;
  onQuickDepositFund: (fundId: string, amount: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<"funds" | "simulator">("funds");
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<CustomFund | null>(null);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PurchasePlan | null>(null);

  // Quick Deposit Dialog state
  const [depositFund, setDepositFund] = useState<CustomFund | null>(null);
  const [depositAmount, setDepositAmount] = useState("");

  const funds = data.funds ?? [];
  const plans = data.plans ?? [];

  // Calculate real liquid balances
  const liquidBalance = useMemo(() => {
    return data.accounts
      .filter((a) => !a.archived && a.kind !== "Credit card")
      .reduce((sum, a) => sum + Math.max(0, getAccountBalance(a, data.transactions)), 0);
  }, [data.accounts, data.transactions]);

  // Calculate average monthly expenses from transactions
  const monthlyExpenses = useMemo(() => {
    const expenseTotal = data.transactions
      .filter((t) => t.type === "Expense" || t.type === "EMI / Loan Payment")
      .reduce((sum, t) => sum + t.amount, 0);
    // Standardize to ~35,000 if minimal data
    return Math.max(30000, Math.round(expenseTotal || 35000));
  }, [data.transactions]);

  // Monthly surplus estimate
  const monthlySurplus = useMemo(() => {
    const incomeTotal = data.transactions
      .filter((t) => t.type === "Income")
      .reduce((sum, t) => sum + t.amount, 0);
    return Math.max(20000, incomeTotal - monthlyExpenses);
  }, [data.transactions, monthlyExpenses]);

  // Emergency Fund Summary
  const emergencySummary = useMemo(() => {
    return getEmergencyFundSummary(data.profile, liquidBalance, monthlyExpenses, funds);
  }, [data.profile, liquidBalance, monthlyExpenses, funds]);

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (depositFund && Number(depositAmount)) {
      onQuickDepositFund(depositFund.id, Number(depositAmount));
      setDepositFund(null);
      setDepositAmount("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Funds & Planning"
        description="Manage your emergency safety runway, custom sinking funds, and AI-powered purchase simulations."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingFund(null);
                setFundModalOpen(true);
              }}
              className="h-9 gap-1.5 text-xs font-semibold shadow-2xs"
            >
              <Plus size={15} /> Add Custom Fund
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingPlan(null);
                setPlanModalOpen(true);
              }}
              className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
            >
              <Sparkles size={15} /> Plan Major Purchase
            </Button>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/80 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("funds")}
          className={`pb-3 px-3 text-xs font-bold transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === "funds"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck size={16} /> Emergency & Sinking Funds ({funds.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("simulator")}
          className={`pb-3 px-3 text-xs font-bold transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === "simulator"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass size={16} /> Purchase & Life Goal Simulator ({plans.length})
        </button>
      </div>

      {activeTab === "funds" && (
        <div className="space-y-6">
          {/* Emergency Fund Resilience Cockpit Card */}
          <div className="rounded-2xl border border-border/80 bg-linear-to-br from-card via-card to-emerald-500/5 p-6 wt-shadow">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={16} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Emergency Safety Net Resilience
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      emergencySummary.runwayMonths >= 6
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {emergencySummary.status}
                  </span>
                </div>

                <div className="pt-1">
                  <h2 className="wt-display text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
                    {money(emergencySummary.current)}
                    <span className="text-sm font-semibold text-muted-foreground ml-2">
                      / {money(emergencySummary.target)} Target
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on your average burn rate of {money(monthlyExpenses)}/mo, your liquid reserves provide{" "}
                    <strong className="text-foreground">{emergencySummary.runwayMonths} months</strong> of continuous runway without any active income.
                  </p>
                </div>
              </div>

              {/* Visual Runway Meter */}
              <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-muted-foreground block">
                      Target Buffer
                    </span>
                    <span className="wt-display text-xl font-extrabold text-foreground tabular-nums">
                      {emergencySummary.percent}% Funded
                    </span>
                  </div>
                  <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-lg font-black">
                    {emergencySummary.runwayMonths}M
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const em = funds.find((f) => f.type === "Emergency");
                    if (em) {
                      setDepositFund(em);
                    } else {
                      setEditingFund(null);
                      setFundModalOpen(true);
                    }
                  }}
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <Plus size={13} /> Allocate Cash to Buffer
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                style={{ width: `${emergencySummary.percent}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-xs"
              />
            </div>
          </div>

          {/* Sinking Funds & Custom Savings Buckets Header */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h3 className="wt-display text-base font-bold text-foreground">
                Active Sinking Funds & Savings Buckets
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Purpose-built savings envelopes for upcoming obligations, travel, and capital milestones.
              </p>
            </div>
          </div>

          {/* Custom Funds Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {funds.map((fund) => {
              const pct = fund.targetAmount > 0 ? Math.min(100, Math.round((fund.currentAmount / fund.targetAmount) * 100)) : 0;
              const remaining = Math.max(0, fund.targetAmount - fund.currentAmount);

              return (
                <div
                  key={fund.id}
                  className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 wt-shadow hover:border-primary/40 transition-all"
                >
                  <div>
                    {/* Card Header with Icon & Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-muted/60 text-xl shadow-2xs">
                          {fund.icon || "🎯"}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-foreground">{fund.name}</p>
                          <span className="inline-block mt-0.5 rounded-full bg-muted px-2 py-0.2 text-[10px] font-bold text-muted-foreground">
                            {fund.type === "Emergency" ? "Emergency Buffer" : fund.type === "PurchaseGoal" ? "Goal Fund" : "Sinking Fund"}
                          </span>
                        </div>
                      </div>

                      <ActionMenu
                        items={[
                          {
                            label: "Deposit / Add Money",
                            onClick: () => setDepositFund(fund),
                          },
                          {
                            label: "Edit Fund Details",
                            onClick: () => {
                              setEditingFund(fund);
                              setFundModalOpen(true);
                            },
                          },
                          {
                            label: "Delete Fund",
                            destructive: true,
                            onClick: () => onDeleteFund(fund.id),
                          },
                        ]}
                      />
                    </div>

                    {/* Amount & Progress */}
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="wt-display text-lg font-extrabold text-foreground tabular-nums">
                          {money(fund.currentAmount)}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                          Target: {money(fund.targetAmount)} ({pct}%)
                        </span>
                      </div>

                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full transition-all duration-300 ${
                            pct >= 100 ? "bg-emerald-500" : "bg-primary"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Metadata & Plan */}
                    <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5 text-xs text-muted-foreground">
                      {fund.monthlyContribution ? (
                        <div className="flex items-center justify-between">
                          <span>Monthly Contribution:</span>
                          <span className="font-bold text-foreground tabular-nums">
                            {money(fund.monthlyContribution)}/mo
                          </span>
                        </div>
                      ) : null}

                      {fund.targetDate ? (
                        <div className="flex items-center justify-between">
                          <span>Target Date:</span>
                          <span className="font-bold text-foreground">
                            {new Date(fund.targetDate).toLocaleDateString("en-IN", {
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      ) : null}

                      {remaining > 0 ? (
                        <div className="flex items-center justify-between">
                          <span>Remaining:</span>
                          <span className="font-bold text-primary tabular-nums">
                            {money(remaining)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 size={13} /> Target Fully Funded!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Quick Deposit Button */}
                  <div className="mt-4 pt-3 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDepositFund(fund)}
                      className="w-full text-xs font-semibold h-8 gap-1.5"
                    >
                      <Plus size={13} /> Deposit to Fund
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Purchase & Life Goal Simulator */}
      {activeTab === "simulator" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/80 bg-linear-to-br from-card via-card to-primary/5 p-6 wt-shadow">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-xl bg-primary/10 text-primary">
                <Sparkles size={16} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                WealthTrack AI Purchase Simulator
              </span>
            </div>
            <h2 className="wt-display mt-2 text-xl sm:text-2xl font-extrabold text-foreground">
              Simulate Large Purchases & Life Milestones
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Enter any prospective acquisition—a home down payment, vehicle, luxury asset, or dream wedding. Our financial engine models where funds will be drawn from, calculates monthly savings discipline, and evaluates loan feasibility without jeopardizing your emergency safety net.
            </p>
          </div>

          {/* Active Purchase Plans */}
          <div className="space-y-4">
            {plans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 p-12 text-center space-y-3">
                <Sparkles size={24} className="mx-auto text-primary" />
                <h3 className="text-sm font-bold text-foreground">No Purchase Scenarios Configured</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Create a simulation for a future vehicle, property down payment, or personal asset to test affordability.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPlan(null);
                    setPlanModalOpen(true);
                  }}
                  className="h-9 gap-1.5 text-xs font-semibold"
                >
                  <Plus size={15} /> Create First Scenario
                </Button>
              </div>
            ) : (
              plans.map((plan) => {
                const sim = getPlanSimulation(plan, liquidBalance, monthlySurplus, emergencySummary.target);

                return (
                  <div
                    key={plan.id}
                    className="rounded-2xl border border-border/80 bg-card p-6 wt-shadow space-y-5"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/60">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="wt-display text-lg font-extrabold text-foreground">
                            {plan.title}
                          </h3>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {plan.category}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sim.feasibilityBadge}`}>
                            {sim.feasibility} Feasibility
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Target Timeline: {plan.targetDate} ({sim.monthsDiff} months horizon)
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPlan(plan);
                            setPlanModalOpen(true);
                          }}
                          className="h-8 gap-1 text-xs font-semibold"
                        >
                          <Pencil size={13} /> Edit Plan
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeletePlan(plan.id)}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>

                    {/* Key Metrics Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Total Target Cost
                        </span>
                        <span className="wt-display text-lg font-extrabold text-foreground mt-0.5 block tabular-nums">
                          {money(plan.targetCost)}
                        </span>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Down Payment ({plan.downPaymentPercent}%)
                        </span>
                        <span className="wt-display text-lg font-extrabold text-primary mt-0.5 block tabular-nums">
                          {money(sim.downPayment)}
                        </span>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Required Savings Rate
                        </span>
                        <span className="wt-display text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                          {money(sim.requiredMonthlySavings)}/mo
                        </span>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Est. Monthly Loan EMI
                        </span>
                        <span className="wt-display text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 block tabular-nums">
                          {sim.estimatedMonthlyEmi > 0 ? `${money(sim.estimatedMonthlyEmi)}/mo` : "Zero (100% Cash)"}
                        </span>
                      </div>
                    </div>

                    {/* AI Advisory Guidance */}
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary">
                        <Sparkles size={14} />
                        <span>WealthTrack Intelligent Allocation Strategy</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-muted-foreground pl-5 list-disc">
                        {sim.aiRecommendations.map((rec, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Quick Deposit Modal */}
      {depositFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 wt-shadow space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-xl">{depositFund.icon || "💰"}</span>
                <h3 className="font-bold text-sm">Deposit to {depositFund.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDepositFund(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3">
              <div>
                <label className="wt-label">Deposit Amount (₹)</label>
                <input
                  type="number"
                  placeholder="5000"
                  className="wt-field h-9 text-sm"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDepositFund(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs font-semibold">
                  Confirm Deposit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <FundModal
        open={fundModalOpen}
        onClose={() => setFundModalOpen(false)}
        onSave={onSaveFund}
        fund={editingFund}
        accounts={data.accounts}
      />

      <PlanModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSave={onSavePlan}
        plan={editingPlan}
      />
    </div>
  );
}

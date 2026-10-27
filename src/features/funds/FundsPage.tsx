import { useState, useMemo } from "react";
import { toast } from "sonner";
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
import { Metric } from "@/components/shared/Metric";
import { FundModal } from "./FundModal";
import { PlanModal } from "./PlanModal";
import {
  getAccountBalance,
  getAllAccountBalances,
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
  onSkipFundMonth,
}: {
  data: WealthState;
  money: (amount: number) => string;
  onSaveFund: (fund: CustomFund) => void;
  onDeleteFund: (fundId: string) => void;
  onSavePlan: (plan: PurchasePlan) => void;
  onDeletePlan: (planId: string) => void;
  onQuickDepositFund: (fundId: string, amount: number, sourceAccountId?: string) => void;
  onSkipFundMonth?: (fundId: string, monthStr: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"funds" | "simulator">("funds");
  const [goalStatusFilter, setGoalStatusFilter] = useState<"ongoing" | "completed">("ongoing");
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<CustomFund | null>(null);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PurchasePlan | null>(null);

  // Quick Deposit Dialog state
  const [depositFund, setDepositFund] = useState<CustomFund | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositSourceAccountId, setDepositSourceAccountId] = useState(data.accounts[0]?.id || "");

  const funds = data.funds ?? [];
  const plans = data.plans ?? [];

  // Ongoing vs Completed Funds Separation
  const ongoingFunds = useMemo(() => {
    return funds.filter((f) => !(f.targetAmount > 0 && f.currentAmount >= f.targetAmount));
  }, [funds]);

  const completedFunds = useMemo(() => {
    return funds.filter((f) => f.targetAmount > 0 && f.currentAmount >= f.targetAmount);
  }, [funds]);

  const displayedFunds = goalStatusFilter === "ongoing" ? ongoingFunds : completedFunds;

  const accountBalances = useMemo(
    () => getAllAccountBalances(data.accounts, data.transactions),
    [data.accounts, data.transactions]
  );

  // Calculate real liquid balances
  const liquidBalance = useMemo(() => {
    return data.accounts
      .filter((a) => !a.archived && a.kind !== "Credit card")
      .reduce((sum, a) => sum + Math.max(0, accountBalances.get(a.id) ?? (a.openingBalance || 0)), 0);
  }, [data.accounts, accountBalances]);

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
    if (!depositFund) return;
    const numDeposit = Number(depositAmount);
    if (!numDeposit || isNaN(numDeposit) || numDeposit <= 0) {
      toast.error("Please enter a valid deposit amount.");
      return;
    }
    if (!depositSourceAccountId) {
      toast.error("Please choose a source bank account.");
      return;
    }

    const srcBal = accountBalances.get(depositSourceAccountId) ?? 0;
    if (numDeposit > srcBal) {
      toast.error("Insufficient balance in account", {
        description: `Available: ${money(srcBal)}, Deposit: ${money(numDeposit)}`,
      });
      return;
    }

    if (srcBal - numDeposit < 2000) {
      toast.warning("Low balance alert", {
        description: `Remaining balance will drop to ${money(srcBal - numDeposit)}`,
      });
    }

    onQuickDepositFund(depositFund.id, numDeposit, depositSourceAccountId);
    setDepositFund(null);
    setDepositAmount("");
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Goals"
        description="Manage your emergency safety runway, custom sinking funds, and AI-powered purchase simulations."
        isBalancePage
        primaryAction={
          <Button
            size="sm"
            onClick={() => {
              setEditingFund(null);
              setFundModalOpen(true);
            }}
            className="h-9 gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <Plus size={15} /> Add goal
          </Button>
        }
        moreMenuItems={[
          {
            label: "Plan Major Purchase",
            icon: <Sparkles size={14} />,
            onClick: () => {
              setEditingPlan(null);
              setPlanModalOpen(true);
            },
          },
        ]}
      />

      {/* Navigation Switch Panels */}
      <div className="w-full sm:w-fit grid grid-cols-2 sm:flex sm:items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/80">
        <button
          type="button"
          onClick={() => setActiveTab("funds")}
          className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all min-w-0 ${
            activeTab === "funds"
              ? "bg-card text-foreground shadow-xs border border-border/80 font-extrabold ring-1 ring-border/20"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <ShieldCheck size={16} className={`shrink-0 ${activeTab === "funds" ? "text-primary" : "text-muted-foreground"}`} />
          <span className="truncate whitespace-nowrap">
            <span className="sm:hidden">Sinking Funds</span>
            <span className="hidden sm:inline">Emergency & Sinking Funds</span>
          </span>
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
              activeTab === "funds"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {funds.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("simulator")}
          className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all min-w-0 ${
            activeTab === "simulator"
              ? "bg-card text-foreground shadow-xs border border-border/80 font-extrabold ring-1 ring-border/20"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <Compass size={16} className={`shrink-0 ${activeTab === "simulator" ? "text-primary" : "text-muted-foreground"}`} />
          <span className="truncate whitespace-nowrap">
            <span className="sm:hidden">Goal Simulator</span>
            <span className="hidden sm:inline">Purchase & Life Goal Simulator</span>
          </span>
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
              activeTab === "simulator"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {plans.length}
          </span>
        </button>
      </div>

      {activeTab === "funds" && (
        <div className="space-y-6">
          {/* Emergency Fund Resilience Cockpit Card */}
          <div className="relative rounded-xl sm:rounded-2xl border border-border/80 bg-linear-to-br from-card via-card to-emerald-500/5 p-4 sm:p-6 wt-shadow">
            {/* Top Right Action Menu */}
            <div className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5">
              <ActionMenu
                items={[
                  {
                    label: "Allocate cash to emergency fund",
                    icon: <Plus size={13} />,
                    onClick: () => {
                      const em = funds.find((f) => f.type === "Emergency") || {
                        id: "fund-emergency",
                        name: "Emergency Reserve",
                        targetAmount: emergencySummary.target,
                        currentAmount: emergencySummary.current,
                        type: "Emergency" as const,
                        icon: "🛡️",
                        status: "Active" as const,
                        updatedAt: new Date().toISOString().slice(0, 10),
                      };
                      setDepositFund(em);
                      setDepositAmount(em.monthlyContribution ? String(em.monthlyContribution) : "10000");
                      setDepositSourceAccountId(em.linkedAccountId || data.accounts[0]?.id || "");
                    },
                  },
                  {
                    label: "Edit emergency fund details",
                    icon: <Pencil size={13} />,
                    onClick: () => {
                      const em = funds.find((f) => f.type === "Emergency") || {
                        id: "fund-emergency",
                        name: "Emergency Reserve",
                        targetAmount: emergencySummary.target,
                        currentAmount: emergencySummary.current,
                        type: "Emergency" as const,
                        icon: "🛡️",
                        status: "Active" as const,
                        updatedAt: new Date().toISOString().slice(0, 10),
                      };
                      setEditingFund(em);
                      setFundModalOpen(true);
                    },
                  },
                ]}
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6 pr-8 sm:pr-10">
              <div className="space-y-1.5 sm:space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="grid size-6 sm:size-7 place-items-center rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-3.5 sm:size-4" />
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Emergency Safety Net Resilience
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                      emergencySummary.runwayMonths >= 6
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {emergencySummary.status}
                  </span>
                </div>

                <div className="pt-0.5 sm:pt-1">
                  <h2 className="wt-display text-xl sm:text-3xl font-extrabold text-foreground tabular-nums whitespace-nowrap">
                    {money(emergencySummary.current)}
                    <span className="text-xs sm:text-sm font-semibold text-muted-foreground ml-2">
                      / {money(emergencySummary.target)} Target
                    </span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                    Based on your average burn rate of {money(monthlyExpenses)}/mo, your liquid reserves provide{" "}
                    <strong className="text-foreground">{emergencySummary.runwayMonths} months</strong> of continuous runway without any active income.
                  </p>
                </div>
              </div>

              {/* Visual Runway Meter */}
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t border-border/60 sm:border-t-0">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground block">
                    Target Buffer
                  </span>
                  <span className="wt-display text-base sm:text-xl font-extrabold text-foreground tabular-nums whitespace-nowrap">
                    {emergencySummary.percent}% Funded
                  </span>
                </div>
                <div className="mx-3 sm:mx-4 flex items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 px-3.5 py-1.5 shadow-2xs shrink-0">
                  <span className="text-sm sm:text-base font-black tracking-tight tabular-nums">
                    {emergencySummary.runwayMonths}M
                  </span>
                </div>
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

          {/* Sinking Funds & Custom Savings Buckets Header with Sub-Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <h3 className="wt-display text-base font-bold text-foreground">
                {goalStatusFilter === "ongoing"
                  ? "Ongoing Sinking Funds & Goals"
                  : "Completed Savings Goals & Milestones"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {goalStatusFilter === "ongoing"
                  ? "Active savings envelopes for upcoming obligations, travel, and capital milestones."
                  : "Milestones you've successfully fulfilled. Funds are ready to be used or allocated."}
              </p>
            </div>

            {/* Switch Panel: Ongoing Goals vs Completed Goals */}
            <div className="w-full sm:w-fit grid grid-cols-2 sm:flex sm:items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/80 shrink-0">
              <button
                type="button"
                onClick={() => setGoalStatusFilter("ongoing")}
                className={`flex items-center justify-center sm:justify-start gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-w-0 ${
                  goalStatusFilter === "ongoing"
                    ? "bg-card text-foreground shadow-2xs border border-border/80 font-extrabold ring-1 ring-border/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                <span className="truncate whitespace-nowrap">
                  <span className="sm:hidden">Ongoing</span>
                  <span className="hidden sm:inline">Ongoing Goals</span>
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold shrink-0 ${
                    goalStatusFilter === "ongoing"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {ongoingFunds.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGoalStatusFilter("completed")}
                className={`flex items-center justify-center sm:justify-start gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-w-0 ${
                  goalStatusFilter === "completed"
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 shadow-2xs border border-emerald-500/30 font-extrabold ring-1 ring-emerald-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                <CheckCircle2
                  size={13}
                  className={`shrink-0 ${
                    goalStatusFilter === "completed"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="truncate whitespace-nowrap">
                  <span className="sm:hidden">Completed</span>
                  <span className="hidden sm:inline">Completed Goals</span>
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold shrink-0 ${
                    goalStatusFilter === "completed"
                      ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {completedFunds.length}
                </span>
              </button>
            </div>
          </div>

          {/* Custom Funds Grid or Empty State */}
          {displayedFunds.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
              {displayedFunds.map((fund) => {
                const pct = fund.targetAmount > 0 ? Math.min(100, Math.round((fund.currentAmount / fund.targetAmount) * 100)) : 0;
                const isFulfilled = fund.targetAmount > 0 && fund.currentAmount >= fund.targetAmount;
                const isSkippedThisMonth = (fund.skippedMonths ?? []).includes("2026-10");
                const remaining = Math.max(0, fund.targetAmount - fund.currentAmount);

                return (
                  <div
                    key={fund.id}
                    className={`flex flex-col justify-between rounded-xl border p-4 sm:p-4.5 wt-shadow transition-all hover:shadow-xs h-auto max-h-[580px] ${
                      isFulfilled
                        ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                        : isSkippedThisMonth
                        ? "border-amber-500/30 bg-card/90"
                        : "border-border/60 bg-card hover:border-border"
                    }`}
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
                            ...(!isFulfilled
                              ? [
                                  {
                                    label: "Deposit / Add Money",
                                    onClick: () => {
                                      setDepositFund(fund);
                                      setDepositAmount(fund.monthlyContribution ? String(fund.monthlyContribution) : "");
                                      setDepositSourceAccountId(fund.linkedAccountId || data.accounts[0]?.id || "");
                                    },
                                  },
                                  {
                                    label: isSkippedThisMonth ? "Undo Skip (Oct 2026)" : "Skip Contribution (Oct 2026)",
                                    onClick: () => onSkipFundMonth?.(fund.id, "2026-10"),
                                  },
                                ]
                              : []),
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
                            <Metric id={`goal_current:${fund.id}`} value={fund.currentAmount} />
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                            Target: {money(fund.targetAmount)} ({pct}%)
                          </span>
                        </div>

                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full rounded-full transition-all duration-300 ${
                              isFulfilled ? "bg-emerald-500 shadow-xs" : "bg-primary"
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

                        {isSkippedThisMonth ? (
                          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold text-xs pt-0.5">
                            <span className="size-1.5 rounded-full bg-amber-500" /> Skipped for October 2026
                          </div>
                        ) : null}

                        {isFulfilled ? (
                          <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            <span>🎉 Ready for this! Goal 100% Achieved</span>
                          </div>
                        ) : remaining > 0 ? (
                          <div className="flex items-center justify-between">
                            <span>Remaining:</span>
                            <span className="font-bold text-primary tabular-nums">
                              {money(remaining)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50">
              {goalStatusFilter === "ongoing" ? (
                <>
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xl mb-3">
                    🎯
                  </div>
                  <p className="text-sm font-bold text-foreground">All Goals Completed!</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    You don't have any ongoing goals right now. All your savings buckets are fully fulfilled.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingFund(null);
                      setFundModalOpen(true);
                    }}
                    className="mt-4 gap-1.5 text-xs font-semibold"
                  >
                    <Plus size={14} /> Add New Goal Fund
                  </Button>
                </>
              ) : (
                <>
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground text-xl mb-3">
                    🏆
                  </div>
                  <p className="text-sm font-bold text-foreground">No Completed Goals Yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    When your savings in any sinking fund reach 100% of target, it will automatically move here as a completed milestone.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Purchase & Life Goal Simulator */}
      {activeTab === "simulator" && (
        <div className="space-y-6">
          <div className="rounded-xl sm:rounded-2xl border border-border/80 bg-linear-to-br from-card via-card to-primary/5 p-4 sm:p-6 wt-shadow">
            <div className="flex items-center gap-2">
              <span className="grid size-6 sm:size-7 place-items-center rounded-lg sm:rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-3.5 sm:size-4" />
              </span>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                WealthTrack AI Purchase Simulator
              </span>
            </div>
            <h2 className="wt-display mt-2 text-lg sm:text-2xl font-extrabold text-foreground">
              Simulate Large Purchases & Life Milestones
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
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
                          className="size-8 p-0 grid place-items-center rounded-lg text-xs"
                          title="Edit plan"
                          aria-label="Edit plan"
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeletePlan(plan.id)}
                          className="size-8 p-0 grid place-items-center rounded-lg text-xs text-destructive hover:bg-destructive/10"
                          title="Delete plan"
                          aria-label="Delete plan"
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
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 wt-shadow space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-xl">{depositFund.icon || "💰"}</span>
                <div>
                  <h3 className="font-bold text-sm">Deposit to {depositFund.name}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Target: {money(depositFund.targetAmount)} · Current: {money(depositFund.currentAmount)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDepositFund(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3.5">
              <div>
                <label className="wt-label">From Savings / Bank Account</label>
                <select
                  className="wt-field h-9 text-xs"
                  value={depositSourceAccountId}
                  onChange={(e) => setDepositSourceAccountId(e.target.value)}
                >
                  {data.accounts
                    .filter((a) => !a.archived && a.kind !== "Credit card")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({money(accountBalances.get(a.id) ?? (a.openingBalance || 0))})
                      </option>
                    ))}
                </select>
              </div>

              {/* Amount Quick Presets */}
              <div>
                <label className="wt-label">Quick Add Presets</label>
                <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar py-0.5">
                  {[100, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        const cur = Number(depositAmount) || 0;
                        setDepositAmount(String(cur + amt));
                      }}
                      className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/60 hover:bg-primary/5 active:scale-95 transition-all shrink-0 cursor-pointer shadow-2xs"
                    >
                      +{money(amt)}
                    </button>
                  ))}
                  {depositFund.monthlyContribution ? (
                    <button
                      type="button"
                      onClick={() => setDepositAmount(String(depositFund.monthlyContribution))}
                      className="rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 shrink-0"
                    >
                      Monthly: {money(depositFund.monthlyContribution)}
                    </button>
                  ) : null}
                  {depositFund.targetAmount > depositFund.currentAmount ? (
                    <button
                      type="button"
                      onClick={() => setDepositAmount(String(depositFund.targetAmount - depositFund.currentAmount))}
                      className="rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 shrink-0"
                    >
                      Remaining: {money(depositFund.targetAmount - depositFund.currentAmount)}
                    </button>
                  ) : null}
                  {Number(depositAmount) > 0 && (
                    <button
                      type="button"
                      onClick={() => setDepositAmount("")}
                      className="text-[11px] text-muted-foreground hover:text-rose-500 font-medium ml-auto pl-1 shrink-0 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

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
                  min="1"
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

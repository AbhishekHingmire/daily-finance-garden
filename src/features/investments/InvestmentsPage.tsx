import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Filter,
  Layers,
  LineChart,
  Pencil,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/shared/PageHeading";
import { ActionMenu } from "@/components/shared/ActionMenu";
import {
  getHoldingsSummary,
  safeAmount,
  type AssetType,
  type InvestmentHolding,
  type WealthState,
} from "@/lib/wealthtrack";

const ASSET_COLORS: Record<AssetType, { bg: string; text: string; fill: string }> = {
  "Mutual fund": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", fill: "#3b82f6" },
  "Stocks & Equity": { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", fill: "#10b981" },
  ETF: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", fill: "#8b5cf6" },
  "Gold & Commodities": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", fill: "#f59e0b" },
  "Fixed deposit": { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", fill: "#14b8a6" },
  Crypto: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", fill: "#f43f5e" },
  Other: { bg: "bg-muted", text: "text-muted-foreground", fill: "#64748b" },
};

export function InvestmentsPage({
  data,
  money,
  onAddHolding,
  onEditHolding,
  onDeleteHolding,
}: {
  data: WealthState;
  money: (val: number) => string;
  onAddHolding: () => void;
  onEditHolding: (holding: InvestmentHolding) => void;
  onDeleteHolding: (holding: InvestmentHolding) => void;
}) {
  const holdings = data.investments ?? [];
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<string>("All");

  const summary = useMemo(() => getHoldingsSummary(holdings), [holdings]);

  // Asset allocation breakdown
  const assetBreakdown = useMemo(() => {
    const map = new Map<AssetType, { current: number; invested: number }>();
    for (const h of holdings) {
      const prev = map.get(h.assetType) ?? { current: 0, invested: 0 };
      map.set(h.assetType, {
        current: prev.current + safeAmount(h.currentAmount),
        invested: prev.invested + safeAmount(h.investedAmount),
      });
    }

    return Array.from(map.entries()).map(([assetType, vals]) => {
      const percent = summary.currentValue > 0 ? (vals.current / summary.currentValue) * 100 : 0;
      const pnl = vals.current - vals.invested;
      const pnlPct = vals.invested > 0 ? (pnl / vals.invested) * 100 : 0;
      return { assetType, ...vals, percent, pnl, pnlPct };
    });
  }, [holdings, summary.currentValue]);

  // Filtered holdings list
  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) => {
      const matchesSearch =
        search === "" ||
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        (h.institution && h.institution.toLowerCase().includes(search.toLowerCase())) ||
        (h.notes && h.notes.toLowerCase().includes(search.toLowerCase()));

      const matchesAsset = selectedAsset === "All" || h.assetType === selectedAsset;
      return matchesSearch && matchesAsset;
    });
  }, [holdings, search, selectedAsset]);

  const assetTypes = useMemo(() => {
    const set = new Set<string>();
    holdings.forEach((h) => set.add(h.assetType));
    return ["All", ...Array.from(set)];
  }, [holdings]);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="PORTFOLIO & CAPITAL WEALTH"
        title="Investments"
        description="Track your portfolio holdings, asset allocation, invested amount, and real-time earned returns."
        actions={
          <Button
            onClick={onAddHolding}
            className="h-9 gap-1.5 px-3.5 text-xs font-semibold shadow-xs"
          >
            <Plus size={15} /> Add Investment
          </Button>
        }
      />

      {/* Top Portfolio Hero Card (Groww Aesthetic) */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-card via-card to-primary/5 p-6 wt-shadow">
        <div className="grid gap-6 md:grid-cols-12 md:items-center">
          {/* Main Portfolio Value & P&L */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LineChart className="size-4" />
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Portfolio Valuation
              </p>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {money(summary.currentValue)}
              </h2>

              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
                  summary.totalReturns >= 0
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                {summary.totalReturns >= 0 ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                <span>
                  {summary.totalReturns >= 0 ? "+" : ""}
                  {money(summary.totalReturns)}
                </span>
                <span>
                  ({summary.totalReturns >= 0 ? "+" : ""}
                  {summary.returnPercentage.toFixed(2)}%)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-muted-foreground">
              <div>
                <span className="block text-[11px] font-medium">Invested Capital</span>
                <span className="font-bold text-foreground text-sm">
                  {money(summary.totalInvested)}
                </span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div>
                <span className="block text-[11px] font-medium">Total Earned Gain</span>
                <span
                  className={`font-bold text-sm ${
                    summary.totalReturns >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  {summary.totalReturns >= 0 ? "+" : ""}
                  {money(summary.totalReturns)}
                </span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div>
                <span className="block text-[11px] font-medium">Active Holdings</span>
                <span className="font-bold text-foreground text-sm">{holdings.length} assets</span>
              </div>
            </div>
          </div>

          {/* Asset Allocation Breakdown Stacked Bar */}
          <div className="md:col-span-5 rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-foreground">Asset Allocation</span>
              <span className="text-muted-foreground text-[11px]">
                {assetBreakdown.length} Categories
              </span>
            </div>

            {/* Stacked Proportional Bar */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted flex">
              {assetBreakdown.map((item) => (
                <div
                  key={item.assetType}
                  style={{
                    width: `${Math.max(item.percent, 3)}%`,
                    backgroundColor: ASSET_COLORS[item.assetType]?.fill || "#64748b",
                  }}
                  title={`${item.assetType}: ${item.percent.toFixed(1)}%`}
                />
              ))}
            </div>

            {/* Asset Distribution Legend Chips */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              {assetBreakdown.slice(0, 4).map((item) => (
                <div key={item.assetType} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: ASSET_COLORS[item.assetType]?.fill || "#64748b" }}
                    />
                    <span className="truncate text-muted-foreground">{item.assetType}</span>
                  </div>
                  <span className="font-bold text-foreground shrink-0">{item.percent.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Asset Type Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {assetTypes.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={selectedAsset === t ? "default" : "outline"}
              className="h-8 rounded-full text-xs font-semibold px-3"
              onClick={() => setSelectedAsset(t)}
            >
              {t}
              {t !== "All" && (
                <span className="ml-1.5 rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
                  {holdings.filter((h) => h.assetType === t).length}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            className="wt-field h-9 pl-9 text-xs"
            placeholder="Search holding or broker…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Holdings List / Grid */}
      {filteredHoldings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
          <Wallet className="mx-auto size-10 text-muted-foreground/60 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No investment holdings found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {search || selectedAsset !== "All"
              ? "No holdings match your current search or asset type filters."
              : "Start by adding your mutual funds, equity stocks, index funds, or fixed deposits."}
          </p>
          <Button onClick={onAddHolding} size="sm" className="mt-4 gap-1.5 text-xs font-semibold">
            <Plus size={15} /> Add First Investment
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredHoldings.map((h) => {
            const invested = safeAmount(h.investedAmount);
            const current = safeAmount(h.currentAmount);
            const pnl = current - invested;
            const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
            const allocationPct = summary.currentValue > 0 ? (current / summary.currentValue) * 100 : 0;
            const colors = ASSET_COLORS[h.assetType] || ASSET_COLORS.Other;

            return (
              <div
                key={h.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
              >
                {/* Header: Name, Institution, Asset Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text}`}
                        >
                          {h.assetType}
                        </span>
                        {h.institution && (
                          <span className="text-[11px] font-medium text-muted-foreground truncate">
                            {h.institution}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1.5 font-bold text-sm text-foreground truncate" title={h.name}>
                        {h.name}
                      </h4>
                    </div>

                    <ActionMenu
                      items={[
                        {
                          label: "Update Valuation",
                          icon: <RefreshCw size={14} />,
                          onClick: () => onEditHolding(h),
                        },
                        {
                          label: "Edit Details",
                          icon: <Pencil size={14} />,
                          onClick: () => onEditHolding(h),
                        },
                        {
                          label: "Delete Holding",
                          icon: <Trash2 size={14} />,
                          destructive: true,
                          onClick: () => onDeleteHolding(h),
                        },
                      ]}
                    />
                  </div>

                  {/* Notes / Strategy */}
                  {h.notes && (
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                      {h.notes}
                    </p>
                  )}
                </div>

                {/* Financial Stats Matrix */}
                <div className="mt-4 pt-3 border-t border-border/60">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Invested
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {money(invested)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Current Value
                      </span>
                      <span className="text-sm font-extrabold text-foreground">
                        {money(current)}
                      </span>
                    </div>
                  </div>

                  {/* Earned Returns Bar */}
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/40 p-2 text-xs">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Earned Returns
                    </span>
                    <div
                      className={`flex items-center gap-1 font-bold ${
                        pnl >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      }`}
                    >
                      {pnl >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      <span>
                        {pnl >= 0 ? "+" : ""}
                        {money(pnl)}
                      </span>
                      <span className="text-[10px] opacity-85">
                        ({pnl >= 0 ? "+" : ""}
                        {pnlPct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Footer: Portfolio Share & Quick Update Button */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      Portfolio share: <strong className="text-foreground">{allocationPct.toFixed(1)}%</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditHolding(h)}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      <RefreshCw size={11} /> Update
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

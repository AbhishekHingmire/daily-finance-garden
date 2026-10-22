export function CirclePercentageGauge({
  label,
  percentage,
  target,
  amountFormatted,
  statusText,
  statusVariant = "success",
  strokeColor = "#10b981",
  subLabel,
}: {
  label: string;
  percentage: number;
  target: string;
  amountFormatted: string;
  statusText: string;
  statusVariant?: "success" | "warning" | "danger" | "info";
  strokeColor?: string;
  subLabel?: string;
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  const badgeColorClass =
    statusVariant === "success"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : statusVariant === "warning"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : statusVariant === "danger"
      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
      : "bg-blue-500/15 text-blue-700 dark:text-blue-300";

  return (
    <div className="flex flex-col items-center justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 wt-shadow text-center">
      <div className="flex w-full items-center justify-between gap-1 pb-2 border-b border-border/50">
        <span className="text-xs font-bold text-foreground truncate">{label}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeColorClass}`}
        >
          {statusText}
        </span>
      </div>

      {/* Circular Progress Ring */}
      <div className="relative my-3 flex items-center justify-center">
        <svg className="size-24 -rotate-90 transform" viewBox="0 0 96 96">
          {/* Background Track */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="7"
            className="text-muted/40"
            fill="transparent"
          />
          {/* Animated Foreground Progress */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={strokeColor}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            fill="transparent"
          />
        </svg>

        {/* Center Percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="wt-display text-lg font-extrabold text-foreground tabular-nums">
            {percentage}%
          </span>
          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-tight">
            Of Total
          </span>
        </div>
      </div>

      {/* Amount and Subtitle */}
      <div className="w-full pt-1">
        <span className="wt-display text-base font-extrabold text-foreground tabular-nums block">
          {amountFormatted}
        </span>
        <span className="text-[11px] text-muted-foreground block mt-0.5">
          {target}
        </span>
        {subLabel && (
          <span className="text-[10px] text-muted-foreground/80 block mt-0.5">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
}

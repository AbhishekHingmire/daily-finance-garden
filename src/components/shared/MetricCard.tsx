import React from "react";
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "blue",
  onClick,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "red" | "amber";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "green"
      ? "bg-success-soft text-emerald-600 dark:text-emerald-400"
      : tone === "red"
      ? "wt-danger-bg text-rose-600 dark:text-rose-400"
      : tone === "amber"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : "bg-primary/10 text-primary";

  return (
    <button
      className={`min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5 text-left wt-shadow transition-all hover:border-primary/40 ${
        onClick ? "cursor-pointer hover:shadow-md" : "cursor-default"
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClass}`}>
          <Icon size={17} />
        </span>
      </div>
      <p className="wt-display mt-3 truncate text-xl font-extrabold sm:text-2xl text-foreground tabular-nums">
        {value}
      </p>
      {delta && <p className="mt-1 truncate text-xs text-muted-foreground">{delta}</p>}
    </button>
  );
}

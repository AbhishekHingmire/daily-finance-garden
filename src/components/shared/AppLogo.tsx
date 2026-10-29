import { TrendingUp } from "lucide-react";

export function AppLogo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-[10px] bg-primary text-primary-foreground shadow-xs">
        <TrendingUp size={19} strokeWidth={2.7} />
      </div>
      {!small && <span className="wt-display text-lg font-extrabold tracking-normal text-foreground">WealthTrack</span>}
    </div>
  );
}

import React, { useMemo } from "react";
import { CheckCircle2, XCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
import { runDataHealthChecks } from "@/lib/data-health";
import { migrateLegacyState } from "@/lib/migration";
import { useSharedPeriod } from "@/lib/period-state";
import type { WealthState } from "@/lib/wealthtrack";

export interface DataHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WealthState;
}

export function DataHealthModal({ isOpen, onClose, data }: DataHealthModalProps) {
  const [period] = useSharedPeriod();
  const unified = useMemo(() => migrateLegacyState(data), [data]);

  const results = useMemo(() => {
    return runDataHealthChecks(
      unified.accounts,
      unified.categories,
      unified.entries,
      unified.loans,
      unified.holdings,
      unified.goals,
      unified.schedules,
      period
    );
  }, [unified, period]);

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const allPassed = passedCount === totalCount;

  if (!isOpen) return null;

  return (
    <Modal
      title="System Data Health & Ledger Invariants"
      description="Continuous validation of Section 0 correlation contracts (I1–I16) against single source of truth."
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Summary Card */}
        <div
          className={`flex items-center justify-between rounded-xl border p-3.5 ${
            allPassed
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} className={allPassed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
            <div>
              <p className="text-xs font-bold">
                {allPassed ? "100% Data Integrity Verified" : `${totalCount - passedCount} Invariant Discrepancies Detected`}
              </p>
              <p className="text-[11px] opacity-80">
                {passedCount} of {totalCount} canonical ledger invariants passed.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-card px-2.5 py-1 text-xs font-mono font-bold shadow-2xs">
            {passedCount}/{totalCount}
          </span>
        </div>

        {/* Invariant Check Results List */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
          {results.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 text-xs"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {item.id}
                  </span>
                  <span className="font-semibold text-foreground truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                  <span>Actual: <strong className="text-foreground">{item.actual}</strong></span>
                  <span>·</span>
                  <span>Expected: <strong className="text-foreground">{item.expected}</strong></span>
                </div>
                {item.message && (
                  <p className="text-[11px] text-muted-foreground">{item.message}</p>
                )}
              </div>
              <div className="shrink-0 pt-0.5">
                {item.passed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} /> Passed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    <XCircle size={16} /> Failed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-border/80">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

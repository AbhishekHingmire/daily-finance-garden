import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ShieldCheck, Keyboard, HelpCircle, FileText, ArrowRight, Wallet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HelpPageProps {
  onNavigate?: (section: string) => void;
}

export function HelpPage({ onNavigate }: HelpPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Support"
        description="Your data stays on this device. Guide to shortcuts, privacy, and financial rules."
        periodSlot={
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck size={14} />
            <span>100% Offline & Private</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Offline & Private */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
            <div className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <span>Your Data Stays on This Device</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            WealthTrack stores all your financial accounts, transactions, investments, loans, and custom categories strictly in your browser's local cache. No financial data or account credentials are ever uploaded to cloud servers.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => onNavigate?.("Preferences")}
            >
              Manage Data & Backups <ArrowRight size={13} className="ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
            <div className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <Keyboard size={18} />
            </div>
            <span>Keyboard Shortcuts</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Add new transaction / entry</span>
              <kbd className="px-2 py-0.5 rounded bg-muted font-mono text-[11px] font-semibold text-foreground border border-border">N</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Search workspace</span>
              <kbd className="px-2 py-0.5 rounded bg-muted font-mono text-[11px] font-semibold text-foreground border border-border">⌘K / Ctrl+K</kbd>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Close modals / sheets</span>
              <kbd className="px-2 py-0.5 rounded bg-muted font-mono text-[11px] font-semibold text-foreground border border-border">Esc</kbd>
            </div>
          </div>
        </div>

        {/* 50/30/20 Rule Guide */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
            <div className="grid size-8 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Wallet size={18} />
            </div>
            <span>Needs, Wants & Savings (50/30/20)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            WealthTrack categorizes every outflow to guide healthy financial balance:
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 dark:text-blue-400 shrink-0">Needs (50%):</span>
              <span className="text-muted-foreground">Essential expenses like housing, groceries, bills, utilities, and loan EMIs.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-amber-600 dark:text-amber-400 shrink-0">Wants (30%):</span>
              <span className="text-muted-foreground">Discretionary expenses like dining out, shopping, hobbies, and entertainment.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">Savings (20%):</span>
              <span className="text-muted-foreground">Net retained cash, SIPs, investments, and loan principal prepayments.</span>
            </div>
          </div>
        </div>

        {/* Transfers & Tracking */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
            <div className="grid size-8 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles size={18} />
            </div>
            <span>Transfers vs Expenses</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Moving money between your own accounts, investing in mutual funds, or lending money to someone are classified as <strong>Transfers</strong>. They adjust account balances without reducing your net savings or distorting monthly expense budgets.
          </p>
        </div>
      </div>
    </div>
  );
}

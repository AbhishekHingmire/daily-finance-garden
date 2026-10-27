import React from "react";
import { ActionMenu } from "@/components/shared/ActionMenu";

export interface PageHeaderAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  tabs?: React.ReactNode;
  /** Right slot: PeriodPicker (period pages) OR non-interactive caption (balance pages) */
  periodSlot?: React.ReactNode;
  /** At most ONE primary action button */
  primaryAction?: React.ReactNode;
  /** Overflow action menu items for the "⋯" button */
  moreMenuItems?: PageHeaderAction[];
  /** Custom moreMenu node if already built */
  moreMenu?: React.ReactNode;
  /** Backward-compatibility actions prop */
  actions?: React.ReactNode;
  /** If true, renders "As of today · 26 Oct 2026" when periodSlot is not provided */
  isBalancePage?: boolean;
  className?: string;
}

export function AsOfTodayCaption() {
  return (
    <span className="text-xs text-muted-foreground font-medium shrink-0 tabular-nums">
      As of today · 26 Oct 2026
    </span>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  tabs,
  periodSlot,
  primaryAction,
  moreMenuItems,
  moreMenu,
  actions,
  isBalancePage = false,
  className = "",
}: PageHeaderProps) {
  const renderedMoreMenu =
    moreMenu ??
    (moreMenuItems && moreMenuItems.length > 0 ? (
      <ActionMenu items={moreMenuItems} align="end" />
    ) : null);

  const rightSide = (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      {periodSlot ?? (isBalancePage ? <AsOfTodayCaption /> : null)}
      {actions}
      {primaryAction}
      {renderedMoreMenu}
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {tabs && (
        <div className="sticky top-[56px] md:top-[64px] z-subnav -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-2 bg-background border-b border-border/80 max-w-[100vw]">
          {tabs}
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          {eyebrow && (
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="wt-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {rightSide}
      </div>
    </div>
  );
}

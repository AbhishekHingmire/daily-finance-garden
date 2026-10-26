import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type PeriodSelector,
} from "@/lib/metrics-service";
import {
  formatPeriodLabel,
  MONTH_SHORT_NAMES,
  MONTH_FULL_NAMES,
} from "@/lib/period-state";

export interface PeriodPillProps {
  period: PeriodSelector;
  onChange: (period: PeriodSelector) => void;
  className?: string;
}

export const PeriodPill: React.FC<PeriodPillProps> = ({
  period,
  onChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [gridYear, setGridYear] = useState(period.year);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGridYear(period.year);
  }, [period.year]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handlePrevMonth = () => {
    let y = period.year;
    let m = period.month - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    onChange({ year: y, month: m });
  };

  const handleNextMonth = () => {
    let y = period.year;
    let m = period.month + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    onChange({ year: y, month: m });
  };

  const handleSelectMonth = (monthIndex: number) => {
    onChange({ year: gridYear, month: monthIndex + 1 });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      {/* Segmented Pill Container */}
      <div className="inline-flex items-center rounded-xl border border-border/80 bg-card p-0.5 shadow-2xs hover:border-border transition-colors">
        {/* Prev Arrow */}
        <button
          type="button"
          onClick={handlePrevMonth}
          className="grid size-7.5 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          title="Previous month"
          aria-label="Previous month"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Center Pill Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex h-7.5 items-center gap-1.5 px-2.5 rounded-lg text-xs font-bold text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <span>{formatPeriodLabel(period)}</span>
          <ChevronDown size={13} className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Next Arrow */}
        <button
          type="button"
          onClick={handleNextMonth}
          className="grid size-7.5 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          title="Next month"
          aria-label="Next month"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Month-Grid Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 top-10 z-50 w-64 rounded-2xl border border-border bg-card p-3.5 shadow-xl animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Year Navigator */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/60">
            <button
              type="button"
              onClick={() => setGridYear((y) => y - 1)}
              className="grid size-7 place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Previous year"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-extrabold text-foreground tracking-tight">{gridYear}</span>
            <button
              type="button"
              onClick={() => setGridYear((y) => y + 1)}
              className="grid size-7 place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Next year"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* 12-Month Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_SHORT_NAMES.map((mName, idx) => {
              const isSelected = period.year === gridYear && period.month === idx + 1;
              return (
                <button
                  key={mName}
                  type="button"
                  onClick={() => handleSelectMonth(idx)}
                  className={`h-8 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                      : "text-foreground hover:bg-muted/70"
                  }`}
                >
                  {mName}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-border/50 text-center">
            <button
              type="button"
              onClick={() => {
                onChange({ year: 2026, month: 10 });
                setIsOpen(false);
              }}
              className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
            >
              Reset to Oct 2026
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

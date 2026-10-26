import React from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard PageContainer (SPEC_R2 2.3).
 * Used by EVERY page: max-width 1280px content area, centred, gutters 16px (<768), 24px (md), 32px (lg+).
 */
export function PageContainer({ children, className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

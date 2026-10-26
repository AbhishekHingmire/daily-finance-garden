import React from "react";
import { formatMoney } from "@/lib/formatters";

export type MetricFormat =
  | "money"
  | "money_signed"
  | "percent"
  | "months"
  | "raw"
  | ((val: number) => React.ReactNode);

export interface MetricProps {
  id: string;
  value: number | null | undefined;
  format?: MetricFormat;
  className?: string;
  currency?: string;
  decimals?: number;
  signed?: boolean;
}

export const Metric: React.FC<MetricProps> = ({
  id,
  value,
  format = "money",
  className = "",
  currency = "INR",
  decimals,
  signed = false,
}) => {
  const numericVal = value !== null && value !== undefined && !isNaN(value) ? value : 0;

  const renderContent = () => {
    if (typeof format === "function") {
      return format(numericVal);
    }
    if (format === "raw") {
      return String(numericVal);
    }
    if (format === "percent") {
      const rounded = decimals !== undefined ? numericVal.toFixed(decimals) : Math.round(numericVal);
      return `${rounded}%`;
    }
    if (format === "months") {
      const rounded = decimals !== undefined ? numericVal.toFixed(decimals) : numericVal.toFixed(1);
      return `${rounded} months`;
    }
    if (format === "money_signed" || signed) {
      return formatMoney(numericVal, currency, { signed: true, decimals });
    }
    return formatMoney(numericVal, currency, { decimals });
  };

  return (
    <span
      data-metric={id}
      data-value={numericVal}
      className={`tabular-nums ${className}`}
    >
      {renderContent()}
    </span>
  );
};

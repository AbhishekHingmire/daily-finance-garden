import React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ActionMenu({
  items,
  align = "end",
  triggerClassName,
}: {
  items: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    destructive?: boolean;
    disabled?: boolean;
  }>;
  align?: "start" | "end" | "center";
  triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground ${
            triggerClassName || ""
          }`}
          aria-label="Actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48 z-topbar">
        {items.map((item, idx) => (
          <DropdownMenuItem
            key={idx}
            disabled={item.disabled}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
            }}
            className={`cursor-pointer gap-2 py-2 text-xs font-semibold ${
              item.destructive
                ? "text-destructive focus:bg-destructive/10 focus:text-destructive"
                : ""
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

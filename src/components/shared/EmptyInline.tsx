import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyInline({
  title,
  body,
  message,
  icon: Icon = Inbox,
}: {
  title?: string;
  body?: string;
  message?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <span className="mb-2.5 grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon size={18} />
      </span>
      <p className="text-sm font-bold text-foreground">
        {title || message || "No records found"}
      </p>
      {body && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{body}</p>}
    </div>
  );
}

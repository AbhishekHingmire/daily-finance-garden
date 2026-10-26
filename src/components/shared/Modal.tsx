import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-modal flex items-end justify-center bg-foreground/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="document"
        className={`max-h-[92dvh] w-full overflow-y-auto wt-scrollbar rounded-t-2xl border border-border bg-card p-5 wt-shadow sm:rounded-2xl sm:p-6 ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="wt-display text-xl font-bold text-foreground">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close dialog"
            title="Close"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

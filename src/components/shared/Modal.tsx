import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
  fullScreenMobile = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  fullScreenMobile?: boolean;
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
      className={`fixed inset-0 z-modal flex justify-center bg-foreground/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5 ${
        fullScreenMobile ? "items-stretch sm:items-center" : "items-end sm:items-center"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="document"
        className={`w-full overflow-y-auto wt-scrollbar border border-border bg-card p-5 wt-shadow sm:rounded-2xl sm:p-6 ${
          fullScreenMobile
            ? "h-full sm:h-auto max-h-none sm:max-h-[92dvh] rounded-none"
            : "max-h-[92dvh] rounded-t-2xl"
        } ${wide ? "max-w-2xl" : "max-w-lg"}`}
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

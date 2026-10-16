import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  maxWidthClass?: string;
  zIndexClass?: string;
  bodyClass?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
}

const maxWidthMap: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
};

export function Modal({
  open,
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "xl",
  maxWidthClass,
  zIndexClass = "z-50",
  bodyClass = "p-6",
  header,
  footer,
  closeOnBackdrop = false,
}: ModalProps) {
  const isVisible = open ?? isOpen ?? false;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isVisible) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const resolvedMaxWidth = maxWidthClass || (maxWidth ? maxWidthMap[maxWidth] || maxWidth : "max-w-xl");

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs",
        zIndexClass
      )}
      onClick={() => closeOnBackdrop && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl shadow-black/50 outline-none animate-in fade-in zoom-in-95 duration-200",
          resolvedMaxWidth
        )}
      >
        {/* Header */}
        {header !== undefined ? (
          header
        ) : title || description ? (
          <div className="flex items-start justify-between gap-4 border-b border-border bg-background px-6 py-4 shrink-0">
            <div className="min-w-0 space-y-1">
              {title && (
                <h2 className="text-base font-semibold leading-tight text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        {/* Body */}
        <div data-slot="modal-body" className={cn("min-h-0 flex-1 overflow-y-auto custom-scrollbar", bodyClass)}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            data-slot="modal-footer"
            className="flex shrink-0 justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4"
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default Modal;


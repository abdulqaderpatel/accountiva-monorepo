import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GstTreatmentOption {
  id: string;
  name: string;
  description: string;
}

export interface GstTreatmentSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean | string;
  className?: string;
  disabled?: boolean;
  context?: "vendor" | "customer";
}

export const GstTreatmentSelect: React.FC<GstTreatmentSelectProps> = ({
  value = "",
  onChange,
  error,
  className,
  disabled = false,
  context = "customer",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
    top: "0px",
    left: "0px",
    width: "0px",
  });

  const options = useMemo<GstTreatmentOption[]>(() => {
    const isVendor = context === "vendor";
    return [
      {
        id: "Registered",
        name: "Registered",
        description: "Business registered under GST with a valid GSTIN",
      },
      {
        id: "Composition",
        name: "Composition",
        description: "Business registered under the GST Composition Scheme",
      },
      {
        id: isVendor ? "Unregistered" : "Consumer (Unregistered)",
        name: isVendor ? "Unregistered" : "Consumer (Unregistered)",
        description: isVendor
          ? "Business or entity not registered under GST"
          : "Individual consumer or business not registered under GST",
      },
    ];
  }, [context]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownMaxHeight = 280;
    const openUpwards = spaceBelow < dropdownMaxHeight && rect.top > dropdownMaxHeight;
    const calculatedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8));

    if (openUpwards) {
      setPopoverStyle({
        position: "fixed",
        bottom: `${window.innerHeight - rect.top + 4}px`,
        left: `${calculatedLeft}px`,
        width: `${Math.max(rect.width, 240)}px`,
        maxHeight: `${Math.min(dropdownMaxHeight, rect.top - 16)}px`,
        zIndex: 9999,
      });
    } else {
      setPopoverStyle({
        position: "fixed",
        top: `${rect.bottom + 4}px`,
        left: `${calculatedLeft}px`,
        width: `${Math.max(rect.width, 240)}px`,
        maxHeight: `${Math.min(dropdownMaxHeight, spaceBelow - 16)}px`,
        zIndex: 9999,
      });
    }
  }, []);

  const toggleDropdown = useCallback(() => {
    if (disabled) return;
    if (!isOpen) {
      window.dispatchEvent(new CustomEvent("close-all-selects"));
      window.dispatchEvent(new CustomEvent("close-all-date-pickers"));
      setIsOpen(true);
      setSearchQuery("");
    } else {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const timer = requestAnimationFrame(updatePosition);
      return () => cancelAnimationFrame(timer);
    }
  }, [isOpen, updatePosition]);

  const selectOption = (option: GstTreatmentOption) => {
    onChange?.(option.id);
    setIsOpen(false);
  };

  const isOptionSelected = (option: GstTreatmentOption) => {
    if (value === option.id) return true;
    if (
      (value === "Consumer (Unregistered)" ||
        value === "Unregistered Business" ||
        value === "Unregistered") &&
      (option.id === "Unregistered" || option.id === "Consumer (Unregistered)")
    ) {
      return true;
    }
    return false;
  };

  const selectedOption = useMemo(() => {
    const isVendor = context === "vendor";
    if (value === "Unregistered" || value === "Consumer (Unregistered)" || value === "Unregistered Business") {
      return {
        id: isVendor ? "Unregistered" : "Consumer (Unregistered)",
        name: isVendor ? "Unregistered" : "Consumer (Unregistered)",
        description: isVendor
          ? "Business or entity not registered under GST"
          : "Individual consumer or business not registered under GST",
      };
    }
    return (
      options.find((opt) => opt.id === value) || {
        id: value || (isVendor ? "Unregistered" : "Consumer (Unregistered)"),
        name: value || (isVendor ? "Unregistered" : "Consumer (Unregistered)"),
        description: "",
      }
    );
  }, [value, context, options]);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        opt.description.toLowerCase().includes(q)
    );
  }, [searchQuery, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const closeAll = () => setIsOpen(false);

    window.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("close-all-selects", closeAll);
    window.addEventListener("close-all-date-pickers", closeAll);

    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("close-all-selects", closeAll);
      window.removeEventListener("close-all-date-pickers", closeAll);
    };
  }, [updatePosition]);

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-slot="gst-treatment-trigger"
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent dark:bg-input/30 px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 cursor-pointer",
          !value && "text-muted-foreground",
          Boolean(error) && "border-destructive focus-visible:ring-destructive/50",
          className
        )}
      >
        <span className="truncate text-left">
          {selectedOption ? selectedOption.name : "Select GST registration status"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground opacity-50 transition-transform duration-200 ml-2",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            role="listbox"
            data-slot="gst-treatment-popover"
            className="fixed overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 duration-100 flex flex-col"
            style={popoverStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="p-1 border-b border-border/60 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground opacity-50" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  type="text"
                  placeholder="Search status..."
                  className="h-8 w-full rounded-sm border border-input bg-transparent dark:bg-input/30 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-56 overflow-y-auto py-1 space-y-0.5 custom-scrollbar flex-1">
              {filteredOptions.map((option) => {
                const isSelected = isOptionSelected(option);
                return (
                  <div
                    key={option.id}
                    onClick={() => selectOption(option)}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none flex-col gap-0.5 rounded-sm py-2 pl-8 pr-2 text-left outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                      isSelected && "font-medium"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-2 top-2.5 flex h-3.5 w-3.5 items-center justify-center text-foreground">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <span className="text-sm leading-tight text-foreground">{option.name}</span>
                    <span className="text-xs text-muted-foreground leading-normal line-clamp-2">
                      {option.description}
                    </span>
                  </div>
                );
              })}
              {filteredOptions.length === 0 && (
                <div className="py-4 text-center text-xs text-muted-foreground italic">
                  No options found
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default GstTreatmentSelect;


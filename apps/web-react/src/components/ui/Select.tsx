import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OptionObject {
  id: string | number;
  name: string;
  [key: string]: any;
}

export type Option = OptionObject | string | number;

export interface SelectProps {
  value?: string | number | null;
  onChange?: (value: any) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean | string;
}

export const Select: React.FC<SelectProps> = ({
  value = "",
  onChange,
  options,
  placeholder = "Select an option",
  className,
  disabled = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
    top: "0px",
    left: "0px",
    width: "0px",
  });

  const getOptionId = useCallback((option: Option) => {
    if (typeof option === "object" && option !== null) {
      return option.id;
    }
    return option;
  }, []);

  const getOptionName = useCallback((option: Option) => {
    if (typeof option === "object" && option !== null) {
      return option.name;
    }
    return String(option);
  }, []);

  const isOptionSelected = useCallback(
    (option: Option) => {
      if (value === null || value === undefined) return false;
      return String(getOptionId(option)) === String(value);
    },
    [value, getOptionId]
  );

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownMaxHeight = 260;
    const openUpwards = spaceBelow < dropdownMaxHeight && rect.top > dropdownMaxHeight;
    const calculatedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8));

    if (openUpwards) {
      setPopoverStyle({
        position: "fixed",
        bottom: `${window.innerHeight - rect.top + 4}px`,
        left: `${calculatedLeft}px`,
        width: `${rect.width}px`,
        maxHeight: `${Math.min(dropdownMaxHeight, rect.top - 16)}px`,
        zIndex: 9999,
      });
    } else {
      setPopoverStyle({
        position: "fixed",
        top: `${rect.bottom + 4}px`,
        left: `${calculatedLeft}px`,
        width: `${rect.width}px`,
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
      const selectedIndex = options.findIndex((opt) => isOptionSelected(opt));
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    } else {
      setIsOpen(false);
    }
  }, [disabled, isOpen, options, isOptionSelected]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const timer = requestAnimationFrame(updatePosition);
      return () => cancelAnimationFrame(timer);
    }
  }, [isOpen, updatePosition]);

  const selectOption = useCallback(
    (option: Option) => {
      const optionId = getOptionId(option);
      onChange?.(optionId);
      setIsOpen(false);
    },
    [getOptionId, onChange]
  );

  const handleKeydown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length === 0) return;
      if (!isOpen) {
        toggleDropdown();
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((prev) => (prev + direction + options.length) % options.length);
      return;
    }

    if (
      (event.key === "Enter" || event.key === " ") &&
      isOpen &&
      options[activeIndex]
    ) {
      event.preventDefault();
      selectOption(options[activeIndex]);
    }
  };

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

  const selectedOptionName = useMemo(() => {
    if (value === null || value === undefined || value === "") return "";
    const found = options.find((opt) => isOptionSelected(opt));
    return found ? getOptionName(found) : "";
  }, [value, options, isOptionSelected, getOptionName]);

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleKeydown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-slot="select-trigger"
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 dark:bg-input/30 cursor-pointer",
          !value && value !== 0 && "text-muted-foreground",
          Boolean(error) && "border-destructive focus-visible:ring-destructive/50",
          className
        )}
      >
        <span className="truncate text-left">
          {selectedOptionName || placeholder}
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
            data-slot="select-content"
            className="fixed overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 duration-100"
            style={popoverStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-56 overflow-y-auto custom-scrollbar">
              {options.map((option, index) => {
                const isSelected = isOptionSelected(option);
                const optId = getOptionId(option);
                const optName = getOptionName(option);

                return (
                  <div
                    key={optId}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectOption(option)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                      isSelected && "font-medium",
                      activeIndex === index && "bg-accent text-accent-foreground"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center text-foreground">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <span className="block truncate text-left">{optName}</span>
                  </div>
                );
              })}
              {options.length === 0 && (
                <div className="py-4 text-center text-xs text-muted-foreground italic">
                  No options available
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Select;

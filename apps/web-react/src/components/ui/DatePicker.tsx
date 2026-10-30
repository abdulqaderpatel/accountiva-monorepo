import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean | string;
  disabled?: boolean;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const DatePicker: React.FC<DatePickerProps> = ({
  value = "",
  onChange,
  placeholder = "Pick a date",
  className,
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [viewDate, setViewDate] = useState(() => (value ? new Date(value) : new Date()));
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
    top: "0px",
    left: "0px",
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 310;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
    const calculatedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - 296));

    if (openUpwards) {
      setPopoverStyle({
        position: "fixed",
        bottom: `${window.innerHeight - rect.top + 4}px`,
        left: `${calculatedLeft}px`,
        zIndex: 9999,
      });
    } else {
      setPopoverStyle({
        position: "fixed",
        top: `${rect.bottom + 4}px`,
        left: `${calculatedLeft}px`,
        zIndex: 9999,
      });
    }
  }, []);

  const togglePopover = useCallback(() => {
    if (disabled) return;
    if (!isOpen) {
      window.dispatchEvent(new CustomEvent("close-all-date-pickers"));
      window.dispatchEvent(new CustomEvent("close-all-selects"));
      setIsOpen(true);
      if (value) {
        setViewDate(new Date(value));
      }
    } else {
      setIsOpen(false);
    }
  }, [disabled, isOpen, value]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const timer = requestAnimationFrame(updatePosition);
      return () => cancelAnimationFrame(timer);
    }
  }, [isOpen, updatePosition]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
    }> = [];

    // Padding for previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: month - 1,
        year: year,
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month: month,
        year: year,
        isCurrentMonth: true,
      });
    }

    // Padding for next month
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: month + 1,
        year: year,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewDate]);

  const selectDate = (day: number, month: number, year: number) => {
    const formatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange?.(formatted);
    setIsOpen(false);
  };

  const isSelected = (day: number, month: number, year: number) => {
    if (!value) return false;
    const formatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return formatted === value;
  };

  const isToday = (day: number, month: number, year: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const closeAll = () => setIsOpen(false);

    window.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("close-all-date-pickers", closeAll);
    window.addEventListener("close-all-selects", closeAll);

    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("close-all-date-pickers", closeAll);
      window.removeEventListener("close-all-selects", closeAll);
    };
  }, [updatePosition]);

  return (
    <div className="relative w-full">
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={togglePopover}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-invalid={Boolean(error) || undefined}
        data-slot="date-picker-trigger"
        className={cn(
          "flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          !value && "text-muted-foreground",
          Boolean(error) && "border-destructive focus-visible:ring-destructive/50",
          className
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground opacity-50 ml-2" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Choose a date"
            data-slot="date-picker-popover"
            className="fixed overflow-hidden rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 duration-100 w-[280px]"
            style={popoverStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="h-7 w-7 rounded-md border border-input bg-background p-0 opacity-70 hover:opacity-100 flex items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-medium text-foreground">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </div>
              <button
                type="button"
                onClick={nextMonth}
                className="h-7 w-7 rounded-md border border-input bg-background p-0 opacity-70 hover:opacity-100 flex items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="text-center text-[0.8rem] font-normal text-muted-foreground py-0.5"
                >
                  {{ day }.day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, i) => {
                const selected = isSelected(date.day, date.month, date.year);
                const today = isToday(date.day, date.month, date.year);

                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => selectDate(date.day, date.month, date.year)}
                    className={cn(
                      "h-8 w-8 rounded-md text-sm font-normal flex items-center justify-center transition-colors p-0 cursor-pointer",
                      !date.isCurrentMonth && "text-muted-foreground opacity-40",
                      date.isCurrentMonth &&
                        !selected &&
                        "text-foreground hover:bg-accent hover:text-accent-foreground",
                      today &&
                        !selected &&
                        "bg-accent text-accent-foreground font-semibold",
                      selected &&
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                    )}
                  >
                    {date.day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default DatePicker;

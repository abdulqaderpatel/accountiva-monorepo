import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean | string;
  disabled?: boolean;
}

export type ViewMode = "days" | "months" | "years";

export const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
export const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function parseDateValue(val?: string | null): Date | null {
  if (!val) return null;
  const parts = val.trim().split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getDecadeBounds(year: number): { start: number; end: number; years: number[] } {
  const start = Math.floor(year / 10) * 10;
  const end = start + 9;
  const years = Array.from({ length: 12 }, (_, i) => start - 1 + i);
  return { start, end, years };
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value = "",
  onChange,
  placeholder = "Pick a date",
  className,
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const parsedValue = useMemo(() => parseDateValue(value), [value]);
  const [viewDate, setViewDate] = useState<Date>(() => parsedValue || new Date());

  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
    top: "0px",
    left: "0px",
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 340;
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
      setViewMode("days");
      if (parsedValue) {
        setViewDate(parsedValue);
      } else {
        setViewDate(new Date());
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [disabled, isOpen, parsedValue]);

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
    const formatted = formatDateString(year, month, day);
    onChange?.(formatted);
    setIsOpen(false);
  };

  const isSelected = (day: number, month: number, year: number) => {
    if (!value) return false;
    return formatDateString(year, month, day) === value;
  };

  const isToday = (day: number, month: number, year: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === "days") {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    } else if (viewMode === "months") {
      setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
    } else if (viewMode === "years") {
      setViewDate(new Date(viewDate.getFullYear() - 10, viewDate.getMonth(), 1));
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === "days") {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    } else if (viewMode === "months") {
      setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
    } else if (viewMode === "years") {
      setViewDate(new Date(viewDate.getFullYear() + 10, viewDate.getMonth(), 1));
    }
  };

  // Decade bounds for year view
  const decadeStart = Math.floor(viewDate.getFullYear() / 10) * 10;

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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const closeAll = () => setIsOpen(false);

    window.addEventListener("click", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("close-all-date-pickers", closeAll);
    window.addEventListener("close-all-selects", closeAll);

    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
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
            className="fixed overflow-hidden rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 duration-100 w-[280px] select-none"
            style={popoverStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Calendar Header with Navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous"
                className="h-7 w-7 rounded-md border border-input bg-background p-0 opacity-70 hover:opacity-100 flex items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Dynamic Header title depending on viewMode */}
              {viewMode === "days" && (
                <div className="flex items-center gap-1 font-medium">
                  <button
                    type="button"
                    onClick={() => setViewMode("months")}
                    className="px-2 py-0.5 rounded-md text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    title="Select month"
                  >
                    {MONTHS[viewDate.getMonth()]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("years")}
                    className="px-2 py-0.5 rounded-md text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    title="Select year"
                  >
                    {viewDate.getFullYear()}
                  </button>
                </div>
              )}

              {viewMode === "months" && (
                <button
                  type="button"
                  onClick={() => setViewMode("years")}
                  className="px-2.5 py-0.5 rounded-md text-sm font-bold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Select year"
                >
                  <span>{viewDate.getFullYear()}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
                </button>
              )}

              {viewMode === "years" && (
                <span className="text-sm font-bold text-foreground px-2 py-0.5">
                  {decadeStart} – {decadeStart + 9}
                </span>
              )}

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next"
                className="h-7 w-7 rounded-md border border-input bg-background p-0 opacity-70 hover:opacity-100 flex items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Days View */}
            {viewMode === "days" && (
              <>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="text-center text-[0.8rem] font-medium text-muted-foreground py-0.5"
                    >
                      {day}
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
                            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-semibold shadow-2xs"
                        )}
                      >
                        {date.day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Months View */}
            {viewMode === "months" && (
              <div className="grid grid-cols-3 gap-2 py-1 min-h-[224px] content-center">
                {SHORT_MONTHS.map((monthName, idx) => {
                  const isSelectedMonth =
                    parsedValue !== null &&
                    parsedValue.getFullYear() === viewDate.getFullYear() &&
                    parsedValue.getMonth() === idx;
                  const isViewMonth = viewDate.getMonth() === idx;
                  const isCurrentMonth =
                    new Date().getFullYear() === viewDate.getFullYear() &&
                    new Date().getMonth() === idx;

                  return (
                    <button
                      type="button"
                      key={monthName}
                      onClick={() => {
                        setViewDate(new Date(viewDate.getFullYear(), idx, 1));
                        setViewMode("days");
                      }}
                      className={cn(
                        "h-10 rounded-md text-xs font-medium flex items-center justify-center transition-colors cursor-pointer",
                        isSelectedMonth &&
                          "bg-primary text-primary-foreground font-semibold hover:bg-primary shadow-2xs",
                        !isSelectedMonth &&
                          isViewMonth &&
                          "bg-accent text-accent-foreground font-semibold ring-1 ring-border",
                        !isSelectedMonth &&
                          !isViewMonth &&
                          isCurrentMonth &&
                          "text-primary font-semibold hover:bg-accent",
                        !isSelectedMonth &&
                          !isViewMonth &&
                          !isCurrentMonth &&
                          "text-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {monthName}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Years View */}
            {viewMode === "years" && (
              <div className="grid grid-cols-3 gap-2 py-1 min-h-[224px] content-center">
                {Array.from({ length: 12 }, (_, i) => decadeStart - 1 + i).map((y) => {
                  const isOutOfDecade = y < decadeStart || y > decadeStart + 9;
                  const isSelectedYear =
                    parsedValue !== null && parsedValue.getFullYear() === y;
                  const isViewYear = viewDate.getFullYear() === y;
                  const isCurrentYear = new Date().getFullYear() === y;

                  return (
                    <button
                      type="button"
                      key={y}
                      onClick={() => {
                        setViewDate(new Date(y, viewDate.getMonth(), 1));
                        setViewMode("months");
                      }}
                      className={cn(
                        "h-10 rounded-md text-xs font-medium flex items-center justify-center transition-colors cursor-pointer",
                        isOutOfDecade && "text-muted-foreground opacity-40",
                        isSelectedYear &&
                          "bg-primary text-primary-foreground font-semibold hover:bg-primary shadow-2xs",
                        !isSelectedYear &&
                          isViewYear &&
                          "bg-accent text-accent-foreground font-semibold ring-1 ring-border",
                        !isSelectedYear &&
                          !isViewYear &&
                          isCurrentYear &&
                          "text-primary font-semibold hover:bg-accent",
                        !isSelectedYear &&
                          !isViewYear &&
                          !isCurrentYear &&
                          !isOutOfDecade &&
                          "text-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Popover Footer: Quick Actions */}
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/60 text-xs">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const formatted = formatDateString(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                  );
                  onChange?.(formatted);
                  setViewDate(today);
                  setIsOpen(false);
                }}
                className="px-2 py-1 rounded text-primary hover:bg-primary/10 font-semibold transition-colors cursor-pointer"
              >
                Today
              </button>

              <div className="flex items-center gap-1">
                {viewMode !== "days" ? (
                  <button
                    type="button"
                    onClick={() => setViewMode("days")}
                    className="px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent font-medium transition-colors cursor-pointer"
                  >
                    Back to Days
                  </button>
                ) : (
                  value && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange?.("");
                        setIsOpen(false);
                      }}
                      className="px-2 py-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-medium transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default DatePicker;

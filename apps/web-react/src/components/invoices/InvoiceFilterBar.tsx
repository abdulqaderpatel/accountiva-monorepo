import React, { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Check,
  DollarSign,
  PlusCircle,
  RotateCcw,
  X,
  Bookmark as BookmarkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface InvoiceFiltersState {
  status?: string;
  timeframe?: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  bookmarkedOnly?: boolean;
}

interface InvoiceFilterBarProps {
  filters: InvoiceFiltersState;
  onUpdateFilter: <K extends keyof InvoiceFiltersState>(
    key: K,
    value: InvoiceFiltersState[K]
  ) => void;
  onResetFilters: () => void;
}

export function InvoiceFilterBar({
  filters,
  onUpdateFilter,
  onResetFilters,
}: InvoiceFilterBarProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const [isAmountOpen, setIsAmountOpen] = useState(false);

  // Draft state for amount input
  const [draftMin, setDraftMin] = useState<string>("");
  const [draftMax, setDraftMax] = useState<string>("");

  useEffect(() => {
    setDraftMin(filters.minAmount != null ? String(filters.minAmount) : "");
    setDraftMax(filters.maxAmount != null ? String(filters.maxAmount) : "");
  }, [filters.minAmount, filters.maxAmount]);

  const statusOptions = [
    { label: "All Statuses", value: "All" },
    { label: "Draft", value: "Draft", dotClass: "bg-zinc-500" },
    { label: "Outstanding", value: "Outstanding", dotClass: "bg-amber-500" },
    { label: "Overdue", value: "Overdue", dotClass: "bg-rose-600" },
    { label: "Paid", value: "Paid", dotClass: "bg-emerald-600" },
  ];

  const timeframeOptions = [
    { label: "All Time", shortLabel: "All Time", value: "all" },
    { label: "Past Due (Overdue)", shortLabel: "Overdue", value: "overdue" },
    { label: "Due in Next 7 Days", shortLabel: "Next 7 Days", value: "due_soon" },
    { label: "This Month", shortLabel: "This Month", value: "this_month" },
    { label: "Last Month", shortLabel: "Last Month", value: "last_month" },
  ];

  const getStatusBadgeClass = (status?: string | null) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white border-transparent";
      case "Due":
      case "Outstanding":
        return "bg-amber-500 text-white dark:bg-amber-600 dark:text-white border-transparent";
      case "Overdue":
        return "bg-rose-600 text-white dark:bg-rose-600 dark:text-white border-transparent";
      case "Draft":
        return "bg-zinc-600 text-white dark:bg-zinc-700 dark:text-zinc-100 border-transparent";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const activeStatusLabel =
    filters.status && filters.status !== "All"
      ? statusOptions.find((opt) => opt.value === filters.status)?.label || filters.status
      : null;

  const activeTimeframeShortLabel =
    filters.timeframe && filters.timeframe !== "all"
      ? timeframeOptions.find((opt) => opt.value === filters.timeframe)?.shortLabel ||
        filters.timeframe
      : null;

  const activeAmountLabel = (() => {
    const min = filters.minAmount;
    const max = filters.maxAmount;
    if (min != null && max != null) {
      return `₹${Number(min).toLocaleString()} - ₹${Number(max).toLocaleString()}`;
    }
    if (min != null) {
      return `≥ ₹${Number(min).toLocaleString()}`;
    }
    if (max != null) {
      return `≤ ₹${Number(max).toLocaleString()}`;
    }
    return null;
  })();

  const hasActiveFilters = Boolean(
    activeStatusLabel ||
      activeTimeframeShortLabel ||
      activeAmountLabel ||
      filters.bookmarkedOnly
  );

  const applyAmount = () => {
    const parsedMin = draftMin.trim() !== "" ? Number(draftMin) : null;
    const parsedMax = draftMax.trim() !== "" ? Number(draftMax) : null;
    onUpdateFilter("minAmount", parsedMin != null && !isNaN(parsedMin) ? parsedMin : null);
    onUpdateFilter("maxAmount", parsedMax != null && !isNaN(parsedMax) ? parsedMax : null);
    setIsAmountOpen(false);
  };

  const clearAmount = () => {
    setDraftMin("");
    setDraftMax("");
    onUpdateFilter("minAmount", null);
    onUpdateFilter("maxAmount", null);
    setIsAmountOpen(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-nowrap shrink-0 py-1.5">
      {/* 1. Status Filter */}
      <div className="relative inline-flex items-center shrink-0">
        <Popover open={isStatusOpen} onOpenChange={setIsStatusOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-xs px-2.5 gap-1.5 cursor-pointer font-normal transition-all shrink-0 select-none",
                activeStatusLabel
                  ? "border-solid font-medium text-foreground bg-background hover:bg-accent shadow-2xs"
                  : "border-dashed text-muted-foreground hover:text-foreground"
              )}
            >
              {!activeStatusLabel && <PlusCircle className="size-3.5 text-muted-foreground" />}
              <span>Status</span>
              {activeStatusLabel && (
                <>
                  <span className="text-muted-foreground/60 font-normal">:</span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded px-1.5 py-0 text-[11px] font-semibold max-w-[90px] truncate shadow-xs",
                      getStatusBadgeClass(filters.status)
                    )}
                  >
                    {activeStatusLabel}
                  </span>
                </>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-48 p-1 shadow-md border-border">
            <div className="space-y-0.5">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left cursor-pointer",
                    (filters.status || "All") === opt.value &&
                      "font-semibold bg-accent text-accent-foreground"
                  )}
                  onClick={() => {
                    onUpdateFilter("status", opt.value);
                    setIsStatusOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {opt.dotClass && (
                      <span className={cn("size-2 rounded-full inline-block shrink-0", opt.dotClass)} />
                    )}
                    <span>{opt.label}</span>
                  </div>
                  {(filters.status || "All") === opt.value && (
                    <Check className="size-3.5 text-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {activeStatusLabel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateFilter("status", "All");
            }}
            className="absolute -top-1.5 -right-1.5 z-20 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive cursor-pointer"
            title="Remove status filter"
            aria-label="Remove status filter"
          >
            <X className="size-2.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* 2. Timeframe Filter */}
      <div className="relative inline-flex items-center shrink-0">
        <Popover open={isTimeframeOpen} onOpenChange={setIsTimeframeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-xs px-2.5 gap-1.5 cursor-pointer font-normal transition-all shrink-0 select-none",
                activeTimeframeShortLabel
                  ? "border-solid font-medium text-foreground bg-background hover:bg-accent shadow-2xs"
                  : "border-dashed text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar
                className={cn(
                  "size-3.5",
                  activeTimeframeShortLabel ? "text-foreground" : "text-muted-foreground"
                )}
              />
              <span>Time</span>
              {activeTimeframeShortLabel && (
                <>
                  <span className="text-muted-foreground/60 font-normal">:</span>
                  <span className="inline-flex items-center rounded px-1.5 py-0 text-[11px] font-semibold max-w-[100px] truncate bg-primary text-primary-foreground shadow-xs">
                    {activeTimeframeShortLabel}
                  </span>
                </>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-52 p-1 shadow-md border-border">
            <div className="space-y-0.5">
              {timeframeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left cursor-pointer",
                    (filters.timeframe || "all") === opt.value &&
                      "font-semibold bg-accent text-accent-foreground"
                  )}
                  onClick={() => {
                    onUpdateFilter("timeframe", opt.value);
                    setIsTimeframeOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {(filters.timeframe || "all") === opt.value && (
                    <Check className="size-3.5 text-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {activeTimeframeShortLabel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateFilter("timeframe", "all");
            }}
            className="absolute -top-1.5 -right-1.5 z-20 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive cursor-pointer"
            title="Remove time filter"
            aria-label="Remove time filter"
          >
            <X className="size-2.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* 3. Amount Range Filter */}
      <div className="relative inline-flex items-center shrink-0">
        <Popover open={isAmountOpen} onOpenChange={setIsAmountOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-xs px-2.5 gap-1.5 cursor-pointer font-normal transition-all shrink-0 select-none",
                activeAmountLabel
                  ? "border-solid font-medium text-foreground bg-background hover:bg-accent shadow-2xs"
                  : "border-dashed text-muted-foreground hover:text-foreground"
              )}
            >
              <DollarSign
                className={cn(
                  "size-3.5",
                  activeAmountLabel ? "text-foreground" : "text-muted-foreground"
                )}
              />
              <span>Amount</span>
              {activeAmountLabel && (
                <>
                  <span className="text-muted-foreground/60 font-normal">:</span>
                  <span className="inline-flex items-center rounded px-1.5 py-0 text-[11px] font-semibold max-w-[110px] truncate bg-primary text-primary-foreground shadow-xs">
                    {activeAmountLabel}
                  </span>
                </>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-64 p-3 shadow-md border-border space-y-3">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground">Filter by Amount (₹)</span>
              <p className="text-[11px] text-muted-foreground">Specify minimum or maximum values</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground font-medium uppercase">
                  Min (₹)
                </Label>
                <Input
                  type="number"
                  value={draftMin}
                  onChange={(e) => setDraftMin(e.target.value)}
                  placeholder="0"
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && applyAmount()}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground font-medium uppercase">
                  Max (₹)
                </Label>
                <Input
                  type="number"
                  value={draftMax}
                  onChange={(e) => setDraftMax(e.target.value)}
                  placeholder="Max"
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && applyAmount()}
                />
              </div>
            </div>

            {/* Quick chips */}
            <div className="flex items-center gap-1 pt-1 flex-wrap">
              <button
                type="button"
                className="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                onClick={() => {
                  setDraftMin("");
                  setDraftMax("10000");
                }}
              >
                &lt; ₹10k
              </button>
              <button
                type="button"
                className="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                onClick={() => {
                  setDraftMin("10000");
                  setDraftMax("50000");
                }}
              >
                ₹10k - ₹50k
              </button>
              <button
                type="button"
                className="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                onClick={() => {
                  setDraftMin("50000");
                  setDraftMax("");
                }}
              >
                &gt; ₹50k
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={clearAmount}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-3 text-xs cursor-pointer"
                onClick={applyAmount}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {activeAmountLabel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearAmount();
            }}
            className="absolute -top-1.5 -right-1.5 z-20 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive cursor-pointer"
            title="Remove amount filter"
            aria-label="Remove amount filter"
          >
            <X className="size-2.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* 4. Bookmarked Toggle Filter */}
      <div className="relative inline-flex items-center shrink-0">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 text-xs px-2.5 gap-1.5 cursor-pointer font-normal transition-all shrink-0 select-none",
            filters.bookmarkedOnly
              ? "bg-blue-600 text-white dark:bg-blue-600 dark:text-white border-blue-600 hover:bg-blue-700 hover:text-white font-semibold shadow-xs"
              : "border-dashed text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onUpdateFilter("bookmarkedOnly", !filters.bookmarkedOnly)}
        >
          <BookmarkIcon
            className={cn(
              "size-3.5",
              filters.bookmarkedOnly ? "fill-white text-white" : "text-muted-foreground"
            )}
          />
          <span>Bookmarked</span>
        </Button>

        {filters.bookmarkedOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateFilter("bookmarkedOnly", false);
            }}
            className="absolute -top-1.5 -right-1.5 z-20 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive cursor-pointer"
            title="Remove bookmarked filter"
            aria-label="Remove bookmarked filter"
          >
            <X className="size-2.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* 5. Reset All Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1 shrink-0 select-none"
          title="Reset all filters"
          onClick={onResetFilters}
        >
          <RotateCcw className="size-3" />
          <span>Reset</span>
        </Button>
      )}
    </div>
  );
}

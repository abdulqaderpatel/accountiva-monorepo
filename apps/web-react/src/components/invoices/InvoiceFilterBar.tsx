import React, { useState, useEffect, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
  Pin,
  Trash2,
  FileText,
  AlertCircle,
  Clock,
  TrendingUp,
  CheckCircle2,
  Filter,
  Layers,
  Tag,
  Shield,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFilterPresets, FilterPreset } from "@/hooks/useFilterPresets";
import { SavePresetDialog } from "./SavePresetDialog";
import { toast } from "sonner";

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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  AlertCircle,
  Clock,
  TrendingUp,
  CheckCircle2,
  Bookmark: BookmarkIcon,
  Filter,
  Layers,
  Tag,
  Shield,
  Receipt,
  Calendar,
};

export function InvoiceFilterBar({
  filters,
  onUpdateFilter,
  onResetFilters,
}: InvoiceFilterBarProps) {
  const {
    systemPresets,
    customPresets,
    pinnedPresets,
    activePreset,
    setActivePreset,
    createPreset,
    togglePin,
    deletePreset,
  } = useFilterPresets("invoices");

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const [isAmountOpen, setIsAmountOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

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

  // Check if current filter state deviates from active preset definition
  const isModified = useMemo(() => {
    if (!activePreset) return false;
    const pf = activePreset.filters || {};
    const statusMatch = (pf.status || "All") === (filters.status || "All");
    const timeframeMatch = (pf.timeframe || "all") === (filters.timeframe || "all");
    const bookmarkedMatch = Boolean(pf.bookmarkedOnly) === Boolean(filters.bookmarkedOnly);
    const minAmountMatch = (pf.minAmount ?? null) === (filters.minAmount ?? null);
    const maxAmountMatch = (pf.maxAmount ?? null) === (filters.maxAmount ?? null);
    return !(statusMatch && timeframeMatch && bookmarkedMatch && minAmountMatch && maxAmountMatch);
  }, [activePreset, filters]);

  const handleApplyPreset = (preset: FilterPreset) => {
    setActivePreset(preset);
    const pf = preset.filters || {};
    onUpdateFilter("status", pf.status || "All");
    onUpdateFilter("timeframe", pf.timeframe || "all");
    onUpdateFilter("minAmount", pf.minAmount ?? null);
    onUpdateFilter("maxAmount", pf.maxAmount ?? null);
    onUpdateFilter("bookmarkedOnly", Boolean(pf.bookmarkedOnly));
  };

  const handleSavePreset = async (payload: {
    name: string;
    description: string;
    icon: string;
    color: string;
    is_pinned: boolean;
    is_default: boolean;
  }) => {
    try {
      const created = await createPreset({
        ...payload,
        filters: { ...filters },
      });
      toast.success("Custom view saved", {
        description: `"${created.name}" is now available in your views.`,
      });
    } catch {
      toast.error("Failed to save view");
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, preset: FilterPreset) => {
    e.stopPropagation();
    try {
      await togglePin(preset.id);
      toast.success(preset.is_pinned ? "Unpinned view" : "Pinned view");
    } catch {
      toast.error("Failed to update view");
    }
  };

  const handleDeletePreset = async (e: React.MouseEvent, preset: FilterPreset) => {
    e.stopPropagation();
    try {
      await deletePreset(preset.id);
      toast.success("Custom view deleted");
    } catch {
      toast.error("Failed to delete view");
    }
  };

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

  const resolveIcon = (iconName?: string | null) => {
    if (!iconName) return Filter;
    return ICON_MAP[iconName] || Filter;
  };

  const ActiveIcon = resolveIcon(activePreset?.icon);

  return (
    <div className="flex items-center gap-1.5 flex-nowrap shrink-0 py-1.5">
      {/* 0. Primary View Switcher Dropdown (Zoho Books Style) */}
      <div className="relative inline-flex items-center shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 gap-1.5 text-xs font-medium border-border bg-background hover:bg-accent hover:text-accent-foreground shadow-2xs select-none transition-all cursor-pointer shrink-0"
            >
              <ActiveIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="max-w-[120px] truncate font-medium">
                {activePreset?.name || "All Invoices"}
              </span>
              {isModified && (
                <span className="text-[10px] text-muted-foreground font-normal shrink-0">
                  (modified)
                </span>
              )}
              <ChevronDown className="size-3 text-muted-foreground ml-0.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-64">
            {/* Default Views */}
            <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
              Default Views
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {systemPresets.map((preset) => {
                const ItemIcon = resolveIcon(preset.icon);
                const isSelected = activePreset?.id === preset.id;
                return (
                  <DropdownMenuItem
                    key={preset.id}
                    className="flex items-center justify-between text-xs py-1.5 px-2 cursor-pointer"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ItemIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className={cn(isSelected && "font-semibold text-foreground")}>
                        {preset.name}
                      </span>
                    </div>
                    {isSelected && <Check className="size-3.5 text-foreground shrink-0 ml-2" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>

            {/* Custom Views */}
            {customPresets.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                  My Custom Views
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {customPresets.map((preset) => {
                    const ItemIcon = resolveIcon(preset.icon);
                    const isSelected = activePreset?.id === preset.id;
                    return (
                      <DropdownMenuItem
                        key={preset.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2 group cursor-pointer"
                        onClick={() => handleApplyPreset(preset)}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <ItemIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          <span
                            className={cn("truncate", isSelected && "font-semibold text-foreground")}
                          >
                            {preset.name}
                          </span>
                          {preset.is_default && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground uppercase font-bold">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title={preset.is_pinned ? "Unpin view" : "Pin view"}
                            onClick={(e) => handleTogglePin(e, preset)}
                          >
                            <Pin
                              className={cn(
                                "size-3",
                                preset.is_pinned
                                  ? "fill-current text-foreground rotate-45"
                                  : "text-muted-foreground/40"
                              )}
                            />
                          </button>
                          <button
                            type="button"
                            className="p-0.5 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Delete custom view"
                            onClick={(e) => handleDeletePreset(e, preset)}
                          >
                            <Trash2 className="size-3" />
                          </button>
                          {isSelected && <Check className="size-3.5 text-foreground ml-1" />}
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Pinned Presets Quick Chips */}
      {pinnedPresets
        .filter((p) => p.id !== activePreset?.id)
        .slice(0, 3)
        .map((preset) => {
          const ChipIcon = resolveIcon(preset.icon);
          return (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset(preset)}
              className="h-8 text-xs px-2.5 gap-1.5 cursor-pointer font-normal text-muted-foreground hover:text-foreground border-border hover:bg-accent shrink-0 hidden md:inline-flex"
            >
              <ChipIcon className="size-3 shrink-0" />
              <span>{preset.name}</span>
            </Button>
          );
        })}

      {/* Save View Button (when active filters differ or modified) */}
      {(hasActiveFilters || isModified) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSaveModalOpen(true)}
          className="h-8 text-xs px-2.5 gap-1.5 cursor-pointer font-medium text-primary hover:text-primary border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 shrink-0"
        >
          <PlusCircle className="size-3.5" />
          <span>Save View</span>
        </Button>
      )}

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
              <div
                className={cn(
                  "size-1.5 rounded-full",
                  activeStatusLabel
                    ? statusOptions.find((opt) => opt.value === filters.status)?.dotClass ||
                        "bg-primary"
                    : "bg-muted-foreground/60"
                )}
              />
              <span>Status</span>
              {activeStatusLabel && (
                <>
                  <span className="text-muted-foreground/60 font-normal">:</span>
                  <span
                    className={cn(
                      "text-[11px] px-1.5 py-0.2 rounded-md font-medium border",
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
              {statusOptions.map((opt) => {
                const isSelected = (filters.status || "All") === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onUpdateFilter("status", opt.value);
                      setIsStatusOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                      isSelected
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {opt.dotClass ? (
                        <div className={cn("size-2 rounded-full shrink-0", opt.dotClass)} />
                      ) : (
                        <div className="size-2 rounded-full border border-muted-foreground/40 shrink-0" />
                      )}
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check className="size-3.5 text-foreground shrink-0" />}
                  </button>
                );
              })}
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
              <span>Date</span>
              {activeTimeframeShortLabel && (
                <>
                  <span className="text-muted-foreground/60 font-normal">:</span>
                  <span className="font-semibold text-foreground">
                    {activeTimeframeShortLabel}
                  </span>
                </>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-52 p-1 shadow-md border-border">
            <div className="space-y-0.5">
              {timeframeOptions.map((opt) => {
                const isSelected = (filters.timeframe || "all") === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onUpdateFilter("timeframe", opt.value);
                      setIsTimeframeOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                      isSelected
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="size-3.5 text-foreground shrink-0" />}
                  </button>
                );
              })}
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
            title="Remove date filter"
            aria-label="Remove date filter"
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
                  <span className="font-semibold text-foreground">
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
          onClick={() => {
            onResetFilters();
            if (systemPresets[0]) setActivePreset(systemPresets[0]);
          }}
        >
          <RotateCcw className="size-3" />
          <span>Reset</span>
        </Button>
      )}

      {/* Save Preset Dialog */}
      <SavePresetDialog
        open={isSaveModalOpen}
        onOpenChange={setIsSaveModalOpen}
        activeFilters={filters}
        onSave={handleSavePreset}
      />
    </div>
  );
}

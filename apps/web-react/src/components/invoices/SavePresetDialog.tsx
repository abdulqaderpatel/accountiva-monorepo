import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Filter,
  Layers,
  Clock,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Bookmark,
  Tag,
  Shield,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SavePresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilters: Record<string, any>;
  loading?: boolean;
  onSave: (payload: {
    name: string;
    description: string;
    icon: string;
    color: string;
    is_pinned: boolean;
    is_default: boolean;
  }) => Promise<void> | void;
}

const AVAILABLE_ICONS = [
  { name: "Filter", component: Filter },
  { name: "Layers", component: Layers },
  { name: "Clock", component: Clock },
  { name: "AlertCircle", component: AlertCircle },
  { name: "TrendingUp", component: TrendingUp },
  { name: "CheckCircle2", component: CheckCircle2 },
  { name: "Bookmark", component: Bookmark },
  { name: "Tag", component: Tag },
  { name: "Shield", component: Shield },
];

const AVAILABLE_COLORS = [
  { id: "default", label: "Default", bgClass: "bg-muted border-border" },
  { id: "blue", label: "Blue", bgClass: "bg-blue-500/20 border-blue-500/50 text-blue-500" },
  { id: "emerald", label: "Emerald", bgClass: "bg-emerald-500/20 border-emerald-500/50 text-emerald-500" },
  { id: "amber", label: "Amber", bgClass: "bg-amber-500/20 border-amber-500/50 text-amber-500" },
  { id: "rose", label: "Rose", bgClass: "bg-rose-500/20 border-rose-500/50 text-rose-500" },
  { id: "purple", label: "Purple", bgClass: "bg-purple-500/20 border-purple-500/50 text-purple-500" },
];

export function SavePresetDialog({
  open,
  onOpenChange,
  activeFilters,
  loading = false,
  onSave,
}: SavePresetDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Filter");
  const [selectedColor, setSelectedColor] = useState("default");
  const [isPinned, setIsPinned] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [nameError, setNameError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Compute active filter chips
  const filterChips: { label: string; value: string }[] = [];
  if (activeFilters.status && activeFilters.status !== "All") {
    filterChips.push({ label: "Status", value: activeFilters.status });
  }
  if (activeFilters.timeframe && activeFilters.timeframe !== "all") {
    const formatted =
      activeFilters.timeframe === "overdue"
        ? "Past Due"
        : activeFilters.timeframe === "due_soon"
        ? "Due Next 7 Days"
        : activeFilters.timeframe;
    filterChips.push({ label: "Timeframe", value: formatted });
  }
  if (activeFilters.minAmount != null) {
    filterChips.push({
      label: "Min Amount",
      value: `≥ ₹${Number(activeFilters.minAmount).toLocaleString()}`,
    });
  }
  if (activeFilters.maxAmount != null) {
    filterChips.push({
      label: "Max Amount",
      value: `≤ ₹${Number(activeFilters.maxAmount).toLocaleString()}`,
    });
  }
  if (activeFilters.bookmarkedOnly) {
    filterChips.push({ label: "Bookmarked", value: "Only Bookmarked" });
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Please enter a name for this custom view");
      return;
    }
    setNameError("");
    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        icon: selectedIcon,
        color: selectedColor,
        is_pinned: isPinned,
        is_default: isDefault,
      });
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-bold">Save Current View as Preset</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Save this customized filter configuration to your quick views bar for 1-click access.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {/* Active criteria chips preview */}
          {filterChips.length > 0 && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Included Filter Conditions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {filterChips.map((chip, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md bg-background border border-border text-foreground font-medium"
                  >
                    <span className="text-muted-foreground mr-1">{chip.label}:</span>
                    {chip.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="preset-name" className="text-xs font-semibold">
              View Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="preset-name"
              placeholder="e.g. Overdue Invoices > ₹50,000"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              className={cn("h-9 text-xs", nameError && "border-destructive")}
              autoFocus
            />
            {nameError && <p className="text-[11px] text-destructive">{nameError}</p>}
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <Label htmlFor="preset-desc" className="text-xs font-semibold">
              Description (Optional)
            </Label>
            <Input
              id="preset-desc"
              placeholder="Brief note on what this view tracks"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Select Icon</Label>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {AVAILABLE_ICONS.map((item) => {
                const IconComp = item.component;
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    className={cn(
                      "size-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <IconComp className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options Checkboxes */}
          <div className="space-y-2 pt-1 border-t border-border/50">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
              <Checkbox
                checked={isPinned}
                onCheckedChange={(c) => setIsPinned(Boolean(c))}
              />
              <span>Pin to filter bar for quick 1-click switching</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(c) => setIsDefault(Boolean(c))}
              />
              <span>Set as default view when opening Invoices</span>
            </label>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || loading}
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              {(submitting || loading) && <Loader2 className="size-3 animate-spin" />}
              <span>Save View</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

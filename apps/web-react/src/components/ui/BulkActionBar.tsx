import React from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { X, Trash2, Download, ChevronDown, Loader2 } from "lucide-react";

export interface BulkActionBarProps {
  count?: number;
  selectedCount?: number;
  totalCount?: number;
  label?: string;
  loading?: boolean;
  canDelete?: boolean;
  deleteLabel?: string;
  enableExport?: boolean;
  onClear?: () => void;
  onClearSelection?: () => void;
  onDelete?: () => void;
  onExport?: (format: "csv" | "json") => void;
  children?: React.ReactNode;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  count,
  selectedCount,
  totalCount,
  label = "items",
  loading = false,
  canDelete = true,
  deleteLabel = "Delete",
  enableExport = true,
  onClear,
  onClearSelection,
  onDelete,
  onExport,
  children,
}) => {
  const effectiveCount = selectedCount ?? count ?? 0;
  const handleClear = onClearSelection ?? onClear ?? (() => {});

  if (effectiveCount <= 0) return null;

  return createPortal(
    <div
      data-slot="bulk-action-bar"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl text-foreground text-sm max-w-[calc(100vw-2rem)] overflow-x-auto animate-in fade-in-0 slide-in-from-bottom-6 duration-200"
    >
      {/* Selected Count Badge */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="secondary"
          className="font-mono text-xs font-semibold px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20"
        >
          {effectiveCount}
        </Badge>
        <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
          {effectiveCount === 1 ? "item selected" : `${label} selected`}
        </span>
      </div>

      {/* Deselect Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 rounded-lg cursor-pointer"
        onClick={handleClear}
      >
        <X className="size-3.5 mr-1" />
        Deselect
      </Button>

      <div className="h-4 w-px bg-border/80 shrink-0" />

      {/* Custom Actions Slot */}
      {children && (
        <div className="flex items-center gap-2 shrink-0">
          {children}
        </div>
      )}

      {/* Export Menu */}
      {enableExport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium shrink-0 rounded-lg gap-1.5 cursor-pointer"
              disabled={loading}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-40">
            <DropdownMenuItem
              onClick={() => onExport?.("csv")}
              className="text-xs cursor-pointer"
            >
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onExport?.("json")}
              className="text-xs cursor-pointer"
            >
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Delete Action Button */}
      {canDelete && onDelete && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-8 text-xs font-medium shrink-0 rounded-lg gap-1.5 shadow-xs cursor-pointer"
          disabled={loading}
          onClick={onDelete}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
          <span>{deleteLabel}</span>
        </Button>
      )}
    </div>,
    document.body
  );
};

export default BulkActionBar;

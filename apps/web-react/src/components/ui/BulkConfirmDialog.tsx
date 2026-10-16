import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, Loader2 } from "lucide-react";

export interface BulkConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  itemCount: number;
  itemNames?: string[];
  actionLabel?: string;
  variant?: "destructive" | "default";
  loading?: boolean;
  onConfirm: () => void;
}

export const BulkConfirmDialog: React.FC<BulkConfirmDialogProps> = ({
  open,
  onOpenChange,
  title = "Confirm Bulk Action",
  description = "Are you sure you want to proceed with this bulk action?",
  itemCount,
  itemNames = [],
  actionLabel = "Confirm",
  variant = "destructive",
  loading = false,
  onConfirm,
}) => {
  const handleCancel = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  const formattedTitle = title.endsWith("?") ? title : `${title}?`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                variant === "destructive"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {variant === "destructive" ? (
                <AlertTriangle className="size-5" />
              ) : (
                <Info className="size-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {formattedTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Preview of items to be affected */}
        {itemNames && itemNames.length > 0 && (
          <div className="my-2 p-3 bg-muted/50 rounded-lg border border-border/60 text-xs">
            <p className="font-medium text-muted-foreground mb-1.5">
              Selected {itemCount === 1 ? "record" : "records"} ({itemCount}):
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {itemNames.slice(0, 10).map((name, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-background border border-border text-foreground font-mono text-[11px]"
                >
                  {name}
                </span>
              ))}
              {itemNames.length > 10 && (
                <span className="text-muted-foreground text-[11px] self-center">
                  +{itemNames.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs cursor-pointer"
            disabled={loading}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            size="sm"
            className="text-xs gap-1.5 cursor-pointer"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            <span>
              {actionLabel} {itemCount > 0 ? `(${itemCount})` : ""}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkConfirmDialog;

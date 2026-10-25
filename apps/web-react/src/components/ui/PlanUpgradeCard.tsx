import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Lock, ArrowUpRight, X, Sparkles } from "lucide-react";

interface PlanUpgradeCardProps {
  title?: string;
  description?: string;
  dismissible?: boolean;
  buttonText?: string;
  onDismiss?: () => void;
  onUpgrade?: () => void;
}

export function PlanUpgradeCard({
  title = "Professional Plan Required",
  description,
  dismissible = true,
  buttonText = "Upgrade to Professional",
  onDismiss,
  onUpgrade,
}: PlanUpgradeCardProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate({ to: "/settings", search: { tab: "Billing" } } as any);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-r from-primary/[0.07] via-primary/[0.03] to-transparent p-4 transition-all duration-300 shadow-2xs">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Icon Badge */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/25">
            <Lock className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-1 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-foreground tracking-tight">
                {title}
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary border border-primary/20">
                <Sparkles className="h-2.5 w-2.5" />
                Pro
              </span>
            </div>

            {description && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}

            <div className="pt-2">
              <Button
                size="sm"
                className="h-7 rounded-lg text-[10px] font-bold uppercase tracking-wider gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
                onClick={handleUpgrade}
              >
                <span>{buttonText}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        {dismissible && (
          <button
            type="button"
            className="shrink-0 rounded-md p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

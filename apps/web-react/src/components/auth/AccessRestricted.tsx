import React from "react";
import { ShieldAlert, Lock, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

interface AccessRestrictedProps {
  moduleName?: string;
}

const moduleTitles: Record<string, string> = {
  invoices: "Invoices",
  expenses: "Expenses",
  customers: "Customers",
  reports: "Reports",
  settings: "Settings",
  banking: "Transactions",
  estimates: "Estimates",
  items: "Items",
  creditNotes: "Credit Notes",
};

export function AccessRestricted({ moduleName }: AccessRestrictedProps) {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  const displayModuleName = moduleName
    ? moduleTitles[moduleName.toLowerCase()] || moduleTitles[moduleName] || moduleName
    : "this module";

  return (
    <div className="w-full animate-in fade-in duration-500 max-w-lg mx-auto space-y-8 p-4">
      {/* Icon */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center border border-border/50 shadow-sm">
            <ShieldAlert className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-destructive flex items-center justify-center shadow-lg border-2 border-background">
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* Header Content */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Access Restricted
        </h1>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          You don&apos;t have the necessary permissions to view {displayModuleName}.
        </p>
      </div>

      {/* Information Card */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5 text-left">
        <p className="text-xs sm:text-sm text-foreground font-medium leading-relaxed">
          Your current staff role does not include permission to view or manage this area.
        </p>

        <div className="pt-4 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
            If you require access to this feature, please contact your organization{" "}
            <span className="text-foreground font-bold">Owner</span> or an administrator to update your staff permissions.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
        <Button
          onClick={goBack}
          variant="outline"
          className="h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-2 border-border/60 hover:bg-muted min-w-[130px] cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          <span>Go Back</span>
        </Button>
        <Button
          onClick={() => navigate({ to: "/dashboard" })}
          className="h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-2 min-w-[130px] cursor-pointer"
        >
          <LayoutDashboard className="size-3.5" />
          <span>Dashboard</span>
        </Button>
      </div>
    </div>
  );
}

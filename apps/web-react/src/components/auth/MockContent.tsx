import React, { useMemo } from "react";
import { Module } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";

interface MockContentProps {
  module: Module;
}

export function MockContent({ module }: MockContentProps) {
  const mockRows = 8;
  const mockCols = useMemo(() => {
    switch (module) {
      case "invoices":
        return ["Invoice #", "Customer", "Date", "Amount", "Status"];
      case "expenses":
        return ["Date", "Category", "Vendor", "Amount", "Status"];
      case "customers":
        return ["Name", "Company", "Email", "Phone", "Balance"];
      case "items":
        return ["Item Name", "SKU", "Description", "Price", "Tax"];
      case "estimates":
        return ["Estimate #", "Client", "Date", "Amount", "Expiry"];
      case "creditNotes":
        return ["Credit Note #", "Customer", "Date", "Amount", "Status"];
      default:
        return ["Column 1", "Column 2", "Column 3", "Column 4", "Column 5"];
    }
  }, [module]);

  return (
    <div className="p-8 md:p-10 lg:p-12 max-w-7xl mx-auto space-y-8 w-full opacity-40 select-none pointer-events-none">
      {/* Mock Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted/60 rounded-md animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-muted rounded-xl animate-pulse" />
      </div>

      {/* Mock Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card border-border/50">
            <CardContent className="p-6 space-y-3">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
              <div className="h-3 w-40 bg-muted/60 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mock Table */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-border/50 flex justify-between items-center">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="divide-y divide-border/40">
          <div className="grid grid-cols-5 p-4 bg-muted/20">
            {mockCols.map((c, i) => (
              <span key={i} className="text-xs font-semibold text-muted-foreground">
                {c}
              </span>
            ))}
          </div>
          {Array.from({ length: mockRows }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 p-4 items-center">
              {mockCols.map((_, ci) => (
                <div key={ci} className="h-3 w-3/4 bg-muted/70 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

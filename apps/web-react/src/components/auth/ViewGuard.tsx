import React from "react";
import { usePermissions, Module } from "@/hooks/usePermissions";
import { AccessRestricted } from "./AccessRestricted";
import { MockContent } from "./MockContent";
import { cn } from "@/lib/utils";

interface ViewGuardProps {
  module: Module;
  children: React.ReactNode;
  className?: string;
}

export function ViewGuard({ module, children, className }: ViewGuardProps) {
  const { canView } = usePermissions();
  const allowed = canView(module);

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative flex-1 flex flex-col w-full min-h-0", className)}>
      {/* Blurred background mockup */}
      <div className="flex-1 flex flex-col w-full transition-all duration-700 min-h-0 blur-[2px] grayscale-[0.5] pointer-events-none select-none scale-[1.01]">
        <MockContent module={module} />
      </div>

      {/* Restricted Access Overlay */}
      <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-background/60 backdrop-blur-xs">
        <div className="w-full max-w-lg animate-in zoom-in-95 duration-300">
          <AccessRestricted moduleName={module} />
        </div>
      </div>
    </div>
  );
}

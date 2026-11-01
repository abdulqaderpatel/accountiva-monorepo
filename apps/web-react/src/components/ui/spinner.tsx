import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
  lg: "size-6",
  xl: "size-8",
};

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  return (
    <Loader2
      className={cn("animate-spin text-current shrink-0", sizeClasses[size], className)}
      {...props}
    />
  );
}



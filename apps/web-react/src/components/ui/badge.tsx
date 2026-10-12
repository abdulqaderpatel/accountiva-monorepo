import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline:
          "border-border text-foreground bg-transparent hover:bg-accent/40",
        draft:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        success:
          "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white shadow-xs hover:bg-emerald-600/90",
        warning:
          "border-transparent bg-amber-500 text-white dark:bg-amber-600 dark:text-white shadow-xs hover:bg-amber-500/90",
        danger:
          "border-transparent bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        info:
          "border-transparent bg-blue-600 text-white dark:bg-blue-500 dark:text-white shadow-xs hover:bg-blue-600/90",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs font-semibold",
        sm: "px-2 py-0.5 text-[11px] font-medium leading-none",
        lg: "px-3 py-1 text-xs font-semibold",
      },
      shape: {
        default: "rounded-md",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, shape, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size, shape }), className)}
      {...props}
    />
  );
}


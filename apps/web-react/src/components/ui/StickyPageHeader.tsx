import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface StickyPageHeaderProps {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  scrollThreshold?: number;
  className?: string;
  containerClassName?: string;
  badges?: React.ReactNode;
  left?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const StickyPageHeader: React.FC<StickyPageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  scrollThreshold = 40,
  className,
  containerClassName,
  badges,
  left,
  actions,
  children,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let scrollParent: HTMLElement | null = null;
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;

      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const currentScroll =
          scrollParent && scrollParent !== document.documentElement
            ? scrollParent.scrollTop
            : window.scrollY || document.documentElement.scrollTop;

        const activateThreshold = scrollThreshold ?? 40;
        const deactivateThreshold = Math.max(8, Math.floor(activateThreshold * 0.25));

        setIsScrolled((prev) => {
          if (!prev && currentScroll > activateThreshold) {
            return true;
          } else if (prev && currentScroll <= deactivateThreshold) {
            return false;
          }
          return prev;
        });
      });
    };

    let parent = headerRef.current?.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        scrollParent = parent;
        scrollParent.addEventListener("scroll", handleScroll, { passive: true });
        const activateThreshold = scrollThreshold ?? 40;
        setIsScrolled(scrollParent.scrollTop > activateThreshold);
        break;
      }
      parent = parent.parentElement;
    }

    if (!scrollParent) {
      scrollParent = document.documentElement;
      window.addEventListener("scroll", handleScroll, { passive: true });
      const activateThreshold = scrollThreshold ?? 40;
      setIsScrolled((window.scrollY || document.documentElement.scrollTop) > activateThreshold);
    }

    return () => {
      if (scrollParent && scrollParent !== document.documentElement) {
        scrollParent.removeEventListener("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleScroll);
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [scrollThreshold]);

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-20 w-full transition-all duration-200 select-none",
        isScrolled
          ? "bg-background/80 dark:bg-background/85 backdrop-blur-md border-b border-border shadow-2xs py-2.5 md:py-3"
          : "bg-transparent border-b border-transparent py-4 md:pt-5 md:pb-4",
        className
      )}
      style={{ overflowAnchor: "none" }}
    >
      <div
        className={cn(
          "max-w-7xl mx-auto px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200",
          containerClassName
        )}
      >
        {/* Left side (Icon + Title + Subtitle) */}
        {left ? (
          left
        ) : (
          <div className="flex items-center gap-3.5 min-w-0">
            {Icon && (
              <div
                className={cn(
                  "rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 transition-all duration-200",
                  isScrolled ? "w-8 h-8 rounded-lg" : "w-11 h-11 shadow-2xs"
                )}
              >
                <Icon
                  className={cn(
                    "transition-all duration-200",
                    isScrolled ? "w-4 h-4" : "w-5 h-5"
                  )}
                />
              </div>
            )}

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                {title && (
                  <h1
                    className={cn(
                      "font-bold tracking-tight text-foreground transition-all duration-200 truncate",
                      isScrolled
                        ? "text-lg md:text-xl"
                        : "ui-page-title text-2xl md:text-3xl"
                    )}
                  >
                    {title}
                  </h1>
                )}

                {badges}
              </div>

              {subtitle && (
                <div
                  className={cn(
                    "transition-all duration-200 overflow-hidden",
                    isScrolled
                      ? "max-h-0 opacity-0 -translate-y-1"
                      : "max-h-12 opacity-100 translate-y-0"
                  )}
                >
                  <p className="ui-page-description text-xs md:text-sm text-muted-foreground truncate">
                    {subtitle}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right side (Actions buttons) */}
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0">
            {actions}
          </div>
        )}

        {children}
      </div>
    </header>
  );
};

export default StickyPageHeader;


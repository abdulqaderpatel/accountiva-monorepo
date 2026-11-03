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

        const maxScroll = scrollParent && scrollParent !== document.documentElement
          ? scrollParent.scrollHeight - scrollParent.clientHeight
          : Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

        // If page has insufficient scrollable content, never trigger scrolled state to prevent oscillation
        if (maxScroll < 60) {
          setIsScrolled(false);
          return;
        }

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
        const maxScroll = scrollParent.scrollHeight - scrollParent.clientHeight;
        const activateThreshold = scrollThreshold ?? 40;
        setIsScrolled(maxScroll >= 60 && scrollParent.scrollTop > activateThreshold);
        break;
      }
      parent = parent.parentElement;
    }

    if (!scrollParent) {
      scrollParent = document.documentElement;
      window.addEventListener("scroll", handleScroll, { passive: true });
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const activateThreshold = scrollThreshold ?? 40;
      setIsScrolled(maxScroll >= 60 && (window.scrollY || document.documentElement.scrollTop) > activateThreshold);
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
        "sticky top-0 z-20 w-full transition-[background-color,border-color,box-shadow] duration-200 select-none py-3.5 md:py-4",
        isScrolled
          ? "bg-background/85 dark:bg-background/90 backdrop-blur-md border-b border-border shadow-2xs"
          : "bg-transparent border-b border-transparent",
        className
      )}
      style={{ overflowAnchor: "none" }}
    >
      <div
        className={cn(
          "max-w-7xl mx-auto px-8 flex flex-col md:flex-row md:items-center justify-between gap-4",
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
                className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs"
              >
                <Icon className="size-5" />
              </div>
            )}

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                {title && (
                  <h1 className="ui-page-title text-2xl md:text-3xl font-bold tracking-tight text-foreground truncate">
                    {title}
                  </h1>
                )}

                {badges}
              </div>

              {subtitle && (
                <p className="ui-page-description text-xs md:text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
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


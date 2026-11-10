import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Layers,
} from "lucide-react";
import api from "@/lib/api";

interface TourStep {
  target: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

const steps: TourStep[] = [
  {
    target: "body",
    title: "Welcome to Accountiva™!",
    content: "Let's take a quick one-minute tour of your accounting workspace and primary controls.",
    position: "bottom",
  },
  {
    target: "#org-switcher",
    title: "Organization Switcher",
    content: "Easily switch between your business workspaces or create a new one. All accounting records stay completely separated.",
    position: "right",
  },
  {
    target: "#sidebar-nav",
    title: "Main Navigation",
    content: "Access your financial modules including Invoices, Estimates, Customers, Items, and Reports from one place.",
    position: "right",
  },
  {
    target: "#quick-create-btn",
    title: "Quick Actions",
    content: "Quickly create new invoices, customers, or estimates on the fly with a single click from anywhere in the app.",
    position: "bottom",
  },
  {
    target: "#dashboard-stats",
    title: "Real-time Insights",
    content: "Track business performance at a glance: receivables, payables, cash flow, and monthly net profit.",
    position: "bottom",
  },
  {
    target: "#user-profile",
    title: "Profile & Settings",
    content: "Manage personal account details, toggle dark or light theme, configure preferences, and securely sign out.",
    position: "bottom",
  },
];

interface SpotlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: number;
  hasTarget: boolean;
}

export function ProductTour() {
  const { user, isAuthenticated, organizations } = useAuth();
  const location = useLocation();

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    borderRadius: 16,
    hasTarget: false,
  });

  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef<number>(0);

  const updateSpotlight = useCallback(() => {
    const step = steps[currentStep];
    if (!step || step.target === "body") {
      setSpotlightRect({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        borderRadius: 16,
        hasTarget: false,
      });
      setCardStyle({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      if (retryRef.current < 4) {
        retryRef.current += 1;
        setTimeout(updateSpotlight, 150);
        return;
      }
      // Fallback if target element isn't found
      setSpotlightRect({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        borderRadius: 16,
        hasTarget: false,
      });
      setCardStyle({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    retryRef.current = 0;

    // Check if element is out of visible viewport and scroll if needed
    const initialRect = el.getBoundingClientRect();
    const isOutOfView =
      initialRect.top < 40 ||
      initialRect.bottom > window.innerHeight - 40;

    if (isOutOfView) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }

    const rect = el.getBoundingClientRect();
    const padding = 8;
    const topCoord = Math.max(0, rect.top - padding);
    const leftCoord = Math.max(0, rect.left - padding);
    const widthCoord = rect.width + padding * 2;
    const heightCoord = rect.height + padding * 2;

    setSpotlightRect({
      top: topCoord,
      left: leftCoord,
      width: widthCoord,
      height: heightCoord,
      borderRadius: 16,
      hasTarget: true,
    });

    const cardGap = 16;
    const cardWidth = Math.min(340, window.innerWidth - 32);
    const cardHeight = 250;
    const screenPadding = 16;

    let cardTop = 0;
    let cardLeft = 0;

    switch (step.position) {
      case "right":
        cardLeft = rect.right + padding + cardGap;
        cardTop = rect.top + rect.height / 2 - cardHeight / 2;
        if (cardLeft + cardWidth > window.innerWidth - screenPadding) {
          cardLeft = rect.left - padding - cardGap - cardWidth;
          if (cardLeft < screenPadding) {
            cardLeft = rect.left + rect.width / 2 - cardWidth / 2;
            cardTop = rect.bottom + padding + cardGap;
          }
        }
        break;
      case "left":
        cardLeft = rect.left - padding - cardGap - cardWidth;
        cardTop = rect.top + rect.height / 2 - cardHeight / 2;
        if (cardLeft < screenPadding) {
          cardLeft = rect.right + padding + cardGap;
        }
        break;
      case "top":
        cardLeft = rect.left + rect.width / 2 - cardWidth / 2;
        cardTop = rect.top - padding - cardGap - cardHeight;
        if (cardTop < screenPadding) {
          cardTop = rect.bottom + padding + cardGap;
        }
        break;
      case "bottom":
      default:
        cardLeft = rect.left + rect.width / 2 - cardWidth / 2;
        cardTop = rect.bottom + padding + cardGap;
        if (cardTop + cardHeight > window.innerHeight - screenPadding) {
          cardTop = rect.top - padding - cardGap - cardHeight;
        }
        break;
    }

    cardLeft = Math.max(screenPadding, Math.min(window.innerWidth - cardWidth - screenPadding, cardLeft));
    cardTop = Math.max(screenPadding, Math.min(window.innerHeight - cardHeight - screenPadding, cardTop));

    setCardStyle({
      top: `${cardTop}px`,
      left: `${cardLeft}px`,
      transform: "none",
    });
  }, [currentStep]);

  const finishTour = useCallback(async () => {
    setIsActive(false);
    const userKey = user?.id;
    if (userKey) {
      localStorage.setItem(`accountiva_tour_completed_${userKey}`, "true");
      localStorage.setItem(`accountiva_tour_auto_shown_${userKey}`, "true");
    }
    localStorage.setItem("accountiva_tour_completed", "true");
    localStorage.setItem("accountiva_tour_auto_shown", "true");

    try {
      await api.post("/auth/tour-complete");
    } catch {
      // Ignore background completion errors
    }
  }, [user?.id]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      void finishTour();
    }
  }, [currentStep, finishTour]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // Listener for manual tour triggering (from top bar / help menu)
  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStep(0);
      setIsActive(true);
    };
    window.addEventListener("start-product-tour", handleStartTour);
    return () => window.removeEventListener("start-product-tour", handleStartTour);
  }, []);

  // Update spotlight on step change and handle resize/scroll
  useEffect(() => {
    if (!isActive) return;

    updateSpotlight();

    const handleUpdate = () => {
      updateSpotlight();
    };

    const timer = setTimeout(handleUpdate, 350);
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [isActive, updateSpotlight, currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        void finishTour();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, handleNext, handleBack, finishTour]);

  // Check tour auto-launch eligibility (auto-launch ONLY ONCE per user)
  useEffect(() => {
    if (!isAuthenticated || organizations.length === 0 || !user?.id) return;

    const isDashboard = location.pathname === "/" || location.pathname === "/dashboard";
    const userKey = user.id;

    const hasCompleted =
      localStorage.getItem(`accountiva_tour_completed_${userKey}`) === "true" ||
      localStorage.getItem("accountiva_tour_completed") === "true" ||
      (user as any).tour_completed;

    const hasAutoShown =
      localStorage.getItem(`accountiva_tour_auto_shown_${userKey}`) === "true" ||
      localStorage.getItem("accountiva_tour_auto_shown") === "true";

    if (hasCompleted || hasAutoShown) {
      return;
    }

    if (isDashboard && !isActive) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const doubleCheck =
          localStorage.getItem(`accountiva_tour_completed_${userKey}`) === "true" ||
          localStorage.getItem("accountiva_tour_completed") === "true" ||
          localStorage.getItem(`accountiva_tour_auto_shown_${userKey}`) === "true" ||
          localStorage.getItem("accountiva_tour_auto_shown") === "true";

        if (!doubleCheck) {
          // Immediately mark auto-shown so refreshing or logging in will never re-launch it automatically
          localStorage.setItem(`accountiva_tour_auto_shown_${userKey}`, "true");
          localStorage.setItem("accountiva_tour_auto_shown", "true");
          setCurrentStep(0);
          setIsActive(true);
        }
      }, 1200);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, organizations.length, user, location.pathname, isActive]);

  if (!isActive || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999990] overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Accountiva Product Tour"
    >
      {/* SVG Cutout Mask: Punches a crisp, transparent hole for the highlighted element */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none transition-all duration-300 ease-out"
        style={{ width: "100vw", height: "100vh" }}
      >
        <defs>
          <mask id="accountiva-tour-mask" x="0" y="0" width="100%" height="100%">
            {/* White fills everything (opaque overlay) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout creates transparent window to highlighted element */}
            {spotlightRect.hasTarget && (
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx={spotlightRect.borderRadius}
                ry={spotlightRect.borderRadius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Soft dark backdrop */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(10, 15, 29, 0.72)"
          mask="url(#accountiva-tour-mask)"
        />
      </svg>

      {/* Target Focus Border & Animated Beacon Ring */}
      {spotlightRect.hasTarget && (
        <div
          className="fixed pointer-events-none z-[999995] rounded-2xl border-2 border-primary transition-all duration-300 ease-out shadow-[0_0_24px_rgba(59,130,246,0.45)] ring-4 ring-primary/20"
          style={{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`,
            borderRadius: `${spotlightRect.borderRadius}px`,
          }}
        >
          {/* Animated step beacon on highlight border */}
          <span className="absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-5 w-5 bg-primary text-[9px] font-black text-primary-foreground items-center justify-center shadow-xs">
              {currentStep}
            </span>
          </span>
        </div>
      )}

      {/* Interactive Tour Dialog Card */}
      <div
        className="fixed z-[999999] pointer-events-auto transition-all duration-300 ease-out"
        style={{
          ...cardStyle,
          width: Math.min(340, typeof window !== "undefined" ? window.innerWidth - 32 : 340),
        }}
      >
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
          {/* Step Indicator Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="size-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <button
              type="button"
              onClick={finishTour}
              aria-label="Skip tour"
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-foreground leading-tight">
              {steps[currentStep].title}
            </h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              {steps[currentStep].content}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={finishTour}
              className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors cursor-pointer"
            >
              Skip Tour
            </button>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleBack}
                  className="size-8 rounded-xl border-border cursor-pointer"
                  title="Previous Step"
                >
                  <ChevronLeft className="size-4" />
                </Button>
              )}
              <Button
                type="button"
                onClick={handleNext}
                className="h-8 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-1.5 cursor-pointer shadow-xs"
              >
                <span>{currentStep === steps.length - 1 ? "Finish" : "Next"}</span>
                {currentStep < steps.length - 1 && <ChevronRight className="size-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ProductTour;

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
    content: "Let's take a quick one-minute tour of your accounting workspace.",
    position: "bottom",
  },
  {
    target: "#org-switcher",
    title: "Organization Switcher",
    content: "Easily switch between different organizations or create a new one. Your data stays perfectly separated.",
    position: "right",
  },
  {
    target: "#sidebar-nav",
    title: "Main Navigation",
    content: "Access all your modules like Invoices, Estimates, Customers, and Products from here. Everything is just one click away.",
    position: "right",
  },
  {
    target: "#user-profile",
    title: "Your Profile & Settings",
    content: "Manage your personal account, change themes, switch languages, and securely sign out from this menu.",
    position: "bottom",
  },
  {
    target: "#dashboard-stats",
    title: "Real-time Insights",
    content: "Your critical financial metrics are summarized here. Stay on top of your revenue and profit at a glance.",
    position: "bottom",
  },
];

export function ProductTour() {
  const { user, isAuthenticated, organizations } = useAuth();
  const location = useLocation();

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderRadius: 0,
  });

  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSpotlight = useCallback(() => {
    const step = steps[currentStep];
    if (!step || step.target === "body") {
      setSpotlightStyle({
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        borderRadius: 0,
      });
      setCardStyle({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      const padding = 8;

      setSpotlightStyle({
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + padding * 2}px`,
        height: `${rect.height + padding * 2}px`,
        borderRadius: "16px",
      });

      const cardGap = 20;
      const cardWidth = 320;
      const cardHeight = 240;
      const screenPadding = 20;

      let top = 0;
      let left = 0;

      switch (step.position) {
        case "right":
          left = rect.right + padding + cardGap;
          top = rect.top + rect.height / 2 - cardHeight / 2;
          break;
        case "bottom":
          left = rect.left + rect.width / 2 - cardWidth / 2;
          top = rect.bottom + padding + cardGap;
          break;
        case "top":
          left = rect.left + rect.width / 2 - cardWidth / 2;
          top = rect.top - padding - cardGap - cardHeight;
          break;
        case "left":
          left = rect.left - padding - cardGap - cardWidth;
          top = rect.top + rect.height / 2 - cardHeight / 2;
          break;
      }

      left = Math.max(screenPadding, Math.min(window.innerWidth - cardWidth - screenPadding, left));
      top = Math.max(screenPadding, Math.min(window.innerHeight - cardHeight - screenPadding, top));

      setCardStyle({
        top: `${top}px`,
        left: `${left}px`,
        transform: "none",
      });
    }
  }, [currentStep]);

  const finishTour = useCallback(async () => {
    setIsActive(false);
    if (user?.id) {
      localStorage.setItem(`accountiva_tour_completed_${user.id}`, "true");
    }
    try {
      await api.post("/auth/tour-complete");
    } catch {
      // Ignore background completion errors
    }
  }, [user?.id]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      void finishTour();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStep(0);
      setIsActive(true);
    };
    window.addEventListener("start-product-tour", handleStartTour);
    return () => window.removeEventListener("start-product-tour", handleStartTour);
  }, []);

  useEffect(() => {
    if (isActive) {
      updateSpotlight();
      window.addEventListener("resize", updateSpotlight);
      return () => window.removeEventListener("resize", updateSpotlight);
    }
  }, [isActive, updateSpotlight]);

  // Check tour eligibility
  useEffect(() => {
    if (!isAuthenticated || organizations.length === 0 || !user?.id) return;

    const isDashboard = location.pathname === "/" || location.pathname === "/dashboard";
    const localCompleted = localStorage.getItem(`accountiva_tour_completed_${user.id}`) === "true";

    if (localCompleted || (user as any).tour_completed) {
      setIsActive(false);
      return;
    }

    if (isDashboard && !isActive) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const doubleCheck = localStorage.getItem(`accountiva_tour_completed_${user.id}`) === "true";
        if (!doubleCheck) {
          setCurrentStep(0);
          setIsActive(true);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, organizations.length, user, location.pathname, isActive]);

  if (!isActive || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] pointer-events-none overflow-hidden">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] transition-all duration-500 pointer-events-none" />

      {/* Spotlight Hole */}
      <div
        className="absolute pointer-events-auto transition-all duration-500 ease-in-out"
        style={{
          ...spotlightStyle,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
        }}
      />

      {/* Info Card */}
      <div
        className="absolute w-[320px] pointer-events-auto transition-all duration-500 ease-in-out"
        style={cardStyle}
      >
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-300">
          {/* Step Indicator */}
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
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Actions */}
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

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRoute } from "vue-router";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  MousePointer2,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";

const authStore = useAuthStore();
const route = useRoute();

interface TourStep {
  target: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

const steps: TourStep[] = [
  {
    target: "body", // Welcome step (no specific highlight)
    title: "Welcome to Accountiva™!",
    content:
      "Let's take a quick one-minute tour of your accounting workspace.",
    position: "bottom",
  },
  {
    target: "#org-switcher",
    title: "Organization Switcher",
    content:
      "Easily switch between different organizations or create a new one. Your data stays perfectly separated.",
    position: "right",
  },
  {
    target: "#sidebar-nav",
    title: "Main Navigation",
    content:
      "Access all your modules like Invoices, Expenses, and Reports from here. Everything is just one click away.",
    position: "right",
  },
  {
    target: "#user-profile",
    title: "Your Profile & Settings",
    content:
      "Manage your personal account, change themes, and securely sign out from this menu.",
    position: "right",
  },
  {
    target: "#dashboard-stats",
    title: "Real-time Insights",
    content:
      "Your critical financial metrics are summarized here. Stay on top of your revenue and profit at a glance.",
    position: "bottom",
  },
];

const currentStep = ref(0);
const isActive = ref(false);
const spotlightStyle = ref({
  top: "0px",
  left: "0px",
  width: "0px",
  height: "0px",
  borderRadius: "0px",
});

const cardStyle = ref({
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
});

const updateSpotlight = () => {
  const step = steps[currentStep.value];
  if (step.target === "body") {
    spotlightStyle.value = {
      top: "0",
      left: "0",
      width: "0",
      height: "0",
      borderRadius: "0",
    };
    cardStyle.value = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
    return;
  }

  const el = document.querySelector(step.target);
  if (el) {
    const rect = el.getBoundingClientRect();
    const padding = 8;

    spotlightStyle.value = {
      top: `${rect.top - padding}px`,
      left: `${rect.left - padding}px`,
      width: `${rect.width + padding * 2}px`,
      height: `${rect.height + padding * 2}px`,
      borderRadius: "16px",
    };

    // Calculate card position using absolute positions (without offset translation transforms)
    const cardGap = 20;
    const cardWidth = 320;
    const cardHeight = 240; // Conservative height estimate including card padding
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

    // Viewport collision checking
    left = Math.max(screenPadding, Math.min(window.innerWidth - cardWidth - screenPadding, left));
    top = Math.max(screenPadding, Math.min(window.innerHeight - cardHeight - screenPadding, top));

    cardStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
      transform: "",
    };
  }
};

const handleNext = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++;
    nextTick(() => updateSpotlight());
  } else {
    finishTour();
  }
};

const handleBack = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
    nextTick(() => updateSpotlight());
  }
};

const finishTour = async () => {
  isActive.value = false;
  await authStore.completeTour();
};

const skipTour = () => {
  finishTour();
};

onMounted(() => {
  window.addEventListener("resize", updateSpotlight);
});

let tourStartTimer: ReturnType<typeof setTimeout> | undefined;

onUnmounted(() => {
  window.removeEventListener("resize", updateSpotlight);
  if (tourStartTimer) clearTimeout(tourStartTimer);
});

// Watch for multiple states to ensure tour starts reliably
watch(
  [
    () => authStore.hasCompletedTour,
    () => authStore.isAuthenticated,
    () => authStore.hasOrganizations,
    () => authStore.profileLoading,
    () => route.path,
  ],
  ([hasCompleted, isAuthenticated, hasOrganizations, profileLoading]) => {
    if (profileLoading) return;

    const isDashboardPath = route.path === "/" || route.path === "/dashboard";
    const hasDashboardElement = !!document.querySelector("#dashboard-stats");
    const isDashboard = isDashboardPath || hasDashboardElement;

    const localCompleted = authStore.user?.id
      ? localStorage.getItem(`accountiva_tour_completed_${authStore.user.id}`) === "true"
      : false;

    if (hasCompleted || localCompleted) {
      if (tourStartTimer) clearTimeout(tourStartTimer);
      isActive.value = false;
      return;
    }

    if (
      !hasCompleted &&
      !localCompleted &&
      isAuthenticated &&
      hasOrganizations &&
      !isActive.value &&
      isDashboard
    ) {
      currentStep.value = 0;
      if (tourStartTimer) clearTimeout(tourStartTimer);
      tourStartTimer = setTimeout(() => {
        const doubleCheckLocal = authStore.user?.id
          ? localStorage.getItem(`accountiva_tour_completed_${authStore.user.id}`) === "true"
          : false;
        if (!authStore.hasCompletedTour && !doubleCheckLocal) {
          isActive.value = true;
          nextTick(() => {
            updateSpotlight();
          });
        }
      }, 1000);
    }
  },
  { immediate: true }
);
</script>

<template>
  <teleport to="body">
    <div v-if="isActive" class="fixed inset-0 z-[999999] pointer-events-none overflow-hidden">
      <!-- Dark Overlay -->
      <div class="absolute inset-0 bg-background/80 backdrop-blur-[2px] transition-all duration-500"></div>

      <!-- Spotlight Hole -->
      <div 
        class="absolute pointer-events-auto transition-all duration-500 ease-in-out spotlight-hole"
        :style="spotlightStyle"
      ></div>

      <!-- Info Card -->
      <div 
        class="absolute w-[320px] pointer-events-auto transition-all duration-500 ease-in-out"
        :style="cardStyle"
      >
        <div class="bg-card border border-border/50 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-300">
          <!-- Step Indicator -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Sparkles class="w-4 h-4" />
              </div>
              <span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Step {{ currentStep + 1 }} of {{ steps.length }}
              </span>
            </div>
            <button type="button" @click="skipTour" class="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-2">
            <h3 class="text-lg font-bold text-foreground leading-tight">{{ steps[currentStep].title }}</h3>
            <p class="text-sm text-muted-foreground font-medium leading-relaxed">
              {{ steps[currentStep].content }}
            </p>
          </div>

          <!-- Progress Bar -->
          <div class="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div 
              class="h-full bg-primary transition-all duration-500" 
              :style="{ width: `${((currentStep + 1) / steps.length) * 100}%` }"
            ></div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <button type="button"
              @click="skipTour" 
              class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
            >
              Skip Tour
            </button>
            <div class="flex items-center gap-2">
              <Button 
                v-if="currentStep > 0"
                variant="outline" 
                size="icon" 
                @click="handleBack"
                class="h-9 w-9 rounded-xl border-border"
              >
                <ChevronLeft class="w-4 h-4" />
              </Button>
              <Button 
                @click="handleNext"
                class="h-9 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2"
              >
                {{ currentStep === steps.length - 1 ? 'Finish' : 'Next' }}
                <ChevronRight v-if="currentStep < steps.length - 1" class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.spotlight-hole {
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
}
</style>

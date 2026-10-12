<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useBreakpoints, breakpointsTailwind } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";
import {
  LayoutDashboard,
  FileText,
  ArrowLeftRight,
  Receipt,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Sparkles,
  Menu,
  X,
  Users,
  Package,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Briefcase,
  User as UserIcon,
  MoreVertical,
  Calculator,
  ShieldCheck,
  Lock,
  FileMinus,
  Landmark,
} from "lucide-vue-next";
import { useTheme } from "@/composables/useTheme";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions, type Module } from "@/composables/usePermissions";

const props = defineProps<{
  activeItem: string;
}>();

import OrganizationSwitcher from "@/components/OrganizationSwitcher.vue";

import { useSidebar } from "@/composables/useSidebar";

const authStore = useAuthStore();
const router = useRouter();

const isMobileOpen = ref(false);
const { isCollapsed, scrollTop } = useSidebar();
const sidebarNav = ref<HTMLElement | null>(null);
const breakpoints = useBreakpoints(breakpointsTailwind);
const isLargeScreen = breakpoints.greaterOrEqual("lg");
const { canView } = usePermissions();
const { currentOrganization } = storeToRefs(authStore);

import { isFeatureEnabled, type FeatureFlags } from "@/config/features";

interface SidebarSection {
  title: string;
  items: {
    name: string;
    icon: any;
    route: string;
    module?: Module;
    feature?: keyof FeatureFlags;
  }[];
}

const sidebarSections = computed<SidebarSection[]>(() => {
  const sections: SidebarSection[] = [
    {
      title: "General",
      items: [
        { name: "Dashboard", icon: LayoutDashboard, route: "/dashboard", feature: 'dashboard' },
      ],
    },
    {
      title: "Inventory",
      items: [{ name: "Items", icon: Package, route: "/products-and-services/items", module: 'items', feature: 'items' }],
    },
    {
      title: "Sales",
      items: [
        { name: "Customers", icon: Users, route: "/customers", module: 'customers', feature: 'customers' },
        { name: "Estimates", icon: Calculator, route: "/estimates", module: 'estimates', feature: 'estimates' },
        { name: "Invoices", icon: FileText, route: "/invoices", module: 'invoices', feature: 'invoices' },
        { name: "Credit Notes", icon: FileMinus, route: "/sales/credit-notes", module: 'invoices', feature: 'creditNotes' },
      ],
    },
    {
      title: "Purchases",
      items: [
        { name: "Vendors", icon: Users, route: "/vendors", module: 'expenses', feature: 'vendors' },
        { name: "Bills", icon: FileText, route: "/bills", module: 'expenses', feature: 'bills' },
        { name: "Expenses", icon: Receipt, route: "/expenses", module: 'expenses', feature: 'expenses' }
      ],
    },
    {
      title: "Accountant",
      items: [
        { name: "Banking", icon: Landmark, route: "/banking", module: 'banking', feature: 'banking' },
        { name: "Transactions", icon: ArrowLeftRight, route: "/transactions", module: 'banking', feature: 'transactions' },
        { name: "Journal Entries", icon: BookOpen, route: "/journals", module: 'journals', feature: 'journals' },
      ],
    },
    {
      title: "Analytics",
      items: [{ name: "Reports", icon: BarChart3, route: "/reports", module: 'reports', feature: 'reports' }],
    },
  ];

  
    if (authStore.isAdmin) {
      sections.push({
        title: "Admin",
        items: [{ name: "Admin", icon: ShieldCheck, route: "/admin" }],
      });
    }

    return sections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.feature && !isFeatureEnabled(item.feature)) return false;
      return !item.module || canView(item.module);
    })
  })).filter(section => section.items.length > 0);
});

const navigate = (route: string) => {
  if (sidebarNav.value) scrollTop.value = sidebarNav.value.scrollTop;
  isMobileOpen.value = false;
  router.push(route);
};

const handleSidebarScroll = () => {
  if (sidebarNav.value) scrollTop.value = sidebarNav.value.scrollTop;
};

onMounted(() => {
  void nextTick(() => {
    if (sidebarNav.value) sidebarNav.value.scrollTop = scrollTop.value;
  });
});

onBeforeUnmount(handleSidebarScroll);

const toggleMobileMenu = () => {
  isMobileOpen.value = !isMobileOpen.value;
};

const getSectionKey = (title: string) => {
  if (title === "Project Management") return "projectManagement";
  return title.toLowerCase();
};

const getItemKey = (name: string) => {
  if (name === "Journal Entries") return "journals";
  if (name === "Credit Notes") return "creditNotes";
  return name.toLowerCase();
};
</script>

<template>
  <!-- Mobile Menu Toggle Button -->
  <button type="button"
    @click="toggleMobileMenu"
    class="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center transform active:scale-95 outline-none"
  >
    <Menu v-if="!isMobileOpen" class="w-6 h-6" />
    <X v-else class="w-6 h-6" />
  </button>

  <!-- Sidebar Container -->
  <aside
    id="sidebar"
    :class="[
      'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-full lg:shrink-0 lg:translate-x-0',
      isMobileOpen ? 'translate-x-0' : '-translate-x-full',
      isCollapsed ? 'w-20' : 'w-56',
    ]"
  >
    <!-- Collapse Toggle (Desktop only) -->
    <button type="button"
      v-show="isLargeScreen || isMobileOpen"
      @click="isCollapsed = !isCollapsed"
      class="absolute -right-3 top-20 w-6 h-6 bg-sidebar border border-sidebar-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground z-50 transition-transform duration-300"
      :class="{ 'rotate-180': isCollapsed }"
    >
      <ChevronRight class="w-3.5 h-3.5" />
    </button>

    <!-- Organization Switcher -->
    <div class="py-2 px-2 border-b border-sidebar-border/80 transition-all duration-300 shrink-0">
      <OrganizationSwitcher :is-collapsed="isCollapsed" />
    </div>

    <!-- Navigation -->
    <nav
      id="sidebar-nav"
      ref="sidebarNav"
      class="flex-1 overflow-y-auto px-2 py-2 space-y-5 custom-scrollbar"
      @scroll.passive="handleSidebarScroll"
    >
      <div
        v-for="section in sidebarSections"
        :key="section.title"
        class="space-y-1"
      >
        <h3
          v-show="!isCollapsed"
          class="px-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mb-2 transition-opacity duration-300"
          :class="isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'"
        >
          {{ $t('sidebar.sections.' + getSectionKey(section.title)) }}
        </h3>
        <div v-show="isCollapsed" class="h-px bg-sidebar-border/80 mx-2 my-4"></div>

        <button type="button"
          v-for="item in section.items"
          :key="item.name"
          @click="navigate(item.route)"
          :class="[
            'w-full flex items-center rounded-xl group text-left transition-all duration-200 border',
            isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-2.5 py-2',
            activeItem === item.name
              ? 'bg-primary/12 text-primary border-primary/25 font-semibold shadow-2xs'
              : 'border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60',
          ]"
          :title="isCollapsed ? $t('sidebar.' + getItemKey(item.name)) : ''"
        >
          <component
            :is="item.icon"
            :class="[
              'w-4 h-4 shrink-0 transition-colors',
              activeItem === item.name
                ? 'text-primary'
                : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground',
            ]"
          />
          <span
            v-show="!isCollapsed"
            class="text-sm font-medium truncate transition-opacity duration-200"
            :class="isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'"
            >{{ $t('sidebar.' + getItemKey(item.name)) }}</span
          >
          <ChevronRight
            v-show="activeItem === item.name && !isCollapsed"
            class="w-3.5 h-3.5 ml-auto text-primary/70 transition-opacity duration-200"
          />
        </button>
      </div>
    </nav>

  </aside>

  <!-- Mobile Overlay -->
  <transition name="fade">
    <div
      v-if="isMobileOpen"
      @click="isMobileOpen = false"
      class="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
    ></div>
  </transition>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: var(--muted-foreground);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

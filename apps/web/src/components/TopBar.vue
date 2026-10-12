<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSidebar } from "@/composables/useSidebar";
import { useAccountivaLogo } from "@/composables/useAccountivaLogo";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useQuickCreateStore } from "@/stores/quickCreateStore";
import {
  HelpCircle,
  Search,
  Settings,
  Plus,
  Bell,
  FileText,
  Receipt,
  Users,
  Calculator,
  Briefcase,
  ChevronRight,
  ChevronDown,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserProfile from "./UserProfile.vue";
import GlobalSearch from "./GlobalSearch.vue";
import BookmarksCenter from "./BookmarksCenter.vue";

const { isCollapsed } = useSidebar();
const { accountivaLogoSrc } = useAccountivaLogo();
const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();
const notificationStore = useNotificationStore();
const quickCreateStore = useQuickCreateStore();
const searchRef = ref<any>(null);

const getBreadcrumbLabel = (label: string) => {
  const map: Record<string, string> = {
    "General": "sidebar.sections.general",
    "Inventory": "sidebar.sections.inventory",
    "Project Management": "sidebar.sections.projectManagement",
    "Sales": "sidebar.sections.sales",
    "Purchases": "sidebar.sections.purchases",
    "Accountant": "sidebar.sections.accountant",
    "Analytics": "sidebar.sections.analytics",
    "Settings": "sidebar.sections.admin",
    "Dashboard": "sidebar.dashboard",
    "Items": "sidebar.items",
    "Customers": "sidebar.customers",
    "Estimates": "sidebar.estimates",
    "Invoices": "sidebar.invoices",
    "Vendors": "sidebar.vendors",
    "Bills": "sidebar.bills",
    "Expenses": "sidebar.expenses",
    "Transactions": "sidebar.transactions",
    "Journal Entries": "sidebar.journals",
    "Reports": "sidebar.reports",
    "Preferences": "sidebar.settings",
    "Notifications": "settings.sections.notifications",
    "Organization": "topbar.orgSettings",
    "App": "topbar.app",
    "Profile": "topbar.profile"
  };
  return map[label] ? t(map[label]) : label;
};

const quickCreate = (action: 'invoice' | 'expense' | 'customer' | 'estimate', path: string) => {
  quickCreateStore.trigger(action);
  if (router.currentRoute.value.path !== path) {
    router.push(path);
  }
};

import { isFeatureEnabled, type FeatureFlags } from "@/config/features";

const canCreate = (module: string) => {
  const feat = module as keyof FeatureFlags;
  if (feat && !isFeatureEnabled(feat)) return false;
  const org = authStore.currentOrganization;
  if (!org) return false;
  if (org.role === 'owner' || org.role === 'admin') return true;
  const perms = org.permissions?.[module] || [];
  return perms.includes('create');
};

const hasAnyQuickAction = computed(() => {
  return canCreate('invoices') || 
         canCreate('expenses') || 
         canCreate('customers') || 
         canCreate('estimates');
});

onMounted(() => {
  notificationStore.fetchNotifications();
});

const route = useRoute();

interface BreadcrumbItem {
  label: string;
  route?: string;
  isLast: boolean;
}

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const path = route.path;
  const list: BreadcrumbItem[] = [];

  const pathMap: Record<string, { category: string; label: string }> = {
    "/dashboard": { category: "General", label: "Dashboard" },
    "/items": { category: "Inventory", label: "Items" },
    "/customers": { category: "Sales", label: "Customers" },
    "/estimates": { category: "Sales", label: "Estimates" },
    "/invoices": { category: "Sales", label: "Invoices" },
    "/vendors": { category: "Purchases", label: "Vendors" },
    "/bills": { category: "Purchases", label: "Bills" },
    "/expenses": { category: "Purchases", label: "Expenses" },
    "/transactions": { category: "Accountant", label: "Transactions" },
    "/journals": { category: "Accountant", label: "Journal Entries" },
    "/reports": { category: "Analytics", label: "Reports" },
    "/settings": { category: "Settings", label: "Preferences" },
    "/notifications": { category: "Workspace", label: "Notifications" },
    "/organization-settings": { category: "Settings", label: "Organization" },
  };

  if (pathMap[path]) {
    const entry = pathMap[path];
    list.push({ label: entry.category, isLast: false });
    list.push({ label: entry.label, isLast: true });
  } else if (path.startsWith("/customers/")) {
    list.push({ label: "Sales", isLast: false });
    list.push({ label: "Customers", route: "/customers", isLast: false });
    list.push({ label: "Profile", isLast: true });
  } else {
    const title = (route.meta.title as string) || (route.name as string) || "System";
    list.push({ label: "App", isLast: false });
    list.push({ label: title, isLast: true });
  }

  return list;
});

const handleHelpClick = async () => {
  if (router.currentRoute.value.path !== "/dashboard") {
    await router.push("/dashboard");
  }
  authStore.hasCompletedTour = false;
};
</script>

<template>
  <header
    class="h-14 w-full border-b border-sidebar-border bg-sidebar flex items-center justify-between z-40 relative select-none"
  >
    <!-- Logo Box (Logo mark only on mobile, full brand on desktop) -->
    <div
      :class="[
        'h-full flex items-center shrink-0 overflow-hidden justify-center transition-all duration-300 ease-in-out',
        isCollapsed 
          ? 'w-10 md:w-20 md:border-r border-sidebar-border' 
          : 'w-10 md:w-56 md:border-r border-sidebar-border md:justify-start md:pl-5 gap-3',
      ]"
    >
      <div class="w-8 h-8 shrink-0 flex items-center justify-center">
        <img
          :src="accountivaLogoSrc"
          alt="Accountiva"
          class="w-8 h-8 object-contain"
        />
      </div>
      <span
        v-show="!isCollapsed"
        class="hidden md:inline truncate pr-3 text-sm font-extrabold uppercase tracking-[0.08em] text-foreground/95 select-none transition-opacity duration-200"
        title="Accountiva"
        style="font-family: 'Outfit', 'Inter', sans-serif;"
      >
        Accountiva
      </span>
    </div>

    <!-- Dynamic Breadcrumbs -->
    <div class="flex items-center gap-1.5 ml-3 md:ml-4 text-xs font-semibold text-muted-foreground select-none">
      <div v-for="(item, index) in breadcrumbs" :key="index" class="flex items-center gap-1.5">
        <ChevronRight v-if="index > 0" class="hidden sm:inline-block w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
        
        <router-link
          v-if="item.route"
          :to="item.route"
          class="hidden sm:inline hover:text-foreground transition-colors cursor-pointer text-muted-foreground/75"
        >
          {{ getBreadcrumbLabel(item.label) }}
        </router-link>
        <span
          v-else
          :class="[
            item.isLast 
              ? 'text-foreground font-black text-[13px] tracking-tight' 
              : 'hidden sm:inline text-muted-foreground/50 font-bold'
          ]"
        >
          {{ getBreadcrumbLabel(item.label) }}
        </span>
      </div>
    </div>

    <!-- Center space (flexible spacer) -->
    <div class="flex-1"></div>

    <!-- Right-side actions -->
    <div class="flex-shrink-0 h-full flex items-center justify-end px-3 md:px-4 gap-1 md:gap-1.5">
      <!-- Quick Create Dropdown -->
      <DropdownMenu v-if="hasAnyQuickAction">
        <DropdownMenuTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="h-8 gap-1.5 px-2.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
          >
            <Plus class="w-3.5 h-3.5 shrink-0" />
            <span class="hidden md:inline tracking-tight text-[11.5px] font-bold">{{ $t('topbar.new') }}</span>
            <ChevronDown class="w-3 h-3 opacity-55 shrink-0 hidden md:inline -ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-52 rounded-xl p-1.5 shadow-lg border-border bg-popover text-popover-foreground">
          <DropdownMenuLabel class="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">{{ $t('topbar.quickAction') }}</DropdownMenuLabel>
          <DropdownMenuItem v-if="canCreate('invoices')" @click="quickCreate('invoice', '/invoices')" class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground text-xs font-medium transition-colors">
            <div class="w-6 h-6 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center text-primary shrink-0">
              <FileText class="w-3.5 h-3.5" />
            </div>
            {{ $t('topbar.createInvoice') }}
          </DropdownMenuItem>
          <DropdownMenuItem v-if="canCreate('expenses')" @click="quickCreate('expense', '/expenses')" class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground text-xs font-medium transition-colors">
            <div class="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/15 flex items-center justify-center text-rose-600 shrink-0">
              <Receipt class="w-3.5 h-3.5" />
            </div>
            {{ $t('topbar.recordExpense') }}
          </DropdownMenuItem>
          <DropdownMenuItem v-if="canCreate('customers')" @click="quickCreate('customer', '/customers')" class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground text-xs font-medium transition-colors">
            <div class="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0">
              <Users class="w-3.5 h-3.5" />
            </div>
            {{ $t('topbar.addCustomer') }}
          </DropdownMenuItem>
          <DropdownMenuItem v-if="canCreate('estimates')" @click="quickCreate('estimate', '/estimates')" class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground text-xs font-medium transition-colors">
            <div class="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/15 flex items-center justify-center text-sky-600 shrink-0">
              <Calculator class="w-3.5 h-3.5" />
            </div>
            {{ $t('topbar.addEstimate') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- Separator before icon buttons -->
      <div class="hidden md:block w-px h-4 bg-sidebar-border mx-0.5"></div>
      <!-- Search Trigger -->
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
        :title="$t('topbar.searchWorkspace')"
        @click="searchRef?.openSearch()"
      >
        <Search class="w-4 h-4" />
      </Button>

      <!-- Bookmarks Center Trigger -->
      <BookmarksCenter />

      <!-- Help Trigger -->
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
        :title="$t('topbar.helpAndTour')"
        @click="handleHelpClick"
      >
        <HelpCircle class="w-4 h-4" />
      </Button>

      <!-- Notification Center Trigger -->
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 relative"
        :title="$t('settings.sections.notifications')"
        @click="router.push('/notifications')"
      >
        <Bell class="w-4 h-4" />
        <span
          v-if="notificationStore.unreadCount > 0"
          class="absolute -top-1 -right-1 min-w-[15px] h-3.5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center px-0.5 ring-2 ring-sidebar select-none"
        >
          {{ notificationStore.unreadCount > 9 ? '9+' : notificationStore.unreadCount }}
        </span>
      </Button>

      <!-- Settings Trigger -->
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
        :title="$t('sidebar.settings')"
        @click="router.push('/settings')"
      >
        <Settings class="w-4 h-4" />
      </Button>

      <UserProfile variant="topbar" />
    </div>

    <!-- Central Command Search Dialog -->
    <GlobalSearch ref="searchRef" />
  </header>
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
</style>

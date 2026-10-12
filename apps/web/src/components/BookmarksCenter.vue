<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { onClickOutside } from "@vueuse/core";
import { useBookmarkStore, type Bookmark } from "@/stores/bookmarkStore";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  Bookmark as BookmarkIcon,
  BookmarkX,
  Search,
  X,
  FileText,
  Receipt,
  Users,
  Calculator,
  BarChart3,
  BookOpen,
  Package,
  ArrowUpRight,
  Trash2,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const router = useRouter();
const bookmarkStore = useBookmarkStore();
const authStore = useAuthStore();

const isOpen = ref(false);
const panelRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const searchQuery = ref("");
const activeTab = ref<string>("all");

// Close on click outside
onClickOutside(panelRef, (event) => {
  if (triggerRef.value && triggerRef.value.contains(event.target as Node)) {
    return;
  }
  closePanel();
});

// Close on Escape key
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && isOpen.value) {
    closePanel();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  if (authStore.currentOrganization?.id) {
    bookmarkStore.fetchBookmarks();
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});

// Watch for workspace / organization changes to switch data immediately
watch(
  () => authStore.currentOrganization?.id,
  (newOrgId, oldOrgId) => {
    if (newOrgId && newOrgId !== oldOrgId) {
      bookmarkStore.reset();
      bookmarkStore.fetchBookmarks(true);
    }
  }
);

const togglePanel = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    searchQuery.value = "";
    bookmarkStore.fetchBookmarks(true);
  }
};

const closePanel = () => {
  isOpen.value = false;
};

// Clean subtitle helper to prevent duplicated status text
const getCleanSubtitle = (item: Bookmark): string => {
  if (item.metadata?.customerName) return item.metadata.customerName;
  if (item.metadata?.vendorName) return item.metadata.vendorName;
  if (!item.subtitle) return "";

  // If subtitle previously stored as "Customer • Draft", strip the status suffix
  const parts = item.subtitle.split(" • ");
  if (
    parts.length > 1 &&
    item.metadata?.status &&
    parts[parts.length - 1].toLowerCase() === item.metadata.status.toLowerCase()
  ) {
    return parts.slice(0, -1).join(" • ");
  }

  return item.subtitle;
};

const getTabCount = (tabId: string) => {
  if (tabId === "all") return bookmarkStore.bookmarks.length;
  if (tabId === "other") {
    return bookmarkStore.bookmarks.filter(
      (b) => !["invoice", "expense", "bill", "estimate"].includes(b.entity_type)
    ).length;
  }
  return bookmarkStore.bookmarks.filter((b) => b.entity_type === tabId).length;
};

// Dynamically compute tabs: only show categories that actually have bookmarks (> 0)
const visibleTabs = computed(() => {
  const allTabs = [
    { id: "all", label: "All" },
    { id: "invoice", label: "Invoices" },
    { id: "expense", label: "Expenses" },
    { id: "bill", label: "Bills" },
    { id: "estimate", label: "Estimates" },
    { id: "other", label: "Others" },
  ];

  // If no bookmarks at all, just return All
  if (bookmarkStore.bookmarks.length === 0) {
    return [{ id: "all", label: "All" }];
  }

  // Otherwise return All + tabs with count > 0
  return allTabs.filter((tab) => tab.id === "all" || getTabCount(tab.id) > 0);
});

// Auto-reset activeTab to "all" if current tab category count becomes 0
watch(
  () => visibleTabs.value,
  (tabs) => {
    if (!tabs.some((t) => t.id === activeTab.value)) {
      activeTab.value = "all";
    }
  }
);

const filteredBookmarks = computed(() => {
  let list = bookmarkStore.bookmarks;

  // Filter by Tab
  if (activeTab.value !== "all") {
    if (activeTab.value === "other") {
      list = list.filter(
        (b) => !["invoice", "expense", "bill", "estimate"].includes(b.entity_type)
      );
    } else {
      list = list.filter((b) => b.entity_type === activeTab.value);
    }
  }

  // Filter by Search Query
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.subtitle && b.subtitle.toLowerCase().includes(q)) ||
        b.entity_type.toLowerCase().includes(q) ||
        (b.metadata?.status && String(b.metadata.status).toLowerCase().includes(q)) ||
        (b.metadata?.customerName && String(b.metadata.customerName).toLowerCase().includes(q)) ||
        (b.metadata?.vendorName && String(b.metadata.vendorName).toLowerCase().includes(q))
    );
  }

  return list;
});

const getEntityConfig = (type: string) => {
  switch (type) {
    case "invoice":
      return {
        label: "Invoice",
        icon: FileText,
        bgClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
      };
    case "expense":
      return {
        label: "Expense",
        icon: Receipt,
        bgClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
      };
    case "bill":
      return {
        label: "Bill",
        icon: FileText,
        bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
      };
    case "estimate":
      return {
        label: "Estimate",
        icon: Calculator,
        bgClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
        badgeClass: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
      };
    case "customer":
    case "vendor":
      return {
        label: type === "customer" ? "Customer" : "Vendor",
        icon: Users,
        bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
      };
    case "journal":
      return {
        label: "Journal",
        icon: BookOpen,
        bgClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
      };
    case "report":
      return {
        label: "Report",
        icon: BarChart3,
        bgClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
      };
    default:
      return {
        label: "Item",
        icon: Package,
        bgClass: "bg-muted text-muted-foreground border-border",
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
  }
};

const getStatusBadgeClass = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "paid" || s === "approved" || s === "completed") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
  }
  if (s === "draft") {
    return "bg-muted text-muted-foreground border-border/70";
  }
  if (s === "outstanding" || s === "pending" || s === "open" || s === "sent") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25";
  }
  if (s === "overdue" || s === "cancelled" || s === "void") {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25";
  }
  return "bg-muted text-muted-foreground border-border/70";
};

const handleNavigate = (bookmark: Bookmark) => {
  closePanel();
  if (bookmark.route) {
    router.push(bookmark.route);
  }
};

const handleRemove = (event: MouseEvent, id: string) => {
  event.stopPropagation();
  bookmarkStore.removeBookmark(id);
};

const handleClearAll = async () => {
  if (confirm("Are you sure you want to remove all saved bookmarks?")) {
    await bookmarkStore.clearAll();
  }
};
</script>

<template>
  <div class="relative">
    <!-- Trigger Button in TopBar -->
    <Button
      ref="triggerRef"
      variant="ghost"
      size="icon"
      :class="[
        'h-8 w-8 rounded-lg relative transition-all duration-150',
        isOpen
          ? 'bg-muted text-foreground ring-1 ring-border'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
      ]"
      title="Bookmarks"
      @click="togglePanel"
    >
      <BookmarkIcon
        :class="[
          'w-4 h-4 transition-colors stroke-[2]',
          bookmarkStore.totalCount > 0 ? 'text-primary' : 'text-muted-foreground',
        ]"
      />
      <!-- Active count badge -->
      <span
        v-if="bookmarkStore.totalCount > 0"
        class="absolute -top-1 -right-1 min-w-[15px] h-3.5 rounded-full bg-primary text-primary-foreground font-bold text-[9px] flex items-center justify-center px-1 ring-2 ring-sidebar select-none shadow-2xs"
      >
        {{ bookmarkStore.totalCount > 99 ? "99+" : bookmarkStore.totalCount }}
      </span>
    </Button>

    <!-- Popover Drawer / Dropdown Panel -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-98"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-98"
    >
      <div
        v-if="isOpen"
        ref="panelRef"
        class="absolute right-0 mt-2 w-[350px] sm:w-[420px] rounded-xl bg-popover text-popover-foreground border border-border shadow-xl z-50 overflow-hidden flex flex-col max-h-[540px] select-none"
      >
        <!-- Panel Header -->
        <div class="px-4 py-3 border-b border-border/70 flex items-center justify-between bg-card/60">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BookmarkIcon class="w-3.5 h-3.5 text-primary stroke-[2]" />
            </div>
            <h3 class="text-xs font-semibold tracking-tight text-foreground">Bookmarks</h3>
            <span
              v-if="bookmarkStore.totalCount > 0"
              class="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground border border-border/60"
            >
              {{ bookmarkStore.totalCount }}
            </span>
          </div>

          <button
            type="button"
            @click="closePanel"
            class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            title="Close (Esc)"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Search & Filter Controls -->
        <div class="p-3 border-b border-border/50 bg-background/50 space-y-2.5">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <Input
              v-model="searchQuery"
              placeholder="Search by title, contact, or status..."
              class="h-8 pl-8 pr-7 text-xs bg-muted/40 focus:bg-background border-border/60 rounded-md shadow-none"
            />
            <button
              v-if="searchQuery"
              type="button"
              @click="searchQuery = ''"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X class="w-3 h-3" />
            </button>
          </div>

          <!-- Dynamic Tabs (Only renders categories with > 0 items) -->
          <div v-if="visibleTabs.length > 1" class="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
            <button
              v-for="tab in visibleTabs"
              :key="tab.id"
              type="button"
              @click="activeTab = tab.id"
              :class="[
                'px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/30',
              ]"
            >
              <span>{{ tab.label }}</span>
              <span
                :class="[
                  'text-[10px] px-1.5 py-0.2 rounded-full font-semibold',
                  activeTab === tab.id
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-background/80 text-muted-foreground border border-border/40',
                ]"
              >
                {{ getTabCount(tab.id) }}
              </span>
            </button>
          </div>
        </div>

        <!-- Bookmarks List -->
        <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-[160px] max-h-[350px]">
          <div
            v-for="item in filteredBookmarks"
            :key="item.id"
            @click="handleNavigate(item)"
            class="group p-2.5 rounded-lg border border-border/30 hover:border-border/80 hover:bg-muted/50 cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 relative"
          >
            <!-- Left: Module Icon -->
            <div
              :class="[
                'w-8 h-8 rounded-lg border flex items-center justify-center shrink-0',
                getEntityConfig(item.entity_type).bgClass,
              ]"
            >
              <component :is="getEntityConfig(item.entity_type).icon" class="w-4 h-4" />
            </div>

            <!-- Center: Record Details -->
            <div class="min-w-0 flex-1 space-y-0.5">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {{ item.title }}
                </span>
                <span
                  :class="[
                    'text-[9px] font-medium px-1.5 py-0.2 rounded border capitalize tracking-normal shrink-0',
                    getEntityConfig(item.entity_type).badgeClass,
                  ]"
                >
                  {{ getEntityConfig(item.entity_type).label }}
                </span>
              </div>

              <!-- Clean Customer/Vendor/Context Line -->
              <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                <span v-if="getCleanSubtitle(item)" class="truncate font-medium text-muted-foreground">
                  {{ getCleanSubtitle(item) }}
                </span>
                <span v-if="getCleanSubtitle(item) && (item.metadata?.date || item.created_at)" class="text-muted-foreground/30">•</span>
                <span v-if="item.metadata?.date || item.created_at" class="shrink-0 text-muted-foreground/70 text-[10px]">
                  {{ formatDate(item.metadata?.date || item.created_at) }}
                </span>
              </div>
            </div>

            <!-- Right: Amount & Status Badge -->
            <div class="flex items-center gap-2 shrink-0">
              <div class="text-right space-y-0.5">
                <div
                  v-if="item.metadata?.amount !== undefined && item.metadata?.amount !== null && item.metadata?.amount !== ''"
                  class="text-xs font-bold text-foreground font-mono tabular-nums tracking-tight"
                >
                  {{ formatCurrency(Number(item.metadata.amount)) }}
                </div>
                <div v-if="item.metadata?.status">
                  <span
                    :class="[
                      'text-[9px] font-medium px-1.5 py-0.2 rounded border capitalize inline-block',
                      getStatusBadgeClass(item.metadata.status),
                    ]"
                  >
                    {{ item.metadata.status }}
                  </span>
                </div>
              </div>

              <!-- Quick Unpin Button -->
              <button
                type="button"
                @click="handleRemove($event, item.id)"
                class="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-150"
                title="Remove bookmark"
              >
                <BookmarkX class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Empty State: 0 bookmarks total -->
          <div
            v-if="bookmarkStore.bookmarks.length === 0"
            class="py-12 text-center flex flex-col items-center justify-center px-6 space-y-2.5"
          >
            <div class="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground/60">
              <BookmarkIcon class="w-5 h-5" />
            </div>
            <div class="space-y-1 max-w-[240px]">
              <h4 class="text-xs font-semibold text-foreground">No bookmarks saved</h4>
              <p class="text-[11px] text-muted-foreground leading-relaxed">
                Bookmark key records from invoices, expenses, or bills to quickly access them here.
              </p>
            </div>
          </div>

          <!-- Empty State: Filter/search yielded nothing -->
          <div
            v-else-if="filteredBookmarks.length === 0"
            class="py-8 text-center flex flex-col items-center justify-center px-4 space-y-1"
          >
            <p class="text-xs font-medium text-foreground">No matching bookmarks found</p>
            <p class="text-[11px] text-muted-foreground">
              Try adjusting your search query or category filter.
            </p>
          </div>
        </div>

        <!-- Clean Shadcn Footer (No 'AI'ish' slogans or sparkles) -->
        <div class="px-3.5 py-2.5 border-t border-border/50 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-primary/70"></span>
            <span>
              {{ filteredBookmarks.length }} {{ filteredBookmarks.length === 1 ? "record" : "records" }}
            </span>
          </div>

          <div class="flex items-center gap-2 text-[10px]">
            <button
              v-if="bookmarkStore.totalCount > 0"
              type="button"
              @click="handleClearAll"
              class="text-muted-foreground hover:text-destructive transition-colors font-medium cursor-pointer"
            >
              Clear all
            </button>
            <span v-if="bookmarkStore.totalCount > 0" class="text-border">•</span>
            <span class="text-muted-foreground/70">
              Press <kbd class="px-1 py-0.5 text-[9px] font-mono font-semibold bg-background border border-border/60 rounded shadow-2xs">Esc</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}
</style>

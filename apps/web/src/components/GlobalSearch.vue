<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import {
  FileText,
  Receipt,
  Users,
  Package,
  Briefcase,
  FileSignature,
  ArrowRight,
  Settings,
  Bookmark as BookmarkIcon,
} from "lucide-vue-next";

// Import Shadcn Command Components
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

// Import stores
import { useInvoiceStore } from "@/stores/invoiceStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { useItemStore } from "@/stores/itemStore";
import { useVendorStore } from "@/stores/vendorStore";
import { useEstimateStore } from "@/stores/estimateStore";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { formatCurrency } from "@/utils/formatters";

const router = useRouter();

const invoiceStore = useInvoiceStore();
const customerStore = useCustomerStore();
const expenseStore = useExpenseStore();
const itemStore = useItemStore();
const vendorStore = useVendorStore();
const estimateStore = useEstimateStore();
const bookmarkStore = useBookmarkStore();

const searchQuery = ref("");
const isOpen = ref(false);
const isDataLoading = ref(false);

import { isFeatureEnabled, type FeatureFlags } from "@/config/features";

const allQuickLinks = [
  { name: "Dashboard", route: "/dashboard", icon: Briefcase, feature: "dashboard" as keyof FeatureFlags },
  { name: "Invoices", route: "/invoices", icon: FileText, feature: "invoices" as keyof FeatureFlags },
  { name: "Expenses", route: "/expenses", icon: Receipt, feature: "expenses" as keyof FeatureFlags },
  { name: "Customers", route: "/customers", icon: Users, feature: "customers" as keyof FeatureFlags },
  { name: "Estimates", route: "/estimates", icon: FileSignature, feature: "estimates" as keyof FeatureFlags },
  { name: "Settings", route: "/settings", icon: Settings },
];

const quickLinks = computed(() => {
  return allQuickLinks.filter((link) => !link.feature || isFeatureEnabled(link.feature));
});

const loadAllData = async () => {
  if (isDataLoading.value) return;
  isDataLoading.value = true;
  try {
    const promises: Promise<any>[] = [];
    if (isFeatureEnabled('invoices')) promises.push(invoiceStore.fetchInvoices(1, 100, "", "All", false));
    if (isFeatureEnabled('customers')) promises.push(customerStore.fetchCustomers(1, 100, "", false));
    if (isFeatureEnabled('expenses')) promises.push(expenseStore.fetchExpenses(1, 100, "", false));
    if (isFeatureEnabled('items')) promises.push(itemStore.fetchItems(1, 100, "", false));
    if (isFeatureEnabled('vendors')) promises.push(vendorStore.fetchVendors(false));
    if (isFeatureEnabled('estimates')) promises.push(estimateStore.fetchEstimates(1, 100, "", "All", false));
    await Promise.allSettled(promises);
  } catch (e) {
    console.error("Failed to pre-fetch search index", e);
  } finally {
    isDataLoading.value = false;
  }
};

const openSearch = () => {
  isOpen.value = true;
  searchQuery.value = "";
  loadAllData();
};

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: "Invoice" | "Customer" | "Expense" | "Item" | "Project" | "Vendor" | "Estimate";
  route: string;
  badgeColor: string;
  icon: any;
  isBookmarked?: boolean;
}

const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return [];

  const results: SearchResult[] = [];

  // 1. Invoices
  if (isFeatureEnabled('invoices')) {
    invoiceStore.invoices.forEach((inv) => {
      if (
        inv.invoiceNumber.toLowerCase().includes(query) ||
        (inv.status && inv.status.toLowerCase().includes(query))
      ) {
        results.push({
          id: inv.id,
          title: inv.invoiceNumber,
          subtitle: `Amount: ${formatCurrency(inv.amount)} • Status: ${inv.status}`,
          type: "Invoice",
          route: "/invoices",
          badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
          icon: FileText,
          isBookmarked: bookmarkStore.isBookmarked("invoice", inv.id),
        });
      }
    });
  }

  // 2. Customers
  if (isFeatureEnabled('customers')) {
    customerStore.customers.forEach((c) => {
      if (
        c.name.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query))
      ) {
        results.push({
          id: c.id,
          title: c.name,
          subtitle: c.email || "No email registered",
          type: "Customer",
          route: "/customers",
          badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
          icon: Users,
        });
      }
    });
  }

  // 3. Expenses
  if (isFeatureEnabled('expenses')) {
    expenseStore.expenses.forEach((exp) => {
      if (
        exp.expenseAccount.toLowerCase().includes(query) ||
        (exp.vendor && exp.vendor.toLowerCase().includes(query)) ||
        (exp.notes && exp.notes.toLowerCase().includes(query))
      ) {
        results.push({
          id: exp.id,
          title: exp.expenseAccount,
          subtitle: `Amount: ${formatCurrency(exp.amount)} ${
            exp.vendor ? `• Vendor: ${exp.vendor}` : ""
          }`,
          type: "Expense",
          route: "/expenses",
          badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20",
          icon: Receipt,
          isBookmarked: bookmarkStore.isBookmarked("expense", exp.id),
        });
      }
    });
  }

  // 4. Items
  if (isFeatureEnabled('items')) {
    itemStore.items.forEach((item) => {
      if (
        item.name.toLowerCase().includes(query) ||
        (item.sku && item.sku.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query))
      ) {
        results.push({
          id: item.id,
          title: item.name,
          subtitle: `SKU: ${item.sku || "N/A"} • Price: ${formatCurrency(item.unitPrice)}`,
          type: "Item",
          route: "/items",
          badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
          icon: Package,
        });
      }
    });
  }

  // 6. Vendors
  if (isFeatureEnabled('vendors')) {
    vendorStore.vendors.forEach((v) => {
      if (
        v.name.toLowerCase().includes(query) ||
        (v.email && v.email.toLowerCase().includes(query))
      ) {
        results.push({
          id: v.id,
          title: v.name,
          subtitle: v.email || "No email registered",
          type: "Vendor",
          route: "/vendors",
          badgeColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
          icon: Users,
        });
      }
    });
  }

  // 7. Estimates
  if (isFeatureEnabled('estimates')) {
    estimateStore.estimates.forEach((est) => {
      if (
        est.estimateNumber.toLowerCase().includes(query) ||
        (est.status && est.status.toLowerCase().includes(query))
      ) {
        results.push({
          id: est.id,
          title: est.estimateNumber,
          subtitle: `Amount: ${formatCurrency(est.amount)} • Status: ${est.status}`,
          type: "Estimate",
          route: "/estimates",
          badgeColor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
          icon: FileSignature,
        });
      }
    });
  }

  return results.slice(0, 8); // Top 8 matches
});

const handleSelectResult = (result: SearchResult) => {
  searchQuery.value = "";
  isOpen.value = false;
  router.push(result.route);
};

const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    openSearch();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});

defineExpose({
  openSearch,
});
</script>

<template>
  <CommandDialog v-model:open="isOpen">
    <!-- Command Input -->
    <CommandInput
      v-model="searchQuery"
      placeholder="Type to search invoices, customers, expenses..."
      @focus="loadAllData"
    />

    <!-- Command Content List -->
    <CommandList class="max-h-[380px] overflow-y-auto custom-scrollbar p-2">
      <!-- Loading State -->
      <div v-if="isDataLoading" class="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
        <span class="animate-pulse">Searching your workspace...</span>
      </div>

      <template v-else>
        <!-- Empty State -->
        <CommandEmpty v-if="searchQuery.trim().length > 0 && searchResults.length === 0" class="py-12 text-center text-xs text-muted-foreground">
          <span class="text-sm font-bold text-muted-foreground block mb-1">No matches found</span>
          <span class="text-xs text-muted-foreground/60">We couldn't find any items matching "{{ searchQuery }}"</span>
        </CommandEmpty>

        <!-- Dynamic Results Group -->
        <CommandGroup v-if="searchResults.length > 0" heading="Search Results">
          <CommandItem
            v-for="result in searchResults"
            :key="result.type + '-' + result.id"
            :value="result.title + ' ' + result.subtitle + ' ' + result.type"
            @select="handleSelectResult(result)"
            class="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/50 text-left transition-colors group cursor-pointer"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border/50 text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                <component :is="result.icon" class="w-4 h-4" />
              </div>
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {{ result.title }}
                  </span>
                  <BookmarkIcon v-if="result.isBookmarked" class="w-3 h-3 text-amber-500 shrink-0" />
                </div>
                <span class="text-[10px] text-muted-foreground truncate">
                  {{ result.subtitle }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span
                class="px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest"
                :class="result.badgeColor"
              >
                {{ result.type }}
              </span>
              <ArrowRight class="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </div>
          </CommandItem>
        </CommandGroup>

        <!-- Pinned Bookmarked Shortcuts -->
        <CommandGroup v-if="!searchQuery.trim() && bookmarkStore.bookmarks.length > 0" heading="Bookmarked Shortcuts">
          <div class="space-y-1 pt-1 mb-2">
            <CommandItem
              v-for="b in bookmarkStore.bookmarks.slice(0, 4)"
              :key="'bm-' + b.id"
              :value="b.title + ' ' + (b.subtitle || '') + ' ' + b.entity_type"
              @select="router.push(b.route); isOpen = false;"
              class="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted/70 text-left transition-all group cursor-pointer"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                  <BookmarkIcon class="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {{ b.title }}
                  </span>
                  <span v-if="b.subtitle" class="text-[10px] text-muted-foreground truncate">
                    {{ b.subtitle }}
                  </span>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-full border border-border/50 text-[8px] font-bold uppercase tracking-wider bg-muted/50 text-muted-foreground">
                {{ b.entity_type }}
              </span>
            </CommandItem>
          </div>
        </CommandGroup>

        <!-- Default Quick Navigation Links -->
        <CommandGroup v-if="!searchQuery.trim()" heading="Quick Navigation">
          <div class="grid grid-cols-2 gap-1.5 pt-1">
            <CommandItem
              v-for="link in quickLinks"
              :key="link.name"
              :value="link.name"
              @select="router.push(link.route); isOpen = false;"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/70 text-left transition-all group cursor-pointer"
            >
              <component :is="link.icon" class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span class="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                {{ link.name }}
              </span>
            </CommandItem>
          </div>
        </CommandGroup>
      </template>
    </CommandList>

    <!-- Dialog footer help guidelines -->
    <div class="px-4 py-2.5 bg-muted/20 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground select-none">
      <span class="flex items-center gap-1.5">
        <kbd class="px-1.5 py-0.5 bg-card border border-border rounded text-[9px]">↵</kbd> select
      </span>
      <span class="flex items-center gap-1.5">
        <kbd class="px-1.5 py-0.5 bg-card border border-border rounded text-[9px]">esc</kbd> close
      </span>
    </div>
  </CommandDialog>
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

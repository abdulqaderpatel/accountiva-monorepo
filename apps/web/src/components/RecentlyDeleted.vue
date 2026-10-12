<script setup lang="ts">
import { ref, computed, watch, onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useTrashStore, type TrashItem } from '@/stores/trashStore';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/composables/usePermissions';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Trash2,
  RotateCcw,
  RefreshCw,
  Search,
  AlertTriangle,
  Clock,
  FileText,
  Users,
  Package,
  Receipt,
  BookOpen,
  Calculator,
  FileMinus,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  X,
  Info,
} from 'lucide-vue-next';

const trashStore = useTrashStore();
const authStore = useAuthStore();
const { isOwner, isAdmin } = usePermissions();

const canPermanentlyDelete = computed(() => isOwner.value || isAdmin.value);

const selectedItems = ref<TrashItem[]>([]);
const searchInput = ref('');
let searchDebounceTimer: any = null;

const activeTab = ref<string>('all');

import { isFeatureEnabled, type FeatureFlags } from '@/config/features';

const tabFeatureMap: Record<string, keyof FeatureFlags> = {
  invoices: 'invoices',
  bills: 'bills',
  expenses: 'expenses',
  customers: 'customers',
  vendors: 'vendors',
  items: 'items',
  estimates: 'estimates',
  credit_notes: 'creditNotes',
  journals: 'journals',
};

const tabs = computed(() => {
  const allTabs = [
    { id: 'all', label: 'All Items', icon: Trash2, count: trashStore.counts.all },
    { id: 'invoices', label: 'Invoices', icon: FileText, count: trashStore.counts.invoices },
    { id: 'bills', label: 'Bills', icon: FileText, count: trashStore.counts.bills },
    { id: 'expenses', label: 'Expenses', icon: Receipt, count: trashStore.counts.expenses },
    { id: 'customers', label: 'Customers', icon: Users, count: trashStore.counts.customers },
    { id: 'vendors', label: 'Vendors', icon: Users, count: trashStore.counts.vendors },
    { id: 'items', label: 'Products & Services', icon: Package, count: trashStore.counts.items },
    { id: 'estimates', label: 'Estimates', icon: Calculator, count: trashStore.counts.estimates },
    { id: 'credit_notes', label: 'Credit Notes', icon: FileMinus, count: trashStore.counts.credit_notes },
    { id: 'journals', label: 'Journal Entries', icon: BookOpen, count: trashStore.counts.journals },
  ];

  return allTabs.filter((tab) => {
    if (tab.id === 'all') return true;
    const feat = tabFeatureMap[tab.id];
    return !feat || isFeatureEnabled(feat);
  });
});

// Permanent Delete Dialog State
const showPermanentDeleteModal = ref(false);
const itemToDeletePermanently = ref<TrashItem | null>(null);
const isBulkPermanentDelete = ref(false);

// Clear All Dialog State
const showClearAllModal = ref(false);

const refreshData = () => {
  selectedItems.value = [];
  trashStore.fetchTrash(1, 20, activeTab.value, searchInput.value);
};

// Auto-refresh when marked stale
watch(
  () => trashStore.isStale,
  (stale) => {
    if (stale) {
      refreshData();
    }
  }
);

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    refreshData();
  }
};

onMounted(() => {
  refreshData();
  window.addEventListener('focus', refreshData);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onActivated(() => {
  refreshData();
});

onBeforeUnmount(() => {
  window.removeEventListener('focus', refreshData);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

// Reactive fetch when workspace changes
watch(
  () => authStore.currentOrganization?.id,
  (newOrgId) => {
    if (newOrgId) {
      selectedItems.value = [];
      searchInput.value = '';
      trashStore.fetchTrash(1, 20, activeTab.value, '');
    }
  }
);

// Watch tab change
watch(activeTab, (newTab) => {
  selectedItems.value = [];
  trashStore.fetchTrash(1, 20, newTab, searchInput.value);
});

const handleSearchInput = (val: string) => {
  searchInput.value = val;
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    selectedItems.value = [];
    trashStore.fetchTrash(1, 20, activeTab.value, val);
  }, 350);
};

const clearSearch = () => {
  searchInput.value = '';
  selectedItems.value = [];
  trashStore.fetchTrash(1, 20, activeTab.value, '');
};

const isAllSelected = computed(() => {
  if (trashStore.items.length === 0) return false;
  return selectedItems.value.length === trashStore.items.length;
});

const isPartiallySelected = computed(() => {
  return selectedItems.value.length > 0 && selectedItems.value.length < trashStore.items.length;
});

const toggleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedItems.value = [...trashStore.items];
  } else {
    selectedItems.value = [];
  }
};

const isItemSelected = (item: TrashItem) => {
  return selectedItems.value.some((selected) => selected.id === item.id);
};

const toggleItemSelect = (item: TrashItem, checked: boolean) => {
  if (checked) {
    selectedItems.value.push(item);
  } else {
    selectedItems.value = selectedItems.value.filter((selected) => selected.id !== item.id);
  }
};

// Restore Single Item
const handleRestoreSingle = async (item: TrashItem) => {
  const success = await trashStore.restoreItem(item.entityType, item.id);
  if (success) {
    selectedItems.value = selectedItems.value.filter((s) => s.id !== item.id);
  }
};

// Restore Bulk
const handleRestoreBulk = async () => {
  const payload = selectedItems.value.map((item) => ({
    entityType: item.entityType,
    id: item.id,
  }));
  const success = await trashStore.restoreBulk(payload);
  if (success) {
    selectedItems.value = [];
  }
};

// Open Permanent Delete Dialog
const openPermanentDeleteDialog = (item: TrashItem) => {
  itemToDeletePermanently.value = item;
  isBulkPermanentDelete.value = false;
  showPermanentDeleteModal.value = true;
};

const openBulkPermanentDeleteDialog = () => {
  itemToDeletePermanently.value = null;
  isBulkPermanentDelete.value = true;
  showPermanentDeleteModal.value = true;
};

const confirmPermanentDelete = async () => {
  if (isBulkPermanentDelete.value) {
    const payload = selectedItems.value.map((item) => ({
      entityType: item.entityType,
      id: item.id,
    }));
    const success = await trashStore.permanentlyDeleteBulk(payload);
    if (success) {
      selectedItems.value = [];
      showPermanentDeleteModal.value = false;
    }
  } else if (itemToDeletePermanently.value) {
    const success = await trashStore.permanentlyDeleteItem(
      itemToDeletePermanently.value.entityType,
      itemToDeletePermanently.value.id,
    );
    if (success) {
      selectedItems.value = selectedItems.value.filter(
        (s) => s.id !== itemToDeletePermanently.value?.id,
      );
      showPermanentDeleteModal.value = false;
    }
  }
};

const confirmClearAll = async () => {
  const success = await trashStore.emptyTrash();
  if (success) {
    selectedItems.value = [];
    showClearAllModal.value = false;
  }
};

const getEntityBadgeProps = (type: string) => {
  switch (type) {
    case 'invoice':
      return { label: 'Invoice', class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' };
    case 'bill':
      return { label: 'Bill', class: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800' };
    case 'expense':
      return { label: 'Expense', class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
    case 'customer':
      return { label: 'Customer', class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
    case 'vendor':
      return { label: 'Vendor', class: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800' };
    case 'item':
      return { label: 'Product / Service', class: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' };
    case 'estimate':
      return { label: 'Estimate', class: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' };
    case 'credit_note':
      return { label: 'Credit Note', class: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800' };
    case 'journal':
      return { label: 'Journal Entry', class: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800' };
    default:
      return { label: type, class: 'bg-muted text-muted-foreground' };
  }
};

const totalFinancialAmount = computed(() => {
  return trashStore.items.reduce((sum, item) => sum + (item.amount ? Number(item.amount) : 0), 0);
});

const expiringSoonCount = computed(() => {
  return trashStore.items.filter((item) => item.daysRemaining <= 7).length;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Card -->
    <Card class="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
      <CardHeader class="p-5 md:p-6 border-b border-border/50 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle class="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
            <Trash2 class="w-4 h-4 text-primary" />
            Recently Deleted Items
          </CardTitle>
          <CardDescription class="text-xs text-muted-foreground mt-1">
            Items deleted in your workspace stay here for 30 days before being permanently removed. You can recover them at any time.
          </CardDescription>
        </div>

        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs rounded-xl"
            :disabled="trashStore.loading"
            @click="refreshData"
            title="Refresh recently deleted items"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': trashStore.loading }" />
            <span>Refresh</span>
          </Button>

          <Button
            v-if="canPermanentlyDelete && trashStore.counts.all > 0"
            type="button"
            variant="destructive"
            size="sm"
            class="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs rounded-xl"
            :disabled="trashStore.actionLoading"
            @click="showClearAllModal = true"
          >
            <Trash2 class="w-3.5 h-3.5" />
            Clear All Deleted Items
          </Button>
        </div>
      </CardHeader>

      <CardContent class="p-5 md:p-6 space-y-6">
        <!-- Recovery Info Notice -->
        <div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
          <div class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
            <Info class="w-4 h-4" />
          </div>
          <div class="space-y-0.5">
            <h4 class="text-xs font-bold text-blue-900 dark:text-blue-200">
              30-Day Recovery Period
            </h4>
            <p class="text-xs text-blue-700/90 dark:text-blue-300/80 leading-relaxed">
              When items are deleted, they are kept safe for 30 days in case you need them back. After 30 days, they are automatically removed from your workspace.
            </p>
          </div>
        </div>

        <!-- Summary Metric Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
            <div>
              <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Deleted Items</p>
              <h3 class="text-xl font-bold mt-1 tracking-tight text-foreground">{{ trashStore.counts.all }}</h3>
            </div>
            <div class="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Trash2 class="w-4 h-4" />
            </div>
          </div>

          <div class="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
            <div>
              <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Value</p>
              <h3 class="text-xl font-bold mt-1 tracking-tight text-foreground">{{ formatCurrency(totalFinancialAmount) }}</h3>
            </div>
            <div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Receipt class="w-4 h-4" />
            </div>
          </div>

          <div class="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
            <div>
              <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Removing Soon</p>
              <h3 class="text-xl font-bold mt-1 tracking-tight" :class="expiringSoonCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'">
                {{ expiringSoonCount }}
              </h3>
            </div>
            <div class="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock class="w-4 h-4" />
            </div>
          </div>
        </div>

        <!-- Filters & Search -->
        <div class="space-y-3">
          <!-- Horizontal Category Tabs -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60 scrollbar-none">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer"
              :class="[
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              ]"
              @click="activeTab = tab.id"
            >
              <component :is="tab.icon" class="w-3.5 h-3.5" />
              <span>{{ tab.label }}</span>
              <span
                class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                :class="[
                  activeTab === tab.id
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground border border-border/50'
                ]"
              >
                {{ tab.count }}
              </span>
            </button>
          </div>

          <!-- Search Bar -->
          <div class="flex items-center justify-between gap-3 pt-1">
            <div class="relative flex-1 max-w-sm">
              <Search class="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                :model-value="searchInput"
                placeholder="Search by name, number, or contact..."
                class="pl-8 pr-8 h-8 text-xs bg-background rounded-xl border-border/70"
                @update:model-value="handleSearchInput"
              />
              <button
                v-if="searchInput"
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                @click="clearSearch"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>

            <div class="text-[11px] font-medium text-muted-foreground hidden sm:block">
              Showing {{ trashStore.items.length }} of {{ trashStore.pagination.total }} items
            </div>
          </div>
        </div>

        <!-- Table Container -->
        <div class="border border-border/60 rounded-xl overflow-hidden bg-card">
          <!-- Loading Skeleton -->
          <div v-if="trashStore.loading" class="p-6 space-y-4">
            <div v-for="i in 4" :key="i" class="flex items-center gap-4">
              <Skeleton class="h-4 w-4 rounded-sm" />
              <Skeleton class="h-5 w-16 rounded-md" />
              <div class="space-y-1.5 flex-1">
                <Skeleton class="h-4 w-1/3" />
                <Skeleton class="h-3 w-1/2" />
              </div>
              <Skeleton class="h-5 w-20 rounded-full" />
              <Skeleton class="h-7 w-20 rounded-lg" />
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="trashStore.items.length === 0"
            class="py-14 px-4 text-center flex flex-col items-center justify-center space-y-2.5"
          >
            <div class="p-3.5 rounded-2xl bg-muted/50 text-muted-foreground border border-border/40">
              <CheckCircle2 class="w-8 h-8 text-emerald-500" />
            </div>
            <h3 class="text-sm font-bold text-foreground">No Deleted Items</h3>
            <p class="text-xs text-muted-foreground max-w-sm">
              There are no deleted items under this category. Items deleted by your team will appear here for 30 days before being automatically cleared.
            </p>
          </div>

          <!-- Items Table -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-border/60 bg-muted/25 text-muted-foreground text-[11px] uppercase font-semibold">
                  <th class="py-2.5 px-3.5 w-9">
                    <Checkbox
                      :model-value="isAllSelected"
                      :indeterminate="isPartiallySelected"
                      @update:model-value="toggleSelectAll"
                    />
                  </th>
                  <th class="py-2.5 px-3.5">Type</th>
                  <th class="py-2.5 px-3.5">Item & Details</th>
                  <th class="py-2.5 px-3.5">Deleted By</th>
                  <th class="py-2.5 px-3.5">Date Deleted</th>
                  <th class="py-2.5 px-3.5">Time Left</th>
                  <th class="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/50">
                <tr
                  v-for="item in trashStore.items"
                  :key="item.id"
                  class="hover:bg-muted/20 transition-colors group"
                  :class="{ 'bg-primary/5': isItemSelected(item) }"
                >
                  <!-- Checkbox -->
                  <td class="py-2.5 px-3.5">
                    <Checkbox
                      :model-value="isItemSelected(item)"
                      @update:model-value="(val) => toggleItemSelect(item, !!val)"
                    />
                  </td>

                  <!-- Type Badge -->
                  <td class="py-2.5 px-3.5">
                    <Badge
                      variant="outline"
                      :class="[getEntityBadgeProps(item.entityType).class, 'font-medium text-[11px] px-2 py-0.5 rounded-md border']"
                    >
                      {{ getEntityBadgeProps(item.entityType).label }}
                    </Badge>
                  </td>

                  <!-- Item Title & Details -->
                  <td class="py-2.5 px-3.5">
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold text-foreground group-hover:text-primary transition-colors">
                          {{ item.title }}
                        </span>
                        <span
                          v-if="item.amount !== undefined && item.amount !== null"
                          class="font-mono font-medium text-muted-foreground text-[11px]"
                        >
                          ({{ formatCurrency(item.amount) }})
                        </span>
                      </div>
                      <p class="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-md">
                        {{ item.subtitle }}
                      </p>
                    </div>
                  </td>

                  <!-- Deleted By -->
                  <td class="py-2.5 px-3.5 text-muted-foreground">
                    <div v-if="item.deletedBy" class="flex items-center gap-1.5">
                      <div class="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                        {{ item.deletedBy.name.charAt(0).toUpperCase() }}
                      </div>
                      <span class="truncate max-w-[110px]">{{ item.deletedBy.name }}</span>
                    </div>
                    <span v-else class="text-muted-foreground/60">—</span>
                  </td>

                  <!-- Date Deleted -->
                  <td class="py-2.5 px-3.5 text-muted-foreground whitespace-nowrap">
                    {{ formatDate(item.deletedAt) }}
                  </td>

                  <!-- Time Left Badge -->
                  <td class="py-2.5 px-3.5 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      :class="[
                        item.daysRemaining <= 7
                          ? 'bg-destructive/10 text-destructive border-destructive/25 font-bold'
                          : 'bg-muted/50 text-muted-foreground border-border font-medium',
                        'text-[10px] px-2 py-0.5 rounded-full'
                      ]"
                    >
                      <Clock class="w-2.5 h-2.5 mr-1" />
                      {{ item.daysRemaining }} day{{ item.daysRemaining === 1 ? '' : 's' }} left
                    </Badge>
                  </td>

                  <!-- Row Actions -->
                  <td class="py-2.5 px-3.5 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        class="h-7 px-2 text-[11px] gap-1 font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer rounded-lg"
                        :disabled="trashStore.actionLoading"
                        @click="handleRestoreSingle(item)"
                      >
                        <RotateCcw class="w-3 h-3" />
                        <span>Restore</span>
                      </Button>

                      <Button
                        v-if="canPermanentlyDelete"
                        type="button"
                        size="sm"
                        variant="ghost"
                        class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg"
                        :disabled="trashStore.actionLoading"
                        title="Delete permanently"
                        @click="openPermanentDeleteDialog(item)"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div
            v-if="trashStore.pagination.totalPages > 1"
            class="p-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground bg-muted/10"
          >
            <span>Page {{ trashStore.pagination.page }} of {{ trashStore.pagination.totalPages }}</span>
            <div class="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                class="h-7 text-xs rounded-lg"
                :disabled="trashStore.pagination.page <= 1 || trashStore.loading"
                @click="trashStore.fetchTrash(trashStore.pagination.page - 1, trashStore.pagination.limit)"
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                class="h-7 text-xs rounded-lg"
                :disabled="trashStore.pagination.page >= trashStore.pagination.totalPages || trashStore.loading"
                @click="trashStore.fetchTrash(trashStore.pagination.page + 1, trashStore.pagination.limit)"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Floating Bulk Selection Bar -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-6 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-6 scale-95"
      >
        <div
          v-if="selectedItems.length > 0"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl text-foreground text-xs max-w-[calc(100vw-2rem)] overflow-x-auto"
        >
          <div class="flex items-center gap-1.5">
            <Badge variant="secondary" class="bg-primary/10 text-primary border-primary/20 font-bold text-xs">
              {{ selectedItems.length }}
            </Badge>
            <span class="font-semibold text-muted-foreground hidden sm:inline">selected</span>
          </div>

          <div class="h-4 w-px bg-border/80 hidden sm:block" />

          <!-- Restore Selected -->
          <Button
            type="button"
            size="sm"
            class="h-7 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
            :disabled="trashStore.actionLoading"
            @click="handleRestoreBulk"
          >
            <RotateCcw class="w-3 h-3" />
            Restore Selected ({{ selectedItems.length }})
          </Button>

          <!-- Permanently Delete Selected -->
          <Button
            v-if="canPermanentlyDelete"
            type="button"
            size="sm"
            variant="destructive"
            class="h-7 gap-1.5 text-xs font-semibold rounded-xl"
            :disabled="trashStore.actionLoading"
            @click="openBulkPermanentDeleteDialog"
          >
            <Trash2 class="w-3 h-3" />
            Delete Permanently
          </Button>

          <!-- Deselect / Clear -->
          <button
            type="button"
            class="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Clear selection"
            @click="selectedItems = []"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- Permanent Delete Confirmation Dialog -->
    <Dialog :open="showPermanentDeleteModal" @update:open="showPermanentDeleteModal = $event">
      <DialogContent class="sm:max-w-md p-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card">
        <div class="p-6 border-b border-border/40 bg-muted/20">
          <DialogHeader class="flex flex-col items-center text-center space-y-2">
            <div class="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-2xs">
              <AlertTriangle class="w-5 h-5" />
            </div>
            <DialogTitle class="text-base font-bold">
              {{ isBulkPermanentDelete ? 'Permanently Delete Selected Items?' : 'Permanently Delete Item?' }}
            </DialogTitle>
            <DialogDescription class="text-xs text-muted-foreground leading-relaxed">
              <template v-if="isBulkPermanentDelete">
                You are about to permanently delete <strong>{{ selectedItems.length }} item(s)</strong> from your workspace.
              </template>
              <template v-else-if="itemToDeletePermanently">
                You are about to permanently delete <strong>"{{ itemToDeletePermanently.title }}"</strong> from your workspace.
              </template>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div class="p-5">
          <div class="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/15">
            <AlertTriangle class="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p class="text-xs font-medium text-destructive/90 leading-relaxed">
              This action cannot be undone. Once deleted, this data cannot be recovered.
            </p>
          </div>
        </div>

        <DialogFooter class="p-4 bg-muted/15 border-t border-border/40 flex flex-row justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-8 rounded-xl text-xs font-semibold text-muted-foreground"
            :disabled="trashStore.actionLoading"
            @click="showPermanentDeleteModal = false"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            class="h-8 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs"
            :disabled="trashStore.actionLoading"
            @click="confirmPermanentDelete"
          >
            <Loader2 v-if="trashStore.actionLoading" class="w-3.5 h-3.5 animate-spin" />
            <Trash2 v-else class="w-3.5 h-3.5" />
            <span>Delete Permanently</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Clear All Confirmation Dialog -->
    <Dialog :open="showClearAllModal" @update:open="showClearAllModal = $event">
      <DialogContent class="sm:max-w-md p-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card">
        <div class="p-6 border-b border-border/40 bg-muted/20">
          <DialogHeader class="flex flex-col items-center text-center space-y-2">
            <div class="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-2xs">
              <ShieldAlert class="w-5 h-5" />
            </div>
            <DialogTitle class="text-base font-bold">Clear All Deleted Items?</DialogTitle>
            <DialogDescription class="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete all <strong>{{ trashStore.counts.all }} item(s)</strong> currently stored in Recently Deleted for this workspace.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div class="p-5">
          <div class="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/15">
            <AlertTriangle class="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p class="text-xs font-medium text-destructive/90 leading-relaxed">
              Warning: This will immediately and permanently erase all deleted items and their line items. This action cannot be reversed.
            </p>
          </div>
        </div>

        <DialogFooter class="p-4 bg-muted/15 border-t border-border/40 flex flex-row justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-8 rounded-xl text-xs font-semibold text-muted-foreground"
            :disabled="trashStore.actionLoading"
            @click="showClearAllModal = false"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            class="h-8 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs"
            :disabled="trashStore.actionLoading"
            @click="confirmClearAll"
          >
            <Loader2 v-if="trashStore.actionLoading" class="w-3.5 h-3.5 animate-spin" />
            <Trash2 v-else class="w-3.5 h-3.5" />
            <span>Yes, Clear All Items</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

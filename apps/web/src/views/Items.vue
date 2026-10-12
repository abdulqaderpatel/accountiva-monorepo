<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useI18n } from 'vue-i18n';
import Sidebar from "@/components/Sidebar.vue";
import TopBar from '@/components/TopBar.vue';
import AddItemModal from '@/components/AddItemModal.vue';
import Modal from '@/components/Modal.vue';
import { useItemStore, type Item } from "@/stores/itemStore";
import {
  Plus,
  Search,
  Package,
  Wrench,
  AlertTriangle,
  IndianRupee,
  Layers,
  MoreHorizontal,
  Pencil,
  Trash2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Box,
  Boxes,
  Briefcase,
  Sparkles,
  X,
  FileUp,
} from "lucide-vue-next";
import BulkUploadModal from '@/components/BulkUploadModal.vue';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "vue-sonner";
import { storeToRefs } from "pinia";
import ViewGuard from "@/components/ViewGuard.vue";
import StickyPageHeader from "@/components/ui/StickyPageHeader.vue";
import BulkActionBar from "@/components/ui/BulkActionBar.vue";
import BulkConfirmDialog from "@/components/ui/BulkConfirmDialog.vue";
import { useBulkSelection } from "@/composables/useBulkSelection";
import { exportToCsv, exportToJson } from "@/lib/exportUtils";
import { usePermissions } from "@/composables/usePermissions";
import { formatCurrency } from "@/utils/formatters";

const itemStore = useItemStore();
const { items, pagination, loading: fetchingItems } = storeToRefs(itemStore);
const { canManage } = usePermissions();
const { t } = useI18n();

const isModalOpen = ref(false);
const isBulkUploadOpen = ref(false);
const itemToEdit = ref<Item | null>(null);
const searchQuery = ref("");
const selectedFilter = ref("All"); // "All" | "Inventory" | "Non-Inventory" | "Services" | "LowStock"
const openMenuId = ref<string | null>(null);
const isDeleting = ref(false);

const {
  selectedIds,
  selectedCount,
  selectedItems,
  isSelected,
  toggleSelect,
  isAllSelected,
  isIndeterminate,
  toggleSelectAll,
  clearSelection,
} = useBulkSelection(items);

const isBulkDeleting = ref(false);
const showBulkDeleteConfirm = ref(false);

const handleBulkDeleteConfirm = async () => {
  if (selectedIds.value.size === 0) return;
  isBulkDeleting.value = true;
  const idsToDelete = Array.from(selectedIds.value);
  try {
    const res = await itemStore.bulkDeleteItems(idsToDelete);
    if (res?.skipped && res.skipped.length > 0) {
      toast.warning('Bulk delete completed with notices', {
        description: res.message,
      });
    } else {
      toast.success('Items deleted', {
        description: res?.message || `Successfully deleted ${idsToDelete.length} item(s).`,
      });
    }
    clearSelection();
    showBulkDeleteConfirm.value = false;
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to delete items');
  } finally {
    isBulkDeleting.value = false;
  }
};

const handleBulkExport = (format: 'csv' | 'json') => {
  if (selectedItems.value.length === 0) return;
  const exportData = selectedItems.value.map((i) => ({
    Name: i.name,
    SKU: i.sku || '',
    Type: i.type,
    Classification: i.productType || '',
    Category: i.category || '',
    'Selling Price': i.sellingPrice || 0,
    'Cost Price': i.costPrice || 0,
    'Stock on Hand': i.stockOnHand || 0,
  }));

  if (format === 'csv') {
    exportToCsv(exportData, 'items');
  } else {
    exportToJson(exportData, 'items');
  }
  toast.success(`Exported ${exportData.length} item(s) as ${format.toUpperCase()}`);
};

const filterTabs = [
  { id: "All", label: "All Items", icon: Layers },
  { id: "Inventory", label: "Inventory Products", icon: Boxes },
  { id: "Non-Inventory", label: "Non-Inventory Products", icon: Package },
  { id: "Services", label: "Services", icon: Wrench },
  { id: "LowStock", label: "Low Stock Alerts", icon: AlertTriangle },
];

onMounted(() => {
  itemStore.fetchItems(1, 10, searchQuery.value, selectedFilter.value);
  window.addEventListener("click", closeOpenMenu);
});

onUnmounted(() => {
  window.removeEventListener("click", closeOpenMenu);
  if (timeout) clearTimeout(timeout);
});

const handlePageChange = (newPage: number) => {
  if (newPage < 1 || newPage > pagination.value.totalPages) return;
  itemStore.fetchItems(newPage, pagination.value.limit, searchQuery.value, selectedFilter.value);
  document.querySelector('main')?.scrollTo({ top: 0, behavior: "smooth" });
};

// Handle Filter Tab Change
const setFilterTab = (tabId: string) => {
  selectedFilter.value = tabId;
  itemStore.fetchItems(1, pagination.value.limit, searchQuery.value, tabId, true);
};

// Search with debounce
let timeout: any = null;
watch(searchQuery, (newSearch) => {
  clearSelection();
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    itemStore.fetchItems(1, pagination.value.limit, newSearch, selectedFilter.value, true);
  }, 300);
});

watch([selectedFilter, () => pagination.value.page], () => {
  clearSelection();
});

const openCreateModal = () => {
  itemToEdit.value = null;
  isModalOpen.value = true;
};

const openEditModal = (item: Item, event: MouseEvent) => {
  event.stopPropagation();
  itemToEdit.value = item;
  isModalOpen.value = true;
  openMenuId.value = null;
};

const handleDelete = async (id: string, event: MouseEvent) => {
  event.stopPropagation();
  if (confirm("Are you sure you want to delete this item?")) {
    try {
      isDeleting.value = true;
      await itemStore.deleteItem(id);
      toast.success("Item deleted successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete item");
    } finally {
      isDeleting.value = false;
      openMenuId.value = null;
    }
  }
};

const toggleMenu = (id: string, event: MouseEvent) => {
  event.stopPropagation();
  openMenuId.value = openMenuId.value === id ? null : id;
};

const closeOpenMenu = () => {
  openMenuId.value = null;
};
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    <TopBar />

    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Items" />

      <main class="flex-1 overflow-y-auto bg-background flex flex-col">
        <ViewGuard module="items">
          <!-- Sticky Transitional Header -->
          <StickyPageHeader
            title="Products & Services"
            subtitle="Manage physical inventory, non-inventory goods, and professional services catalog."
            :icon="Package"
          >
            <template #actions>
              <div v-if="canManage('items')" class="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  @click="isBulkUploadOpen = true"
                  class="h-9 px-3.5 text-xs font-medium border-border shadow-2xs"
                >
                  <FileUp class="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  Import CSV
                </Button>
                <Button
                  @click="openCreateModal"
                  size="sm"
                  class="h-9 px-4 text-xs font-medium shadow-xs"
                >
                  <Plus class="w-3.5 h-3.5 mr-1.5" />
                  Add Item / Service
                </Button>
              </div>
            </template>
          </StickyPageHeader>

          <div class="px-8 pt-2 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">

          <!-- KPI Summary Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Total Items -->
            <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-primary/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
              <div class="h-[2.5px] w-full bg-amber-500/50"></div>
              <CardContent class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Total Catalog Items</span>
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/15 text-amber-700 dark:text-amber-400 group-hover:scale-105 transition-transform">
                    <Layers class="w-4 h-4" />
                  </div>
                </div>
                <div class="text-2xl font-bold text-foreground mb-1 tracking-tight">
                  {{ pagination.totalItems || 0 }}
                </div>
                <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">products & services</p>
              </CardContent>
            </Card>

            <!-- Active Inventory Products -->
            <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-sky-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
              <div class="h-[2.5px] w-full bg-sky-500/50"></div>
              <CardContent class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Active Inventory</span>
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-500/10 border border-sky-500/15 text-sky-700 dark:text-sky-400 group-hover:scale-105 transition-transform">
                    <Boxes class="w-4 h-4" />
                  </div>
                </div>
                <div class="text-2xl font-bold text-foreground mb-1 tracking-tight text-sky-800 dark:text-sky-300">
                  {{ pagination.activeInventoryCount || 0 }}
                </div>
                <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">tracked physical stock</p>
              </CardContent>
            </Card>

            <!-- Total Stock Valuation -->
            <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-emerald-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
              <div class="h-[2.5px] w-full bg-emerald-500/50"></div>
              <CardContent class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Total Stock Valuation</span>
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <IndianRupee class="w-4 h-4" />
                  </div>
                </div>
                <div class="text-2xl font-bold text-foreground mb-1 tracking-tight font-mono text-emerald-800 dark:text-emerald-400">
                  {{ formatCurrency(pagination.totalStockValue || 0) }}
                </div>
                <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">inventory asset value</p>
              </CardContent>
            </Card>

            <!-- Low Stock Alerts -->
            <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-rose-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
              <div class="h-[2.5px] w-full bg-rose-500/50"></div>
              <CardContent class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Low Stock Alerts</span>
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/15 text-rose-700 dark:text-rose-400 group-hover:scale-105 transition-transform">
                    <AlertTriangle class="w-4 h-4" />
                  </div>
                </div>
                <div class="text-2xl font-bold text-foreground mb-1 tracking-tight text-rose-700 dark:text-rose-400">
                  {{ pagination.lowStockAlertsCount || 0 }}
                </div>
                <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">below reorder threshold</p>
              </CardContent>
            </Card>
          </div>

          <!-- Filter & Table -->
          <div class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs">
            <div class="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border/60 bg-muted/25">
              <div class="relative w-full sm:w-72 md:w-80 group">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-150" />
                <Input
                  v-model="searchQuery"
                  placeholder="Search name, SKU, HSN..."
                  class="h-9 w-full pl-9 pr-8 bg-background/50 hover:bg-background/80 focus:bg-background/90 border-border/70 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 rounded-lg text-xs font-medium placeholder:text-muted-foreground/60 shadow-none transition-colors"
                />
                <button
                  v-if="searchQuery"
                  type="button"
                  @click="searchQuery = ''"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
                  title="Clear search"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <div class="inline-flex h-9 items-center gap-1 bg-muted/45 p-1 rounded-lg border border-border/60 overflow-x-auto shadow-2xs max-w-full">
                <button
                  type="button"
                  v-for="tab in filterTabs"
                  :key="tab.id"
                  @click="setFilterTab(tab.id)"
                  :class="[
                    'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all duration-150 whitespace-nowrap cursor-pointer',
                    selectedFilter === tab.id
                      ? 'bg-primary/15 text-primary font-bold border border-primary/25 shadow-xs'
                      : 'text-muted-foreground font-medium hover:text-foreground hover:bg-primary/5',
                  ]"
                >
                  <component :is="tab.icon" class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ tab.label }}</span>
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/80 border-b border-border/70 bg-primary/[0.03]">
                    <th class="py-4 px-4 w-[48px] text-center"></th>
                    <th class="py-4 px-6">Item & Code</th>
                    <th class="py-4 px-6">Classification</th>
                    <th class="py-4 px-6 text-center">Stock on Hand</th>
                    <th class="py-4 px-6 text-right">Selling Price</th>
                    <th class="py-4 px-6 text-right">Cost Price</th>
                    <th class="py-4 px-6 text-center">Reorder Status</th>
                    <th class="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-border/60 text-xs font-medium">
                  <!-- Loading Skeletons -->
                  <template v-if="fetchingItems">
                    <tr v-for="n in 5" :key="n" class="animate-pulse">
                      <td class="py-4.5 px-4 text-center"><Skeleton class="h-4 w-4 mx-auto rounded" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-32 bg-muted/40 rounded-lg" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-20 bg-muted/40 rounded-lg" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-16 mx-auto bg-muted/40 rounded-lg" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-20 ml-auto bg-muted/40 rounded-lg" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-20 ml-auto bg-muted/40 rounded-lg" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-20 mx-auto bg-muted/40 rounded-lg" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-8 ml-auto bg-muted/40 rounded-lg" /></td>
                    </tr>
                  </template>

                  <!-- Empty State -->
                  <tr v-else-if="items.length === 0">
                    <td colspan="8" class="py-32 text-center text-muted-foreground">
                      <div class="flex flex-col items-center justify-center space-y-3">
                        <div class="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center text-muted-foreground/40">
                          <Package class="w-8 h-8" />
                        </div>
                        <p class="text-sm font-bold text-foreground">No Products or Services found</p>
                        <p class="text-xs text-muted-foreground max-w-sm">
                          Try adjusting your filters or search keywords, or create a new product/service item.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Data Rows -->
                  <tr
                    v-else
                    v-for="item in items"
                    :key="item.id"
                    :data-state="isSelected(item.id) ? 'selected' : undefined"
                    :class="[
                      'transition-colors group',
                      isSelected(item.id)
                        ? 'bg-primary/10 dark:bg-primary/15 hover:bg-primary/15 dark:hover:bg-primary/20'
                        : 'hover:bg-muted/50',
                      canManage('items') ? 'cursor-pointer' : 'cursor-default',
                    ]"
                    @click="canManage('items') && openEditModal(item, $event)"
                  >
                    <td class="py-4.5 px-4 text-center w-[48px] cursor-pointer" @click.stop="toggleSelect(item.id)">
                      <div
                        :class="[
                          'transition-opacity duration-150 flex items-center justify-center',
                          selectedCount > 0 || isSelected(item.id)
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        ]"
                      >
                        <Checkbox
                          :checked="isSelected(item.id)"
                          @update:checked="toggleSelect(item.id)"
                          :aria-label="`Select item ${item.name}`"
                        />
                      </div>
                    </td>
                    <!-- Name & SKU -->
                    <td class="py-4.5 px-6">
                      <div class="flex items-center gap-3">
                        <div
                          :class="[
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold',
                            item.type === 'Service'
                              ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                              : (item.productType === 'Non-Inventory' ? 'bg-secondary text-secondary-foreground' : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'),
                          ]"
                        >
                          <Wrench v-if="item.type === 'Service'" class="w-4 h-4" />
                          <Package v-else class="w-4 h-4" />
                        </div>
                        <div class="min-w-0">
                          <p class="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {{ item.name }}
                          </p>
                          <div class="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span v-if="item.sku" class="font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                              {{ item.sku }}
                            </span>
                            <span v-if="item.hsnSacCode" class="text-muted-foreground/70">
                              {{ item.type === 'Product' ? 'HSN' : 'SAC' }}: {{ item.hsnSacCode }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Classification Badge -->
                    <td class="py-4.5 px-6">
                      <!-- Service Badge -->
                      <span
                        v-if="item.type === 'Service'"
                        class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25"
                      >
                        <Wrench class="w-3 h-3" /> Service
                      </span>

                      <!-- Inventory Product Badge -->
                      <span
                        v-else-if="item.productType === 'Inventory'"
                        class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                      >
                        <Boxes class="w-3 h-3" /> Inventory
                      </span>

                      <!-- Non-Inventory Badge -->
                      <span
                        v-else
                        class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-muted/70 text-muted-foreground border border-border"
                      >
                        <Package class="w-3 h-3" /> Non-Inventory
                      </span>
                    </td>

                    <!-- Stock on Hand -->
                    <td class="py-4.5 px-6 text-center">
                      <span
                        v-if="item.type === 'Product' && item.productType === 'Inventory'"
                        :class="[
                          'font-bold text-xs font-mono',
                          (item.reorderPoint || 0) > 0 && (item.stockOnHand || 0) <= (item.reorderPoint || 0)
                            ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                            : 'text-foreground',
                        ]"
                      >
                        {{ item.stockOnHand || 0 }} {{ item.uom || 'Pcs' }}
                      </span>
                      <span v-else class="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">
                        N/A
                      </span>
                    </td>

                    <!-- Selling Price -->
                    <td class="py-4.5 px-6 text-right font-bold font-mono text-foreground">
                      {{ formatCurrency(item.sellingPrice || item.unitPrice || 0) }}
                    </td>

                    <!-- Cost Price -->
                    <td class="py-4.5 px-6 text-right text-muted-foreground font-mono font-medium">
                      {{ formatCurrency(item.costPrice || 0) }}
                    </td>

                    <!-- Reorder Status -->
                    <td class="py-4.5 px-6 text-center">
                      <template v-if="item.type === 'Product' && item.productType === 'Inventory'">
                        <span
                          v-if="(item.reorderPoint || 0) > 0 && (item.stockOnHand || 0) <= (item.reorderPoint || 0)"
                          class="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                        >
                          <AlertTriangle class="w-3 h-3" /> Low Stock
                        </span>
                        <span
                          v-else
                          class="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/20"
                        >
                          <CheckCircle2 class="w-3 h-3" /> In Stock
                        </span>
                      </template>
                      <span v-else class="text-[10px] text-muted-foreground/40 font-bold uppercase">
                        —
                      </span>
                    </td>

                    <!-- Actions -->
                    <td class="py-4.5 px-6 text-right relative">
                      <div v-if="canManage('items')" class="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          @click="openEditModal(item, $event)"
                          class="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 transition-colors opacity-70 group-hover:opacity-100"
                        >
                          <Pencil class="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          @click="handleDelete(item.id, $event)"
                          class="h-8 w-8 rounded-lg text-rose-500/80 hover:text-rose-600 hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div v-else class="flex justify-end pr-2 text-muted-foreground/30" title="View Only Access">
                        <Lock class="w-3.5 h-3.5" />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination Footer -->
            <div
              v-if="!fetchingItems && items.length > 0 && pagination.totalPages > 1"
              class="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/20"
            >
              <p class="text-xs text-muted-foreground font-medium">
                Showing Page <span class="font-bold text-foreground">{{ pagination.page }}</span> of
                <span class="font-bold text-foreground">{{ pagination.totalPages }}</span>
              </p>
              <div class="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="pagination.page <= 1"
                  @click="handlePageChange(pagination.page - 1)"
                  class="rounded-xl px-3 h-8 text-xs font-bold border-border/50 hover:bg-muted"
                >
                  <ChevronLeft class="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="pagination.page >= pagination.totalPages"
                  @click="handlePageChange(pagination.page + 1)"
                  class="rounded-xl px-3 h-8 text-xs font-bold border-border/50 hover:bg-muted"
                >
                  Next <ChevronRight class="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          <!-- Floating Bulk Action Bar -->
          <BulkActionBar
            :count="selectedCount"
            label="items"
            :loading="isBulkDeleting"
            :can-delete="canManage('items')"
            @clear="clearSelection"
            @delete="showBulkDeleteConfirm = true"
            @export="handleBulkExport"
          />

          <!-- Bulk Delete Confirmation Dialog -->
          <BulkConfirmDialog
            v-model:open="showBulkDeleteConfirm"
            :title="selectedCount > 1 ? `Delete ${selectedCount} Items` : 'Delete Item'"
            :description="selectedCount > 1 ? `Are you sure you want to delete ${selectedCount} items? Note: Items referenced in invoices or bills cannot be deleted to preserve financial audit history.` : 'Are you sure you want to delete this item? Note: Items referenced in invoices or bills cannot be deleted to preserve financial audit history.'"
            :item-count="selectedCount"
            :item-names="selectedItems.map((i) => i.name)"
            :loading="isBulkDeleting"
            @confirm="handleBulkDeleteConfirm"
          />
          </div>
          </div>
        </ViewGuard>
      </main>
    </div>

    <!-- Add / Edit Item Modal -->
    <AddItemModal
      :open="isModalOpen"
      :itemToEdit="itemToEdit"
      @close="isModalOpen = false"
      @success="setFilterTab(selectedFilter)"
    />

    <BulkUploadModal
      v-model:open="isBulkUploadOpen"
      entity="items"
      @success="setFilterTab(selectedFilter)"
    />
  </div>
</template>

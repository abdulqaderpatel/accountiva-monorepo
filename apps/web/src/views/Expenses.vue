<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useI18n } from 'vue-i18n';
import Sidebar from "@/components/Sidebar.vue";
import TopBar from '@/components/TopBar.vue';
import Modal from '@/components/Modal.vue';
import { useExpenseStore, type Expense } from "@/stores/expenseStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useVendorStore } from "@/stores/vendorStore";
import { useTheme } from "@/composables/useTheme";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  CreditCard,
  IndianRupee,
  Tag,
  User,
  FileText,
  Receipt,
  Trash2,
  Lock,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Bookmark as BookmarkIcon,
  FileUp,
} from "lucide-vue-next";
import BulkUploadModal from "@/components/BulkUploadModal.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import DatePicker from "@/components/ui/DatePicker.vue";
import Select from "@/components/ui/Select.vue";
import AccountSelect from "@/components/ui/AccountSelect.vue";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "vue-sonner";
import { storeToRefs } from "pinia";
import ViewGuard from "@/components/ViewGuard.vue";
import { usePermissions } from "@/composables/usePermissions";
import { useFormValidation } from "@/composables/useFormValidation";
import { expenseSchema } from "@/utils/validationSchemas";
import AddVendorModal from "@/components/AddVendorModal.vue";
import AddAccountModal from "@/components/AddAccountModal.vue";
import CustomFieldRenderer from "@/components/ui/CustomFieldRenderer.vue";
import StickyPageHeader from "@/components/ui/StickyPageHeader.vue";
import { formatCurrency } from "@/utils/formatters";
import { Checkbox } from "@/components/ui/checkbox";
import BulkActionBar from "@/components/ui/BulkActionBar.vue";
import BulkConfirmDialog from "@/components/ui/BulkConfirmDialog.vue";
import SmartPresetsBar from "@/components/ui/SmartPresetsBar.vue";
import type { FilterPreset } from "@/stores/filterPresetStore";
import { useBulkSelection } from "@/composables/useBulkSelection";
import { exportToCsv, exportToJson } from "@/lib/exportUtils";

import { useQuickCreateStore } from "@/stores/quickCreateStore";
import { useBookmarkStore } from "@/stores/bookmarkStore";

const expenseStore = useExpenseStore();
const bookmarkStore = useBookmarkStore();
const { expenses, pagination, loading: fetchingExpenses, paymentAccounts } = storeToRefs(expenseStore);
const customerStore = useCustomerStore();
const vendorStore = useVendorStore();
const { theme } = useTheme();
const quickCreateStore = useQuickCreateStore();
const { canManage } = usePermissions();
const { t } = useI18n();
const loading = ref(false);


const searchQuery = ref("");
const activeTimeframe = ref('all');
const activeMinAmount = ref<number | null>(null);
const activeMaxAmount = ref<number | null>(null);
const isBookmarkedOnly = ref(false);
const bookmarkedCount = computed(() => {
  return bookmarkStore.bookmarks.filter((b) => b.entity_type === "expense").length;
});
const isAddingExpense = ref(false);
const isBulkUploadOpen = ref(false);
const isAddingInlineVendor = ref(false);
const isAddingInlineAccount = ref(false);
const selectedDetail = ref<Expense | null>(null);
const openMenuId = ref<string | null>(null);
const menuPosition = ref({ top: 0, left: 0 });

const currentFilters = computed(() => ({
  timeframe: activeTimeframe.value,
  minAmount: activeMinAmount.value ?? undefined,
  maxAmount: activeMaxAmount.value ?? undefined,
  bookmarkedOnly: isBookmarkedOnly.value,
  search: searchQuery.value,
}));

const handleApplyPreset = (preset: FilterPreset) => {
  const f = preset.filters || {};
  activeTimeframe.value = f.timeframe || 'all';
  activeMinAmount.value = f.minAmount ?? null;
  activeMaxAmount.value = f.maxAmount ?? null;
  isBookmarkedOnly.value = Boolean(f.bookmarkedOnly);
  if (f.search !== undefined) {
    searchQuery.value = f.search;
  }
  fetchExpensesData(1, true);
};

const handleUpdateFilter = (key: string, value: any) => {
  if (key === 'timeframe') activeTimeframe.value = value;
  else if (key === 'minAmount') activeMinAmount.value = value;
  else if (key === 'maxAmount') activeMaxAmount.value = value;
  else if (key === 'bookmarkedOnly') isBookmarkedOnly.value = Boolean(value);
  fetchExpensesData(1, true);
};

const handleResetFilters = () => {
  activeTimeframe.value = 'all';
  activeMinAmount.value = null;
  activeMaxAmount.value = null;
  isBookmarkedOnly.value = false;
  searchQuery.value = '';
  fetchExpensesData(1, true);
};

const displayedExpenses = computed(() => expenses.value);

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
} = useBulkSelection(displayedExpenses);

const isBulkDeleting = ref(false);
const showBulkDeleteConfirm = ref(false);

const handleBulkDeleteConfirm = async () => {
  if (selectedIds.value.size === 0) return;
  isBulkDeleting.value = true;
  const idsToDelete = Array.from(selectedIds.value);
  try {
    const res = await expenseStore.bulkDeleteExpenses(idsToDelete);
    toast.success('Expenses deleted', {
      description: res?.message || `Successfully deleted ${idsToDelete.length} expense(s).`,
    });
    clearSelection();
    showBulkDeleteConfirm.value = false;
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to delete expenses');
  } finally {
    isBulkDeleting.value = false;
  }
};

const handleBulkExport = (format: 'csv' | 'json') => {
  if (selectedItems.value.length === 0) return;
  const exportData = selectedItems.value.map((e) => ({
    Date: e.date,
    'Expense Account': e.expenseAccount,
    Vendor: e.vendor || '',
    'Paid Through': e.paidThrough,
    Amount: e.amount,
    Status: e.status,
    Notes: e.notes || '',
  }));

  if (format === 'csv') {
    exportToCsv(exportData, 'expenses');
  } else {
    exportToJson(exportData, 'expenses');
  }
  toast.success(`Exported ${exportData.length} expense(s) as ${format.toUpperCase()}`);
};

const toggleExpenseBookmark = async (expense: Expense) => {
  await bookmarkStore.toggleBookmark({
    entity_type: "expense",
    entity_id: expense.id,
    title: expense.expenseAccount || "Expense",
    subtitle: expense.vendor || expense.paid_through || "",
    route: "/expenses",
    metadata: {
      amount: expense.amount,
      date: expense.date,
      vendorName: expense.vendor,
      status: expense.status,
    },
  });
  if (isBookmarkedOnly.value) {
    await fetchExpensesData(pagination.value.page, true);
  }
};


const getCustomerName = (expense: Expense) => {
  if (expense.customers?.name) return expense.customers.name;
  return (
    customerStore.customers.find((c) => c.id === expense.customerId)?.name ||
    "Unknown Client"
  );
};

const isInitialLoading = ref(expenseStore.expenses.length === 0);

const fetchExpensesData = async (page = 1, force = true) => {
  clearSelection();
  try {
    await expenseStore.fetchExpenses(
      page,
      pagination.value.limit,
      searchQuery.value,
      force,
      {
        timeframe: activeTimeframe.value,
        minAmount: activeMinAmount.value,
        maxAmount: activeMaxAmount.value,
        bookmarkedOnly: isBookmarkedOnly.value,
      }
    );
  } finally {
    isInitialLoading.value = false;
  }
};

const handlePageChange = (newPage: number) => {
  if (newPage < 1 || newPage > pagination.value.totalPages) return;
  fetchExpensesData(newPage, true);
  document.querySelector('main')?.scrollTo({ top: 0, behavior: "smooth" });
};

// Debounced fetch ONLY when typing into search input
let searchTimeout: any = null;
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchExpensesData(1, true);
  }, 250);
});

watch(isBookmarkedOnly, () => {
  clearSelection();
});

watch(() => pagination.value.page, () => {
  clearSelection();
});

const showAdvanced = ref(false);
const showTaxesDiscounts = ref(false);

const newExpense = ref<Omit<Expense, "id">>({
  date: new Date().toISOString().split("T")[0],
  expenseAccount: "",
  amount: 0,
  paidThrough: "",
  vendor: "",
  vendorId: "",
  notes: "",
  customerId: "",
  status: "Paid",
  taxCredit: false,
  reverseCharge: false,
  referenceNumber: "",
  isBillable: false,
  attachmentUrl: "",
  taxRate: 0,
  taxAmount: 0,
  customFields: {},
});

const { errors, validate, clearErrors } = useFormValidation(expenseSchema, newExpense);

const expenseAccounts = [
  "Advertising and Marketing",
  "Automobile Expense",
  "Consulting Expense",
  "Information Technology",
  "Meals and Entertainment",
  "Office Supplies",
  "Postage and Delivery",
  "Printing and Stationery",
  "Rent Expense",
  "Repairs and Maintenance",
  "Salaries and Wages",
  "Travel Expense",
];

// paidThroughOptions removed, using dynamic paymentAccounts from store

const isSaving = ref(false);

const handleAddExpense = async () => {
  if (!validate()) {
    toast.error("Expense creation failed", {
      description: "Please correct the errors in the form before saving.",
    });
    return;
  }

  isSaving.value = true;
  try {
    // Populate vendor name from vendorId if selected
    if (newExpense.value.vendorId) {
      const selectedVendor = vendorStore.vendors.find(v => v.id === newExpense.value.vendorId);
      if (selectedVendor) {
        newExpense.value.vendor = selectedVendor.name;
      }
    }

    const payload = {
      ...newExpense.value,
      customerId: newExpense.value.customerId || null,
      vendorId: newExpense.value.vendorId || null,
    };
    await expenseStore.addExpense(payload);
    toast.success("Expense recorded successfully", {
      description: `${newExpense.value.expenseAccount} of ${formatCurrency(newExpense.value.amount)} logged.`,
    });
    isAddingExpense.value = false;
    // Reset form
    showAdvanced.value = false;
    showTaxesDiscounts.value = false;
    newExpense.value = {
      date: new Date().toISOString().split("T")[0],
      expenseAccount: "",
      amount: 0,
      paidThrough: "",
      vendor: "",
      vendorId: "",
      notes: "",
      customerId: "",
      status: "Paid",
      taxCredit: false,
      reverseCharge: false,
      referenceNumber: "",
      isBillable: false,
      attachmentUrl: "",
      taxRate: 0,
      taxAmount: 0,
      customFields: {},
    };
    clearErrors();
  } catch (err: any) {
    console.error("Failed to add expense:", err);
    toast.error(err.response?.data?.error || "Failed to record expense");
  } finally {
    isSaving.value = false;
  }
};

const recalculateExpenseTax = () => {
  const baseAmount = Number(newExpense.value.amount) || 0;
  const rate = Number(newExpense.value.taxRate) || 0;
  newExpense.value.taxAmount = Number((baseAmount * (rate / 100)).toFixed(2));
};

watch(
  () => [newExpense.value.amount, newExpense.value.taxRate],
  () => {
    recalculateExpenseTax();
  }
);

const handleInlineVendorSuccess = (vendor: any) => {
  newExpense.value.vendorId = vendor.id;
  newExpense.value.vendor = vendor.name;
  toast.success(`Vendor ${vendor.name} selected`);
};

const handleInlineAccountSuccess = (accountName: string) => {
  newExpense.value.paidThrough = accountName;
  toast.success(`Payment account ${accountName} selected`);
};

const toggleMenu = (id: string, event: MouseEvent) => {
  event.stopPropagation();
  if (openMenuId.value === id) {
    openMenuId.value = null;
    return;
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const menuHeight = 90; // Height of expense menu

  // Vertically center the menu relative to the button for absolute consistency
  const top = rect.top + rect.height / 2 - menuHeight / 2;

  menuPosition.value = {
    top: top,
    left: rect.left - 200, // 192px width + 8px gap
  };

  openMenuId.value = id;
};

const closeMenus = () => {
  openMenuId.value = null;
};

const handleDelete = async (id: string) => {
  try {
    await expenseStore.deleteExpense(id);
    openMenuId.value = null;
  } catch (err) {
    console.error("Failed to delete expense:", err);
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

// Reactively listen to quick create triggers from TopBar or other components
watch(
  () => [quickCreateStore.pendingAction, quickCreateStore.actionToken],
  ([action]) => {
    if (action === "expense") {
      quickCreateStore.consume("expense");
      isAddingExpense.value = true;
    }
  },
  { immediate: true }
);

onMounted(() => {
  fetchExpensesData(1, true);
  expenseStore.fetchPaymentAccounts();
  customerStore.fetchCustomers();
  vendorStore.fetchVendors();
  window.addEventListener("click", closeMenus);
  window.addEventListener("scroll", closeMenus, true);
});

onUnmounted(() => {
  window.removeEventListener("click", closeMenus);
  window.removeEventListener("scroll", closeMenus, true);
});
</script>


<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Expenses" />

    <main class="flex-1 overflow-y-auto bg-background flex flex-col">
      <ViewGuard module="expenses">
        <!-- Sticky Transitional Header -->
        <StickyPageHeader
          :title="$t('modules.expenses.title')"
          :subtitle="$t('modules.expenses.subtitle')"
          :icon="Receipt"
        >
          <template #actions>
            <div v-if="canManage('expenses')" class="flex items-center gap-2.5">
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
                @click="isAddingExpense = true"
                size="sm"
                class="h-9 px-4 text-xs font-medium shadow-xs"
              >
                <Plus class="w-3.5 h-3.5 mr-1.5" />
                {{ $t('modules.expenses.new') }}
              </Button>
            </div>
          </template>
        </StickyPageHeader>

        <div class="px-8 pt-2 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">

          <!-- Dashboard Stats for Expenses -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <template v-if="isInitialLoading && displayedExpenses.length === 0">
              <Card v-for="i in 3" :key="i" class="bg-card/50 border-border/60 shadow-2xs">
                <CardContent class="p-6 space-y-3">
                  <div class="flex items-center justify-between">
                    <Skeleton class="h-3 w-24" />
                    <Skeleton class="h-9 w-9 rounded-xl" />
                  </div>
                  <Skeleton class="h-8 w-32" />
                </CardContent>
              </Card>
            </template>
            <template v-else>
              <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-rose-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
                <div class="h-[2.5px] w-full bg-rose-500/50"></div>
                <CardContent class="p-6">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
                      Total Expenses
                    </span>
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/15 text-rose-700 dark:text-rose-400 group-hover:scale-105 transition-transform">
                      <IndianRupee class="w-4 h-4" />
                    </div>
                  </div>
                  <div class="text-2xl font-bold text-foreground mb-1 tracking-tight font-mono">
                    {{ formatCurrency(expenseStore.stats.total) }}
                  </div>
                  <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    cumulative business expenses
                  </p>
                </CardContent>
              </Card>

              <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-amber-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
                <div class="h-[2.5px] w-full bg-amber-500/50"></div>
                <CardContent class="p-6">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
                      Last 30 Days
                    </span>
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/15 text-amber-700 dark:text-amber-400 group-hover:scale-105 transition-transform">
                      <Receipt class="w-4 h-4" />
                    </div>
                  </div>
                  <div class="text-2xl font-bold text-foreground mb-1 tracking-tight font-mono">
                    {{ formatCurrency(expenseStore.stats.last30Days) }}
                  </div>
                  <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    rolling monthly outlays
                  </p>
                </CardContent>
              </Card>

              <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-emerald-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
                <div class="h-[2.5px] w-full bg-emerald-500/50"></div>
                <CardContent class="p-6">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
                      Top Category
                    </span>
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <Tag class="w-4 h-4" />
                    </div>
                  </div>
                  <div class="text-2xl font-bold text-foreground mb-1 tracking-tight truncate">
                    {{ expenseStore.stats.topCategory || 'None' }}
                  </div>
                  <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    highest spending category
                  </p>
                </CardContent>
              </Card>
            </template>
          </div>

          <!-- Filter & Table -->
          <div class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs">
            <div class="p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-border/60 bg-muted/25 min-h-[65px]">
              <div class="relative w-full sm:w-60 md:w-72 lg:w-80 shrink-1 min-w-[180px] group">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-150" />
                <Input
                  v-model="searchQuery"
                  placeholder="Search by vendor, account, or customer..."
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

              <div class="flex items-center gap-2 flex-nowrap overflow-x-auto no-scrollbar justify-start md:justify-end shrink-0 max-w-full py-1.5 -my-1.5">
                <SmartPresetsBar
                  entity-type="expenses"
                  :active-filters="currentFilters"
                  @apply-preset="handleApplyPreset"
                  @update-filter="handleUpdateFilter"
                  @reset-filters="handleResetFilters"
                />
              </div>
            </div>

            <!-- Revalidation Progress Bar -->
            <div
              v-if="fetchingExpenses && displayedExpenses.length > 0"
              class="h-0.5 w-full bg-primary/10 overflow-hidden relative"
            >
              <div class="absolute inset-y-0 w-1/3 bg-primary/70 rounded-full animate-indeterminate"></div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/80 border-b border-border/70 bg-primary/[0.03]">
                    <th class="py-4 px-4 w-[48px] text-center"></th>
                    <th class="py-4 px-6">Date</th>
                    <th class="py-4 px-6">Expense Account</th>
                    <th class="py-4 px-6">Vendor</th>
                    <th class="py-4 px-6">Paid Through</th>
                    <th class="py-4 px-6 text-right">Amount</th>
                    <th class="py-4 px-6 text-right"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <template v-if="(isInitialLoading || fetchingExpenses) && displayedExpenses.length === 0">
                    <tr v-for="i in 5" :key="i">
                      <td class="py-4.5 px-4 text-center"><Skeleton class="h-4 w-4 mx-auto rounded" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-20" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-6 w-32 rounded-md" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-24" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-20" /></td>
                      <td class="py-4.5 px-6 text-right"><Skeleton class="h-4 w-24 ml-auto" /></td>
                      <td class="py-4.5 px-6 text-right"><Skeleton class="h-8 w-8 rounded-lg ml-auto" /></td>
                    </tr>
                  </template>
                  <template v-else>
                    <tr
                      v-for="expense in displayedExpenses"
                      :key="expense.id"
                      :data-state="isSelected(expense.id) ? 'selected' : undefined"
                      :class="[
                        'group cursor-pointer transition-colors duration-150',
                        isSelected(expense.id)
                          ? 'bg-primary/10 dark:bg-primary/15 hover:bg-primary/15 dark:hover:bg-primary/20'
                          : 'hover:bg-muted/50'
                      ]"
                    >
                      <td class="py-4.5 px-4 text-center w-[48px] cursor-pointer" @click.stop="toggleSelect(expense.id)">
                        <div
                          :class="[
                            'transition-opacity duration-150 flex items-center justify-center',
                            selectedCount > 0 || isSelected(expense.id)
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          ]"
                        >
                          <Checkbox
                            :checked="isSelected(expense.id)"
                            @update:checked="toggleSelect(expense.id)"
                            :aria-label="`Select expense ${expense.expenseNumber || expense.id}`"
                          />
                        </div>
                      </td>
                      <td class="py-4.5 px-6 text-xs text-muted-foreground font-semibold tracking-wide">
                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            @click.stop="toggleExpenseBookmark(expense)"
                            class="p-1 rounded-md transition-colors hover:bg-blue-500/10 shrink-0"
                            :title="bookmarkStore.isBookmarked('expense', expense.id) ? 'Remove Bookmark' : 'Bookmark Expense'"
                          >
                            <BookmarkIcon
                              :class="[
                                'w-3.5 h-3.5 transition-all active:scale-125',
                                bookmarkStore.isBookmarked('expense', expense.id)
                                  ? 'fill-blue-500 text-blue-500 opacity-100'
                                  : 'opacity-0 group-hover:opacity-40 hover:!opacity-100 text-muted-foreground hover:text-blue-500'
                              ]"
                            />
                          </button>
                          <span>{{ expense.date }}</span>
                        </div>
                      </td>
                      <td class="py-4.5 px-6">
                        <span
                          class="inline-flex items-center px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold whitespace-nowrap"
                        >
                          {{ expense.expenseAccount }}
                        </span>
                      </td>
                      <td class="py-4.5 px-6 text-sm text-foreground/80 group-hover:text-foreground font-medium transition-colors">
                        {{ expense.vendor || "—" }}
                      </td>
                      <td class="py-4.5 px-6 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        {{ expense.paidThrough }}
                      </td>
                      <td class="py-4.5 px-6 text-right text-sm font-bold text-foreground font-mono tracking-tight">
                        {{ formatCurrency(expense.amount) }}
                      </td>
                      <td class="py-4.5 px-6 text-right">
                        <Button
                          v-if="canManage('expenses')"
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 transition-colors opacity-70 group-hover:opacity-100"
                          @click="toggleMenu(expense.id, $event)"
                        >
                          <MoreHorizontal class="w-4 h-4" />
                        </Button>
                        <div v-else class="flex justify-end pr-2 text-muted-foreground/30" title="View Only Access">
                          <Lock class="w-3.5 h-3.5" />
                        </div>
                      </td>
                    </tr>
                    <tr v-if="displayedExpenses.length === 0">
                      <td colspan="7" class="py-32 text-center">
                        <div class="flex flex-col items-center justify-center max-w-xs mx-auto space-y-4">
                          <div class="w-16 h-16 rounded-3xl bg-blue-500/10 flex items-center justify-center">
                            <BookmarkIcon v-if="isBookmarkedOnly" class="w-8 h-8 text-blue-500 fill-blue-500/20" />
                            <Receipt v-else class="w-8 h-8 text-muted-foreground/40" />
                          </div>
                          <div class="space-y-1">
                            <h3 class="ui-section-title">
                              {{ isBookmarkedOnly ? 'No bookmarked expenses' : 'No expenses found' }}
                            </h3>
                            <p class="text-[11px] text-muted-foreground font-medium">
                              {{
                                isBookmarkedOnly
                                  ? 'Bookmark expenses from the list to quickly find and access them here.'
                                  : searchQuery
                                  ? 'Try adjusting your search query.'
                                  : 'Record your first operational expense to track spending.'
                              }}
                            </p>
                          </div>
                          <Button
                            v-if="isBookmarkedOnly"
                            @click="handleUpdateFilter('bookmarkedOnly', false)"
                            variant="ghost"
                            size="sm"
                            class="h-8 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10 cursor-pointer"
                          >
                            Show all expenses
                          </Button>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div v-if="displayedExpenses?.length > 0 && pagination?.totalPages > 1" class="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/20">
              <div class="flex items-center gap-2">
                 <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                   Showing {{ ((pagination.page - 1) * pagination.limit) + 1 }} to {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of {{ pagination.total }} Expenses
                 </p>
              </div>
              <div class="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  :disabled="pagination.page === 1"
                  @click="handlePageChange(pagination.page - 1)"
                  class="h-8 w-8 rounded-lg border-border/50 hover:bg-muted"
                >
                  <ChevronLeft class="w-4 h-4" />
                </Button>
                
                <div class="flex items-center gap-1">
                   <Button 
                     v-for="p in pagination.totalPages" 
                     :key="p"
                     variant="ghost"
                     size="sm"
                     @click="handlePageChange(p)"
                     :class="[
                       'h-8 w-8 rounded-lg font-bold text-xs',
                       pagination.page === p
                         ? 'bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90'
                         : 'text-muted-foreground hover:bg-muted',
                     ]"
                   >
                     {{ p }}
                   </Button>
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  :disabled="pagination.page >= pagination.totalPages"
                  @click="handlePageChange(pagination.page + 1)"
                  class="h-8 w-8 rounded-lg border-border/50 hover:bg-muted"
                >
                  <ChevronRight class="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <!-- Floating Bulk Action Bar -->
          <BulkActionBar
            :count="selectedCount"
            label="expenses"
            :loading="isBulkDeleting"
            :can-delete="canManage('expenses')"
            @clear="clearSelection"
            @delete="showBulkDeleteConfirm = true"
            @export="handleBulkExport"
          />

          <!-- Bulk Delete Confirmation Dialog -->
          <BulkConfirmDialog
            v-model:open="showBulkDeleteConfirm"
            :title="selectedCount > 1 ? `Delete ${selectedCount} Expenses` : 'Delete Expense'"
            :description="selectedCount > 1
              ? `You are about to permanently delete ${selectedCount} expenses and their corresponding ledger transactions. This action cannot be undone.`
              : `Are you sure you want to delete this expense? This action cannot be undone.`"
            :item-count="selectedCount"
            :item-names="selectedItems.map((e) => e.expenseAccount + (e.vendor ? ` (${e.vendor})` : ''))"
            action-label="Delete"
            variant="destructive"
            :loading="isBulkDeleting"
            @confirm="handleBulkDeleteConfirm"
          />
        </div>
      </ViewGuard>
    </main>
    </div>

    <!-- Teleported Context Menu (Overlays everything) -->
    <Teleport to="body">
      <div
        v-if="openMenuId"
        class="fixed z-[100] w-48 bg-card border border-border rounded-xl shadow-2xl py-1"
        :style="{
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
        }"
        @click.stop
      >
        <button type="button"
          @click="
            selectedDetail =
              expenseStore.expenses.find((e) => e.id === openMenuId) || null;
            openMenuId = null;
          "
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2"
        >
          <Eye class="w-3.5 h-3.5" />
          View Details
        </button>

        <button type="button"
          @click="
            const exp = expenseStore.expenses.find((e) => e.id === openMenuId);
            if (exp) toggleExpenseBookmark(exp);
            openMenuId = null;
          "
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2"
        >
          <BookmarkIcon
            :class="[
              'w-3.5 h-3.5',
              openMenuId && bookmarkStore.isBookmarked('expense', openMenuId)
                ? 'fill-blue-500 text-blue-500'
                : 'text-muted-foreground'
            ]"
          />
          {{ openMenuId && bookmarkStore.isBookmarked('expense', openMenuId) ? 'Remove Bookmark' : 'Bookmark Expense' }}
        </button>

        <button type="button"
          @click="handleDelete(openMenuId)"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 flex items-center gap-2 border-t border-border/50"
        >
          <Trash2 class="w-3.5 h-3.5" />
          Delete Expense
        </button>
      </div>
    </Teleport>

    <!-- Modal for Adding Expense -->
    <Modal
      :open="isAddingExpense"
      :title="t('modals.expenses.title')"
      max-width-class="max-w-xl"
      body-class="p-6 space-y-5 max-h-[70vh] overflow-y-auto"
      @close="isAddingExpense = false; clearErrors()"
    >
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label class="text-sm font-medium">
            {{ t('modals.expenses.fields.date') }} <span class="text-destructive">*</span>
          </Label>
          <DatePicker v-model="newExpense.date" />
          <p v-if="errors.date" class="text-xs text-destructive">
            {{ errors.date }}
          </p>
        </div>
        <div class="space-y-2">
          <Label class="text-sm font-medium">
            {{ t('modals.expenses.fields.amount') }} <span class="text-destructive">*</span>
          </Label>
          <div class="relative">
            <IndianRupee
              class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
            />
            <Input
              type="number"
              v-model="newExpense.amount"
              placeholder="0.00"
              class="pl-9 font-mono"
              :class="{ 'border-destructive focus-visible:ring-destructive': errors.amount }"
            />
          </div>
          <p v-if="errors.amount" class="text-xs text-destructive">
            {{ errors.amount }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label class="text-sm font-medium">
            {{ t('modals.expenses.fields.account') }} <span class="text-destructive">*</span>
          </Label>
          <Select
            v-model="newExpense.expenseAccount"
            :options="expenseAccounts"
            placeholder="Select Account"
            class="h-9 rounded-md"
          />
          <p v-if="errors.expenseAccount" class="text-xs text-destructive">
            {{ errors.expenseAccount }}
          </p>
        </div>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-sm font-medium">
              {{ t('modals.expenses.fields.paidThrough') }} <span class="text-destructive">*</span>
            </Label>
            <button
              type="button"
              @click="isAddingInlineAccount = true"
              class="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
            >
              <Plus class="w-3 h-3" /> {{ t('topbar.new') }}
            </button>
          </div>
          <AccountSelect
            v-model="newExpense.paidThrough"
            :options="paymentAccounts"
            :show-add-action="false"
            placeholder="Select payment account"
          />
          <p v-if="errors.paidThrough" class="text-xs text-destructive">
            {{ errors.paidThrough }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-sm font-medium">
              {{ t('modals.expenses.fields.vendor') }}
            </Label>
            <button
              type="button"
              @click="isAddingInlineVendor = true"
              class="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
            >
              <Plus class="w-3 h-3" /> {{ t('topbar.new') }}
            </button>
          </div>
          <Select
            v-model="newExpense.vendorId"
            :options="vendorStore.vendors"
            placeholder="Select Vendor"
            class="h-9 rounded-md"
          />
        </div>
        <div class="space-y-2">
          <Label class="text-sm font-medium">
            {{ t('modals.expenses.fields.invoiceNumber') }}
          </Label>
          <Input v-model="newExpense.invoiceNumber" placeholder="INV-001" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label class="text-sm font-medium">
            {{ t('modals.expenses.fields.status') }} <span class="text-destructive">*</span>
          </Label>
          <Select
            v-model="newExpense.status"
            :options="['Paid', 'Unpaid']"
            placeholder="Select Status"
            class="h-9 rounded-md"
          />
        </div>
        <div class="space-y-2">
          <Label class="text-sm font-medium">
            {{ t('modals.expenses.fields.customer') }}
          </Label>
          <Select
            v-model="newExpense.customerId"
            :options="customerStore.customers"
            placeholder="Select Client"
            class="h-9 rounded-md"
          />
        </div>
      </div>

      <div class="space-y-2">
        <Label class="text-sm font-medium">
          {{ t('modals.expenses.fields.notes') }}
        </Label>
        <Textarea
          v-model="newExpense.notes"
          class="min-h-[80px]"
          placeholder="Add some notes..."
        />
      </div>

      <!-- Advanced/Collapsible Section -->
      <div class="border rounded-lg overflow-hidden bg-card">
        <button
          type="button"
          @click="showAdvanced = !showAdvanced"
          class="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-xs font-medium text-foreground"
        >
          <span>{{ t('modals.expenses.fields.additionalInfo') }}</span>
          <ChevronDown :class="['w-4 h-4 transition-transform duration-200 text-muted-foreground', showAdvanced ? 'rotate-180' : '']" />
        </button>
        <div v-show="showAdvanced" class="p-4 space-y-4 border-t bg-muted/10 animate-in fade-in duration-200">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.expenses.fields.referenceNumber') }}</Label>
              <Input v-model="newExpense.referenceNumber" placeholder="REF-5678" />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.expenses.fields.attachmentUrl') }}</Label>
              <Input v-model="newExpense.attachmentUrl" placeholder="https://example.com/receipt.pdf" />
            </div>
          </div>
          
          <!-- Billable Switch -->
          <div class="flex items-center justify-between rounded-lg border p-3.5 bg-card">
            <div class="space-y-0.5 max-w-[75%]">
              <span class="text-sm font-medium text-foreground">{{ t('modals.expenses.fields.billable') }}</span>
              <p class="text-xs text-muted-foreground">{{ t('modals.expenses.fields.billableDesc') }}</p>
            </div>
            <Switch v-model="newExpense.isBillable" />
          </div>
        </div>
      </div>

      <!-- Taxes & Calculations Section -->
      <div class="border rounded-lg overflow-hidden bg-card">
        <button
          type="button"
          @click="showTaxesDiscounts = !showTaxesDiscounts"
          class="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-xs font-medium text-foreground"
        >
          <span>{{ t('modals.expenses.fields.taxDetails') }}</span>
          <ChevronDown :class="['w-4 h-4 transition-transform duration-200 text-muted-foreground', showTaxesDiscounts ? 'rotate-180' : '']" />
        </button>
        <div v-show="showTaxesDiscounts" class="p-4 space-y-4 border-t bg-muted/10 animate-in fade-in duration-200">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.expenses.fields.taxRate') }}</Label>
              <Input type="number" v-model.number="newExpense.taxRate" placeholder="0" />
            </div>
          </div>
          <div class="flex flex-col items-end pt-1 pr-1 space-y-1 text-right text-xs">
            <p class="text-muted-foreground">
              {{ t('modals.expenses.fields.calculatedTax') }} <span class="font-mono text-foreground font-semibold">₹{{ Number(newExpense.taxAmount || 0).toFixed(2) }}</span>
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <!-- Tax Credit Switch -->
            <div class="flex items-center justify-between rounded-lg border p-3.5 bg-card">
              <div class="space-y-0.5 max-w-[75%]">
                <span class="text-sm font-medium text-foreground">{{ t('modals.expenses.fields.taxCredit') }}</span>
                <p class="text-xs text-muted-foreground">{{ t('modals.expenses.fields.taxCreditDesc') }}</p>
              </div>
              <Switch v-model="newExpense.taxCredit" />
            </div>

            <!-- Reverse Charge Switch -->
            <div class="flex items-center justify-between rounded-lg border p-3.5 bg-card">
              <div class="space-y-0.5 max-w-[75%]">
                <span class="text-sm font-medium text-foreground">{{ t('modals.expenses.fields.reverseCharge') }}</span>
                <p class="text-xs text-muted-foreground">{{ t('modals.expenses.fields.reverseChargeDesc') }}</p>
              </div>
              <Switch v-model="newExpense.reverseCharge" />
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Fields Section -->
      <CustomFieldRenderer
        entity="expense"
        v-model="newExpense.customFields"
      />

      <template #footer>
        <Button
          @click="isAddingExpense = false; clearErrors();"
          variant="outline"
        >
          {{ t('common.close') }}
        </Button>
        <Button
          @click="handleAddExpense"
          :disabled="isSaving"
          class="gap-2"
        >
          <Spinner v-if="isSaving" size="sm" class="text-primary-foreground" />
          {{ isSaving ? t('common.saving') : t('modals.expenses.save') }}
        </Button>
      </template>
    </Modal>

    <!-- View Details Modal (Compact) -->
    <Modal
      :open="!!selectedDetail"
      :title="t('modals.expenses.detailTitle')"
      max-width-class="max-w-sm"
      body-class="p-5 max-h-[50vh] overflow-y-auto"
      @close="selectedDetail = null"
    >
      <template #header-actions>
        <button
          v-if="selectedDetail"
          type="button"
          @click="toggleExpenseBookmark(selectedDetail)"
          :class="[
            'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
            bookmarkStore.isBookmarked('expense', selectedDetail.id)
              ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          ]"
          :title="bookmarkStore.isBookmarked('expense', selectedDetail.id) ? 'Remove bookmark' : 'Bookmark expense'"
        >
          <BookmarkIcon
            :class="[
              'size-4 transition-transform active:scale-125',
              bookmarkStore.isBookmarked('expense', selectedDetail.id) ? 'fill-blue-500 text-blue-500' : ''
            ]"
          />
        </button>
      </template>

      <div v-if="selectedDetail" class="grid grid-cols-2 gap-x-4 gap-y-3">
        <div
          v-for="(val, key) in selectedDetail"
          :key="key"
          class="space-y-1"
        >
          <span class="text-xs text-muted-foreground font-medium">
            {{ key.replace(/([A-Z])/g, " $1").trim() }}
          </span>
          <p class="text-sm text-foreground font-medium break-words">
            {{ typeof val === 'boolean' ? (val ? 'Yes' : 'No') : (val || "—") }}
          </p>
        </div>
      </div>

      <template #footer>
        <Button
          @click="selectedDetail = null"
          variant="outline"
          size="sm"
          class="rounded-xl font-medium"
        >
          {{ t('common.close') }}
        </Button>
      </template>
    </Modal>
    <AddVendorModal
      :open="isAddingInlineVendor"
      @close="isAddingInlineVendor = false"
      @success="handleInlineVendorSuccess"
    />

    <AddAccountModal
      :open="isAddingInlineAccount"
      @close="isAddingInlineAccount = false"
      @success="handleInlineAccountSuccess"
    />

    <BulkUploadModal
      v-model:open="isBulkUploadOpen"
      entity="expenses"
      @success="fetchExpensesData(pagination.page, true)"
    />
  </div>
</template>

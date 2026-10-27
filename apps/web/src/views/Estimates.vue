<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from 'vue-i18n';
import Sidebar from "@/components/Sidebar.vue";
import TopBar from '@/components/TopBar.vue';
import { useEstimateStore, type Estimate } from "@/stores/estimateStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useItemStore } from "@/stores/itemStore";
import { useTheme } from "@/composables/useTheme";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  Plus,
  Search,
  MoreHorizontal,
  Calendar,
  User,
  Hash,
  IndianRupee,
  Calculator,
  Clock,
  FileText,
  Trash2,
  CheckCircle,
  Lock,
  Eye,
  Users,
  Package,
  ExternalLink,
  Info,
  Send,
  FileCheck,
  FileX,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Bookmark as BookmarkIcon,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import DatePicker from "@/components/ui/DatePicker.vue";
import Select from "@/components/ui/Select.vue";

import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "vue-sonner";
import { storeToRefs } from "pinia";
import ViewGuard from "@/components/ViewGuard.vue";
import AddCustomerModal from "@/components/AddCustomerModal.vue";
import AddItemModal from "@/components/AddItemModal.vue";
import { usePermissions } from "@/composables/usePermissions";
import { useFormValidation } from "@/composables/useFormValidation";
import { estimateSchema } from "@/utils/validationSchemas";
import { calculateDocumentTotals } from "@accountiva/shared";
import Modal from "@/components/Modal.vue";
import CustomFieldRenderer from "@/components/ui/CustomFieldRenderer.vue";
import StickyPageHeader from "@/components/ui/StickyPageHeader.vue";



import { useQuickCreateStore } from "@/stores/quickCreateStore";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { useCurrency } from "@/composables/useCurrency";

const estimateStore = useEstimateStore();
const bookmarkStore = useBookmarkStore();
const { estimates, pagination, loading: fetchingEstimates } = storeToRefs(estimateStore);
const customerStore = useCustomerStore();
const itemStore = useItemStore();
const { theme } = useTheme();
const router = useRouter();

const toggleEstimateBookmark = (est: any) => {
  bookmarkStore.toggleBookmark({
    entity_type: "estimate",
    entity_id: est.id,
    title: est.estimateNumber || "Estimate",
    subtitle: getCustomerName(est),
    route: "/estimates",
    metadata: {
      amount: est.amount,
      status: est.status,
      date: est.expiryDate,
      customerName: getCustomerName(est),
    },
  });
};

const quickCreateStore = useQuickCreateStore();
const { canManage } = usePermissions();
const { t } = useI18n();
const { currencySymbol } = useCurrency();

const discountTypeOptions = computed(() => [
  { id: '', name: t('modals.estimates.fields.noDiscount') },
  { id: 'Percentage', name: 'Percentage (%)' },
  { id: 'Flat', name: `Flat (${currencySymbol.value})` }
]);

const loading = ref(false);
const isSaving = ref(false);
const fetchingDetails = ref(false);
const statusLoadingAction = ref<string | null>(null);


const isAddingEstimate = ref(false);
const searchQuery = ref("");
const activeFilter = ref("All");
const openMenuId = ref<string | null>(null);
const menuPosition = ref({ top: 0, left: 0 });
const isAddingInlineCustomer = ref(false);
const isAddingInlineItem = ref(false);
const filters = ["All", "Draft", "Sent", "Accepted", "Declined", "Invoiced"];
const isBookmarkedOnly = ref(false);

const getFilterActiveClass = (filter: string) => {
  switch (filter) {
    case 'Accepted':
      return 'bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white font-semibold shadow-xs border border-transparent';
    case 'Sent':
      return 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white font-semibold shadow-xs border border-transparent';
    case 'Invoiced':
      return 'bg-primary text-primary-foreground font-semibold shadow-xs border border-transparent';
    case 'Declined':
      return 'bg-destructive text-destructive-foreground font-semibold shadow-xs border border-transparent';
    case 'Draft':
      return 'bg-secondary text-secondary-foreground font-semibold shadow-xs border border-border/60';
    default:
      return 'bg-background text-foreground font-semibold shadow-xs border border-border/40';
  }
};

const bookmarkedCount = computed(() => {
  return bookmarkStore.bookmarks.filter((b) => b.entity_type === "estimate").length;
});

const displayedEstimates = computed(() => {
  if (isBookmarkedOnly.value) {
    return estimates.value.filter((e) => bookmarkStore.isBookmarked("estimate", e.id));
  }
  return estimates.value;
});

const showAdvanced = ref(false);
const showTaxesDiscounts = ref(false);
const autoRoundOff = ref(true);

const newEstimate = ref<Omit<Estimate, "id">>({
  estimateNumber: '',
  date: new Date().toISOString().split("T")[0],
  expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  customerId: "",
  amount: 0,
  status: "Draft",
  items: [],
  referenceNumber: "",
  billingAddress: "",
  shippingAddress: "",
  terms: "",
  discountType: "",
  discountValue: 0,
  discountAmount: 0,
  shippingCharges: 0,
  packagingCharges: 0,
  adjustment: 0,
  roundOff: 0,
  notes: "",
  termsConditions: "",
  taxPercent: 0,
  taxAmount: 0,
  customFields: {},
});

const { errors, validate, clearErrors } = useFormValidation(estimateSchema, newEstimate);

const loadNextEstimateNumber = async () => {
  try {
    newEstimate.value.estimateNumber = await estimateStore.fetchNextEstimateNumber();
  } catch {
    newEstimate.value.estimateNumber = '';
    toast.error('Could not generate the next estimate number');
  }
};

watch(isAddingEstimate, (val) => {
  if (val && !isEditing.value) {
    resetEstimateForm();
  }
});

const getCustomerName = (estimate: Estimate) => {
  if (estimate.customers?.name) return estimate.customers.name;
  return customerStore.customers.find((c) => c.id === estimate.customerId)?.name || "Unknown Client";
};

const handlePageChange = (newPage: number) => {
  if (newPage < 1 || newPage > pagination.value.totalPages) return;
  estimateStore.fetchEstimates(newPage, pagination.value.limit, searchQuery.value, activeFilter.value);
  document.querySelector('main')?.scrollTo({ top: 0, behavior: "smooth" });
};

// Search & Filter with debounce
let timeout: any = null;
watch([searchQuery, activeFilter], ([newSearch, newFilter]) => {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    estimateStore.fetchEstimates(1, pagination.value.limit, newSearch, newFilter, true);
  }, 300);
});

const isEditing = ref(false);
const editingEstimateId = ref<string | null>(null);

const startEditEstimate = async (estimate: Estimate) => {
  isEditing.value = true;
  editingEstimateId.value = estimate.id;
  openMenuId.value = null;

  const source = (estimate.items ? estimate : estimateStore.detailsCache[estimate.id]) || estimate;

  // Pre-populate with summary item immediately
  newEstimate.value = {
    estimateNumber: source.estimateNumber,
    date: source.date || new Date().toISOString().split("T")[0],
    expiryDate: source.expiryDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    customerId: source.customerId,
    amount: source.amount,
    status: source.status,
    items: source.items ? source.items.map((item) => ({ ...item })) : [],
    referenceNumber: source.referenceNumber || "",
    billingAddress: source.billingAddress || "",
    shippingAddress: source.shippingAddress || "",
    terms: source.terms || "",
    discountType: source.discountType || "",
    discountValue: source.discountValue || 0,
    discountAmount: source.discountAmount || 0,
    shippingCharges: source.shippingCharges || 0,
    packagingCharges: (source as any).packagingCharges ?? (source as any).packaging_charges ?? 0,
    adjustment: (source as any).roundOff ?? source.adjustment ?? 0,
    roundOff: (source as any).roundOff ?? source.adjustment ?? 0,
    notes: source.notes || "",
    termsConditions: source.termsConditions || "",
    taxPercent: source.taxPercent || 0,
    taxAmount: source.taxAmount || 0,
    customFields: source.customFields ? { ...source.customFields } : {},
  };

  isAddingEstimate.value = true;

  // If items and details are already available in memory, no need to trigger loading or network delay
  if (source.items && source.referenceNumber !== undefined) {
    fetchingDetails.value = false;
    return;
  }

  const hasCache = !!estimateStore.detailsCache[estimate.id]?.items;
  if (!hasCache) {
    fetchingDetails.value = true;
  }
  try {
    const details = await estimateStore.fetchEstimateDetails(estimate.id);
    newEstimate.value = {
      estimateNumber: details.estimateNumber,
      date: details.date,
      expiryDate: details.expiryDate,
      customerId: details.customerId,
      amount: details.amount,
      status: details.status,
      items: details.items ? details.items.map((item) => ({ ...item })) : [],
      referenceNumber: details.referenceNumber || "",
      billingAddress: details.billingAddress || "",
      shippingAddress: details.shippingAddress || "",
      terms: details.terms || "",
      discountType: details.discountType || "",
      discountValue: details.discountValue || 0,
      discountAmount: details.discountAmount || 0,
      shippingCharges: details.shippingCharges || 0,
      packagingCharges: (details as any).packagingCharges ?? (details as any).packaging_charges ?? 0,
      adjustment: (details as any).roundOff ?? details.adjustment ?? 0,
      roundOff: (details as any).roundOff ?? details.adjustment ?? 0,
      notes: details.notes || "",
      termsConditions: details.termsConditions || "",
      taxPercent: details.taxPercent || 0,
      taxAmount: details.taxAmount || 0,
      customFields: details.customFields ? { ...details.customFields } : (estimate.customFields || {}),
    };
  } catch (err) {
    console.error(err);
    toast.error("Failed to load estimate details");
  } finally {
    fetchingDetails.value = false;
  }
};

const resetEstimateForm = () => {
  isEditing.value = false;
  editingEstimateId.value = null;
  showAdvanced.value = false;
  showTaxesDiscounts.value = false;
  newEstimate.value = {
    estimateNumber: '',
    date: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    customerId: "",
    amount: 0,
    status: "Draft",
    items: [],
    referenceNumber: "",
    billingAddress: "",
    shippingAddress: "",
    terms: "",
    discountType: "",
    discountValue: 0,
    discountAmount: 0,
    shippingCharges: 0,
    packagingCharges: 0,
    adjustment: 0,
    roundOff: 0,
    notes: "",
    termsConditions: "",
    taxPercent: 0,
    taxAmount: 0,
    customFields: {},
  };
  clearErrors();
  void loadNextEstimateNumber();
};

const checkEstimateLimitAndCreate = () => {
  resetEstimateForm();
  isAddingEstimate.value = true;
};

// Reactively listen to quick create triggers from TopBar or other components
watch(
  () => [quickCreateStore.pendingAction, quickCreateStore.actionToken],
  ([action]) => {
    if (action === "estimate") {
      quickCreateStore.consume("estimate");
      checkEstimateLimitAndCreate();
    }
  },
  { immediate: true }
);

const addItemToEstimate = (item: any) => {
  if (!newEstimate.value.items) {
    newEstimate.value.items = [];
  }
  const existingItemIndex = newEstimate.value.items.findIndex(i => i.itemId === item.id);
  if (existingItemIndex > -1) {
    newEstimate.value.items[existingItemIndex].quantity += 1;
    newEstimate.value.items[existingItemIndex].amount = 
      Number(newEstimate.value.items[existingItemIndex].quantity) * Number(newEstimate.value.items[existingItemIndex].rate);
  } else {
    newEstimate.value.items.push({
      itemId: item.id,
      itemName: item.name,
      quantity: 1,
      rate: Number(item.unitPrice),
      amount: Number(item.unitPrice),
      description: item.description || ''
    });
  }
  recalculateEstimateTotalAmount();
};

const removeItemFromEstimate = (index: number) => {
  if (!newEstimate.value.items) return;
  newEstimate.value.items.splice(index, 1);
  recalculateEstimateTotalAmount();
};

const updateEstimateItemQuantity = (index: number, qty: number) => {
  if (!newEstimate.value.items) return;
  if (qty < 0) qty = 0;
  newEstimate.value.items[index].quantity = qty;
  newEstimate.value.items[index].amount = qty * newEstimate.value.items[index].rate;
  recalculateEstimateTotalAmount();
};

const updateEstimateItemRate = (index: number, rate: number) => {
  if (!newEstimate.value.items) return;
  if (rate < 0) rate = 0;
  newEstimate.value.items[index].rate = rate;
  newEstimate.value.items[index].amount = newEstimate.value.items[index].quantity * rate;
  recalculateEstimateTotalAmount();
};

const recalculateEstimateTotalAmount = () => {
  if (!newEstimate.value.items) return;
  const totals = calculateDocumentTotals({
    items: newEstimate.value.items,
    discountType: newEstimate.value.discountType,
    discountValue: newEstimate.value.discountValue,
    taxPercent: newEstimate.value.taxPercent,
    shippingCharges: newEstimate.value.shippingCharges,
    packagingCharges: newEstimate.value.packagingCharges,
    roundOff: newEstimate.value.adjustment,
    autoRoundOff: autoRoundOff.value,
  });

  newEstimate.value.discountAmount = totals.discountAmount;
  newEstimate.value.taxAmount = totals.taxAmount;
  newEstimate.value.adjustment = totals.roundOff;
  newEstimate.value.roundOff = totals.roundOff;
  newEstimate.value.amount = totals.total;
};

watch(
  () => [
    newEstimate.value.discountType,
    newEstimate.value.discountValue,
    newEstimate.value.taxPercent,
    newEstimate.value.shippingCharges,
    newEstimate.value.packagingCharges,
    newEstimate.value.adjustment,
    autoRoundOff.value,
  ],
  () => {
    recalculateEstimateTotalAmount();
  }
);

const handleAddEstimate = async () => {
  if (!validate()) {
    toast.error(isEditing.value ? "Estimate update failed" : "Estimate creation failed", {
      description: "Please correct the errors in the form before saving.",
    });
    return;
  }

  loading.value = true;
  try {
    if (isEditing.value && editingEstimateId.value) {
      await estimateStore.updateEstimate(editingEstimateId.value, { ...newEstimate.value });
      toast.success("Estimate updated successfully", {
        description: `${newEstimate.value.estimateNumber} has been updated.`,
      });
    } else {
      await estimateStore.addEstimate({ ...newEstimate.value });
      toast.success("Estimate created successfully", {
        description: `${newEstimate.value.estimateNumber} has been generated.`,
      });
    }
    isAddingEstimate.value = false;
    resetEstimateForm();
  } catch (err: any) {
    console.error("Failed to save estimate:", err);
    const errMsg = err.response?.data?.error || "Failed to save estimate";
    toast.error(errMsg);
  } finally {
    loading.value = false;
  }
};


const activeMenuEstimate = computed(() => {
  if (!openMenuId.value) return null;
  return estimateStore.estimates.find((e) => e.id === openMenuId.value) || null;
});

const handleStatusUpdateClick = (status: 'Sent' | 'Accepted' | 'Declined') => {
  if (openMenuId.value) {
    handleStatusUpdate(openMenuId.value, status);
  }
};

const handleEditClick = () => {
  if (openMenuId.value) {
    const est = estimateStore.estimates.find((e) => e.id === openMenuId.value);
    if (est) startEditEstimate(est);
  }
};

const handleConvertToInvoiceClick = () => {
  if (openMenuId.value) {
    handleConvertToInvoice(openMenuId.value);
  }
};

const handleDeleteClick = () => {
  if (openMenuId.value) {
    handleDelete(openMenuId.value);
  }
};

const toggleMenu = (id: string, event: MouseEvent) => {
  event.stopPropagation();
  if (openMenuId.value === id) {
    openMenuId.value = null;
    return;
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const menuHeight = 180; // Estimated height

  const top = rect.top + rect.height / 2 - menuHeight / 2;

  menuPosition.value = {
    top: top,
    left: rect.left - 200,
  };

  openMenuId.value = id;
};

const closeMenus = () => {
  openMenuId.value = null;
};

const handleDelete = async (id: string) => {
  try {
    await estimateStore.deleteEstimate(id);
    openMenuId.value = null;
  } catch (err) {
    console.error("Failed to delete estimate:", err);
  }
};

const handleStatusUpdate = async (id: string, status: Estimate["status"]) => {
  if (!id) return;
  statusLoadingAction.value = `${id}-${status}`;
  try {
    await estimateStore.updateEstimateStatus(id, status);
    openMenuId.value = null;
    toast.success(`Estimate marked as ${status}`);
  } catch (err: any) {
    console.error("Failed to update status:", err);
    toast.error(err?.response?.data?.error || estimateStore.error || "Failed to update status");
  } finally {
    statusLoadingAction.value = null;
  }
};

const handleConvertToInvoice = async (id: string) => {
  if (!id) return;
  statusLoadingAction.value = `${id}-converting`;
  try {
    await estimateStore.convertToInvoice(id);
    openMenuId.value = null;
    toast.success("Estimate converted to invoice successfully");
    router.push("/invoices");
  } catch (err: any) {
    console.error("Failed to convert to invoice:", err);
    toast.error("Failed to convert to invoice");
  } finally {
    statusLoadingAction.value = null;
  }
};

const handleInlineCustomerSuccess = (customer: any) => {
  newEstimate.value.customerId = customer.id;
  toast.success(`Customer ${customer.name} selected`);
};

const redirectToAddItem = () => {
  isAddingInlineItem.value = true;
};

const handleInlineItemSuccess = (item: any) => {
  addItemToEstimate(item);
  toast.success(`Item ${item.name} added and selected`);
};

const stats = computed(() => {
  const { pending, accepted, invoiced } = estimateStore.stats;

  return [
    {
      title: "Pending Quotes",
      amount: formatCurrency(pending),
      subText: "awaiting approval",
      icon: Clock,
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-500/10 border border-amber-500/15",
      accentBar: "bg-amber-500/50",
      containerClass: "bg-amber-500/[0.02]",
    },
    {
      title: "Accepted",
      amount: formatCurrency(accepted),
      subText: "ready to invoice",
      icon: CheckCircle,
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border border-emerald-500/15",
      accentBar: "bg-emerald-500/40",
      containerClass: "bg-emerald-500/[0.02]",
    },
    {
      title: "Invoiced",
      amount: formatCurrency(invoiced),
      subText: "converted to sales",
      icon: FileText,
      color: "text-primary",
      bg: "bg-primary/10 border border-primary/15",
      accentBar: "bg-primary/50",
      containerClass: "bg-primary/[0.02]",
    },
  ];
});

onMounted(() => {
  void loadNextEstimateNumber();
  estimateStore.fetchEstimates(1, 10);
  customerStore.fetchCustomers();
  itemStore.fetchItems();
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
      <Sidebar active-item="Estimates" />

    <main class="flex-1 overflow-y-auto bg-background flex flex-col">
      <ViewGuard module="estimates">
        <!-- Sticky Transitional Header -->
        <StickyPageHeader
          :title="$t('modules.estimates.title')"
          :subtitle="$t('modules.estimates.subtitle')"
          :icon="Calculator"
        >
          <template #actions>
            <Button
              v-if="canManage('estimates')"
              @click="isAddingEstimate = true"
              size="sm"
              class="h-9 px-4 text-xs font-medium shadow-xs"
            >
              <Plus class="w-3.5 h-3.5 mr-1.5" />
              {{ $t('modules.estimates.new') }}
            </Button>
          </template>
        </StickyPageHeader>

        <div class="px-8 pt-2 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">
          <!-- Stats -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <template v-if="fetchingEstimates">
              <Card v-for="i in 3" :key="i" class="bg-card/50 border-border/60 overflow-hidden shadow-2xs">
                <CardContent class="p-6 space-y-3">
                  <div class="flex items-center justify-between">
                    <Skeleton class="h-3 w-24" />
                    <Skeleton class="h-9 w-9 rounded-xl" />
                  </div>
                  <Skeleton class="h-8 w-32" />
                  <Skeleton class="h-3 w-40" />
                </CardContent>
              </Card>
            </template>
            <template v-else>
              <Card
                v-for="stat in stats"
                :key="stat.title"
                :class="[
                  'border-border/60 shadow-2xs overflow-hidden relative group hover:border-primary/40 hover:shadow-xs transition-all duration-300 py-0 gap-0',
                  'bg-card/50 backdrop-blur-xs',
                  stat.containerClass,
                ]"
              >
                <div :class="['h-[2.5px] w-full', stat.accentBar]"></div>
                <CardContent class="p-6">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">{{
                      stat.title
                    }}</span>
                    <div :class="['w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105', stat.bg, stat.color]">
                      <component :is="stat.icon" class="w-4 h-4" />
                    </div>
                  </div>
                  <div class="text-2xl font-bold text-foreground mb-1 tracking-tight">
                    {{ stat.amount }}
                  </div>
                  <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {{ stat.subText }}
                  </p>
                </CardContent>
              </Card>
            </template>
          </div>


          <!-- Filter & Table -->
          <div class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs">
            <div class="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border/60 bg-muted/25">
              <div class="relative w-full sm:w-72 md:w-80 group">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-150" />
                <Input
                  v-model="searchQuery"
                  placeholder="Search clients, estimates..."
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

              <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end w-full sm:w-auto">
                <div class="inline-flex h-8.5 items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50 overflow-x-auto max-w-full">
                  <button
                    type="button"
                    v-for="filter in filters"
                    :key="filter"
                    @click="activeFilter = filter; isBookmarkedOnly = false"
                    :class="[
                      'px-2.5 py-1 rounded-md text-xs transition-all duration-150 whitespace-nowrap cursor-pointer',
                      activeFilter === filter && !isBookmarkedOnly
                        ? getFilterActiveClass(filter)
                        : 'text-muted-foreground font-medium hover:text-foreground hover:bg-muted/40 border border-transparent',
                    ]"
                  >
                    {{ filter }}
                  </button>
                  <div class="w-px h-3.5 bg-border/60 mx-0.5" />
                  <button
                    type="button"
                    @click="isBookmarkedOnly = !isBookmarkedOnly"
                    :class="[
                      'px-2.5 py-1 rounded-md text-xs transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                      isBookmarkedOnly
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold shadow-xs border border-blue-500/30'
                        : 'text-muted-foreground font-medium hover:text-foreground hover:bg-muted/40 border border-transparent',
                    ]"
                    :title="isBookmarkedOnly ? 'Show all estimates' : 'Filter only bookmarked estimates'"
                  >
                    <BookmarkIcon
                      :class="[
                        'w-3.5 h-3.5 transition-colors',
                        isBookmarkedOnly ? 'fill-blue-500 text-blue-500' : 'text-muted-foreground',
                      ]"
                    />
                    <span>Bookmarked</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="text-xs font-medium text-muted-foreground border-b border-border bg-muted/35">
                    <th class="py-3.5 px-6 font-medium">Estimate #</th>
                    <th class="py-3.5 px-6 font-medium">Client</th>
                    <th class="py-3.5 px-6 font-medium">Expiry</th>
                    <th class="py-3.5 px-6 font-medium">Amount</th>
                    <th class="py-3.5 px-6 font-medium text-center">Status</th>
                    <th class="py-3.5 px-6 text-right"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <template v-if="fetchingEstimates">
                    <tr v-for="i in 5" :key="i">
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-20" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-32" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-24" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-20" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-6 w-16 rounded-md" /></td>
                      <td class="py-4.5 px-6 text-right"><Skeleton class="h-8 w-8 rounded-lg ml-auto" /></td>
                    </tr>
                  </template>
                  <template v-else>
                    <tr
                      v-for="est in displayedEstimates"
                      :key="est.id"
                      class="hover:bg-muted/50 group cursor-pointer transition-colors duration-150"
                    >
                      <td
                        class="py-4.5 px-6 text-sm font-bold text-foreground group-hover:text-primary tracking-tight transition-colors"
                      >
                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            @click.stop="toggleEstimateBookmark(est)"
                            class="p-1 rounded-md transition-colors hover:bg-blue-500/10 shrink-0"
                            :title="bookmarkStore.isBookmarked('estimate', est.id) ? 'Remove Bookmark' : 'Bookmark Estimate'"
                          >
                            <BookmarkIcon
                              :class="[
                                'w-3.5 h-3.5 transition-all active:scale-125',
                                bookmarkStore.isBookmarked('estimate', est.id)
                                  ? 'fill-blue-500 text-blue-500 opacity-100'
                                  : 'opacity-0 group-hover:opacity-40 hover:!opacity-100 text-muted-foreground hover:text-blue-500'
                              ]"
                            />
                          </button>
                          <span>{{ est.estimateNumber }}</span>
                        </div>
                      </td>
                      <td
                        class="py-4.5 px-6 text-sm text-foreground/80 group-hover:text-foreground font-medium transition-colors"
                      >
                        {{ getCustomerName(est) }}
                      </td>
                      <td
                        class="py-4.5 px-6 text-xs text-muted-foreground font-semibold tracking-wide"
                      >
                        {{ est.expiryDate }}
                      </td>
                      <td
                        class="py-4.5 px-6 text-sm font-bold text-foreground tracking-tight font-mono"
                      >
                        {{ formatCurrency(est.amount) }}
                      </td>
                      <td class="py-3.5 px-6">
                        <span
                          :class="[
                            'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap shadow-xs transition-colors',
                            est.status === 'Accepted'
                              ? 'border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white'
                              : est.status === 'Sent'
                                ? 'border-transparent bg-blue-600 text-white dark:bg-blue-500 dark:text-white'
                                : est.status === 'Invoiced'
                                  ? 'border-transparent bg-primary text-primary-foreground'
                                  : est.status === 'Declined'
                                    ? 'border-transparent bg-destructive text-destructive-foreground'
                                    : 'border-transparent bg-secondary text-secondary-foreground'
                          ]"
                        >
                          {{ est.status }}
                        </span>
                      </td>
                      <td class="py-4.5 px-6 text-right">
                        <Button
                          v-if="canManage('estimates')"
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 transition-colors opacity-70 group-hover:opacity-100"
                          @click="toggleMenu(est.id, $event)"
                        >
                          <MoreHorizontal class="w-4 h-4" />
                        </Button>
                        <div v-else class="flex justify-end pr-2 text-muted-foreground/30" title="View Only Access">
                          <Lock class="w-3.5 h-3.5" />
                        </div>
                      </td>
                    </tr>
                    <tr v-if="displayedEstimates.length === 0">
                      <td colspan="6" class="py-24 text-center">
                        <div
                          class="flex flex-col items-center justify-center max-w-xs mx-auto space-y-4"
                        >
                          <div
                            class="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-2xs"
                          >
                            <BookmarkIcon v-if="isBookmarkedOnly" class="w-7 h-7 text-blue-500 fill-blue-500/20" />
                            <FileText v-else class="w-7 h-7" />
                          </div>
                          <div class="space-y-1">
                            <h3 class="text-base font-bold text-foreground">
                              {{ isBookmarkedOnly ? 'No bookmarked estimates' : 'No estimates found' }}
                            </h3>
                            <p
                              class="text-xs text-muted-foreground font-medium"
                            >
                              {{
                                isBookmarkedOnly
                                  ? (activeFilter !== 'All'
                                      ? `No bookmarked estimates with status "${activeFilter}".`
                                      : 'Bookmark estimates from the list to quickly find and access them here.')
                                  : searchQuery
                                  ? "Try adjusting your search filters to find what you are looking for."
                                  : "Send a professional quote to a customer to win their business."
                              }}
                            </p>
                          </div>
                          <Button
                            v-if="!isBookmarkedOnly && !searchQuery && canManage('estimates')"
                            @click="isAddingEstimate = true"
                            variant="outline"
                            size="sm"
                            class="h-9 px-4 rounded-xl font-bold uppercase tracking-wider text-[11px] border-border/70 hover:bg-muted/50"
                          >
                            Create Estimate
                          </Button>
                          <Button
                            v-else-if="isBookmarkedOnly"
                            @click="isBookmarkedOnly = false"
                            variant="ghost"
                            size="sm"
                            class="h-8 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10 cursor-pointer"
                          >
                            Show all {{ activeFilter !== 'All' ? activeFilter : '' }} estimates
                          </Button>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>

              </table>
            </div>

            <!-- Pagination -->
            <div v-if="!fetchingEstimates && !isBookmarkedOnly && displayedEstimates?.length > 0 && pagination?.totalPages > 1" class="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/5">
              <div class="flex items-center gap-2">
                 <p class="text-xs text-muted-foreground font-medium">
                   Showing {{ ((pagination.page - 1) * pagination.limit) + 1 }} to {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of {{ pagination.total }} Estimates
                 </p>
              </div>
              <div class="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  :disabled="pagination.page === 1"
                  @click="handlePageChange(pagination.page - 1)"
                  class="h-8 w-8 rounded-md hover:bg-muted"
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
                       'h-8 w-8 rounded-md text-xs font-medium',
                       pagination.page === p ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:bg-muted'
                     ]"
                   >
                     {{ p }}
                   </Button>
                </div>

                <Button 
                  variant="outline" 
                  size="icon" 
                  :disabled="pagination.page === pagination.totalPages"
                  @click="handlePageChange(pagination.page + 1)"
                  class="h-8 w-8 rounded-md hover:bg-muted"
                >
                  <ChevronRight class="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ViewGuard>
    </main>
    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="openMenuId"
        class="fixed z-[100] w-48 bg-card border border-border rounded-xl shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
        :style="{
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
        }"
        @click.stop
      >
        <button type="button"
          @click="handleStatusUpdateClick('Sent')"
          :disabled="!!statusLoadingAction"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Spinner v-if="statusLoadingAction === `${activeMenuEstimate?.id}-Sent`" class="w-3.5 h-3.5" />
          <Send v-else class="w-3.5 h-3.5" />
          {{ statusLoadingAction === `${activeMenuEstimate?.id}-Sent` ? 'Processing...' : 'Mark as Sent' }}
        </button>
        <button type="button"
          @click="handleStatusUpdateClick('Accepted')"
          :disabled="!!statusLoadingAction"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-success hover:bg-success/10 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Spinner v-if="statusLoadingAction === `${activeMenuEstimate?.id}-Accepted`" class="w-3.5 h-3.5" />
          <FileCheck v-else class="w-3.5 h-3.5" />
          {{ statusLoadingAction === `${activeMenuEstimate?.id}-Accepted` ? 'Processing...' : 'Mark as Accepted' }}
        </button>
        <button type="button"
          @click="handleStatusUpdateClick('Declined')"
          :disabled="!!statusLoadingAction"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Spinner v-if="statusLoadingAction === `${activeMenuEstimate?.id}-Declined`" class="w-3.5 h-3.5" />
          <FileX v-else class="w-3.5 h-3.5" />
          {{ statusLoadingAction === `${activeMenuEstimate?.id}-Declined` ? 'Processing...' : 'Mark as Declined' }}
        </button>
        <div class="h-px bg-border/50 my-1"></div>
        <button type="button"
          @click="handleEditClick"
          :disabled="!!statusLoadingAction"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <ExternalLink class="w-3.5 h-3.5" />
          Edit Estimate
        </button>
        <button type="button"
          v-if="activeMenuEstimate?.status === 'Accepted'"
          @click="handleConvertToInvoiceClick"
          :disabled="!!statusLoadingAction"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-primary hover:bg-primary/10 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Spinner v-if="statusLoadingAction === `${activeMenuEstimate?.id}-converting`" class="w-3.5 h-3.5" />
          <ExternalLink v-else class="w-3.5 h-3.5" />
          {{ statusLoadingAction === `${activeMenuEstimate?.id}-converting` ? 'Converting...' : 'Convert to Invoice' }}
        </button>
        <button type="button"
          @click="handleDeleteClick"
          :disabled="!!statusLoadingAction"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors disabled:opacity-50 border-t border-border/50"
        >
          <Trash2 class="w-3.5 h-3.5" />
          Delete Estimate
        </button>
      </div>
    </Teleport>

    <!-- Modal for Adding Estimate -->
    <Modal
      :open="isAddingEstimate"
      :title="isEditing ? t('modals.estimates.editTitle') : t('modals.estimates.newTitle')"
      :description="t('modals.estimates.subtitle')"
      max-width-class="max-w-xl"
      body-class="p-6 space-y-5 max-h-[70vh] overflow-y-auto"
      @close="isAddingEstimate = false; resetEstimateForm(); clearErrors();"
    >
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="estimateNumber" class="text-sm font-medium">
            {{ t('modals.estimates.fields.number') }} <span class="text-destructive">*</span>
          </Label>
          <Input
            id="estimateNumber"
            v-model="newEstimate.estimateNumber"
            class="font-mono"
            :class="{ 'border-destructive focus-visible:ring-destructive': errors.estimateNumber }"
          />
          <p v-if="errors.estimateNumber" class="text-xs text-destructive">
            {{ errors.estimateNumber }}
          </p>
        </div>
        <div class="space-y-2">
          <Label for="estimateAmount" class="text-sm font-medium">
            {{ t('modals.estimates.fields.amount') }} <span class="text-destructive">*</span>
          </Label>
          <div class="relative">
            <IndianRupee
              class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
            />
            <Input
              id="estimateAmount"
              type="number"
              v-model="newEstimate.amount"
              placeholder="0.00"
              class="pl-9 font-mono"
              :disabled="newEstimate.items && newEstimate.items.length > 0"
              :class="{ 'border-destructive focus-visible:ring-destructive': errors.amount }"
            />
          </div>
          <p v-if="errors.amount" class="text-xs text-destructive">
            {{ errors.amount }}
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label class="text-sm font-medium">
            {{ t('modals.estimates.fields.customer') }} <span class="text-destructive">*</span>
          </Label>
          <button type="button"
            @click="isAddingInlineCustomer = true"
            class="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
          >
            <Plus class="w-3 h-3" /> {{ t('topbar.new') }}
          </button>
        </div>
        <Select
          v-model="newEstimate.customerId"
          :options="customerStore.customers"
          :placeholder="t('modals.estimates.fields.selectCustomer')"
        />
        <p v-if="errors.customerId" class="text-xs text-destructive">
          {{ errors.customerId }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label class="text-sm font-medium">{{ t('modals.estimates.fields.date') }}</Label>
          <DatePicker v-model="newEstimate.date" />
          <p v-if="errors.date" class="text-xs text-destructive">
            {{ errors.date }}
          </p>
        </div>
        <div class="space-y-2">
          <Label class="text-sm font-medium">{{ t('modals.estimates.fields.expiryDate') }}</Label>
          <DatePicker v-model="newEstimate.expiryDate" />
          <p v-if="errors.expiryDate" class="text-xs text-destructive">
            {{ errors.expiryDate }}
          </p>
        </div>
      </div>

      <!-- Selected Items List -->
      <div v-if="newEstimate.items && newEstimate.items.length > 0" class="space-y-2 pt-2">
        <Label class="text-sm font-medium">{{ t('modals.estimates.fields.selectedItems') }}</Label>
        <div class="border rounded-lg overflow-hidden divide-y bg-card">
          <div
            v-for="(item, idx) in newEstimate.items"
            :key="item.itemId"
            class="p-3 flex items-center justify-between gap-4 text-xs"
          >
            <div class="flex-1 min-w-0 space-y-1.5">
              <p class="font-medium truncate text-foreground text-sm">{{ item.itemName }}</p>
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-muted-foreground">{{ t('modals.estimates.fields.rate') }} {{ currencySymbol }}</span>
                <input
                  type="number"
                  v-model.number="item.rate"
                  @input="updateEstimateItemRate(idx, item.rate)"
                  min="0"
                  step="any"
                  class="w-20 px-2 py-0.5 h-7 bg-background border border-input rounded text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span class="text-xs text-muted-foreground ml-1">{{ t('modals.estimates.fields.each') }}</span>
              </div>
              <div>
                <input
                  type="text"
                  v-model="item.description"
                  :placeholder="t('modals.estimates.fields.itemPlaceholder')"
                  class="w-full px-2.5 py-1 bg-background border border-input rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center border border-input rounded-md bg-background overflow-hidden h-8">
                <button
                  type="button"
                  @click="updateEstimateItemQuantity(idx, item.quantity - 1)"
                  class="px-2.5 py-1 text-muted-foreground hover:bg-muted text-xs font-medium"
                >
                  -
                </button>
                <input
                  type="number"
                  v-model.number="item.quantity"
                  @input="updateEstimateItemQuantity(idx, item.quantity)"
                  min="0"
                  step="any"
                  class="w-12 text-center h-full bg-transparent border-none focus:outline-none focus:ring-0 text-xs font-mono font-medium text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-x border-input"
                />
                <button
                  type="button"
                  @click="updateEstimateItemQuantity(idx, item.quantity + 1)"
                  class="px-2.5 py-1 text-muted-foreground hover:bg-muted text-xs font-medium"
                >
                  +
                </button>
              </div>
              <div class="w-20 text-right font-mono font-medium text-sm text-foreground">
                {{ formatCurrency(item.amount) }}
              </div>
              <button type="button"
                @click="removeItemFromEstimate(idx)"
                class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-2 pt-2 border-t">
        <div class="flex items-center justify-between">
          <Label class="text-sm font-medium">{{ t('modals.estimates.fields.catalogSelector') }}</Label>
          <button type="button"
            @click="redirectToAddItem"
            class="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
          >
            <Plus class="w-3 h-3" /> {{ t('topbar.new') }}
          </button>
        </div>
        <div v-if="itemStore.items.length > 0" class="grid grid-cols-1 gap-2">
          <div
            v-for="item in itemStore.items.slice(0, 3)"
            :key="item.id"
            class="p-3 bg-card rounded-lg border flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer"
            @click="addItemToEstimate(item)"
          >
            <div>
              <p class="text-xs font-medium text-foreground">{{ item.name }}</p>
              <p class="text-xs text-muted-foreground">
                {{ formatCurrency(item.unitPrice) }}
              </p>
            </div>
            <ExternalLink
              class="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
          <p v-if="itemStore.items.length > 3" class="text-xs text-center text-muted-foreground italic">
            {{ t('modals.estimates.fields.moreInCatalog', { count: itemStore.items.length - 3 }) }}
          </p>
        </div>
        <div v-else class="text-center py-6 border-2 border-dashed rounded-lg">
          <Package class="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p class="text-xs font-medium text-muted-foreground">{{ t('modals.estimates.fields.noItems') }}</p>
          <button type="button" @click="redirectToAddItem" class="text-xs font-medium text-primary mt-1 hover:underline">
            {{ t('modals.estimates.fields.createFirstItem') }}
          </button>
        </div>
      </div>

      <!-- Advanced/Collapsible Section -->
      <div class="border rounded-lg overflow-hidden bg-card">
        <button
          type="button"
          @click="showAdvanced = !showAdvanced"
          class="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-xs font-medium text-foreground"
        >
          <span>{{ t('modals.estimates.fields.additionalInfo') }}</span>
          <ChevronDown :class="['w-4 h-4 transition-transform duration-200 text-muted-foreground', showAdvanced ? 'rotate-180' : '']" />
        </button>
        <div v-show="showAdvanced" class="p-4 space-y-4 border-t bg-muted/10 animate-in fade-in duration-200">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.estimates.fields.referenceNumber') }}</Label>
              <Input v-model="newEstimate.referenceNumber" placeholder="PO-1234" />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.estimates.fields.terms') }}</Label>
              <Input v-model="newEstimate.terms" placeholder="Net 30" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.estimates.fields.billingAddress') }}</Label>
              <Textarea
                v-model="newEstimate.billingAddress"
                placeholder="Street, City, State, ZIP"
                class="min-h-[60px]"
              />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.estimates.fields.shippingAddress') }}</Label>
              <Textarea
                v-model="newEstimate.shippingAddress"
                placeholder="Street, City, State, ZIP"
                class="min-h-[60px]"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.estimates.fields.notes') }}</Label>
              <Textarea
                v-model="newEstimate.notes"
                :placeholder="t('modals.estimates.fields.notesPlaceholder')"
                class="min-h-[60px]"
              />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.estimates.fields.termsConditions') }}</Label>
              <Textarea
                v-model="newEstimate.termsConditions"
                :placeholder="t('modals.estimates.fields.termsPlaceholder')"
                class="min-h-[60px]"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Taxes, Discounts & Charges Section -->
      <div class="border rounded-lg overflow-hidden bg-card">
        <button
          type="button"
          @click="showTaxesDiscounts = !showTaxesDiscounts"
          class="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-xs font-medium text-foreground"
        >
          <span>{{ t('modals.estimates.fields.discountsTaxes') }}</span>
          <ChevronDown :class="['w-4 h-4 transition-transform duration-200 text-muted-foreground', showTaxesDiscounts ? 'rotate-180' : '']" />
        </button>
        <div v-show="showTaxesDiscounts" class="p-4 space-y-4 border-t bg-muted/10 animate-in fade-in duration-200">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.estimates.fields.discountType') }}</Label>
              <Select
                v-model="newEstimate.discountType"
                :options="discountTypeOptions"
                :placeholder="t('modals.estimates.fields.noDiscount')"
              />
            </div>
            <div class="space-y-2" v-if="newEstimate.discountType">
              <Label class="text-xs font-medium">{{ t('modals.estimates.fields.discountValue') }}</Label>
              <Input type="number" v-model.number="newEstimate.discountValue" placeholder="0" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.estimates.fields.taxPercent') }}</Label>
              <Input type="number" v-model.number="newEstimate.taxPercent" placeholder="0" />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.estimates.fields.shippingCharges') }}</Label>
              <Input type="number" v-model.number="newEstimate.shippingCharges" placeholder="0" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">Packaging Charges</Label>
              <Input type="number" v-model.number="newEstimate.packagingCharges" placeholder="0" />
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <Label class="text-xs font-medium">Round Off</Label>
                <button
                  type="button"
                  @click="autoRoundOff = !autoRoundOff"
                  :class="[
                    'text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer',
                    autoRoundOff
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  ]"
                >
                  Auto {{ autoRoundOff ? 'ON' : 'OFF' }}
                </button>
              </div>
              <Input
                type="number"
                step="0.01"
                v-model.number="newEstimate.adjustment"
                :disabled="autoRoundOff"
                placeholder="0.00"
              />
            </div>
          </div>
          <div class="flex flex-col items-end pt-2 pr-1 space-y-1 text-right text-xs">
            <p v-if="newEstimate.discountAmount > 0" class="text-emerald-600 font-medium">
              {{ t('modals.estimates.fields.calculatedDiscount') }} <span class="font-mono font-semibold">-{{ currencySymbol }}{{ Number(newEstimate.discountAmount || 0).toFixed(2) }}</span>
            </p>
            <p class="text-muted-foreground">
              {{ t('modals.estimates.fields.calculatedTax') }} <span class="font-mono text-foreground font-semibold">{{ currencySymbol }}{{ Number(newEstimate.taxAmount || 0).toFixed(2) }}</span>
            </p>
            <p v-if="Number(newEstimate.shippingCharges) > 0" class="text-muted-foreground">
              Shipping: <span class="font-mono text-foreground font-semibold">+{{ currencySymbol }}{{ Number(newEstimate.shippingCharges || 0).toFixed(2) }}</span>
            </p>
            <p v-if="Number(newEstimate.packagingCharges) > 0" class="text-muted-foreground">
              Packaging: <span class="font-mono text-foreground font-semibold">+{{ currencySymbol }}{{ Number(newEstimate.packagingCharges || 0).toFixed(2) }}</span>
            </p>
            <p v-if="Number(newEstimate.adjustment) !== 0" class="text-muted-foreground">
              Round Off: <span class="font-mono text-foreground font-semibold">{{ Number(newEstimate.adjustment) > 0 ? '+' : '' }}{{ currencySymbol }}{{ Number(newEstimate.adjustment || 0).toFixed(2) }}</span>
            </p>
            <div class="h-px w-36 bg-border my-1"></div>
            <p class="text-sm font-bold text-foreground">
              Total Amount: <span class="font-mono">{{ currencySymbol }}{{ Number(newEstimate.amount || 0).toFixed(2) }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Custom Fields Section -->
      <CustomFieldRenderer
        entity="estimate"
        v-model="newEstimate.customFields"
      />

      <div class="space-y-2">
        <Label class="text-sm font-medium">{{ t('modals.estimates.fields.status') }}</Label>
        <div class="flex p-1 bg-muted rounded-lg text-xs font-medium">
          <button type="button"
            v-for="s in ['Draft', 'Sent', 'Accepted', 'Declined', 'Invoiced']"
            :key="s"
            @click="newEstimate.status = s as any"
            :class="[
              'flex-1 py-1.5 rounded-md transition-all text-center',
              newEstimate.status === s
                 ? 'bg-background text-foreground shadow-xs font-semibold'
                 : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <template #footer>
        <Button
          @click="isAddingEstimate = false; resetEstimateForm(); clearErrors();"
          variant="outline"
        >
          {{ t('common.cancel') }}
        </Button>
        <Button
          @click="handleAddEstimate"
          :disabled="isSaving || fetchingDetails"
          class="gap-2"
        >
          <Spinner v-if="isSaving || fetchingDetails" size="sm" class="text-primary-foreground" />
          {{ isSaving ? t('common.saving') : fetchingDetails ? 'Loading details...' : (isEditing ? t('modals.estimates.save') : t('modals.estimates.create')) }}
        </Button>
      </template>
    </Modal>

    <!-- Modals -->
    <AddCustomerModal 
      :open="isAddingInlineCustomer" 
      @close="isAddingInlineCustomer = false"
      @success="handleInlineCustomerSuccess"
    />

    <AddItemModal
      :open="isAddingInlineItem"
      @close="isAddingInlineItem = false"
      @success="handleInlineItemSuccess"
    />
  </div>
</template>

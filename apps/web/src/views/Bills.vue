<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Sidebar from '@/components/Sidebar.vue';
import TopBar from '@/components/TopBar.vue';
import Modal from '@/components/Modal.vue';
import { useBillStore, type Bill } from '@/stores/billStore';
import { useVendorStore } from '@/stores/vendorStore';
import { useItemStore } from '@/stores/itemStore';
import { useTheme } from '@/composables/useTheme';
import { formatCurrency, formatDate, getInvoiceStatusInfo } from '@/utils/formatters';
import {
  Plus,
  Search,
  MoreHorizontal,
  Calendar,
  User,
  Hash,
  IndianRupee,
  Receipt,
  FileText,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Lock,
  Eye,
  Users,
  Package,
  ExternalLink,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Bookmark as BookmarkIcon,
  FileUp,
} from 'lucide-vue-next';
import BulkUploadModal from '@/components/BulkUploadModal.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import DatePicker from '@/components/ui/DatePicker.vue';
import { Checkbox } from '@/components/ui/checkbox';
import Select from '@/components/ui/Select.vue';

import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'vue-sonner';
import { storeToRefs } from 'pinia';
import ViewGuard from '@/components/ViewGuard.vue';
import { usePermissions } from '@/composables/usePermissions';
import { useFormValidation } from '@/composables/useFormValidation';
import { billSchema } from '@/utils/validationSchemas';
import AddVendorModal from '@/components/AddVendorModal.vue';
import AddItemModal from '@/components/AddItemModal.vue';
import CustomFieldRenderer from '@/components/ui/CustomFieldRenderer.vue';
import StickyPageHeader from '@/components/ui/StickyPageHeader.vue';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import BulkActionBar from '@/components/ui/BulkActionBar.vue';
import BulkConfirmDialog from '@/components/ui/BulkConfirmDialog.vue';
import SmartPresetsBar from '@/components/ui/SmartPresetsBar.vue';
import type { FilterPreset } from '@/stores/filterPresetStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBulkSelection } from '@/composables/useBulkSelection';
import { exportToCsv, exportToJson } from '@/lib/exportUtils';
import { useCurrency } from '@/composables/useCurrency';

const billStore = useBillStore();
const vendorStore = useVendorStore();
const itemStore = useItemStore();
const bookmarkStore = useBookmarkStore();
const { theme } = useTheme();
const router = useRouter();

const toggleBillBookmark = async (bill: Bill) => {
  await bookmarkStore.toggleBookmark({
    entity_type: 'bill',
    entity_id: bill.id,
    title: bill.billNumber || 'Bill',
    subtitle: getVendorName(bill),
    route: '/bills',
    metadata: {
      amount: bill.amount,
      status: bill.status,
      date: bill.dueDate,
      vendorName: getVendorName(bill),
    },
  });
  if (isBookmarkedOnly.value) {
    await fetchBillsData(pagination.value.page, true);
  }
};

const { canManage } = usePermissions();
const { t } = useI18n();
const { currencySymbol } = useCurrency();

const discountTypeOptions = computed(() => [
  { id: '', name: t('modals.bills.fields.noDiscount') },
  { id: 'Percentage', name: 'Percentage (%)' },
  { id: 'Flat', name: `Flat (${currencySymbol.value})` }
]);

const { bills, pagination, loading: fetchingBills } = storeToRefs(billStore);
const loading = ref(false);
const isSaving = ref(false);
const fetchingDetails = ref(false);

const isAddingBill = ref(false);
const isBulkUploadOpen = ref(false);
const selectedDetail = ref<Bill | null>(null);
const activeBillForItems = ref<any>(null);
const isViewingItems = ref(false);
const fetchingItems = ref(false);
const searchQuery = ref('');
const activeFilter = ref('All');
const activeTimeframe = ref('all');
const activeMinAmount = ref<number | null>(null);
const activeMaxAmount = ref<number | null>(null);
const openMenuId = ref<string | null>(null);
const menuPosition = ref({ top: 0, left: 0 });
const isAddingInlineVendor = ref(false);
const isAddingInlineItem = ref(false);
const filters = ['All', 'Draft', 'Due', 'Outstanding', 'Paid'];
const isBookmarkedOnly = ref(false);

const currentFilters = computed(() => ({
  status: activeFilter.value,
  timeframe: activeTimeframe.value,
  minAmount: activeMinAmount.value ?? undefined,
  maxAmount: activeMaxAmount.value ?? undefined,
  bookmarkedOnly: isBookmarkedOnly.value,
  search: searchQuery.value,
}));

const handleApplyPreset = (preset: FilterPreset) => {
  const f = preset.filters || {};
  activeFilter.value = f.status || 'All';
  activeTimeframe.value = f.timeframe || 'all';
  activeMinAmount.value = f.minAmount ?? null;
  activeMaxAmount.value = f.maxAmount ?? null;
  isBookmarkedOnly.value = Boolean(f.bookmarkedOnly);
  if (f.search !== undefined) {
    searchQuery.value = f.search;
  }
  fetchBillsData(1, true);
};

const handleUpdateFilter = (key: string, value: any) => {
  if (key === 'status') activeFilter.value = value;
  else if (key === 'timeframe') activeTimeframe.value = value;
  else if (key === 'minAmount') activeMinAmount.value = value;
  else if (key === 'maxAmount') activeMaxAmount.value = value;
  else if (key === 'bookmarkedOnly') isBookmarkedOnly.value = Boolean(value);
  fetchBillsData(1, true);
};

const handleResetFilters = () => {
  activeFilter.value = 'All';
  activeTimeframe.value = 'all';
  activeMinAmount.value = null;
  activeMaxAmount.value = null;
  isBookmarkedOnly.value = false;
  searchQuery.value = '';
  fetchBillsData(1, true);
};

const getFilterActiveClass = (filter: string) => {
  switch (filter) {
    case 'Paid':
      return 'bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white font-semibold shadow-xs border border-transparent';
    case 'Due':
    case 'Outstanding':
      return 'bg-amber-500 text-white dark:bg-amber-600 dark:text-white font-semibold shadow-xs border border-transparent';
    case 'Draft':
      return 'bg-secondary text-secondary-foreground font-semibold shadow-xs border border-border/60';
    default:
      return 'bg-background text-foreground font-semibold shadow-xs border border-border/40';
  }
};

const bookmarkedCount = computed(() => {
  return bookmarkStore.bookmarks.filter((b) => b.entity_type === 'bill').length;
});

const displayedBills = computed(() => bills.value);

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
} = useBulkSelection(displayedBills);

const isBulkDeleting = ref(false);
const isBulkUpdatingStatus = ref(false);
const showBulkDeleteConfirm = ref(false);
const showBulkStatusConfirm = ref(false);
const pendingStatusUpdate = ref<Bill['status'] | null>(null);
const isBulkOperating = computed(() => isBulkDeleting.value || isBulkUpdatingStatus.value);

const handleBulkDeleteConfirm = async () => {
  if (selectedIds.value.size === 0) return;
  isBulkDeleting.value = true;
  const idsToDelete = Array.from(selectedIds.value);
  try {
    const res = await billStore.bulkDeleteBills(idsToDelete);
    toast.success('Bills deleted', {
      description: res?.message || `Successfully deleted ${idsToDelete.length} bill(s).`,
    });
    clearSelection();
    showBulkDeleteConfirm.value = false;
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to delete bills');
  } finally {
    isBulkDeleting.value = false;
  }
};

const handleBulkStatus = async (status: Bill['status']) => {
  if (selectedIds.value.size === 0) return;
  isBulkUpdatingStatus.value = true;
  const idsToUpdate = Array.from(selectedIds.value);
  try {
    const res = await billStore.bulkUpdateBillStatus(idsToUpdate, status);
    toast.success('Status updated', {
      description: res?.message || `Marked ${idsToUpdate.length} bill(s) as ${status}.`,
    });
    clearSelection();
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to update bill statuses');
  } finally {
    isBulkUpdatingStatus.value = false;
  }
};

const requestBulkStatus = (status: Bill['status']) => {
  if (selectedCount.value === 0) return;
  if (selectedCount.value > 1) {
    pendingStatusUpdate.value = status;
    showBulkStatusConfirm.value = true;
  } else {
    handleBulkStatus(status);
  }
};

const confirmBulkStatus = async () => {
  if (!pendingStatusUpdate.value) return;
  const status = pendingStatusUpdate.value;
  showBulkStatusConfirm.value = false;
  await handleBulkStatus(status);
  pendingStatusUpdate.value = null;
};

const handleBulkExport = (format: 'csv' | 'json') => {
  if (selectedItems.value.length === 0) return;
  const exportData = selectedItems.value.map((b) => ({
    'Bill #': b.billNumber,
    Vendor: getVendorName(b),
    Date: b.date,
    'Due Date': b.dueDate,
    Amount: b.amount,
    Status: b.status,
    Notes: b.notes || '',
  }));

  if (format === 'csv') {
    exportToCsv(exportData, 'bills');
  } else {
    exportToJson(exportData, 'bills');
  }
  toast.success(`Exported ${exportData.length} bill(s) as ${format.toUpperCase()}`);
};

const showAdvanced = ref(false);
const showTaxesDiscounts = ref(false);

const newBill = ref<Omit<Bill, 'id'>>({
  billNumber: '',
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  vendorId: '',
  amount: 0,
  status: 'Draft',
  items: [],
  referenceNumber: '',
  billingAddress: '',
  shippingAddress: '',
  terms: '',
  discountType: '',
  discountValue: 0,
  discountAmount: 0,
  shippingCharges: 0,
  adjustment: 0,
  notes: '',
  termsConditions: '',
  taxPercent: 0,
  taxAmount: 0,
  customFields: {},
});

const { errors, validate, clearErrors } = useFormValidation(billSchema, newBill);

const loadNextBillNumber = async () => {
  try {
    newBill.value.billNumber = await billStore.fetchNextBillNumber();
  } catch {
    newBill.value.billNumber = '';
    toast.error('Could not generate the next bill number');
  }
};

watch(isAddingBill, (val) => {
  if (val && !isEditing.value) {
    resetBillForm();
  }
});

const addItemToBill = (item: any) => {
  if (!newBill.value.items) {
    newBill.value.items = [];
  }
  const existingItemIndex = newBill.value.items.findIndex(i => i.itemId === item.id);
  if (existingItemIndex > -1) {
    newBill.value.items[existingItemIndex].quantity += 1;
    newBill.value.items[existingItemIndex].amount = 
      Number(newBill.value.items[existingItemIndex].quantity) * Number(newBill.value.items[existingItemIndex].rate);
  } else {
    newBill.value.items.push({
      itemId: item.id,
      itemName: item.name,
      quantity: 1,
      rate: Number(item.unitPrice),
      amount: Number(item.unitPrice),
      description: item.description || ''
    });
  }
  recalculateTotalAmount();
};

const removeItemFromBill = (index: number) => {
  if (!newBill.value.items) return;
  newBill.value.items.splice(index, 1);
  recalculateTotalAmount();
};

const updateItemQuantity = (index: number, qty: number) => {
  if (!newBill.value.items) return;
  if (qty < 0) qty = 0;
  newBill.value.items[index].quantity = qty;
  newBill.value.items[index].amount = qty * newBill.value.items[index].rate;
  recalculateTotalAmount();
};

const updateItemRate = (index: number, rate: number) => {
  if (!newBill.value.items) return;
  if (rate < 0) rate = 0;
  newBill.value.items[index].rate = rate;
  newBill.value.items[index].amount = newBill.value.items[index].quantity * rate;
  recalculateTotalAmount();
};

const recalculateTotalAmount = () => {
  if (!newBill.value.items) return;
  const subtotal = newBill.value.items.reduce((sum, item) => sum + item.amount, 0);

  // Calculate discount
  let discount = 0;
  if (newBill.value.discountType === 'Percentage') {
    discount = subtotal * ((newBill.value.discountValue || 0) / 100);
  } else if (newBill.value.discountType === 'Flat') {
    discount = newBill.value.discountValue || 0;
  }
  newBill.value.discountAmount = discount;

  // Calculate tax (on subtotal after discount)
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = taxableAmount * ((newBill.value.taxPercent || 0) / 100);
  newBill.value.taxAmount = tax;

  // Calculate total
  const shipping = Number(newBill.value.shippingCharges) || 0;
  const adj = Number(newBill.value.adjustment) || 0;

  newBill.value.amount = Number((taxableAmount + tax + shipping + adj).toFixed(2));
};

watch(
  () => [
    newBill.value.discountType,
    newBill.value.discountValue,
    newBill.value.taxPercent,
    newBill.value.shippingCharges,
    newBill.value.adjustment
  ],
  () => {
    recalculateTotalAmount();
  }
);

const getVendorName = (bill: Bill) => {
  if (bill.vendors?.name) return bill.vendors.name;
  return vendorStore.vendors.find((v) => v.id === bill.vendorId)?.name || 'Unknown Vendor';
};

const isInitialLoading = ref(billStore.bills.length === 0);

const fetchBillsData = async (page = 1, force = true) => {
  clearSelection();
  try {
    await billStore.fetchBills(
      page,
      pagination.value.limit,
      searchQuery.value,
      activeFilter.value,
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
  fetchBillsData(newPage, true);
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
};

// Debounced fetch ONLY when typing into search input
let searchTimeout: any = null;
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchBillsData(1, true);
  }, 250);
});

watch(isBookmarkedOnly, () => {
  clearSelection();
});

watch(() => pagination.value.page, () => {
  clearSelection();
});

const handleDelete = async (id: string) => {
  try {
    await billStore.deleteBill(id);
    openMenuId.value = null;
    toast.success('Bill deleted successfully');
  } catch (err) {
    console.error('Failed to delete bill:', err);
    toast.error('Failed to delete bill');
  }
};

const handleStatusUpdate = async (id: string, status: Bill['status']) => {
  if (!id) return;
  try {
    await billStore.updateBillStatus(id, status);
    openMenuId.value = null;
    toast.success(`Bill marked as ${status}`);
  } catch (err: any) {
    console.error('Failed to update status:', err);
    toast.error(err?.response?.data?.error || billStore.error || 'Failed to update status');
  }
};

const isEditing = ref(false);
const editingBillId = ref<string | null>(null);

const startEditBill = async (bill: Bill) => {
  isEditing.value = true;
  editingBillId.value = bill.id;
  openMenuId.value = null;

  const source = (bill.items ? bill : billStore.detailsCache[bill.id]) || bill;

  // Pre-populate with list summary item immediately
  newBill.value = {
    billNumber: source.billNumber,
    date: source.date || new Date().toISOString().split('T')[0],
    dueDate: source.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vendorId: source.vendorId,
    amount: source.amount,
    status: source.status,
    items: source.items ? source.items.map((item) => ({ ...item })) : [],
    referenceNumber: source.referenceNumber || '',
    billingAddress: source.billingAddress || '',
    shippingAddress: source.shippingAddress || '',
    terms: source.terms || '',
    discountType: source.discountType || '',
    discountValue: source.discountValue || 0,
    discountAmount: source.discountAmount || 0,
    shippingCharges: source.shippingCharges || 0,
    adjustment: source.adjustment || 0,
    notes: source.notes || '',
    termsConditions: source.termsConditions || '',
    taxPercent: source.taxPercent || 0,
    taxAmount: source.taxAmount || 0,
    customFields: source.customFields ? { ...source.customFields } : {},
  };

  isAddingBill.value = true;

  // If items and details are already available in memory, no need to trigger loading or network delay
  if (source.items && source.referenceNumber !== undefined) {
    fetchingDetails.value = false;
    return;
  }

  const hasCache = !!billStore.detailsCache[bill.id]?.items;
  if (!hasCache) {
    fetchingDetails.value = true;
  }
  try {
    const details = await billStore.fetchBillDetails(bill.id);
    newBill.value = {
      billNumber: details.billNumber,
      date: details.date,
      dueDate: details.dueDate,
      vendorId: details.vendorId,
      amount: details.amount,
      status: details.status,
      items: details.items ? details.items.map((item) => ({ ...item })) : [],
      referenceNumber: details.referenceNumber || '',
      billingAddress: details.billingAddress || '',
      shippingAddress: details.shippingAddress || '',
      terms: details.terms || '',
      discountType: details.discountType || '',
      discountValue: details.discountValue || 0,
      discountAmount: details.discountAmount || 0,
      shippingCharges: details.shippingCharges || 0,
      adjustment: details.adjustment || 0,
      notes: details.notes || '',
      termsConditions: details.termsConditions || '',
      taxPercent: details.taxPercent || 0,
      taxAmount: details.taxAmount || 0,
      customFields: details.customFields ? { ...details.customFields } : (bill.customFields || {}),
    };
  } catch (err) {
    console.error(err);
    toast.error("Failed to load bill details");
  } finally {
    fetchingDetails.value = false;
  }
};

const resetBillForm = () => {
  isEditing.value = false;
  editingBillId.value = null;
  showAdvanced.value = false;
  showTaxesDiscounts.value = false;
  newBill.value = {
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vendorId: '',
    amount: 0,
    status: 'Draft',
    items: [],
    referenceNumber: '',
    billingAddress: '',
    shippingAddress: '',
    terms: '',
    discountType: '',
    discountValue: 0,
    discountAmount: 0,
    shippingCharges: 0,
    adjustment: 0,
    notes: '',
    termsConditions: '',
    taxPercent: 0,
    taxAmount: 0,
    customFields: {},
  };
  clearErrors();
  void loadNextBillNumber();
};

const handleAddBill = async (targetStatus: Bill['status'] = 'Draft') => {
  if (!validate()) {
    toast.error(isEditing.value ? 'Bill update failed' : 'Bill creation failed', {
      description: 'Please correct the errors in the form before saving.',
    });
    return;
  }

  isSaving.value = true;
  try {
    if (isEditing.value && editingBillId.value) {
      await billStore.updateBill(editingBillId.value, { ...newBill.value, status: targetStatus });
      toast.success('Bill updated successfully', {
        description: `Bill ${newBill.value.billNumber} has been updated.`,
      });
    } else {
      await billStore.addBill({ ...newBill.value, status: targetStatus });
      toast.success('Bill created successfully', {
        description: `Bill ${newBill.value.billNumber} is now ${targetStatus}.`,
      });
    }
    isAddingBill.value = false;
    resetBillForm();
  } catch (err: any) {
    console.error('Failed to save bill:', err);
    toast.error(err.response?.data?.error || 'Failed to save bill');
  } finally {
    isSaving.value = false;
  }
};

const viewBillItems = async (bill: Bill) => {
  openMenuId.value = null;
  const hasCache = !!billStore.detailsCache[bill.id]?.items || !!bill.items;
  activeBillForItems.value = billStore.detailsCache[bill.id] || bill;
  isViewingItems.value = true;

  if (!hasCache) {
    fetchingItems.value = true;
    try {
      const details = await billStore.fetchBillDetails(bill.id);
      activeBillForItems.value = details;
    } catch (err) {
      toast.error('Failed to retrieve line items');
    } finally {
      fetchingItems.value = false;
    }
  }
};

const activeMenuBill = computed(() => {
  if (!openMenuId.value) return null;
  return billStore.bills.find((b) => b.id === openMenuId.value) || null;
});

const handleViewDetailsClick = () => {
  if (openMenuId.value) {
    selectedDetail.value = billStore.bills.find((b) => b.id === openMenuId.value) || null;
    openMenuId.value = null;
  }
};

const handleEditClick = () => {
  if (openMenuId.value) {
    const bill = billStore.bills.find((b) => b.id === openMenuId.value);
    if (bill) startEditBill(bill);
    openMenuId.value = null;
  }
};

const handleViewLineItemsClick = () => {
  if (openMenuId.value) {
    const bill = billStore.bills.find((b) => b.id === openMenuId.value);
    if (bill) viewBillItems(bill);
    openMenuId.value = null;
  }
};

const handleStatusUpdateClick = (status: 'Outstanding' | 'Paid') => {
  if (openMenuId.value) {
    handleStatusUpdate(openMenuId.value, status);
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
  const menuHeight = 130; 

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

const stats = computed(() => {
  const { totalOutstanding, overdue, paid } = billStore.stats;

  return [
    {
      title: 'Total Outstanding',
      amount: formatCurrency(totalOutstanding),
      subText: 'accounts payable due',
      icon: Clock,
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-500/10 border border-amber-500/15',
      accentBar: 'bg-amber-500/50',
      containerClass: 'hover:border-amber-500/40',
    },
    {
      title: 'Overdue Bills',
      amount: formatCurrency(overdue),
      subText: 'unpaid past due',
      icon: AlertCircle,
      color: 'text-rose-700 dark:text-rose-400',
      bg: 'bg-rose-500/10 border border-rose-500/15',
      accentBar: 'bg-rose-500/50',
      containerClass: 'hover:border-rose-500/40',
    },
    {
      title: 'Paid Bills',
      amount: formatCurrency(paid),
      subText: 'settled vendor balances',
      icon: CheckCircle,
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border border-emerald-500/15',
      accentBar: 'bg-emerald-500/50',
      containerClass: 'hover:border-emerald-500/40',
    },
  ];
});

const redirectToAddVendor = () => {
  isAddingInlineVendor.value = true;
};

const handleInlineVendorSuccess = (vendor: any) => {
  newBill.value.vendorId = vendor.id;
  toast.success(`Vendor ${vendor.name} selected`);
};

const redirectToAddItem = () => {
  isAddingInlineItem.value = true;
};

const handleInlineItemSuccess = (item: any) => {
  addItemToBill(item);
  toast.success(`Item ${item.name} added and selected`);
};

onMounted(() => {
  fetchBillsData(1, true);
  void loadNextBillNumber();
  vendorStore.fetchVendors();
  itemStore.fetchItems();
  window.addEventListener('click', closeMenus);
  window.addEventListener('scroll', closeMenus, true);
});

onUnmounted(() => {
  window.removeEventListener('click', closeMenus);
  window.removeEventListener('scroll', closeMenus, true);
});
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Bills" />

    <main class="flex-1 overflow-y-auto bg-background flex flex-col">
      <ViewGuard module="expenses">
        <!-- Sticky Transitional Header -->
        <StickyPageHeader
          :title="$t('modules.bills.title')"
          :subtitle="$t('modules.bills.subtitle')"
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
                @click="isAddingBill = true"
                size="sm"
                class="h-9 px-4 text-xs font-medium shadow-xs"
              >
                <Plus class="w-3.5 h-3.5 mr-1.5" />
                {{ $t('modules.bills.new') }}
              </Button>
            </div>
          </template>
        </StickyPageHeader>

        <div class="px-8 pt-2 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">

          <!-- Stats -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <template v-if="isInitialLoading && displayedBills.length === 0">
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
            <div class="p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-border/60 bg-muted/25 min-h-[65px]">
              <div class="relative w-full sm:w-60 md:w-72 lg:w-80 shrink-1 min-w-[180px] group">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-150" />
                <Input
                  v-model="searchQuery"
                  placeholder="Search vendors, bill numbers..."
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
                  entity-type="bills"
                  :active-filters="currentFilters"
                  @apply-preset="handleApplyPreset"
                  @update-filter="handleUpdateFilter"
                  @reset-filters="handleResetFilters"
                />
              </div>
            </div>

            <!-- Revalidation Progress Bar -->
            <div
              v-if="fetchingBills && displayedBills.length > 0"
              class="h-0.5 w-full bg-primary/10 overflow-hidden relative"
            >
              <div class="absolute inset-y-0 w-1/3 bg-primary/70 rounded-full animate-indeterminate"></div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr
                    class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/80 border-b border-border/70 bg-primary/[0.03]"
                  >
                    <th class="py-4 px-4 w-[48px] text-center"></th>
                    <th class="py-4 px-6">Bill #</th>
                    <th class="py-4 px-6">Vendor</th>
                    <th class="py-4 px-6">Due Date</th>
                    <th class="py-4 px-6">Amount</th>
                    <th class="py-4 px-6">Status</th>
                    <th class="py-4 px-6 text-right"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <template v-if="(isInitialLoading || fetchingBills) && displayedBills.length === 0">
                    <tr v-for="i in 5" :key="i">
                      <td class="py-4.5 px-4 text-center"><Skeleton class="h-4 w-4 mx-auto rounded" /></td>
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
                      v-for="bill in displayedBills"
                      :key="bill.id"
                      :data-state="isSelected(bill.id) ? 'selected' : undefined"
                      :class="[
                        'group cursor-pointer transition-colors duration-150',
                        isSelected(bill.id)
                          ? 'bg-primary/10 dark:bg-primary/15 hover:bg-primary/15 dark:hover:bg-primary/20'
                          : 'hover:bg-muted/50'
                      ]"
                      @click="selectedDetail = bill"
                    >
                      <td class="py-4.5 px-4 text-center w-[48px] cursor-pointer" @click.stop="toggleSelect(bill.id)">
                        <div
                          :class="[
                            'transition-opacity duration-150 flex items-center justify-center',
                            selectedCount > 0 || isSelected(bill.id)
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          ]"
                        >
                          <Checkbox
                            :checked="isSelected(bill.id)"
                            @update:checked="toggleSelect(bill.id)"
                            :aria-label="`Select bill ${bill.billNumber}`"
                          />
                        </div>
                      </td>
                      <td class="py-4.5 px-6 text-sm font-bold text-foreground group-hover:text-primary tracking-tight transition-colors">
                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            @click.stop="toggleBillBookmark(bill)"
                            class="p-1 rounded-md transition-colors hover:bg-blue-500/10 shrink-0"
                            :title="bookmarkStore.isBookmarked('bill', bill.id) ? 'Remove Bookmark' : 'Bookmark Bill'"
                          >
                            <BookmarkIcon
                              :class="[
                                'w-3.5 h-3.5 transition-all active:scale-125',
                                bookmarkStore.isBookmarked('bill', bill.id)
                                  ? 'fill-blue-500 text-blue-500 opacity-100'
                                  : 'opacity-0 group-hover:opacity-40 hover:!opacity-100 text-muted-foreground hover:text-blue-500'
                              ]"
                            />
                          </button>
                          <span>{{ bill.billNumber }}</span>
                        </div>
                      </td>
                      <td class="py-4.5 px-6 text-sm text-foreground/80 group-hover:text-foreground font-medium transition-colors">
                        {{ getVendorName(bill) }}
                      </td>
                      <td class="py-4.5 px-6 text-xs text-muted-foreground font-semibold tracking-wide">
                        {{ bill.dueDate }}
                      </td>
                      <td class="py-4.5 px-6 text-sm font-bold text-foreground tracking-tight font-mono">
                        {{ formatCurrency(bill.amount) }}
                      </td>
                      <td class="py-3.5 px-6">
                        <span
                          :class="[
                            'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap shadow-xs transition-colors',
                            getInvoiceStatusInfo(bill.status, bill.dueDate).colorClass
                          ]"
                        >
                          {{ getInvoiceStatusInfo(bill.status, bill.dueDate).label }}
                        </span>
                      </td>
                      <td class="py-4.5 px-6 text-right" @click.stop>
                        <Button
                          v-if="canManage('expenses')"
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 transition-colors opacity-70 group-hover:opacity-100"
                          @click="toggleMenu(bill.id, $event)"
                        >
                          <MoreHorizontal class="w-4 h-4" />
                        </Button>
                        <div v-else class="flex justify-end pr-2 text-muted-foreground/30" title="View Only Access">
                          <Lock class="w-3.5 h-3.5" />
                        </div>
                      </td>
                    </tr>
                    <tr v-if="displayedBills.length === 0">
                      <td colspan="7" class="py-32 text-center">
                        <div class="flex flex-col items-center justify-center max-w-xs mx-auto space-y-4">
                          <div class="w-16 h-16 rounded-3xl bg-blue-500/10 flex items-center justify-center">
                            <BookmarkIcon v-if="isBookmarkedOnly" class="w-8 h-8 text-blue-500 fill-blue-500/20" />
                            <FileText v-else class="w-8 h-8 text-muted-foreground/40" />
                          </div>
                          <div class="space-y-1">
                            <h3 class="ui-section-title">
                              {{ isBookmarkedOnly ? 'No bookmarked bills' : 'No bills found' }}
                            </h3>
                            <p class="text-[11px] text-muted-foreground font-medium">
                              {{
                                isBookmarkedOnly
                                  ? (activeFilter !== 'All'
                                      ? `No bookmarked bills with status "${activeFilter}".`
                                      : 'Bookmark bills from the list to quickly find and access them here.')
                                  : searchQuery
                                  ? 'Try adjusting your search filters.'
                                  : 'Get started by creating your first vendor bill.'
                              }}
                            </p>
                          </div>
                          <Button
                            v-if="!isBookmarkedOnly && !searchQuery && canManage('expenses')"
                            @click="isAddingBill = true"
                            variant="outline"
                            size="sm"
                            class="rounded-xl font-bold uppercase tracking-widest text-[10px]"
                          >
                            Create Bill
                          </Button>
                          <Button
                            v-else-if="isBookmarkedOnly"
                            @click="handleUpdateFilter('bookmarkedOnly', false)"
                            variant="ghost"
                            size="sm"
                            class="h-8 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10 cursor-pointer"
                          >
                            Show all {{ activeFilter !== 'All' ? activeFilter : '' }} bills
                          </Button>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div
              v-if="displayedBills?.length > 0 && pagination?.totalPages > 1"
              class="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/20"
            >
              <div class="flex items-center gap-2">
                <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Showing {{ (pagination.page - 1) * pagination.limit + 1 }} to
                  {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of
                  {{ pagination.total }} Bills
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
                  :disabled="pagination.page === pagination.totalPages"
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
            label="bills"
            :loading="isBulkOperating"
            :can-delete="canManage('expenses')"
            @clear="clearSelection"
            @delete="showBulkDeleteConfirm = true"
            @export="handleBulkExport"
          >
            <DropdownMenu v-if="canManage('expenses')">
              <DropdownMenuTrigger as-child>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-8 text-xs font-medium gap-1.5 rounded-lg"
                  :disabled="isBulkOperating"
                >
                  <span>Status</span>
                  <ChevronDown class="size-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" class="w-36">
                <DropdownMenuItem @click="requestBulkStatus('Draft')" class="text-xs cursor-pointer">
                  Mark as Draft
                </DropdownMenuItem>
                <DropdownMenuItem @click="requestBulkStatus('Outstanding')" class="text-xs cursor-pointer">
                  Mark as Outstanding
                </DropdownMenuItem>
                <DropdownMenuItem @click="requestBulkStatus('Paid')" class="text-xs cursor-pointer">
                  Mark as Paid
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </BulkActionBar>

          <!-- Bulk Status Confirmation Dialog -->
          <BulkConfirmDialog
            v-model:open="showBulkStatusConfirm"
            :title="`Update Status for ${selectedCount} Bills`"
            :description="`You are about to change the status of ${selectedCount} selected bills to '${pendingStatusUpdate}'. This will update their expense records and payment state.`"
            :item-count="selectedCount"
            :item-names="selectedItems.map((b) => b.billNumber)"
            :action-label="`Mark as ${pendingStatusUpdate}`"
            variant="default"
            :loading="isBulkUpdatingStatus"
            @confirm="confirmBulkStatus"
          />

          <!-- Bulk Delete Confirmation Dialog -->
          <BulkConfirmDialog
            v-model:open="showBulkDeleteConfirm"
            :title="selectedCount > 1 ? `Delete ${selectedCount} Bills` : 'Delete Bill'"
            :description="selectedCount > 1
              ? `You are about to permanently delete ${selectedCount} bills and their associated line items and accounting entries. This action cannot be undone.`
              : `Are you sure you want to delete bill ${selectedItems[0]?.billNumber || ''}? This action cannot be undone.`"
            :item-count="selectedCount"
            :item-names="selectedItems.map((b) => b.billNumber)"
            action-label="Delete"
            variant="destructive"
            :loading="isBulkDeleting"
            @confirm="handleBulkDeleteConfirm"
          />
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
          @click="handleViewDetailsClick"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors"
        >
          <Eye class="w-3.5 h-3.5" />
          View Details
        </button>
        <button type="button"
          @click="handleEditClick"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors"
        >
          <ExternalLink class="w-3.5 h-3.5" />
          Edit Bill
        </button>
        <button type="button"
          @click="handleViewLineItemsClick"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors"
        >
          <Package class="w-3.5 h-3.5" />
          View Line Items
        </button>
        <button type="button"
          v-if="activeMenuBill?.status === 'Draft'"
          @click="handleStatusUpdateClick('Outstanding')"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-info hover:bg-info/10 flex items-center gap-2 transition-colors"
        >
          <ExternalLink class="w-3.5 h-3.5" />
          Open Bill
        </button>
        <button type="button"
          v-if="activeMenuBill?.status !== 'Paid'"
          @click="handleStatusUpdateClick('Paid')"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-success hover:bg-success/10 flex items-center gap-2 transition-colors"
        >
          <CheckCircle class="w-3.5 h-3.5" />
          Mark as Paid
        </button>
        <button type="button"
          @click="handleDeleteClick"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 flex items-center gap-2 border-t border-border/50 transition-colors"
        >
          <Trash2 class="w-3.5 h-3.5" />
          Delete Bill
        </button>
      </div>
    </Teleport>

    <!-- Modal for Adding Bill -->
    <Modal
      :open="isAddingBill"
      :title="isEditing ? t('modals.bills.editTitle') : t('modals.bills.newTitle')"
      :description="t('modals.bills.subtitle')"
      max-width-class="max-w-xl"
      body-class="p-6 space-y-5 max-h-[70vh] overflow-y-auto"
      @close="isAddingBill = false; resetBillForm()"
    >
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="billNumber" class="text-sm font-medium">
            {{ t('modals.bills.fields.number') }} <span class="text-destructive">*</span>
          </Label>
          <Input
            id="billNumber"
            v-model="newBill.billNumber"
            class="font-mono"
            :class="{ 'border-destructive focus-visible:ring-destructive': errors.billNumber }"
          />
          <p v-if="errors.billNumber" class="text-xs text-destructive">
            {{ errors.billNumber }}
          </p>
        </div>
        <div class="space-y-2">
          <Label for="billAmount" class="text-sm font-medium">
            {{ t('modals.bills.fields.amount') }} <span class="text-destructive">*</span>
          </Label>
          <div class="relative">
            <IndianRupee class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              id="billAmount"
              type="number"
              v-model="newBill.amount"
              placeholder="0.00"
              class="pl-9 font-mono"
              :disabled="newBill.items && newBill.items.length > 0"
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
            {{ t('modals.bills.fields.vendor') }} <span class="text-destructive">*</span>
          </Label>
          <button type="button"
            @click="isAddingInlineVendor = true"
            class="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
          >
            <Plus class="w-3 h-3" /> {{ t('topbar.new') }}
          </button>
        </div>
        <Select
          v-model="newBill.vendorId"
          :options="vendorStore.vendors"
          :placeholder="t('modals.bills.fields.selectVendor')"
        />
        <p v-if="errors.vendorId" class="text-xs text-destructive">
          {{ errors.vendorId }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label class="text-sm font-medium">{{ t('modals.bills.fields.date') }}</Label>
          <DatePicker v-model="newBill.date" />
          <p v-if="errors.date" class="text-xs text-destructive">
            {{ errors.date }}
          </p>
        </div>
        <div class="space-y-2">
          <Label class="text-sm font-medium">{{ t('modals.bills.fields.dueDate') }}</Label>
          <DatePicker v-model="newBill.dueDate" />
          <p v-if="errors.dueDate" class="text-xs text-destructive">
            {{ errors.dueDate }}
          </p>
        </div>
      </div>

      <!-- Selected Items List -->
      <div v-if="newBill.items && newBill.items.length > 0" class="space-y-2 pt-2">
        <Label class="text-sm font-medium">{{ t('modals.bills.fields.selectedItems') }}</Label>
        <div class="border rounded-lg overflow-hidden divide-y bg-card">
          <div
            v-for="(item, idx) in newBill.items"
            :key="item.itemId"
            class="p-3 flex items-center justify-between gap-4 text-xs"
          >
            <div class="flex-1 min-w-0 space-y-1.5">
              <p class="font-medium truncate text-foreground text-sm">{{ item.itemName }}</p>
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-muted-foreground">{{ t('modals.bills.fields.rate') }} {{ currencySymbol }}</span>
                <input
                  type="number"
                  v-model.number="item.rate"
                  @input="updateBillItemRate(idx, item.rate)"
                  min="0"
                  step="any"
                  class="w-20 px-2 py-0.5 h-7 bg-background border border-input rounded text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span class="text-xs text-muted-foreground ml-1">{{ t('modals.bills.fields.each') }}</span>
              </div>
              <div>
                <input
                  type="text"
                  v-model="item.description"
                  :placeholder="t('modals.bills.fields.itemPlaceholder')"
                  class="w-full px-2.5 py-1 bg-background border border-input rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center border border-input rounded-md bg-background overflow-hidden h-8">
                <button
                  type="button"
                  @click="updateBillItemQuantity(idx, item.quantity - 1)"
                  class="px-2.5 py-1 text-muted-foreground hover:bg-muted text-xs font-medium"
                >
                  -
                </button>
                <input
                  type="number"
                  v-model.number="item.quantity"
                  @input="updateBillItemQuantity(idx, item.quantity)"
                  min="0"
                  step="any"
                  class="w-12 text-center h-full bg-transparent border-none focus:outline-none focus:ring-0 text-xs font-mono font-medium text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-x border-input"
                />
                <button
                  type="button"
                  @click="updateBillItemQuantity(idx, item.quantity + 1)"
                  class="px-2.5 py-1 text-muted-foreground hover:bg-muted text-xs font-medium"
                >
                  +
                </button>
              </div>
              <div class="w-20 text-right font-mono font-medium text-sm text-foreground">
                {{ formatCurrency(item.amount) }}
              </div>
              <button type="button"
                @click="removeItemFromBill(idx)"
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
          <Label class="text-sm font-medium">{{ t('modals.bills.fields.catalogSelector') }}</Label>
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
            @click="addItemToBill(item)"
          >
            <div>
              <p class="text-xs font-medium text-foreground">{{ item.name }}</p>
              <p class="text-xs text-muted-foreground">
                {{ formatCurrency(item.unitPrice) }}
              </p>
            </div>
            <ExternalLink class="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p v-if="itemStore.items.length > 3" class="text-xs text-center text-muted-foreground italic">
            {{ t('modals.bills.fields.moreInCatalog', { count: itemStore.items.length - 3 }) }}
          </p>
        </div>
        <div v-else class="text-center py-6 border-2 border-dashed rounded-lg">
          <Package class="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p class="text-xs font-medium text-muted-foreground">{{ t('modals.bills.noItems') }}</p>
          <button type="button" @click="redirectToAddItem" class="text-xs font-medium text-primary mt-1 hover:underline">
            {{ t('modals.bills.createFirstItem') }}
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
          <span>{{ t('modals.bills.fields.additionalInfo') }}</span>
          <ChevronDown :class="['w-4 h-4 transition-transform duration-200 text-muted-foreground', showAdvanced ? 'rotate-180' : '']" />
        </button>
        <div v-show="showAdvanced" class="p-4 space-y-4 border-t bg-muted/10 animate-in fade-in duration-200">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.bills.fields.referenceNumber') }}</Label>
              <Input v-model="newBill.referenceNumber" placeholder="PO-1234" />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.bills.fields.terms') }}</Label>
              <Input v-model="newBill.terms" placeholder="Net 30" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.bills.fields.billingAddress') }}</Label>
              <Textarea
                v-model="newBill.billingAddress"
                placeholder="Street, City, State, ZIP"
                class="min-h-[60px]"
              />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.bills.fields.shippingAddress') }}</Label>
              <Textarea
                v-model="newBill.shippingAddress"
                placeholder="Street, City, State, ZIP"
                class="min-h-[60px]"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.bills.fields.notes') }}</Label>
              <Textarea
                v-model="newBill.notes"
                :placeholder="t('modals.bills.fields.notesPlaceholder')"
                class="min-h-[60px]"
              />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.bills.fields.termsConditions') }}</Label>
              <Textarea
                v-model="newBill.termsConditions"
                placeholder="Legal/payment terms"
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
          <span>{{ t('modals.bills.fields.discountsTaxes') }}</span>
          <ChevronDown :class="['w-4 h-4 transition-transform duration-200 text-muted-foreground', showTaxesDiscounts ? 'rotate-180' : '']" />
        </button>
        <div v-show="showTaxesDiscounts" class="p-4 space-y-4 border-t bg-muted/10 animate-in fade-in duration-200">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.bills.fields.discountType') }}</Label>
              <Select
                v-model="newBill.discountType"
                :options="discountTypeOptions"
                :placeholder="t('modals.bills.fields.noDiscount')"
              />
            </div>
            <div class="space-y-2" v-if="newBill.discountType">
              <Label class="text-xs font-medium">{{ t('modals.bills.fields.discountValue') }}</Label>
              <Input type="number" v-model.number="newBill.discountValue" placeholder="0" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.bills.fields.taxPercent') }}</Label>
              <Input type="number" v-model.number="newBill.taxPercent" placeholder="0" />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.bills.fields.shippingCharges') }}</Label>
              <Input type="number" v-model.number="newBill.shippingCharges" placeholder="0" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.bills.fields.adjustment') }}</Label>
              <Input type="number" v-model.number="newBill.adjustment" placeholder="0" />
            </div>
          </div>
          <div class="flex flex-col items-end pt-1 pr-1 space-y-1 text-right text-xs">
            <p class="text-muted-foreground">
              {{ t('modals.bills.fields.calculatedTax') }} <span class="font-mono text-foreground font-semibold">{{ currencySymbol }}{{ Number(newBill.taxAmount || 0).toFixed(2) }}</span>
            </p>
            <p class="text-muted-foreground">
              {{ t('modals.bills.fields.calculatedDiscount') }} <span class="font-mono text-foreground font-semibold">{{ currencySymbol }}{{ Number(newBill.discountAmount || 0).toFixed(2) }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Custom Fields Section -->
      <CustomFieldRenderer
        entity="bill"
        v-model="newBill.customFields"
      />

      <div class="space-y-2">
        <Label class="text-sm font-medium">{{ t('modals.bills.fields.status') }}</Label>
        <div class="flex p-1 bg-muted rounded-lg text-xs font-medium">
          <button type="button"
            v-for="s in ['Draft', 'Outstanding', 'Paid', 'Void']"
            :key="s"
            @click="newBill.status = s as any"
            :class="[
              'flex-1 py-1.5 rounded-md transition-all text-center',
              newBill.status === s
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            {{ s === 'Outstanding' ? 'Open' : s }}
          </button>
        </div>
      </div>

      <template #footer>
        <Button
          @click="isAddingBill = false; resetBillForm()"
          variant="outline"
        >
          {{ t('common.cancel') }}
        </Button>
        <Button
          @click="handleAddBill(newBill.status)"
          :disabled="isSaving || fetchingDetails"
          class="gap-2"
        >
          <Spinner v-if="isSaving || fetchingDetails" size="sm" class="text-primary-foreground" />
          {{ isSaving ? t('common.saving') : fetchingDetails ? 'Loading details...' : (isEditing ? t('modals.bills.save') : t('modals.bills.create')) }}
        </Button>
      </template>
    </Modal>

    <!-- View Details Modal -->
    <Modal
      :open="!!selectedDetail"
      :title="t('modals.bills.detailTitle')"
      max-width-class="max-w-sm"
      body-class="p-5 space-y-4"
      @close="selectedDetail = null"
    >
      <template #header-actions>
        <button
          v-if="selectedDetail"
          type="button"
          @click="toggleBillBookmark(selectedDetail)"
          :class="[
            'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
            bookmarkStore.isBookmarked('bill', selectedDetail.id)
              ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          ]"
          :title="bookmarkStore.isBookmarked('bill', selectedDetail.id) ? 'Remove bookmark' : 'Bookmark bill'"
        >
          <BookmarkIcon
            :class="[
              'size-4 transition-transform active:scale-125',
              bookmarkStore.isBookmarked('bill', selectedDetail.id) ? 'fill-blue-500 text-blue-500' : ''
            ]"
          />
        </button>
      </template>

      <div v-if="selectedDetail" class="grid grid-cols-2 gap-x-4 gap-y-3">
        <div class="space-y-1">
          <span class="text-xs text-muted-foreground font-medium">{{ t('modals.bills.fields.number') }}</span>
          <p class="text-sm text-foreground font-semibold font-mono">{{ selectedDetail.billNumber }}</p>
        </div>
        <div class="space-y-1">
          <span class="text-xs text-muted-foreground font-medium">{{ t('modals.bills.fields.vendor') }}</span>
          <p class="text-sm text-foreground font-medium">{{ getVendorName(selectedDetail) }}</p>
        </div>
        <div class="space-y-1">
          <span class="text-xs text-muted-foreground font-medium">{{ t('modals.bills.fields.date') }}</span>
          <p class="text-sm text-foreground font-medium">{{ selectedDetail.date }}</p>
        </div>
        <div class="space-y-1">
          <span class="text-xs text-muted-foreground font-medium">{{ t('modals.bills.fields.dueDate') }}</span>
          <p class="text-sm text-foreground font-medium">{{ selectedDetail.dueDate }}</p>
        </div>
        <div class="space-y-1">
          <span class="text-xs text-muted-foreground font-medium">{{ t('modals.bills.fields.amount') }}</span>
          <p class="text-sm text-foreground font-bold text-primary font-mono">{{ formatCurrency(selectedDetail.amount) }}</p>
        </div>
        <div class="space-y-1">
          <span class="text-xs text-muted-foreground font-medium">{{ t('modals.bills.fields.status') }}</span>
          <div>
            <span
              :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap shadow-xs transition-colors',
                getInvoiceStatusInfo(selectedDetail.status, selectedDetail.dueDate).colorClass
              ]"
            >
              {{ getInvoiceStatusInfo(selectedDetail.status, selectedDetail.dueDate).label }}
            </span>
          </div>
        </div>
      </div>

      <template #footer>
        <Button @click="viewBillItems(selectedDetail); selectedDetail = null;" size="sm" variant="outline">
          {{ t('modals.bills.lineItems') }}
        </Button>
        <Button @click="selectedDetail = null" size="sm">
          {{ t('common.close') }}
        </Button>
      </template>
    </Modal>

    <!-- View Line Items Modal -->
    <Modal
      :open="isViewingItems"
      :title="t('modals.bills.viewLineItems', { number: activeBillForItems?.billNumber })"
      :description="t('modals.bills.fromVendor', { vendor: activeBillForItems?.vendors?.name })"
      body-class="p-5 max-h-[50vh] overflow-y-auto"
      @close="isViewingItems = false"
    >
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-border text-xs font-medium text-muted-foreground">
            <th class="pb-2">{{ t('modals.bills.fields.itemName') }}</th>
            <th class="pb-2 text-right">{{ t('modals.bills.fields.quantity') }}</th>
            <th class="pb-2 text-right">{{ t('modals.bills.fields.rateHeader') }}</th>
            <th class="pb-2 text-right">{{ t('modals.bills.fields.amount') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="item in activeBillForItems?.items" :key="item.id" class="hover:bg-muted/40">
            <td class="py-3 font-medium text-foreground">{{ item.itemName }}</td>
            <td class="py-3 text-right font-mono">{{ item.quantity }}</td>
            <td class="py-3 text-right font-mono">{{ formatCurrency(item.rate) }}</td>
            <td class="py-3 text-right font-mono font-semibold">{{ formatCurrency(item.amount) }}</td>
          </tr>
          <tr v-if="!activeBillForItems?.items || activeBillForItems.items.length === 0">
            <td colspan="4" class="py-8 text-center text-muted-foreground italic">
              {{ t('modals.bills.noLineItems') }}
            </td>
          </tr>
        </tbody>
      </table>

      <template #footer>
        <div class="w-full flex justify-between items-center">
          <div>
            <span class="text-xs text-muted-foreground font-medium">{{ t('modals.bills.totalAmount') }}</span>
            <p class="text-base font-bold text-foreground font-mono">{{ formatCurrency(activeBillForItems?.amount || 0) }}</p>
          </div>
          <Button @click="isViewingItems = false" size="sm" variant="outline">
            {{ t('common.close') }}
          </Button>
        </div>
      </template>
    </Modal>

    <!-- Global Loading Overlay for Details -->
    <div
      v-if="fetchingItems"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div class="bg-card border border-border px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
        <Spinner size="sm" class="text-primary" />
        <span class="text-xs font-bold text-foreground uppercase tracking-widest">{{ t('modals.bills.fetchingItems') }}</span>
      </div>
    </div>

    <!-- Modals -->
    <AddVendorModal
      :open="isAddingInlineVendor"
      @close="isAddingInlineVendor = false"
      @success="handleInlineVendorSuccess"
    />

    <AddItemModal
      :open="isAddingInlineItem"
      @close="isAddingInlineItem = false"
      @success="handleInlineItemSuccess"
    />

    <BulkUploadModal
      v-model:open="isBulkUploadOpen"
      entity="bills"
      @success="fetchBillsData(pagination.page, true)"
    />
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background: var(--muted);
  border-radius: 10px;
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Sidebar from '@/components/Sidebar.vue';
import TopBar from '@/components/TopBar.vue';
import { useInvoiceStore, type Invoice } from '@/stores/invoiceStore';
import { useCustomerStore } from '@/stores/customerStore';
import { useItemStore } from '@/stores/itemStore';
import { useTheme } from '@/composables/useTheme';
import { formatCurrency, formatDate, getInvoiceStatusInfo } from '@/utils/formatters';
import SendInvoiceModal from '@/components/SendInvoiceModal.vue';
import {
  Plus,
  Search,
  MoreHorizontal,
  Calendar,
  User,
  Hash,
  IndianRupee,
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
  Mail,
  Upload,
  UploadCloud,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bookmark as BookmarkIcon,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-vue-next';
import BulkUploadModal from '@/components/BulkUploadModal.vue';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import DatePicker from '@/components/ui/DatePicker.vue';
import Select from '@/components/ui/Select.vue';
import Modal from '@/components/Modal.vue';
import CustomFieldRenderer from '@/components/ui/CustomFieldRenderer.vue';
import StickyPageHeader from '@/components/ui/StickyPageHeader.vue';
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

import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'vue-sonner';
import { storeToRefs } from 'pinia';
import ViewGuard from '@/components/ViewGuard.vue';
import AddCustomerModal from '@/components/AddCustomerModal.vue';
import AddItemModal from '@/components/AddItemModal.vue';
import { usePermissions } from '@/composables/usePermissions';
import InvoicePreviewModal from '@/components/InvoicePreviewModal.vue';
import { useAuthStore } from '@/stores/authStore';
import UpgradePlanModal from '@/components/UpgradePlanModal.vue';
import { useFormValidation } from '@/composables/useFormValidation';
import { invoiceSchema } from '@/utils/validationSchemas';
import { calculateDocumentTotals } from '@accountiva/shared';

import { useQuickCreateStore } from '@/stores/quickCreateStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useTrashStore } from '@/stores/trashStore';
import { useCurrency } from '@/composables/useCurrency';

const invoiceStore = useInvoiceStore();
const customerStore = useCustomerStore();
const itemStore = useItemStore();
const authStore = useAuthStore();
const bookmarkStore = useBookmarkStore();
const trashStore = useTrashStore();
const { theme } = useTheme();
const router = useRouter();
const quickCreateStore = useQuickCreateStore();
const { canManage } = usePermissions();
const { t } = useI18n();
const { currencySymbol } = useCurrency();

const discountTypeOptions = computed(() => [
  { id: '', name: t('modals.invoices.fields.noDiscount') },
  { id: 'Percentage', name: 'Percentage (%)' },
  { id: 'Flat', name: `Flat (${currencySymbol.value})` }
]);

const { invoices, pagination, loading: fetchingInvoices } = storeToRefs(invoiceStore);
const { currentOrganization } = storeToRefs(authStore);
const loading = ref(false);
const isSaving = ref(false);
const fetchingDetails = ref(false);

const isAddingInvoice = ref(false);
const isUpgradeModalOpen = ref(false);
const isPreviewOpen = ref(false);
const isSendingEmail = ref(false);
const statusLoadingAction = ref<string | null>(null);
const selectedInvoiceForEmail = ref<any>(null);
const selectedDetail = ref<Invoice | null>(null);
const searchQuery = ref('');
const activeFilter = ref('All');
const activeTimeframe = ref('all');
const activeMinAmount = ref<number | null>(null);
const activeMaxAmount = ref<number | null>(null);
const isBookmarkedOnly = ref(false);
const openMenuId = ref<string | null>(null);
const menuPosition = ref({ top: 0, left: 0 });
const isAddingInlineCustomer = ref(false);
const isAddingInlineItem = ref(false);
const filters = ['All', 'Draft', 'Due', 'Outstanding', 'Paid'];

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
  fetchInvoicesData(1, true);
};

const handleUpdateFilter = (key: string, value: any) => {
  if (key === 'status') activeFilter.value = value;
  else if (key === 'timeframe') activeTimeframe.value = value;
  else if (key === 'minAmount') activeMinAmount.value = value;
  else if (key === 'maxAmount') activeMaxAmount.value = value;
  else if (key === 'bookmarkedOnly') isBookmarkedOnly.value = Boolean(value);
  fetchInvoicesData(1, true);
};

const handleResetFilters = () => {
  activeFilter.value = 'All';
  activeTimeframe.value = 'all';
  activeMinAmount.value = null;
  activeMaxAmount.value = null;
  isBookmarkedOnly.value = false;
  searchQuery.value = '';
  fetchInvoicesData(1, true);
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
  return bookmarkStore.bookmarks.filter((b) => b.entity_type === 'invoice').length;
});

const displayedInvoices = computed(() => invoices.value);

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
} = useBulkSelection(displayedInvoices);

const isBulkDeleting = ref(false);
const isBulkUpdatingStatus = ref(false);
const showBulkDeleteConfirm = ref(false);
const showBulkStatusConfirm = ref(false);
const pendingStatusUpdate = ref<Invoice['status'] | null>(null);
const isBulkOperating = computed(() => isBulkDeleting.value || isBulkUpdatingStatus.value);

const handleBulkDeleteConfirm = async () => {
  if (selectedIds.value.size === 0) return;
  isBulkDeleting.value = true;
  const idsToDelete = Array.from(selectedIds.value);
  try {
    const res = await invoiceStore.bulkDeleteInvoices(idsToDelete);
    toast.success('Invoices moved to Trash', {
      description: `Successfully moved ${idsToDelete.length} invoice(s) to Trash.`,
      action: {
        label: 'Undo',
        onClick: async () => {
          await trashStore.restoreBulk(idsToDelete.map((id) => ({ entityType: 'invoice', id })));
          await invoiceStore.fetchInvoices(1, invoiceStore.pagination.limit, '', 'All', true);
        },
      },
    });
    clearSelection();
    showBulkDeleteConfirm.value = false;
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to move invoices to Trash');
  } finally {
    isBulkDeleting.value = false;
  }
};

const handleBulkStatus = async (status: Invoice['status']) => {
  if (selectedIds.value.size === 0) return;
  isBulkUpdatingStatus.value = true;
  const idsToUpdate = Array.from(selectedIds.value);
  try {
    const res = await invoiceStore.bulkUpdateInvoiceStatus(idsToUpdate, status);
    toast.success('Status updated', {
      description: res?.message || `Marked ${idsToUpdate.length} invoice(s) as ${status}.`,
    });
    clearSelection();
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to update invoice statuses');
  } finally {
    isBulkUpdatingStatus.value = false;
  }
};

const requestBulkStatus = (status: Invoice['status']) => {
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
  const exportData = selectedItems.value.map((inv) => ({
    'Invoice #': inv.invoiceNumber,
    Client: getCustomerName(inv),
    Date: inv.date,
    'Due Date': inv.dueDate,
    Amount: inv.amount,
    Status: inv.status,
    Notes: inv.notes || '',
  }));

  if (format === 'csv') {
    exportToCsv(exportData, 'invoices');
  } else {
    exportToJson(exportData, 'invoices');
  }
  toast.success(`Exported ${exportData.length} invoice(s) as ${format.toUpperCase()}`);
};

const toggleInvoiceBookmark = async (invoice: Invoice) => {
  await bookmarkStore.toggleBookmark({
    entity_type: 'invoice',
    entity_id: invoice.id,
    title: invoice.invoiceNumber,
    subtitle: getCustomerName(invoice),
    route: '/invoices',
    metadata: {
      amount: invoice.amount,
      status: invoice.status,
      date: invoice.dueDate,
      customerName: getCustomerName(invoice),
    },
  });
  if (isBookmarkedOnly.value) {
    await fetchInvoicesData(pagination.value.page, true);
  }
};

const showAdvanced = ref(false);
const showTaxesDiscounts = ref(false);
const autoRoundOff = ref(true);

const newInvoice = ref<Omit<Invoice, 'id'>>({
  invoiceNumber: '',
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  customerId: '',
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
  packagingCharges: 0,
  adjustment: 0,
  roundOff: 0,
  notes: '',
  termsConditions: '',
  taxPercent: 0,
  taxAmount: 0,
  customFields: {},
});

const { errors, validate, clearErrors } = useFormValidation(invoiceSchema, newInvoice);

const getCustomerName = (invoice: Invoice) => {
  if (invoice.customers?.name) return invoice.customers.name;
  return customerStore.customers.find((c) => c.id === invoice.customerId)?.name || 'Unknown Client';
};

const getStatusDotClass = (status: string, dueDate: string | Date | null) => {
  if (status === 'Paid') return 'bg-emerald-500';
  if (status === 'Draft') return 'bg-muted-foreground';
  if (!dueDate) return 'bg-amber-500';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 0) return 'bg-amber-500';
  if (diffDays === 0) return 'bg-amber-600 animate-pulse';
  return 'bg-rose-500';
};

const isInitialLoading = ref(invoiceStore.invoices.length === 0);

const fetchInvoicesData = async (page = 1, force = true) => {
  clearSelection();
  try {
    await invoiceStore.fetchInvoices(
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
  fetchInvoicesData(newPage, true);
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
};

// Debounced fetch ONLY when typing into search input
let searchTimeout: any = null;
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchInvoicesData(1, true);
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
    await invoiceStore.deleteInvoice(id);
    openMenuId.value = null;
    toast.success('Invoice moved to Trash', {
      description: 'You can restore it anytime from the Trash Bin.',
      action: {
        label: 'Undo',
        onClick: async () => {
          await trashStore.restoreItem('invoice', id);
          await invoiceStore.fetchInvoices(1, invoiceStore.pagination.limit, '', 'All', true);
        },
      },
    });
  } catch (err) {
    console.error('Failed to delete invoice:', err);
  }
};

const handleStatusUpdate = async (id: string, status: Invoice['status']) => {
  if (!id) return;
  statusLoadingAction.value = `${id}-${status}`;
  try {
    await invoiceStore.updateInvoiceStatus(id, status);
    openMenuId.value = null;
    toast.success(`Invoice marked as ${status}`);
  } catch (err: any) {
    console.error('Failed to update status:', err);
    toast.error(err?.response?.data?.error || invoiceStore.error || 'Failed to update status');
  } finally {
    statusLoadingAction.value = null;
  }
};

const autoGenerateNumber = ref(true);

const loadNextInvoiceNumber = async () => {
  try {
    const nextNum = await invoiceStore.fetchNextInvoiceNumber();
    newInvoice.value.invoiceNumber = nextNum;
  } catch (err) {
    console.error("Failed to load next invoice number:", err);
  }
};

watch(autoGenerateNumber, (newVal) => {
  if (newVal && isAddingInvoice.value && !isEditing.value) {
    loadNextInvoiceNumber();
  }
});

const isEditing = ref(false);
const editingInvoiceId = ref<string | null>(null);

watch(isAddingInvoice, (val) => {
  if (val && !isEditing.value) {
    resetInvoiceForm();
    if (autoGenerateNumber.value) {
      loadNextInvoiceNumber();
    }
  }
});

const startEditInvoice = async (invoice: Invoice) => {
  isEditing.value = true;
  editingInvoiceId.value = invoice.id;
  openMenuId.value = null;

  const source = (invoice.items ? invoice : invoiceStore.detailsCache[invoice.id]) || invoice;

  // Immediately populate with existing data so modal fields show right away
  newInvoice.value = {
    invoiceNumber: source.invoiceNumber,
    date: source.date || new Date().toISOString().split('T')[0],
    dueDate: source.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerId: source.customerId,
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
    packagingCharges: (source as any).packagingCharges ?? (source as any).packaging_charges ?? 0,
    adjustment: (source as any).roundOff ?? source.adjustment ?? 0,
    roundOff: (source as any).roundOff ?? source.adjustment ?? 0,
    notes: source.notes || '',
    termsConditions: source.termsConditions || '',
    taxPercent: source.taxPercent || 0,
    taxAmount: source.taxAmount || 0,
    customFields: source.customFields ? { ...source.customFields } : {},
  };

  isAddingInvoice.value = true;

  // If items are already available in memory, no need to trigger loading or network delay
  if (source.items && source.referenceNumber !== undefined) {
    fetchingDetails.value = false;
    return;
  }

  const hasCache = !!invoiceStore.detailsCache[invoice.id]?.items;
  if (!hasCache) {
    fetchingDetails.value = true;
  }
  try {
    const details = await invoiceStore.fetchInvoiceDetails(invoice.id);
    newInvoice.value = {
      invoiceNumber: details.invoiceNumber,
      date: details.date,
      dueDate: details.dueDate,
      customerId: details.customerId,
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
      packagingCharges: (details as any).packagingCharges ?? (details as any).packaging_charges ?? 0,
      adjustment: (details as any).roundOff ?? details.adjustment ?? 0,
      roundOff: (details as any).roundOff ?? details.adjustment ?? 0,
      notes: details.notes || '',
      termsConditions: details.termsConditions || '',
      taxPercent: details.taxPercent || 0,
      taxAmount: details.taxAmount || 0,
      customFields: details.customFields || invoice.customFields || {},
    };
  } catch (err) {
    console.error(err);
    toast.error("Failed to load invoice details");
  } finally {
    fetchingDetails.value = false;
  }
};

const resetInvoiceForm = () => {
  isEditing.value = false;
  editingInvoiceId.value = null;
  showAdvanced.value = false;
  showTaxesDiscounts.value = false;
  newInvoice.value = {
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerId: '',
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
    packagingCharges: 0,
    adjustment: 0,
    roundOff: 0,
    notes: '',
    termsConditions: '',
    taxPercent: 0,
    taxAmount: 0,
    customFields: {},
  };
  clearErrors();
};

const checkInvoiceLimitAndCreate = () => {
  isAddingInvoice.value = true;
};

// Reactively listen to quick create triggers from TopBar or other components
watch(
  () => [quickCreateStore.pendingAction, quickCreateStore.actionToken],
  ([action]) => {
    if (action === 'invoice') {
      quickCreateStore.consume('invoice');
      checkInvoiceLimitAndCreate();
    }
  },
  { immediate: true }
);

const openPreview = async (id: string) => {
  openMenuId.value = null;
  const cached = invoiceStore.detailsCache[id];
  const itemInList = invoices.value.find((i) => i.id === id);

  const bestAvailable = (cached?.items ? cached : null) || (itemInList?.items ? itemInList : null) || cached || itemInList;

  // Open modal instantly (0ms delay) with available data
  if (bestAvailable) {
    selectedDetail.value = bestAvailable;
    isPreviewOpen.value = true;
  }

  // Fetch full details in the background ONLY if items are not present
  if (!bestAvailable?.items) {
    try {
      const details = await invoiceStore.fetchInvoiceDetails(id);
      selectedDetail.value = details;
      if (!isPreviewOpen.value) {
        isPreviewOpen.value = true;
      }
    } catch (err) {
      console.error("Failed to load full invoice details for preview:", err);
    }
  }
};

const activeMenuInvoice = computed(() => {
  if (!openMenuId.value) return null;
  return invoiceStore.invoices.find((i) => i.id === openMenuId.value) || null;
});

const handleViewPreviewClick = () => {
  if (openMenuId.value) {
    openPreview(openMenuId.value);
  }
};

const handleMenuBookmarkClick = () => {
  if (activeMenuInvoice.value) {
    toggleInvoiceBookmark(activeMenuInvoice.value);
    openMenuId.value = null;
  }
};

const handleEditClick = () => {
  if (openMenuId.value) {
    const inv = invoiceStore.invoices.find((i) => i.id === openMenuId.value);
    if (inv) startEditInvoice(inv);
  }
};

const handleStatusUpdateClick = (status: 'Outstanding' | 'Paid') => {
  if (openMenuId.value) {
    handleStatusUpdate(openMenuId.value, status);
  }
};

const handleSendEmailClick = () => {
  if (openMenuId.value) {
    selectedInvoiceForEmail.value = invoiceStore.invoices.find((i) => i.id === openMenuId.value) || null;
    isSendingEmail.value = true;
    openMenuId.value = null;
  }
};

const handleDeleteClick = () => {
  if (openMenuId.value) {
    handleDelete(openMenuId.value);
  }
};

const addItemToInvoice = (item: any) => {
  if (!newInvoice.value.items) {
    newInvoice.value.items = [];
  }
  const existingItemIndex = newInvoice.value.items.findIndex(i => i.itemId === item.id);
  if (existingItemIndex > -1) {
    newInvoice.value.items[existingItemIndex].quantity += 1;
    newInvoice.value.items[existingItemIndex].amount = 
      Number(newInvoice.value.items[existingItemIndex].quantity) * Number(newInvoice.value.items[existingItemIndex].rate);
  } else {
    newInvoice.value.items.push({
      itemId: item.id,
      itemName: item.name,
      quantity: 1,
      rate: Number(item.unitPrice),
      amount: Number(item.unitPrice),
      description: item.description || ''
    });
  }
  recalculateInvoiceTotalAmount();
};

const removeItemFromInvoice = (index: number) => {
  if (!newInvoice.value.items) return;
  newInvoice.value.items.splice(index, 1);
  recalculateInvoiceTotalAmount();
};

const updateInvoiceItemQuantity = (index: number, qty: number) => {
  if (!newInvoice.value.items) return;
  if (qty < 0) qty = 0;
  newInvoice.value.items[index].quantity = qty;
  newInvoice.value.items[index].amount = qty * newInvoice.value.items[index].rate;
  recalculateInvoiceTotalAmount();
};

const updateInvoiceItemRate = (index: number, rate: number) => {
  if (!newInvoice.value.items) return;
  if (rate < 0) rate = 0;
  newInvoice.value.items[index].rate = rate;
  newInvoice.value.items[index].amount = newInvoice.value.items[index].quantity * rate;
  recalculateInvoiceTotalAmount();
};

const recalculateInvoiceTotalAmount = () => {
  if (!newInvoice.value.items) return;
  const totals = calculateDocumentTotals({
    items: newInvoice.value.items,
    discountType: newInvoice.value.discountType,
    discountValue: newInvoice.value.discountValue,
    taxPercent: newInvoice.value.taxPercent,
    shippingCharges: newInvoice.value.shippingCharges,
    packagingCharges: newInvoice.value.packagingCharges,
    roundOff: newInvoice.value.adjustment,
    autoRoundOff: autoRoundOff.value,
  });

  newInvoice.value.discountAmount = totals.discountAmount;
  newInvoice.value.taxAmount = totals.taxAmount;
  newInvoice.value.adjustment = totals.roundOff;
  newInvoice.value.roundOff = totals.roundOff;
  newInvoice.value.amount = totals.total;
};

watch(
  () => [
    newInvoice.value.discountType,
    newInvoice.value.discountValue,
    newInvoice.value.taxPercent,
    newInvoice.value.shippingCharges,
    newInvoice.value.packagingCharges,
    newInvoice.value.adjustment,
    autoRoundOff.value,
  ],
  () => {
    recalculateInvoiceTotalAmount();
  }
);

const handleAddInvoice = async (targetStatus: Invoice['status'] = 'Draft') => {
  if (!validate()) {
    toast.error(isEditing.value ? 'Invoice update failed' : 'Invoice creation failed', {
      description: 'Please correct the errors in the form before saving.',
    });
    return;
  }

  isSaving.value = true;
  try {
    if (isEditing.value && editingInvoiceId.value) {
      await invoiceStore.updateInvoice(editingInvoiceId.value, { ...newInvoice.value, status: targetStatus });
      toast.success('Invoice updated successfully', {
        description: `Invoice ${newInvoice.value.invoiceNumber} has been updated.`,
      });
    } else {
      await invoiceStore.addInvoice({ ...newInvoice.value, status: targetStatus });
      toast.success('Invoice created successfully', {
        description: `Invoice ${newInvoice.value.invoiceNumber} is now ${targetStatus}.`,
      });
    }
    isAddingInvoice.value = false;
    resetInvoiceForm();
  } catch (err: any) {
    console.error('Failed to save invoice:', err);
    const errMsg = err.response?.data?.error || 'Failed to save invoice';
    toast.error(errMsg);
    if (!isEditing.value && (errMsg.toLowerCase().includes('limit') || errMsg.toLowerCase().includes('plan') || errMsg.toLowerCase().includes('upgrade'))) {
      isUpgradeModalOpen.value = true;
    }
  } finally {
    isSaving.value = false;
  }
};

const importing = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const isImportModalOpen = ref(false);
const isBulkUploadOpen = ref(false);
const isZohoImportOpen = ref(false);
const isDragOver = ref(false);

const triggerImport = () => {
  fileInput.value?.click();
};

const handleFileDrop = (e: DragEvent) => {
  isDragOver.value = false;
  const file = e.dataTransfer?.files[0];
  if (file && file.name.endsWith('.csv')) {
    processImport(file);
  } else {
    toast.error('Invalid file type', {
      description: 'Please upload a CSV file.',
    });
  }
};

const handleImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  processImport(file);
};

const processImport = async (file: File) => {
  importing.value = true;
  try {
    const response = await invoiceStore.importZohoInvoices(file);
    toast.success('Import successful', {
      description: `Imported ${response.stats.invoices} invoices, ${response.stats.customers} customers, and ${response.stats.items} items.`,
    });
    isZohoImportOpen.value = false;
    isImportModalOpen.value = false;
    // Reset file input if needed
    if (fileInput.value) fileInput.value.value = '';
  } catch (err: any) {
    console.error('Import failed:', err);
    const backendError = err.response?.data;
    toast.error(backendError?.error || 'Import failed', {
      description: backendError?.description || 'An error occurred during import. Please check your CSV format.',
    });
  } finally {
    importing.value = false;
  }
};

const toggleMenu = (id: string, event: MouseEvent) => {
  event.stopPropagation();
  if (openMenuId.value === id) {
    openMenuId.value = null;
    return;
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const menuHeight = 130; // Height of invoice menu

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

const stats = computed(() => {
  const { totalOutstanding, overdue, paid } = invoiceStore.stats;

  return [
    {
      title: 'Total Outstanding',
      amount: formatCurrency(totalOutstanding),
      subText: 'across all clients',
      icon: Clock,
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-500/10 border border-amber-500/15',
      accentBar: 'bg-amber-500/50',
      containerClass: 'bg-amber-500/[0.02]',
    },
    {
      title: 'Overdue',
      amount: formatCurrency(overdue),
      subText: 'unpaid past due',
      icon: AlertCircle,
      color: 'text-rose-700 dark:text-rose-400',
      bg: 'bg-rose-500/10 border border-rose-500/15',
      accentBar: 'bg-rose-500/40',
      containerClass: 'bg-rose-500/[0.02]',
    },
    {
      title: 'Paid (Total)',
      amount: formatCurrency(paid),
      subText: 'collected revenue',
      icon: CheckCircle,
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border border-emerald-500/15',
      accentBar: 'bg-emerald-500/40',
      containerClass: 'bg-emerald-500/[0.02]',
    },
  ];
});

const redirectToAddCustomer = () => {
  isAddingInlineCustomer.value = true;
};

const handleInlineCustomerSuccess = (customer: any) => {
  newInvoice.value.customerId = customer.id;
  toast.success(`Customer ${customer.name} selected`);
};

const redirectToAddItem = () => {
  isAddingInlineItem.value = true;
};

const handleInlineItemSuccess = (item: any) => {
  addItemToInvoice(item);
  toast.success(`Item ${item.name} added and selected`);
};

onMounted(() => {
  fetchInvoicesData(1, true);
  customerStore.fetchCustomers();
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
      <Sidebar active-item="Invoices" />

    <main class="flex-1 overflow-y-auto bg-background flex flex-col">
      <ViewGuard module="invoices">
        <!-- Sticky Transitional Header -->
        <StickyPageHeader
          :title="$t('modules.invoices.title')"
          :subtitle="$t('modules.invoices.subtitle')"
          :icon="FileText"
        >
          <template #actions>
            <div v-if="canManage('invoices')" class="flex items-center gap-2.5">
              <Button
                @click="isImportModalOpen = true"
                variant="outline"
                size="sm"
                class="h-9 px-3.5 text-xs font-medium border-border shadow-2xs"
              >
                <Upload class="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                {{ $t('modules.invoices.import') }}
              </Button>
              <Button
                @click="checkInvoiceLimitAndCreate"
                size="sm"
                class="h-9 px-4 text-xs font-medium shadow-xs"
              >
                <Plus class="w-3.5 h-3.5 mr-1.5" />
                {{ $t('modules.invoices.new') }}
              </Button>
            </div>
          </template>
        </StickyPageHeader>

        <div class="px-8 pt-2 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">
          <!-- Stats -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <template v-if="isInitialLoading && displayedInvoices.length === 0">
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
                  placeholder="Search clients, invoices..."
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
                  entity-type="invoices"
                  :active-filters="currentFilters"
                  @apply-preset="handleApplyPreset"
                  @update-filter="handleUpdateFilter"
                  @reset-filters="handleResetFilters"
                />
              </div>
            </div>

            <!-- Revalidation Progress Bar -->
            <div
              v-if="fetchingInvoices && displayedInvoices.length > 0"
              class="h-0.5 w-full bg-primary/10 overflow-hidden relative"
            >
              <div class="absolute inset-y-0 w-1/3 bg-primary/70 rounded-full animate-indeterminate"></div>
            </div>

            <Table>
              <TableHeader class="bg-muted/35 border-b border-border/70">
                <TableRow class="hover:bg-transparent border-b border-border/70">
                  <TableHead class="py-3.5 px-4 w-[48px] text-center"></TableHead>
                  <TableHead class="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 w-[170px]">
                    Invoice #
                  </TableHead>
                  <TableHead class="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                    Client
                  </TableHead>
                  <TableHead class="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 w-[150px]">
                    Due Date
                  </TableHead>
                  <TableHead class="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-right w-[150px]">
                    Amount
                  </TableHead>
                  <TableHead class="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-center w-[160px]">
                    Status
                  </TableHead>
                  <TableHead class="py-3.5 px-6 text-right w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody class="divide-y divide-border/60">
                <template v-if="(isInitialLoading || fetchingInvoices) && displayedInvoices.length === 0">
                  <TableRow v-for="i in 5" :key="i" class="border-b border-border/60">
                    <TableCell class="py-4 px-4 text-center"><Skeleton class="h-4 w-4 mx-auto rounded" /></TableCell>
                    <TableCell class="py-4 px-6"><Skeleton class="h-4 w-20" /></TableCell>
                    <TableCell class="py-4 px-6"><Skeleton class="h-4 w-32" /></TableCell>
                    <TableCell class="py-4 px-6"><Skeleton class="h-4 w-24" /></TableCell>
                    <TableCell class="py-4 px-6 text-right"><Skeleton class="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell class="py-4 px-6 text-center"><Skeleton class="h-6 w-20 rounded-md mx-auto" /></TableCell>
                    <TableCell class="py-4 px-6 text-right"><Skeleton class="h-8 w-8 ml-auto rounded-lg" /></TableCell>
                  </TableRow>
                </template>
                <template v-else>
                  <TableRow
                    v-for="invoice in displayedInvoices"
                    :key="invoice.id"
                    :data-state="isSelected(invoice.id) ? 'selected' : undefined"
                    :class="[
                      'group cursor-pointer transition-colors duration-150 border-b border-border/60',
                      isSelected(invoice.id)
                        ? 'bg-primary/10 dark:bg-primary/15 hover:bg-primary/15 dark:hover:bg-primary/20'
                        : 'hover:bg-muted/50'
                    ]"
                  >
                    <TableCell class="py-4 px-4 text-center w-[48px] cursor-pointer" @click.stop="toggleSelect(invoice.id)">
                      <div
                        :class="[
                          'transition-opacity duration-150 flex items-center justify-center',
                          selectedCount > 0 || isSelected(invoice.id)
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        ]"
                      >
                        <Checkbox
                          :checked="isSelected(invoice.id)"
                          @update:checked="toggleSelect(invoice.id)"
                          :aria-label="`Select invoice ${invoice.invoiceNumber}`"
                        />
                      </div>
                    </TableCell>
                    <TableCell class="py-4 px-6">
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          @click.stop="toggleInvoiceBookmark(invoice)"
                          class="p-1 rounded-md transition-colors hover:bg-blue-500/10 shrink-0"
                          :title="bookmarkStore.isBookmarked('invoice', invoice.id) ? 'Remove Bookmark' : 'Bookmark Invoice'"
                        >
                          <BookmarkIcon
                            :class="[
                              'w-3.5 h-3.5 transition-all active:scale-125',
                              bookmarkStore.isBookmarked('invoice', invoice.id)
                                ? 'fill-blue-500 text-blue-500 opacity-100'
                                : 'opacity-0 group-hover:opacity-40 hover:!opacity-100 text-muted-foreground hover:text-blue-500'
                            ]"
                          />
                        </button>
                        <span class="font-mono text-xs font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {{ invoice.invoiceNumber }}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell class="py-4 px-6">
                      <span class="text-xs font-semibold text-foreground group-hover:text-foreground truncate max-w-[220px] block">
                        {{ getCustomerName(invoice) }}
                      </span>
                    </TableCell>
                    <TableCell class="py-4 px-6">
                      <span class="text-xs text-muted-foreground font-medium">
                        {{ invoice.dueDate }}
                      </span>
                    </TableCell>
                    <TableCell class="py-4 px-6 text-right">
                      <span class="font-mono text-xs font-bold text-foreground tracking-tight">
                        {{ formatCurrency(invoice.amount) }}
                      </span>
                    </TableCell>
                    <TableCell class="py-3.5 px-6 text-center">
                      <span
                        :class="[
                          'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap shadow-xs transition-colors',
                          getInvoiceStatusInfo(invoice.status, invoice.dueDate).colorClass
                        ]"
                      >
                        {{ getInvoiceStatusInfo(invoice.status, invoice.dueDate).label }}
                      </span>
                    </TableCell>
                    <TableCell class="py-4 px-6 text-right">
                      <Button
                        v-if="canManage('invoices')"
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 transition-colors opacity-70 group-hover:opacity-100"
                        @click="toggleMenu(invoice.id, $event)"
                      >
                        <MoreHorizontal class="w-4 h-4" />
                      </Button>
                      <div v-else class="flex justify-end pr-2 text-muted-foreground/30" title="View Only Access">
                        <Lock class="w-3.5 h-3.5" />
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableEmpty v-if="displayedInvoices.length === 0" :colspan="7" class="py-24">
                    <div class="flex flex-col items-center justify-center max-w-xs mx-auto space-y-4">
                      <div class="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-2xs">
                        <BookmarkIcon v-if="isBookmarkedOnly" class="w-7 h-7 text-blue-500 fill-blue-500/20" />
                        <FileText v-else class="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <div class="space-y-1">
                        <h3 class="text-base font-bold text-foreground">
                          {{ isBookmarkedOnly ? 'No bookmarked invoices' : 'No invoices found' }}
                        </h3>
                        <p class="text-xs text-muted-foreground font-medium">
                          {{
                            isBookmarkedOnly
                              ? (activeFilter !== 'All'
                                  ? `No bookmarked invoices with status "${activeFilter}".`
                                  : 'Bookmark invoices from the list to quickly find and access them here.')
                              : searchQuery
                              ? 'Try adjusting your search filters to find what you are looking for.'
                              : 'Get started by creating your first invoice for a customer.'
                          }}
                        </p>
                      </div>
                      <Button
                        v-if="!isBookmarkedOnly && !searchQuery && canManage('invoices')"
                        @click="checkInvoiceLimitAndCreate"
                        variant="outline"
                        size="sm"
                        class="h-9 px-4 rounded-xl font-bold uppercase tracking-wider text-[11px] border-border/70 hover:bg-muted/50"
                      >
                        Create Invoice
                      </Button>
                      <Button
                        v-else-if="isBookmarkedOnly"
                        @click="handleUpdateFilter('bookmarkedOnly', false)"
                        variant="ghost"
                        size="sm"
                        class="h-8 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10 cursor-pointer"
                      >
                        Show all {{ activeFilter !== 'All' ? activeFilter : '' }} invoices
                      </Button>
                    </div>
                  </TableEmpty>
                </template>
              </TableBody>
            </Table>

            <!-- Pagination -->
            <div
              v-if="displayedInvoices?.length > 0 && pagination?.totalPages > 1"
              class="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border/70 bg-card/30"
            >
              <div class="flex items-center gap-2">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Showing
                  <span class="font-mono text-foreground font-bold">{{ (pagination.page - 1) * pagination.limit + 1 }}</span>
                  to
                  <span class="font-mono text-foreground font-bold">{{ Math.min(pagination.page * pagination.limit, pagination.total) }}</span>
                  of
                  <span class="font-mono text-foreground font-bold">{{ pagination.total }}</span>
                  Invoices
                </p>
              </div>
              <div class="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  :disabled="pagination.page === 1"
                  @click="handlePageChange(pagination.page - 1)"
                  class="h-8 w-8 rounded-xl border-border/70 hover:bg-muted/50 shadow-2xs disabled:opacity-40"
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
                      'h-8 w-8 rounded-xl font-bold text-xs transition-all',
                      pagination.page === p
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
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
                  class="h-8 w-8 rounded-xl border-border/70 hover:bg-muted/50 shadow-2xs disabled:opacity-40"
                >
                  <ChevronRight class="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <!-- Floating Bulk Action Bar -->
          <BulkActionBar
            :count="selectedCount"
            label="invoices"
            :loading="isBulkOperating"
            :can-delete="canManage('invoices')"
            @clear="clearSelection"
            @delete="showBulkDeleteConfirm = true"
            @export="handleBulkExport"
          >
            <DropdownMenu v-if="canManage('invoices')">
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
            :title="`Update Status for ${selectedCount} Invoices`"
            :description="`You are about to change the status of ${selectedCount} selected invoices to '${pendingStatusUpdate}'. This will update their accounting records and payment tracking.`"
            :item-count="selectedCount"
            :item-names="selectedItems.map((i) => i.invoiceNumber)"
            :action-label="`Mark as ${pendingStatusUpdate}`"
            variant="default"
            :loading="isBulkUpdatingStatus"
            @confirm="confirmBulkStatus"
          />

          <!-- Bulk Delete Confirmation Dialog -->
          <BulkConfirmDialog
            v-model:open="showBulkDeleteConfirm"
            :title="selectedCount > 1 ? `Move ${selectedCount} Invoices to Trash` : 'Move Invoice to Trash'"
            :description="selectedCount > 1
              ? `Move ${selectedCount} invoices to the Trash Bin? You can restore them anytime within 30 days.`
              : `Move invoice ${selectedItems[0]?.invoiceNumber || ''} to Trash? You can restore it anytime within 30 days.`"
            :item-count="selectedCount"
            :item-names="selectedItems.map((i) => i.invoiceNumber)"
            action-label="Move to Trash"
            variant="destructive"
            :loading="isBulkDeleting"
            @confirm="handleBulkDeleteConfirm"
          />
        </div>
      </ViewGuard>
    </main>
    </div>

    <!-- Modal for Import Source Selection -->
    <Modal
      :open="isImportModalOpen"
      :title="t('modals.invoices.importTitle')"
      :description="t('modals.invoices.importSubtitle')"
      max-width-class="max-w-md"
      body-class="p-6 space-y-4"
      @close="isImportModalOpen = false"
    >
      <button type="button"
        @click="
          isBulkUploadOpen = true;
          isImportModalOpen = false;
        "
        class="w-full flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl hover:border-primary/50 hover:bg-muted/40 transition-all group"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet class="w-6 h-6 text-primary" />
          </div>
          <div class="text-left">
            <p class="text-sm font-bold">Accountiva CSV</p>
            <p class="text-[10px] text-muted-foreground">Upload standard CSV template with live validation & preview</p>
          </div>
        </div>
        <ArrowRight class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </button>

      <button type="button"
        @click="
          isZohoImportOpen = true;
          isImportModalOpen = false;
        "
        class="w-full flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl hover:border-primary/50 hover:bg-muted/40 transition-all group"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span class="text-xl font-black text-primary">Z</span>
          </div>
          <div class="text-left">
            <p class="text-sm font-bold">{{ t('modals.invoices.zohoBooks') }}</p>
            <p class="text-[10px] text-muted-foreground">{{ t('modals.invoices.zohoSubtitle') }}</p>
          </div>
        </div>
        <ExternalLink class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </button>

      <button type="button"
        class="w-full flex items-center justify-between p-4 bg-muted/5 border border-border/50 rounded-xl cursor-not-allowed opacity-60 group"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
            <span class="text-xl font-black text-info">Q</span>
          </div>
          <div class="text-left">
            <p class="text-sm font-bold">{{ t('modals.invoices.quickbooks') }}</p>
            <p class="text-[10px] text-muted-foreground font-medium italic">{{ t('modals.invoices.comingSoon') }}</p>
          </div>
        </div>
      </button>
    </Modal>

    <!-- Modal for Zoho Import -->
    <Modal
      :open="isZohoImportOpen"
      z-index-class="z-[60]"
      max-width-class="max-w-lg"
      body-class="p-8 space-y-6"
      @close="isZohoImportOpen = false"
    >
      <template #header>
        <div class="px-8 py-6 border-b border-border flex items-center justify-between bg-muted/10">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black"
            >
              Z
            </div>
            <div>
              <h2 class="text-xl font-bold text-foreground">{{ t('modals.invoices.importZohoTitle') }}</h2>
              <p class="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                {{ t('modals.invoices.importZohoSubtitle') }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" aria-label="Import help" class="group relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <HelpCircle class="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <div
                class="absolute right-0 top-full mt-2 w-64 p-4 bg-popover border border-border rounded-xl shadow-xl hidden group-hover:block z-50 animate-in fade-in zoom-in-95"
              >
                <p class="text-[11px] font-bold uppercase tracking-widest mb-2 text-primary">
                  {{ t('modals.invoices.zohoHowToTitle') }}
                </p>
                <ol class="text-[10px] text-muted-foreground space-y-2 list-decimal ml-3 font-medium">
                  <li>{{ t('modals.invoices.zohoHowToStep1') }}</li>
                  <li>{{ t('modals.invoices.zohoHowToStep2') }}</li>
                  <li>{{ t('modals.invoices.zohoHowToStep3') }}</li>
                  <li>{{ t('modals.invoices.zohoHowToStep4') }}</li>
                  <li>{{ t('modals.invoices.zohoHowToStep5') }}</li>
                </ol>
              </div>
            </button>
            <button type="button" aria-label="Close dialog" @click="isZohoImportOpen = false" class="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <X class="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </template>

      <div
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="handleFileDrop"
        :class="[
          'relative border-2 border-dashed rounded-3xl p-12 transition-all flex flex-col items-center justify-center text-center gap-4 cursor-pointer',
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border bg-muted/10 hover:bg-muted/20 hover:border-muted-foreground/30',
        ]"
        @click="triggerImport"
      >
        <input type="file" ref="fileInput" class="hidden" accept=".csv" @change="handleImport" />
        <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <UploadCloud
            :class="[
              'w-10 h-10 transition-transform duration-300',
              isDragOver ? 'scale-110 text-primary' : 'text-muted-foreground',
            ]"
          />
        </div>
        <div>
          <p class="text-sm font-bold text-foreground">{{ t('modals.invoices.zohoDragDrop') }}</p>
          <p class="text-[11px] text-muted-foreground mt-1 font-medium italic">
            {{ t('modals.invoices.zohoCsvSupported') }}
          </p>
        </div>

        <div
          v-if="importing"
          class="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center rounded-3xl"
        >
          <div class="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p class="text-[11px] font-bold uppercase tracking-[0.2em] animate-pulse">{{ t('modals.invoices.zohoProcessing') }}</p>
          </div>
        </div>
      </div>

      <div class="p-4 bg-info/5 rounded-2xl border border-info/10 flex gap-3">
        <Info class="w-4 h-4 text-info shrink-0 mt-0.5" />
        <p class="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Tip:</strong> {{ t('modals.invoices.zohoTip') }}
        </p>
      </div>

      <template #footer>
        <Button
          @click="isZohoImportOpen = false"
          variant="ghost"
          class="h-10 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]"
        >
          {{ t('common.cancel') }}
        </Button>
        <Button
          @click="triggerImport"
          :disabled="importing"
          class="h-10 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px]"
        >
          {{ t('modals.invoices.selectFile') }}
        </Button>
      </template>
    </Modal>

    <!-- Teleported Context Menu -->
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
          @click="handleViewPreviewClick"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors"
        >
          <Eye class="w-3.5 h-3.5" />
          View Preview
        </button>
        <button type="button"
          @click="handleMenuBookmarkClick"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors"
        >
          <BookmarkIcon
            :class="[
              'w-3.5 h-3.5',
              activeMenuInvoice && bookmarkStore.isBookmarked('invoice', activeMenuInvoice.id)
                ? 'fill-blue-500 text-blue-500'
                : 'text-muted-foreground'
            ]"
          />
          {{ activeMenuInvoice && bookmarkStore.isBookmarked('invoice', activeMenuInvoice.id) ? 'Remove Bookmark' : 'Bookmark Invoice' }}
        </button>
        <button type="button"
          @click="handleEditClick"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors"
        >
          <ExternalLink class="w-3.5 h-3.5" />
          Edit Invoice
        </button>
        <button type="button"
          v-if="activeMenuInvoice?.status === 'Draft'"
          @click="handleStatusUpdateClick('Outstanding')"
          :disabled="!!statusLoadingAction"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-info hover:bg-info/10 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Spinner v-if="statusLoadingAction === `${activeMenuInvoice?.id}-Outstanding`" class="w-3.5 h-3.5" />
          <ExternalLink v-else class="w-3.5 h-3.5" />
          {{ statusLoadingAction === `${activeMenuInvoice?.id}-Outstanding` ? 'Processing...' : 'Finalize Invoice' }}
        </button>
        <button type="button"
          v-if="activeMenuInvoice?.status !== 'Paid'"
          @click="handleStatusUpdateClick('Paid')"
          :disabled="!!statusLoadingAction"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-success hover:bg-success/10 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Spinner v-if="statusLoadingAction === `${activeMenuInvoice?.id}-Paid`" class="w-3.5 h-3.5" />
          <CheckCircle v-else class="w-3.5 h-3.5" />
          {{ statusLoadingAction === `${activeMenuInvoice?.id}-Paid` ? 'Processing...' : 'Mark as Paid' }}
        </button>
        <button type="button"
          @click="handleSendEmailClick"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2 border-t border-border/50"
        >
          <Mail class="w-3.5 h-3.5" />
          Send Email
        </button>
        <button type="button"
          @click="handleDeleteClick"
          class="w-full px-4 py-2.5 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 flex items-center gap-2 border-t border-border/50 transition-colors"
        >
          <Trash2 class="w-3.5 h-3.5" />
          Delete Invoice
        </button>
      </div>
    </Teleport>

    <!-- Modal for Adding Invoice -->
    <Modal
      :open="isAddingInvoice"
      :title="isEditing ? t('modals.invoices.editTitle') : t('modals.invoices.newTitle')"
      :description="t('modals.invoices.subtitle')"
      max-width-class="max-w-xl"
      body-class="p-6 space-y-5 max-h-[70vh] overflow-y-auto"
      @close="isAddingInvoice = false; resetInvoiceForm(); clearErrors()"
    >
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="invoiceNumber" class="text-sm font-medium">
              {{ t('modals.invoices.fields.number') }} <span class="text-destructive">*</span>
            </Label>
            <div v-if="!isEditing" class="flex items-center gap-1.5 select-none">
              <Checkbox
                id="autoGenerateNumber"
                :checked="autoGenerateNumber"
                @update:checked="(val: boolean) => autoGenerateNumber = val"
              />
              <Label for="autoGenerateNumber" class="text-xs text-muted-foreground cursor-pointer select-none font-normal">
                {{ t('modals.invoices.fields.autoGenerate') }}
              </Label>
            </div>
          </div>
          <Input
            id="invoiceNumber"
            v-model="newInvoice.invoiceNumber"
            :disabled="autoGenerateNumber && !isEditing"
            :placeholder="autoGenerateNumber && !isEditing ? 'Auto-generated' : 'INV-001'"
            class="font-mono"
            :error="errors.invoiceNumber"
          />
          <p v-if="errors.invoiceNumber" class="text-xs text-destructive">
            {{ errors.invoiceNumber }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="invoiceAmount" class="text-sm font-medium">
            {{ t('modals.invoices.fields.amount') }} <span class="text-destructive">*</span>
          </Label>
          <div class="relative flex items-center">
            <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-medium text-muted-foreground">{{ currencySymbol }}</span>
            <Input
              id="invoiceAmount"
              type="number"
              v-model="newInvoice.amount"
              placeholder="0.00"
              class="pl-7 font-mono"
              :disabled="newInvoice.items && newInvoice.items.length > 0"
              :error="errors.amount"
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
            {{ t('modals.invoices.fields.customer') }} <span class="text-destructive">*</span>
          </Label>
          <button type="button"
            @click="redirectToAddCustomer"
            class="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
          >
            <Plus class="w-3 h-3" /> {{ t('topbar.new') }}
          </button>
        </div>
        <Select
          v-model="newInvoice.customerId"
          :options="customerStore.customers"
          :placeholder="t('modals.invoices.fields.selectCustomer')"
          :error="errors.customerId"
        />
        <p v-if="errors.customerId" class="text-xs text-destructive">
          {{ errors.customerId }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label class="text-sm font-medium">{{ t('modals.invoices.fields.date') }}</Label>
          <DatePicker v-model="newInvoice.date" :error="errors.date" />
          <p v-if="errors.date" class="text-xs text-destructive">
            {{ errors.date }}
          </p>
        </div>
        <div class="space-y-2">
          <Label class="text-sm font-medium">{{ t('modals.invoices.fields.dueDate') }}</Label>
          <DatePicker v-model="newInvoice.dueDate" :error="errors.dueDate" />
          <p v-if="errors.dueDate" class="text-xs text-destructive">
            {{ errors.dueDate }}
          </p>
        </div>
      </div>

      <!-- Selected Items List -->
      <div v-if="newInvoice.items && newInvoice.items.length > 0" class="space-y-2 pt-2">
        <Label class="text-sm font-medium">{{ t('modals.invoices.fields.selectedItems') }}</Label>
        <div class="border rounded-lg overflow-hidden divide-y bg-card">
          <div
            v-for="(item, idx) in newInvoice.items"
            :key="item.itemId"
            class="p-3 flex items-center justify-between gap-4 text-xs"
          >
            <div class="flex-1 min-w-0 space-y-1.5">
              <p class="font-medium truncate text-foreground text-sm">{{ item.itemName }}</p>
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-muted-foreground">{{ t('modals.invoices.fields.rate') }} {{ currencySymbol }}</span>
                <Input
                  type="number"
                  v-model.number="item.rate"
                  @input="updateInvoiceItemRate(idx, item.rate)"
                  min="0"
                  step="any"
                  class="w-24 h-7 text-xs font-mono"
                />
                <span class="text-xs text-muted-foreground ml-1">{{ t('modals.invoices.fields.each') }}</span>
              </div>
              <div>
                <Input
                  type="text"
                  v-model="item.description"
                  :placeholder="t('modals.invoices.fields.itemPlaceholder')"
                  class="h-7 text-xs"
                />
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center border border-input rounded-md bg-transparent overflow-hidden h-8">
                <button
                  type="button"
                  @click="updateInvoiceItemQuantity(idx, item.quantity - 1)"
                  class="px-2.5 py-1 text-muted-foreground hover:bg-muted text-xs font-medium"
                >
                  -
                </button>
                <input
                  type="number"
                  v-model.number="item.quantity"
                  @input="updateInvoiceItemQuantity(idx, item.quantity)"
                  min="0"
                  step="any"
                  class="w-12 text-center h-full bg-transparent border-none focus:outline-none focus:ring-0 text-xs font-mono font-medium text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-x border-input"
                />
                <button
                  type="button"
                  @click="updateInvoiceItemQuantity(idx, item.quantity + 1)"
                  class="px-2.5 py-1 text-muted-foreground hover:bg-muted text-xs font-medium"
                >
                  +
                </button>
              </div>
              <div class="w-20 text-right font-mono font-medium text-sm text-foreground">
                {{ formatCurrency(item.amount) }}
              </div>
              <button type="button"
                @click="removeItemFromInvoice(idx)"
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
          <Label class="text-sm font-medium">{{ t('modals.invoices.fields.catalogSelector') }}</Label>
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
            class="group p-3 bg-card rounded-lg border border-border/80 flex items-center justify-between hover:bg-accent/40 hover:border-border transition-all cursor-pointer shadow-xs"
            @click="addItemToInvoice(item)"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-accent transition-colors shrink-0">
                <Package class="w-4 h-4" />
              </div>
              <div>
                <p class="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{{ item.name }}</p>
                <p class="text-xs text-muted-foreground font-mono">
                  {{ formatCurrency(item.unitPrice) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary font-medium">
              <Plus class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">Add</span>
            </div>
          </div>
          <p v-if="itemStore.items.length > 3" class="text-xs text-center text-muted-foreground italic">
            {{ t('modals.invoices.fields.moreInCatalog', { count: itemStore.items.length - 3 }) }}
          </p>
        </div>
        <div v-else class="text-center py-6 border-2 border-dashed rounded-lg">
          <Package class="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p class="text-xs font-medium text-muted-foreground">{{ t('modals.invoices.fields.noItems') }}</p>
          <button type="button" @click="redirectToAddItem" class="text-xs font-medium text-primary mt-1 hover:underline">
            {{ t('modals.invoices.fields.createFirstItem') }}
          </button>
        </div>
      </div>

      <!-- Advanced/Collapsible Section -->
      <div class="border border-border/80 rounded-lg overflow-hidden bg-card shadow-xs">
        <button
          type="button"
          @click="showAdvanced = !showAdvanced"
          class="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-xs font-medium text-foreground"
        >
          <span>{{ t('modals.invoices.fields.additionalInfo') }}</span>
          <ChevronDown :class="['w-4 h-4 transition-transform duration-200 text-muted-foreground', showAdvanced ? 'rotate-180' : '']" />
        </button>
        <div v-show="showAdvanced" class="p-4 space-y-4 border-t border-border/80 bg-background/50 animate-in fade-in duration-200">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.invoices.fields.referenceNumber') }}</Label>
              <Input v-model="newInvoice.referenceNumber" placeholder="PO-1234" />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.invoices.fields.terms') }}</Label>
              <Input v-model="newInvoice.terms" placeholder="Net 30" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.invoices.fields.billingAddress') }}</Label>
              <Textarea
                v-model="newInvoice.billingAddress"
                placeholder="Street, City, State, ZIP"
                class="min-h-[60px]"
              />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.invoices.fields.shippingAddress') }}</Label>
              <Textarea
                v-model="newInvoice.shippingAddress"
                placeholder="Street, City, State, ZIP"
                class="min-h-[60px]"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.invoices.fields.notes') }}</Label>
              <Textarea
                v-model="newInvoice.notes"
                :placeholder="t('modals.invoices.fields.notesPlaceholder')"
                class="min-h-[60px]"
              />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.invoices.fields.termsConditions') }}</Label>
              <Textarea
                v-model="newInvoice.termsConditions"
                placeholder="Legal/payment terms"
                class="min-h-[60px]"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Taxes, Discounts & Charges Section -->
      <div class="border border-border/80 rounded-lg overflow-hidden bg-card shadow-xs">
        <button
          type="button"
          @click="showTaxesDiscounts = !showTaxesDiscounts"
          class="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-xs font-medium text-foreground"
        >
          <span>{{ t('modals.invoices.fields.discountsTaxes') }}</span>
          <ChevronDown :class="['w-4 h-4 transition-transform duration-200 text-muted-foreground', showTaxesDiscounts ? 'rotate-180' : '']" />
        </button>
        <div v-show="showTaxesDiscounts" class="p-4 space-y-4 border-t border-border/80 bg-background/50 animate-in fade-in duration-200">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.invoices.fields.discountType') }}</Label>
              <Select
                v-model="newInvoice.discountType"
                :options="discountTypeOptions"
                :placeholder="t('modals.invoices.fields.noDiscount')"
              />
            </div>
            <div class="space-y-2" v-if="newInvoice.discountType">
              <Label class="text-xs font-medium">{{ t('modals.invoices.fields.discountValue') }}</Label>
              <Input type="number" v-model.number="newInvoice.discountValue" placeholder="0" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.invoices.fields.taxPercent') }}</Label>
              <Input type="number" v-model.number="newInvoice.taxPercent" placeholder="0" />
            </div>
            <div class="space-y-2">
              <Label class="text-xs font-medium">{{ t('modals.invoices.fields.shippingCharges') }}</Label>
              <Input type="number" v-model.number="newInvoice.shippingCharges" placeholder="0" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium">Packaging Charges</Label>
              <Input type="number" v-model.number="newInvoice.packagingCharges" placeholder="0" />
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
                v-model.number="newInvoice.adjustment"
                :disabled="autoRoundOff"
                placeholder="0.00"
              />
            </div>
          </div>
          <div class="flex flex-col items-end pt-2 pr-1 space-y-1 text-right text-xs">
            <p v-if="newInvoice.discountAmount > 0" class="text-emerald-600 font-medium">
              {{ t('modals.invoices.fields.calculatedDiscount') }} <span class="font-mono font-semibold">-{{ currencySymbol }}{{ Number(newInvoice.discountAmount || 0).toFixed(2) }}</span>
            </p>
            <p class="text-muted-foreground">
              {{ t('modals.invoices.fields.calculatedTax') }} <span class="font-mono text-foreground font-semibold">{{ currencySymbol }}{{ Number(newInvoice.taxAmount || 0).toFixed(2) }}</span>
            </p>
            <p v-if="Number(newInvoice.shippingCharges) > 0" class="text-muted-foreground">
              Shipping: <span class="font-mono text-foreground font-semibold">+{{ currencySymbol }}{{ Number(newInvoice.shippingCharges || 0).toFixed(2) }}</span>
            </p>
            <p v-if="Number(newInvoice.packagingCharges) > 0" class="text-muted-foreground">
              Packaging: <span class="font-mono text-foreground font-semibold">+{{ currencySymbol }}{{ Number(newInvoice.packagingCharges || 0).toFixed(2) }}</span>
            </p>
            <p v-if="Number(newInvoice.adjustment) !== 0" class="text-muted-foreground">
              Round Off: <span class="font-mono text-foreground font-semibold">{{ Number(newInvoice.adjustment) > 0 ? '+' : '' }}{{ currencySymbol }}{{ Number(newInvoice.adjustment || 0).toFixed(2) }}</span>
            </p>
            <div class="h-px w-36 bg-border my-1"></div>
            <p class="text-sm font-bold text-foreground">
              Total Amount: <span class="font-mono">{{ currencySymbol }}{{ Number(newInvoice.amount || 0).toFixed(2) }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Custom Fields Section -->
      <CustomFieldRenderer
        entity="invoice"
        v-model="newInvoice.customFields"
      />

      <div class="space-y-2">
        <Label class="text-sm font-medium">{{ t('modals.invoices.fields.status') }}</Label>
        <div class="flex p-1 bg-muted rounded-lg text-xs font-medium">
          <button type="button"
            v-for="s in ['Draft', 'Outstanding', 'Paid']"
            :key="s"
            @click="newInvoice.status = s as any"
            :class="[
              'flex-1 py-1.5 rounded-md transition-all text-center',
              newInvoice.status === s
                 ? 'bg-background text-foreground shadow-xs font-semibold'
                 : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            {{ s === 'Outstanding' ? 'Finalize' : s }}
          </button>
        </div>
      </div>

      <template #footer>
        <Button
          @click="isAddingInvoice = false; resetInvoiceForm(); clearErrors();"
          variant="outline"
        >
          {{ t('common.cancel') }}
        </Button>
        <Button
          @click="handleAddInvoice(newInvoice.status)"
          :disabled="isSaving || fetchingDetails"
          class="gap-2"
        >
          <Spinner v-if="isSaving || fetchingDetails" size="sm" class="text-primary-foreground" />
          {{ isSaving ? t('common.saving') : fetchingDetails ? 'Loading details...' : (isEditing ? t('modals.invoices.save') : t('modals.invoices.create')) }}
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

    <InvoicePreviewModal
      v-if="selectedDetail"
      :open="isPreviewOpen"
      :invoice="selectedDetail"
      @close="isPreviewOpen = false"
    />

    <SendInvoiceModal
      v-if="selectedInvoiceForEmail"
      :open="isSendingEmail"
      :invoice="selectedInvoiceForEmail"
      @close="isSendingEmail = false; selectedInvoiceForEmail = null"
    />

    <UpgradePlanModal
      v-model:open="isUpgradeModalOpen"
      feature="invoice"
    />

    <BulkUploadModal
      v-model:open="isBulkUploadOpen"
      entity="invoices"
      @success="fetchInvoicesData(pagination.page, true)"
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

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Sidebar from '@/components/Sidebar.vue';
import TopBar from '@/components/TopBar.vue';
import { useCreditNoteStore, type CreditNote } from '@/stores/creditNoteStore';
import { useCustomerStore } from '@/stores/customerStore';
import { useItemStore } from '@/stores/itemStore';
import { useInvoiceStore } from '@/stores/invoiceStore';
import { useTheme } from '@/composables/useTheme';
import { formatCurrency, formatDate } from '@/utils/formatters';
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
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Link,
  Percent,
  Check,
  AlertCircle,
  AlertTriangle,
  CreditCard,
} from 'lucide-vue-next';
import { useTrashStore } from '@/stores/trashStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import DatePicker from '@/components/ui/DatePicker.vue';
import Select from '@/components/ui/Select.vue';
import Modal from '@/components/Modal.vue';
import CustomFieldRenderer from '@/components/ui/CustomFieldRenderer.vue';
import StickyPageHeader from '@/components/ui/StickyPageHeader.vue';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'vue-sonner';
import { storeToRefs } from 'pinia';
import ViewGuard from '@/components/ViewGuard.vue';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/stores/authStore';
import { useFormValidation } from '@/composables/useFormValidation';
import { creditNoteSchema } from '@/utils/validationSchemas';
import { useCurrency } from '@/composables/useCurrency';

const creditNoteStore = useCreditNoteStore();
const customerStore = useCustomerStore();
const itemStore = useItemStore();
const invoiceStore = useInvoiceStore();
const authStore = useAuthStore();
const { theme } = useTheme();
const router = useRouter();
const { canManage } = usePermissions();
const { t } = useI18n();
const { currencySymbol } = useCurrency();

const discountTypeOptions = computed(() => [
  { id: '', name: 'No Discount' },
  { id: 'Percentage', name: 'Percentage (%)' },
  { id: 'Flat', name: `Flat (${currencySymbol.value})` }
]);

const { creditNotes, pagination, loading: fetchingCreditNotes } = storeToRefs(creditNoteStore);
const loading = ref(false);
const isSaving = ref(false);
const fetchingDetails = ref(false);
const isAddingCreditNote = ref(false);
const isEditing = ref(false);
const editCnId = ref<string | null>(null);

const searchQuery = ref('');
const activeFilter = ref('All');
const openMenuId = ref<string | null>(null);
const menuPosition = ref({ top: 0, left: 0 });
const filters = ['All', 'Draft', 'Open', 'Closed', 'Void'];

const getFilterActiveClass = (f: string) => {
  switch (f) {
    case 'Closed':
      return 'bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white font-semibold shadow-xs border border-transparent';
    case 'Open':
      return 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white font-semibold shadow-xs border border-transparent';
    case 'Void':
      return 'bg-destructive text-destructive-foreground font-semibold shadow-xs border border-transparent';
    case 'Draft':
      return 'bg-secondary text-secondary-foreground font-semibold shadow-xs border border-border/60';
    default:
      return 'bg-background text-foreground font-semibold shadow-xs border border-border/40';
  }
};

const activeMenuCreditNote = computed(() => creditNotes.value.find(c => c.id === openMenuId.value));

// Reference invoices for selected customer
const customerInvoices = ref<any[]>([]);

// Selection for applying credits
const isApplyModalOpen = ref(false);
const selectedCnForApply = ref<CreditNote | null>(null);
const selectedInvoiceId = ref('');
const amountToApply = ref(0);
const applyingCredits = ref(false);

const selectedDetail = ref<CreditNote | null>(null);
const isPreviewOpen = ref(false);

const newCreditNote = ref<Omit<CreditNote, 'id' | 'remainingAmount'>>({
  creditNoteNumber: '',
  date: new Date().toISOString().split('T')[0],
  customerId: '',
  amount: 0,
  status: 'Draft',
  items: [],
  referenceNumber: '',
  referenceInvoiceId: '',
  billingAddress: '',
  shippingAddress: '',
  notes: '',
  termsConditions: '',
  taxPercent: 0,
  taxAmount: 0,
  subtotal: 0,
  discountType: '',
  discountValue: 0,
  discountAmount: 0,
  adjustment: 0,
  customFields: {},
});

const { errors, validate, clearErrors } = useFormValidation(creditNoteSchema, newCreditNote);

// Load Customer Data on selection
watch(() => newCreditNote.value.customerId, async (newCustId) => {
  if (!newCustId) {
    newCreditNote.value.billingAddress = '';
    newCreditNote.value.shippingAddress = '';
    customerInvoices.value = [];
    return;
  }

  const customer = customerStore.customers.find(c => c.id === newCustId);
  if (customer) {
    newCreditNote.value.billingAddress = customer.billingAddress || customer.address || '';
    newCreditNote.value.shippingAddress = customer.shippingAddress || customer.address || '';
  }

  // Load customer outstanding invoices
  try {
    const response = await apiGetCustomerOutstandingInvoices(newCustId);
    customerInvoices.value = response;
  } catch (err) {
    console.error('Failed to load customer outstanding invoices', err);
  }
});

// Inline helper for fetching customer invoices
const apiGetCustomerOutstandingInvoices = async (customerId: string) => {
  try {
    const response = await invoiceStore.fetchInvoices(1, 100, '', 'Outstanding', true);
    // Since we retrieved all outstanding invoices, filter them by customer
    return (invoiceStore.invoices || []).filter(inv => inv.customerId === customerId);
  } catch (err) {
    return [];
  }
};

const getCustomerName = (cn: CreditNote) => {
  if (cn.customers?.name) return cn.customers.name;
  return customerStore.customers.find((c) => c.id === cn.customerId)?.name || 'Unknown Client';
};

const handlePageChange = (newPage: number) => {
  if (newPage < 1 || newPage > pagination.value.totalPages) return;
  creditNoteStore.fetchCreditNotes(newPage, pagination.value.limit, searchQuery.value, activeFilter.value);
};

// Search & Filter
watch([searchQuery, activeFilter], ([newQuery, newStatus]) => {
  creditNoteStore.fetchCreditNotes(1, pagination.value.limit, newQuery, newStatus);
});

// Calculations
const calculateLineItemTotal = (item: any) => {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  return Number((qty * rate).toFixed(2));
};

const recalculateTotals = () => {
  const subtotal = newCreditNote.value.items?.reduce((sum, item) => {
    item.amount = calculateLineItemTotal(item);
    return sum + item.amount;
  }, 0) || 0;

  newCreditNote.value.subtotal = Number(subtotal.toFixed(2));

  let discountAmount = 0;
  const val = Number(newCreditNote.value.discountValue) || 0;
  if (newCreditNote.value.discountType === 'Percentage') {
    discountAmount = Number(((subtotal * val) / 100).toFixed(2));
  } else if (newCreditNote.value.discountType === 'Flat') {
    discountAmount = val;
  }
  newCreditNote.value.discountAmount = Number(discountAmount.toFixed(2));

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = Number(newCreditNote.value.taxPercent) || 0;
  const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
  newCreditNote.value.taxAmount = taxAmount;

  const adj = Number(newCreditNote.value.adjustment) || 0;
  const grandTotal = Number((taxableAmount + taxAmount + adj).toFixed(2));
  newCreditNote.value.amount = Math.max(0, grandTotal);
};

// Items manipulation
const addLineItem = () => {
  if (!newCreditNote.value.items) newCreditNote.value.items = [];
  newCreditNote.value.items.push({
    itemId: '',
    quantity: 1,
    rate: 0,
    amount: 0,
    description: '',
  });
  recalculateTotals();
};

const removeLineItem = (index: number) => {
  newCreditNote.value.items?.splice(index, 1);
  recalculateTotals();
};

const handleItemSelect = (index: number, itemId: string) => {
  const matchedItem = itemStore.items.find(i => i.id === itemId);
  if (matchedItem && newCreditNote.value.items) {
    newCreditNote.value.items[index].itemName = matchedItem.name;
    newCreditNote.value.items[index].rate = Number(matchedItem.unitPrice || 0);
    newCreditNote.value.items[index].description = matchedItem.description || '';
    recalculateTotals();
  }
};

// CRUD Actions
const handleCreateClick = async () => {
  clearErrors();
  isEditing.value = false;
  editCnId.value = null;

  const nextNum = await creditNoteStore.fetchNextNumber();
  newCreditNote.value = {
    creditNoteNumber: nextNum,
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    amount: 0,
    status: 'Draft',
    items: [{ itemId: '', quantity: 1, rate: 0, amount: 0, description: '' }],
    referenceNumber: '',
    referenceInvoiceId: '',
    billingAddress: '',
    shippingAddress: '',
    notes: '',
    termsConditions: '',
    taxPercent: 0,
    taxAmount: 0,
    subtotal: 0,
    discountType: '',
    discountValue: 0,
    discountAmount: 0,
    adjustment: 0,
    customFields: {},
  };

  isAddingCreditNote.value = true;
};

const closeCreditNoteEditor = () => {
  isAddingCreditNote.value = false;
  isEditing.value = false;
  editCnId.value = null;
  clearErrors();
};

const handleSave = async (status: 'Draft' | 'Open') => {
  newCreditNote.value.status = status;
  recalculateTotals();

  const isValid = validate();
  if (!isValid) {
    toast.error('Please correct the validation errors before saving.');
    return;
  }

  isSaving.value = true;
  try {
    if (isEditing.value && editCnId.value) {
      await creditNoteStore.updateCreditNote(editCnId.value, newCreditNote.value);
      toast.success('Credit Note updated successfully.');
    } else {
      await creditNoteStore.addCreditNote(newCreditNote.value);
      toast.success('Credit Note created successfully.');
    }
    closeCreditNoteEditor();
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to save credit note.');
  } finally {
    isSaving.value = false;
  }
};

const handleEditClick = async (cn: CreditNote) => {
  clearErrors();
  openMenuId.value = null;

  // Pre-populate with summary values immediately
  newCreditNote.value = {
    creditNoteNumber: cn.creditNoteNumber,
    date: cn.date,
    customerId: cn.customerId,
    amount: cn.amount,
    status: cn.status,
    items: cn.items || [],
    referenceNumber: cn.referenceNumber || '',
    referenceInvoiceId: cn.referenceInvoiceId || '',
    billingAddress: cn.billingAddress || '',
    shippingAddress: cn.shippingAddress || '',
    notes: cn.notes || '',
    termsConditions: cn.termsConditions || '',
    taxPercent: cn.taxPercent || 0,
    taxAmount: cn.taxAmount || 0,
    subtotal: cn.subtotal || 0,
    discountType: cn.discountType || '',
    discountValue: cn.discountValue || 0,
    discountAmount: cn.discountAmount || 0,
    adjustment: cn.adjustment || 0,
    customFields: cn.customFields || {},
  };
  editCnId.value = cn.id;
  isEditing.value = true;
  isAddingCreditNote.value = true;

  fetchingDetails.value = true;
  try {
    const details = await creditNoteStore.fetchCreditNoteById(cn.id, true);
    newCreditNote.value = {
      creditNoteNumber: details.creditNoteNumber,
      date: details.date,
      customerId: details.customerId,
      amount: details.amount,
      status: details.status,
      items: details.items || [],
      referenceNumber: details.referenceNumber || '',
      referenceInvoiceId: details.referenceInvoiceId || '',
      billingAddress: details.billingAddress || '',
      shippingAddress: details.shippingAddress || '',
      notes: details.notes || '',
      termsConditions: details.termsConditions || '',
      taxPercent: details.taxPercent || 0,
      taxAmount: details.taxAmount || 0,
      subtotal: details.subtotal || 0,
      discountType: details.discountType || '',
      discountValue: details.discountValue || 0,
      discountAmount: details.discountAmount || 0,
      adjustment: details.adjustment || 0,
      customFields: details.customFields || cn.customFields || {},
    };
  } catch (err: any) {
    toast.error('Failed to load credit note details.');
  } finally {
    fetchingDetails.value = false;
  }
};

const trashStore = useTrashStore();

const showDeleteConfirmModal = ref(false);
const creditNoteToDelete = ref<CreditNote | null>(null);
const isDeletingCn = ref(false);

const isCnApplied = (cn: CreditNote | null) => {
  if (!cn) return false;
  if (cn.status === 'Closed' || cn.status === 'Partially Applied') return true;
  if (cn.applications && cn.applications.length > 0) return true;
  if (Number(cn.remainingAmount) < Number(cn.amount)) return true;
  return false;
};

const deleteConfirmTitle = computed(() => 'Move Credit Note to Trash?');

const deleteConfirmDescription = computed(() => {
  const cn = creditNoteToDelete.value;
  if (!cn) return '';
  if (isCnApplied(cn)) {
    return 'This credit note is currently applied to Invoice(s). Moving it to trash will release the credits and increase the open balance on the related invoice(s). Proceed?';
  }
  return `Credit Note ${cn.creditNoteNumber} will be moved to Recently Deleted for 30 days before permanent removal. You can restore it at any time during this period.`;
});

const handleDeleteClick = (cn: CreditNote) => {
  openMenuId.value = null;
  creditNoteToDelete.value = cn;
  showDeleteConfirmModal.value = true;
};

const confirmDeleteCn = async () => {
  if (!creditNoteToDelete.value) return;
  isDeletingCn.value = true;
  try {
    const cnNumber = creditNoteToDelete.value.creditNoteNumber;
    await creditNoteStore.deleteCreditNote(creditNoteToDelete.value.id);
    trashStore.markStale();
    showDeleteConfirmModal.value = false;
    if (selectedDetail.value?.id === creditNoteToDelete.value.id) {
      isPreviewOpen.value = false;
    }
    creditNoteToDelete.value = null;
    toast.success(`Credit Note ${cnNumber} moved to Trash successfully.`);
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to move Credit Note to Trash.');
  } finally {
    isDeletingCn.value = false;
  }
};

const handleVoidClick = async (cn: CreditNote) => {
  openMenuId.value = null;
  if (!confirm(`Are you sure you want to void Credit Note ${cn.creditNoteNumber}?`)) return;

  try {
    await creditNoteStore.updateCreditNoteStatus(cn.id, 'Void');
    toast.success('Credit Note voided successfully.');
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to void Credit Note.');
  }
};

// Preview Panel
const handleViewPreview = async (cn: CreditNote) => {
  openMenuId.value = null;
  selectedDetail.value = cn;
  isPreviewOpen.value = true;

  try {
    const details = await creditNoteStore.fetchCreditNoteById(cn.id, true);
    selectedDetail.value = details;
  } catch (err) {
    console.error('Failed to refresh credit note preview details', err);
  }
};

// Apply Credit Logic
const handleOpenApplyModal = (cn: CreditNote) => {
  openMenuId.value = null;
  selectedCnForApply.value = cn;
  selectedInvoiceId.value = '';
  amountToApply.value = Number(cn.remainingAmount);
  isApplyModalOpen.value = true;

  // Reload outstanding invoices for this customer
  apiGetCustomerOutstandingInvoices(cn.customerId).then(res => {
    customerInvoices.value = res;
  });
};

const getInvoiceOutstanding = (inv: any) => {
  const totalApplied = inv.credit_note_applications?.reduce((s: number, app: any) => s + Number(app.amount_applied), 0) || 0;
  return Number(inv.amount) - totalApplied;
};

// Set default max available applied value
watch(selectedInvoiceId, (invId) => {
  if (!invId || !selectedCnForApply.value) return;
  const targetInv = customerInvoices.value.find(i => i.id === invId);
  if (targetInv) {
    const outstanding = getInvoiceOutstanding(targetInv);
    amountToApply.value = Math.min(Number(selectedCnForApply.value.remainingAmount), outstanding);
  }
});

const executeApplyCredit = async () => {
  if (!selectedCnForApply.value || !selectedInvoiceId.value) return;

  const val = Number(amountToApply.value);
  if (isNaN(val) || val <= 0) {
    toast.error('Please enter a valid positive amount.');
    return;
  }

  applyingCredits.value = true;
  try {
    await creditNoteStore.applyCreditNote(selectedCnForApply.value.id, selectedInvoiceId.value, val);
    toast.success('Credit applied successfully.');
    isApplyModalOpen.value = false;

    // Refresh preview details if open
    if (isPreviewOpen.value && selectedDetail.value?.id === selectedCnForApply.value.id) {
      selectedDetail.value = await creditNoteStore.fetchCreditNoteById(selectedCnForApply.value.id, true);
    }
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to apply credit note.');
  } finally {
    applyingCredits.value = false;
  }
};

// Context Menu triggers
const handleActionsTrigger = (event: MouseEvent, cn: CreditNote) => {
  event.stopPropagation();
  openMenuId.value = cn.id;
  menuPosition.value = {
    top: Math.min(event.clientY, window.innerHeight - 220),
    left: Math.max(12, Math.min(event.clientX - 180, window.innerWidth - 204))
  };
};

// Click outside helper to close context menu
const closeContextMenu = () => {
  openMenuId.value = null;
};

onMounted(async () => {
  window.addEventListener('click', closeContextMenu);
  creditNoteStore.fetchCreditNotes(1, 10);
  customerStore.fetchCustomers();
  itemStore.fetchItems();
});

onUnmounted(() => {
  window.removeEventListener('click', closeContextMenu);
});
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Credit Notes" />

      <main class="flex-1 overflow-y-auto bg-background flex flex-col">
        <ViewGuard module="invoices">

        <!-- Credit Note Creation / Editing Modal -->
        <Modal
          :open="isAddingCreditNote"
          :title="isEditing ? 'Edit Credit Note' : 'New Credit Note'"
          description="Create a customer credit with the same details and calculations used across sales documents."
          max-width-class="max-w-5xl"
          body-class="p-6 max-h-[78vh] overflow-y-auto custom-scrollbar"
          @close="closeCreditNoteEditor"
        >
            <form @submit.prevent class="space-y-6">
              <!-- Header Form Fields -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1.5">Customer *</label>
                  <Select
                    v-model="newCreditNote.customerId"
                    :options="customerStore.customers.map(c => ({ id: c.id, name: c.name }))"
                    placeholder="Select a customer"
                    :error="errors.customerId"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1.5">Credit Note # *</label>
                  <Input
                    v-model="newCreditNote.creditNoteNumber"
                    placeholder="e.g. CN-0001"
                    :error="errors.creditNoteNumber"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1.5">Date *</label>
                  <DatePicker
                    v-model="newCreditNote.date"
                    :error="errors.date"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-border/50 pt-6">
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1.5">Reference Number</label>
                  <Input
                    v-model="newCreditNote.referenceNumber"
                    placeholder="Optional reference number"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1.5">Reference Invoice (Optional)</label>
                  <Select
                    v-model="newCreditNote.referenceInvoiceId"
                    :options="customerInvoices.map(inv => ({ id: inv.id, name: `${inv.invoiceNumber} (${currencySymbol}${inv.amount})` }))"
                    placeholder="Link to invoice"
                    :disabled="!newCreditNote.customerId"
                  />
                </div>
              </div>

              <!-- Line Items Table -->
              <div class="border-t border-border/50 pt-6">
                <h3 class="ui-section-title mb-4">Line items</h3>
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr class="border-b border-border/50 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                        <th class="pb-3 w-1/3">Item / Service</th>
                        <th class="pb-3 w-16 text-center">Qty</th>
                        <th class="pb-3 w-32 text-right">Rate ({{ currencySymbol }})</th>
                        <th class="pb-3 w-24 text-right">Row Total</th>
                        <th class="pb-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, idx) in newCreditNote.items" :key="idx" class="border-b border-border/30 align-top">
                        <td class="py-3 pr-4">
                          <Select
                            v-model="item.itemId"
                            :options="itemStore.items.map(i => ({ id: i.id, name: i.name }))"
                            placeholder="Select product or service"
                            @update:modelValue="(val) => handleItemSelect(idx, val)"
                          />
                          <Input
                            v-model="item.description"
                            placeholder="Description"
                            class="mt-2 text-xs"
                          />
                        </td>
                        <td class="py-3 px-2 text-center">
                          <Input
                            type="number"
                            v-model.number="item.quantity"
                            @input="recalculateTotals"
                            class="text-center w-16"
                          />
                        </td>
                        <td class="py-3 px-2">
                          <Input
                            type="number"
                            v-model.number="item.rate"
                            @input="recalculateTotals"
                            class="text-right w-32"
                          />
                        </td>
                        <td class="py-3 pl-2 text-right font-mono text-sm">
                          {{ formatCurrency(calculateLineItemTotal(item)) }}
                        </td>
                        <td class="py-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            @click="removeLineItem(idx)"
                            class="text-destructive hover:bg-destructive/10 rounded-xl"
                            :disabled="newCreditNote.items.length <= 1"
                          >
                            <Trash2 class="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <Button variant="outline" size="sm" @click="addLineItem" class="mt-4">
                  <Plus class="w-4 h-4 mr-2" /> Add Line
                </Button>
              </div>

              <!-- Calculations and Notes Section -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-border/50 pt-6">
                <!-- Address & Notes -->
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-foreground mb-1.5">Billing Address</label>
                    <Textarea v-model="newCreditNote.billingAddress" rows="2" placeholder="Customer billing details" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-foreground mb-1.5">Notes</label>
                    <Textarea v-model="newCreditNote.notes" rows="3" placeholder="Enter notes visible to the customer" />
                  </div>

                  <!-- Custom Fields -->
                  <CustomFieldRenderer
                    entity="credit_note"
                    v-model="newCreditNote.customFields"
                  />
                </div>

                <!-- Totals -->
                <div class="bg-muted/30 p-6 rounded-2xl border border-border/50 space-y-4">
                  <div class="flex justify-between text-xs text-muted-foreground font-semibold">
                    <span>Subtotal</span>
                    <span class="font-mono">{{ formatCurrency(newCreditNote.subtotal || 0) }}</span>
                  </div>

                  <!-- Discount -->
                  <div class="grid grid-cols-3 gap-2 align-items-center">
                    <span class="text-xs text-muted-foreground font-semibold flex items-center col-span-1">Discount</span>
                    <div class="col-span-2 flex gap-2">
                      <Select
                        v-model="newCreditNote.discountType"
                        :options="discountTypeOptions"
                        @update:modelValue="recalculateTotals"
                        class="w-1/2"
                      />
                      <Input
                        type="number"
                        v-model.number="newCreditNote.discountValue"
                        @input="recalculateTotals"
                        placeholder="0"
                        class="w-1/2 text-right"
                        :disabled="!newCreditNote.discountType"
                      />
                    </div>
                  </div>

                  <!-- Tax -->
                  <div class="flex justify-between items-center gap-4">
                    <span class="text-xs text-muted-foreground font-semibold">Tax Rate (%)</span>
                    <div class="flex items-center gap-2">
                      <Input
                        type="number"
                        v-model.number="newCreditNote.taxPercent"
                        @input="recalculateTotals"
                        placeholder="0"
                        class="w-24 text-right"
                      />
                      <span class="font-mono text-xs text-muted-foreground">({{ formatCurrency(newCreditNote.taxAmount || 0) }})</span>
                    </div>
                  </div>

                  <!-- Adjustment -->
                  <div class="flex justify-between items-center gap-4">
                    <span class="text-xs text-muted-foreground font-semibold">Adjustment ({{ currencySymbol }})</span>
                    <Input
                      type="number"
                      v-model.number="newCreditNote.adjustment"
                      @input="recalculateTotals"
                      placeholder="0"
                      class="w-24 text-right"
                    />
                  </div>

                  <div class="border-t border-border/50 pt-4 flex justify-between items-center font-bold text-foreground">
                    <span>Total Amount</span>
                    <span class="font-mono text-lg text-primary">{{ formatCurrency(newCreditNote.amount || 0) }}</span>
                  </div>
                </div>
              </div>

              <!-- Submit Buttons -->
              <div class="flex justify-end gap-3 border-t border-border/50 pt-6">
                <Button type="button" variant="ghost" @click="closeCreditNoteEditor">
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  @click="handleSave('Draft')"
                  :disabled="isSaving || fetchingDetails"
                >
                  <span v-if="isSaving"><Spinner size="sm" class="mr-2" /></span>
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  @click="handleSave('Open')"
                  :disabled="isSaving || fetchingDetails"
                >
                  <span v-if="isSaving"><Spinner size="sm" class="mr-2" /></span>
                  Save & Open
                </Button>
              </div>
            </form>
        </Modal>

        <!-- Sticky Transitional Header -->
        <StickyPageHeader
          title="Credit Notes"
          subtitle="Issue credits and offsets to your customer sales balances."
          :icon="CreditCard"
        >
          <template #actions>
            <div v-if="canManage('invoices')" class="flex items-center gap-2.5">
              <Button
                @click="handleCreateClick"
                size="sm"
                class="h-9 px-4 text-xs font-medium shadow-xs"
              >
                <Plus class="w-3.5 h-3.5 mr-1.5" />
                Create Credit Note
              </Button>
            </div>
          </template>
        </StickyPageHeader>

        <!-- Main Credit Notes View -->
        <div class="px-8 pt-2 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">

          <!-- KPI Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-primary/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
              <div class="h-[2.5px] w-full bg-amber-500/50"></div>
              <CardContent class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Total Issued Credits</span>
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/15 text-amber-700 dark:text-amber-400 group-hover:scale-105 transition-transform">
                    <IndianRupee class="w-4 h-4" />
                  </div>
                </div>
                <div class="text-2xl font-bold text-foreground mb-1 tracking-tight font-mono">
                  {{ formatCurrency(creditNotes.reduce((sum, cn) => cn.status !== 'Void' ? sum + Number(cn.amount) : sum, 0)) }}
                </div>
                <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">customer credits issued</p>
              </CardContent>
            </Card>

            <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-emerald-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
              <div class="h-[2.5px] w-full bg-emerald-500/50"></div>
              <CardContent class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Total Applied Credits</span>
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <CheckCircle class="w-4 h-4" />
                  </div>
                </div>
                <div class="text-2xl font-bold text-foreground mb-1 tracking-tight font-mono text-emerald-700 dark:text-emerald-400">
                  {{ formatCurrency(creditNotes.reduce((sum, cn) => cn.status !== 'Void' ? sum + (Number(cn.amount) - Number(cn.remainingAmount)) : sum, 0)) }}
                </div>
                <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">settled against invoices</p>
              </CardContent>
            </Card>

            <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-amber-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
              <div class="h-[2.5px] w-full bg-primary/50"></div>
              <CardContent class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Remaining Credit Balance</span>
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20 text-primary group-hover:scale-105 transition-transform">
                    <Clock class="w-4 h-4" />
                  </div>
                </div>
                <div class="text-2xl font-bold text-foreground mb-1 tracking-tight font-mono text-primary">
                  {{ formatCurrency(creditNotes.reduce((sum, cn) => cn.status === 'Open' ? sum + Number(cn.remainingAmount) : sum, 0)) }}
                </div>
                <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">available for future invoices</p>
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
                  placeholder="Search credit notes..."
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

              <div class="inline-flex h-8.5 items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50 overflow-x-auto max-w-full">
                <button
                  type="button"
                  v-for="f in filters"
                  :key="f"
                  @click="activeFilter = f"
                  :class="[
                    'px-2.5 py-1 rounded-md text-xs transition-all duration-150 whitespace-nowrap cursor-pointer',
                    activeFilter === f
                      ? getFilterActiveClass(f)
                      : 'text-muted-foreground font-medium hover:text-foreground hover:bg-muted/40 border border-transparent',
                  ]"
                >
                  {{ f }}
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/80 border-b border-border/70 bg-primary/[0.03]">
                    <th class="py-4 px-6">Credit Note #</th>
                    <th class="py-4 px-6">Date</th>
                    <th class="py-4 px-6">Customer</th>
                    <th class="py-4 px-6">Status</th>
                    <th class="py-4 px-6 text-right">Amount</th>
                    <th class="py-4 px-6 text-right">Remaining Balance</th>
                    <th class="py-4 px-6 text-right"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr v-if="fetchingCreditNotes" v-for="i in 3" :key="i">
                    <td class="py-4.5 px-6"><Skeleton class="h-4 w-24" /></td>
                    <td class="py-4.5 px-6"><Skeleton class="h-4 w-20" /></td>
                    <td class="py-4.5 px-6"><Skeleton class="h-4 w-32" /></td>
                    <td class="py-4.5 px-6"><Skeleton class="h-6 w-16 rounded-md" /></td>
                    <td class="py-4.5 px-6 text-right"><Skeleton class="h-4 w-20 ml-auto" /></td>
                    <td class="py-4.5 px-6 text-right"><Skeleton class="h-4 w-20 ml-auto" /></td>
                    <td class="py-4.5 px-6"></td>
                  </tr>

                  <tr v-else-if="creditNotes.length === 0">
                    <td colspan="7" class="py-32 text-center">
                      <div class="flex flex-col items-center justify-center max-w-xs mx-auto space-y-4">
                        <div class="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center">
                          <CreditCard class="w-8 h-8 text-muted-foreground/40" />
                        </div>
                        <div class="space-y-1">
                          <h3 class="ui-section-title">No Credit Notes found</h3>
                          <p class="text-[11px] text-muted-foreground font-medium">
                            {{ searchQuery ? 'Try adjusting your search filters.' : 'Issue customer credit notes to adjust invoice balances.' }}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr
                    v-else
                    v-for="cn in creditNotes"
                    :key="cn.id"
                    class="hover:bg-muted/50 group cursor-pointer transition-colors duration-150"
                    @click="handleViewPreview(cn)"
                  >
                    <td class="py-4.5 px-6 text-sm font-bold text-foreground group-hover:text-primary tracking-tight transition-colors font-mono">
                      {{ cn.creditNoteNumber }}
                    </td>
                    <td class="py-4.5 px-6 text-xs text-muted-foreground font-semibold tracking-wide">
                      {{ formatDate(cn.date) }}
                    </td>
                    <td class="py-4.5 px-6 text-sm text-foreground/80 group-hover:text-foreground font-medium transition-colors">
                      {{ getCustomerName(cn) }}
                    </td>
                    <td class="py-3.5 px-6">
                      <span
                        :class="[
                          'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap shadow-xs transition-colors',
                          cn.status === 'Closed'
                            ? 'border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white'
                            : cn.status === 'Open'
                              ? 'border-transparent bg-blue-600 text-white dark:bg-blue-500 dark:text-white'
                              : cn.status === 'Void'
                                ? 'border-transparent bg-destructive text-destructive-foreground'
                                : 'border-transparent bg-secondary text-secondary-foreground'
                        ]"
                      >
                        {{ cn.status }}
                      </span>
                    </td>
                    <td class="py-4.5 px-6 text-right text-sm font-bold text-foreground tracking-tight font-mono">
                      {{ formatCurrency(cn.amount) }}
                    </td>
                    <td class="py-4.5 px-6 text-right text-sm font-bold text-primary tracking-tight font-mono">
                      {{ formatCurrency(cn.remainingAmount) }}
                    </td>
                    <td class="py-4.5 px-6 text-right" @click.stop>
                      <Button
                        variant="ghost"
                        size="icon"
                        @click="(e) => handleActionsTrigger(e, cn)"
                        class="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 transition-colors opacity-70 group-hover:opacity-100"
                      >
                        <MoreHorizontal class="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div v-if="!fetchingCreditNotes && creditNotes.length > 0 && pagination.totalPages > 1" class="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/20">
              <div class="flex items-center gap-2">
                <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Showing Page {{ pagination.page }} of {{ pagination.totalPages }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  :disabled="pagination.page <= 1"
                  @click="handlePageChange(pagination.page - 1)"
                  class="h-8 w-8 rounded-lg border-border/50 hover:bg-muted"
                >
                  <ChevronLeft class="w-4 h-4" />
                </Button>
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
        </div>
        </ViewGuard>
      </main>
    </div>

    <!-- Actions Context Menu -->
    <Teleport to="body">
      <div
        v-if="openMenuId && activeMenuCreditNote"
        class="fixed z-[100] w-48 bg-card border border-border rounded-xl shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
        :style="{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }"
        @click.stop
      >
        <button type="button"
          @click="handleViewPreview(activeMenuCreditNote)"
          class="w-full px-4 py-2 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2"
        >
          <Eye class="w-3.5 h-3.5" /> View Preview
        </button>

        <button type="button"
          v-if="canManage('invoices') && activeMenuCreditNote.status === 'Draft'"
          @click="handleEditClick(activeMenuCreditNote)"
          class="w-full px-4 py-2 text-left text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-2"
        >
          <FileText class="w-3.5 h-3.5" /> Edit Credit Note
        </button>

        <button type="button"
          v-if="canManage('invoices') && activeMenuCreditNote.status === 'Open' && Number(activeMenuCreditNote.remainingAmount) > 0"
          @click="handleOpenApplyModal(activeMenuCreditNote)"
          class="w-full px-4 py-2 text-left text-xs font-bold text-primary hover:bg-primary/10 flex items-center gap-2"
        >
          <Link class="w-3.5 h-3.5 text-primary" /> Apply to Invoice
        </button>

        <button type="button"
          v-if="canManage('invoices')"
          @click="handleDeleteClick(activeMenuCreditNote)"
          class="w-full px-4 py-2 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 flex items-center gap-2 border-t border-border/50"
        >
          <Trash2 class="w-3.5 h-3.5 text-destructive" /> Move to Trash
        </button>

        <button type="button"
          v-if="canManage('invoices') && activeMenuCreditNote.status === 'Open' && Number(activeMenuCreditNote.remainingAmount) === Number(activeMenuCreditNote.amount)"
          @click="handleVoidClick(activeMenuCreditNote)"
          class="w-full px-4 py-2 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 flex items-center gap-2"
        >
          <X class="w-3.5 h-3.5 text-destructive" /> Void
        </button>
      </div>
    </Teleport>

    <!-- Credit Note Preview Modal -->
    <Modal :open="isPreviewOpen" max-width-class="max-w-4xl" @close="isPreviewOpen = false">
      <template #header>
        <div class="flex w-full items-center justify-between gap-4 border-b border-border/50 bg-secondary/20 px-5 py-4">
          <div>
            <h2 class="text-lg font-bold">Credit Note Details</h2>
            <p class="text-[10px] text-muted-foreground font-mono mt-0.5">{{ selectedDetail?.creditNoteNumber }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span
              :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap shadow-xs transition-colors',
                selectedDetail?.status === 'Closed'
                  ? 'border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white'
                  : selectedDetail?.status === 'Open'
                    ? 'border-transparent bg-blue-600 text-white dark:bg-blue-500 dark:text-white'
                    : selectedDetail?.status === 'Void'
                      ? 'border-transparent bg-destructive text-destructive-foreground'
                      : 'border-transparent bg-secondary text-secondary-foreground'
              ]"
            >
              {{ selectedDetail?.status }}
            </span>
            <button type="button" aria-label="Close dialog" class="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" @click="isPreviewOpen = false">
              <X class="size-4" />
            </button>
          </div>
        </div>
      </template>

      <div v-if="selectedDetail" class="space-y-6">
        <!-- Details Card -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
          <div>
            <span class="block text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Customer</span>
            <span class="text-xs font-bold">{{ getCustomerName(selectedDetail) }}</span>
          </div>
          <div>
            <span class="block text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Date</span>
            <span class="text-xs font-semibold">{{ formatDate(selectedDetail.date) }}</span>
          </div>
          <div>
            <span class="block text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Total Credit</span>
            <span class="text-xs font-bold font-mono">{{ formatCurrency(selectedDetail.amount) }}</span>
          </div>
          <div>
            <span class="block text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Remaining Balance</span>
            <span class="text-xs font-bold font-mono text-primary">{{ formatCurrency(selectedDetail.remainingAmount) }}</span>
          </div>
        </div>

        <!-- Line Items -->
        <div>
          <h4 class="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-3">Items details</h4>
          <div class="border border-border/50 rounded-2xl overflow-hidden">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-muted/30 border-b border-border/50 font-bold uppercase tracking-wider text-muted-foreground">
                  <th class="p-3">Item / Service</th>
                  <th class="p-3 text-center w-16">Qty</th>
                  <th class="p-3 text-right w-32">Rate ({{ currencySymbol }})</th>
                  <th class="p-3 text-right w-32">Total ({{ currencySymbol }})</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in selectedDetail.items" :key="item.id" class="border-b border-border/30">
                  <td class="p-3">
                    <span class="font-bold text-foreground">{{ item.itemName }}</span>
                    <span v-if="item.description" class="block text-[10px] text-muted-foreground mt-1">{{ item.description }}</span>
                  </td>
                  <td class="p-3 text-center font-semibold text-muted-foreground">{{ item.quantity }}</td>
                  <td class="p-3 text-right font-mono text-muted-foreground">{{ formatCurrency(item.rate) }}</td>
                  <td class="p-3 text-right font-mono font-semibold text-foreground">{{ formatCurrency(item.amount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Allocations history -->
        <div v-if="selectedDetail.applications && selectedDetail.applications.length > 0">
          <h4 class="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-3">Applied To Invoices</h4>
          <div class="border border-border/50 rounded-2xl overflow-hidden">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-muted/30 border-b border-border/50 font-bold uppercase tracking-wider text-muted-foreground">
                  <th class="p-3">Invoice Number</th>
                  <th class="p-3">Applied Date</th>
                  <th class="p-3 text-right w-32">Amount Applied ({{ currencySymbol }})</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="app in selectedDetail.applications" :key="app.id" class="border-b border-border/30">
                  <td class="p-3 font-semibold font-mono text-foreground">{{ app.invoiceNumber }}</td>
                  <td class="p-3 text-muted-foreground">{{ formatDate(app.appliedAt) }}</td>
                  <td class="p-3 text-right font-bold font-mono text-success">{{ formatCurrency(app.amountApplied) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="selectedDetail.notes">
          <span class="block text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Notes</span>
          <p class="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{{ selectedDetail.notes }}</p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between items-center w-full">
          <div class="flex items-center gap-2">
            <Button
              v-if="canManage('invoices') && selectedDetail?.status === 'Open' && Number(selectedDetail?.remainingAmount) > 0"
              @click="handleOpenApplyModal(selectedDetail)"
            >
              <Link class="w-4 h-4 mr-2" /> Apply credit
            </Button>
            <Button
              v-if="canManage('invoices') && selectedDetail"
              variant="destructive"
              size="sm"
              @click="handleDeleteClick(selectedDetail)"
            >
              <Trash2 class="w-4 h-4 mr-1.5" /> Move to Trash
            </Button>
          </div>
          <Button variant="ghost" @click="isPreviewOpen = false">
            Close
          </Button>
        </div>
      </template>
    </Modal>

    <!-- Move Credit Note to Trash Confirmation Modal -->
    <Modal :open="showDeleteConfirmModal" max-width-class="max-w-md" @close="showDeleteConfirmModal = false">
      <template #header>
        <div class="flex items-start justify-between gap-4 border-b border-border/50 px-5 py-4">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
              <Trash2 class="size-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-foreground">{{ deleteConfirmTitle }}</h2>
              <p v-if="creditNoteToDelete" class="text-xs text-muted-foreground font-mono mt-0.5">
                {{ creditNoteToDelete.creditNoteNumber }}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            class="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            @click="showDeleteConfirmModal = false"
          >
            <X class="size-4" />
          </button>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Warning Alert if applied to invoices -->
        <div
          v-if="isCnApplied(creditNoteToDelete)"
          class="p-3.5 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 rounded-xl flex gap-3 text-xs text-amber-700 dark:text-amber-300"
        >
          <AlertTriangle class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div class="space-y-1">
            <span class="font-bold block">Credit Note Applied to Invoice(s)</span>
            <span class="leading-relaxed block">{{ deleteConfirmDescription }}</span>
          </div>
        </div>

        <p v-else class="text-xs text-muted-foreground leading-relaxed">
          {{ deleteConfirmDescription }}
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <Button
            type="button"
            variant="ghost"
            @click="showDeleteConfirmModal = false"
            :disabled="isDeletingCn"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            @click="confirmDeleteCn"
            :disabled="isDeletingCn"
            class="gap-1.5"
          >
            <Spinner v-if="isDeletingCn" size="sm" />
            <Trash2 v-else class="w-4 h-4" />
            <span>Move to Trash</span>
          </Button>
        </div>
      </template>
    </Modal>

    <!-- Apply Credit to Invoice Dialog -->
    <Modal :open="isApplyModalOpen" max-width-class="max-w-md" @close="isApplyModalOpen = false">
      <template #header>
        <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 class="text-base font-semibold">Apply Credit to Invoice</h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              Credit Note: {{ selectedCnForApply?.creditNoteNumber }}
            </p>
          </div>
          <button type="button" aria-label="Close dialog" class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" @click="isApplyModalOpen = false">
            <X class="size-4" />
          </button>
        </div>
      </template>

      <div class="space-y-4">
        <div class="p-3 bg-muted/40 border border-border rounded-lg flex justify-between text-xs items-center">
          <span class="font-medium text-muted-foreground">Available Credit Balance</span>
          <span class="font-bold text-foreground font-mono text-sm">
            {{ formatCurrency(selectedCnForApply?.remainingAmount || 0) }}
          </span>
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-1.5">Select Invoice *</label>
          <Select
            v-model="selectedInvoiceId"
            :options="customerInvoices.map(inv => ({ id: inv.id, name: `${inv.invoiceNumber} (Outstanding: ${currencySymbol}${getInvoiceOutstanding(inv)})` }))"
            placeholder="Select outstanding invoice"
          />
        </div>

        <div v-if="selectedInvoiceId">
          <label class="block text-sm font-medium text-foreground mb-1.5">Amount to Apply ({{ currencySymbol }}) *</label>
          <Input
            type="number"
            v-model.number="amountToApply"
            placeholder="0.00"
          />
        </div>

        <div v-else class="p-3 bg-muted/20 border border-border rounded-lg flex gap-3 text-xs text-muted-foreground">
          <AlertCircle class="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <span>No outstanding invoices found for this customer. Credit notes can only be applied to unpaid invoices.</span>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="isApplyModalOpen = false">
          Cancel
        </Button>
        <Button
          @click="executeApplyCredit"
          :disabled="!selectedInvoiceId || applyingCredits"
        >
          <span v-if="applyingCredits"><Spinner size="sm" class="mr-2" /></span>
          Apply Credit
        </Button>
      </template>
    </Modal>
  </div>
</template>

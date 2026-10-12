import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/lib/api';

export interface CreditNoteItem {
  id?: string;
  itemId?: string;
  itemName?: string;
  quantity: number;
  rate: number;
  amount: number;
  description?: string;
}

export interface CreditNoteApplication {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  amountApplied: number;
  appliedAt: string;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  date: string;
  customerId: string;
  amount: number;
  remainingAmount: number;
  status: 'Draft' | 'Open' | 'Closed' | 'Void';
  customers?: { name: string };
  created_at?: string;
  referenceNumber?: string;
  referenceInvoiceId?: string;
  billingAddress?: string;
  shippingAddress?: string;
  notes?: string;
  termsConditions?: string;
  taxPercent?: number;
  taxAmount?: number;
  subtotal?: number;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  adjustment?: number;
  items?: CreditNoteItem[];
  applications?: CreditNoteApplication[];
  customFields?: any;
}

export const useCreditNoteStore = defineStore('creditNote', () => {
  const creditNotes = ref<CreditNote[]>([]);
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const loading = ref(false);
  const fetched = ref(false);
  const cache = ref<Record<string, { data: CreditNote[], meta: any }>>({});
  const detailsCache = ref<Record<string, CreditNote>>({});
  const error = ref<string | null>(null);

  const fetchCreditNotes = async (page = 1, limit = 10, search = "", status = "All", force = false) => {
    const cacheKey = `${page}-${limit}-${search}-${status}`;

    if (!force && cache.value[cacheKey]) {
      creditNotes.value = cache.value[cacheKey].data;
      pagination.value = cache.value[cacheKey].meta;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/credit-notes', {
        params: { page, limit, search, status }
      });

      const responseData = response.data.data;
      const responseMeta = response.data.meta;

      creditNotes.value = responseData;
      pagination.value = responseMeta;

      cache.value[cacheKey] = { data: responseData, meta: responseMeta };
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch credit notes';
    } finally {
      loading.value = false;
    }
  };

  const fetchCreditNoteById = async (id: string, force = false) => {
    if (!force && detailsCache.value[id]) {
      return detailsCache.value[id];
    }

    loading.value = true;
    error.value = null;
    try {
      const response = await api.get(`/credit-notes/${id}`);
      detailsCache.value[id] = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch credit note details';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchNextNumber = async () => {
    try {
      const response = await api.get(`/credit-notes/next-number?t=${Date.now()}`);
      return response.data.nextNumber;
    } catch (err: any) {
      console.error('Failed to fetch next credit note number', err);
      throw err;
    }
  };

  const addCreditNote = async (creditNote: Omit<CreditNote, 'id' | 'remainingAmount'>) => {
    loading.value = true;
    try {
      const response = await api.post('/credit-notes', creditNote);
      cache.value = {}; // Clear cache
      detailsCache.value = {};
      await fetchCreditNotes(1, pagination.value.limit, "", "All", true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add credit note';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCreditNote = async (id: string, creditNote: Partial<CreditNote>) => {
    loading.value = true;
    try {
      const response = await api.patch(`/credit-notes/${id}`, creditNote);
      cache.value = {}; // Clear cache
      detailsCache.value = {};
      await fetchCreditNotes(pagination.value.page, pagination.value.limit, "", "All", true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update credit note';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCreditNoteStatus = async (id: string, status: string) => {
    loading.value = true;
    try {
      const response = await api.patch(`/credit-notes/${id}/status`, { status });
      cache.value = {};
      detailsCache.value = {};
      await fetchCreditNotes(pagination.value.page, pagination.value.limit, "", "All", true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update credit note status';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteCreditNote = async (id: string) => {
    loading.value = true;
    try {
      await api.delete(`/credit-notes/${id}`);
      cache.value = {}; // Clear cache
      detailsCache.value = {};
      await fetchCreditNotes(1, pagination.value.limit, "", "All", true);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete credit note';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const applyCreditNote = async (id: string, invoiceId: string, amountApplied: number) => {
    loading.value = true;
    try {
      const response = await api.post(`/credit-notes/${id}/apply`, {
        invoiceId,
        amountApplied
      });
      cache.value = {};
      detailsCache.value = {};
      await fetchCreditNotes(pagination.value.page, pagination.value.limit, "", "All", true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to apply credit note';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchAvailableCreditNotes = async (customerId: string) => {
    try {
      const response = await api.get(`/credit-notes/customer/${customerId}/available`);
      return response.data;
    } catch (err: any) {
      console.error('Failed to fetch available credit notes for customer:', err);
      return [];
    }
  };

  const reset = () => {
    creditNotes.value = [];
    pagination.value = { total: 0, page: 1, limit: 10, totalPages: 0 };
    loading.value = false;
    fetched.value = false;
    cache.value = {};
    detailsCache.value = {};
    error.value = null;
  };

  return {
    creditNotes,
    pagination,
    loading,
    fetched,
    error,
    fetchCreditNotes,
    fetchCreditNoteById,
    fetchNextNumber,
    addCreditNote,
    updateCreditNote,
    updateCreditNoteStatus,
    deleteCreditNote,
    applyCreditNote,
    fetchAvailableCreditNotes,
    reset,
  };
});

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/lib/api';
import { useTrashStore } from './trashStore';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerId: string;
  amount: number;
  status: 'Draft' | 'Outstanding' | 'Paid' | 'Overdue';
  customers?: { name: string };
  created_at?: string;
  items?: Array<{
    itemId: string;
    itemName?: string;
    quantity: number;
    rate: number;
    amount: number;
    description?: string;
  }>;
  referenceNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  terms?: string;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  shippingCharges?: number;
  packagingCharges?: number;
  adjustment?: number;
  roundOff?: number;
  notes?: string;
  termsConditions?: string;
  taxPercent?: number;
  taxAmount?: number;
  customFields?: any;
}

export const useInvoiceStore = defineStore('invoice', () => {
  const invoices = ref<Invoice[]>([]);
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const loading = ref(false);
  const fetched = ref(false);
  const cache = ref<Record<string, { data: Invoice[], meta: any }>>({});
  const detailsCache = ref<Record<string, Invoice>>({});
  const lastSearch = ref("");
  const lastStatus = ref("All");
  const error = ref<string | null>(null);

  const fetchInvoices = async (
    page = 1,
    limit = 10,
    search = "",
    status = "All",
    force = false,
    extraParams?: { timeframe?: string; minAmount?: number | null; maxAmount?: number | null; bookmarkedOnly?: boolean }
  ) => {
    const timeframe = extraParams?.timeframe || "all";
    const minAmount = extraParams?.minAmount ?? "";
    const maxAmount = extraParams?.maxAmount ?? "";
    const bookmarkedOnly = extraParams?.bookmarkedOnly ? "true" : "false";
    const cacheKey = `${page}-${limit}-${search}-${status}-${timeframe}-${minAmount}-${maxAmount}-${bookmarkedOnly}`;
    
    if (!force && cache.value[cacheKey]) {
      invoices.value = cache.value[cacheKey].data;
      pagination.value = cache.value[cacheKey].meta;
      lastSearch.value = search;
      lastStatus.value = status;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const queryParams: Record<string, any> = { page, limit, search, status };
      if (timeframe && timeframe !== "all") queryParams.timeframe = timeframe;
      if (minAmount !== "") queryParams.minAmount = minAmount;
      if (maxAmount !== "") queryParams.maxAmount = maxAmount;
      if (extraParams?.bookmarkedOnly) queryParams.bookmarkedOnly = "true";

      const response = await api.get('/invoices', {
        params: queryParams
      });
      
      const responseData = response.data.data;
      const responseMeta = response.data.meta;
      
      invoices.value = responseData;
      pagination.value = responseMeta;
      
      if (Array.isArray(responseData)) {
        responseData.forEach((inv: Invoice) => {
          detailsCache.value[inv.id] = inv;
        });
      }

      cache.value[cacheKey] = { data: responseData, meta: responseMeta };
      
      lastSearch.value = search;
      lastStatus.value = status;
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch invoices';
    } finally {
      loading.value = false;
    }
  };

  const addInvoice = async (invoice: Omit<Invoice, 'id'>) => {
    loading.value = true;
    try {
      const response = await api.post('/invoices', invoice);
      cache.value = {}; // Clear cache
      detailsCache.value = {};
      await fetchInvoices(1, pagination.value.limit, "", "All", true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add invoice';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchInvoiceDetails = async (id: string, force = false) => {
    if (!force && detailsCache.value[id]?.items) {
      return detailsCache.value[id];
    }
    error.value = null;
    try {
      const response = await api.get(`/invoices/${id}`);
      detailsCache.value[id] = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch invoice details';
      throw err;
    }
  };

  const fetchNextInvoiceNumber = async () => {
    try {
      const response = await api.get(`/invoices/next-number?t=${Date.now()}`);
      return response.data.nextNumber;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch next invoice number';
      throw err;
    }
  };

  const updateInvoice = async (id: string, invoice: Partial<Invoice>) => {
    loading.value = true;
    try {
      const response = await api.patch(`/invoices/${id}`, invoice);
      cache.value = {}; // Clear cache
      if (detailsCache.value[id]) delete detailsCache.value[id];
      await fetchInvoices(pagination.value.page, pagination.value.limit, lastSearch.value, lastStatus.value, true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update invoice';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    try {
      const response = await api.patch(`/invoices/${id}/status`, { status });
      
      // Update local state immediately
      const index = invoices.value.findIndex(i => i.id === id);
      if (index !== -1) {
        // If we are currently filtered by a specific status, and the invoice 
        // no longer matches that status, remove it from the list.
        if (lastStatus.value !== 'All' && lastStatus.value !== status) {
          // Special handling for Due vs Outstanding virtual filters
          const now = new Date();
          now.setHours(0,0,0,0);
          const inv = invoices.value[index];
          const isPastDue = inv.dueDate && new Date(inv.dueDate) < now;
          
          let matchesFilter = false;
          if (lastStatus.value === 'Outstanding' && status === 'Outstanding' && isPastDue) matchesFilter = true;
          if (lastStatus.value === 'Due' && status === 'Outstanding' && !isPastDue) matchesFilter = true;
          if (lastStatus.value === status) matchesFilter = true;

          if (!matchesFilter) {
            invoices.value.splice(index, 1);
            pagination.value.total--;
          } else {
            invoices.value[index].status = status;
          }
        } else {
          invoices.value[index].status = status;
        }
      }
      
      // Clear cache because the distribution of invoices across filters has changed
      cache.value = {};
      if (detailsCache.value[id]) delete detailsCache.value[id];
      
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update status';
      throw err;
    }
  };

  const sendInvoice = async (id: string, emailData: { subject?: string, message?: string, recipientEmail?: string }) => {
    loading.value = true;
    try {
      await api.post(`/invoices/${id}/send`, emailData);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to send invoice';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await api.delete(`/invoices/${id}`);
      cache.value = {}; // Clear cache
      if (detailsCache.value[id]) delete detailsCache.value[id];
      useTrashStore().markStale();
      await fetchInvoices(pagination.value.page, pagination.value.limit, "", "All", true);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete invoice';
      throw err;
    }
  };

  const importZohoInvoices = async (file: File) => {
    loading.value = true;
    error.value = null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/invoices/import/zoho', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      cache.value = {}; // Clear cache
      detailsCache.value = {};
      await fetchInvoices(1, pagination.value.limit, "", "All", true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to import invoices';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const stats = computed(() => {
    const now = new Date();
    const totalOutstanding = invoices.value
      .filter((i) => i.status === 'Outstanding' || i.status === 'Overdue')
      .reduce((sum, i) => sum + i.amount, 0);
    
    const overdue = invoices.value
      .filter((i) => {
        const isOutstanding = i.status === 'Outstanding' || i.status === 'Overdue';
        const isPastDue = i.dueDate && new Date(i.dueDate) < now;
        return isOutstanding && isPastDue;
      })
      .reduce((sum, i) => sum + i.amount, 0);

    const paid = invoices.value
      .filter((i) => i.status === 'Paid')
      .reduce((sum, i) => sum + i.amount, 0);

    return { totalOutstanding, overdue, paid };
  });

  const reset = () => {
    invoices.value = [];
    pagination.value = {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0
    };
    cache.value = {};
    detailsCache.value = {};
    lastSearch.value = "";
    lastStatus.value = "All";
    fetched.value = false;
    error.value = null;
  };

  const bulkDeleteInvoices = async (ids: string[]) => {
    try {
      const response = await api.post('/invoices/bulk-delete', { ids });
      cache.value = {};
      ids.forEach((id) => {
        if (detailsCache.value[id]) delete detailsCache.value[id];
      });
      useTrashStore().markStale();
      await fetchInvoices(pagination.value.page, pagination.value.limit, lastSearch.value, lastStatus.value, true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete invoices';
      throw err;
    }
  };

  const bulkUpdateInvoiceStatus = async (ids: string[], status: Invoice['status']) => {
    try {
      const response = await api.patch('/invoices/bulk-status', { ids, status });
      cache.value = {};
      ids.forEach((id) => {
        if (detailsCache.value[id]) delete detailsCache.value[id];
      });
      await fetchInvoices(pagination.value.page, pagination.value.limit, lastSearch.value, lastStatus.value, true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update invoice statuses';
      throw err;
    }
  };

  return {
    invoices,
    pagination,
    loading,
    error,
    stats,
    detailsCache,
    fetchInvoices,
    fetchInvoiceDetails,
    fetchNextInvoiceNumber,
    addInvoice,
    updateInvoice,
    updateInvoiceStatus,
    bulkDeleteInvoices,
    bulkUpdateInvoiceStatus,
    sendInvoice,
    deleteInvoice,
    importZohoInvoices,
    reset,
  };
});

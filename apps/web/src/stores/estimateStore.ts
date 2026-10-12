import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/lib/api';
import { useInvoiceStore } from './invoiceStore';

export interface Estimate {
  id: string;
  estimateNumber: string;
  date: string;
  expiryDate: string;
  customerId: string;
  amount: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Invoiced';
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
  adjustment?: number;
  notes?: string;
  termsConditions?: string;
  taxPercent?: number;
  taxAmount?: number;
  customFields?: any;
}

export const useEstimateStore = defineStore('estimate', () => {
  const estimates = ref<Estimate[]>([]);
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const loading = ref(false);
  const fetched = ref(false);
  const cache = ref<Record<string, { data: Estimate[], meta: any }>>({});
  const detailsCache = ref<Record<string, Estimate>>({});
  const lastSearch = ref("");
  const lastStatus = ref("All");
  const error = ref<string | null>(null);

  const fetchEstimates = async (page = 1, limit = 10, search = "", status = "All", force = false) => {
    const cacheKey = `${page}-${limit}-${search}-${status}`;
    
    if (!force && cache.value[cacheKey]) {
      estimates.value = cache.value[cacheKey].data;
      pagination.value = cache.value[cacheKey].meta;
      lastSearch.value = search;
      lastStatus.value = status;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/estimates', {
        params: { page, limit, search, status }
      });
      
      const responseData = response.data.data;
      const responseMeta = response.data.meta;
      
      estimates.value = responseData;
      pagination.value = responseMeta;
      
      if (Array.isArray(responseData)) {
        responseData.forEach((est: Estimate) => {
          detailsCache.value[est.id] = est;
        });
      }

      cache.value[cacheKey] = { data: responseData, meta: responseMeta };
      
      lastSearch.value = search;
      lastStatus.value = status;
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch estimates';
    } finally {
      loading.value = false;
    }
  };

  const addEstimate = async (estimate: Omit<Estimate, 'id'>) => {
    loading.value = true;
    try {
      const response = await api.post('/estimates', estimate);
      cache.value = {}; // Clear cache
      detailsCache.value = {};
      await fetchEstimates(1, pagination.value.limit, "", "All", true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add estimate';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchEstimateDetails = async (id: string, force = false) => {
    if (!force && detailsCache.value[id]?.items) {
      return detailsCache.value[id];
    }
    error.value = null;
    try {
      const response = await api.get(`/estimates/${id}`);
      detailsCache.value[id] = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch estimate details';
      throw err;
    }
  };

  const fetchNextEstimateNumber = async () => {
    const response = await api.get(`/estimates/next-number?t=${Date.now()}`);
    return response.data.nextNumber as string;
  };

  const updateEstimate = async (id: string, estimate: Partial<Estimate>) => {
    loading.value = true;
    try {
      const response = await api.patch(`/estimates/${id}`, estimate);
      cache.value = {}; // Clear cache
      if (detailsCache.value[id]) delete detailsCache.value[id];
      await fetchEstimates(pagination.value.page, pagination.value.limit, lastSearch.value, lastStatus.value, true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update estimate';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateEstimateStatus = async (id: string, status: Estimate['status']) => {
    try {
      const response = await api.patch(`/estimates/${id}/status`, { status });
      cache.value = {}; // Clear cache
      if (detailsCache.value[id]) delete detailsCache.value[id];
      await fetchEstimates(pagination.value.page, pagination.value.limit, lastSearch.value, lastStatus.value, true);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update status';
      throw err;
    }
  };

  const deleteEstimate = async (id: string) => {
    try {
      await api.delete(`/estimates/${id}`);
      cache.value = {}; // Clear cache
      if (detailsCache.value[id]) delete detailsCache.value[id];
      await fetchEstimates(pagination.value.page, pagination.value.limit, lastSearch.value, lastStatus.value, true);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete estimate';
      throw err;
    }
  };

  const convertToInvoice = async (estimateId: string) => {
    const estimate = estimates.value.find(e => e.id === estimateId);
    if (!estimate) return null;

    const invoiceStore = useInvoiceStore();
    
    const invoiceNumber = await invoiceStore.fetchNextInvoiceNumber();
    const invoiceData = {
      invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customerId: estimate.customerId,
      amount: estimate.amount,
      status: 'Draft' as const,
      items: estimate.items,
      referenceNumber: estimate.referenceNumber,
      billingAddress: estimate.billingAddress,
      shippingAddress: estimate.shippingAddress,
      terms: estimate.terms,
      discountType: estimate.discountType,
      discountValue: estimate.discountValue,
      discountAmount: estimate.discountAmount,
      shippingCharges: estimate.shippingCharges,
      adjustment: estimate.adjustment,
      notes: estimate.notes,
      termsConditions: estimate.termsConditions,
      taxPercent: estimate.taxPercent,
      taxAmount: estimate.taxAmount,
    };

    try {
      await invoiceStore.addInvoice(invoiceData);
      await updateEstimateStatus(estimateId, 'Invoiced');
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to convert to invoice';
      throw err;
    }
  };

  const stats = computed(() => {
    const pending = estimates.value
      .filter((e) => e.status === 'Sent')
      .reduce((sum, e) => sum + e.amount, 0);
    const accepted = estimates.value
      .filter((e) => e.status === 'Accepted')
      .reduce((sum, e) => sum + e.amount, 0);
    const invoiced = estimates.value
      .filter((e) => e.status === 'Invoiced')
      .reduce((sum, e) => sum + e.amount, 0);

    return { pending, accepted, invoiced };
  });

  const reset = () => {
    estimates.value = [];
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

  return {
    estimates,
    pagination,
    loading,
    error,
    stats,
    detailsCache,
    fetchEstimates,
    fetchEstimateDetails,
    fetchNextEstimateNumber,
    addEstimate,
    updateEstimate,
    updateEstimateStatus,
    deleteEstimate,
    convertToInvoice,
    reset,
  };
});

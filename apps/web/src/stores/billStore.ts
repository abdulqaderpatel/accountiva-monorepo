import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/lib/api';
import { useTrashStore } from './trashStore';

export interface Bill {
  id: string;
  billNumber: string;
  date: string;
  dueDate: string;
  vendorId: string;
  amount: number;
  status: 'Draft' | 'Outstanding' | 'Paid' | 'Overdue';
  vendors?: { name: string };
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
  terms?: string;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  adjustment?: number;
  notes?: string;
  termsConditions?: string;
  taxPercent?: number;
  taxAmount?: number;
  customFields?: any;
}

export const useBillStore = defineStore('bill', () => {
  const bills = ref<Bill[]>([]);
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const loading = ref(false);
  const fetched = ref(false);
  const cache = ref<Record<string, { data: Bill[], meta: any }>>({});
  const detailsCache = ref<Record<string, Bill>>({});
  const lastSearch = ref("");
  const lastStatus = ref("All");
  const error = ref<string | null>(null);

  const fetchBills = async (
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
      bills.value = cache.value[cacheKey].data;
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

      const response = await api.get('/bills', {
        params: queryParams
      });
      
      const responseData = response.data.data;
      const responseMeta = response.data.meta;
      
      bills.value = responseData;
      pagination.value = responseMeta;
      
      if (Array.isArray(responseData)) {
        responseData.forEach((bill: Bill) => {
          detailsCache.value[bill.id] = bill;
        });
      }

      cache.value[cacheKey] = { data: responseData, meta: responseMeta };
      
      lastSearch.value = search;
      lastStatus.value = status;
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch bills';
    } finally {
      loading.value = false;
    }
  };

  const fetchBillDetails = async (id: string, force = false) => {
    if (!force && detailsCache.value[id]?.items) {
      return detailsCache.value[id];
    }
    error.value = null;
    try {
      const response = await api.get(`/bills/${id}`);
      detailsCache.value[id] = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch bill details';
      throw err;
    }
  };

  const fetchNextBillNumber = async () => {
    const response = await api.get(`/bills/next-number?t=${Date.now()}`);
    return response.data.nextNumber as string;
  };

  const addBill = async (bill: Omit<Bill, 'id'>) => {
    loading.value = true;
    try {
      const response = await api.post('/bills', bill);
      cache.value = {}; // Clear cache
      detailsCache.value = {};
      await fetchBills(1, pagination.value.limit, "", "All", true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add bill';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateBill = async (id: string, bill: Partial<Bill>) => {
    loading.value = true;
    try {
      const response = await api.patch(`/bills/${id}`, bill);
      cache.value = {}; // Clear cache
      if (detailsCache.value[id]) delete detailsCache.value[id];
      await fetchBills(pagination.value.page, pagination.value.limit, lastSearch.value, lastStatus.value, true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update bill';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateBillStatus = async (id: string, status: Bill['status']) => {
    try {
      const response = await api.patch(`/bills/${id}/status`, { status });
      
      // Update local state immediately
      const index = bills.value.findIndex(b => b.id === id);
      if (index !== -1) {
        if (lastStatus.value !== 'All' && lastStatus.value !== status) {
          const now = new Date();
          now.setHours(0,0,0,0);
          const bill = bills.value[index];
          const isPastDue = bill.dueDate && new Date(bill.dueDate) < now;
          
          let matchesFilter = false;
          if (lastStatus.value === 'Outstanding' && status === 'Outstanding' && isPastDue) matchesFilter = true;
          if (lastStatus.value === 'Due' && status === 'Outstanding' && !isPastDue) matchesFilter = true;
          if (lastStatus.value === status) matchesFilter = true;

          if (!matchesFilter) {
            bills.value.splice(index, 1);
            pagination.value.total--;
          } else {
            bills.value[index].status = status;
          }
        } else {
          bills.value[index].status = status;
        }
      }
      
      cache.value = {};
      if (detailsCache.value[id]) delete detailsCache.value[id];
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update bill status';
      throw err;
    }
  };

  const deleteBill = async (id: string) => {
    try {
      await api.delete(`/bills/${id}`);
      cache.value = {}; // Clear cache
      if (detailsCache.value[id]) delete detailsCache.value[id];
      useTrashStore().markStale();
      await fetchBills(pagination.value.page, pagination.value.limit, "", "All", true);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete bill';
      throw err;
    }
  };

  const bulkDeleteBills = async (ids: string[]) => {
    try {
      const response = await api.post('/bills/bulk-delete', { ids });
      cache.value = {};
      ids.forEach((id) => {
        if (detailsCache.value[id]) delete detailsCache.value[id];
      });
      useTrashStore().markStale();
      await fetchBills(pagination.value.page, pagination.value.limit, lastSearch.value, lastStatus.value, true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete bills';
      throw err;
    }
  };

  const bulkUpdateBillStatus = async (ids: string[], status: Bill['status']) => {
    try {
      const response = await api.patch('/bills/bulk-status', { ids, status });
      cache.value = {};
      ids.forEach((id) => {
        if (detailsCache.value[id]) delete detailsCache.value[id];
      });
      await fetchBills(pagination.value.page, pagination.value.limit, lastSearch.value, lastStatus.value, true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update bill statuses';
      throw err;
    }
  };

  const stats = computed(() => {
    const now = new Date();
    const totalOutstanding = bills.value
      .filter((b) => b.status === 'Outstanding' || b.status === 'Overdue')
      .reduce((sum, b) => sum + b.amount, 0);
    
    const overdue = bills.value
      .filter((b) => {
        const isOutstanding = b.status === 'Outstanding' || b.status === 'Overdue';
        const isPastDue = b.dueDate && new Date(b.dueDate) < now;
        return isOutstanding && isPastDue;
      })
      .reduce((sum, b) => sum + b.amount, 0);

    const paid = bills.value
      .filter((b) => b.status === 'Paid')
      .reduce((sum, b) => sum + b.amount, 0);

    return { totalOutstanding, overdue, paid };
  });

  const reset = () => {
    bills.value = [];
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
    bills,
    pagination,
    loading,
    error,
    stats,
    detailsCache,
    fetchBills,
    fetchBillDetails,
    fetchNextBillNumber,
    addBill,
    updateBill,
    updateBillStatus,
    bulkDeleteBills,
    bulkUpdateBillStatus,
    deleteBill,
    reset,
  };
});

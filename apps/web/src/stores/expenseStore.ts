import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/lib/api';
import { useTrashStore } from './trashStore';

export interface Expense {
  id: string;
  date: string;
  expenseAccount: string;
  amount: number;
  paidThrough: string;
  vendor?: string;
  vendorId?: string;
  invoiceNumber?: string;
  notes?: string;
  customerId?: string;
  status?: string;
  taxCredit?: boolean;
  reverseCharge?: boolean;
  customers?: { name: string };
  created_at?: string;
  referenceNumber?: string;
  isBillable?: boolean;
  attachmentUrl?: string;
  taxRate?: number;
  taxAmount?: number;
  customFields?: any;
}

export const useExpenseStore = defineStore('expense', () => {
  const expenses = ref<Expense[]>([]);
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const loading = ref(false);
  const fetched = ref(false);
  const cache = ref<Record<string, { data: Expense[], meta: any }>>({});
  const lastSearch = ref("");
  const error = ref<string | null>(null);

  const paymentAccounts = ref<string[]>([]);
  const paymentAccountsFetched = ref(false);

  const fetchPaymentAccounts = async (force = false) => {
    if (paymentAccountsFetched.value && !force) return;
    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/organizations/payment-accounts');
      paymentAccounts.value = response.data;
      paymentAccountsFetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch payment accounts';
    } finally {
      loading.value = false;
    }
  };

  const addPaymentAccount = async (name: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post('/organizations/payment-accounts', { name });
      paymentAccounts.value.push(response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add payment account';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchExpenses = async (
    page = 1,
    limit = 10,
    search = "",
    force = false,
    extraParams?: { timeframe?: string; minAmount?: number | null; maxAmount?: number | null; bookmarkedOnly?: boolean }
  ) => {
    const timeframe = extraParams?.timeframe || "all";
    const minAmount = extraParams?.minAmount ?? "";
    const maxAmount = extraParams?.maxAmount ?? "";
    const bookmarkedOnly = extraParams?.bookmarkedOnly ? "true" : "false";
    const cacheKey = `${page}-${limit}-${search}-${timeframe}-${minAmount}-${maxAmount}-${bookmarkedOnly}`;
    
    if (!force && cache.value[cacheKey]) {
      expenses.value = cache.value[cacheKey].data;
      pagination.value = cache.value[cacheKey].meta;
      lastSearch.value = search;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const queryParams: Record<string, any> = { page, limit, search };
      if (timeframe && timeframe !== "all") queryParams.timeframe = timeframe;
      if (minAmount !== "") queryParams.minAmount = minAmount;
      if (maxAmount !== "") queryParams.maxAmount = maxAmount;
      if (extraParams?.bookmarkedOnly) queryParams.bookmarkedOnly = "true";

      const response = await api.get('/expenses', {
        params: queryParams
      });
      
      const responseData = response.data.data;
      const responseMeta = response.data.meta;
      
      expenses.value = responseData;
      pagination.value = responseMeta;
      
      cache.value[cacheKey] = { data: responseData, meta: responseMeta };
      
      lastSearch.value = search;
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch expenses';
    } finally {
      loading.value = false;
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    loading.value = true;
    try {
      const response = await api.post('/expenses', expense);
      cache.value = {}; // Clear cache
      await fetchExpenses(1, pagination.value.limit, "", true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add expense';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await api.delete(`/expenses/${id}`);
      cache.value = {}; // Clear cache
      useTrashStore().markStale();
      await fetchExpenses(pagination.value.page, pagination.value.limit, "", true);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete expense';
      throw err;
    }
  };

  const bulkDeleteExpenses = async (ids: string[]) => {
    try {
      const response = await api.post('/expenses/bulk-delete', { ids });
      cache.value = {};
      useTrashStore().markStale();
      await fetchExpenses(pagination.value.page, pagination.value.limit, lastSearch.value, lastCategory.value, true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete expenses';
      throw err;
    }
  };

  const stats = computed(() => {
    const total = expenses.value.reduce((sum, e) => sum + e.amount, 0);
    
    const last30Days = expenses.value
      .filter((e) => new Date(e.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, e) => sum + e.amount, 0);

    // Calculate top category
    const categories: Record<string, number> = {};
    expenses.value.forEach(e => {
      categories[e.expenseAccount] = (categories[e.expenseAccount] || 0) + e.amount;
    });
    
    const topCategory = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { total, last30Days, topCategory };
  });

  const reset = () => {
    expenses.value = [];
    pagination.value = {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0
    };
    cache.value = {};
    lastSearch.value = "";
    fetched.value = false;
    error.value = null;
    paymentAccounts.value = [];
    paymentAccountsFetched.value = false;
  };

  return {
    expenses,
    pagination,
    loading,
    error,
    stats,
    paymentAccounts,
    paymentAccountsFetched,
    fetchPaymentAccounts,
    addPaymentAccount,
    fetchExpenses,
    addExpense,
    deleteExpense,
    bulkDeleteExpenses,
    reset,
  };
});

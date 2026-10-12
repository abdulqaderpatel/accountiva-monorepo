import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/lib/api';
import { useTrashStore } from './trashStore';

export interface Customer {
  id: string;
  name: string;
  customerCode?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  billingAddress?: string;
  shippingAddress?: string;
  paymentTerms?: string;
  currency?: string;
  website?: string;
  notes?: string;
  gstTreatment?: string;
  gstNumber?: string;
  pan?: string;
  created_at?: string;
  outstandingBalance?: number;
  opening_balance?: number;
  customFields?: any;
}

export const useCustomerStore = defineStore('customer', () => {
  const customers = ref<Customer[]>([]);
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const loading = ref(false);
  const fetched = ref(false);
  const cache = ref<Record<string, { data: Customer[], meta: any }>>({});
  const detailsCache = ref<Record<string, any>>({});
  const lastSearch = ref("");
  const error = ref<string | null>(null);

  const fetchCustomers = async (page = 1, limit = 10, search = "", force = false) => {
    const cacheKey = `${page}-${limit}-${search}`;
    
    if (!force && cache.value[cacheKey]) {
      customers.value = cache.value[cacheKey].data;
      pagination.value = cache.value[cacheKey].meta;
      lastSearch.value = search;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/customers', {
        params: { page, limit, search }
      });
      
      const responseData = response.data.data;
      const responseMeta = response.data.meta;
      
      customers.value = responseData;
      pagination.value = responseMeta;
      
      // Store in cache
      cache.value[cacheKey] = { data: responseData, meta: responseMeta };
      
      lastSearch.value = search;
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch customers';
    } finally {
      loading.value = false;
    }
  };

  const addCustomer = async (customer: Omit<Customer, 'id'>) => {
    loading.value = true;
    try {
      const response = await api.post('/customers', customer);
      cache.value = {}; // Clear cache to ensure fresh data
      detailsCache.value = {};
      await fetchCustomers(1, pagination.value.limit, "", true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add customer';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const importCustomers = async (file: File) => {
    loading.value = true;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/customers/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      cache.value = {}; // Clear cache
      detailsCache.value = {};
      await fetchCustomers(1, pagination.value.limit, "", true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to import customers';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await api.delete(`/customers/${id}`);
      cache.value = {}; // Clear cache
      if (detailsCache.value[id]) delete detailsCache.value[id];
      useTrashStore().markStale();
      await fetchCustomers(pagination.value.page, pagination.value.limit, "", true);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete customer';
      throw err;
    }
  };

  const bulkDeleteCustomers = async (ids: string[]) => {
    try {
      const response = await api.post('/customers/bulk-delete', { ids });
      cache.value = {};
      ids.forEach((id) => {
        if (detailsCache.value[id]) delete detailsCache.value[id];
      });
      useTrashStore().markStale();
      await fetchCustomers(pagination.value.page, pagination.value.limit, lastSearch.value, true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete customers';
      throw err;
    }
  };

  const updateCustomer = async (id: string, customer: Partial<Customer>) => {
    loading.value = true;
    try {
      const response = await api.put(`/customers/${id}`, customer);
      cache.value = {};
      detailsCache.value = {};
      await fetchCustomers(pagination.value.page, pagination.value.limit, lastSearch.value, true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update customer';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchCustomerDetails = async (id: string, force = false) => {
    if (!force && detailsCache.value[id]) {
      return detailsCache.value[id];
    }
    error.value = null;
    try {
      const response = await api.get(`/customers/${id}`);
      detailsCache.value[id] = response.data;
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch customer details';
      throw err;
    }
  };

  const fetchGstDetails = async (gstin: string) => {
    try {
      const response = await api.get(`/customers/gstin/${gstin}`);
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const reset = () => {
    customers.value = [];
    pagination.value = {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0
    };
    cache.value = {};
    detailsCache.value = {};
    lastSearch.value = "";
    fetched.value = false;
    error.value = null;
  };

  return {
    customers,
    pagination,
    loading,
    error,
    detailsCache,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    importCustomers,
    deleteCustomer,
    bulkDeleteCustomers,
    fetchCustomerDetails,
    fetchGstDetails,
    reset,
  };
});

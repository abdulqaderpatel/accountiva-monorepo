import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/lib/api';
import { useTrashStore } from './trashStore';

export interface Vendor {
  id: string;
  name: string;
  vendorCode?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  gst_number?: string;
  gst_treatment?: string;
  pan?: string;
  payment_terms?: string;
  currency?: string;
  website?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  notes?: string;
  created_at?: string;
  outstandingBalance?: number;
  opening_balance?: number;
  customFields?: any;
}

export const useVendorStore = defineStore('vendor', () => {
  const vendors = ref<Vendor[]>([]);
  const loading = ref(false);
  const fetched = ref(false);
  const error = ref<string | null>(null);

  const fetchVendors = async (force = false) => {
    if (!force && fetched.value) return;

    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/vendors');
      vendors.value = response.data;
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch vendors';
    } finally {
      loading.value = false;
    }
  };

  const addVendor = async (vendor: Omit<Vendor, 'id'>) => {
    loading.value = true;
    try {
      const response = await api.post('/vendors', vendor);
      await fetchVendors(true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add vendor';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateVendor = async (id: string, vendor: Partial<Vendor>) => {
    loading.value = true;
    try {
      const response = await api.put(`/vendors/${id}`, vendor);
      await fetchVendors(true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update vendor';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteVendor = async (id: string) => {
    loading.value = true;
    try {
      await api.delete(`/vendors/${id}`);
      useTrashStore().markStale();
      await fetchVendors(true);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete vendor';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const bulkDeleteVendors = async (ids: string[]) => {
    loading.value = true;
    try {
      const response = await api.post('/vendors/bulk-delete', { ids });
      useTrashStore().markStale();
      await fetchVendors(true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete vendors';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    vendors.value = [];
    fetched.value = false;
    error.value = null;
  };

  return {
    vendors,
    loading,
    error,
    fetchVendors,
    addVendor,
    updateVendor,
    deleteVendor,
    bulkDeleteVendors,
    reset,
  };
});

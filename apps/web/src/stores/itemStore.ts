import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/lib/api';
import { useTrashStore } from './trashStore';

export interface Item {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  sku?: string;
  taxRate?: number;
  type: 'Product' | 'Service';
  productType?: 'Inventory' | 'Non-Inventory' | null;
  category?: string;
  uom?: string;
  hsnSacCode?: string;
  taxPreference?: 'Taxable' | 'Non-Taxable' | 'Out of Scope' | 'Exempt';
  imageUrl?: string;
  isSellable?: boolean;
  sellingPrice?: number;
  salesTaxInclusive?: boolean;
  salesTaxRate?: number;
  incomeAccount?: string;
  salesDescription?: string;
  isPurchasable?: boolean;
  costPrice?: number;
  purchaseTaxInclusive?: boolean;
  purchaseTaxRate?: number;
  expenseAccount?: string;
  preferredVendorId?: string | null;
  purchaseDescription?: string;
  inventoryAccount?: string;
  openingStock?: number;
  stockOnHand?: number;
  valuationRate?: number;
  asOfDate?: string | null;
  reorderPoint?: number;
  created_at?: string;
}

export const useItemStore = defineStore('item', () => {
  const items = ref<Item[]>([]);
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    totalItems: 0,
    activeInventoryCount: 0,
    totalStockValue: 0,
    lowStockAlertsCount: 0,
  });
  const loading = ref(false);
  const fetched = ref(false);
  const cache = ref<Record<string, { data: Item[], meta: any }>>({});
  const lastSearch = ref("");
  const lastTypeFilter = ref("All");
  const error = ref<string | null>(null);
  const categories = ref<string[]>([]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/items/categories');
      categories.value = res.data;
    } catch (e) {
      console.error("Failed to fetch item categories:", e);
    }
  };

  const fetchItems = async (page = 1, limit = 10, search = "", type = "All", force = false) => {
    const cacheKey = `${page}-${limit}-${search}-${type}`;
    
    if (!force && cache.value[cacheKey]) {
      items.value = cache.value[cacheKey].data;
      pagination.value = cache.value[cacheKey].meta;
      lastSearch.value = search;
      lastTypeFilter.value = type;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/items', {
        params: { page, limit, search, type }
      });
      
      const responseData = response.data.data;
      const responseMeta = response.data.meta;
      
      items.value = responseData;
      pagination.value = {
        total: responseMeta.total || 0,
        page: responseMeta.page || page,
        limit: responseMeta.limit || limit,
        totalPages: responseMeta.totalPages || 0,
        totalItems: responseMeta.totalItems || responseMeta.total || 0,
        activeInventoryCount: responseMeta.activeInventoryCount || 0,
        totalStockValue: responseMeta.totalStockValue || 0,
        lowStockAlertsCount: responseMeta.lowStockAlertsCount || 0,
      };
      
      cache.value[cacheKey] = { data: responseData, meta: pagination.value };
      
      lastSearch.value = search;
      lastTypeFilter.value = type;
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch items';
    } finally {
      loading.value = false;
    }
  };

  const addItem = async (item: Partial<Item>) => {
    loading.value = true;
    try {
      const response = await api.post('/items', item);
      cache.value = {}; // Clear cache
      await fetchItems(1, pagination.value.limit, "", lastTypeFilter.value, true);
      await fetchCategories();
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add item';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateItem = async (id: string, item: Partial<Item>) => {
    loading.value = true;
    try {
      const response = await api.put(`/items/${id}`, item);
      cache.value = {}; // Clear cache
      await fetchItems(pagination.value.page, pagination.value.limit, lastSearch.value, lastTypeFilter.value, true);
      await fetchCategories();
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update item';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await api.delete(`/items/${id}`);
      cache.value = {}; // Clear cache
      useTrashStore().markStale();
      await fetchItems(pagination.value.page, pagination.value.limit, lastSearch.value, lastTypeFilter.value, true);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete item';
      throw err;
    }
  };

  const bulkDeleteItems = async (ids: string[]) => {
    try {
      const response = await api.post('/items/bulk-delete', { ids });
      cache.value = {}; // Clear cache
      useTrashStore().markStale();
      await fetchItems(pagination.value.page, pagination.value.limit, lastSearch.value, lastTypeFilter.value, true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete items';
      throw err;
    }
  };

  const reset = () => {
    items.value = [];
    pagination.value = {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
      totalItems: 0,
      activeInventoryCount: 0,
      totalStockValue: 0,
      lowStockAlertsCount: 0,
    };
    cache.value = {};
    lastSearch.value = "";
    lastTypeFilter.value = "All";
    fetched.value = false;
    error.value = null;
  };

  return {
    items,
    pagination,
    loading,
    error,
    categories,
    fetchCategories,
    fetchItems,
    addItem,
    updateItem,
    deleteItem,
    bulkDeleteItems,
    reset,
  };
});

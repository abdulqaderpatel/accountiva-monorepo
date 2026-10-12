import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/lib/api';
import { toast } from 'vue-sonner';

export interface TrashItem {
  id: string;
  entityType:
    | 'invoice'
    | 'bill'
    | 'expense'
    | 'customer'
    | 'vendor'
    | 'item'
    | 'estimate'
    | 'credit_note'
    | 'journal';
  title: string;
  subtitle: string;
  amount?: number | null;
  deletedAt: string;
  deletedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  daysRemaining: number;
}

export interface TrashCounts {
  all: number;
  invoices: number;
  bills: number;
  expenses: number;
  customers: number;
  vendors: number;
  items: number;
  estimates: number;
  credit_notes: number;
  journals: number;
}

export const useTrashStore = defineStore('trash', () => {
  const items = ref<TrashItem[]>([]);
  const counts = ref<TrashCounts>({
    all: 0,
    invoices: 0,
    bills: 0,
    expenses: 0,
    customers: 0,
    vendors: 0,
    items: 0,
    estimates: 0,
    credit_notes: 0,
    journals: 0,
  });

  const pagination = ref({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  const loading = ref(false);
  const actionLoading = ref(false);
  const isStale = ref(false);
  const selectedEntityType = ref<string>('all');
  const searchQuery = ref('');

  const totalTrashCount = computed(() => counts.value.all);

  const markStale = () => {
    isStale.value = true;
  };

  const fetchTrash = async (page = 1, limit = 20, entityType = selectedEntityType.value, search = searchQuery.value) => {
    loading.value = true;
    try {
      const response = await api.get('/trash', {
        params: {
          page,
          limit,
          entityType,
          search: search.trim() || undefined,
          _t: Date.now(),
        },
      });

      items.value = response.data.items || [];
      counts.value = response.data.counts || counts.value;
      pagination.value = response.data.pagination || pagination.value;
      selectedEntityType.value = entityType;
      searchQuery.value = search;
      isStale.value = false;
    } catch (err: any) {
      console.error('Failed to fetch trash items:', err);
      toast.error(err.response?.data?.error || 'Failed to load trash items');
    } finally {
      loading.value = false;
    }
  };

  const restoreItem = async (entityType: string, id: string) => {
    actionLoading.value = true;
    try {
      const response = await api.post('/trash/restore', { entityType, id });
      toast.success(response.data.message || 'Item restored successfully');
      await fetchTrash(pagination.value.page, pagination.value.limit);
      return true;
    } catch (err: any) {
      console.error('Failed to restore item:', err);
      toast.error(err.response?.data?.error || 'Failed to restore item');
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const restoreBulk = async (itemsToRestore: Array<{ entityType: string; id: string }>) => {
    if (itemsToRestore.length === 0) return false;
    actionLoading.value = true;
    try {
      const response = await api.post('/trash/restore', { items: itemsToRestore });
      toast.success(response.data.message || `Restored ${itemsToRestore.length} item(s)`);
      await fetchTrash(pagination.value.page, pagination.value.limit);
      return true;
    } catch (err: any) {
      console.error('Failed to bulk restore items:', err);
      toast.error(err.response?.data?.error || 'Failed to restore selected items');
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const permanentlyDeleteItem = async (entityType: string, id: string) => {
    actionLoading.value = true;
    try {
      const response = await api.delete('/trash/permanent', {
        data: { items: [{ entityType, id }] },
      });
      toast.success(response.data.message || 'Item permanently deleted');
      await fetchTrash(pagination.value.page, pagination.value.limit);
      return true;
    } catch (err: any) {
      console.error('Failed to permanently delete item:', err);
      toast.error(err.response?.data?.error || 'Failed to permanently delete item');
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const permanentlyDeleteBulk = async (itemsToDelete: Array<{ entityType: string; id: string }>) => {
    if (itemsToDelete.length === 0) return false;
    actionLoading.value = true;
    try {
      const response = await api.delete('/trash/permanent', {
        data: { items: itemsToDelete },
      });
      toast.success(response.data.message || `Permanently deleted ${itemsToDelete.length} item(s)`);
      await fetchTrash(pagination.value.page, pagination.value.limit);
      return true;
    } catch (err: any) {
      console.error('Failed to bulk permanently delete items:', err);
      toast.error(err.response?.data?.error || 'Failed to delete selected items');
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const emptyTrash = async () => {
    actionLoading.value = true;
    try {
      const response = await api.post('/trash/empty');
      toast.success(response.data.message || 'Trash emptied successfully');
      await fetchTrash(1, pagination.value.limit);
      return true;
    } catch (err: any) {
      console.error('Failed to empty trash:', err);
      toast.error(err.response?.data?.error || 'Failed to empty trash');
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const reset = () => {
    items.value = [];
    counts.value = {
      all: 0,
      invoices: 0,
      bills: 0,
      expenses: 0,
      customers: 0,
      vendors: 0,
      items: 0,
      estimates: 0,
      credit_notes: 0,
      journals: 0,
    };
    pagination.value = {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
    loading.value = false;
    actionLoading.value = false;
    selectedEntityType.value = 'all';
    searchQuery.value = '';
  };

  return {
    items,
    counts,
    pagination,
    loading,
    actionLoading,
    selectedEntityType,
    searchQuery,
    totalTrashCount,
    fetchTrash,
    restoreItem,
    restoreBulk,
    permanentlyDeleteItem,
    permanentlyDeleteBulk,
    emptyTrash,
    reset,
    isStale,
    markStale,
  };
});

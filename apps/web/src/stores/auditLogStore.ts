import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/lib/api';
import { useAuthStore } from './authStore';

export const useAuditLogStore = defineStore('auditLog', () => {
  const logs = ref<any[]>([]);
  const totalLogs = ref(0);
  const totalPages = ref(1);
  const currentPage = ref(1);
  const limit = ref(10);
  const loading = ref(false);
  const fetched = ref(false);
  const error = ref<string | null>(null);

  // Filters
  const search = ref('');
  const actionFilter = ref('');
  const entityTypeFilter = ref('');
  const userFilter = ref('');
  const startDate = ref('');
  const endDate = ref('');

  // Filter Options from API
  const filterOptions = ref({
    actions: [] as string[],
    entityTypes: [] as string[],
    users: [] as any[],
  });

  const cache = ref<Record<string, { data: any[], meta: any }>>({});
  const filterOptionsFetched = ref(false);

  const fetchFilterOptions = async (orgId?: string, force = false) => {
    if (!orgId) return;
    if (!force && filterOptionsFetched.value) return;

    try {
      const res = await api.get('/audit-logs/filters');
      
      // Guard against race conditions when switching organizations
      const authStore = useAuthStore();
      if (authStore.currentOrganization?.id !== orgId) {
        return;
      }

      filterOptions.value = res.data;
      filterOptionsFetched.value = true;
    } catch (err: any) {
      console.error('Failed to fetch audit log filters:', err);
    }
  };

  const fetchLogs = async (orgId?: string, force = false) => {
    if (!orgId) return;

    const cacheKey = `${currentPage.value}-${limit.value}-${search.value}-${actionFilter.value}-${entityTypeFilter.value}-${userFilter.value}-${startDate.value}-${endDate.value}`;

    if (!force && cache.value[cacheKey]) {
      logs.value = cache.value[cacheKey].data;
      const meta = cache.value[cacheKey].meta;
      totalLogs.value = meta.total;
      totalPages.value = meta.totalPages;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const params: any = {
        page: currentPage.value,
        limit: limit.value,
      };

      if (search.value) params.search = search.value;
      if (actionFilter.value) params.action = actionFilter.value;
      if (entityTypeFilter.value) params.entityType = entityTypeFilter.value;
      if (userFilter.value) params.userId = userFilter.value;
      if (startDate.value) params.startDate = startDate.value;
      if (endDate.value) params.endDate = endDate.value;

      const res = await api.get('/audit-logs', { params });

      // Guard against race conditions when switching organizations
      const authStore = useAuthStore();
      if (authStore.currentOrganization?.id !== orgId) {
        return;
      }

      logs.value = res.data.data;
      totalLogs.value = res.data.meta.total;
      totalPages.value = res.data.meta.totalPages;

      cache.value[cacheKey] = {
        data: res.data.data,
        meta: res.data.meta,
      };
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch audit logs';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    logs.value = [];
    totalLogs.value = 0;
    totalPages.value = 1;
    currentPage.value = 1;
    limit.value = 10;
    loading.value = false;
    fetched.value = false;
    error.value = null;
    cache.value = {};

    search.value = '';
    actionFilter.value = '';
    entityTypeFilter.value = '';
    userFilter.value = '';
    startDate.value = '';
    endDate.value = '';

    filterOptions.value = {
      actions: [],
      entityTypes: [],
      users: [],
    };
    filterOptionsFetched.value = false;
  };

  return {
    logs,
    totalLogs,
    totalPages,
    currentPage,
    limit,
    loading,
    fetched,
    error,
    search,
    actionFilter,
    entityTypeFilter,
    userFilter,
    startDate,
    endDate,
    filterOptions,
    fetchFilterOptions,
    fetchLogs,
    reset,
  };
});

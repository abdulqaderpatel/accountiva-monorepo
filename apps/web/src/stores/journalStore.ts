import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/lib/api';

export interface JournalItem {
  id?: string;
  account: string;
  description?: string;
  contactId?: string;
  debits: number;
  credits: number;
}

export interface Journal {
  id: string;
  journalNumber: string;
  date: string;
  notes?: string;
  status: string;
  amount: number;
  items?: JournalItem[];
}

export const useJournalStore = defineStore('journal', () => {
  const journals = ref<Journal[]>([]);
  const loading = ref(false);
  const fetched = ref(false);
  const error = ref<string | null>(null);
  const lastSearch = ref("");

  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const cache = ref<Record<string, { data: Journal[]; meta: any }>>({});
  const detailsCache = ref<Record<string, Journal>>({});

  const fetchJournals = async (page = 1, limit = 10, search = "", force = false) => {
    const cacheKey = `${page}-${limit}-${search}`;
    
    if (!force && cache.value[cacheKey]) {
      journals.value = cache.value[cacheKey].data;
      pagination.value = cache.value[cacheKey].meta;
      lastSearch.value = search;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/journals', {
        params: { page, limit, search }
      });
      
      const responseData = response.data.data;
      const responseMeta = response.data.meta;
      
      journals.value = responseData;
      pagination.value = responseMeta;
      
      cache.value[cacheKey] = { data: responseData, meta: responseMeta };
      lastSearch.value = search;
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch journal entries';
    } finally {
      loading.value = false;
    }
  };

  const getJournalById = async (id: string, force = false) => {
    if (!force && detailsCache.value[id]) {
      return detailsCache.value[id];
    }
    try {
      const response = await api.get(`/journals/${id}`);
      detailsCache.value[id] = response.data;
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const addJournal = async (journal: any) => {
    loading.value = true;
    try {
      const response = await api.post('/journals', journal);
      cache.value = {}; // Clear cache to ensure fresh data
      detailsCache.value = {};
      await fetchJournals(1, pagination.value.limit, "", true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add journal entry';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateJournal = async (id: string, journal: any) => {
    loading.value = true;
    try {
      const response = await api.put(`/journals/${id}`, journal);
      cache.value = {};
      detailsCache.value = {};
      await fetchJournals(pagination.value.page, pagination.value.limit, lastSearch.value, true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update journal entry';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteJournal = async (id: string) => {
    try {
      await api.delete(`/journals/${id}`);
      cache.value = {};
      if (detailsCache.value[id]) delete detailsCache.value[id];
      await fetchJournals(pagination.value.page, pagination.value.limit, lastSearch.value, true);
    } catch (err: any) {
      throw err;
    }
  };
  const reset = () => {
    journals.value = [];
    pagination.value = {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
    cache.value = {};
    detailsCache.value = {};
    lastSearch.value = "";
    fetched.value = false;
    error.value = null;
  };
  return {
    journals,
    loading,
    fetched,
    error,
    pagination,
    detailsCache,
    fetchJournals,
    getJournalById,
    addJournal,
    updateJournal,
    deleteJournal,
    reset,
  };
});

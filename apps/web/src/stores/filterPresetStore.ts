import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/lib/api';

export interface FilterPreset {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  is_system?: boolean;
  is_default?: boolean;
  is_pinned?: boolean;
  filters: {
    status?: string;
    timeframe?: string; // 'all' | 'overdue' | 'due_soon' | 'this_month'
    minAmount?: number;
    maxAmount?: number;
    bookmarkedOnly?: boolean;
    search?: string;
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_SYSTEM_PRESETS: Record<string, FilterPreset[]> = {
  invoices: [
    {
      id: 'inv_all',
      name: 'All Invoices',
      description: 'Complete list of all invoices',
      icon: 'FileText',
      color: 'default',
      is_system: true,
      is_pinned: true,
      filters: { status: 'All', timeframe: 'all' },
    },
    {
      id: 'inv_overdue',
      name: 'Unpaid & Overdue',
      description: 'Invoices past their payment due date requiring collection',
      icon: 'AlertCircle',
      color: 'default',
      is_system: true,
      is_pinned: true,
      filters: { status: 'Outstanding', timeframe: 'overdue' },
    },
    {
      id: 'inv_high_value',
      name: 'High Value (> ₹50k)',
      description: 'Invoices with total amount ₹50,000 and above',
      icon: 'TrendingUp',
      color: 'default',
      is_system: true,
      is_pinned: true,
      filters: { minAmount: 50000 },
    },
  ],
  bills: [
    {
      id: 'bill_all',
      name: 'All Bills',
      description: 'All vendor bills',
      icon: 'Receipt',
      color: 'default',
      is_system: true,
      is_pinned: true,
      filters: { status: 'All', timeframe: 'all' },
    },
    {
      id: 'bill_overdue',
      name: 'Unpaid & Overdue',
      description: 'Unpaid vendor bills past their due date',
      icon: 'AlertCircle',
      color: 'default',
      is_system: true,
      is_pinned: true,
      filters: { status: 'Outstanding', timeframe: 'overdue' },
    },
    {
      id: 'bill_high_value',
      name: 'High Value (> ₹50k)',
      description: 'Bills with total amount ₹50,000 and above',
      icon: 'TrendingUp',
      color: 'default',
      is_system: true,
      is_pinned: true,
      filters: { minAmount: 50000 },
    },
  ],
  expenses: [
    {
      id: 'exp_all',
      name: 'All Expenses',
      description: 'All recorded expenses',
      icon: 'Wallet',
      color: 'default',
      is_system: true,
      is_pinned: true,
      filters: { timeframe: 'all' },
    },
    {
      id: 'exp_this_month',
      name: 'This Month',
      description: 'Expenses logged in the current calendar month',
      icon: 'Calendar',
      color: 'default',
      is_system: true,
      is_pinned: true,
      filters: { timeframe: 'this_month' },
    },
    {
      id: 'exp_high_value',
      name: 'High Expenses (> ₹10k)',
      description: 'Expenses of ₹10,000 or higher',
      icon: 'TrendingUp',
      color: 'default',
      is_system: true,
      is_pinned: true,
      filters: { minAmount: 10000 },
    },
  ],
};

export const useFilterPresetStore = defineStore('filterPresets', () => {
  const systemPresetsByEntity = ref<Record<string, FilterPreset[]>>({
    invoices: [...DEFAULT_SYSTEM_PRESETS.invoices],
    bills: [...DEFAULT_SYSTEM_PRESETS.bills],
    expenses: [...DEFAULT_SYSTEM_PRESETS.expenses],
  });
  const customPresetsByEntity = ref<Record<string, FilterPreset[]>>({});
  const activePresetByEntity = ref<Record<string, FilterPreset | null>>({
    invoices: DEFAULT_SYSTEM_PRESETS.invoices[0],
    bills: DEFAULT_SYSTEM_PRESETS.bills[0],
    expenses: DEFAULT_SYSTEM_PRESETS.expenses[0],
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  const getSystemPresets = (entityType: string) => {
    const list = systemPresetsByEntity.value[entityType];
    if (list && list.length > 0) return list;
    return DEFAULT_SYSTEM_PRESETS[entityType] || [];
  };

  const getCustomPresets = (entityType: string) => {
    return customPresetsByEntity.value[entityType] || [];
  };

  const getPinnedPresets = (entityType: string) => {
    const system = getSystemPresets(entityType).filter((p) => p.is_pinned);
    const custom = getCustomPresets(entityType).filter((p) => p.is_pinned);
    return [...system, ...custom];
  };

  const getActivePreset = (entityType: string) => {
    return activePresetByEntity.value[entityType] || getSystemPresets(entityType)[0] || null;
  };

  const fetchPresets = async (entityType: string) => {
    loading.value = true;
    error.value = null;
    try {
      // Notice: api has baseURL='/api', so we request '/filter-presets'
      const res = await api.get('/filter-presets', {
        params: { entity_type: entityType },
      });
      if (res.data?.systemPresets && res.data.systemPresets.length > 0) {
        systemPresetsByEntity.value[entityType] = res.data.systemPresets;
      }
      customPresetsByEntity.value[entityType] = res.data?.customPresets || [];

      // Check if there is a default custom preset
      const defaultCustom = (res.data?.customPresets || []).find((p: FilterPreset) => p.is_default);
      if (defaultCustom) {
        activePresetByEntity.value[entityType] = defaultCustom;
      }

      return {
        systemPresets: systemPresetsByEntity.value[entityType],
        customPresets: customPresetsByEntity.value[entityType],
      };
    } catch (err: any) {
      console.error('[FilterPresetsStore] fetch error:', err);
      // Keep default system presets on failure so UI remains functional
      error.value = err.response?.data?.error || 'Failed to load filter presets';
    } finally {
      loading.value = false;
    }
  };

  const createPreset = async (payload: {
    entity_type: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    is_default?: boolean;
    is_pinned?: boolean;
    filters: Record<string, any>;
  }) => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.post('/filter-presets', payload);
      const created = res.data;
      const entity = payload.entity_type.toLowerCase();

      // If set as default, clear default status from other presets in memory
      if (created.is_default) {
        customPresetsByEntity.value[entity]?.forEach((p) => {
          if (p.id !== created.id) p.is_default = false;
        });
      }

      if (!customPresetsByEntity.value[entity]) {
        customPresetsByEntity.value[entity] = [];
      }
      customPresetsByEntity.value[entity].unshift(created);
      activePresetByEntity.value[entity] = created;

      return created;
    } catch (err: any) {
      console.error('[FilterPresetsStore] create error:', err);
      error.value = err.response?.data?.error || 'Failed to create filter preset';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updatePreset = async (id: string, entityType: string, updates: Partial<FilterPreset>) => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.put(`/filter-presets/${id}`, updates);
      const updated = res.data;
      const entity = entityType.toLowerCase();

      const list = customPresetsByEntity.value[entity] || [];
      const index = list.findIndex((p) => p.id === id);
      if (index !== -1) {
        list[index] = updated;
      }

      if (activePresetByEntity.value[entity]?.id === id) {
        activePresetByEntity.value[entity] = updated;
      }

      return updated;
    } catch (err: any) {
      console.error('[FilterPresetsStore] update error:', err);
      error.value = err.response?.data?.error || 'Failed to update filter preset';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const togglePin = async (id: string, entityType: string) => {
    try {
      const res = await api.post(`/filter-presets/${id}/pin`);
      const entity = entityType.toLowerCase();
      const list = customPresetsByEntity.value[entity] || [];
      const preset = list.find((p) => p.id === id);
      if (preset) {
        preset.is_pinned = res.data.is_pinned;
      }
      return res.data;
    } catch (err: any) {
      console.error('[FilterPresetsStore] togglePin error:', err);
      throw err;
    }
  };

  const deletePreset = async (id: string, entityType: string) => {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/filter-presets/${id}`);
      const entity = entityType.toLowerCase();
      if (customPresetsByEntity.value[entity]) {
        customPresetsByEntity.value[entity] = customPresetsByEntity.value[entity].filter(
          (p) => p.id !== id
        );
      }

      // If active preset was deleted, fall back to "all" system preset
      if (activePresetByEntity.value[entity]?.id === id) {
        const fallback = getSystemPresets(entity)[0] || null;
        activePresetByEntity.value[entity] = fallback;
      }
    } catch (err: any) {
      console.error('[FilterPresetsStore] delete error:', err);
      error.value = err.response?.data?.error || 'Failed to delete filter preset';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const setActivePreset = (entityType: string, preset: FilterPreset | null) => {
    activePresetByEntity.value[entityType] = preset;
  };

  return {
    systemPresetsByEntity,
    customPresetsByEntity,
    activePresetByEntity,
    loading,
    error,
    getSystemPresets,
    getCustomPresets,
    getPinnedPresets,
    getActivePreset,
    fetchPresets,
    createPreset,
    updatePreset,
    togglePin,
    deletePreset,
    setActivePreset,
  };
});

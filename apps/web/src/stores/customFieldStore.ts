import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/lib/api';

export type CustomFieldDataType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';

export type CustomFieldEntity =
  | 'invoice'
  | 'estimate'
  | 'credit_note'
  | 'bill'
  | 'expense'
  | 'customer'
  | 'vendor';

export interface CustomField {
  id: string;
  name: string;
  dataType: CustomFieldDataType;
  options: string[] | null;
  entities: string[];
  printOnDocument: boolean;
  isRequired: boolean;
  isActive: boolean;
  placeholder?: string | null;
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomFieldValueItem {
  id: string;
  customFieldId: string;
  name: string;
  dataType: CustomFieldDataType;
  options: string[] | null;
  printOnDocument: boolean;
  isRequired: boolean;
  value: any;
}

export interface CreateCustomFieldPayload {
  name: string;
  dataType: CustomFieldDataType;
  options?: string[] | null;
  entities: string[];
  printOnDocument?: boolean;
  isRequired?: boolean;
  isActive?: boolean;
  placeholder?: string | null;
  orderIndex?: number;
}

export interface UpdateCustomFieldPayload {
  name?: string;
  dataType?: CustomFieldDataType;
  options?: string[] | null;
  entities?: string[];
  printOnDocument?: boolean;
  isRequired?: boolean;
  isActive?: boolean;
  placeholder?: string | null;
  orderIndex?: number;
}

export const useCustomFieldStore = defineStore('customFields', () => {
  const fields = ref<CustomField[]>([]);
  const loading = ref(false);
  const fetched = ref(false);
  const error = ref<string | null>(null);

  const fetchCustomFields = async (force = false) => {
    if (!force && fetched.value) return;

    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/custom-fields');
      fields.value = response.data;
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch custom fields';
    } finally {
      loading.value = false;
    }
  };

  const getFieldsForEntity = computed(() => {
    return (entity: string) => {
      return fields.value
        .filter((f) => f.isActive && f.entities.includes(entity.toLowerCase()))
        .sort((a, b) => a.orderIndex - b.orderIndex);
    };
  });

  const createCustomField = async (payload: CreateCustomFieldPayload) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post('/custom-fields', payload);
      await fetchCustomFields(true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create custom field';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCustomField = async (id: string, payload: UpdateCustomFieldPayload) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.put(`/custom-fields/${id}`, payload);
      await fetchCustomFields(true);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update custom field';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const toggleCustomField = async (id: string) => {
    try {
      const response = await api.patch(`/custom-fields/${id}/toggle`);
      const target = fields.value.find((f) => f.id === id);
      if (target) {
        target.isActive = response.data.isActive;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to toggle custom field';
      throw err;
    }
  };

  const deleteCustomField = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/custom-fields/${id}`);
      fields.value = fields.value.filter((f) => f.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete custom field';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    fields.value = [];
    fetched.value = false;
    error.value = null;
  };

  return {
    fields,
    loading,
    fetched,
    error,
    fetchCustomFields,
    getFieldsForEntity,
    createCustomField,
    updateCustomField,
    toggleCustomField,
    deleteCustomField,
    reset,
  };
});


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getActiveOrganizationId } from '../client';

export function useCustomers(params?: { search?: string }) {
  const activeOrgId = getActiveOrganizationId();
  return useQuery({
    queryKey: ['customers', activeOrgId, params],
    queryFn: async () => {
      const { data } = await api.get('/customers', { params });
      return data;
    },
  });
}

export function useCustomer(id: string) {
  const activeOrgId = getActiveOrganizationId();
  return useQuery({
    queryKey: ['customers', activeOrgId, id],
    queryFn: async () => {
      const { data } = await api.get(`/customers/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/customers', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/customers/${id}`, payload);
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/customers/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useBulkImportCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      items,
      duplicateStrategy = 'skip',
    }: {
      items: any[];
      duplicateStrategy?: 'skip' | 'update' | 'error';
    }) => {
      const { data } = await api.post('/customers/bulk-import', {
        items,
        duplicateStrategy,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

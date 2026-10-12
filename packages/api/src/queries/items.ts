import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../client';

export interface ItemFilters {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export function useItems(filters?: ItemFilters) {
  return useQuery({
    queryKey: ['items', filters],
    queryFn: async () => {
      const { data } = await api.get('/items', { params: filters });
      return data;
    },
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id],
    queryFn: async () => {
      const { data } = await api.get(`/items/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/items', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/items/${id}`, payload);
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', id] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/items/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}


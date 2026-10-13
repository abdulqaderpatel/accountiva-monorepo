import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../client';

export interface EstimateFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useEstimates(filters?: EstimateFilters) {
  return useQuery({
    queryKey: ['estimates', filters],
    queryFn: async () => {
      const { data } = await api.get('/estimates', { params: filters });
      return data;
    },
  });
}

export function useEstimate(id: string) {
  return useQuery({
    queryKey: ['estimates', id],
    queryFn: async () => {
      const { data } = await api.get(`/estimates/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/estimates', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
}

export function useUpdateEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/estimates/${id}`, payload);
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['estimates', id] });
    },
  });
}

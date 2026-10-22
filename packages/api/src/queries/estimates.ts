import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EstimatePayload, EstimateStatus } from '@accountiva/shared';
import api from '../client';

export interface EstimateFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export type EstimateRecord = Partial<EstimatePayload> & {
  id?: string;
  estimateNumber?: string;
  [key: string]: unknown;
};

function readNextNumber(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('The next estimate number response was invalid.');
  }
  const nextNumber = (data as { nextNumber?: unknown }).nextNumber;
  if (typeof nextNumber !== 'string' || nextNumber.trim() === '') {
    throw new Error('The next estimate number response was invalid.');
  }
  return nextNumber.trim();
}

export async function fetchNextEstimateNumber(): Promise<string> {
  const { data } = await api.get('/estimates/next-number');
  return readNextNumber(data);
}

export async function createEstimate(payload: EstimatePayload): Promise<EstimateRecord> {
  const { data } = await api.post('/estimates', payload);
  return data;
}

export async function updateEstimate(id: string, payload: EstimatePayload): Promise<EstimateRecord> {
  const { data } = await api.patch(`/estimates/${id}`, payload);
  return data;
}

export async function updateEstimateStatus(id: string, status: EstimateStatus): Promise<EstimateRecord> {
  const { data } = await api.patch(`/estimates/${id}/status`, { status });
  return data;
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
    mutationFn: createEstimate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
}

export function useUpdateEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EstimatePayload }) =>
      updateEstimate(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['estimates', id] });
    },
  });
}

export function useUpdateEstimateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EstimateStatus }) =>
      updateEstimateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['estimates', id] });
    },
  });
}

export function useDeleteEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/estimates/${id}`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['estimates', id] });
    },
  });
}

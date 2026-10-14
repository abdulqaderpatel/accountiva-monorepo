import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../client';

export interface CreditNoteFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useCreditNotes(filters?: CreditNoteFilters) {
  return useQuery({
    queryKey: ['creditNotes', filters],
    queryFn: async () => {
      const { data } = await api.get('/credit-notes', { params: filters });
      return data;
    },
  });
}

export function useCreditNote(id: string) {
  return useQuery({
    queryKey: ['creditNotes', id],
    queryFn: async () => {
      const { data } = await api.get(`/credit-notes/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/credit-notes', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
    },
  });
}

export function useUpdateCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/credit-notes/${id}`, payload);
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      queryClient.invalidateQueries({ queryKey: ['creditNotes', id] });
    },
  });
}

export function useDeleteCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/credit-notes/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
    },
  });
}


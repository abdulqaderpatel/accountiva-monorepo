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

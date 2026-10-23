import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreditNotePayload, CreditNoteStatus } from '@accountiva/shared';
import api, { getActiveOrganizationId } from '../client';

export interface CreditNoteFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ApplyCreditNoteInput {
  invoiceId: string;
  amountApplied: number;
}

export type CreditNoteRecord = Partial<CreditNotePayload> & {
  id?: string;
  creditNoteNumber?: string;
  remainingAmount?: number;
  [key: string]: unknown;
};

function readNextNumber(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('The next credit note number response was invalid.');
  }
  const nextNumber = (data as { nextNumber?: unknown }).nextNumber;
  if (typeof nextNumber !== 'string' || nextNumber.trim() === '') {
    throw new Error('The next credit note number response was invalid.');
  }
  return nextNumber.trim();
}

export async function fetchNextCreditNoteNumber(): Promise<string> {
  const { data } = await api.get('/credit-notes/next-number');
  return readNextNumber(data);
}

export async function fetchCreditNote(id: string): Promise<CreditNoteRecord> {
  const { data } = await api.get(`/credit-notes/${id}`);
  return data;
}

export async function createCreditNote(payload: CreditNotePayload): Promise<CreditNoteRecord> {
  const { data } = await api.post('/credit-notes', payload);
  return data;
}

export async function updateCreditNote(
  id: string,
  payload: CreditNotePayload,
): Promise<CreditNoteRecord> {
  const { data } = await api.patch(`/credit-notes/${id}`, payload);
  return data;
}

export async function updateCreditNoteStatus(
  id: string,
  status: CreditNoteStatus,
): Promise<CreditNoteRecord> {
  const { data } = await api.patch(`/credit-notes/${id}/status`, { status });
  return data;
}

export async function applyCreditNote(
  id: string,
  payload: ApplyCreditNoteInput,
): Promise<CreditNoteRecord> {
  const { data } = await api.post(`/credit-notes/${id}/apply`, payload);
  return data;
}

export function useCreditNotes(filters?: CreditNoteFilters) {
  const activeOrgId = getActiveOrganizationId();
  return useQuery({
    queryKey: ['creditNotes', activeOrgId, filters],
    queryFn: async () => {
      const { data } = await api.get('/credit-notes', { params: filters });
      return data;
    },
  });
}

export function useCreditNote(id: string) {
  const activeOrgId = getActiveOrganizationId();
  return useQuery({
    queryKey: ['creditNotes', activeOrgId, id],
    queryFn: () => fetchCreditNote(id),
    enabled: Boolean(id),
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreditNotePayload | Record<string, unknown>) =>
      createCreditNote(payload as CreditNotePayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
    },
  });
}

export function useUpdateCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreditNotePayload | Record<string, unknown> }) =>
      updateCreditNote(id, payload as CreditNotePayload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      queryClient.invalidateQueries({ queryKey: ['creditNotes', id] });
    },
  });
}

export function useUpdateCreditNoteStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CreditNoteStatus }) =>
      updateCreditNoteStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      queryClient.invalidateQueries({ queryKey: ['creditNotes', id] });
    },
  });
}

export function useApplyCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApplyCreditNoteInput }) =>
      applyCreditNote(id, payload),
    onSuccess: (_, { id, payload }) => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      queryClient.invalidateQueries({ queryKey: ['creditNotes', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', payload.invoiceId] });
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
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      queryClient.invalidateQueries({ queryKey: ['creditNotes', id] });
    },
  });
}

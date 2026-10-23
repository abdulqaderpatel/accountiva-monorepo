import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InvoicePayload, InvoiceStatus } from '@accountiva/shared';
import api, { getActiveOrganizationId } from '../client';

export interface InvoiceFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export type InvoiceRecord = Partial<InvoicePayload> & {
  id?: string;
  invoiceNumber?: string;
  [key: string]: unknown;
};

function readNextNumber(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('The next invoice number response was invalid.');
  }
  const nextNumber = (data as { nextNumber?: unknown }).nextNumber;
  if (typeof nextNumber !== 'string' || nextNumber.trim() === '') {
    throw new Error('The next invoice number response was invalid.');
  }
  return nextNumber.trim();
}

export async function fetchNextInvoiceNumber(): Promise<string> {
  const { data } = await api.get('/invoices/next-number');
  return readNextNumber(data);
}

export async function createInvoice(payload: InvoicePayload): Promise<InvoiceRecord> {
  const { data } = await api.post('/invoices', payload);
  return data;
}

export async function updateInvoice(id: string, payload: InvoicePayload): Promise<InvoiceRecord> {
  const { data } = await api.patch(`/invoices/${id}`, payload);
  return data;
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<InvoiceRecord> {
  const { data } = await api.patch(`/invoices/${id}/status`, { status });
  return data;
}

export async function bulkUpdateInvoiceStatus(
  ids: string[],
  status: InvoiceStatus,
): Promise<InvoiceRecord[]> {
  const { data } = await api.patch('/invoices/bulk-status', { ids, status });
  return data;
}

export function useInvoices(
  filters?: InvoiceFilters,
  options?: { enabled?: boolean },
) {
  const activeOrgId = getActiveOrganizationId();
  return useQuery({
    queryKey: ['invoices', activeOrgId, filters],
    queryFn: async () => {
      const { data } = await api.get('/invoices', { params: filters });
      return data;
    },
    enabled: options?.enabled,
  });
}

export function useInvoice(id: string) {
  const activeOrgId = getActiveOrganizationId();
  return useQuery({
    queryKey: ['invoices', activeOrgId, id],
    queryFn: async () => {
      const { data } = await api.get(`/invoices/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoicePayload | Record<string, unknown>) =>
      createInvoice(payload as InvoicePayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InvoicePayload | Record<string, unknown> }) =>
      updateInvoice(id, payload as InvoicePayload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      updateInvoiceStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    },
  });
}

export function useBulkUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: InvoiceStatus }) =>
      bulkUpdateInvoiceStatus(ids, status),
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      ids.forEach((id) => queryClient.invalidateQueries({ queryKey: ['invoices', id] }));
    },
  });
}

export function useSendInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { recipientEmail: string; subject: string; message: string } }) => {
      const { data } = await api.post(`/invoices/${id}/send`, payload);
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/invoices/${id}`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../client';

export interface NotificationItem {
  id: string;
  user_id: string;
  organization_id: string | null;
  title: string;
  message: string;
  type: 'action' | 'system';
  category: 'invoice' | 'transaction' | 'bill' | 'system' | 'customer' | 'vendor' | 'item' | 'invitation';
  severity: 'error' | 'warning' | 'success' | 'info';
  is_read: boolean;
  action_label: string | null;
  action_route: string | null;
  toast_message: string | null;
  created_at: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<NotificationItem[]>('/notifications');
      return data;
    },
    refetchInterval: 30000, // Background poll every 30s
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isRead = true }: { id: string; isRead?: boolean }) => {
      const { data } = await api.patch(`/notifications/${id}/read`, { isRead });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/notifications/read-all');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/notifications/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}


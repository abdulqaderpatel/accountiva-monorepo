import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/lib/api';

export interface NotificationItem {
  id: string;
  user_id: string;
  organization_id: string | null;
  title: string;
  message: string;
  type: 'action' | 'system';
  category: 'invoice' | 'transaction' | 'bill' | 'system';
  severity: 'error' | 'warning' | 'success' | 'info';
  is_read: boolean;
  action_label: string | null;
  action_route: string | null;
  toast_message: string | null;
  created_at: string;
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<NotificationItem[]>([]);
  const loading = ref(false);
  const fetched = ref(false);
  const error = ref<string | null>(null);

  const fetchNotifications = async (force = false) => {
    if (!force && fetched.value) return;
    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/notifications');
      notifications.value = response.data;
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch notifications';
    } finally {
      loading.value = false;
    }
  };

  const markAsRead = async (id: string, isRead = true) => {
    try {
      const response = await api.patch(`/notifications/${id}/read`, { isRead });
      // Update local state
      const idx = notifications.value.findIndex(n => n.id === id);
      if (idx !== -1) {
        notifications.value[idx].is_read = response.data.is_read;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update notification';
      throw err;
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      // Update local state
      notifications.value.forEach(n => {
        n.is_read = true;
      });
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to mark all as read';
      throw err;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      // Remove from local state
      notifications.value = notifications.value.filter(n => n.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete notification';
      throw err;
    }
  };

  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.is_read).length;
  });

  const reset = () => {
    notifications.value = [];
    fetched.value = false;
    error.value = null;
    loading.value = false;
  };

  return {
    notifications,
    loading,
    fetched,
    error,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    reset
  };
});

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/lib/api';
import { toast } from 'vue-sonner';

export interface Bookmark {
  id: string;
  user_id: string;
  organization_id: string;
  entity_type: string; // 'invoice' | 'expense' | 'bill' | 'estimate' | 'customer' | 'vendor' | 'item' | 'journal' | 'report'
  entity_id: string;
  title: string;
  subtitle?: string | null;
  route: string;
  metadata?: {
    amount?: number | string;
    status?: string;
    date?: string;
    customerName?: string;
    vendorName?: string;
    [key: string]: any;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface ToggleBookmarkPayload {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle?: string | null;
  route: string;
  metadata?: any;
}

export const useBookmarkStore = defineStore('bookmark', () => {
  const bookmarks = ref<Bookmark[]>([]);
  const loading = ref(false);
  const fetched = ref(false);

  // Fast O(1) set of entity keys: `${entity_type}:${entity_id}`
  const bookmarkedKeys = computed(() => {
    return new Set(bookmarks.value.map((b) => `${b.entity_type}:${b.entity_id}`));
  });

  const totalCount = computed(() => bookmarks.value.length);

  const isBookmarked = (entityType: string, entityId: string): boolean => {
    if (!entityType || !entityId) return false;
    return bookmarkedKeys.value.has(`${entityType}:${entityId}`);
  };

  const getBookmark = (entityType: string, entityId: string): Bookmark | undefined => {
    return bookmarks.value.find(
      (b) => b.entity_type === entityType && b.entity_id === entityId
    );
  };

  const fetchBookmarks = async (force = false) => {
    if (fetched.value && !force) return;
    loading.value = true;
    try {
      const response = await api.get('/bookmarks');
      bookmarks.value = response.data || [];
      fetched.value = true;
    } catch (error: any) {
      console.error('[BookmarkStore] Fetch error:', error);
    } finally {
      loading.value = false;
    }
  };

  const toggleBookmark = async (payload: ToggleBookmarkPayload) => {
    const key = `${payload.entity_type}:${payload.entity_id}`;
    const alreadyBookmarked = isBookmarked(payload.entity_type, payload.entity_id);
    const existingIndex = bookmarks.value.findIndex(
      (b) => b.entity_type === payload.entity_type && b.entity_id === payload.entity_id
    );
    const prevBookmark = existingIndex !== -1 ? bookmarks.value[existingIndex] : null;

    // Optimistic Update
    if (alreadyBookmarked) {
      bookmarks.value = bookmarks.value.filter(
        (b) => !(b.entity_type === payload.entity_type && b.entity_id === payload.entity_id)
      );
      toast.info('Bookmark removed');
    } else {
      const tempBookmark: Bookmark = {
        id: `temp-${Date.now()}`,
        user_id: '',
        organization_id: '',
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        title: payload.title,
        subtitle: payload.subtitle || null,
        route: payload.route,
        metadata: payload.metadata || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      bookmarks.value.unshift(tempBookmark);
      toast.success('Bookmarked successfully');
    }

    try {
      const response = await api.post('/bookmarks/toggle', payload);
      if (response.data.bookmarked && response.data.bookmark) {
        // Update temp bookmark with real ID from server
        const idx = bookmarks.value.findIndex(
          (b) => b.entity_type === payload.entity_type && b.entity_id === payload.entity_id
        );
        if (idx !== -1) {
          bookmarks.value[idx] = response.data.bookmark;
        } else {
          bookmarks.value.unshift(response.data.bookmark);
        }
      } else if (!response.data.bookmarked) {
        // Ensure removed
        bookmarks.value = bookmarks.value.filter(
          (b) => !(b.entity_type === payload.entity_type && b.entity_id === payload.entity_id)
        );
      }
    } catch (error: any) {
      console.error('[BookmarkStore] Toggle error:', error);
      // Rollback on failure
      if (alreadyBookmarked && prevBookmark) {
        bookmarks.value.splice(existingIndex, 0, prevBookmark);
      } else if (!alreadyBookmarked) {
        bookmarks.value = bookmarks.value.filter(
          (b) => !(b.entity_type === payload.entity_type && b.entity_id === payload.entity_id)
        );
      }
      toast.error('Failed to update bookmark');
    }
  };

  const removeBookmark = async (id: string) => {
    const idx = bookmarks.value.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const removedItem = bookmarks.value[idx];

    // Optimistic removal
    bookmarks.value.splice(idx, 1);
    toast.info('Bookmark removed');

    try {
      await api.delete(`/bookmarks/${id}`);
    } catch (error) {
      console.error('[BookmarkStore] Remove error:', error);
      bookmarks.value.splice(idx, 0, removedItem);
      toast.error('Failed to remove bookmark');
    }
  };

  const clearState = () => {
    bookmarks.value = [];
    fetched.value = false;
    loading.value = false;
  };

  const reset = () => {
    clearState();
  };

  const clearAll = async () => {
    if (bookmarks.value.length === 0) return;
    const previous = [...bookmarks.value];
    bookmarks.value = [];
    try {
      await Promise.allSettled(previous.map((b) => api.delete(`/bookmarks/${b.id}`)));
      toast.info('All bookmarks cleared');
    } catch (error) {
      console.error('[BookmarkStore] Clear all error:', error);
      bookmarks.value = previous;
      toast.error('Failed to clear all bookmarks');
    }
  };

  return {
    bookmarks,
    loading,
    fetched,
    bookmarkedKeys,
    totalCount,
    isBookmarked,
    getBookmark,
    fetchBookmarks,
    toggleBookmark,
    removeBookmark,
    clearState,
    reset,
    clearAll,
  };
});

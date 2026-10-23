import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

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

interface BookmarkContextType {
  bookmarks: Bookmark[];
  loading: boolean;
  totalCount: number;
  isBookmarked: (entityType: string, entityId: string) => boolean;
  getBookmark: (entityType: string, entityId: string) => Bookmark | undefined;
  fetchBookmarks: (force?: boolean) => Promise<void>;
  toggleBookmark: (payload: ToggleBookmarkPayload) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const { currentOrganization } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const bookmarkedKeys = useMemo(() => {
    return new Set(bookmarks.map((b) => `${b.entity_type}:${b.entity_id}`));
  }, [bookmarks]);

  const totalCount = bookmarks.length;

  const isBookmarked = useCallback(
    (entityType: string, entityId: string): boolean => {
      if (!entityType || !entityId) return false;
      return bookmarkedKeys.has(`${entityType}:${entityId}`);
    },
    [bookmarkedKeys]
  );

  const getBookmark = useCallback(
    (entityType: string, entityId: string): Bookmark | undefined => {
      return bookmarks.find(
        (b) => b.entity_type === entityType && b.entity_id === entityId
      );
    },
    [bookmarks]
  );

  const fetchBookmarks = useCallback(
    async (force = false) => {
      if (!currentOrganization?.id) return;
      if (fetched && !force) return;
      setLoading(true);
      try {
        const response = await api.get("/bookmarks");
        setBookmarks(Array.isArray(response.data) ? response.data : response.data?.data || []);
        setFetched(true);
      } catch (error) {
        console.error("[BookmarkContext] Fetch error:", error);
      } finally {
        setLoading(false);
      }
    },
    [currentOrganization?.id, fetched]
  );

  // Re-fetch on workspace change
  useEffect(() => {
    setBookmarks([]);
    setFetched(false);
    if (currentOrganization?.id) {
      fetchBookmarks(true);
    }
  }, [currentOrganization?.id]);

  const toggleBookmark = useCallback(
    async (payload: ToggleBookmarkPayload) => {
      const alreadyBookmarked = isBookmarked(payload.entity_type, payload.entity_id);
      const existingBookmark = bookmarks.find(
        (b) => b.entity_type === payload.entity_type && b.entity_id === payload.entity_id
      );

      // Optimistic update
      if (alreadyBookmarked) {
        setBookmarks((prev) =>
          prev.filter(
            (b) => !(b.entity_type === payload.entity_type && b.entity_id === payload.entity_id)
          )
        );
        toast.info("Bookmark removed");
      } else {
        const tempBookmark: Bookmark = {
          id: `temp-${Date.now()}`,
          user_id: "",
          organization_id: currentOrganization?.id || "",
          entity_type: payload.entity_type,
          entity_id: payload.entity_id,
          title: payload.title,
          subtitle: payload.subtitle || null,
          route: payload.route,
          metadata: payload.metadata || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setBookmarks((prev) => [tempBookmark, ...prev]);
        toast.success("Bookmarked successfully");
      }

      try {
        const response = await api.post("/bookmarks/toggle", payload);
        if (response.data.bookmarked && response.data.bookmark) {
          setBookmarks((prev) => {
            const idx = prev.findIndex(
              (b) => b.entity_type === payload.entity_type && b.entity_id === payload.entity_id
            );
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = response.data.bookmark;
              return updated;
            }
            return [response.data.bookmark, ...prev];
          });
        } else if (!response.data.bookmarked) {
          setBookmarks((prev) =>
            prev.filter(
              (b) => !(b.entity_type === payload.entity_type && b.entity_id === payload.entity_id)
            )
          );
        }
      } catch (error) {
        console.error("[BookmarkContext] Toggle error:", error);
        // Rollback
        if (alreadyBookmarked && existingBookmark) {
          setBookmarks((prev) => [existingBookmark, ...prev]);
        } else if (!alreadyBookmarked) {
          setBookmarks((prev) =>
            prev.filter(
              (b) => !(b.entity_type === payload.entity_type && b.entity_id === payload.entity_id)
            )
          );
        }
        toast.error("Failed to update bookmark");
      }
    },
    [isBookmarked, bookmarks, currentOrganization?.id]
  );

  const removeBookmark = useCallback(async (id: string) => {
    let removedItem: Bookmark | undefined;
    setBookmarks((prev) => {
      removedItem = prev.find((b) => b.id === id);
      return prev.filter((b) => b.id !== id);
    });
    toast.info("Bookmark removed");

    try {
      await api.delete(`/bookmarks/${id}`);
    } catch (error) {
      console.error("[BookmarkContext] Remove error:", error);
      if (removedItem) {
        setBookmarks((prev) => [removedItem!, ...prev]);
      }
      toast.error("Failed to remove bookmark");
    }
  }, []);

  const clearAll = useCallback(async () => {
    if (bookmarks.length === 0) return;
    const previous = [...bookmarks];
    setBookmarks([]);
    try {
      await Promise.allSettled(previous.map((b) => api.delete(`/bookmarks/${b.id}`)));
      toast.info("All bookmarks cleared");
    } catch (error) {
      console.error("[BookmarkContext] Clear all error:", error);
      setBookmarks(previous);
      toast.error("Failed to clear all bookmarks");
    }
  }, [bookmarks]);

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        loading,
        totalCount,
        isBookmarked,
        getBookmark,
        fetchBookmarks,
        toggleBookmark,
        removeBookmark,
        clearAll,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error("useBookmarks must be used within a BookmarkProvider");
  }
  return context;
}

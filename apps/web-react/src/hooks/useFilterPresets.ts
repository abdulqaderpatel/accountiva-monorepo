import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";

export interface FilterPreset {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  is_system?: boolean;
  is_default?: boolean;
  is_pinned?: boolean;
  filters: {
    status?: string;
    timeframe?: string;
    minAmount?: number | null;
    maxAmount?: number | null;
    bookmarkedOnly?: boolean;
    search?: string;
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_SYSTEM_PRESETS: Record<string, FilterPreset[]> = {
  invoices: [
    {
      id: "inv_all",
      name: "All Invoices",
      description: "Complete list of all invoices",
      icon: "FileText",
      color: "default",
      is_system: true,
      is_pinned: true,
      filters: { status: "All", timeframe: "all" },
    },
    {
      id: "inv_overdue",
      name: "Unpaid & Overdue",
      description: "Invoices past their payment due date requiring collection",
      icon: "AlertCircle",
      color: "default",
      is_system: true,
      is_pinned: true,
      filters: { status: "Outstanding", timeframe: "overdue" },
    },
    {
      id: "inv_high_value",
      name: "High Value (> ₹50k)",
      description: "Invoices with total amount ₹50,000 and above",
      icon: "TrendingUp",
      color: "default",
      is_system: true,
      is_pinned: true,
      filters: { minAmount: 50000 },
    },
  ],
};

export function useFilterPresets(entityType: string = "invoices") {
  const [systemPresets, setSystemPresets] = useState<FilterPreset[]>(() => {
    return DEFAULT_SYSTEM_PRESETS[entityType] || [];
  });

  const [customPresets, setCustomPresets] = useState<FilterPreset[]>(() => {
    try {
      const saved = localStorage.getItem(`accountiva_presets_${entityType}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activePreset, setActivePreset] = useState<FilterPreset | null>(() => {
    const list = DEFAULT_SYSTEM_PRESETS[entityType] || [];
    return list[0] || null;
  });

  const [loading, setLoading] = useState(false);

  // Sync to localStorage
  const saveCustomPresetsLocally = useCallback(
    (presets: FilterPreset[]) => {
      try {
        localStorage.setItem(`accountiva_presets_${entityType}`, JSON.stringify(presets));
      } catch (e) {
        console.error("Failed to save presets locally", e);
      }
    },
    [entityType]
  );

  // Fetch from backend
  const fetchPresets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/filter-presets", {
        params: { entity_type: entityType },
      });
      if (res.data?.systemPresets && res.data.systemPresets.length > 0) {
        setSystemPresets(res.data.systemPresets);
      }
      if (Array.isArray(res.data?.customPresets)) {
        setCustomPresets(res.data.customPresets);
        saveCustomPresetsLocally(res.data.customPresets);
      }
    } catch {
      // Backend may not have table yet; local storage fallback is preserved
    } finally {
      setLoading(false);
    }
  }, [entityType, saveCustomPresetsLocally]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const pinnedPresets = useMemo(() => {
    const sys = systemPresets.filter((p) => p.is_pinned);
    const cus = customPresets.filter((p) => p.is_pinned);
    return [...sys, ...cus];
  }, [systemPresets, customPresets]);

  const createPreset = useCallback(
    async (payload: {
      entity_type?: string;
      name: string;
      description?: string;
      icon?: string;
      color?: string;
      is_default?: boolean;
      is_pinned?: boolean;
      filters: Record<string, any>;
    }): Promise<FilterPreset> => {
      const newPreset: FilterPreset = {
        id: "preset_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        name: payload.name,
        description: payload.description || null,
        icon: payload.icon || "Filter",
        color: payload.color || "default",
        is_default: Boolean(payload.is_default),
        is_pinned: payload.is_pinned !== false,
        filters: payload.filters,
        created_at: new Date().toISOString(),
      };

      setCustomPresets((prev) => {
        let updated = [newPreset, ...prev];
        if (newPreset.is_default) {
          updated = updated.map((p) => (p.id === newPreset.id ? p : { ...p, is_default: false }));
        }
        saveCustomPresetsLocally(updated);
        return updated;
      });

      setActivePreset(newPreset);

      // Async backend persist
      try {
        await api.post("/filter-presets", {
          entity_type: entityType,
          ...payload,
        });
      } catch (err) {
        // Silently keep local preset
      }

      return newPreset;
    },
    [entityType, saveCustomPresetsLocally]
  );

  const togglePin = useCallback(
    async (id: string) => {
      setCustomPresets((prev) => {
        const updated = prev.map((p) => (p.id === id ? { ...p, is_pinned: !p.is_pinned } : p));
        saveCustomPresetsLocally(updated);
        return updated;
      });

      try {
        await api.post(`/filter-presets/${id}/pin`);
      } catch {
        // Ignore backend failure, state already updated
      }
    },
    [saveCustomPresetsLocally]
  );

  const deletePreset = useCallback(
    async (id: string) => {
      setCustomPresets((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        saveCustomPresetsLocally(updated);
        return updated;
      });

      if (activePreset?.id === id) {
        setActivePreset(systemPresets[0] || null);
      }

      try {
        await api.delete(`/filter-presets/${id}`);
      } catch {
        // Ignore backend failure
      }
    },
    [activePreset, systemPresets, saveCustomPresetsLocally]
  );

  return {
    systemPresets,
    customPresets,
    pinnedPresets,
    activePreset,
    setActivePreset,
    createPreset,
    togglePin,
    deletePreset,
    loading,
    fetchPresets,
  };
}

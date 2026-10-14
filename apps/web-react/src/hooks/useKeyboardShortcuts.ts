import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isFeatureEnabled, FeatureFlags } from "@accountiva/shared";
import { quickCreate } from "@/lib/quickCreate";

export interface ShortcutDefinition {
  id: string;
  label: string;
  keys: string[];
  description: string;
  category: "navigation" | "create" | "general";
  feature?: keyof FeatureFlags;
  action?: () => void;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (["input", "textarea", "select"].includes(tagName)) return true;
  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"]')) return true;
  return false;
}

function hasOpenModal(): boolean {
  const dialogs = document.querySelectorAll('[role="dialog"]');
  for (const dialog of Array.from(dialogs)) {
    if (!dialog.getAttribute("data-shortcuts-dialog")) {
      return true;
    }
  }
  return false;
}

export function useKeyboardShortcuts(options?: {
  onToggleSidebar?: () => void;
  onOpenSearch?: () => void;
}) {
  const navigate = useNavigate();
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);
  const [activeLeaderKey, setActiveLeaderKey] = useState<"g" | "c" | null>(null);

  const clearLeaderKey = useCallback(() => {
    setActiveLeaderKey(null);
  }, []);

  const openShortcutsDialog = useCallback(() => {
    clearLeaderKey();
    setIsShortcutsDialogOpen(true);
  }, [clearLeaderKey]);

  const closeShortcutsDialog = useCallback(() => {
    setIsShortcutsDialogOpen(false);
  }, []);

  const toggleShortcutsDialog = useCallback(() => {
    setIsShortcutsDialogOpen((prev) => !prev);
  }, []);

  const navigateTo = useCallback(
    (path: string, feature?: keyof FeatureFlags) => {
      if (feature && !isFeatureEnabled(feature)) return;
      clearLeaderKey();
      navigate({ to: path });
    },
    [navigate, clearLeaderKey]
  );

  const triggerQuickCreate = useCallback(
    (action: "invoice" | "customer" | "estimate" | "item", path: string, feature?: keyof FeatureFlags) => {
      if (feature && !isFeatureEnabled(feature)) return;
      clearLeaderKey();
      quickCreate.trigger(action);
      navigate({ to: path });
    },
    [navigate, clearLeaderKey]
  );

  const allShortcuts: ShortcutDefinition[] = useMemo(
    () => [
      // --- Navigation (G then ...) ---
      {
        id: "nav-dashboard",
        label: "Dashboard",
        keys: ["G", "D"],
        description: "Go to Dashboard",
        category: "navigation",
        feature: "dashboard",
        action: () => navigateTo("/dashboard", "dashboard"),
      },
      {
        id: "nav-invoices",
        label: "Invoices",
        keys: ["G", "I"],
        description: "Go to Invoices",
        category: "navigation",
        feature: "invoices",
        action: () => navigateTo("/invoices", "invoices"),
      },
      {
        id: "nav-estimates",
        label: "Estimates",
        keys: ["G", "E"],
        description: "Go to Estimates",
        category: "navigation",
        feature: "estimates",
        action: () => navigateTo("/estimates", "estimates"),
      },
      {
        id: "nav-customers",
        label: "Customers",
        keys: ["G", "C"],
        description: "Go to Customers",
        category: "navigation",
        feature: "customers",
        action: () => navigateTo("/customers", "customers"),
      },
      {
        id: "nav-items",
        label: "Products & Services",
        keys: ["G", "P"],
        description: "Go to Items / Products",
        category: "navigation",
        feature: "items",
        action: () => navigateTo("/products-and-services/items", "items"),
      },
      {
        id: "nav-credit-notes",
        label: "Credit Notes",
        keys: ["G", "N"],
        description: "Go to Credit Notes",
        category: "navigation",
        feature: "creditNotes",
        action: () => navigateTo("/sales/credit-notes", "creditNotes"),
      },
      {
        id: "nav-settings",
        label: "Preferences",
        keys: ["G", "S"],
        description: "Go to Settings",
        category: "navigation",
        action: () => navigateTo("/settings"),
      },
      {
        id: "nav-org-settings",
        label: "Organization",
        keys: ["G", "O"],
        description: "Go to Organization Settings",
        category: "navigation",
        action: () => navigateTo("/organization-settings"),
      },
      {
        id: "nav-notifications",
        label: "Notifications",
        keys: ["G", "R"],
        description: "Go to Notifications",
        category: "navigation",
        action: () => navigateTo("/notifications"),
      },

      // --- Create Actions (C then ...) ---
      {
        id: "create-invoice",
        label: "New Invoice",
        keys: ["C", "I"],
        description: "Create a new invoice",
        category: "create",
        feature: "invoices",
        action: () => triggerQuickCreate("invoice", "/invoices", "invoices"),
      },
      {
        id: "create-estimate",
        label: "New Estimate",
        keys: ["C", "E"],
        description: "Create a new estimate",
        category: "create",
        feature: "estimates",
        action: () => triggerQuickCreate("estimate", "/estimates", "estimates"),
      },
      {
        id: "create-customer",
        label: "New Customer",
        keys: ["C", "C"],
        description: "Create a new customer",
        category: "create",
        feature: "customers",
        action: () => triggerQuickCreate("customer", "/customers", "customers"),
      },
      {
        id: "create-item",
        label: "New Item",
        keys: ["C", "P"],
        description: "Add a product or service",
        category: "create",
        feature: "items",
        action: () => triggerQuickCreate("item", "/products-and-services/items", "items"),
      },

      // --- General Shortcuts ---
      {
        id: "general-search",
        label: "Search Workspace",
        keys: ["⌘", "K"],
        description: "Open quick search / command palette",
        category: "general",
        action: options?.onOpenSearch,
      },
      {
        id: "general-sidebar",
        label: "Toggle Sidebar",
        keys: ["["],
        description: "Collapse or expand navigation sidebar",
        category: "general",
        action: options?.onToggleSidebar,
      },
      {
        id: "general-shortcuts",
        label: "Keyboard Shortcuts",
        keys: ["?"],
        description: "Show shortcuts cheat sheet",
        category: "general",
        action: openShortcutsDialog,
      },
      {
        id: "general-escape",
        label: "Close / Cancel",
        keys: ["Esc"],
        description: "Close active modal or cancel sequence",
        category: "general",
      },
    ],
    [navigateTo, triggerQuickCreate, options?.onOpenSearch, options?.onToggleSidebar, openShortcutsDialog]
  );

  const activeShortcuts = useMemo(() => {
    return allShortcuts.filter((sc) => {
      if (sc.feature && !isFeatureEnabled(sc.feature)) return false;
      return true;
    });
  }, [allShortcuts]);

  const navigationShortcuts = useMemo(
    () => activeShortcuts.filter((sc) => sc.category === "navigation"),
    [activeShortcuts]
  );

  const createShortcuts = useMemo(
    () => activeShortcuts.filter((sc) => sc.category === "create"),
    [activeShortcuts]
  );

  const generalShortcuts = useMemo(
    () => activeShortcuts.filter((sc) => sc.category === "general"),
    [activeShortcuts]
  );

  useEffect(() => {
    if (!activeLeaderKey) return;
    const timer = setTimeout(() => {
      setActiveLeaderKey(null);
    }, 1500);
    return () => clearTimeout(timer);
  }, [activeLeaderKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Skip if user is typing in form inputs
      if (isEditableElement(e.target)) {
        return;
      }

      // 2. Escape: cancel leader key or close dialog
      if (e.key === "Escape") {
        if (activeLeaderKey) {
          clearLeaderKey();
          e.preventDefault();
          return;
        }
        if (isShortcutsDialogOpen) {
          closeShortcutsDialog();
          e.preventDefault();
          return;
        }
      }

      // 3. Shortcuts dialog (? or Shift + /)
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        toggleShortcutsDialog();
        return;
      }

      // 4. Skip single keys if modal is open
      if (hasOpenModal()) {
        return;
      }

      // 5. Global Command Palette: ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        options?.onOpenSearch?.();
        return;
      }

      // 6. Toggle Sidebar: '[' or ⌘/Ctrl + B
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key === "[") {
        e.preventDefault();
        options?.onToggleSidebar?.();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        options?.onToggleSidebar?.();
        return;
      }

      // Skip sequential handling if modifier keys are active
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();

      // 7. Leader keys initiation: 'g' or 'c'
      if (!activeLeaderKey) {
        if (key === "g") {
          setActiveLeaderKey("g");
          return;
        }
        if (key === "c") {
          setActiveLeaderKey("c");
          return;
        }
      } else {
        // 8. Follow-up key
        const leader = activeLeaderKey;
        let matched = false;

        if (leader === "g") {
          const target = navigationShortcuts.find(
            (sc) => sc.keys[1]?.toLowerCase() === key || (key === "t" && sc.id === "nav-items")
          );
          if (target?.action) {
            e.preventDefault();
            target.action();
            matched = true;
          }
        } else if (leader === "c") {
          const target = createShortcuts.find(
            (sc) => sc.keys[1]?.toLowerCase() === key || (key === "t" && sc.id === "create-item")
          );
          if (target?.action) {
            e.preventDefault();
            target.action();
            matched = true;
          }
        }

        clearLeaderKey();
        if (matched) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeLeaderKey,
    isShortcutsDialogOpen,
    navigationShortcuts,
    createShortcuts,
    options,
    clearLeaderKey,
    closeShortcutsDialog,
    toggleShortcutsDialog,
  ]);

  return {
    isShortcutsDialogOpen,
    activeLeaderKey,
    allShortcuts,
    activeShortcuts,
    navigationShortcuts,
    createShortcuts,
    generalShortcuts,
    openShortcutsDialog,
    closeShortcutsDialog,
    toggleShortcutsDialog,
    clearLeaderKey,
  };
}


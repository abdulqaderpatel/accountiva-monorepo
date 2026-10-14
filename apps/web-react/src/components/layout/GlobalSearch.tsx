import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  FileText,
  Users,
  Package,
  Calculator,
  LayoutDashboard,
  Settings,
  ArrowRight,
  X,
  CreditCard,
  FileMinus,
  Building2,
  Bell,
} from "lucide-react";
import { isFeatureEnabled, formatCurrency } from "@accountiva/shared";
import { useInvoices, useCustomers, useItems, useEstimates } from "@accountiva/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  type: "Invoice" | "Customer" | "Item" | "Estimate" | "Page";
  route: string;
  shortcut?: string;
  badgeVariant?: "default" | "secondary" | "success" | "warning" | "destructive";
  icon: React.ComponentType<{ className?: string }>;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Queries for live indexing
  const { data: apiInvoices } = useInvoices();
  const { data: apiCustomers } = useCustomers();
  const { data: apiItems } = useItems();
  const { data: apiEstimates } = useEstimates();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Static navigation routes
  const quickLinks: SearchItem[] = useMemo(() => {
    const links: SearchItem[] = [
      {
        id: "nav-dash",
        title: "Dashboard",
        subtitle: "Financial metrics and overview",
        type: "Page",
        route: "/dashboard",
        shortcut: "G D",
        icon: LayoutDashboard,
      },
    ];

    if (isFeatureEnabled("invoices")) {
      links.push({
        id: "nav-inv",
        title: "Invoices",
        subtitle: "Client billing & receivables",
        type: "Page",
        route: "/invoices",
        shortcut: "G I",
        icon: FileText,
      });
    }

    if (isFeatureEnabled("customers")) {
      links.push({
        id: "nav-cust",
        title: "Customers",
        subtitle: "Client contacts & accounts",
        type: "Page",
        route: "/customers",
        shortcut: "G C",
        icon: Users,
      });
    }

    if (isFeatureEnabled("items")) {
      links.push({
        id: "nav-items",
        title: "Products & Services",
        subtitle: "Inventory catalog and rates",
        type: "Page",
        route: "/products-and-services/items",
        shortcut: "G P",
        icon: Package,
      });
    }

    if (isFeatureEnabled("estimates")) {
      links.push({
        id: "nav-est",
        title: "Estimates",
        subtitle: "Quotes and proposals",
        type: "Page",
        route: "/estimates",
        shortcut: "G E",
        icon: Calculator,
      });
    }

    if (isFeatureEnabled("creditNotes")) {
      links.push({
        id: "nav-cn",
        title: "Credit Notes",
        subtitle: "Refunds and adjustments",
        type: "Page",
        route: "/sales/credit-notes",
        shortcut: "G N",
        icon: FileMinus,
      });
    }

    links.push({
      id: "nav-org",
      title: "Organization Settings",
      subtitle: "Business profile, team members, branding, trash",
      type: "Page",
      route: "/organization-settings",
      shortcut: "G O",
      icon: Building2,
    });

    links.push({
      id: "nav-notif",
      title: "Notification Center",
      subtitle: "System alerts, actions, and invites",
      type: "Page",
      route: "/notifications",
      shortcut: "G R",
      icon: Bell,
    });

    links.push({
      id: "nav-set",
      title: "Settings & Preferences",
      subtitle: "Profile, theme, organization config",
      type: "Page",
      route: "/settings",
      shortcut: "G S",
      icon: Settings,
    });

    return links;
  }, []);

  // Filtered results
  const searchResults: SearchItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default: show quick navigation links
      return quickLinks;
    }

    const results: SearchItem[] = [];

    // Filter quick links
    quickLinks.forEach((link) => {
      if (link.title.toLowerCase().includes(q) || link.subtitle.toLowerCase().includes(q)) {
        results.push(link);
      }
    });

    // 1. Invoices
    if (isFeatureEnabled("invoices")) {
      const invList: any[] = Array.isArray(apiInvoices)
        ? apiInvoices
        : Array.isArray(apiInvoices?.data)
        ? apiInvoices.data
        : [];
      invList.forEach((inv) => {
        const invNum = String(inv.invoiceNumber || inv.number || "");
        const cust = String(inv.customerName || inv.customers?.name || "");
        const st = String(inv.status || "");
        if (
          invNum.toLowerCase().includes(q) ||
          cust.toLowerCase().includes(q) ||
          st.toLowerCase().includes(q)
        ) {
          results.push({
            id: `inv-${inv.id}`,
            title: invNum || "Invoice",
            subtitle: `${cust} • ${formatCurrency(Number(inv.amount) || 0)} • ${st}`,
            type: "Invoice",
            route: "/invoices",
            badgeVariant: st.toUpperCase() === "PAID" ? "success" : "warning",
            icon: FileText,
          });
        }
      });
    }

    // 2. Customers
    if (isFeatureEnabled("customers")) {
      const custList: any[] = Array.isArray(apiCustomers)
        ? apiCustomers
        : Array.isArray(apiCustomers?.data)
        ? apiCustomers.data
        : [];
      custList.forEach((c) => {
        const name = String(c.name || "");
        const email = String(c.email || "");
        const comp = String(c.company || "");
        if (name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || comp.toLowerCase().includes(q)) {
          results.push({
            id: `cust-${c.id}`,
            title: name,
            subtitle: `${comp ? `${comp} • ` : ""}${email || c.phone || "Customer"}`,
            type: "Customer",
            route: `/customers/${c.id}`,
            badgeVariant: "secondary",
            icon: Users,
          });
        }
      });
    }

    // 3. Items
    if (isFeatureEnabled("items")) {
      const itList: any[] = Array.isArray(apiItems)
        ? apiItems
        : Array.isArray(apiItems?.data)
        ? apiItems.data
        : [];
      itList.forEach((it) => {
        const name = String(it.name || "");
        const sku = String(it.sku || "");
        const desc = String(it.description || "");
        if (name.toLowerCase().includes(q) || sku.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
          results.push({
            id: `it-${it.id}`,
            title: name,
            subtitle: `${sku ? `SKU: ${sku} • ` : ""}${formatCurrency(Number(it.sellingPrice || it.unitPrice || 0))} (${it.type})`,
            type: "Item",
            route: "/products-and-services/items",
            badgeVariant: "default",
            icon: Package,
          });
        }
      });
    }

    // 4. Estimates
    if (isFeatureEnabled("estimates")) {
      const estList: any[] = Array.isArray(apiEstimates)
        ? apiEstimates
        : Array.isArray(apiEstimates?.data)
        ? apiEstimates.data
        : [];
      estList.forEach((e) => {
        const estNum = String(e.estimateNumber || "");
        const cust = String(e.customerName || e.customers?.name || "");
        if (estNum.toLowerCase().includes(q) || cust.toLowerCase().includes(q)) {
          results.push({
            id: `est-${e.id}`,
            title: estNum || "Estimate",
            subtitle: `${cust} • ${formatCurrency(Number(e.amount) || 0)}`,
            type: "Estimate",
            route: "/estimates",
            badgeVariant: "secondary",
            icon: Calculator,
          });
        }
      });
    }

    return results;
  }, [query, quickLinks, apiInvoices, apiCustomers, apiItems, apiEstimates]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelect(searchResults[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, searchResults, selectedIndex]);

  const handleSelect = (item: SearchItem) => {
    onClose();
    navigate({ to: item.route as any });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-2xl rounded-2xl border border-border/80 bg-background shadow-2xl transition-all duration-200 animate-in fade-in-0 zoom-in-95 flex flex-col overflow-hidden"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border/60 bg-muted/20 gap-3">
          <Search className="size-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search invoices, clients, items, or jump to page..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border rounded text-muted-foreground">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No results found for &ldquo;<span className="font-semibold text-foreground">{query}</span>&rdquo;
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-left group",
                    isSelected ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-muted/50 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="text-xs font-semibold truncate leading-tight">
                        {item.title}
                      </div>
                      <div
                        className={cn(
                          "text-[11px] truncate leading-tight mt-0.5",
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.shortcut && (
                      <span className="text-[9px] font-mono text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded border border-border/50">
                        {item.shortcut}
                      </span>
                    )}
                    <Badge
                      variant={isSelected ? "secondary" : item.badgeVariant || "outline"}
                      className="text-[10px] font-normal"
                    >
                      {item.type}
                    </Badge>
                    <ArrowRight
                      className={cn(
                        "size-3.5 transition-transform group-hover:translate-x-0.5",
                        isSelected ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">↵</kbd>
              <span>select</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">?</kbd>
            <span>all shortcuts</span>
          </span>
        </div>
      </div>
    </div>
  );
}

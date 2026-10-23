import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bookmark as BookmarkIcon,
  BookmarkX,
  Search,
  X,
  FileText,
  Receipt,
  Users,
  Calculator,
  BarChart3,
  BookOpen,
  Package,
} from "lucide-react";
import { useBookmarks, Bookmark } from "@/context/BookmarkContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BookmarksCenter() {
  const navigate = useNavigate();
  const { bookmarks, totalCount, removeBookmark, clearAll, fetchBookmarks } = useBookmarks();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const togglePanel = () => {
    setIsOpen((prev) => {
      if (!prev) {
        setSearchQuery("");
        fetchBookmarks(true);
      }
      return !prev;
    });
  };

  const getCleanSubtitle = (item: Bookmark): string => {
    if (item.metadata?.customerName) return item.metadata.customerName;
    if (item.metadata?.vendorName) return item.metadata.vendorName;
    if (!item.subtitle) return "";

    const parts = item.subtitle.split(" • ");
    if (
      parts.length > 1 &&
      item.metadata?.status &&
      parts[parts.length - 1].toLowerCase() === item.metadata.status.toLowerCase()
    ) {
      return parts.slice(0, -1).join(" • ");
    }
    return item.subtitle;
  };

  const getTabCount = (tabId: string) => {
    if (tabId === "all") return bookmarks.length;
    if (tabId === "other") {
      return bookmarks.filter(
        (b) => !["invoice", "expense", "bill", "estimate"].includes(b.entity_type)
      ).length;
    }
    return bookmarks.filter((b) => b.entity_type === tabId).length;
  };

  const visibleTabs = useMemo(() => {
    const allTabs = [
      { id: "all", label: "All" },
      { id: "invoice", label: "Invoices" },
      { id: "expense", label: "Expenses" },
      { id: "bill", label: "Bills" },
      { id: "estimate", label: "Estimates" },
      { id: "other", label: "Others" },
    ];

    if (bookmarks.length === 0) {
      return [{ id: "all", label: "All" }];
    }
    return allTabs.filter((tab) => tab.id === "all" || getTabCount(tab.id) > 0);
  }, [bookmarks]);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab("all");
    }
  }, [visibleTabs, activeTab]);

  const filteredBookmarks = useMemo(() => {
    let list = bookmarks;

    if (activeTab !== "all") {
      if (activeTab === "other") {
        list = list.filter(
          (b) => !["invoice", "expense", "bill", "estimate"].includes(b.entity_type)
        );
      } else {
        list = list.filter((b) => b.entity_type === activeTab);
      }
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.subtitle && b.subtitle.toLowerCase().includes(q)) ||
          b.entity_type.toLowerCase().includes(q) ||
          (b.metadata?.status && String(b.metadata.status).toLowerCase().includes(q)) ||
          (b.metadata?.customerName && String(b.metadata.customerName).toLowerCase().includes(q)) ||
          (b.metadata?.vendorName && String(b.metadata.vendorName).toLowerCase().includes(q))
      );
    }
    return list;
  }, [bookmarks, activeTab, searchQuery]);

  const getEntityConfig = (type: string) => {
    switch (type) {
      case "invoice":
        return {
          label: "Invoice",
          icon: FileText,
          bgClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
        };
      case "expense":
        return {
          label: "Expense",
          icon: Receipt,
          bgClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
        };
      case "bill":
        return {
          label: "Bill",
          icon: FileText,
          bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
        };
      case "estimate":
        return {
          label: "Estimate",
          icon: Calculator,
          bgClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
          badgeClass: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
        };
      case "customer":
      case "vendor":
        return {
          label: type === "customer" ? "Customer" : "Vendor",
          icon: Users,
          bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
        };
      case "journal":
        return {
          label: "Journal",
          icon: BookOpen,
          bgClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
          badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
        };
      case "report":
        return {
          label: "Report",
          icon: BarChart3,
          bgClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
        };
      default:
        return {
          label: "Item",
          icon: Package,
          bgClass: "bg-muted text-muted-foreground border-border",
          badgeClass: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid" || s === "approved" || s === "completed") {
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
    }
    if (s === "draft") {
      return "bg-muted text-muted-foreground border-border/70";
    }
    if (s === "outstanding" || s === "pending" || s === "open" || s === "sent") {
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25";
    }
    if (s === "overdue" || s === "cancelled" || s === "void") {
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25";
    }
    return "bg-muted text-muted-foreground border-border/70";
  };

  const handleNavigate = (bookmark: Bookmark) => {
    setIsOpen(false);
    if (bookmark.route) {
      navigate({ to: bookmark.route });
    }
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeBookmark(id);
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to remove all saved bookmarks?")) {
      clearAll();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative">
      {/* TopBar Bookmark Trigger Button */}
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon-sm"
        className={`size-8 rounded-lg relative transition-all duration-150 cursor-pointer ${
          isOpen
            ? "bg-muted text-foreground ring-1 ring-border"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
        title="Bookmarks"
        onClick={togglePanel}
      >
        <BookmarkIcon
          className={`size-4 transition-colors stroke-[2] ${
            totalCount > 0 ? "text-primary" : "text-muted-foreground"
          }`}
        />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 rounded-full bg-primary text-primary-foreground font-bold text-[9px] flex items-center justify-center px-1 ring-2 ring-sidebar select-none shadow-2xs">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </Button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-[350px] sm:w-[420px] rounded-xl bg-popover text-popover-foreground border border-border shadow-xl z-50 overflow-hidden flex flex-col max-h-[540px] select-none animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between bg-card/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <BookmarkIcon className="w-3.5 h-3.5 text-primary stroke-[2]" />
              </div>
              <h3 className="text-xs font-semibold tracking-tight text-foreground">Bookmarks</h3>
              {totalCount > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground border border-border/60">
                  {totalCount}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search & Tabs */}
          <div className="p-3 border-b border-border/50 bg-background/50 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, contact, or status..."
                className="h-8 pl-8 pr-7 text-xs bg-muted/40 focus:bg-background border-border/60 rounded-md shadow-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {visibleTabs.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/30"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        activeTab === tab.id
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-background/80 text-muted-foreground border border-border/40"
                      }`}
                    >
                      {getTabCount(tab.id)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bookmarks List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-[160px] max-h-[350px]">
            {bookmarks.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center px-6 space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground/60">
                  <BookmarkIcon className="w-5 h-5" />
                </div>
                <div className="space-y-1 max-w-[240px]">
                  <h4 className="text-xs font-semibold text-foreground">No bookmarks saved</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Bookmark key records from invoices, expenses, or bills to quickly access them here.
                  </p>
                </div>
              </div>
            ) : filteredBookmarks.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center px-4 space-y-1">
                <p className="text-xs font-medium text-foreground">No matching bookmarks found</p>
                <p className="text-[11px] text-muted-foreground">
                  Try adjusting your search query or category filter.
                </p>
              </div>
            ) : (
              filteredBookmarks.map((item) => {
                const config = getEntityConfig(item.entity_type);
                const Icon = config.icon;
                const cleanSub = getCleanSubtitle(item);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNavigate(item)}
                    className="group p-2.5 rounded-lg border border-border/30 hover:border-border/80 hover:bg-muted/50 cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 relative"
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${config.bgClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </span>
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded border capitalize tracking-normal shrink-0 ${config.badgeClass}`}
                        >
                          {config.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                        {cleanSub && (
                          <span className="truncate font-medium text-muted-foreground">
                            {cleanSub}
                          </span>
                        )}
                        {cleanSub && (item.metadata?.date || item.created_at) && (
                          <span className="text-muted-foreground/30">•</span>
                        )}
                        {(item.metadata?.date || item.created_at) && (
                          <span className="shrink-0 text-muted-foreground/70 text-[10px]">
                            {formatDate(item.metadata?.date || item.created_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Amount & Status */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right space-y-0.5">
                        {item.metadata?.amount !== undefined &&
                          item.metadata?.amount !== null &&
                          item.metadata?.amount !== "" && (
                            <div className="text-xs font-bold text-foreground font-mono tabular-nums tracking-tight">
                              {formatCurrency(Number(item.metadata.amount))}
                            </div>
                          )}
                        {item.metadata?.status && (
                          <div>
                            <span
                              className={`text-[9px] font-medium px-1.5 py-0.2 rounded border capitalize inline-block ${getStatusBadgeClass(
                                item.metadata.status
                              )}`}
                            >
                              {item.metadata.status}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quick unpin button */}
                      <button
                        type="button"
                        onClick={(e) => handleRemove(e, item.id)}
                        className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                        title="Remove bookmark"
                      >
                        <BookmarkX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3.5 py-2.5 border-t border-border/50 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              <span>
                {filteredBookmarks.length}{" "}
                {filteredBookmarks.length === 1 ? "record" : "records"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              {totalCount > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-muted-foreground hover:text-destructive transition-colors font-medium cursor-pointer"
                  >
                    Clear all
                  </button>
                  <span className="text-border">•</span>
                </>
              )}
              <span className="text-muted-foreground/70">
                Press{" "}
                <kbd className="px-1 py-0.5 text-[9px] font-mono font-semibold bg-background border border-border/60 rounded shadow-2xs">
                  Esc
                </kbd>{" "}
                to close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

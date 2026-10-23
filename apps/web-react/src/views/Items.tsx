import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Package,
  Wrench,
  Boxes,
  AlertTriangle,
  IndianRupee,
  Layers,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { BulkConfirmDialog } from "@/components/ui/BulkConfirmDialog";
import { formatCurrency, exportToCsv } from "@accountiva/shared";
import { useItems, useDeleteItem } from "@accountiva/api";
import { AddItemModal } from "@/components/items/AddItemModal";
import { toast } from "sonner";
import { quickCreate } from "@/lib/quickCreate";
import { useAuth } from "@/context/AuthContext";

interface ItemRecord {
  id: string;
  name: string;
  type: "Product" | "Service" | string;
  productType?: "Inventory" | "Non-Inventory" | string | null;
  sku?: string;
  sellingPrice?: number;
  unitPrice?: number;
  costPrice?: number;
  salesTaxRate?: number;
  openingStock?: number;
  stockOnHand?: number;
  description?: string;
  category?: string;
  customFields?: Record<string, any>;
}

export function Items() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  React.useEffect(() => {
    if (quickCreate.consume("item")) {
      setEditingItem(null);
      setIsAddOpen(true);
    }
    return quickCreate.subscribe((action) => {
      if (action === "item") {
        quickCreate.consume("item");
        setEditingItem(null);
        setIsAddOpen(true);
      }
    });
  }, []);

  const { currentOrganization } = useAuth();
  const currentOrgId = currentOrganization?.id;

  // Reset page-level state and selections when workspace changes
  React.useEffect(() => {
    setSelectedIds(new Set());
    setEditingItem(null);
    setIsAddOpen(false);
    setPage(1);
    setSearch("");
    setSelectedFilter("All");
  }, [currentOrgId]);

  const { data: apiItems, isLoading, refetch } = useItems({
    search: search || undefined,
  });

  const deleteItemMutation = useDeleteItem();

  const itemList: ItemRecord[] = useMemo(() => {
    if (Array.isArray(apiItems)) return apiItems;
    if (Array.isArray(apiItems?.data)) return apiItems.data;
    if (Array.isArray(apiItems?.items)) return apiItems.items;
    return [];
  }, [apiItems]);

  // Compute 4 KPI stats matching Items.vue
  const stats = useMemo(() => {
    const totalItems = itemList.length;
    const activeInventory = itemList.filter(
      (i) => i.type === "Product" && i.productType === "Inventory"
    ).length;
    const totalStockValue = itemList.reduce((sum, i) => {
      const stock = Number(i.stockOnHand) || Number(i.openingStock) || 0;
      const price = Number(i.costPrice) || Number(i.sellingPrice) || Number(i.unitPrice) || 0;
      return sum + stock * price;
    }, 0);
    const lowStockCount = itemList.filter((i) => {
      if (i.type !== "Product") return false;
      const stock = Number(i.stockOnHand) || Number(i.openingStock) || 0;
      return stock <= 5;
    }).length;

    return [
      {
        title: "Total Catalog Items",
        amount: totalItems,
        subText: "products & services",
        icon: Layers,
        color: "text-amber-700 dark:text-amber-400",
        bg: "bg-amber-500/10 border border-amber-500/15",
        accentBar: "bg-amber-500/50",
      },
      {
        title: "Active Inventory",
        amount: activeInventory,
        subText: "tracked physical stock",
        icon: Boxes,
        color: "text-sky-700 dark:text-sky-400",
        bg: "bg-sky-500/10 border border-sky-500/15",
        accentBar: "bg-sky-500/50",
      },
      {
        title: "Total Stock Valuation",
        amount: formatCurrency(totalStockValue),
        subText: "inventory asset value",
        icon: IndianRupee,
        color: "text-emerald-700 dark:text-emerald-400",
        bg: "bg-emerald-500/10 border border-emerald-500/15",
        accentBar: "bg-emerald-500/50",
        isCurrency: true,
      },
      {
        title: "Low Stock Alerts",
        amount: lowStockCount,
        subText: "below reorder threshold",
        icon: AlertTriangle,
        color: "text-rose-700 dark:text-rose-400",
        bg: "bg-rose-500/10 border border-rose-500/15",
        accentBar: "bg-rose-500/50",
      },
    ];
  }, [itemList]);

  // Filter items
  const filteredItems = useMemo(() => {
    return itemList.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));

      let matchesFilter = true;
      if (selectedFilter === "Inventory") {
        matchesFilter = item.type === "Product" && item.productType === "Inventory";
      } else if (selectedFilter === "Non-Inventory") {
        matchesFilter = item.type === "Product" && item.productType === "Non-Inventory";
      } else if (selectedFilter === "Services") {
        matchesFilter = item.type === "Service";
      } else if (selectedFilter === "LowStock") {
        const stock = Number(item.stockOnHand) || Number(item.openingStock) || 0;
        matchesFilter = item.type === "Product" && stock <= 5;
      }

      return matchesSearch && matchesFilter;
    });
  }, [itemList, search, selectedFilter]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // Bulk selection helpers
  const isAllSelected =
    paginatedItems.length > 0 && paginatedItems.every((i) => selectedIds.has(i.id));
  const isIndeterminate =
    paginatedItems.some((i) => selectedIds.has(i.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      paginatedItems.forEach((i) => next.delete(i.id));
    } else {
      paginatedItems.forEach((i) => next.add(i.id));
    }
    setSelectedIds(next);
  };

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteItemMutation.mutateAsync(id);
      toast.success("Item deleted", {
        description: `${name} has been removed.`,
      });
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
      refetch();
    } catch (err: any) {
      toast.error("Failed to delete item", {
        description: err.response?.data?.message || err.message,
      });
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await deleteItemMutation.mutateAsync(id);
      }
      toast.success(`Deleted ${selectedIds.size} item(s)`);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete selected items");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExport = () => {
    const target = selectedIds.size > 0
      ? itemList.filter((i) => selectedIds.has(i.id))
      : filteredItems;

    if (!target || target.length === 0) {
      toast.error("No items available to export");
      return;
    }
    const exportData = target.map((item) => ({
      "Name": item.name,
      "Type": item.type,
      "SKU": item.sku || "",
      "Selling Price": Number(item.sellingPrice) || Number(item.unitPrice) || 0,
      "Cost Price": Number(item.costPrice) || 0,
      "Stock on Hand": Number(item.stockOnHand) || Number(item.openingStock) || 0,
      "Description": item.description || "",
    }));
    exportToCsv(exportData, "items");
    toast.success(`Exported ${exportData.length} item(s) to CSV`);
  };

  const filterTabs = [
    { id: "All", label: "All Items", icon: Layers },
    { id: "Inventory", label: "Inventory Products", icon: Boxes },
    { id: "Non-Inventory", label: "Non-Inventory Products", icon: Package },
    { id: "Services", label: "Services", icon: Wrench },
    { id: "LowStock", label: "Low Stock Alerts", icon: AlertTriangle },
  ];

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* Sticky Transitional Header */}
      <StickyPageHeader
        title="Products & Services"
        subtitle="Manage physical inventory, non-inventory goods, and professional services catalog."
        icon={Package}
      >
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9 px-3.5 text-xs font-medium border-border shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5 mr-1.5 text-muted-foreground" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingItem(null);
              setIsAddOpen(true);
            }}
            className="h-9 px-4 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="size-3.5 mr-1.5" />
            Add Item / Service
          </Button>
        </div>
      </StickyPageHeader>

      <div className="px-8 pt-2 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading && itemList.length === 0 ? (
            [1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-card/50 border-border/60 overflow-hidden shadow-2xs">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="size-9 rounded-xl" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          ) : (
            stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.title}
                  className="border-border/60 shadow-2xs overflow-hidden relative group hover:border-primary/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs"
                >
                  <div className={`h-[2.5px] w-full ${stat.accentBar}`} />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
                        {stat.title}
                      </span>
                      <div
                        className={`size-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${stat.bg} ${stat.color}`}
                      >
                        <Icon className="size-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-foreground mb-1 tracking-tight font-mono">
                      {stat.amount}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      {stat.subText}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Filter & Table Card */}
        <div className="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border/60 bg-muted/25">
            {/* Search Input */}
            <div className="relative w-full sm:w-72 md:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-150" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, SKU..."
                className="h-9 w-full pl-9 pr-8 bg-background/50 hover:bg-background/80 focus:bg-background/90 border-border/70 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 rounded-lg text-xs font-medium placeholder:text-muted-foreground/60 shadow-none transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex h-9 items-center gap-1 bg-muted/45 p-1 rounded-lg border border-border/60 overflow-x-auto shadow-2xs max-w-full">
              {filterTabs.map((tab) => {
                const Icon = tab.icon;
                const isSelected = selectedFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedFilter(tab.id);
                      setPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all duration-150 whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground font-medium hover:text-foreground hover:bg-primary/5"
                    }`}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader className="bg-muted/35 border-b border-border/70">
              <TableRow className="hover:bg-transparent border-b border-border/70">
                <TableHead className="py-3.5 px-4 w-[48px] text-center">
                  <Checkbox
                    checked={isAllSelected ? true : isIndeterminate ? "indeterminate" : false}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all items"
                  />
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                  Item / Service
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 w-[150px]">
                  Type
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-center w-[150px]">
                  Stock on Hand
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-right w-[150px]">
                  Selling Price
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-right w-[150px]">
                  Cost Price
                </TableHead>
                <TableHead className="py-3.5 px-6 text-right w-[60px]" />
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border/60">
              {isLoading && paginatedItems.length === 0 ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i} className="border-b border-border/60">
                    <TableCell className="py-4 px-4 text-center">
                      <Skeleton className="size-4 mx-auto rounded" />
                    </TableCell>
                    <TableCell className="py-4 px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="py-4 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="py-4 px-6 text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    <TableCell className="py-4 px-6 text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="py-4 px-6 text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="py-4 px-6 text-right"><Skeleton className="size-8 ml-auto rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedItems.length === 0 ? (
                <TableEmpty colSpan={7}>
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3 py-8">
                    <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                      <Package className="size-7 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-1 text-center">
                      <h3 className="text-sm font-bold text-foreground">No catalog items found</h3>
                      <p className="text-xs text-muted-foreground">
                        {search || selectedFilter !== "All"
                          ? "No items match your search or filter criteria."
                          : "Add your physical inventory products or consulting services."}
                      </p>
                    </div>
                  </div>
                </TableEmpty>
              ) : (
                paginatedItems.map((item) => {
                  const isRowSelected = selectedIds.has(item.id);
                  const isService = item.type === "Service";
                  const stock = Number(item.stockOnHand) || Number(item.openingStock) || 0;
                  const sellPrice = Number(item.sellingPrice) || Number(item.unitPrice) || 0;
                  const costPrice = Number(item.costPrice) || 0;

                  return (
                    <TableRow
                      key={item.id}
                      data-state={isRowSelected ? "selected" : undefined}
                      className={`hover:bg-muted/40 transition-colors group cursor-pointer ${
                        isRowSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <TableCell className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isRowSelected}
                          onCheckedChange={() => toggleSelect(item.id)}
                          aria-label={`Select item ${item.name}`}
                        />
                      </TableCell>

                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {item.name}
                          </span>
                          {item.sku && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              SKU: {item.sku}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                            isService
                              ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                          }`}
                        >
                          {isService ? <Wrench className="size-3" /> : <Package className="size-3" />}
                          {item.type} {item.productType ? `• ${item.productType}` : ""}
                        </span>
                      </TableCell>

                      <TableCell className="py-4 px-6 text-center font-mono text-xs font-bold">
                        {isService ? (
                          <span className="text-muted-foreground font-normal">—</span>
                        ) : (
                          <span className={stock <= 5 ? "text-rose-600 dark:text-rose-400 font-black" : "text-foreground"}>
                            {stock} {stock <= 5 && <span className="text-[9px] uppercase tracking-wider block text-rose-500 font-sans">Low</span>}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="py-4 px-6 text-right font-mono text-xs font-bold text-foreground">
                        {formatCurrency(sellPrice)}
                      </TableCell>

                      <TableCell className="py-4 px-6 text-right font-mono text-xs text-muted-foreground">
                        {costPrice > 0 ? formatCurrency(costPrice) : "—"}
                      </TableCell>

                      <TableCell className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl p-1 shadow-xl">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingItem(item);
                                setIsAddOpen(true);
                              }}
                              className="cursor-pointer gap-2 text-xs font-semibold"
                            >
                              <Pencil className="size-3.5 text-muted-foreground" />
                              Edit Item
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 bg-border/60" />

                            <DropdownMenuItem
                              onClick={() => handleDelete(item.id, item.name)}
                              className="cursor-pointer gap-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                              Delete Item
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/20">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Showing {Math.min((page - 1) * pageSize + 1, filteredItems.length)}–
                {Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length} items
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs font-semibold gap-1 cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" /> Prev
                </Button>
                <span className="text-xs font-mono font-bold px-2 text-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 text-xs font-semibold gap-1 cursor-pointer"
                >
                  Next <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        totalCount={filteredItems.length}
        onClearSelection={() => setSelectedIds(new Set())}
      >
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          className="h-8 text-xs font-bold gap-1.5 bg-background border-border shadow-xs cursor-pointer"
        >
          <FileSpreadsheet className="size-3.5 text-muted-foreground" /> Export
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowBulkDeleteConfirm(true)}
          className="h-8 text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
        >
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </BulkActionBar>

      {/* Bulk Delete Confirm Dialog */}
      <BulkConfirmDialog
        open={showBulkDeleteConfirm}
        count={selectedIds.size}
        itemLabel="item"
        isPending={isBulkDeleting}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDeleteConfirm}
      />

      {/* Add / Edit Item Modal */}
      <AddItemModal
        isOpen={isAddOpen}
        itemToEdit={editingItem}
        onClose={() => {
          setIsAddOpen(false);
          setEditingItem(null);
        }}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default Items;

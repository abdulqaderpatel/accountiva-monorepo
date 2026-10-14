import React, { useState } from "react";
import { Plus, Search, Package, Wrench, MoreVertical, Trash2, Eye, Boxes, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency, exportToCsv } from "@accountiva/shared";
import { useItems, useDeleteItem } from "@accountiva/api";
import { AddItemModal } from "@/components/items/AddItemModal";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

interface ItemRecord {
  id: string;
  name: string;
  type: "Product" | "Service";
  productType?: "Inventory" | "Non-Inventory" | null;
  sku?: string;
  sellingPrice?: number;
  unitPrice?: number;
  costPrice?: number;
  salesTaxRate?: number;
  openingStock?: number;
  stockOnHand?: number;
  description?: string;
}

export function Items() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: apiItems, isLoading, refetch } = useItems({
    search: search || undefined,
    type: filterType === "ALL" ? undefined : filterType,
  });

  const deleteItemMutation = useDeleteItem();

  const itemList: ItemRecord[] = Array.isArray(apiItems)
    ? apiItems
    : (Array.isArray(apiItems?.data)
        ? apiItems.data
        : []);

  const filtered = itemList.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q));

    const matchesType =
      filterType === "ALL" ||
      item.type.toUpperCase() === filterType ||
      (filterType === "INVENTORY" && item.productType === "Inventory");

    return matchesSearch && matchesType;
  });

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteItemMutation.mutateAsync(id);
      toast.success("Item deleted", {
        description: `${name} has been removed.`,
      });
      refetch();
    } catch (err: any) {
      toast.error("Failed to delete item", {
        description: err.response?.data?.message || err.message,
      });
    }
  };

  const productCount = filtered.filter((i) => i.type === "Product").length;
  const serviceCount = filtered.filter((i) => i.type === "Service").length;
  const totalStockUnits = filtered.reduce((acc, i) => acc + (Number(i.stockOnHand) || Number(i.openingStock) || 0), 0);

  const handleExport = () => {
    if (!filtered || filtered.length === 0) {
      toast.error("No items available to export");
      return;
    }
    const exportData = filtered.map((item) => ({
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Products & Services
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your service offerings, physical inventory, SKUs, and pricing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Products in Catalog</p>
          <p className="text-xl font-bold font-mono text-foreground mt-1">
            {productCount} <span className="text-xs font-normal text-muted-foreground">items</span>
          </p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Services Offered</p>
          <p className="text-xl font-bold font-mono text-primary mt-1">
            {serviceCount} <span className="text-xs font-normal text-muted-foreground">services</span>
          </p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Tracked Inventory Units</p>
          <p className="text-xl font-bold font-mono text-emerald-500 mt-1">
            {totalStockUnits} <span className="text-xs font-normal text-muted-foreground">in stock</span>
          </p>
        </Card>
      </div>

      {/* Search & Type Filter Tabs */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border/60">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {["ALL", "PRODUCT", "SERVICE", "INVENTORY"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === f
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {f === "ALL" ? "All Items" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Spinner size="md" />
                      <span>Loading items catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4">
                    <EmptyState
                      icon={Boxes}
                      title="No products or services found"
                      description={
                        search || filterType !== "ALL"
                          ? "No catalog item matches your current search or filter."
                          : "Create inventory products or billable services to use across invoices."
                      }
                      actionLabel={search || filterType !== "ALL" ? "Clear Filters" : "Add Item"}
                      onAction={() => {
                        if (search || filterType !== "ALL") {
                          setSearch("");
                          setFilterType("ALL");
                        } else {
                          setIsAddOpen(true);
                        }
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-foreground">{item.name}</div>
                      {item.description && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {item.type === "Product" ? (
                          <Package className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <Wrench className="h-3.5 w-3.5 text-violet-500" />
                        )}
                        <span className="font-medium">{item.type}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {item.sku || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                      {formatCurrency(Number(item.sellingPrice) || Number(item.unitPrice) || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.type === "Product" && item.productType === "Inventory" ? (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {item.stockOnHand ?? item.openingStock ?? 0} in stock
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="View Item"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id, item.name)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default Items;


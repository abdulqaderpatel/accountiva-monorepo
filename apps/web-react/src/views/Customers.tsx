import React, { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Search,
  Users,
  Mail,
  Phone,
  Building2,
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
import { useCustomers, useDeleteCustomer } from "@accountiva/api";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";
import { toast } from "sonner";
import { quickCreate } from "@/lib/quickCreate";

interface CustomerRecord {
  id: string;
  name: string;
  customerCode?: string;
  email?: string;
  phone?: string;
  company?: string;
  gstTreatment?: string;
  gstNumber?: string;
  outstandingBalance?: number;
  outstanding?: number;
  opening_balance?: number;
  billingAddress?: string;
  shippingAddress?: string;
  customFields?: Record<string, any>;
}

export function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  React.useEffect(() => {
    if (quickCreate.consume("customer")) {
      setEditingCustomer(null);
      setIsAddOpen(true);
    }
    return quickCreate.subscribe((action) => {
      if (action === "customer") {
        quickCreate.consume("customer");
        setEditingCustomer(null);
        setIsAddOpen(true);
      }
    });
  }, []);

  const { data: apiCustomers, isLoading, refetch } = useCustomers({
    search: search || undefined,
  });

  const deleteCustomerMutation = useDeleteCustomer();

  const customerList: CustomerRecord[] = useMemo(() => {
    if (Array.isArray(apiCustomers)) return apiCustomers;
    if (Array.isArray(apiCustomers?.data)) return apiCustomers.data;
    if (Array.isArray(apiCustomers?.customers)) return apiCustomers.customers;
    return [];
  }, [apiCustomers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customerList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q))
    );
  }, [customerList, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Bulk selection helpers
  const isAllSelected =
    paginatedCustomers.length > 0 && paginatedCustomers.every((c) => selectedIds.has(c.id));
  const isIndeterminate =
    paginatedCustomers.some((c) => selectedIds.has(c.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      paginatedCustomers.forEach((c) => next.delete(c.id));
    } else {
      paginatedCustomers.forEach((c) => next.add(c.id));
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
      await deleteCustomerMutation.mutateAsync(id);
      toast.success("Customer deleted", {
        description: `${name} has been removed.`,
      });
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
      refetch();
    } catch (err: any) {
      toast.error("Failed to delete customer", {
        description: err.response?.data?.message || err.message,
      });
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await deleteCustomerMutation.mutateAsync(id);
      }
      toast.success(`Deleted ${selectedIds.size} customer(s)`);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete selected customers");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExport = () => {
    const target = selectedIds.size > 0
      ? customerList.filter((c) => selectedIds.has(c.id))
      : filtered;

    if (!target || target.length === 0) {
      toast.error("No customers available to export");
      return;
    }
    const exportData = target.map((c) => ({
      "Code": c.customerCode || "",
      "Name": c.name,
      "Company": c.company || "",
      "Email": c.email || "",
      "Phone": c.phone || "",
      "GST Treatment": c.gstTreatment || "",
      "Outstanding": Number(c.outstandingBalance) || Number(c.outstanding) || Number(c.opening_balance) || 0,
    }));
    exportToCsv(exportData, "customers");
    toast.success(`Exported ${exportData.length} customer(s) to CSV`);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background flex flex-col">
      {/* Sticky Transitional Header */}
      <StickyPageHeader
        title="Customers"
        subtitle="Manage your client relationships, contact information, and billing histories"
        icon={Users}
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
              setEditingCustomer(null);
              setIsAddOpen(true);
            }}
            className="h-9 px-4 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="size-3.5 mr-1.5" />
            New Customer
          </Button>
        </div>
      </StickyPageHeader>

      <div className="px-8 pt-2 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">
        {/* Search & Select All Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative max-w-md w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-150" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by code, name, email or company..."
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

          {filtered.length > 0 && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 px-1 animate-in fade-in duration-150">
              <Checkbox
                checked={isAllSelected ? true : isIndeterminate ? "indeterminate" : false}
                onCheckedChange={toggleSelectAll}
                id="select-all-customers"
              />
              <label
                htmlFor="select-all-customers"
                className="text-xs font-medium text-muted-foreground cursor-pointer select-none"
              >
                Select all on page ({paginatedCustomers.length})
              </label>
            </div>
          )}
        </div>

        {/* 3-Column Card Grid matching Vue */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && paginatedCustomers.length === 0 ? (
            [1, 2, 3, 4, 5, 6].map((i) => (
              <Card
                key={i}
                className="bg-card/50 border-border/60 shadow-2xs rounded-2xl transition-all duration-300 py-0 gap-0 overflow-hidden"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Skeleton className="size-12 rounded-2xl" />
                    <Skeleton className="size-8 rounded-lg" />
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : paginatedCustomers.length === 0 ? (
            <div className="col-span-full py-16 text-center">
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                  <Users className="size-7 text-muted-foreground/40" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-sm font-bold text-foreground">No customers found</h3>
                  <p className="text-xs text-muted-foreground">
                    {search ? "No clients match the search keyword." : "Add clients to start creating invoices and estimates."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            paginatedCustomers.map((cust) => {
              const isSelected = selectedIds.has(cust.id);
              const initials = cust.name ? cust.name.charAt(0).toUpperCase() : "?";
              const balance = Number(cust.outstandingBalance) || Number(cust.outstanding) || Number(cust.opening_balance) || 0;

              return (
                <Card
                  key={cust.id}
                  onClick={() => navigate({ to: `/customers/${cust.id}` })}
                  className={`bg-card/50 border-border/60 hover:border-primary/40 shadow-2xs hover:shadow-xs transition-all duration-300 group relative overflow-hidden cursor-pointer rounded-2xl backdrop-blur-xs py-0 gap-0 ${
                    isSelected ? "ring-2 ring-primary border-primary bg-primary/10 dark:bg-primary/15" : ""
                  }`}
                >
                  <div className="h-[2.5px] w-full bg-primary/20 group-hover:bg-primary/50 transition-colors" />

                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={(e) => toggleSelect(cust.id, e)}
                          className={`py-1 transition-opacity duration-150 cursor-pointer ${
                            selectedIds.size > 0 || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(cust.id)}
                            aria-label={`Select customer ${cust.name}`}
                          />
                        </div>

                        <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl transition-transform duration-200 group-hover:scale-105 shadow-2xs">
                          {initials}
                        </div>
                      </div>

                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 opacity-70 group-hover:opacity-100 transition-colors cursor-pointer"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl p-1 shadow-xl">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingCustomer(cust);
                                setIsAddOpen(true);
                              }}
                              className="cursor-pointer gap-2 text-xs font-semibold"
                            >
                              <Pencil className="size-3.5 text-muted-foreground" />
                              Edit Customer
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 bg-border/60" />

                            <DropdownMenuItem
                              onClick={() => handleDelete(cust.id, cust.name)}
                              className="cursor-pointer gap-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                              Delete Customer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors truncate">
                            {cust.name}
                          </h3>
                        </div>
                        {cust.company && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 truncate">
                            <Building2 className="size-3.5 shrink-0" />
                            <span className="truncate">{cust.company}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        {cust.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="size-3.5 shrink-0 text-muted-foreground/60" />
                            <span className="truncate">{cust.email}</span>
                          </div>
                        )}
                        {cust.phone && (
                          <div className="flex items-center gap-2 truncate">
                            <Phone className="size-3.5 shrink-0 text-muted-foreground/60" />
                            <span>{cust.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Outstanding
                        </span>
                        <span className={`text-xs font-mono font-bold ${balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                          {formatCurrency(balance)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 rounded-xl border border-border/60 bg-muted/20">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}–
              {Math.min(page * pageSize, filtered.length)} of {filtered.length} customers
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

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        totalCount={filtered.length}
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
        itemLabel="customer"
        isPending={isBulkDeleting}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDeleteConfirm}
      />

      {/* Add / Edit Customer Modal */}
      <AddCustomerModal
        isOpen={isAddOpen}
        customer={editingCustomer}
        onClose={() => {
          setIsAddOpen(false);
          setEditingCustomer(null);
        }}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default Customers;

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  Calculator,
  Clock,
  CheckCircle2,
  FileText,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  FileSpreadsheet,
  ArrowRight,
  Check,
  Send,
  Mail,
  Eye,
  Bookmark as BookmarkIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { PaginationBar } from "@/components/ui/PaginationBar";
import {
  formatCurrency,
  formatDate,
  exportToCsv,
  exportToJson,
  type EstimateConversionSource,
  type EstimateStatus,
} from "@accountiva/shared";
import {
  convertEstimateToInvoice,
  useEstimates,
  useDeleteEstimate,
  useUpdateEstimateStatus,
} from "@accountiva/api";
import { CreateEstimateModal } from "@/components/estimates/CreateEstimateModal";
import { EstimatePreviewModal } from "@/components/estimates/EstimatePreviewModal";
import { SendEstimateModal } from "@/components/estimates/SendEstimateModal";
import { useBookmarks } from "@/context/BookmarkContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { quickCreate } from "@/lib/quickCreate";

interface EstimateRecord {
  id: string;
  customerId?: string;
  customerName?: string;
  customers?: { id?: string; name: string; email?: string };
  estimateNumber: string;
  date?: string;
  expiryDate?: string;
  amount: number;
  subtotal?: number;
  taxPercent?: number;
  taxAmount?: number;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  shippingCharges?: number;
  adjustment?: number;
  items?: any[];
  notes?: string;
  termsConditions?: string;
  referenceNumber?: string;
  terms?: string;
  billingAddress?: string;
  shippingAddress?: string;
  status: string;
  customFields?: Record<string, any>;
  custom_fields?: Record<string, any>;
}

export function Estimates() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<EstimateRecord | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<EstimateRecord | null>(null);
  const [sendingEstimate, setSendingEstimate] = useState<EstimateRecord | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [statusLoadingAction, setStatusLoadingAction] = useState("");

  React.useEffect(() => {
    if (quickCreate.consume("estimate")) {
      setEditingEstimate(null);
      setIsCreateOpen(true);
    }
    return quickCreate.subscribe((action) => {
      if (action === "estimate") {
        quickCreate.consume("estimate");
        setEditingEstimate(null);
        setIsCreateOpen(true);
      }
    });
  }, []);

  const { currentOrganization } = useAuth();
  const currentOrgId = currentOrganization?.id;

  // Reset page-level state and selections when workspace changes
  React.useEffect(() => {
    setSelectedIds(new Set());
    setSelectedEstimate(null);
    setEditingEstimate(null);
    setIsCreateOpen(false);
    setPage(1);
    setSearch("");
    setActiveFilter("All");
  }, [currentOrgId]);

  const { data: apiEstimates, isLoading, refetch } = useEstimates();
  const deleteEstimateMutation = useDeleteEstimate();
  const updateEstimateStatusMutation = useUpdateEstimateStatus();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const handleToggleBookmark = (est: EstimateRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toggleBookmark({
      entity_type: "estimate",
      entity_id: est.id,
      title: est.estimateNumber,
      subtitle: est.customerName || est.customers?.name || null,
      route: "/estimates",
      metadata: {
        amount: est.amount,
        status: est.status,
        date: est.date,
        customerName: est.customerName || est.customers?.name,
      },
    });
  };

  const rawEstimates: EstimateRecord[] = useMemo(() => {
    if (Array.isArray(apiEstimates)) return apiEstimates;
    if (Array.isArray(apiEstimates?.data)) return apiEstimates.data;
    if (Array.isArray(apiEstimates?.estimates)) return apiEstimates.estimates;
    return [];
  }, [apiEstimates]);

  // Compute stats across raw estimates
  const stats = useMemo(() => {
    const pending = rawEstimates
      .filter((e) => {
        const s = String(e.status || "").toLowerCase();
        return s === "sent" || s === "draft" || s === "pending";
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const accepted = rawEstimates
      .filter((e) => String(e.status || "").toLowerCase() === "accepted")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const invoiced = rawEstimates
      .filter((e) => String(e.status || "").toLowerCase() === "invoiced")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return [
      {
        title: "Pending Quotes",
        amount: formatCurrency(pending),
        subText: "awaiting approval",
        icon: Clock,
        color: "text-amber-700 dark:text-amber-400",
        bg: "bg-amber-500/10 border border-amber-500/15",
        accentBar: "bg-amber-500/50",
        containerClass: "bg-amber-500/[0.02]",
      },
      {
        title: "Accepted",
        amount: formatCurrency(accepted),
        subText: "ready to invoice",
        icon: CheckCircle2,
        color: "text-emerald-700 dark:text-emerald-400",
        bg: "bg-emerald-500/10 border border-emerald-500/15",
        accentBar: "bg-emerald-500/40",
        containerClass: "bg-emerald-500/[0.02]",
      },
      {
        title: "Invoiced",
        amount: formatCurrency(invoiced),
        subText: "converted to sales",
        icon: FileText,
        color: "text-primary",
        bg: "bg-primary/10 border border-primary/15",
        accentBar: "bg-primary/50",
        containerClass: "bg-primary/[0.02]",
      },
    ];
  }, [rawEstimates]);

  const filteredEstimates = useMemo(() => {
    return rawEstimates.filter((est) => {
      const custName = est.customerName || est.customers?.name || "";
      const matchesSearch =
        custName.toLowerCase().includes(search.toLowerCase()) ||
        (est.estimateNumber && est.estimateNumber.toLowerCase().includes(search.toLowerCase()));

      const s = String(est.status || "").toLowerCase();
      let matchesFilter = true;
      if (activeFilter === "Draft") matchesFilter = s === "draft";
      else if (activeFilter === "Sent") matchesFilter = s === "sent";
      else if (activeFilter === "Accepted") matchesFilter = s === "accepted";
      else if (activeFilter === "Declined") matchesFilter = s === "declined";
      else if (activeFilter === "Invoiced") matchesFilter = s === "invoiced";

      return matchesSearch && matchesFilter;
    });
  }, [rawEstimates, search, activeFilter]);

  const totalPages = Math.ceil(filteredEstimates.length / pageSize) || 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages]);

  const paginatedEstimates = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEstimates.slice(start, start + pageSize);
  }, [filteredEstimates, page, pageSize]);

  // Bulk selection helpers
  const isAllSelected =
    paginatedEstimates.length > 0 && paginatedEstimates.every((e) => selectedIds.has(e.id));
  const isIndeterminate =
    paginatedEstimates.some((e) => selectedIds.has(e.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      paginatedEstimates.forEach((e) => next.delete(e.id));
    } else {
      paginatedEstimates.forEach((e) => next.add(e.id));
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

  const handleDeleteEstimate = async (id: string, num: string) => {
    if (!window.confirm(`Move estimate ${num} to trash?`)) return;
    try {
      await deleteEstimateMutation.mutateAsync(id);
      toast.success(`Estimate ${num} deleted`);
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete estimate");
    }
  };

  const handleConvertToInvoice = async (est: EstimateRecord) => {
    setStatusLoadingAction(`${est.id}-converting`);
    try {
      const invoiceDate = new Date().toISOString().split("T")[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const estimate: EstimateConversionSource = {
        estimateNumber: est.estimateNumber,
        customerId: est.customerId || est.customers?.id,
        amount: Number(est.amount) || 0,
        items: (est.items || []).map((item) => ({
          id: item.id,
          itemId: item.itemId,
          itemName: item.itemName || item.name || "",
          description: item.description || "",
          quantity: Number(item.quantity),
          rate: Number(item.rate ?? item.unitPrice),
          amount: Number(item.amount),
        })),
        referenceNumber: est.referenceNumber,
        billingAddress: est.billingAddress,
        shippingAddress: est.shippingAddress,
        terms: est.terms,
        discountType: est.discountType,
        discountValue: Number(est.discountValue) || 0,
        discountAmount: Number(est.discountAmount) || 0,
        shippingCharges: Number(est.shippingCharges) || 0,
        adjustment: Number(est.adjustment) || 0,
        notes: est.notes,
        termsConditions: est.termsConditions,
        taxPercent: Number(est.taxPercent) || 0,
        taxAmount: Number(est.taxAmount) || 0,
        customFields: est.customFields || est.custom_fields,
      };

      const result = await convertEstimateToInvoice({
        estimateId: est.id,
        estimate,
        invoiceDate,
        dueDate,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["estimates"] }),
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
      ]);

      if (result.status === "complete") {
        toast.success(`Estimate converted to Invoice ${result.invoiceNumber}!`, {
          description: "Draft invoice created and estimate marked as Invoiced.",
        });
      } else {
        const statusError = result.error as any;
        const reason =
          statusError?.response?.data?.message ||
          statusError?.response?.data?.error ||
          statusError?.message ||
          "The estimate status could not be updated.";
        toast.warning(`Invoice ${result.invoiceNumber} was created`, {
          description: `${reason} The estimate still needs status recovery.`,
        });
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to convert estimate",
      );
    } finally {
      setStatusLoadingAction("");
    }
  };

  const handleStatusUpdate = async (est: EstimateRecord, status: EstimateStatus) => {
    setStatusLoadingAction(`${est.id}-${status}`);
    try {
      await updateEstimateStatusMutation.mutateAsync({ id: est.id, status });
      toast.success(`Estimate marked as ${status}`);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to update status",
      );
    } finally {
      setStatusLoadingAction("");
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await deleteEstimateMutation.mutateAsync(id);
      }
      toast.success(`Deleted ${selectedIds.size} estimate(s)`);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete selected estimates");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkExport = (format: "csv" | "json") => {
    const target = selectedIds.size > 0
      ? rawEstimates.filter((e) => selectedIds.has(e.id))
      : filteredEstimates;

    if (!target || target.length === 0) {
      toast.error("No estimates available to export");
      return;
    }
    const exportData = target.map((est) => ({
      "Estimate #": est.estimateNumber || "N/A",
      Customer: est.customerName || est.customers?.name || "N/A",
      Date: formatDate(est.date),
      "Expiry Date": formatDate(est.expiryDate),
      Amount: est.amount,
      Status: est.status,
    }));

    if (format === "csv") {
      exportToCsv(exportData, "estimates");
    } else {
      exportToJson(exportData, "estimates");
    }
    toast.success(`Exported ${exportData.length} estimate(s) as ${format.toUpperCase()}`);
  };

  const renderStatusBadge = (status: string) => {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="size-3" /> Accepted
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Clock className="size-3" /> Sent
          </span>
        );
      case "invoiced":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <FileText className="size-3" /> Invoiced
          </span>
        );
      case "declined":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-muted text-muted-foreground border border-border">
            Draft
          </span>
        );
    }
  };

  const filters = ["All", "Draft", "Sent", "Accepted", "Declined", "Invoiced"];

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* Sticky Transitional Header */}
      <StickyPageHeader
        title="Estimates"
        subtitle="Create quotes, track proposal statuses, and convert accepted deals to invoices"
        icon={Calculator}
      >
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkExport("csv")}
            className="h-9 px-3.5 text-xs font-medium border-border shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5 mr-1.5 text-muted-foreground" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingEstimate(null);
              setIsCreateOpen(true);
            }}
            className="h-9 px-4 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="size-3.5 mr-1.5" />
            New Estimate
          </Button>
        </div>
      </StickyPageHeader>

      <div className="px-8 pt-2 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading && rawEstimates.length === 0 ? (
            [1, 2, 3].map((i) => (
              <Card key={i} className="bg-card/50 border-border/60 overflow-hidden shadow-2xs">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="size-9 rounded-xl" />
                  </div>
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))
          ) : (
            stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.title}
                  className={`border-border/60 shadow-2xs overflow-hidden relative group hover:border-primary/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs ${stat.containerClass}`}
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
          <div className="p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-border/60 bg-muted/25 min-h-[65px]">
            {/* Search Input */}
            <div className="relative w-full sm:w-60 md:w-72 lg:w-80 shrink-1 min-w-[180px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-150" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search quotes, estimates..."
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
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setActiveFilter(f);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-md text-xs transition-all duration-150 whitespace-nowrap cursor-pointer ${
                    activeFilter === f
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground font-medium hover:text-foreground hover:bg-primary/5"
                  }`}
                >
                  {f}
                </button>
              ))}
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
                    aria-label="Select all estimates"
                  />
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 w-[170px]">
                  Estimate #
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                  Client
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 w-[150px]">
                  Expiry Date
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-right w-[150px]">
                  Amount
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-center w-[160px]">
                  Status
                </TableHead>
                <TableHead className="py-3.5 px-6 text-right w-[60px]" />
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border/60">
              {isLoading && paginatedEstimates.length === 0 ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i} className="border-b border-border/60">
                    <TableCell className="py-4 px-4 text-center">
                      <Skeleton className="size-4 mx-auto rounded" />
                    </TableCell>
                    <TableCell className="py-4 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="py-4 px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="py-4 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="py-4 px-6 text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="py-4 px-6 text-center"><Skeleton className="h-6 w-20 rounded-md mx-auto" /></TableCell>
                    <TableCell className="py-4 px-6 text-right"><Skeleton className="size-8 ml-auto rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedEstimates.length === 0 ? (
                <TableEmpty colSpan={7}>
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3 py-8">
                    <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                      <Calculator className="size-7 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-1 text-center">
                      <h3 className="text-sm font-bold text-foreground">No estimates found</h3>
                      <p className="text-xs text-muted-foreground">
                        {search || activeFilter !== "All"
                          ? "No estimates match the selected filter criteria."
                          : "Create and issue client proposals to start billing."}
                      </p>
                    </div>
                  </div>
                </TableEmpty>
              ) : (
                paginatedEstimates.map((est) => {
                  const isRowSelected = selectedIds.has(est.id);
                  return (
                    <TableRow
                      key={est.id}
                      data-state={isRowSelected ? "selected" : undefined}
                      onClick={() => setSelectedEstimate(est)}
                      className={`hover:bg-muted/40 transition-colors group cursor-pointer ${
                        isRowSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <TableCell className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isRowSelected}
                          onCheckedChange={() => toggleSelect(est.id)}
                          aria-label={`Select estimate ${est.estimateNumber}`}
                        />
                      </TableCell>

                      <TableCell className="py-4 px-6 font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {est.estimateNumber}
                      </TableCell>

                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground">
                            {est.customerName || est.customers?.name || "Client"}
                          </span>
                          {est.customers?.email && (
                            <span className="text-[10px] text-muted-foreground">
                              {est.customers.email}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-6 text-xs text-muted-foreground font-medium">
                        {formatDate(est.expiryDate || est.date)}
                      </TableCell>

                      <TableCell className="py-4 px-6 text-right font-mono text-xs font-bold text-foreground">
                        {formatCurrency(est.amount)}
                      </TableCell>

                      <TableCell className="py-4 px-6 text-center">
                        {renderStatusBadge(est.status)}
                      </TableCell>

                      <TableCell className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleToggleBookmark(est, e)}
                            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
                            title={isBookmarked("estimate", est.id) ? "Remove Bookmark" : "Bookmark Estimate"}
                          >
                            <BookmarkIcon
                              className={`size-3.5 transition-colors ${
                                isBookmarked("estimate", est.id)
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground/40 hover:text-foreground"
                              }`}
                            />
                          </button>

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
                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-xl">
                              <DropdownMenuItem
                                onClick={(e) => handleToggleBookmark(est, e)}
                                className="cursor-pointer gap-2 text-xs font-medium"
                              >
                                <BookmarkIcon
                                  className={`size-3.5 ${
                                    isBookmarked("estimate", est.id)
                                      ? "fill-primary text-primary"
                                      : "text-muted-foreground"
                                  }`}
                                />
                                {isBookmarked("estimate", est.id) ? "Remove Bookmark" : "Bookmark Estimate"}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => setSelectedEstimate(est)}
                                className="cursor-pointer gap-2 text-xs font-medium"
                              >
                                <Eye className="size-3.5 text-muted-foreground" />
                                Preview Estimate
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => setSendingEstimate(est)}
                                className="cursor-pointer gap-2 text-xs font-semibold text-primary"
                              >
                                <Mail className="size-3.5" />
                                Send via Email (PDF)
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                disabled={Boolean(statusLoadingAction)}
                                onClick={() => handleStatusUpdate(est, "Sent")}
                                className="cursor-pointer gap-2 text-xs font-medium"
                              >
                                <Send className="size-3.5 text-muted-foreground" />
                                {statusLoadingAction === `${est.id}-Sent` ? "Processing..." : "Mark as Sent"}
                              </DropdownMenuItem>

                            <DropdownMenuItem
                              disabled={Boolean(statusLoadingAction)}
                              onClick={() => handleStatusUpdate(est, "Accepted")}
                              className="cursor-pointer gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                            >
                              <Check className="size-3.5" />
                              {statusLoadingAction === `${est.id}-Accepted` ? "Processing..." : "Mark as Accepted"}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              disabled={Boolean(statusLoadingAction)}
                              onClick={() => handleStatusUpdate(est, "Declined")}
                              className="cursor-pointer gap-2 text-xs font-medium text-destructive"
                            >
                              <X className="size-3.5" />
                              {statusLoadingAction === `${est.id}-Declined` ? "Processing..." : "Mark as Declined"}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 bg-border/60" />

                            <DropdownMenuItem
                              disabled={Boolean(statusLoadingAction)}
                              onClick={() => {
                                setEditingEstimate(est);
                                setIsCreateOpen(true);
                              }}
                              className="cursor-pointer gap-2 text-xs font-medium"
                            >
                              <Pencil className="size-3.5 text-muted-foreground" />
                              Edit Estimate
                            </DropdownMenuItem>

                            {String(est.status).toLowerCase() === "accepted" && (
                              <DropdownMenuItem
                                disabled={Boolean(statusLoadingAction)}
                                onClick={() => handleConvertToInvoice(est)}
                                className="cursor-pointer gap-2 text-xs font-semibold text-primary"
                              >
                                <ArrowRight className="size-3.5" />
                                {statusLoadingAction === `${est.id}-converting` ? "Converting..." : "Convert to Invoice"}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              disabled={Boolean(statusLoadingAction)}
                              onClick={() => handleDeleteEstimate(est.id, est.estimateNumber)}
                              className="cursor-pointer gap-2 text-xs font-medium text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                              Delete Estimate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={filteredEstimates.length}
            totalPages={totalPages}
            label="Estimates"
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        totalCount={filteredEstimates.length}
        label="estimates"
        enableExport={true}
        onClearSelection={() => setSelectedIds(new Set())}
        onDelete={() => setShowBulkDeleteConfirm(true)}
        onExport={handleBulkExport}
      />

      {/* Bulk Delete Confirm Dialog */}
      <BulkConfirmDialog
        open={showBulkDeleteConfirm}
        count={selectedIds.size}
        itemLabel="estimate"
        isPending={isBulkDeleting}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDeleteConfirm}
      />

      {/* Create / Edit Estimate Modal */}
      <CreateEstimateModal
        isOpen={isCreateOpen}
        estimateToEdit={editingEstimate}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingEstimate(null);
        }}
        onSuccess={() => refetch()}
      />

      {/* Estimate Multi-Template Preview Modal */}
      <EstimatePreviewModal
        open={Boolean(selectedEstimate)}
        estimate={selectedEstimate}
        onClose={() => setSelectedEstimate(null)}
        onSuccess={() => refetch()}
      />

      {/* Send Estimate via Email Modal */}
      <SendEstimateModal
        isOpen={Boolean(sendingEstimate)}
        estimate={sendingEstimate}
        onClose={() => setSendingEstimate(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default Estimates;

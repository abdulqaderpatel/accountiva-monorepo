import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  CreditCard,
  Clock,
  CheckCircle2,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  FileSpreadsheet,
  IndianRupee,
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
import { formatCurrency, formatDate, exportToCsv } from "@accountiva/shared";
import { useCreditNotes, useDeleteCreditNote } from "@accountiva/api";
import { CreateCreditNoteModal } from "@/components/credit-notes/CreateCreditNoteModal";
import { toast } from "sonner";
import { quickCreate } from "@/lib/quickCreate";

interface CreditNoteRecord {
  id: string;
  customerName?: string;
  customers?: { name: string; email?: string };
  creditNoteNumber: string;
  invoiceNumber?: string;
  date?: string;
  amount: number;
  remainingAmount?: number;
  reason?: string;
  notes?: string;
  status: string;
  customFields?: Record<string, any>;
}

export function CreditNotes() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCreditNote, setEditingCreditNote] = useState<CreditNoteRecord | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  React.useEffect(() => {
    if (quickCreate.consume("creditNote" as any)) {
      setEditingCreditNote(null);
      setIsCreateOpen(true);
    }
  }, []);

  const { data: apiCreditNotes, isLoading, refetch } = useCreditNotes();
  const deleteCreditNoteMutation = useDeleteCreditNote();

  const creditNoteList: CreditNoteRecord[] = useMemo(() => {
    if (Array.isArray(apiCreditNotes)) return apiCreditNotes;
    if (Array.isArray(apiCreditNotes?.data)) return apiCreditNotes.data;
    if (Array.isArray(apiCreditNotes?.creditNotes)) return apiCreditNotes.creditNotes;
    return [];
  }, [apiCreditNotes]);

  // Compute 3 KPI stats matching CreditNotes.vue
  const stats = useMemo(() => {
    const totalIssued = creditNoteList
      .filter((cn) => cn.status !== "Void")
      .reduce((sum, cn) => sum + (Number(cn.amount) || 0), 0);

    const totalApplied = creditNoteList
      .filter((cn) => cn.status !== "Void")
      .reduce((sum, cn) => {
        const amt = Number(cn.amount) || 0;
        const rem = Number(cn.remainingAmount ?? (cn.status === "Closed" ? 0 : amt));
        return sum + (amt - rem);
      }, 0);

    const remainingBalance = creditNoteList
      .filter((cn) => cn.status === "Open" || cn.status === "OPEN")
      .reduce((sum, cn) => sum + (Number(cn.remainingAmount ?? cn.amount) || 0), 0);

    return [
      {
        title: "Total Issued Credits",
        amount: formatCurrency(totalIssued),
        subText: "customer credits issued",
        icon: IndianRupee,
        color: "text-amber-700 dark:text-amber-400",
        bg: "bg-amber-500/10 border border-amber-500/15",
        accentBar: "bg-amber-500/50",
      },
      {
        title: "Total Applied Credits",
        amount: formatCurrency(totalApplied),
        subText: "settled against invoices",
        icon: CheckCircle2,
        color: "text-emerald-700 dark:text-emerald-400",
        bg: "bg-emerald-500/10 border border-emerald-500/15",
        accentBar: "bg-emerald-500/50",
      },
      {
        title: "Remaining Credit Balance",
        amount: formatCurrency(remainingBalance),
        subText: "available for future invoices",
        icon: Clock,
        color: "text-primary",
        bg: "bg-primary/10 border border-primary/20",
        accentBar: "bg-primary/50",
      },
    ];
  }, [creditNoteList]);

  const filteredCreditNotes = useMemo(() => {
    return creditNoteList.filter((cn) => {
      const custName = cn.customerName || cn.customers?.name || "";
      const matchesSearch =
        custName.toLowerCase().includes(search.toLowerCase()) ||
        (cn.creditNoteNumber && cn.creditNoteNumber.toLowerCase().includes(search.toLowerCase()));

      const s = String(cn.status || "").toLowerCase();
      let matchesFilter = true;
      if (activeFilter === "Draft") matchesFilter = s === "draft";
      else if (activeFilter === "Open") matchesFilter = s === "open";
      else if (activeFilter === "Closed") matchesFilter = s === "closed";
      else if (activeFilter === "Void") matchesFilter = s === "void";

      return matchesSearch && matchesFilter;
    });
  }, [creditNoteList, search, activeFilter]);

  const totalPages = Math.ceil(filteredCreditNotes.length / pageSize) || 1;
  const paginatedCreditNotes = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCreditNotes.slice(start, start + pageSize);
  }, [filteredCreditNotes, page, pageSize]);

  // Bulk selection helpers
  const isAllSelected =
    paginatedCreditNotes.length > 0 && paginatedCreditNotes.every((i) => selectedIds.has(i.id));
  const isIndeterminate =
    paginatedCreditNotes.some((i) => selectedIds.has(i.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      paginatedCreditNotes.forEach((i) => next.delete(i.id));
    } else {
      paginatedCreditNotes.forEach((i) => next.add(i.id));
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

  const handleDelete = async (id: string, num: string) => {
    if (!window.confirm(`Move credit note ${num} to trash?`)) return;
    try {
      await deleteCreditNoteMutation.mutateAsync(id);
      toast.success(`Credit Note ${num} deleted`);
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete credit note");
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await deleteCreditNoteMutation.mutateAsync(id);
      }
      toast.success(`Deleted ${selectedIds.size} credit note(s)`);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete selected credit notes");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExport = () => {
    const target = selectedIds.size > 0
      ? creditNoteList.filter((c) => selectedIds.has(c.id))
      : filteredCreditNotes;

    if (!target || target.length === 0) {
      toast.error("No credit notes available to export");
      return;
    }
    const exportData = target.map((cn) => ({
      "Credit Note #": cn.creditNoteNumber || "N/A",
      "Customer": cn.customerName || cn.customers?.name || "N/A",
      "Date": formatDate(cn.date),
      "Amount": cn.amount,
      "Remaining Balance": cn.remainingAmount ?? cn.amount,
      "Status": cn.status,
    }));
    exportToCsv(exportData, "credit-notes");
    toast.success(`Exported ${exportData.length} credit note(s) to CSV`);
  };

  const renderStatusBadge = (status: string) => {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "closed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="size-3" /> Closed
          </span>
        );
      case "open":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Open
          </span>
        );
      case "void":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Void
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

  const filters = ["All", "Draft", "Open", "Closed", "Void"];

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* Sticky Transitional Header */}
      <StickyPageHeader
        title="Credit Notes"
        subtitle="Manage customer credit adjustments, returns, and invoice balance write-offs"
        icon={CreditCard}
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
              setEditingCreditNote(null);
              setIsCreateOpen(true);
            }}
            className="h-9 px-4 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="size-3.5 mr-1.5" />
            Create Credit Note
          </Button>
        </div>
      </StickyPageHeader>

      <div className="px-8 pt-2 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading && creditNoteList.length === 0 ? (
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
                placeholder="Search credit notes..."
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
                    aria-label="Select all credit notes"
                  />
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 w-[170px]">
                  Credit Note #
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 w-[140px]">
                  Date
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                  Customer
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-center w-[140px]">
                  Status
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-right w-[150px]">
                  Amount
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-right w-[150px]">
                  Remaining
                </TableHead>
                <TableHead className="py-3.5 px-6 text-right w-[60px]" />
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border/60">
              {isLoading && paginatedCreditNotes.length === 0 ? (
                [1, 2, 3].map((i) => (
                  <TableRow key={i} className="border-b border-border/60">
                    <TableCell className="py-4 px-4 text-center">
                      <Skeleton className="size-4 mx-auto rounded" />
                    </TableCell>
                    <TableCell className="py-4 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="py-4 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="py-4 px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="py-4 px-6 text-center"><Skeleton className="h-6 w-16 mx-auto rounded-md" /></TableCell>
                    <TableCell className="py-4 px-6 text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="py-4 px-6 text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="py-4 px-6 text-right"><Skeleton className="size-8 ml-auto rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedCreditNotes.length === 0 ? (
                <TableEmpty colSpan={8}>
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3 py-8">
                    <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                      <CreditCard className="size-7 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-1 text-center">
                      <h3 className="text-sm font-bold text-foreground">No credit notes found</h3>
                      <p className="text-xs text-muted-foreground">
                        {search || activeFilter !== "All"
                          ? "No credit notes match the filter criteria."
                          : "Issue customer credit notes to adjust invoice balances."}
                      </p>
                    </div>
                  </div>
                </TableEmpty>
              ) : (
                paginatedCreditNotes.map((cn) => {
                  const isRowSelected = selectedIds.has(cn.id);
                  const rem = cn.remainingAmount ?? (cn.status === "Closed" ? 0 : cn.amount);

                  return (
                    <TableRow
                      key={cn.id}
                      data-state={isRowSelected ? "selected" : undefined}
                      className={`hover:bg-muted/40 transition-colors group cursor-pointer ${
                        isRowSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <TableCell className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isRowSelected}
                          onCheckedChange={() => toggleSelect(cn.id)}
                          aria-label={`Select credit note ${cn.creditNoteNumber}`}
                        />
                      </TableCell>

                      <TableCell className="py-4 px-6 font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {cn.creditNoteNumber}
                      </TableCell>

                      <TableCell className="py-4 px-6 text-xs text-muted-foreground font-medium">
                        {formatDate(cn.date)}
                      </TableCell>

                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground">
                            {cn.customerName || cn.customers?.name || "Customer"}
                          </span>
                          {cn.invoiceNumber && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              Inv: {cn.invoiceNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-6 text-center">
                        {renderStatusBadge(cn.status)}
                      </TableCell>

                      <TableCell className="py-4 px-6 text-right font-mono text-xs font-bold text-foreground">
                        {formatCurrency(cn.amount)}
                      </TableCell>

                      <TableCell className="py-4 px-6 text-right font-mono text-xs font-bold text-primary">
                        {formatCurrency(rem)}
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
                          <DropdownMenuContent align="end" className="w-44 rounded-xl p-1 shadow-xl">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingCreditNote(cn);
                                setIsCreateOpen(true);
                              }}
                              className="cursor-pointer gap-2 text-xs font-semibold"
                            >
                              <Pencil className="size-3.5 text-muted-foreground" />
                              Edit Credit Note
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 bg-border/60" />

                            <DropdownMenuItem
                              onClick={() => handleDelete(cn.id, cn.creditNoteNumber)}
                              className="cursor-pointer gap-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                              Delete
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
          {filteredCreditNotes.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/20">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Showing {Math.min((page - 1) * pageSize + 1, filteredCreditNotes.length)}–
                {Math.min(page * pageSize, filteredCreditNotes.length)} of {filteredCreditNotes.length} credit notes
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
        totalCount={filteredCreditNotes.length}
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
        itemLabel="credit note"
        isPending={isBulkDeleting}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDeleteConfirm}
      />

      {/* Create / Edit Credit Note Modal */}
      <CreateCreditNoteModal
        isOpen={isCreateOpen}
        creditNoteToEdit={editingCreditNote}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingCreditNote(null);
        }}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default CreditNotes;

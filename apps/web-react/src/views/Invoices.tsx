import React, { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@accountiva/shared";
import { useInvoices } from "@accountiva/api";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { InvoiceDetailModal } from "@/components/invoices/InvoiceDetailModal";
import { EmptyState } from "@/components/ui/empty-state";

interface InvoiceRecord {
  id: string;
  customerName?: string;
  customers?: { name: string };
  invoiceNumber: string;
  date?: string;
  issueDate?: string;
  dueDate: string;
  amount: number;
  status: "Draft" | "Outstanding" | "Paid" | "Overdue" | "SENT" | "PAID" | "OVERDUE" | "DRAFT";
}

export function Invoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  const { data: apiInvoices, isLoading, refetch } = useInvoices({
    search: search || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const invoiceList: InvoiceRecord[] = Array.isArray(apiInvoices)
    ? apiInvoices
    : (Array.isArray(apiInvoices?.data)
        ? apiInvoices.data
        : []);

  const filteredInvoices = invoiceList.filter((inv) => {
    const custName = inv.customerName || inv.customers?.name || "";
    const matchesSearch =
      custName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());

    const normalizedStatus = inv.status.toUpperCase();
    const matchesStatus =
      statusFilter === "ALL" ||
      normalizedStatus === statusFilter ||
      (statusFilter === "PENDING" && (normalizedStatus === "OUTSTANDING" || normalizedStatus === "SENT"));

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case "PAID":
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Paid</Badge>;
      case "OUTSTANDING":
      case "SENT":
      case "PENDING":
        return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "OVERDUE":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Overdue</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1">Draft</Badge>;
    }
  };

  const totalInvoiced = filteredInvoices.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const paidCount = filteredInvoices.filter((i) => i.status.toUpperCase() === "PAID").length;
  const overdueCount = filteredInvoices.filter((i) => i.status.toUpperCase() === "OVERDUE").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Manage, generate, and monitor receivables and customer billing.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Total Filtered Amount</p>
          <p className="text-xl font-bold font-mono text-foreground mt-1">
            {formatCurrency(totalInvoiced)}
          </p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Settled Invoices</p>
          <p className="text-xl font-bold font-mono text-emerald-500 mt-1">
            {paidCount} <span className="text-xs font-normal text-muted-foreground">/ {filteredInvoices.length}</span>
          </p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Overdue Invoices</p>
          <p className="text-xl font-bold font-mono text-destructive mt-1">
            {overdueCount} <span className="text-xs font-normal text-muted-foreground">requiring follow-up</span>
          </p>
        </Card>
      </div>

      {/* Search & Status Filters */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border/60">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer or invoice #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {["ALL", "PAID", "PENDING", "OVERDUE", "DRAFT"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Spinner size="md" />
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4">
                    <EmptyState
                      icon={FileText}
                      title="No invoices found"
                      description={
                        search || statusFilter !== "ALL"
                          ? "No invoices match the selected filter or search keyword."
                          : "Create and issue your first invoice to get paid faster."
                      }
                      actionLabel={search || statusFilter !== "ALL" ? "Clear Filters" : "Create Invoice"}
                      onAction={() => {
                        if (search || statusFilter !== "ALL") {
                          setSearch("");
                          setStatusFilter("ALL");
                        } else {
                          setIsCreateOpen(true);
                        }
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {inv.customerName || inv.customers?.name || "Unknown"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {inv.dueDate}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="View Details"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(inv);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Options"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
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

      {/* Invoice Creation Modal */}
      <CreateInvoiceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoice)}
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default Invoices;

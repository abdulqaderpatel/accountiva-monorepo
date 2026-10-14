import React, { useState } from "react";
import {
  Plus,
  Search,
  Download,
  MoreVertical,
  Calculator,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@accountiva/shared";
import { useEstimates, useDeleteEstimate, useUpdateEstimate, useCreateInvoice } from "@accountiva/api";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateEstimateModal } from "@/components/estimates/CreateEstimateModal";

interface EstimateRecord {
  id: string;
  customerName?: string;
  customers?: { name: string };
  estimateNumber: string;
  date?: string;
  expiryDate?: string;
  amount: number;
  items?: any[];
  notes?: string;
  status: "Draft" | "Sent" | "Accepted" | "Declined" | "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED";
}

export function Estimates() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: apiEstimates, isLoading, refetch } = useEstimates();
  const createInvoiceMutation = useCreateInvoice();
  const updateEstimateMutation = useUpdateEstimate();

  const handleConvertToInvoice = async (est: EstimateRecord) => {
    try {
      const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      await createInvoiceMutation.mutateAsync({
        invoiceNumber: invNumber,
        customerName: est.customerName || est.customers?.name || "Customer",
        date: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        amount: Number(est.amount) || 0,
        subtotal: Number(est.amount) * 0.847,
        taxPercent: 18,
        taxAmount: Number(est.amount) * 0.153,
        status: "Draft",
        notes: `Converted from Estimate ${est.estimateNumber}. ${est.notes || ""}`.trim(),
        items: est.items || [
          {
            itemName: `Quote items from ${est.estimateNumber}`,
            quantity: 1,
            rate: Number(est.amount) || 0,
            amount: Number(est.amount) || 0,
          },
        ],
      });

      await updateEstimateMutation.mutateAsync({
        id: est.id,
        payload: { status: "Accepted" },
      });

      toast.success(`Estimate converted to Invoice ${invNumber}!`, {
        description: "Draft invoice created and estimate marked as Accepted.",
      });
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to convert estimate");
    }
  };

  const estimateList: EstimateRecord[] = React.useMemo(() => {
    if (Array.isArray(apiEstimates) && apiEstimates.length > 0) return apiEstimates;
    if (Array.isArray(apiEstimates?.data) && apiEstimates.data.length > 0) return apiEstimates.data;
    return [];
  }, [apiEstimates]);

  const filteredEstimates = estimateList.filter((est) => {
    const custName = est.customerName || est.customers?.name || "";
    const matchesSearch =
      custName.toLowerCase().includes(search.toLowerCase()) ||
      est.estimateNumber.toLowerCase().includes(search.toLowerCase());

    const normalizedStatus = est.status.toUpperCase();
    const matchesStatus =
      statusFilter === "ALL" ||
      normalizedStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case "ACCEPTED":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Accepted
          </Badge>
        );
      case "SENT":
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" /> Sent
          </Badge>
        );
      case "DECLINED":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" /> Declined
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            Draft
          </Badge>
        );
    }
  };

  const totalPipeline = filteredEstimates.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const acceptedCount = filteredEstimates.filter((e) => e.status.toUpperCase() === "ACCEPTED").length;
  const pendingCount = filteredEstimates.filter((e) => e.status.toUpperCase() === "SENT").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Estimates & Quotes
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate quotations, track client approvals, and convert accepted bids into invoices.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            size="sm"
            className="gap-2 font-bold shadow-xs"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create Estimate
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Total Pipeline Value</p>
          <p className="text-xl font-bold font-mono text-foreground mt-1">
            {formatCurrency(totalPipeline)}
          </p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Accepted Quotes</p>
          <p className="text-xl font-bold font-mono text-emerald-500 mt-1">
            {acceptedCount} <span className="text-xs font-normal text-muted-foreground">/ {filteredEstimates.length}</span>
          </p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Awaiting Response</p>
          <p className="text-xl font-bold font-mono text-amber-500 mt-1">
            {pendingCount} <span className="text-xs font-normal text-muted-foreground">proposals sent</span>
          </p>
        </Card>
      </div>

      {/* Search & Status Filters */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border/60">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer or estimate #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {["ALL", "SENT", "ACCEPTED", "DECLINED", "DRAFT"].map((st) => (
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

        {/* Estimates Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                <th className="py-3 px-4">Estimate #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Expiry Date</th>
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
                      <span>Loading estimates...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEstimates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4">
                    <EmptyState
                      icon={Calculator}
                      title="No estimates found"
                      description={
                        search || statusFilter !== "ALL"
                          ? "No estimates match your current filters."
                          : "Create quotations to send to prospective clients and convert them to invoices once approved."
                      }
                      actionLabel={search || statusFilter !== "ALL" ? "Clear Filters" : undefined}
                      onAction={() => {
                        setSearch("");
                        setStatusFilter("ALL");
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filteredEstimates.map((est) => (
                  <tr
                    key={est.id}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {est.estimateNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {est.customerName || est.customers?.name || "Unknown Customer"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {est.expiryDate || est.date || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                      {formatCurrency(est.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(est.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {est.status.toUpperCase() !== "ACCEPTED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            title="Convert to Invoice"
                            onClick={() => handleConvertToInvoice(est)}
                            disabled={createInvoiceMutation.isPending}
                          >
                            <FileCheck className="h-3 w-3" />
                            <span>Convert</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="View Details"
                          onClick={() => toast.info(`Estimate ${est.estimateNumber}: ${formatCurrency(est.amount)} (${est.status})`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Options"
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

      {/* Create Estimate Modal */}
      <CreateEstimateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

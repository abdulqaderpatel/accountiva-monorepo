import React, { useState } from "react";
import {
  Plus,
  Search,
  Download,
  MoreVertical,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@accountiva/shared";
import { useCreditNotes } from "@accountiva/api";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

interface CreditNoteRecord {
  id: string;
  customerName?: string;
  customers?: { name: string };
  creditNoteNumber: string;
  date?: string;
  amount: number;
  status: "Open" | "Closed" | "OPEN" | "CLOSED" | "Draft" | "DRAFT";
}

export function CreditNotes() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: apiCreditNotes, isLoading, refetch } = useCreditNotes();

  const creditNoteList: CreditNoteRecord[] = React.useMemo(() => {
    if (Array.isArray(apiCreditNotes) && apiCreditNotes.length > 0) return apiCreditNotes;
    if (Array.isArray(apiCreditNotes?.data) && apiCreditNotes.data.length > 0) return apiCreditNotes.data;
    return [];
  }, [apiCreditNotes]);

  const filteredCreditNotes = creditNoteList.filter((cn) => {
    const custName = cn.customerName || cn.customers?.name || "";
    const matchesSearch =
      custName.toLowerCase().includes(search.toLowerCase()) ||
      cn.creditNoteNumber.toLowerCase().includes(search.toLowerCase());

    const normalizedStatus = cn.status.toUpperCase();
    const matchesStatus =
      statusFilter === "ALL" ||
      normalizedStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case "OPEN":
        return (
          <Badge variant="warning" className="gap-1">
            <AlertCircle className="h-3 w-3" /> Open
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Closed
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

  const totalCredits = filteredCreditNotes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const openCreditsTotal = filteredCreditNotes
    .filter((c) => c.status.toUpperCase() === "OPEN")
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const closedCount = filteredCreditNotes.filter((c) => c.status.toUpperCase() === "CLOSED").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Credit Notes
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage customer credit adjustments, returns, and invoice balance write-offs.
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
            onClick={() => toast.info("New credit note adjustment recorded.")}
          >
            <Plus className="h-4 w-4" />
            New Credit Note
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Total Issued Credits</p>
          <p className="text-xl font-bold font-mono text-foreground mt-1">
            {formatCurrency(totalCredits)}
          </p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Available / Open Credit</p>
          <p className="text-xl font-bold font-mono text-amber-500 mt-1">
            {formatCurrency(openCreditsTotal)}
          </p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Settled Adjustments</p>
          <p className="text-xl font-bold font-mono text-emerald-500 mt-1">
            {closedCount} <span className="text-xs font-normal text-muted-foreground">closed credits</span>
          </p>
        </Card>
      </div>

      {/* Search & Status Filters */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border/60">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer or credit note #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {["ALL", "OPEN", "CLOSED", "DRAFT"].map((st) => (
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

        {/* Credit Notes Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                <th className="py-3 px-4">Credit Note #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
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
                      <span>Loading credit notes...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCreditNotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4">
                    <EmptyState
                      icon={FileMinus}
                      title="No credit notes found"
                      description={
                        search || statusFilter !== "ALL"
                          ? "No credit notes match the current filter or search criteria."
                          : "Issue credit adjustments and refunds to client balances when goods are returned or billed incorrectly."
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
                filteredCreditNotes.map((cn) => (
                  <tr
                    key={cn.id}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {cn.creditNoteNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {cn.customerName || cn.customers?.name || "Unknown Customer"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {cn.date || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                      {formatCurrency(cn.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(cn.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="View Details"
                          onClick={() => toast.info(`Viewing ${cn.creditNoteNumber}`)}
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
    </div>
  );
}

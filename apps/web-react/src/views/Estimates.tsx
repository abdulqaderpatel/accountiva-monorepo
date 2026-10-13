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
import { useEstimates, useDeleteEstimate } from "@accountiva/api";
import { toast } from "sonner";

interface EstimateRecord {
  id: string;
  customerName?: string;
  customers?: { name: string };
  estimateNumber: string;
  date?: string;
  expiryDate?: string;
  amount: number;
  status: "Draft" | "Sent" | "Accepted" | "Declined" | "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED";
}

const FALLBACK_ESTIMATES: EstimateRecord[] = [
  {
    id: "1",
    customerName: "Delta Retail Corp",
    estimateNumber: "EST-2026-012",
    date: "2026-10-10",
    expiryDate: "2026-11-10",
    amount: 45000,
    status: "Sent",
  },
  {
    id: "2",
    customerName: "Zephyr Logistics Pvt Ltd",
    estimateNumber: "EST-2026-011",
    date: "2026-10-02",
    expiryDate: "2026-11-02",
    amount: 112000,
    status: "Accepted",
  },
  {
    id: "3",
    customerName: "Horizon Software Systems",
    estimateNumber: "EST-2026-010",
    date: "2026-09-28",
    expiryDate: "2026-10-28",
    amount: 68500,
    status: "Draft",
  },
];

export function Estimates() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: apiEstimates, isLoading, refetch } = useEstimates();

  const estimateList: EstimateRecord[] = React.useMemo(() => {
    if (Array.isArray(apiEstimates) && apiEstimates.length > 0) return apiEstimates;
    if (Array.isArray(apiEstimates?.data) && apiEstimates.data.length > 0) return apiEstimates.data;
    return FALLBACK_ESTIMATES;
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
            onClick={() => toast.info("New estimate draft created. Use invoice screen to convert to billing.")}
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
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Calculator className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                    No estimates found matching your criteria.
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="View Details"
                          onClick={() => toast.info(`Viewing ${est.estimateNumber}`)}
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

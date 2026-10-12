import React, { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@accountiva/shared";

interface InvoiceRecord {
  id: string;
  customerName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: "PAID" | "SENT" | "OVERDUE" | "DRAFT";
}

export function Invoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [invoices] = useState<InvoiceRecord[]>([
    {
      id: "1",
      customerName: "Delta Retail Corp",
      invoiceNumber: "INV-2026-042",
      issueDate: "12 Oct 2026",
      dueDate: "26 Oct 2026",
      amount: 35400,
      status: "PAID",
    },
    {
      id: "2",
      customerName: "Zephyr Logistics Pvt Ltd",
      invoiceNumber: "INV-2026-041",
      issueDate: "01 Oct 2026",
      dueDate: "15 Oct 2026",
      amount: 78250,
      status: "SENT",
    },
    {
      id: "3",
      customerName: "Horizon Software Systems",
      invoiceNumber: "INV-2026-039",
      issueDate: "15 Sep 2026",
      dueDate: "05 Oct 2026",
      amount: 42800,
      status: "OVERDUE",
    },
    {
      id: "4",
      customerName: "Sterling Media Group",
      invoiceNumber: "INV-2026-038",
      issueDate: "28 Sep 2026",
      dueDate: "28 Oct 2026",
      amount: 18000,
      status: "DRAFT",
    },
  ]);

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getBadgeVariant = (status: InvoiceRecord["status"]) => {
    switch (status) {
      case "PAID":
        return "success";
      case "SENT":
        return "warning";
      case "OVERDUE":
        return "danger";
      case "DRAFT":
        return "draft";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage, generate, and track all sales invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="size-4" />
            <span>Export CSV</span>
          </Button>

          <Button size="sm" className="gap-2 font-bold shadow-xs">
            <Plus className="size-4" />
            <span>New Invoice</span>
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by customer or invoice #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "PAID", "SENT", "OVERDUE", "DRAFT"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="text-xs h-8 px-3 font-medium"
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">
                  <th className="py-3.5 pl-6">Invoice #</th>
                  <th className="py-3.5">Customer</th>
                  <th className="py-3.5">Issue Date</th>
                  <th className="py-3.5">Due Date</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5 pr-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="py-4 pl-6 font-mono font-bold text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span>{inv.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className="py-4 font-semibold text-foreground">
                      {inv.customerName}
                    </td>
                    <td className="py-4 text-muted-foreground text-xs">
                      {inv.issueDate}
                    </td>
                    <td className="py-4 text-muted-foreground text-xs">
                      {inv.dueDate}
                    </td>
                    <td className="py-4">
                      <Badge variant={getBadgeVariant(inv.status)} size="sm">
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-4 pr-6 text-right font-black text-foreground">
                      {formatCurrency(inv.amount, "INR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

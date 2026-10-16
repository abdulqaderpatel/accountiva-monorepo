import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  FileText,
  Calculator,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Download,
  Calendar,
  Layers,
  Pencil,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatCurrency, formatDate, exportToCsv } from "@accountiva/shared";
import {
  useCustomer,
  useDeleteCustomer,
  useInvoices,
  useEstimates,
} from "@accountiva/api";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { CreateEstimateModal } from "@/components/estimates/CreateEstimateModal";
import { toast } from "sonner";

export function CustomerDetail() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"Transactions" | "Statements" | "Details">("Transactions");
  const [transactionFilter, setTransactionFilter] = useState<"All" | "Invoices" | "Estimates">("All");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isEstimateOpen, setIsEstimateOpen] = useState(false);

  const { data: customerData, isLoading: isCustLoading, refetch } = useCustomer(id);
  const { data: apiInvoices, refetch: refetchInvoices } = useInvoices();
  const { data: apiEstimates, refetch: refetchEstimates } = useEstimates();
  const deleteCustomerMutation = useDeleteCustomer();

  const customer = customerData?.data || customerData || {};

  // Find invoices & estimates for this customer
  const customerInvoices = useMemo(() => {
    const raw: any[] = Array.isArray(apiInvoices)
      ? apiInvoices
      : Array.isArray(apiInvoices?.data)
      ? apiInvoices.data
      : Array.isArray(apiInvoices?.invoices)
      ? apiInvoices.invoices
      : [];
    return raw.filter(
      (inv) =>
        inv.customerId === id ||
        (customer.name && (inv.customerName === customer.name || inv.customers?.name === customer.name))
    );
  }, [apiInvoices, id, customer.name]);

  const customerEstimates = useMemo(() => {
    const raw: any[] = Array.isArray(apiEstimates)
      ? apiEstimates
      : Array.isArray(apiEstimates?.data)
      ? apiEstimates.data
      : Array.isArray(apiEstimates?.estimates)
      ? apiEstimates.estimates
      : [];
    return raw.filter(
      (est) =>
        est.customerId === id ||
        (customer.name && (est.customerName === customer.name || est.customers?.name === customer.name))
    );
  }, [apiEstimates, id, customer.name]);

  // Combined transactions list
  const transactions = useMemo(() => {
    const items: any[] = [];
    customerInvoices.forEach((inv) => {
      items.push({
        id: inv.id,
        type: "Invoice",
        number: inv.invoiceNumber || `INV-${inv.id}`,
        date: inv.date || inv.issueDate || inv.createdAt || "",
        amount: Number(inv.amount) || 0,
        status: inv.status || "Draft",
        raw: inv,
      });
    });
    customerEstimates.forEach((est) => {
      items.push({
        id: est.id,
        type: "Estimate",
        number: est.estimateNumber || `EST-${est.id}`,
        date: est.date || est.expiryDate || est.createdAt || "",
        amount: Number(est.amount) || 0,
        status: est.status || "Draft",
        raw: est,
      });
    });

    return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [customerInvoices, customerEstimates]);

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === "Invoices") return transactions.filter((t) => t.type === "Invoice");
    if (transactionFilter === "Estimates") return transactions.filter((t) => t.type === "Estimate");
    return transactions;
  }, [transactions, transactionFilter]);

  // Financial calculations
  const outstanding = useMemo(() => {
    return customerInvoices
      .filter((i) => {
        const s = String(i.status || "").toLowerCase();
        return s !== "paid" && s !== "draft";
      })
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [customerInvoices]);

  const totalPaid = useMemo(() => {
    return customerInvoices
      .filter((i) => String(i.status || "").toLowerCase() === "paid")
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [customerInvoices]);

  const pipelineEstimates = useMemo(() => {
    return customerEstimates
      .filter((e) => {
        const s = String(e.status || "").toLowerCase();
        return s === "sent" || s === "accepted";
      })
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [customerEstimates]);

  const stats = [
    {
      title: "Outstanding Balance",
      amount: formatCurrency(outstanding),
      subText: `${customerInvoices.length} invoices issued`,
      icon: TrendingUp,
      color: "text-rose-700 dark:text-rose-400",
      bg: "bg-rose-500/10 border border-rose-500/15",
      accentBar: "bg-rose-500/50",
    },
    {
      title: "Total Revenue Collected",
      amount: formatCurrency(totalPaid),
      subText: "settled receivables",
      icon: TrendingDown,
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border border-emerald-500/15",
      accentBar: "bg-emerald-500/50",
    },
    {
      title: "Active Quotation Pipeline",
      amount: formatCurrency(pipelineEstimates),
      subText: `${customerEstimates.length} quote proposals`,
      icon: Calculator,
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-500/10 border border-amber-500/15",
      accentBar: "bg-amber-500/50",
    },
  ];

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete customer ${customer.name}?`)) return;
    try {
      await deleteCustomerMutation.mutateAsync(id);
      toast.success("Customer deleted");
      navigate({ to: "/customers" });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete customer");
    }
  };

  const handleExportHistory = () => {
    if (transactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }
    const data = transactions.map((t) => ({
      Type: t.type,
      "Document #": t.number,
      Date: formatDate(t.date),
      Status: t.status,
      Amount: t.amount,
    }));
    exportToCsv(data, `customer-${customer.name || id}-transactions`);
    toast.success(`Exported ${data.length} records to CSV`);
  };

  if (isCustLoading) {
    return (
      <div className="flex-1 p-8 max-w-7xl mx-auto space-y-6 w-full">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const initials = (customer.name ? customer.name.charAt(0) : "C").toUpperCase();

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8 max-w-7xl mx-auto space-y-8 w-full">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-4">
          <Link
            to="/customers"
            className="size-10 rounded-xl bg-card border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl shadow-2xs">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
                  {customer.name || "Customer Profile"}
                </h1>
                {customer.customerCode && (
                  <span className="text-[10px] font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-muted-foreground border border-border/60">
                    {customer.customerCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {customer.company ? `${customer.company} • ` : ""}
                {customer.email || "No email on file"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditOpen(true)}
            className="h-9 px-3 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
          >
            <Pencil className="size-3.5" /> Edit Profile
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportHistory}
            className="h-9 px-3 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="size-3.5 text-muted-foreground" /> Export History
          </Button>
          <Button
            size="sm"
            onClick={() => setIsInvoiceOpen(true)}
            className="h-9 px-3 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="size-3.5" /> New Invoice
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            className="size-9 rounded-lg text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            title="Delete Customer"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((stat) => {
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
        })}
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-border/60 gap-6">
        {(["Transactions", "Statements", "Details"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-xs font-bold tracking-wide border-b-2 transition-colors cursor-pointer ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "Transactions" ? `Transactions (${transactions.length})` : tab}
          </button>
        ))}
      </div>

      {/* Tab: Transactions */}
      {activeTab === "Transactions" && (
        <div className="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs space-y-0">
          <div className="p-4 flex items-center justify-between border-b border-border/60 bg-muted/25">
            <div className="inline-flex h-8.5 items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
              {(["All", "Invoices", "Estimates"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTransactionFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs transition-all duration-150 cursor-pointer ${
                    transactionFilter === f
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground font-medium hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Showing {filteredTransactions.length} transaction(s)
            </span>
          </div>

          <Table>
            <TableHeader className="bg-muted/35 border-b border-border/70">
              <TableRow className="hover:bg-transparent border-b border-border/70">
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 w-[120px]">
                  Type
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                  Document #
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 w-[140px]">
                  Date
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-center w-[140px]">
                  Status
                </TableHead>
                <TableHead className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-right w-[150px]">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border/60">
              {filteredTransactions.length === 0 ? (
                <TableEmpty colSpan={5}>
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3 py-8">
                    <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                      <FileText className="size-7 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-1 text-center">
                      <h3 className="text-sm font-bold text-foreground">No transactions recorded</h3>
                      <p className="text-xs text-muted-foreground">
                        Issue an invoice or quotation for this client to begin building their transaction history.
                      </p>
                    </div>
                  </div>
                </TableEmpty>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow
                    key={`${tx.type}-${tx.id}`}
                    onClick={() => {
                      if (tx.type === "Invoice") navigate({ to: "/invoices" });
                      else navigate({ to: "/estimates" });
                    }}
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <TableCell className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                          tx.type === "Invoice"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
                        }`}
                      >
                        {tx.type === "Invoice" ? <FileText className="size-3" /> : <Calculator className="size-3" />}
                        {tx.type}
                      </span>
                    </TableCell>

                    <TableCell className="py-4 px-6 font-mono text-xs font-bold text-foreground">
                      {tx.number}
                    </TableCell>

                    <TableCell className="py-4 px-6 text-xs text-muted-foreground font-medium">
                      {formatDate(tx.date)}
                    </TableCell>

                    <TableCell className="py-4 px-6 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-muted text-muted-foreground border border-border">
                        {tx.status}
                      </span>
                    </TableCell>

                    <TableCell className="py-4 px-6 text-right font-mono text-xs font-bold text-foreground">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab: Statements */}
      {activeTab === "Statements" && (
        <Card className="border-border/60 bg-card/60 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Customer Account Statement</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Summary of all historical billings, settled payments, and current outstanding balances.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportHistory}
              className="gap-2 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="size-3.5 text-muted-foreground" /> Download Statement CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Statement Details
              </span>
              <div className="space-y-1">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Client Name:</span>
                  <span className="font-semibold text-foreground">{customer.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">GSTIN / Tax ID:</span>
                  <span className="font-mono text-foreground">{customer.gstNumber || customer.pan || "N/A"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Total Invoices:</span>
                  <span className="font-mono font-bold text-foreground">{customerInvoices.length}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Financial Summary
              </span>
              <div className="space-y-1">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Total Invoiced:</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrency(customerInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0))}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Total Paid:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalPaid)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground font-bold">Outstanding Balance:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(outstanding)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Details */}
      {activeTab === "Details" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border/60 bg-card/60 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/60 flex items-center gap-2">
              <Building2 className="size-4 text-primary" /> Contact & Business Info
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Primary Contact</span>
                <span className="font-semibold text-foreground text-sm">{customer.name}</span>
              </div>
              {customer.company && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Company</span>
                  <span className="font-medium text-foreground">{customer.company}</span>
                </div>
              )}
              {customer.email && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Email Address</span>
                  <span className="font-medium text-foreground">{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Phone Number</span>
                  <span className="font-medium text-foreground">{customer.phone}</span>
                </div>
              )}
              {customer.gstTreatment && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">GST Treatment</span>
                  <span className="font-medium text-foreground">{customer.gstTreatment}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="border-border/60 bg-card/60 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/60 flex items-center gap-2">
              <MapPin className="size-4 text-primary" /> Address & Tax Identification
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Billing Address</span>
                <p className="font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                  {customer.billingAddress || customer.address || "No address on file"}
                </p>
              </div>
              {customer.shippingAddress && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Shipping Address</span>
                  <p className="font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                    {customer.shippingAddress}
                  </p>
                </div>
              )}
              {customer.gstNumber && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">GSTIN</span>
                  <span className="font-mono font-bold text-foreground">{customer.gstNumber}</span>
                </div>
              )}
              {customer.pan && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">PAN</span>
                  <span className="font-mono font-bold text-foreground">{customer.pan}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modals */}
      <AddCustomerModal
        isOpen={isEditOpen}
        customer={customer}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => refetch()}
      />

      <CreateInvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        onSuccess={() => {
          refetchInvoices();
          refetch();
        }}
      />

      <CreateEstimateModal
        isOpen={isEstimateOpen}
        onClose={() => setIsEstimateOpen(false)}
        onSuccess={() => {
          refetchEstimates();
          refetch();
        }}
      />
    </div>
  );
}

export default CustomerDetail;

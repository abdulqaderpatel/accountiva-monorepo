import React, { useState } from "react";
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
  Eye,
  Edit3,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, exportToCsv } from "@accountiva/shared";
import { useCustomer, useDeleteCustomer, useInvoices, useEstimates } from "@accountiva/api";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { CreateEstimateModal } from "@/components/estimates/CreateEstimateModal";
import { toast } from "sonner";

export function CustomerDetail() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"transactions" | "details">("transactions");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isEstimateOpen, setIsEstimateOpen] = useState(false);

  const { data: customerData, isLoading: isCustLoading } = useCustomer(id);
  const { data: apiInvoices, refetch: refetchInvoices } = useInvoices();
  const { data: apiEstimates, refetch: refetchEstimates } = useEstimates();
  const deleteCustomerMutation = useDeleteCustomer();

  const customer = customerData?.data || customerData || {};

  // Find invoices & estimates for this customer
  const customerInvoices = React.useMemo(() => {
    const raw: any[] = Array.isArray(apiInvoices)
      ? apiInvoices
      : Array.isArray(apiInvoices?.data)
      ? apiInvoices.data
      : [];
    return raw.filter(
      (inv) =>
        inv.customerId === id ||
        (customer.name && (inv.customerName === customer.name || inv.customers?.name === customer.name))
    );
  }, [apiInvoices, id, customer.name]);

  const customerEstimates = React.useMemo(() => {
    const raw: any[] = Array.isArray(apiEstimates)
      ? apiEstimates
      : Array.isArray(apiEstimates?.data)
      ? apiEstimates.data
      : [];
    return raw.filter(
      (est) =>
        est.customerId === id ||
        (customer.name && (est.customerName === customer.name || est.customers?.name === customer.name))
    );
  }, [apiEstimates, id, customer.name]);

  // Combined transactions list
  const transactions = React.useMemo(() => {
    const items: any[] = [];
    customerInvoices.forEach((inv) => {
      items.push({
        id: inv.id,
        type: "Invoice",
        number: inv.invoiceNumber || `INV-${inv.id}`,
        date: inv.date || inv.issueDate || "—",
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
        date: est.date || est.expiryDate || "—",
        amount: Number(est.amount) || 0,
        status: est.status || "Draft",
        raw: est,
      });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customerInvoices, customerEstimates]);

  // Financial KPI calculations
  const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const totalPaid = customerInvoices
    .filter((inv) => String(inv.status).toUpperCase() === "PAID")
    .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const outstanding = totalInvoiced - totalPaid;
  const pipelineEstimates = customerEstimates.reduce((sum, est) => sum + (Number(est.amount) || 0), 0);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${customer.name || "this customer"}?`)) {
      return;
    }
    try {
      await deleteCustomerMutation.mutateAsync(id);
      toast.success("Customer deleted successfully");
      navigate({ to: "/customers" as any });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete customer");
    }
  };

  const handleExportHistory = () => {
    if (!transactions || transactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }
    const exportData = transactions.map((t) => ({
      "Type": t.type,
      "Number": t.number,
      "Date": t.date,
      "Amount": t.amount,
      "Status": t.status,
    }));
    exportToCsv(exportData, `customer-${customer.name || id}-transactions`);
    toast.success(`Exported ${exportData.length} transaction(s) to CSV`);
  };

  if (isCustLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <span className="text-sm text-muted-foreground">Loading customer profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb back */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/customers" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="size-3.5" />
          <span>Back to Customers</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">{customer.name || "Customer Profile"}</span>
      </div>

      {/* Header Profile Card */}
      <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl font-display shadow-2xs">
            {customer.name ? customer.name.slice(0, 2).toUpperCase() : "CU"}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground font-display">
                {customer.name || "Unknown Customer"}
              </h1>
              <Badge variant={customer.gstTreatment === "Registered" ? "default" : "secondary"}>
                {customer.gstTreatment || "Consumer"}
              </Badge>
            </div>
            {customer.company && (
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Building2 className="size-3.5" />
                <span>{customer.company}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5" /> {customer.email}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5" /> {customer.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button size="sm" variant="outline" onClick={handleExportHistory} className="gap-1.5 text-xs">
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button size="sm" onClick={() => setIsInvoiceOpen(true)} className="gap-1.5 font-semibold shadow-xs">
            <Plus className="size-3.5" />
            <span>New Invoice</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsEstimateOpen(true)} className="gap-1.5">
            <Calculator className="size-3.5" />
            <span>New Quote</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive"
            title="Delete Customer"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Outstanding Balance</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-rose-500 mt-2">
            {formatCurrency(outstanding)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {customerInvoices.length} invoices issued
          </span>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Revenue Collected</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <TrendingDown className="size-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-emerald-500 mt-2">
            {formatCurrency(totalPaid)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Settled receivables
          </span>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Quotation Pipeline</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Calculator className="size-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-foreground mt-2">
            {formatCurrency(pipelineEstimates)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {customerEstimates.length} quotes proposals
          </span>
        </Card>
      </div>

      {/* Tabs Control */}
      <div className="flex border-b border-border/60 gap-4">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`pb-3 text-xs font-semibold tracking-wide border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "transactions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="size-3.5" />
          <span>Transactions & Billing ({transactions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("details")}
          className={`pb-3 text-xs font-semibold tracking-wide border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "details"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="size-3.5" />
          <span>Contact & Address Info</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "transactions" && (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="No billing activity yet"
                description="Issue an invoice or quotation for this client to begin tracking history."
                actionLabel="Create Invoice"
                onAction={() => setIsInvoiceOpen(true)}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Reference #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {transactions.map((tx) => (
                    <tr key={`${tx.type}-${tx.id}`} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={tx.type === "Invoice" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                        {tx.number}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">{tx.date}</td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "details" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tax & Financial Details */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Tax & Legal Profile</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">GST Treatment</span>
                <span className="font-semibold text-foreground">{customer.gstTreatment || "Consumer"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">GSTIN</span>
                <span className="font-mono font-semibold text-foreground uppercase">
                  {customer.gstNumber || customer.gstin || "—"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">PAN</span>
                <span className="font-mono font-semibold text-foreground uppercase">
                  {customer.pan || "—"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Customer Code</span>
                <span className="font-mono font-semibold text-foreground">
                  {customer.customerCode || "—"}
                </span>
              </div>
            </div>
          </Card>

          {/* Billing & Shipping Address */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Addresses & Logistics</h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground font-semibold flex items-center gap-1 mb-1">
                  <MapPin className="size-3.5" /> Billing Address
                </span>
                <p className="text-foreground leading-relaxed whitespace-pre-line bg-muted/20 p-2.5 rounded-xl border border-border/40">
                  {customer.billingAddress || customer.address || "No billing address provided."}
                </p>
              </div>

              {customer.shippingAddress && (
                <div>
                  <span className="text-muted-foreground font-semibold flex items-center gap-1 mb-1">
                    <MapPin className="size-3.5" /> Shipping Address
                  </span>
                  <p className="text-foreground leading-relaxed whitespace-pre-line bg-muted/20 p-2.5 rounded-xl border border-border/40">
                    {customer.shippingAddress}
                  </p>
                </div>
              )}

              {customer.notes && (
                <div>
                  <span className="text-muted-foreground font-semibold block mb-1">Internal Notes</span>
                  <p className="text-muted-foreground italic bg-muted/20 p-2.5 rounded-xl border border-border/40">
                    {customer.notes}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Create Modals */}
      <CreateInvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        onSuccess={() => refetchInvoices()}
      />
      <CreateEstimateModal
        isOpen={isEstimateOpen}
        onClose={() => setIsEstimateOpen(false)}
        onSuccess={() => refetchEstimates()}
      />
    </div>
  );
}

export default CustomerDetail;


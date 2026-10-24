import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
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
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, exportToCsv } from "@accountiva/shared";
import {
  useCustomer,
  useInvoices,
  useEstimates,
} from "@accountiva/api";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { toast } from "sonner";

export function CustomerDetail() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"Transactions" | "Statements" | "Details">("Transactions");
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const { data: customerData, isLoading: isCustLoading, isError, refetch } = useCustomer(id);
  const { data: apiInvoices, refetch: refetchInvoices } = useInvoices();
  const { data: apiEstimates, refetch: refetchEstimates } = useEstimates();

  const customer = customerData?.data || customerData || {};

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load customer profile");
      navigate({ to: "/customers" });
    }
  }, [isError, navigate]);

  // Find invoices & estimates for this customer (prioritize embedded data from details endpoint)
  const customerInvoices = useMemo(() => {
    if (Array.isArray(customer?.invoices) && customer.invoices.length > 0) {
      return customer.invoices;
    }
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
        (customer?.name && (inv.customerName === customer.name || inv.customers?.name === customer.name))
    );
  }, [customer?.invoices, apiInvoices, id, customer?.name]);

  const customerEstimates = useMemo(() => {
    if (Array.isArray(customer?.estimates) && customer.estimates.length > 0) {
      return customer.estimates;
    }
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
        (customer?.name && (est.customerName === customer.name || est.customers?.name === customer.name))
    );
  }, [customer?.estimates, apiEstimates, id, customer?.name]);

  const customerExpenses = useMemo(() => {
    return Array.isArray(customer?.expenses) ? customer.expenses : [];
  }, [customer?.expenses]);

  // Combined sorted transactions matching Vue
  const sortedTransactions = useMemo(() => {
    const invoices = customerInvoices.map((inv: any) => ({
      ...inv,
      type: "Invoice",
      date: inv.date || inv.issueDate || inv.createdAt || "",
      amount: Number(inv.amount) || 0,
    }));
    const estimates = customerEstimates.map((est: any) => ({
      ...est,
      type: "Estimate",
      date: est.date || est.expiryDate || est.createdAt || "",
      amount: Number(est.amount) || 0,
    }));
    const expenses = customerExpenses.map((exp: any) => ({
      ...exp,
      type: "Expense",
      date: exp.date || exp.createdAt || "",
      amount: Number(exp.amount) || 0,
    }));

    return [...invoices, ...estimates, ...expenses].sort(
      (a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
  }, [customerInvoices, customerEstimates, customerExpenses]);

  const statements = useMemo(() => sortedTransactions, [sortedTransactions]);

  // Summary and statistics matching Vue
  const outstandingBalance = useMemo(() => {
    if (customer?.summary?.outstandingBalance !== undefined) {
      return Number(customer.summary.outstandingBalance) || 0;
    }
    return customerInvoices
      .filter((i: any) => {
        const s = String(i.status || "").toLowerCase();
        return s !== "paid" && s !== "draft";
      })
      .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
  }, [customer?.summary?.outstandingBalance, customerInvoices]);

  const totalPaidRevenue = useMemo(() => {
    if (customer?.summary?.totalPaid !== undefined) {
      return Number(customer.summary.totalPaid) || 0;
    }
    return customerInvoices
      .filter((i: any) => String(i.status || "").toLowerCase() === "paid")
      .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
  }, [customer?.summary?.totalPaid, customerInvoices]);

  const summaryEstimatedProfit = useMemo(() => {
    if (customer?.summary?.estimatedProfit !== undefined) {
      return Number(customer.summary.estimatedProfit) || 0;
    }
    return totalPaidRevenue;
  }, [customer?.summary?.estimatedProfit, totalPaidRevenue]);

  const summaryEstimateCount = useMemo(() => {
    if (customer?.summary?.estimateCount !== undefined) {
      return customer.summary.estimateCount;
    }
    return customerEstimates.length;
  }, [customer?.summary?.estimateCount, customerEstimates.length]);

  const stats = [
    {
      title: "Outstanding Balance",
      amount: formatCurrency(outstandingBalance),
      icon: TrendingUp,
      color: "text-rose-700 dark:text-rose-400",
      bgColor: "bg-rose-500/10 border border-rose-500/15",
      accentBar: "bg-rose-500/50",
      containerClass: "hover:border-rose-500/40",
    },
    {
      title: "Total Revenue",
      amount: formatCurrency(totalPaidRevenue),
      icon: TrendingDown,
      color: "text-emerald-700 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10 border border-emerald-500/15",
      accentBar: "bg-emerald-500/50",
      containerClass: "hover:border-emerald-500/40",
    },
    {
      title: "Estimated Profit",
      amount: formatCurrency(summaryEstimatedProfit),
      icon: TrendingUp,
      color: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-500/10 border border-amber-500/15",
      accentBar: "bg-amber-500/50",
      containerClass: "hover:border-amber-500/40",
    },
  ];

  const handleExportStatement = () => {
    if (!statements || statements.length === 0) {
      toast.error("No statement records to export");
      return;
    }
    const exportData = statements.map((s: any) => ({
      Date: s.date ? formatDate(s.date) : "",
      Type: s.type,
      Reference:
        s.invoice_number ||
        s.estimate_number ||
        s.invoiceNumber ||
        s.estimateNumber ||
        s.reference ||
        s.id,
      Amount: s.amount || 0,
      Status: s.status || "",
    }));
    const filename = customer?.name
      ? `statement-${customer.name.toLowerCase().replace(/\s+/g, "-")}`
      : "customer-statement";
    exportToCsv(exportData, filename);
    toast.success("Account statement exported as CSV");
  };

  const tabs = ["Transactions", "Statements", "Details"] as const;

  return (
    <div className="px-8 pt-4 md:pt-5 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => navigate({ to: "/customers" })}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Back to Customers</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-3xl font-black shadow-inner">
              {customer?.name?.charAt(0) || "C"}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="ui-page-title">
                  {customer?.name || (isCustLoading ? "Loading..." : "Customer Profile")}
                </h1>
                {(customer?.gst_number || customer?.gstNumber) && (
                  <div className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground border border-border uppercase tracking-widest">
                    GSTIN: {customer.gst_number || customer.gstNumber}
                  </div>
                )}
                {customer?.pan && (
                  <div className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground border border-border uppercase tracking-widest font-mono">
                    PAN: {customer.pan}
                  </div>
                )}
              </div>
              <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4" />
                {customer?.company || "Individual Customer"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsEditingCustomer(true)}
              variant="outline"
              className="h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] border-border/70 hover:bg-muted/50 transition-all cursor-pointer"
            >
              Edit Profile
            </Button>
            <Button
              onClick={() => setIsInvoiceOpen(true)}
              className="h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isCustLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/50 border-border/60 shadow-2xs">
              <CardContent className="p-6">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-8 w-32 mb-2" />
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
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${stat.bgColor} ${stat.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1 tracking-tight font-mono">
                    {stat.amount}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Total Lifetime Value
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Main Content Grid: 1/3 Left Column, 2/3 Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Contact */}
        <div className="space-y-6">
          <Card className="bg-card/60 border-border/60 shadow-2xs overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-border/60 bg-card/40 py-3.5 px-6">
              <CardTitle className="text-sm font-bold">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shadow-2xs">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                      Email
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {customer?.email || "No email provided"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shadow-2xs">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                      Phone
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {customer?.phone || "No phone provided"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                      Billing Address
                    </p>
                    <p className="text-sm font-bold text-foreground leading-relaxed whitespace-pre-line">
                      {customer?.billingAddress || customer?.address || "No address provided"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/60 shadow-2xs overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-border/60 bg-card/40 py-3.5 px-6">
              <CardTitle className="text-sm font-bold">Relationship Stats</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Customer Since</span>
                  <span className="text-xs font-bold text-foreground">
                    {formatDate(customer?.created_at || customer?.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Estimated Profit</span>
                  <span className="text-xs font-bold text-primary font-mono">
                    {formatCurrency(summaryEstimatedProfit)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Outstanding Quotes</span>
                  <span className="text-xs font-bold text-foreground">
                    {summaryEstimateCount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tabs Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-muted/50 p-1 rounded-xl border border-border/60 flex gap-1 shadow-2xs">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Transactions Tab */}
          {activeTab === "Transactions" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {isCustLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              ) : sortedTransactions.length > 0 ? (
                <div className="space-y-3">
                  {sortedTransactions.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => {
                        if (item.type === "Invoice") navigate({ to: "/invoices" });
                        else navigate({ to: "/estimates" });
                      }}
                      className="p-4 rounded-2xl bg-card/60 border border-border/60 hover:border-primary/40 hover:bg-muted/50 shadow-2xs transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-2xs ${
                            item.type === "Invoice"
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                          }`}
                        >
                          {item.type === "Invoice" ? (
                            <FileText className="w-4 h-4" />
                          ) : item.type === "Estimate" ? (
                            <Calculator className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors font-mono">
                              {item.invoice_number ||
                                item.estimate_number ||
                                item.invoiceNumber ||
                                item.estimateNumber ||
                                item.number ||
                                item.id}
                            </p>
                            <span
                              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border shadow-2xs ${
                                item.status === "Paid" || item.status === "Accepted"
                                  ? "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                                  : "border-transparent bg-secondary text-secondary-foreground"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                            {item.type} • {formatDate(item.date)} •{" "}
                            {item.type === "Expense"
                              ? item.expense_account
                              : item.invoice_number ||
                                item.estimate_number ||
                                item.invoiceNumber ||
                                item.estimateNumber ||
                                item.number ||
                                item.id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="text-sm font-bold text-foreground font-mono">
                            {formatCurrency(item.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                            Amount
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border">
                  <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">No transactions found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Start by creating an invoice for this customer.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Statements Tab */}
          {activeTab === "Statements" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-card border-border/50 overflow-hidden rounded-2xl">
                <CardHeader className="border-b border-border/50 bg-muted/20 py-4 px-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">Account Statement</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[10px] font-bold uppercase tracking-widest gap-2 cursor-pointer hover:bg-muted"
                      onClick={handleExportStatement}
                    >
                      <FileText className="w-3 h-3" /> Export Statement
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Date
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Reference
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {statements.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-xs text-muted-foreground">
                            No statement records found
                          </td>
                        </tr>
                      ) : (
                        statements.map((item, index) => (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4 text-xs font-bold">{formatDate(item.date)}</td>
                            <td className="px-6 py-4">
                              <p className="text-xs font-bold">
                                {item.invoice_number ||
                                  item.estimate_number ||
                                  item.invoiceNumber ||
                                  item.estimateNumber ||
                                  item.number ||
                                  item.id}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                {item.type}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-xs font-black text-right font-mono">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="px-6 py-4 text-xs font-black text-right text-primary font-mono">
                              {formatCurrency(
                                statements.slice(index).reduce((sum, s) => sum + Number(s.amount || 0), 0)
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === "Details" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-card border-border/50 overflow-hidden rounded-2xl">
                <CardHeader className="border-b border-border/50 bg-muted/20 py-4 px-6">
                  <CardTitle className="text-sm font-bold">Full Business Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid sm:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                          Legal Name
                        </p>
                        <p className="text-sm font-bold">{customer?.name || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                          Company / Trade Name
                        </p>
                        <p className="text-sm font-bold">{customer?.company || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                          GST Treatment
                        </p>
                        <p className="text-sm font-bold">
                          {customer?.gstTreatment || customer?.gst_treatment || "N/A"}
                        </p>
                      </div>
                      {(customer?.gstNumber || customer?.gst_number) && (
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                            GST Identification Number
                          </p>
                          <p className="text-sm font-mono font-bold text-primary">
                            {customer?.gstNumber || customer?.gst_number}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                          Payment Terms
                        </p>
                        <p className="text-sm font-bold">{customer?.paymentTerms || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                          Currency
                        </p>
                        <p className="text-sm font-bold">{customer?.currency || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                          Website
                        </p>
                        <p className="text-sm font-bold">{customer?.website || "N/A"}</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                          General Address
                        </p>
                        <p className="text-sm font-bold leading-relaxed">{customer?.address || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                          Billing Address
                        </p>
                        <p className="text-sm font-bold leading-relaxed whitespace-pre-line">
                          {customer?.billingAddress || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                          Shipping Address
                        </p>
                        <p className="text-sm font-bold leading-relaxed whitespace-pre-line">
                          {customer?.shippingAddress || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                          Internal Notes
                        </p>
                        <p
                          className={`text-xs text-muted-foreground leading-relaxed whitespace-pre-line ${
                            !customer?.notes ? "italic text-muted-foreground/60" : ""
                          }`}
                        >
                          {customer?.notes || "No internal notes added for this customer."}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modals matching Vue */}
      <AddCustomerModal
        isOpen={isEditingCustomer}
        customer={customer}
        onClose={() => setIsEditingCustomer(false)}
        onSuccess={() => refetch()}
      />

      <CreateInvoiceModal
        isOpen={isInvoiceOpen}
        initialCustomerId={id}
        onClose={() => setIsInvoiceOpen(false)}
        onSuccess={() => {
          refetch();
          refetchInvoices();
        }}
      />
    </div>
  );
}

export default CustomerDetail;

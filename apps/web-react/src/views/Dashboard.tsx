import React, { useMemo } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  Plus,
  TrendingUp,
  Receipt,
  FileText,
  Calculator,
  ChevronRight,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Package,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, isFeatureEnabled } from "@accountiva/shared";
import {
  useInvoices,
  useEstimates,
  useDashboardMetrics,
} from "@accountiva/api";
import { useAuth } from "@/context/AuthContext";
import { quickCreate } from "@/lib/quickCreate";

export function Dashboard() {
  const navigate = useNavigate();
  const { currentOrganization, user } = useAuth();
  const currency = currentOrganization?.currency || "INR";

  const { data: metricsData, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: apiInvoices, isLoading: invoicesLoading } = useInvoices({
    limit: 10,
    page: 1,
  });
  const { data: apiEstimates, isLoading: estimatesLoading } = useEstimates();

  const handleCreateInvoice = () => {
    quickCreate.trigger("invoice");
    navigate({ to: "/invoices" });
  };

  const rawInvoices: any[] = useMemo(() => {
    if (Array.isArray(apiInvoices)) return apiInvoices;
    if (Array.isArray(apiInvoices?.data)) return apiInvoices.data;
    if (Array.isArray(apiInvoices?.invoices)) return apiInvoices.invoices;
    return [];
  }, [apiInvoices]);

  const rawEstimates: any[] = useMemo(() => {
    if (Array.isArray(apiEstimates)) return apiEstimates;
    if (Array.isArray(apiEstimates?.data)) return apiEstimates.data;
    if (Array.isArray(apiEstimates?.estimates)) return apiEstimates.estimates;
    return [];
  }, [apiEstimates]);

  // Compute metrics strictly for Invoicing
  const totalReceivables = useMemo(() => {
    if (metricsData?.receivables !== undefined) return metricsData.receivables;
    return rawInvoices
      .filter((inv) => {
        const st = String(inv.status || "").toLowerCase();
        return st !== "paid" && st !== "draft";
      })
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [metricsData, rawInvoices]);

  const totalPaid = useMemo(() => {
    return rawInvoices
      .filter((inv) => String(inv.status || "").toLowerCase() === "paid")
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [rawInvoices]);

  const totalRevenue = useMemo(() => {
    if (metricsData?.revenue !== undefined) return metricsData.revenue;
    return rawInvoices
      .filter((inv) => String(inv.status || "").toLowerCase() !== "draft")
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [metricsData, rawInvoices]);

  const totalOverdue = useMemo(() => {
    const now = new Date();
    return rawInvoices
      .filter((inv) => {
        const st = String(inv.status || "").toLowerCase();
        if (st === "paid" || st === "draft") return false;
        if (inv.dueDate) {
          return new Date(inv.dueDate) < now;
        }
        return false;
      })
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [rawInvoices]);

  const activeEstimates = useMemo(() => {
    return rawEstimates.filter((e) => {
      const s = String(e.status || "").toLowerCase();
      return s === "sent" || s === "accepted";
    });
  }, [rawEstimates]);

  const activeEstimatesValue = useMemo(() => {
    return activeEstimates.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [activeEstimates]);

  // Invoice collection breakdown
  const invoiceBreakdown = useMemo(() => {
    let paidCount = 0;
    let paidAmount = 0;
    let outstandingCount = 0;
    let outstandingAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let draftCount = 0;
    let draftAmount = 0;

    const now = new Date();

    rawInvoices.forEach((inv) => {
      const amt = Number(inv.amount) || 0;
      const st = String(inv.status || "").toLowerCase();

      if (st === "paid") {
        paidCount++;
        paidAmount += amt;
      } else if (st === "draft") {
        draftCount++;
        draftAmount += amt;
      } else {
        const isPastDue = inv.dueDate && new Date(inv.dueDate) < now;
        if (isPastDue || st === "overdue") {
          overdueCount++;
          overdueAmount += amt;
        } else {
          outstandingCount++;
          outstandingAmount += amt;
        }
      }
    });

    const totalCount = rawInvoices.length || 1;
    return {
      paid: { count: paidCount, amount: paidAmount, pct: Math.round((paidCount / totalCount) * 100) },
      outstanding: { count: outstandingCount, amount: outstandingAmount, pct: Math.round((outstandingCount / totalCount) * 100) },
      overdue: { count: overdueCount, amount: overdueAmount, pct: Math.round((overdueCount / totalCount) * 100) },
      draft: { count: draftCount, amount: draftAmount, pct: Math.round((draftCount / totalCount) * 100) },
      totalCount: rawInvoices.length,
    };
  }, [rawInvoices]);

  const collectionRate = useMemo(() => {
    if (totalRevenue <= 0) return 0;
    return Math.min(100, Math.round((totalPaid / totalRevenue) * 100));
  }, [totalPaid, totalRevenue]);

  // Invoicing Summary Stats Strip (4 distinct invoicing metrics)
  const summaryStats = useMemo(() => {
    const stats: Array<{
      title: string;
      amount: string;
      description: string;
      icon: any;
      color: string;
      accent: string;
      tone: string;
      iconBg: string;
    }> = [
      {
        title: "Total Receivables",
        amount: formatCurrency(totalReceivables, currency),
        description: "Outstanding Payments",
        icon: Clock,
        color: "text-amber-700 dark:text-amber-400",
        accent: "bg-amber-500/50",
        tone: "hover:border-amber-500/40",
        iconBg: "bg-amber-500/10 border border-amber-500/15 text-amber-700 dark:text-amber-400",
      },
      {
        title: "Total Collected",
        amount: formatCurrency(totalPaid, currency),
        description: "Paid Invoices to Date",
        icon: CheckCircle2,
        color: "text-emerald-700 dark:text-emerald-400",
        accent: "bg-emerald-500/50",
        tone: "hover:border-emerald-500/40",
        iconBg: "bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      },
      {
        title: "Total Invoiced",
        amount: formatCurrency(totalRevenue, currency),
        description: "Total Invoiced to Date",
        icon: TrendingUp,
        color: "text-primary",
        accent: "bg-primary/50",
        tone: "hover:border-primary/40",
        iconBg: "bg-primary/10 border border-primary/15 text-primary",
      },
    ];

    if (isFeatureEnabled("estimates")) {
      stats.push({
        title: "Active Estimates",
        amount: formatCurrency(activeEstimatesValue, currency),
        description: `${activeEstimates.length} Quotes in Pipeline`,
        icon: Calculator,
        color: "text-sky-700 dark:text-sky-400",
        accent: "bg-sky-500/50",
        tone: "hover:border-sky-500/40",
        iconBg: "bg-sky-500/10 border border-sky-500/15 text-sky-700 dark:text-sky-400",
      });
    } else {
      stats.push({
        title: "Overdue Amount",
        amount: formatCurrency(totalOverdue, currency),
        description: "Unpaid Past Due",
        icon: AlertCircle,
        color: "text-rose-700 dark:text-rose-400",
        accent: "bg-rose-500/50",
        tone: "hover:border-rose-500/40",
        iconBg: "bg-rose-500/10 border border-rose-500/15 text-rose-700 dark:text-rose-400",
      });
    }

    return stats;
  }, [totalReceivables, totalPaid, totalRevenue, totalOverdue, activeEstimatesValue, activeEstimates.length, currency]);

  // Recent Invoices Activity
  const recentActivity = useMemo(() => {
    const sorted = [...rawInvoices].sort((a, b) => {
      const dateA = new Date(a.date || a.issueDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.issueDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return sorted.slice(0, 7).map((inv: any) => {
      const rawDate = inv.date || inv.issueDate || inv.createdAt || new Date();
      const dateStr = new Date(rawDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const customerName = inv.customers?.name || inv.customerName || "Customer";
      const invNumber = inv.invoiceNumber || `INV-${inv.id}`;
      const status = inv.status || "Draft";
      const st = String(status).toLowerCase();
      const isPaid = st === "paid";
      const isOverdue = st === "overdue" || (inv.dueDate && new Date(inv.dueDate) < new Date() && st !== "paid" && st !== "draft");

      return {
        id: inv.id,
        date: dateStr,
        invoiceNumber: invNumber,
        customerName: customerName,
        status: isOverdue ? "Overdue" : status,
        amount: formatCurrency(Number(inv.amount) || 0, currency),
        isPaid,
        isOverdue,
      };
    });
  }, [rawInvoices, currency]);

  const userName = user?.name ? user.name.split(" ")[0] : "Member";

  return (
    <div className="px-8 pt-4 md:pt-5 pb-36 max-w-7xl mx-auto space-y-8 flex-1 w-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-display">
              Hello, {userName}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Your financial overview for today.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleCreateInvoice}
            className="h-10 px-5 rounded-xl group font-bold uppercase tracking-wider text-[11px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 space-y-8 min-h-0">
        {/* Invoicing Summary Stats Strip */}
        <div id="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className={`border-border/60 shadow-2xs overflow-hidden relative group hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs ${stat.tone}`}
              >
                <div className={`h-[2.5px] w-full ${stat.accent}`} />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {stat.title}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${stat.iconBg}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(metricsLoading && !metricsData) || (invoicesLoading && rawInvoices.length === 0) ? (
                      <Skeleton className="h-8 w-28" />
                    ) : (
                      <h3 className="text-2xl font-bold font-mono text-foreground tracking-tight">
                        {stat.amount}
                      </h3>
                    )}
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      {stat.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Recent Invoices & Collection Performance */}
          <div className="lg:col-span-8 space-y-8">
            {/* Recent Invoices Card */}
            <Card className="bg-card/60 border border-border/60 shadow-2xs rounded-2xl overflow-hidden min-h-[340px]">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card/30 p-5 md:p-6">
                <div className="space-y-1">
                  <CardTitle className="text-sm md:text-base font-bold text-foreground">
                    Recent Invoices
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Latest generated invoices and payment status
                  </CardDescription>
                </div>
                <Link to="/invoices">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] font-bold uppercase tracking-wider text-primary hover:text-primary/85 hover:bg-primary/8 gap-1 rounded-xl h-8 px-3 cursor-pointer"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {invoicesLoading && recentActivity.length === 0 ? (
                  <div className="divide-y divide-border/50">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="py-4 px-6 flex items-center justify-between animate-pulse">
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-44" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-md mr-6" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground/40" />
                    <p className="font-medium text-foreground">No invoices generated yet</p>
                    <p className="text-[11px]">Create your first invoice to begin tracking billing status.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <th className="py-3 px-6">Invoice # & Client</th>
                          <th className="py-3 px-6">Date</th>
                          <th className="py-3 px-6 text-center">Status</th>
                          <th className="py-3 px-6 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {recentActivity.map((inv) => (
                          <tr
                            key={inv.id}
                            onClick={() => navigate({ to: "/invoices" })}
                            className="hover:bg-muted/50 transition-colors group cursor-pointer"
                          >
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                  {inv.invoiceNumber}
                                </span>
                                <span className="text-xs text-muted-foreground mt-0.5">
                                  {inv.customerName}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-xs text-muted-foreground font-medium">
                              {inv.date}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                                  inv.isPaid
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                    : inv.isOverdue
                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td
                              className={`py-4 px-6 text-right font-mono text-xs font-bold ${
                                inv.isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                              }`}
                            >
                              {inv.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoicing Collection Performance */}
            <Card className="bg-card/60 border border-border/60 shadow-2xs rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-card/30 p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm md:text-base font-bold text-foreground">
                      Collection Performance
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Rate of collected revenue vs outstanding receivables
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-bold">
                    <span>{collectionRate}% Collected</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* Visual Progress Bar */}
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 transition-all duration-700"
                      style={{ width: `${invoiceBreakdown.paid.pct}%` }}
                      title={`Paid: ${invoiceBreakdown.paid.pct}%`}
                    />
                    <div
                      className="bg-amber-500 transition-all duration-700"
                      style={{ width: `${invoiceBreakdown.outstanding.pct}%` }}
                      title={`Outstanding: ${invoiceBreakdown.outstanding.pct}%`}
                    />
                    <div
                      className="bg-rose-500 transition-all duration-700"
                      style={{ width: `${invoiceBreakdown.overdue.pct}%` }}
                      title={`Overdue: ${invoiceBreakdown.overdue.pct}%`}
                    />
                    <div
                      className="bg-muted-foreground/30 transition-all duration-700"
                      style={{ width: `${invoiceBreakdown.draft.pct}%` }}
                      title={`Draft: ${invoiceBreakdown.draft.pct}%`}
                    />
                  </div>
                </div>

                {/* Legend & Breakdown Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div className="space-y-1 p-3 rounded-xl bg-card/50 border border-border/50">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Paid
                    </div>
                    <div className="font-mono text-sm font-bold text-foreground">
                      {formatCurrency(invoiceBreakdown.paid.amount, currency)}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {invoiceBreakdown.paid.count} {invoiceBreakdown.paid.count === 1 ? "invoice" : "invoices"}
                    </div>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-card/50 border border-border/50">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      Outstanding
                    </div>
                    <div className="font-mono text-sm font-bold text-foreground">
                      {formatCurrency(invoiceBreakdown.outstanding.amount, currency)}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {invoiceBreakdown.outstanding.count} {invoiceBreakdown.outstanding.count === 1 ? "invoice" : "invoices"}
                    </div>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-card/50 border border-border/50">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      Overdue
                    </div>
                    <div className="font-mono text-sm font-bold text-foreground">
                      {formatCurrency(invoiceBreakdown.overdue.amount, currency)}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {invoiceBreakdown.overdue.count} {invoiceBreakdown.overdue.count === 1 ? "invoice" : "invoices"}
                    </div>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-card/50 border border-border/50">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                      Draft
                    </div>
                    <div className="font-mono text-sm font-bold text-foreground">
                      {formatCurrency(invoiceBreakdown.draft.amount, currency)}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {invoiceBreakdown.draft.count} {invoiceBreakdown.draft.count === 1 ? "invoice" : "invoices"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Pipeline & Quick Actions */}
          <div className="lg:col-span-4 space-y-8">
            {/* Sales Pipeline */}
            <Card className="bg-card/60 border border-border/60 shadow-2xs rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-card/30 p-5 md:p-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm md:text-base font-bold text-foreground">
                  Sales Pipeline
                </CardTitle>
                <Link to="/estimates">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] font-bold uppercase tracking-wider text-primary hover:text-primary/85 hover:bg-primary/8 gap-1 rounded-xl h-8 px-2 cursor-pointer"
                  >
                    Estimates <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-5 md:p-6 space-y-5">
                {(["Sent", "Accepted"] as const).map((status) => {
                  const count = rawEstimates.filter(
                    (e) => String(e.status || "").toLowerCase() === status.toLowerCase()
                  ).length;
                  const total = rawEstimates.length || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>{status === "Sent" ? "Sent Estimates" : "Accepted Estimates"}</span>
                        <span className="font-mono font-bold text-foreground">{count}</span>
                      </div>
                      <div className="bg-muted/40 rounded-full overflow-hidden h-2">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-border/60">
                  <p className="text-[10px] text-muted-foreground font-medium italic">
                    Pipeline Potential:{" "}
                    <span className="font-mono font-bold text-foreground not-italic">
                      {formatCurrency(activeEstimatesValue, currency)}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Invoicing Actions */}
            <Card className="bg-card/60 border border-border/60 shadow-2xs rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-card/30 p-5 md:p-6">
                <CardTitle className="text-sm md:text-base font-bold text-foreground">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 md:p-6 space-y-2.5">
                <Button
                  variant="outline"
                  onClick={handleCreateInvoice}
                  className="w-full justify-between h-10 px-4 rounded-xl text-xs font-semibold hover:bg-primary/5 hover:border-primary/40 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    New Invoice
                  </span>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    quickCreate.trigger("estimate");
                    navigate({ to: "/estimates" });
                  }}
                  className="w-full justify-between h-10 px-4 rounded-xl text-xs font-semibold hover:bg-primary/5 hover:border-primary/40 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-sky-500" />
                    New Estimate
                  </span>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/customers" })}
                  className="w-full justify-between h-10 px-4 rounded-xl text-xs font-semibold hover:bg-primary/5 hover:border-primary/40 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-500" />
                    Manage Clients
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/items" })}
                  className="w-full justify-between h-10 px-4 rounded-xl text-xs font-semibold hover:bg-primary/5 hover:border-primary/40 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-500" />
                    Manage Items / Catalog
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

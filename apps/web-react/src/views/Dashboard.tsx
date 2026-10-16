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
  Building2,
  CreditCard,
  Wallet,
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

  // Compute metrics with API fallback
  const totalReceivables = useMemo(() => {
    if (metricsData?.receivables !== undefined) return metricsData.receivables;
    return rawInvoices
      .filter((inv) => String(inv.status || "").toLowerCase() !== "paid" && String(inv.status || "").toLowerCase() !== "draft")
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [metricsData, rawInvoices]);

  const totalPayables = useMemo(() => {
    return metricsData?.payables ?? 0;
  }, [metricsData]);

  const totalRevenue = useMemo(() => {
    if (metricsData?.revenue !== undefined) return metricsData.revenue;
    return rawInvoices
      .filter((inv) => String(inv.status || "").toLowerCase() !== "draft")
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [metricsData, rawInvoices]);

  const netProfit = useMemo(() => {
    if (metricsData?.netProfit !== undefined) return metricsData.netProfit;
    return totalRevenue - (metricsData?.expenses ?? 0);
  }, [metricsData, totalRevenue]);

  const activeEstimates = useMemo(() => {
    return rawEstimates.filter((e) => {
      const s = String(e.status || "").toLowerCase();
      return s === "sent" || s === "accepted";
    });
  }, [rawEstimates]);

  const activeEstimatesValue = useMemo(() => {
    return activeEstimates.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [activeEstimates]);

  // Dynamic Summary Stats Strip
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
        description: "Outstanding",
        icon: FileText,
        color: "text-primary",
        accent: "bg-primary/50",
        tone: "hover:border-primary/40",
        iconBg: "bg-primary/10 border border-primary/15 text-primary",
      },
    ];

    if (isFeatureEnabled("bills") || isFeatureEnabled("expenses")) {
      stats.push({
        title: "Total Payables",
        amount: formatCurrency(totalPayables, currency),
        description: "Unpaid",
        icon: Receipt,
        color: "text-amber-700 dark:text-amber-400",
        accent: "bg-amber-500/50",
        tone: "hover:border-amber-500/40",
        iconBg: "bg-amber-500/10 border border-amber-500/15 text-amber-700 dark:text-amber-400",
      });
    } else {
      stats.push({
        title: "Total Revenue",
        amount: formatCurrency(totalRevenue, currency),
        description: "Total Invoiced to Date",
        icon: TrendingUp,
        color: "text-emerald-700 dark:text-emerald-400",
        accent: "bg-emerald-500/50",
        tone: "hover:border-emerald-500/40",
        iconBg: "bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      });
    }

    if (isFeatureEnabled("banking")) {
      stats.push({
        title: "Bank Balance",
        amount: formatCurrency(0, currency),
        description: "Cash & Bank Balance",
        icon: Wallet,
        color: "text-primary",
        accent: "bg-primary/50",
        tone: "hover:border-primary/40",
        iconBg: "bg-primary/10 border border-primary/15 text-primary",
      });
    } else if (isFeatureEnabled("estimates")) {
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
    }

    stats.push({
      title: "Net Profit",
      amount: formatCurrency(netProfit, currency),
      description: "Revenue vs Expenses",
      icon: TrendingUp,
      color: "text-emerald-700 dark:text-emerald-400",
      accent: "bg-emerald-500/50",
      tone: "hover:border-emerald-500/40",
      iconBg: "bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    });

    return stats;
  }, [totalReceivables, totalPayables, totalRevenue, netProfit, activeEstimatesValue, activeEstimates.length, currency]);

  // Cash Flow Data
  const cashFlowData = useMemo(() => {
    if (metricsData?.cashFlow && metricsData.cashFlow.length > 0) {
      return metricsData.cashFlow.map((entry, idx) => ({ id: idx, ...entry }));
    }
    // Fallback: 12 daily entries
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (11 - index));
      return {
        id: index,
        date: date.toISOString().slice(0, 10),
        income: 0,
        expense: 0,
      };
    });
  }, [metricsData]);

  const maxCashFlow = useMemo(() => {
    const allValues = cashFlowData.flatMap((d) => [d.income, d.expense]);
    return Math.max(...allValues, 1);
  }, [cashFlowData]);

  // Recent Activity / Recent Invoices
  const recentActivity = useMemo(() => {
    const sorted = [...rawInvoices].sort((a, b) => {
      const dateA = new Date(a.date || a.issueDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.issueDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return sorted.slice(0, 5).map((inv: any) => {
      const rawDate = inv.date || inv.issueDate || inv.createdAt || new Date();
      const dateStr = new Date(rawDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const customerName = inv.customers?.name || inv.customerName || "Customer";
      const invNumber = inv.invoiceNumber || `INV-${inv.id}`;
      const status = inv.status || "Invoice";
      const isPaid = String(status).toLowerCase() === "paid";

      return {
        id: inv.id,
        date: dateStr,
        description: `${invNumber} • ${customerName}`,
        type: status,
        amount: formatCurrency(Number(inv.amount) || 0, currency),
        amountClass: isPaid ? "text-emerald-500" : "text-foreground",
      };
    });
  }, [rawInvoices, currency]);

  const userName = user?.name ? user.name.split(" ")[0] : "Member";

  return (
    <div className="px-8 pt-4 md:pt-5 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full flex flex-col">
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
              Welcome back! Here's an overview of your organization's cash flow.
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
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    {metricsLoading && !metricsData ? (
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
          {/* Left Column: Cash Flow & Activity */}
          <div className="lg:col-span-8 space-y-8">
            {/* Cash Flow */}
            <Card className="bg-card/60 border border-border/60 shadow-2xs rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card/30 p-5 md:p-6">
                <div className="space-y-1">
                  <CardTitle className="text-sm md:text-base font-bold text-foreground">
                    Cash Flow
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Cash Flow Overview
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Income
                    </span>
                  </div>
                  {isFeatureEnabled("expenses") && (
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Expenses
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="h-64 flex items-end gap-2 md:gap-3 relative px-2">
                  <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none opacity-10">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-full h-px bg-foreground" />
                    ))}
                  </div>
                  {cashFlowData.map((bar) => (
                    <div
                      key={bar.id}
                      className="flex-1 flex items-end gap-1 h-full group relative"
                      title={`${bar.date} — Income: ${formatCurrency(bar.income, currency)}${isFeatureEnabled("expenses") ? ` | Expense: ${formatCurrency(bar.expense, currency)}` : ""}`}
                    >
                      <div
                        className="flex-1 bg-emerald-500/40 group-hover:bg-emerald-500 transition-all rounded-t-sm"
                        style={{
                          height: `${Math.max(4, (bar.income / maxCashFlow) * 100)}%`,
                        }}
                      />
                      {isFeatureEnabled("expenses") && (
                        <div
                          className="flex-1 bg-primary/40 group-hover:bg-primary transition-all rounded-t-sm"
                          style={{
                            height: `${Math.max(4, (bar.expense / maxCashFlow) * 100)}%`,
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-card/60 border border-border/60 shadow-2xs rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card/30 p-5 md:p-6">
                <div className="space-y-1">
                  <CardTitle className="text-sm md:text-base font-bold text-foreground">
                    {isFeatureEnabled("transactions") ? "Recent Activity" : "Recent Invoices"}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {isFeatureEnabled("transactions")
                      ? "Latest account activity"
                      : "Latest generated invoices"}
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
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-xs">
                    No recent activity to display.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <tbody className="divide-y divide-border/60">
                        {recentActivity.map((tx) => (
                          <tr
                            key={tx.id}
                            onClick={() => navigate({ to: "/invoices" })}
                            className="hover:bg-muted/50 transition-colors group cursor-pointer"
                          >
                            <td className="py-4.5 px-6">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  {tx.date}
                                </span>
                                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors mt-0.5">
                                  {tx.description}
                                </span>
                              </div>
                            </td>
                            <td className="py-4.5 px-6">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                {tx.type}
                              </span>
                            </td>
                            <td
                              className={`py-4.5 px-6 text-right font-mono text-xs font-bold ${tx.amountClass}`}
                            >
                              {tx.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Pipeline & Accounts */}
          <div className="lg:col-span-4 space-y-8">
            {/* Sales Pipeline */}
            <Card className="bg-card/60 border border-border/60 shadow-2xs rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-card/30 p-5 md:p-6">
                <CardTitle className="text-sm md:text-base font-bold text-foreground">
                  Sales Pipeline
                </CardTitle>
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
                    Potential:{" "}
                    <span className="font-mono font-bold text-foreground not-italic">
                      {formatCurrency(activeEstimatesValue, currency)}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

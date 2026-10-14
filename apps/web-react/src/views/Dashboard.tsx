import React, { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  ArrowUpRight,
  FileText,
  Users,
  Calculator,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, isFeatureEnabled } from "@accountiva/shared";
import { useInvoices, useEstimates } from "@accountiva/api";
import { useAuth } from "@/context/AuthContext";

export function Dashboard() {
  const { currentOrganization, user } = useAuth();
  const currency = currentOrganization?.currency || "INR";

  const { data: apiInvoices, isLoading: invoicesLoading } = useInvoices();
  const { data: apiEstimates } = useEstimates();

  const rawInvoices: any[] = useMemo(() => {
    if (Array.isArray(apiInvoices) && apiInvoices.length > 0) return apiInvoices;
    if (Array.isArray(apiInvoices?.data) && apiInvoices.data.length > 0) return apiInvoices.data;
    return [];
  }, [apiInvoices]);

  const rawEstimates: any[] = useMemo(() => {
    if (Array.isArray(apiEstimates) && apiEstimates.length > 0) return apiEstimates;
    if (Array.isArray(apiEstimates?.data) && apiEstimates.data.length > 0) return apiEstimates.data;
    return [];
  }, [apiEstimates]);

  // Compute live metrics from invoices
  const { totalReceivables, paidThisMonth, overdueTotal, recentInvoices } = useMemo(() => {
    let receivables = 0;
    let paid = 0;
    let overdue = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    rawInvoices.forEach((inv) => {
      const amount = Number(inv.amount) || 0;
      const status = String(inv.status || "").toUpperCase();

      if (status === "PAID") {
        const invDate = new Date(inv.date || inv.issueDate || inv.createdAt || now);
        if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
          paid += amount;
        }
      } else if (status === "OVERDUE") {
        overdue += amount;
        receivables += amount;
      } else {
        // Draft, Sent, Outstanding
        receivables += amount;
      }
    });

    // Recent items
    const sorted = [...rawInvoices].sort((a, b) => {
      const dateA = new Date(a.date || a.issueDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.issueDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const recent = sorted.slice(0, 5).map((inv) => {
      const status = String(inv.status || "DRAFT").toUpperCase();
      let badgeVariant: "success" | "warning" | "destructive" | "secondary" = "secondary";
      if (status === "PAID") badgeVariant = "success";
      else if (status === "OVERDUE") badgeVariant = "destructive";
      else if (status === "SENT" || status === "OUTSTANDING") badgeVariant = "warning";

      const formattedDate = new Date(inv.date || inv.issueDate || inv.createdAt || now).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      return {
        id: inv.id,
        customer: inv.customerName || inv.customers?.name || "Customer",
        number: inv.invoiceNumber || `INV-${inv.id}`,
        date: formattedDate,
        amount: Number(inv.amount) || 0,
        status,
        variant: badgeVariant,
      };
    });

    return {
      totalReceivables: receivables || 0,
      paidThisMonth: paid || 0,
      overdueTotal: overdue || 0,
      recentInvoices: recent,
    };
  }, [rawInvoices]);

  const activeEstimatesValue = useMemo(() => {
    return rawEstimates
      .filter((e) => {
        const s = String(e.status || "").toUpperCase();
        return s === "SENT" || s === "ACCEPTED";
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [rawEstimates]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Financial Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! Here's an overview of your organization's cash flow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/invoices">
            <Button className="gap-2 font-bold shadow-xs">
              <Plus className="size-4" />
              <span>New Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Receivables */}
        <Card className="hover:border-foreground/20 transition-colors bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Receivables
            </CardTitle>
            <TrendingUp className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground font-mono">
              {formatCurrency(totalReceivables, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-semibold">Active</span> across uncollected invoices
            </p>
          </CardContent>
        </Card>

        {/* Paid This Month */}
        <Card className="hover:border-foreground/20 transition-colors bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Paid (This Month)
            </CardTitle>
            <Clock className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground font-mono">
              {formatCurrency(paidThisMonth, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across completed transactions
            </p>
          </CardContent>
        </Card>

        {/* Overdue Receivables / Active Pipeline */}
        <Card className="hover:border-foreground/20 transition-colors bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {overdueTotal > 0 ? "Overdue Balance" : "Active Quotes Pipeline"}
            </CardTitle>
            {overdueTotal > 0 ? (
              <Badge variant="destructive">Attention</Badge>
            ) : (
              <Badge variant="success">Healthy</Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black tracking-tight font-mono ${overdueTotal > 0 ? "text-destructive" : "text-foreground"}`}>
              {formatCurrency(overdueTotal > 0 ? overdueTotal : activeEstimatesValue || 157000, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overdueTotal > 0 ? "Requires follow-up with clients" : "Open proposals awaiting customer approval"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          to="/invoices"
          className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors group shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Create Invoice</div>
              <div className="text-xs text-muted-foreground">Bill your customers</div>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {isFeatureEnabled("estimates") && (
          <Link
            to="/estimates"
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
                <Calculator className="size-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">New Estimate</div>
                <div className="text-xs text-muted-foreground">Send quote or bid</div>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {isFeatureEnabled("creditNotes") && (
          <Link
            to="/sales/credit-notes"
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Credit Notes</div>
                <div className="text-xs text-muted-foreground">Issue refund / credit</div>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        <Link
          to="/customers"
          className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors group shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Users className="size-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Add Customer</div>
              <div className="text-xs text-muted-foreground">Manage client directory</div>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Recent Invoices Table */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Most recent billing activity</CardDescription>
          </div>
          <Link to="/invoices">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <span>View All</span>
              <ArrowUpRight className="size-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : recentInvoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Create your first client invoice to start tracking receivables and cash flow."
              actionLabel="Create Invoice"
              onAction={() => {
                window.location.href = "/invoices";
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pl-2">Customer</th>
                    <th className="pb-3">Invoice #</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 pr-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 pl-2 font-semibold text-foreground">
                        {inv.customer}
                      </td>
                      <td className="py-3.5 text-muted-foreground font-mono">
                        {inv.number}
                      </td>
                      <td className="py-3.5 text-muted-foreground">
                        {inv.date}
                      </td>
                      <td className="py-3.5 text-center">
                        <Badge variant={inv.variant} className="text-[10px]">
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 pr-2 text-right font-bold text-foreground font-mono">
                        {formatCurrency(inv.amount, currency)}
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
  );
}

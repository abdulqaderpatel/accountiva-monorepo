import React from "react";
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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@accountiva/shared";

export function Dashboard() {
  const metrics = {
    receivables: 482500,
    paidThisMonth: 195000,
    overdue: 42800,
    activeInvoicesCount: 28,
  };

  const recentInvoices = [
    {
      id: "1",
      customer: "Delta Retail Corp",
      number: "INV-2026-042",
      date: "12 Oct 2026",
      amount: 35400,
      status: "PAID",
      variant: "success" as const,
    },
    {
      id: "2",
      customer: "Zephyr Logistics Pvt Ltd",
      number: "INV-2026-041",
      date: "Due 15 Oct 2026",
      amount: 78250,
      status: "SENT",
      variant: "warning" as const,
    },
    {
      id: "3",
      customer: "Horizon Software Systems",
      number: "INV-2026-039",
      date: "Overdue 5d",
      amount: 42800,
      status: "OVERDUE",
      variant: "danger" as const,
    },
    {
      id: "4",
      customer: "Sterling Media Group",
      number: "INV-2026-038",
      date: "28 Sep 2026",
      amount: 18000,
      status: "DRAFT",
      variant: "draft" as const,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Financial Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back! Here's an overview of your organization's cash flow.
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
        <Card className="hover:border-foreground/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Receivables
            </CardTitle>
            <TrendingUp className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {formatCurrency(metrics.receivables, "INR")}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-semibold">+14.2%</span> from last month
            </p>
          </CardContent>
        </Card>

        {/* Paid This Month */}
        <Card className="hover:border-foreground/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Paid (This Month)
            </CardTitle>
            <Clock className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {formatCurrency(metrics.paidThisMonth, "INR")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across completed transactions
            </p>
          </CardContent>
        </Card>

        {/* Overdue Receivables */}
        <Card className="hover:border-foreground/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Overdue Amount
            </CardTitle>
            <Badge variant="danger">Attention</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-destructive">
              {formatCurrency(metrics.overdue, "INR")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires follow-up with clients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        <Link
          to="/customers"
          className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors group shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Add Customer</div>
              <div className="text-xs text-muted-foreground">Manage client directory</div>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          to="/estimates"
          className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors group shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Calculator className="size-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">New Estimate</div>
              <div className="text-xs text-muted-foreground">Send quote or proposal</div>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Recent Invoices Table */}
      <Card>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pl-2">Customer</th>
                  <th className="pb-3">Invoice #</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 pl-2 font-semibold text-foreground">
                      {inv.customer}
                    </td>
                    <td className="py-3 text-muted-foreground font-mono text-xs">
                      {inv.number}
                    </td>
                    <td className="py-3 text-muted-foreground text-xs">
                      {inv.date}
                    </td>
                    <td className="py-3">
                      <Badge variant={inv.variant} size="sm">
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-2 text-right font-bold text-foreground">
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

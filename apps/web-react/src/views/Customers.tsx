import React, { useState } from "react";
import { Plus, Search, Mail, Phone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@accountiva/shared";

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  gstTreatment: string;
  outstanding: number;
}

export function Customers() {
  const [search, setSearch] = useState("");

  const customers: CustomerRecord[] = [
    {
      id: "1",
      name: "Delta Retail Corp",
      email: "delta@retailcorp.in",
      phone: "+91 98201 23456",
      company: "Delta Retail Corporation",
      gstTreatment: "Regular",
      outstanding: 0,
    },
    {
      id: "2",
      name: "Zephyr Logistics Pvt Ltd",
      email: "billing@zephyr.co",
      phone: "+91 99123 45678",
      company: "Zephyr Logistics Private Limited",
      gstTreatment: "GST Registered",
      outstanding: 78250,
    },
    {
      id: "3",
      name: "Horizon Software Systems",
      email: "accounts@horizonsoft.com",
      phone: "+91 98450 11223",
      company: "Horizon Software Systems LLC",
      gstTreatment: "Overdue",
      outstanding: 42800,
    },
  ];

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your clients, contact info, and outstanding balances.
          </p>
        </div>

        <Button size="sm" className="gap-2 font-bold shadow-xs">
          <Plus className="size-4" />
          <span>Add Customer</span>
        </Button>
      </div>

      {/* Search Input */}
      <Card>
        <CardContent className="p-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by customer name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">
                  <th className="py-3.5 pl-6">Customer</th>
                  <th className="py-3.5">Contact</th>
                  <th className="py-3.5">Company</th>
                  <th className="py-3.5">GST Status</th>
                  <th className="py-3.5 pr-6 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="py-4 pl-6 font-semibold text-foreground">
                      {c.name}
                    </td>
                    <td className="py-4 text-xs text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Mail className="size-3" />
                        <span>{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3" />
                        <span>{c.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 text-muted-foreground text-xs">
                      {c.company}
                    </td>
                    <td className="py-4">
                      <Badge variant="outline" size="sm">
                        {c.gstTreatment}
                      </Badge>
                    </td>
                    <td className="py-4 pr-6 text-right font-black text-foreground">
                      {c.outstanding === 0 ? (
                        <span className="text-emerald-500 font-bold">₹0.00 (Paid)</span>
                      ) : (
                        formatCurrency(c.outstanding, "INR")
                      )}
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

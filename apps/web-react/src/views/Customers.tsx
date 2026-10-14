import React, { useState } from "react";
import { Plus, Search, Mail, Phone, Building2, Eye, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@accountiva/shared";
import { useCustomers, useDeleteCustomer } from "@accountiva/api";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/empty-state";

interface CustomerRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  gstTreatment?: string;
  outstanding?: number;
  opening_balance?: number;
}

export function Customers() {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: apiCustomers, isLoading, refetch } = useCustomers({
    search: search || undefined,
  });

  const deleteCustomerMutation = useDeleteCustomer();

  const customerList: CustomerRecord[] = Array.isArray(apiCustomers)
    ? apiCustomers
    : (Array.isArray(apiCustomers?.data)
        ? apiCustomers.data
        : []);

  const filtered = customerList.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  });

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteCustomerMutation.mutateAsync(id);
      toast.success("Customer deleted", {
        description: `${name} has been removed.`,
      });
      refetch();
    } catch (err: any) {
      toast.error("Failed to delete customer", {
        description: err.response?.data?.message || err.message,
      });
    }
  };

  const totalOutstanding = filtered.reduce(
    (acc, c) => acc + (Number(c.outstanding) || Number(c.opening_balance) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your clients, tax identification, contact info, and outstanding receivables.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button size="sm" className="gap-2" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Total Customers</p>
          <p className="text-xl font-bold font-mono text-foreground mt-1">
            {filtered.length}
          </p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">GST Registered</p>
          <p className="text-xl font-bold font-mono text-emerald-500 mt-1">
            {filtered.filter((c) => c.gstTreatment === "Registered").length}
          </p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60">
          <p className="text-xs font-medium text-muted-foreground">Total Receivables</p>
          <p className="text-xl font-bold font-mono text-primary mt-1">
            {formatCurrency(totalOutstanding)}
          </p>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <div className="p-4 flex items-center justify-between gap-4 border-b border-border/60">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, company, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">GST Treatment</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Spinner size="md" />
                      <span>Loading customers...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4">
                    <EmptyState
                      icon={Building2}
                      title="No customers found"
                      description={
                        search
                          ? `No customer record matches "${search}".`
                          : "Build your client directory to quickly issue invoices and track balances."
                      }
                      actionLabel={search ? "Clear Search" : "Add Customer"}
                      onAction={() => {
                        if (search) {
                          setSearch("");
                        } else {
                          setIsAddOpen(true);
                        }
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-foreground">{c.name}</div>
                      {c.company && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {c.company}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span>{c.email}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={c.gstTreatment === "Registered" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {c.gstTreatment || "Consumer"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                      {formatCurrency(Number(c.outstanding) || Number(c.opening_balance) || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(c.id, c.name)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default Customers;

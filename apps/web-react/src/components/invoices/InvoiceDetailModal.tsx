import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@accountiva/shared";
import { useUpdateInvoiceStatus } from "@accountiva/api";
import { toast } from "sonner";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Printer,
  Share2,
  Send,
  Check,
  Copy,
} from "lucide-react";
import { SendInvoiceModal } from "./SendInvoiceModal";

interface InvoiceDetailModalProps {
  isOpen: boolean;
  invoice: any | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InvoiceDetailModal({
  isOpen,
  invoice,
  onClose,
  onSuccess,
}: InvoiceDetailModalProps) {
  const [isSendOpen, setIsSendOpen] = useState(false);
  const updateStatusMutation = useUpdateInvoiceStatus();

  if (!invoice) return null;

  const rawAmount = Number(invoice.amount) || 0;
  const rawSubtotal = Number(invoice.subtotal) || rawAmount * 0.847;
  const rawTax = Number(invoice.taxAmount) || Number(invoice.tax_amount) || rawAmount - rawSubtotal;
  const status = String(invoice.status || "Draft").toUpperCase();

  const isPaid = status === "PAID";
  const isOverdue = status === "OVERDUE";

  const handleStatusUpdate = async (newStatus: "Paid" | "Outstanding") => {
    try {
      await updateStatusMutation.mutateAsync({
        id: invoice.id,
        status: newStatus,
      });
      toast.success(
        newStatus === "Outstanding" ? "Invoice finalized!" : "Invoice marked as Paid!",
      );
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update status");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice ${invoice.invoiceNumber || invoice.number}`}
      description="View invoice breakdown, client billing details, and update status."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                {invoice.invoiceNumber || invoice.number}
              </div>
              <div className="text-xs text-muted-foreground">
                Issued to {invoice.customerName || invoice.customers?.name || invoice.customer || "Client"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPaid ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="size-3" /> Paid
              </Badge>
            ) : isOverdue ? (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="size-3" /> Overdue
              </Badge>
            ) : status === "DRAFT" ? (
              <Badge variant="draft" className="gap-1">
                <FileText className="size-3" /> Draft
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <Clock className="size-3" /> Outstanding
              </Badge>
            )}
          </div>
        </div>

        {/* Client & Date Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-3.5 border-border/60 bg-card/60 space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="size-3.5" /> Billed Client
            </div>
            <div className="text-sm font-bold text-foreground">
              {invoice.customerName || invoice.customers?.name || invoice.customer || "Unknown Customer"}
            </div>
            <div className="text-xs text-muted-foreground">
              {invoice.email || "client@accountiva.com"}
            </div>
          </Card>

          <Card className="p-3.5 border-border/60 bg-card/60 space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="size-3.5" /> Timeline
            </div>
            <div className="text-xs text-muted-foreground">
              Date: <span className="text-foreground font-medium">{invoice.date || invoice.issueDate || "Today"}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Due Date: <span className="text-foreground font-medium">{invoice.dueDate || "Net 15"}</span>
            </div>
          </Card>
        </div>

        {/* Line Items Table */}
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {Array.isArray(invoice.items) && invoice.items.length > 0 ? (
                invoice.items.map((it: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      {it.itemName || it.name || "Service Item"}
                      {it.description ? (
                        <div className="text-[11px] text-muted-foreground">{it.description}</div>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-3 text-center text-muted-foreground font-mono">
                      {it.quantity || 1}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                      {formatCurrency(Number(it.rate) || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                      {formatCurrency((Number(it.quantity) || 1) * (Number(it.rate) || 0))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-2.5 px-3 font-medium text-foreground">
                    General Invoiced Services
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">1</td>
                  <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                    {formatCurrency(rawSubtotal)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency(rawSubtotal)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals */}
        <div className="flex justify-end pt-2">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono text-foreground font-semibold">
                {formatCurrency(rawSubtotal)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax (GST 18%)</span>
              <span className="font-mono text-foreground font-semibold">
                {formatCurrency(rawTax)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border/60 text-sm font-bold text-foreground">
              <span>Total Amount</span>
              <span className="font-mono text-primary font-black">
                {formatCurrency(rawAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
              <Printer className="size-3.5" />
              <span>Print / PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = `${window.location.origin}/invoices/view/${invoice.id}`;
                navigator.clipboard.writeText(url);
                toast.success("Public invoice link copied to clipboard!");
              }}
              className="gap-1.5 text-xs"
            >
              <Copy className="size-3.5" />
              <span>Copy Link</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSendOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Send className="size-3.5" />
              <span>Send Email</span>
            </Button>

            {!isPaid && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate("Paid")}
                disabled={updateStatusMutation.isPending}
                className="gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <Check className="size-3.5" />
                <span>Mark Paid</span>
              </Button>
            )}

            {status === "DRAFT" && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate("Outstanding")}
                disabled={updateStatusMutation.isPending}
                className="gap-1.5 text-xs"
              >
                <Check className="size-3.5" />
                <span>Finalize Invoice</span>
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Send Invoice Modal */}
      <SendInvoiceModal
        isOpen={isSendOpen}
        invoice={invoice}
        onClose={() => setIsSendOpen(false)}
        onSuccess={() => {
          onSuccess?.();
        }}
      />
    </Modal>
  );
}

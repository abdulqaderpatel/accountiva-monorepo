import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@accountiva/shared";
import { useCreateCreditNote, useCustomers, useInvoices } from "@accountiva/api";
import { toast } from "sonner";

interface CreateCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CREDIT_REASONS = [
  "Sales Return / Product Rejection",
  "Billing Correction / Price Difference",
  "Defective Goods Received",
  "Order Cancellation",
  "Post-Sale Volume Discount",
  "Other Financial Adjustment",
];

export function CreateCreditNoteModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCreditNoteModalProps) {
  const createCreditNoteMutation = useCreateCreditNote();
  const { data: apiCustomers } = useCustomers();
  const { data: apiInvoices } = useInvoices();

  const customerList: any[] = React.useMemo(() => {
    if (Array.isArray(apiCustomers) && apiCustomers.length > 0) return apiCustomers;
    if (Array.isArray(apiCustomers?.data) && apiCustomers.data.length > 0) return apiCustomers.data;
    return [];
  }, [apiCustomers]);

  const invoiceList: any[] = React.useMemo(() => {
    if (Array.isArray(apiInvoices) && apiInvoices.length > 0) return apiInvoices;
    if (Array.isArray(apiInvoices?.data) && apiInvoices.data.length > 0) return apiInvoices.data;
    return [];
  }, [apiInvoices]);

  const [customerName, setCustomerName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [creditNoteNumber, setCreditNoteNumber] = useState(
    `CN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState(CREDIT_REASONS[0]);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!creditNoteNumber.trim()) {
      toast.error("Credit note number is required");
      return;
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      await createCreditNoteMutation.mutateAsync({
        creditNoteNumber,
        customerName,
        invoiceNumber: invoiceNumber || undefined,
        date,
        amount: numericAmount,
        reason,
        notes,
        status: "Open",
      });

      toast.success("Credit note created successfully!", {
        description: `Credit Note ${creditNoteNumber} issued for ${formatCurrency(numericAmount)}.`,
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error("Failed to create credit note", {
        description: error.response?.data?.message || error.message,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Issue Credit Note"
      description="Create a credit adjustment to reduce customer balance or issue a refund."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cnCustomerName">Customer *</Label>
            <Input
              id="cnCustomerName"
              list="cn-customers-datalist"
              placeholder="Select or enter customer name..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
            <datalist id="cn-customers-datalist">
              {customerList.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cnNumber">Credit Note Number *</Label>
            <Input
              id="cnNumber"
              value={creditNoteNumber}
              onChange={(e) => setCreditNoteNumber(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cnDate">Issue Date</Label>
            <Input
              id="cnDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cnInvoice">Linked Invoice (Optional)</Label>
            <Input
              id="cnInvoice"
              list="cn-invoices-datalist"
              placeholder="e.g. INV-2026-001"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
            <datalist id="cn-invoices-datalist">
              {invoiceList.map((inv) => (
                <option
                  key={inv.id}
                  value={inv.invoiceNumber}
                  label={`${inv.customerName || ""} (${formatCurrency(inv.amount)})`}
                />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cnAmount">Credit Amount (₹) *</Label>
            <Input
              id="cnAmount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cnReason">Adjustment Reason</Label>
            <select
              id="cnReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CREDIT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cnNotes">Internal Reference / Explanation</Label>
            <Textarea
              id="cnNotes"
              rows={2}
              placeholder="Reason for concession, authorization details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createCreditNoteMutation.isPending}>
            {createCreditNoteMutation.isPending ? "Issuing..." : "Issue Credit Note"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

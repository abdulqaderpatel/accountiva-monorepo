import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Link } from "lucide-react";
import { useApplyCreditNote, useCustomer, useInvoices } from "@accountiva/api";
import { calculateInvoiceOutstandingAmount, formatCurrency } from "@accountiva/shared";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export interface ApplicableCreditNote {
  id: string;
  creditNoteNumber: string;
  customerId: string;
  amount: number;
  remainingAmount: number;
}

interface ApplyCreditNoteModalProps {
  open: boolean;
  creditNote: ApplicableCreditNote | null;
  onClose: () => void;
  onApplied: () => void | Promise<void>;
  refreshCreditBalance: () => Promise<number>;
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  outstandingAmount: number;
}

export function ApplyCreditNoteModal({
  open,
  creditNote,
  onClose,
  onApplied,
  refreshCreditBalance,
}: ApplyCreditNoteModalProps) {
  const { currentOrganization } = useAuth();
  const currencyCode = currentOrganization?.currency || "INR";
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState<number | string>("");
  const [availableCredit, setAvailableCredit] = useState(0);
  const {
    data: apiInvoices,
    refetch: refetchInvoices,
    isLoading: areInvoicesLoading,
  } = useInvoices(
    { status: "Outstanding", limit: 100 },
    { enabled: open && Boolean(creditNote) },
  );
  const {
    data: customerDetail,
    refetch: refetchCustomer,
    isLoading: isCustomerLoading,
  } = useCustomer(creditNote?.customerId || "");
  const applyMutation = useApplyCreditNote();
  const isLoading = areInvoicesLoading || isCustomerLoading;

  const invoices = useMemo(() => {
    const customerInvoices = Array.isArray(customerDetail?.invoices)
      ? customerDetail.invoices
      : null;
    const raw = customerInvoices ?? (Array.isArray(apiInvoices)
      ? apiInvoices
      : Array.isArray(apiInvoices?.data)
        ? apiInvoices.data
        : Array.isArray(apiInvoices?.invoices)
          ? apiInvoices.invoices
          : []);

    return raw
      .filter(
        (invoice: any) =>
          creditNote &&
          (invoice.customerId || invoice.customer_id || creditNote.customerId) === creditNote.customerId &&
          String(invoice.status || "").toLowerCase() === "outstanding",
      )
      .map((invoice: any): InvoiceOption => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber || invoice.invoice_number || "Invoice",
        outstandingAmount: calculateInvoiceOutstandingAmount(invoice),
      }))
      .filter((invoice: InvoiceOption) => invoice.outstandingAmount > 0);
  }, [apiInvoices, creditNote, customerDetail]);

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId);
  const maximumAmount = selectedInvoice
    ? Math.min(availableCredit, selectedInvoice.outstandingAmount)
    : availableCredit;

  useEffect(() => {
    if (!open || !creditNote) return;
    setSelectedInvoiceId("");
    setAmount("");
    setAvailableCredit(Number(creditNote.remainingAmount) || 0);
  }, [open, creditNote]);

  const handleInvoiceChange = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    const invoice = invoices.find((candidate) => candidate.id === invoiceId);
    if (invoice) {
      setAmount(Math.min(availableCredit, invoice.outstandingAmount));
    }
  };

  const handleApply = async () => {
    if (!creditNote || !selectedInvoice) {
      toast.error("Please select an outstanding invoice");
      return;
    }

    const amountApplied = Number(amount);
    if (!Number.isFinite(amountApplied) || amountApplied <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }
    if (amountApplied > maximumAmount) {
      toast.error(`Amount cannot exceed ${formatCurrency(maximumAmount, currencyCode)}`);
      return;
    }

    try {
      await applyMutation.mutateAsync({
        id: creditNote.id,
        payload: { invoiceId: selectedInvoice.id, amountApplied },
      });
      await Promise.allSettled([onApplied(), refetchCustomer()]);
      toast.success("Credit applied successfully");
      onClose();
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to apply credit note";
      if (error.response?.status === 409) {
        const [, , refreshedBalance] = await Promise.allSettled([
          refetchInvoices(),
          refetchCustomer(),
          refreshCreditBalance(),
        ]);
        if (refreshedBalance.status === "fulfilled") {
          setAvailableCredit(Number(refreshedBalance.value) || 0);
        }
        toast.error(message, {
          description: "Balances were refreshed. Review the retained amount and try again.",
        });
        return;
      }
      toast.error(message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title="Apply Credit to Invoice"
      description={creditNote ? `Credit Note: ${creditNote.creditNoteNumber}` : undefined}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button type="button" variant="ghost" onClick={onClose} disabled={applyMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleApply()}
            disabled={!selectedInvoiceId || applyMutation.isPending || maximumAmount <= 0}
            className="gap-2"
          >
            {applyMutation.isPending ? <Spinner className="size-3.5" /> : <Link className="size-3.5" />}
            Apply Credit
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-muted/40 border border-border rounded-lg flex justify-between text-xs items-center">
          <span className="font-medium text-muted-foreground">Available Credit Balance</span>
          <span className="font-bold text-foreground font-mono text-sm">
            {formatCurrency(availableCredit, currencyCode)}
          </span>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Select Invoice *</Label>
          <Select
            value={selectedInvoiceId}
            onChange={handleInvoiceChange}
            options={invoices.map((invoice) => ({
              id: invoice.id,
              name: `${invoice.invoiceNumber} (Outstanding: ${formatCurrency(invoice.outstandingAmount, currencyCode)})`,
            }))}
            placeholder={isLoading ? "Loading outstanding invoices..." : "Select outstanding invoice"}
            disabled={isLoading || invoices.length === 0}
          />
        </div>

        {selectedInvoice ? (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Amount to Apply *</Label>
            <Input
              type="number"
              value={amount}
              min={0.01}
              max={maximumAmount}
              step="0.01"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
            <p className="text-[11px] text-muted-foreground">
              Maximum {formatCurrency(maximumAmount, currencyCode)} based on both available balances.
            </p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-3 bg-muted/20 border border-border rounded-lg flex gap-3 text-xs text-muted-foreground">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>
              {isLoading
                ? "Loading outstanding invoices for this customer."
                : "No outstanding invoices found for this customer. Credit notes can only be applied to unpaid invoices."}
            </span>
          </div>
        ) : (
          <div className="p-3 bg-muted/20 border border-border rounded-lg flex gap-3 text-xs text-muted-foreground">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>Select an outstanding invoice to enter the credit amount.</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ApplyCreditNoteModal;

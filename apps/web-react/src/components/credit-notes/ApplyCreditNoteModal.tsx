import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Link } from "lucide-react";
import { useApplyCreditNote, useInvoices } from "@accountiva/api";
import { formatCurrency } from "@accountiva/shared";
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

function reportedOutstandingAmount(invoice: any): number {
  const explicitBalance = [
    invoice.remainingAmount,
    invoice.outstandingAmount,
    invoice.balanceDue,
  ].map(Number).find(Number.isFinite);
  if (explicitBalance !== undefined) return Math.max(0, explicitBalance);

  const applications = invoice.creditNoteApplications || invoice.credit_note_applications || [];
  const applied = Array.isArray(applications)
    ? applications.reduce(
        (sum: number, application: any) =>
          sum + Number(application.amountApplied ?? application.amount_applied ?? 0),
        0,
      )
    : 0;
  return Math.max(0, Number(invoice.amount) - applied);
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
  const { data: apiInvoices, refetch: refetchInvoices, isLoading } = useInvoices({
    status: "Outstanding",
    limit: 100,
  });
  const applyMutation = useApplyCreditNote();

  const invoices = useMemo(() => {
    const raw = Array.isArray(apiInvoices)
      ? apiInvoices
      : Array.isArray(apiInvoices?.data)
        ? apiInvoices.data
        : Array.isArray(apiInvoices?.invoices)
          ? apiInvoices.invoices
          : [];

    return raw
      .filter(
        (invoice: any) =>
          creditNote &&
          invoice.customerId === creditNote.customerId &&
          String(invoice.status || "").toLowerCase() !== "paid",
      )
      .map((invoice: any): InvoiceOption => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber || "Invoice",
        outstandingAmount: reportedOutstandingAmount(invoice),
      }))
      .filter((invoice: InvoiceOption) => invoice.outstandingAmount > 0);
  }, [apiInvoices, creditNote]);

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
      toast.success("Credit applied successfully");
      await onApplied();
      onClose();
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to apply credit note";
      if (error.response?.status === 409) {
        const [, refreshedBalance] = await Promise.all([
          refetchInvoices(),
          refreshCreditBalance(),
        ]);
        setAvailableCredit(Number(refreshedBalance) || 0);
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
        ) : (
          <div className="p-3 bg-muted/20 border border-border rounded-lg flex gap-3 text-xs text-muted-foreground">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>
              {isLoading
                ? "Loading outstanding invoices for this customer."
                : "No outstanding invoices found for this customer. Credit notes can only be applied to unpaid invoices."}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ApplyCreditNoteModal;

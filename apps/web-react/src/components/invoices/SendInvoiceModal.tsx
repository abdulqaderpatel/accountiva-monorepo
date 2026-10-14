import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mail, FileText, CheckCircle2 } from "lucide-react";
import { useSendInvoice } from "@accountiva/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any | null;
  onSuccess?: () => void;
}

export function SendInvoiceModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: SendInvoiceModalProps) {
  const { currentOrganization } = useAuth();
  const sendInvoiceMutation = useSendInvoice();

  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen && invoice) {
      const invNum = invoice.invoiceNumber || invoice.number || "INV";
      const orgName = currentOrganization?.name || "Accountiva";
      const clientName = invoice.customerName || invoice.customers?.name || "Valued Client";

      setRecipientEmail(invoice.email || invoice.customers?.email || "");
      setSubject(`Invoice ${invNum} from ${orgName}`);
      setMessage(
        `Dear ${clientName},\n\nPlease find attached your invoice ${invNum} for recent services. You can review the itemized breakdown and make a payment directly online.\n\nThank you for your business!\n\nBest regards,\n${orgName}`
      );
    }
  }, [isOpen, invoice, currentOrganization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientEmail.trim()) {
      toast.error("Recipient email is required");
      return;
    }

    if (!invoice?.id) return;

    try {
      await sendInvoiceMutation.mutateAsync({
        id: invoice.id,
        payload: {
          recipientEmail: recipientEmail.trim(),
          subject: subject.trim(),
          message: message.trim(),
        },
      });

      toast.success("Invoice sent successfully!", {
        description: `Delivered to ${recipientEmail.trim()}`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to send invoice email");
    }
  };

  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Invoice by Email"
      description="Directly deliver invoice PDF and secure payment link to client."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sendRecipient">Recipient Email *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="sendRecipient"
              type="email"
              placeholder="client@company.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              required
              className="pl-9 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sendSubject">Subject Line</Label>
          <Input
            id="sendSubject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sendMessage">Message Body</Label>
          <Textarea
            id="sendMessage"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="text-xs font-sans leading-relaxed"
          />
        </div>

        {/* Attachment Pill */}
        <div className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-muted/20 text-xs">
          <FileText className="size-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">
              {invoice.invoiceNumber || invoice.number}.pdf
            </div>
            <div className="text-[11px] text-muted-foreground">
              Official tax invoice with itemized calculation attached automatically.
            </div>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
            <CheckCircle2 className="size-3.5" /> Attached
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={sendInvoiceMutation.isPending}
            className="gap-2 font-bold shadow-xs"
          >
            <Send className="size-3.5" />
            <span>{sendInvoiceMutation.isPending ? "Sending..." : "Send Invoice"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}

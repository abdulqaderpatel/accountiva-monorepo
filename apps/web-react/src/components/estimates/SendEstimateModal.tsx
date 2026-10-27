import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mail, FileText, CheckCircle2, Download } from "lucide-react";
import { useSendEstimate } from "@accountiva/api";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

export interface SendEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate?: any | null;
  onSuccess?: () => void;
}

export function SendEstimateModal({
  isOpen,
  onClose,
  estimate,
  onSuccess,
}: SendEstimateModalProps) {
  const { currentOrganization } = useAuth();
  const sendEstimateMutation = useSendEstimate();

  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (isOpen && estimate) {
      const estNum = estimate.estimateNumber || estimate.number || "EST";
      const orgName = currentOrganization?.name || "Accountiva";
      const clientName =
        estimate.customerName ||
        estimate.customers?.name ||
        estimate.customer ||
        "Valued Client";

      const defaultEmail =
        estimate.email ||
        estimate.customers?.email ||
        estimate.customerEmail ||
        "";

      setRecipientEmail(defaultEmail);
      setSubject(`Estimate ${estNum} from ${orgName}`);
      setMessage(
        `Dear ${clientName},\n\nPlease find attached the official estimate ${estNum} in PDF format for your requested items and services.\n\nYou can review the itemized calculation in the attached PDF. Please feel free to reach out if you have any questions or would like to approve this estimate.\n\nThank you for considering us!\n\nBest regards,\n${orgName}`
      );
    }
  }, [isOpen, estimate, currentOrganization]);

  const handleDownloadPdf = async () => {
    if (!estimate?.id) return;
    setIsDownloadingPdf(true);
    try {
      const response = await api.get(`/estimates/${estimate.id}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${estimate.estimateNumber || estimate.number || "Estimate"}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("PDF download error:", err);
      toast.error("Could not download PDF preview", {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientEmail.trim()) {
      toast.error("Recipient email is required");
      return;
    }

    if (!estimate?.id) return;

    try {
      await sendEstimateMutation.mutateAsync({
        id: estimate.id,
        payload: {
          recipientEmail: recipientEmail.trim(),
          subject: subject.trim(),
          message: message.trim(),
        },
      });

      toast.success("Estimate sent successfully!", {
        description: `Delivered with PDF to ${recipientEmail.trim()}`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to send estimate email"
      );
    }
  };

  if (!estimate) return null;

  const estNumber = estimate.estimateNumber || estimate.number || "EST";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Estimate by Email"
      description="Directly deliver quote PDF document to client's inbox."
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
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="size-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-foreground truncate">
                {estNumber}.pdf
              </div>
              <div className="text-[11px] text-muted-foreground">
                Itemized estimate generated in PDF format will be attached automatically.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="h-7 text-[11px] gap-1 px-2.5"
            >
              <Download className="size-3" />
              {isDownloadingPdf ? "Loading..." : "Preview PDF"}
            </Button>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="size-3" /> Attached
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={sendEstimateMutation.isPending}
            className="gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="size-3.5" />
            <span>
              {sendEstimateMutation.isPending ? "Sending..." : "Send Estimate"}
            </span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}


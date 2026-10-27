import React, { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import {
  Printer,
  Copy,
  Check,
  FileText,
  AlertCircle,
  Building2,
  Calendar,
  CreditCard,
  ShieldCheck,
  Download,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency, formatDate, getDocumentSummaryDetails } from "@accountiva/shared";
import { toast } from "sonner";
import { InvoiceTemplate, TemplateId } from "@/components/invoices/InvoiceTemplate";
import { cn } from "@/lib/utils";

export function PublicInvoiceView() {
  const { id } = useParams({ strict: false }) as { id: string };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [organization, setOrganization] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("standard");

  useEffect(() => {
    async function fetchPublicInvoice() {
      if (!id) {
        setError("Invalid invoice reference.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data } = await api.get(`/invoices/public/${id}`);
        if (data?.invoice) {
          setInvoice(data.invoice);
          setOrganization(data.organization || {});
          document.title = `Invoice #${data.invoice.invoiceNumber} | ${data.organization?.name || "Accountiva"}`;
        } else {
          setError("Invoice details could not be found.");
        }
      } catch (err: any) {
        console.error("Error loading public invoice:", err);
        if (err.response?.status === 404) {
          setError("This invoice does not exist or the link may have expired.");
        } else {
          setError("Unable to load invoice details. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPublicInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Invoice link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleSimulatePayment = () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      if (invoice) {
        setInvoice({ ...invoice, status: "Paid" });
      }
      toast.success("Payment received successfully!", {
        description: "Invoice status updated to Paid.",
      });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <span className="text-xs text-muted-foreground">Loading public invoice...</span>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-3">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground font-display">Invoice Unavailable</h2>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">{error}</p>
      </div>
    );
  }

  const summary = getDocumentSummaryDetails(invoice);
  const isPaid = String(invoice.status || "").toUpperCase() === "PAID";
  const isOverdue =
    invoice.dueDate &&
    new Date(invoice.dueDate) < new Date() &&
    !isPaid;

  const items = Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : [];

  return (
    <div className="min-h-screen bg-muted/10 text-foreground flex flex-col antialiased">
      {/* Top Floating Action Bar (Hidden in Print) */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/80 shadow-2xs print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm truncate font-display">
                  {organization?.name || "Accountiva Invoice"}
                </span>
                <Badge variant={isPaid ? "success" : isOverdue ? "destructive" : "warning"} className="text-[10px]">
                  {isPaid ? "Paid" : isOverdue ? "Overdue" : "Outstanding"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Invoice {invoice.invoiceNumber || invoice.number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Template Selector (Desktop) */}
            <div className="hidden sm:flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
              {(["standard", "modern", "minimal", "premium"] as const).map((tId) => (
                <button
                  key={tId}
                  type="button"
                  onClick={() => setSelectedTemplate(tId)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all capitalize cursor-pointer",
                    selectedTemplate === tId
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tId}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 text-xs">
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy Link"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
              <Printer className="size-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
            </Button>
            {!isPaid && (
              <Button size="sm" onClick={handleSimulatePayment} disabled={isPaying} className="gap-1.5 text-xs font-bold shadow-xs">
                <CreditCard className="size-3.5" />
                <span>{isPaying ? "Processing..." : `Pay ${formatCurrency(summary.total)}`}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Invoice Document Canvas */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 my-6">
        <InvoiceTemplate
          invoice={invoice}
          organization={organization}
          templateId={selectedTemplate}
        />
      </main>
    </div>
  );
}

export default PublicInvoiceView;


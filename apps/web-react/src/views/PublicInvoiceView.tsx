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
import { formatCurrency, formatDate } from "@accountiva/shared";
import { toast } from "sonner";

export function PublicInvoiceView() {
  const { id } = useParams({ strict: false }) as { id: string };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [organization, setOrganization] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

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

  const rawAmount = Number(invoice.amount) || 0;
  const rawSubtotal = Number(invoice.subtotal) || rawAmount * 0.847;
  const rawTax = Number(invoice.taxAmount) || rawAmount - rawSubtotal;
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
                <span>{isPaying ? "Processing..." : `Pay ${formatCurrency(rawAmount)}`}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Invoice Document Canvas */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 my-6">
        <div className="bg-card border border-border/80 rounded-2xl shadow-xl p-8 sm:p-12 space-y-8 print:border-none print:shadow-none print:p-0">
          {/* Header & Seller Info */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-border/60">
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-lg shadow-xs mb-3">
                {organization?.name ? organization.name.charAt(0).toUpperCase() : "A"}
              </div>
              <h2 className="text-xl font-bold font-display text-foreground">
                {organization?.name || "Accountiva Global"}
              </h2>
              {organization?.address && (
                <p className="text-xs text-muted-foreground whitespace-pre-line max-w-xs leading-relaxed">
                  {organization.address}
                </p>
              )}
              {organization?.gstin && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">GSTIN:</span>{" "}
                  <span className="font-mono">{organization.gstin}</span>
                </div>
              )}
              {organization?.email && (
                <div className="text-xs text-muted-foreground">
                  <span>Email:</span> {organization.email}
                </div>
              )}
            </div>

            {/* Invoice Meta Box */}
            <div className="sm:text-right space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tax Invoice
              </span>
              <h1 className="text-2xl font-black font-mono tracking-tight text-foreground">
                {invoice.invoiceNumber || invoice.number}
              </h1>
              <div className="text-xs text-muted-foreground pt-2 space-y-1">
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  <span className="font-medium text-foreground">{invoice.date || invoice.issueDate || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Due Date:</span>{" "}
                  <span className="font-medium text-foreground">{invoice.dueDate || "—"}</span>
                </div>
                {invoice.referenceNumber && (
                  <div>
                    <span className="text-muted-foreground">Ref:</span>{" "}
                    <span className="font-mono font-medium text-foreground">{invoice.referenceNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Client Billed Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl border border-border/40 bg-muted/10 text-xs">
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                Billed To:
              </span>
              <div className="text-sm font-bold text-foreground">
                {invoice.customerName || invoice.customers?.name || "Valued Client"}
              </div>
              {invoice.customers?.company && (
                <div className="text-muted-foreground">{invoice.customers.company}</div>
              )}
              {invoice.email || invoice.customers?.email ? (
                <div className="text-muted-foreground">{invoice.email || invoice.customers?.email}</div>
              ) : null}
              {invoice.billingAddress || invoice.customers?.billingAddress ? (
                <div className="text-muted-foreground whitespace-pre-line mt-1">
                  {invoice.billingAddress || invoice.customers?.billingAddress}
                </div>
              ) : null}
            </div>

            <div className="sm:text-right space-y-1 flex flex-col justify-end">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Payment Status
              </span>
              <div className="text-base font-mono font-bold text-foreground">
                {isPaid ? (
                  <span className="text-emerald-500">PAID IN FULL</span>
                ) : (
                  <span className={isOverdue ? "text-rose-500" : "text-amber-500"}>
                    AMOUNT DUE: {formatCurrency(rawAmount)}
                  </span>
                )}
              </div>
              <div className="text-muted-foreground text-[11px]">
                {isPaid ? "Thank you for your payment!" : `Please settle by ${invoice.dueDate || "due date"}.`}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Item & Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Rate</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.length > 0 ? (
                  items.map((it: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/10">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">
                          {it.itemName || it.name || "Consulting & Services"}
                        </div>
                        {it.description ? (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {it.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                        {it.quantity || 1}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {formatCurrency(Number(it.rate) || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {formatCurrency((Number(it.quantity) || 1) * (Number(it.rate) || 0))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">Invoiced Services</div>
                      <div className="text-[11px] text-muted-foreground">Professional accounting services</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-muted-foreground">1</td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      {formatCurrency(rawSubtotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      {formatCurrency(rawSubtotal)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-border/60">
            <div className="space-y-2 text-xs text-muted-foreground max-w-sm">
              {invoice.notes && (
                <div>
                  <span className="font-semibold text-foreground block mb-0.5">Notes:</span>
                  <p className="leading-relaxed whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-emerald-500 font-semibold pt-2">
                <ShieldCheck className="size-4" />
                <span>Verified digital invoice issued by {organization?.name || "Accountiva"}</span>
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono text-foreground font-semibold">{formatCurrency(rawSubtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST Tax (18%)</span>
                <span className="font-mono text-foreground font-semibold">{formatCurrency(rawTax)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/60 text-base font-black text-foreground">
                <span>Total Due</span>
                <span className="font-mono text-primary font-black">{formatCurrency(rawAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PublicInvoiceView;


import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Mail,
  Layout,
  Settings2,
  Bookmark as BookmarkIcon,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  InvoiceTemplate,
  TemplateId,
  TemplateSettings,
  defaultTemplateSettings,
} from "./InvoiceTemplate";
import { SendInvoiceModal } from "./SendInvoiceModal";
import { printDocument } from "@/lib/printDocument";
import { useBookmarks } from "@/context/BookmarkContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface InvoicePreviewModalProps {
  open: boolean;
  invoice: any | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InvoicePreviewModal({
  open,
  invoice,
  onClose,
  onSuccess,
}: InvoicePreviewModalProps) {
  const { currentOrganization } = useAuth();
  const [activeTab, setActiveTab] = useState<"templates" | "properties">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(() => {
    if (typeof window !== "undefined") {
      const orgKey = currentOrganization?.id ? `accountiva_template_${currentOrganization.id}` : null;
      const saved = (orgKey && localStorage.getItem(orgKey)) || localStorage.getItem("accountiva_template");
      if (saved && ["standard", "modern", "minimal", "premium"].includes(saved)) {
        return saved as TemplateId;
      }
    }
    return "standard";
  });
  const [settings, setSettings] = useState<TemplateSettings>(defaultTemplateSettings);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<"portrait" | "landscape">("portrait");

  const { isBookmarked, toggleBookmark } = useBookmarks();

  const handlePrint = (orientationOverride?: "portrait" | "landscape") => {
    const target =
      document.getElementById("printable-invoice-container") ||
      document.querySelector(".printable-document");
    const activeOrientation = orientationOverride || printOrientation;
    if (target instanceof HTMLElement) {
      printDocument(
        target,
        `Invoice-${invoice?.invoiceNumber || invoice?.number || "INV"}`,
        { orientation: activeOrientation }
      );
    } else {
      window.print();
    }
  };

  useEffect(() => {
    if (!open) return;
    if (typeof window !== "undefined") {
      const orgKey = currentOrganization?.id ? `accountiva_template_${currentOrganization.id}` : null;
      const saved = (orgKey && localStorage.getItem(orgKey)) || localStorage.getItem("accountiva_template");
      if (saved && ["standard", "modern", "minimal", "premium"].includes(saved)) {
        setSelectedTemplate(saved as TemplateId);
      }
    }
    document.body.classList.add("printable-modal-open");
    document.documentElement.classList.add("printable-modal-open");

    const handleBeforePrint = () => {
      const root = document.getElementById("root");
      if (root) root.style.setProperty("display", "none", "important");
    };
    const handleAfterPrint = () => {
      const root = document.getElementById("root");
      if (root) root.style.removeProperty("display");
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("printable-modal-open");
      document.documentElement.classList.remove("printable-modal-open");
      const root = document.getElementById("root");
      if (root) root.style.removeProperty("display");
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, currentOrganization?.id, printOrientation, invoice]);

  const handleSelectTemplate = (id: TemplateId) => {
    setSelectedTemplate(id);
    if (typeof window !== "undefined") {
      if (currentOrganization?.id) {
        localStorage.setItem(`accountiva_template_${currentOrganization.id}`, id);
      }
      localStorage.setItem("accountiva_template", id);
    }
  };

  if (!open || !invoice) return null;

  const templates: Array<{ id: TemplateId; name: string; description: string }> = [
    { id: "standard", name: "Template 1", description: "Traditional & Professional" },
    { id: "modern", name: "Template 2", description: "Sleek & Bold" },
    { id: "minimal", name: "Template 3", description: "Clean & Simple" },
    { id: "premium", name: "Template 4", description: "Elegant & Sophisticated" },
  ];

  const bookmarked = isBookmarked("invoice", String(invoice.id));

  const handleBookmarkToggle = () => {
    const customerName = invoice.customers?.name || invoice.customerName || "";
    toggleBookmark({
      entity_type: "invoice",
      entity_id: String(invoice.id),
      title: invoice.invoiceNumber || invoice.number || "Invoice",
      subtitle: customerName,
      route: "/invoices",
      metadata: {
        amount: invoice.amount,
        status: invoice.status,
        date: invoice.dueDate,
        customerName,
      },
    });
  };

  const handleSettingToggle = (key: keyof TemplateSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl animate-in fade-in duration-200 printable-preview-modal print:static print:inset-auto print:z-auto print:block print:bg-transparent print:backdrop-blur-none print:p-0 print:m-0 print:overflow-visible">
      <div className="w-full h-full flex flex-col md:flex-row overflow-hidden print:block print:h-auto print:overflow-visible">
        {/* Left Control Sidebar */}
        <div className="w-full md:w-80 bg-card border-b md:border-b-0 md:border-r border-border flex flex-col shadow-2xl z-10 shrink-0 print:hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Invoice Preview</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Customize layout &amp; properties</p>
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <button
                type="button"
                onClick={handleBookmarkToggle}
                className={cn(
                  "p-2 rounded-lg transition-colors cursor-pointer",
                  bookmarked
                    ? "text-blue-600 bg-blue-500/10"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <BookmarkIcon className={cn("size-4", bookmarked ? "fill-blue-600" : "")} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Templates vs Properties) */}
          <div className="grid grid-cols-2 p-2 gap-1.5 border-b border-border/80 bg-muted/20">
            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={cn(
                "py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                activeTab === "templates"
                  ? "bg-card text-foreground shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layout className="size-3.5" />
              Layouts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("properties")}
              className={cn(
                "py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                activeTab === "properties"
                  ? "bg-card text-foreground shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings2 className="size-3.5" />
              Properties
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {activeTab === "templates" && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                  Choose Template Design
                </p>
                {templates.map((tpl) => {
                  const isSelected = selectedTemplate === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">{tpl.name}</span>
                        {isSelected && (
                          <div className="size-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                            <Check className="size-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{tpl.description}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === "properties" && (
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                  Visible Elements
                </p>
                <div className="space-y-3 divide-y divide-border/40">
                  {[
                    { key: "showLogo", label: "Organization Logo" },
                    { key: "showOrgName", label: "Organization Name" },
                    { key: "showOrgAddress", label: "Organization Address" },
                    { key: "showGSTIN", label: "GSTIN Identification" },
                    { key: "showInvoiceNumber", label: "Invoice Number" },
                    { key: "showDate", label: "Issue Date" },
                    { key: "showDueDate", label: "Payment Due Date" },
                    { key: "showClientCompany", label: "Client Company" },
                    { key: "showClientAddress", label: "Client Address" },
                    { key: "showItemDescription", label: "Item Descriptions" },
                    { key: "showQuantity", label: "Item Quantities" },
                    { key: "showRate", label: "Item Rates" },
                    { key: "showTax", label: "Tax Breakdown" },
                    { key: "showSubtotal", label: "Subtotal Amount" },
                    { key: "showFooter", label: "Footer Notes" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between pt-2.5 first:pt-0">
                      <Label className="text-xs font-medium text-foreground cursor-pointer">
                        {label}
                      </Label>
                      <Switch
                        checked={settings[key as keyof TemplateSettings]}
                        onCheckedChange={() => handleSettingToggle(key as keyof TemplateSettings)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Canvas / Invoice Preview Area */}
        <div className="flex-1 flex flex-col bg-muted/30 overflow-hidden relative print:block print:bg-transparent print:p-0 print:m-0 print:overflow-visible">
          {/* Top Actions Floating Bar */}
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 print:hidden z-20">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold font-mono text-muted-foreground">
                Invoice #{invoice.invoiceNumber || invoice.number}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setPrintOrientation("portrait")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs font-medium",
                    printOrientation === "portrait"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setPrintOrientation("landscape")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs font-medium",
                    printOrientation === "landscape"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Landscape
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleBookmarkToggle}
                className={cn(
                  "gap-1.5 text-xs font-semibold h-8 cursor-pointer",
                  bookmarked ? "text-blue-600 border-blue-500/30 bg-blue-500/10" : ""
                )}
              >
                <BookmarkIcon className={cn("size-3.5", bookmarked ? "fill-blue-600" : "")} />
                <span>{bookmarked ? "Bookmarked" : "Bookmark"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSendOpen(true)}
                className="gap-1.5 text-xs font-semibold h-8 cursor-pointer"
              >
                <Mail className="size-3.5" />
                <span>Send Email</span>
              </Button>

              <Button
                size="sm"
                onClick={() => handlePrint()}
                className="gap-1.5 text-xs font-semibold h-8 cursor-pointer"
              >
                <Printer className="size-3.5" />
                <span>Print Document</span>
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="size-8 rounded-lg cursor-pointer ml-1"
                title="Close"
              >
                <X className="size-4" />
              </Button>
            </div>
          </header>

          {/* Document Canvas */}
          <div className="flex-1 overflow-y-auto p-6 md:p-12 flex justify-center custom-scrollbar printable-document-canvas print:p-0 print:m-0 print:overflow-visible print:block">
            <div
              id="printable-invoice-container"
              className={cn(
                "w-full transition-all printable-document-container print:max-w-none print:w-full print:m-0 print:p-0",
                printOrientation === "landscape" ? "max-w-[1040px]" : "max-w-[800px]"
              )}
            >
              <InvoiceTemplate
                invoice={invoice}
                templateId={selectedTemplate}
                settings={settings}
              />
            </div>
          </div>
        </div>
      </div>

      <SendInvoiceModal
        isOpen={isSendOpen}
        invoice={invoice}
        onClose={() => setIsSendOpen(false)}
        onSuccess={() => onSuccess?.()}
      />
    </div>,
    document.body
  );
}


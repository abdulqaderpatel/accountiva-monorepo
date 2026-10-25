import React from "react";
import { FileSpreadsheet, ArrowRight, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface ImportSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccountiva: () => void;
  onSelectZoho: () => void;
}

export function ImportSourceModal({
  isOpen,
  onClose,
  onSelectAccountiva,
  onSelectZoho,
}: ImportSourceModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Invoices"
      description="Select your source platform to migrate or bulk-create invoices."
      maxWidthClass="max-w-md"
      bodyClass="p-6 space-y-3"
    >
      {/* Accountiva CSV */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onSelectAccountiva();
        }}
        className="w-full flex items-center justify-between p-4 bg-muted/20 border border-border/80 rounded-2xl hover:border-primary/60 hover:bg-muted/40 transition-all group text-left cursor-pointer"
      >
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Accountiva CSV</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Standard template with live validation, preview &amp; batch import
            </p>
          </div>
        </div>
        <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
      </button>

      {/* Zoho Books */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onSelectZoho();
        }}
        className="w-full flex items-center justify-between p-4 bg-muted/20 border border-border/80 rounded-2xl hover:border-primary/60 hover:bg-muted/40 transition-all group text-left cursor-pointer"
      >
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-lg shrink-0 group-hover:scale-105 transition-transform">
            Z
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Zoho Books</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Import invoices, customers &amp; line items from Zoho CSV export
            </p>
          </div>
        </div>
        <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
      </button>

      {/* QuickBooks (Coming Soon) */}
      <div className="w-full flex items-center justify-between p-4 bg-muted/10 border border-border/40 rounded-2xl opacity-60 cursor-not-allowed text-left">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 font-black text-lg shrink-0">
            Q
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">QuickBooks</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground uppercase tracking-wider">
                Coming soon
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Direct QuickBooks Online sync &amp; multi-format parser
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}


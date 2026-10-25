import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  HelpCircle,
  Info,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import api from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ZohoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ZohoImportModal({
  isOpen,
  onClose,
  onSuccess,
}: ZohoImportModalProps) {
  const queryClient = useQueryClient();
  const [isDragOver, setIsDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processImport = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Invalid file format", {
        description: "Please upload a valid CSV file exported from Zoho Books.",
      });
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/invoices/import/zoho", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const stats = response.data?.stats || {};
      toast.success("Import completed successfully!", {
        description: `Imported ${stats.invoices ?? 0} invoices, ${stats.customers ?? 0} customers, and ${stats.items ?? 0} items.`,
      });

      // Invalidate relevant queries to refresh list
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.invalidateQueries({ queryKey: ["items"] });

      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Zoho Import failed:", err);
      const backendError = err.response?.data;
      toast.error(backendError?.error || "Zoho Import Failed", {
        description:
          backendError?.description ||
          "An error occurred while parsing the Zoho Books CSV. Please ensure it is an itemized invoice export.",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processImport(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processImport(file);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidthClass="max-w-lg"
      bodyClass="p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-border/80 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-sm">
            Z
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Import from Zoho</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              Zoho Books CSV Importer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHowTo(!showHowTo)}
              aria-label="Import help"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors cursor-pointer"
            >
              <HelpCircle className="size-4" />
            </button>

            {showHowTo && (
              <div className="absolute right-0 top-full mt-2 w-72 p-4 bg-popover border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 text-left">
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2 text-primary">
                  How to export from Zoho:
                </p>
                <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal ml-3.5 font-medium leading-relaxed">
                  <li>Log in to your Zoho Books account.</li>
                  <li>Go to <strong>Sales &gt; Invoices</strong>.</li>
                  <li>Click <strong>More (...)</strong> in the top right.</li>
                  <li>Select <strong>Export Invoices</strong>.</li>
                  <li>Choose <strong>CSV format</strong> and download.</li>
                </ol>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => !importing && fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-10 transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer",
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border/80 bg-muted/10 hover:bg-muted/20 hover:border-primary/40"
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileChange}
          />

          <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <UploadCloud
              className={cn(
                "size-8 transition-transform duration-300",
                isDragOver ? "scale-110 text-primary" : "text-primary/80"
              )}
            />
          </div>

          <div>
            <p className="text-sm font-bold text-foreground">
              Click to upload or drag &amp; drop
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              Standard Zoho Books Invoice CSV supported
            </p>
          </div>

          {importing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10">
              <div className="flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <p className="text-[11px] font-bold uppercase tracking-widest animate-pulse text-foreground">
                  Processing Zoho Data...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Informative Tip */}
        <div className="p-3.5 bg-primary/[0.04] rounded-xl border border-primary/15 flex items-start gap-3">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Tip:</strong> Ensure you export "itemized" invoices from Zoho Books to import all your services and products correctly.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-9 px-4 rounded-xl font-bold uppercase tracking-wider text-[11px] cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="h-9 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 cursor-pointer"
          >
            Select File
          </Button>
        </div>
      </div>
    </Modal>
  );
}

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import api from "@/lib/api";
import { ENTITY_TEMPLATES, downloadSampleCsv } from "@/utils/csvTemplates";
import { parseAndValidateCsv, type CsvParseResult } from "@/utils/csvParser";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Layers,
} from "lucide-react";

export interface BulkUploadModalProps {
  open: boolean;
  entity: string;
  title?: string;
  description?: string;
  onClose: () => void;
  onSuccess?: (data?: any) => void;
}

export function BulkUploadModal({
  open,
  entity,
  title,
  description,
  onClose,
  onSuccess,
}: BulkUploadModalProps) {
  // Steps: 1 = File Upload, 2 = Preview & Validation, 3 = Completed Results
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update" | "error">("skip");
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    successCount: number;
    skippedCount: number;
    errorCount: number;
    message: string;
  } | null>(null);

  const templateConfig = useMemo(() => {
    return ENTITY_TEMPLATES[entity] || null;
  }, [entity]);

  const modalTitle = useMemo(() => {
    if (title) return title;
    const name = templateConfig?.displayName || entity;
    return `Import ${name}`;
  }, [title, templateConfig, entity]);

  const modalDescription = useMemo(() => {
    if (description) return description;
    return `Upload a CSV file to bulk import ${templateConfig?.displayName.toLowerCase() || entity} into your organization.`;
  }, [description, templateConfig, entity]);

  // Reset state whenever modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedFile(null);
      setParseResult(null);
      setDuplicateStrategy("skip");
      setIsImporting(false);
      setImportResults(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Invalid file format", {
        description: "Please upload a comma-separated CSV (.csv) file.",
      });
      return;
    }

    setSelectedFile(file);
    try {
      const text = await file.text();
      const result = parseAndValidateCsv(text, entity);

      if (result.totalRows === 0) {
        toast.error("Empty CSV file", {
          description: "The uploaded file does not contain any data rows.",
        });
        return;
      }

      setParseResult(result);
      setStep(2); // Move to preview
    } catch (err: any) {
      console.error("CSV parse error:", err);
      toast.error("Failed to parse CSV", {
        description: err?.message || "Could not parse the uploaded file.",
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDownloadTemplate = () => {
    downloadSampleCsv(entity);
  };

  // Preview columns to display in table (limit to first 4 relevant columns)
  const previewColumns = useMemo(() => {
    if (!parseResult?.rows.length) return [];
    const firstRow = parseResult.rows[0]?.mappedData || {};
    const keys = Object.keys(firstRow).filter((k) => k !== "items");
    return keys.slice(0, 4);
  }, [parseResult]);

  const formatHeaderKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  const executeImport = async () => {
    if (!parseResult || parseResult.payload.length === 0) {
      toast.error("No valid data to import");
      return;
    }

    setIsImporting(true);
    try {
      const response = await api.post(`/${entity}/bulk-import`, {
        items: parseResult.payload,
        duplicateStrategy,
      });

      const data = response.data || {};
      const imported = data.importedCount ?? data.count ?? parseResult.validRows;
      const skipped = data.skippedCount ?? 0;
      const updated = data.updatedCount ?? 0;
      const errors = data.errorCount ?? 0;

      const parts = [
        `Successfully imported ${imported} ${templateConfig?.displayName || entity}.`,
      ];
      if (skipped > 0) parts.push(`${skipped} duplicate${skipped > 1 ? "s" : ""} skipped.`);
      if (updated > 0) parts.push(`${updated} existing record${updated > 1 ? "s" : ""} updated.`);
      if (errors > 0) parts.push(`${errors} error${errors > 1 ? "s" : ""}.`);

      const resObj = {
        successCount: imported,
        skippedCount: skipped,
        errorCount: errors,
        message: parts.join(" "),
      };

      setImportResults(resObj);
      setStep(3);
      onSuccess?.(data);
      toast.success("Import completed", {
        description: resObj.message,
      });
    } catch (err: any) {
      console.error("Bulk import error:", err);
      const serverErr =
        err.response?.data?.error || err.message || "An error occurred during import.";
      toast.error("Import Failed", {
        description: serverErr,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={modalTitle}
      description={modalDescription}
      maxWidthClass={step === 2 ? "max-w-3xl" : "max-w-xl"}
      bodyClass="p-6 space-y-6"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {step === 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                disabled={isImporting}
                className="h-9 px-3 text-xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step !== 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isImporting}
                className="h-9 px-3.5 text-xs font-medium cursor-pointer"
              >
                Cancel
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                size="sm"
                onClick={executeImport}
                disabled={isImporting || !parseResult || parseResult.validRows === 0}
                className="h-9 px-4 text-xs font-medium shadow-xs cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Spinner size="sm" className="mr-1.5" />
                    Importing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                    {`Import ${parseResult?.validRows || 0} Records`}
                  </>
                )}
              </Button>
            )}

            {step === 3 && (
              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="h-9 px-5 text-xs font-medium shadow-xs cursor-pointer"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* STEP 1: Upload & Download Template */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer group ${
              isDragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border bg-muted/10 hover:bg-muted/20 hover:border-primary/40"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleFileChange}
            />
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                Standard CSV format (.csv) up to 10MB
              </p>
            </div>
          </div>

          {/* Sample Template Download & Instructions Card */}
          <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Need the correct CSV format?</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-8 px-3 text-xs font-medium border-border shadow-2xs hover:border-primary/50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                Download Sample CSV
              </Button>
            </div>

            {templateConfig?.instructions && templateConfig.instructions.length > 0 && (
              <div className="pt-2 border-t border-border/60">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Guidelines
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  {templateConfig.instructions.map((inst, i) => (
                    <li key={i}>{inst}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Preview & Validation Table */}
      {step === 2 && (
        <div className="space-y-5">
          {/* File stats banner */}
          <div className="flex items-center justify-between p-3.5 bg-muted/20 border border-border rounded-xl">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground truncate max-w-[280px]">
                  {selectedFile?.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {((selectedFile?.size || 0) / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            {/* Counter Badges */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-muted text-foreground font-semibold">
                {parseResult?.totalRows} Rows
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {parseResult?.validRows} Valid
              </span>
              {(parseResult?.invalidRows || 0) > 0 && (
                <span className="px-2.5 py-1 rounded-md bg-destructive/10 text-destructive font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {parseResult?.invalidRows} Errors
                </span>
              )}
            </div>
          </div>

          {/* Preview Table Container */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="max-h-60 overflow-y-auto overflow-x-auto text-xs">
              <table className="w-full border-collapse text-left">
                <thead className="bg-muted/40 sticky top-0 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-2 px-3 w-12 text-center">#</th>
                    <th className="py-2 px-3 w-24">Status</th>
                    {previewColumns.map((col) => (
                      <th key={col} className="py-2 px-3 whitespace-nowrap">
                        {formatHeaderKey(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parseResult?.rows.slice(0, 10).map((row) => (
                    <tr
                      key={row.rowIndex}
                      className={row.isValid ? "hover:bg-muted/10" : "bg-destructive/5 hover:bg-destructive/10"}
                    >
                      <td className="py-2 px-3 text-center text-muted-foreground font-mono">
                        {row.rowIndex}
                      </td>
                      <td className="py-2 px-3">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Valid
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive cursor-help"
                            title={row.errors.join(", ")}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            {row.errors[0] || "Error"}
                          </span>
                        )}
                      </td>
                      {previewColumns.map((col) => (
                        <td
                          key={col}
                          className="py-2 px-3 max-w-[180px] truncate text-foreground font-medium"
                        >
                          {row.mappedData[col] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(parseResult?.rows.length || 0) > 10 && (
              <div className="p-2 bg-muted/20 text-center border-t border-border">
                <span className="text-[11px] text-muted-foreground">
                  Showing first 10 of {parseResult?.rows.length} rows
                </span>
              </div>
            )}
          </div>

          {/* Duplicate Handling Strategy Selector */}
          <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              If duplicate records are found:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  duplicateStrategy === "skip"
                    ? "border-primary bg-primary/5 text-foreground font-medium"
                    : "border-border bg-background hover:bg-muted/20 text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="duplicateStrategy"
                  value="skip"
                  checked={duplicateStrategy === "skip"}
                  onChange={() => setDuplicateStrategy("skip")}
                  className="text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Skip duplicate</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  duplicateStrategy === "update"
                    ? "border-primary bg-primary/5 text-foreground font-medium"
                    : "border-border bg-background hover:bg-muted/20 text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="duplicateStrategy"
                  value="update"
                  checked={duplicateStrategy === "update"}
                  onChange={() => setDuplicateStrategy("update")}
                  className="text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Overwrite existing</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  duplicateStrategy === "error"
                    ? "border-primary bg-primary/5 text-foreground font-medium"
                    : "border-border bg-background hover:bg-muted/20 text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="duplicateStrategy"
                  value="error"
                  checked={duplicateStrategy === "error"}
                  onChange={() => setDuplicateStrategy("error")}
                  className="text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Reject import</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Results Summary Screen */}
      {step === 3 && (
        <div className="space-y-6 text-center py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Import Completed Successfully</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {importResults?.message}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-muted/20 border border-border rounded-xl">
            <div className="p-2 bg-background border border-border/60 rounded-lg">
              <p className="text-[11px] text-muted-foreground font-medium">Created</p>
              <p className="text-lg font-bold text-emerald-600">{importResults?.successCount}</p>
            </div>
            <div className="p-2 bg-background border border-border/60 rounded-lg">
              <p className="text-[11px] text-muted-foreground font-medium">Skipped</p>
              <p className="text-lg font-bold text-amber-600">{importResults?.skippedCount}</p>
            </div>
            <div className="p-2 bg-background border border-border/60 rounded-lg">
              <p className="text-[11px] text-muted-foreground font-medium">Errors</p>
              <p className="text-lg font-bold text-destructive">{importResults?.errorCount}</p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default BulkUploadModal;


import React, { useState, useRef, useEffect } from "react";
import {
  Building2,
  CheckCircle2,
  ImageIcon,
  Loader2,
  ShieldCheck,
  Shield,
  Trash2,
  Undo2,
  Upload,
  FileText,
  Camera,
  Check,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

type LogoVariant = "small" | "large";
type LogoRules = {
  maxBytes: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  label: string;
};

const rules: Record<LogoVariant, LogoRules> = {
  small: {
    maxBytes: 5 * 1024 * 1024,
    minWidth: 16,
    minHeight: 16,
    maxWidth: 4096,
    maxHeight: 4096,
    label: "Compact mark",
  },
  large: {
    maxBytes: 5 * 1024 * 1024,
    minWidth: 16,
    minHeight: 16,
    maxWidth: 4096,
    maxHeight: 4096,
    label: "Full logo",
  },
};

export function OrganizationBrandingSettings() {
  const { currentOrganization, updateOrganizationBranding } = useAuth();

  const smallInputRef = useRef<HTMLInputElement | null>(null);
  const largeInputRef = useRef<HTMLInputElement | null>(null);

  const [smallFile, setSmallFile] = useState<File | null>(null);
  const [largeFile, setLargeFile] = useState<File | null>(null);
  const [smallPreview, setSmallPreview] = useState<string | null>(null);
  const [largePreview, setLargePreview] = useState<string | null>(null);
  const [removeSmall, setRemoveSmall] = useState(false);
  const [removeLarge, setRemoveLarge] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isDraggingSmall, setIsDraggingSmall] = useState(false);
  const [isDraggingLarge, setIsDraggingLarge] = useState(false);

  const canEdit = ["owner", "admin"].includes(currentOrganization?.role || "");
  const savedSmallLogo = currentOrganization?.small_logo_url || currentOrganization?.logo_url || null;
  const savedLargeLogo = currentOrganization?.large_logo_url || null;

  const displayedSmallLogo = smallPreview || (removeSmall ? null : savedSmallLogo);
  const displayedLargeLogo = largePreview || (removeLarge ? null : savedLargeLogo);

  const hasChanges = Boolean(smallFile || largeFile || removeSmall || removeLarge);

  const resetChanges = () => {
    if (smallPreview?.startsWith("blob:")) URL.revokeObjectURL(smallPreview);
    if (largePreview?.startsWith("blob:")) URL.revokeObjectURL(largePreview);
    setSmallPreview(null);
    setLargePreview(null);
    setSmallFile(null);
    setLargeFile(null);
    setRemoveSmall(false);
    setRemoveLarge(false);
    setIsDraggingSmall(false);
    setIsDraggingLarge(false);
    if (smallInputRef.current) smallInputRef.current.value = "";
    if (largeInputRef.current) largeInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (smallPreview?.startsWith("blob:")) URL.revokeObjectURL(smallPreview);
      if (largePreview?.startsWith("blob:")) URL.revokeObjectURL(largePreview);
    };
  }, [smallPreview, largePreview]);

  useEffect(() => {
    resetChanges();
  }, [currentOrganization?.id]);

  const readDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("The selected file is not a valid image"));
      };
      img.src = url;
    });
  };

  const validateFile = async (file: File, variant: LogoVariant) => {
    const specification = rules[variant];
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      throw new Error(`${specification.label} must be a PNG, JPEG, or WebP image`);
    }
    if (file.size > specification.maxBytes) {
      throw new Error(
        `${specification.label} must be ${specification.maxBytes / 1024 / 1024} MB or smaller`
      );
    }
    const dimensions = await readDimensions(file);
    if (dimensions.width < specification.minWidth || dimensions.height < specification.minHeight) {
      throw new Error(
        `${specification.label} must be at least ${specification.minWidth}×${specification.minHeight} pixels`
      );
    }
    if (dimensions.width > specification.maxWidth || dimensions.height > specification.maxHeight) {
      throw new Error(
        `${specification.label} must not exceed ${specification.maxWidth}×${specification.maxHeight} pixels`
      );
    }
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>, variant: LogoVariant) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await validateFile(file, variant);
      const previewUrl = URL.createObjectURL(file);
      if (variant === "small") {
        if (smallPreview?.startsWith("blob:")) URL.revokeObjectURL(smallPreview);
        setSmallFile(file);
        setSmallPreview(previewUrl);
        setRemoveSmall(false);
      } else {
        if (largePreview?.startsWith("blob:")) URL.revokeObjectURL(largePreview);
        setLargeFile(file);
        setLargePreview(previewUrl);
        setRemoveLarge(false);
      }
      toast.success(`${rules[variant].label} staged for upload`);
    } catch (err: any) {
      e.target.value = "";
      toast.error(err.message || "Invalid logo file");
    }
  };

  const handleDrop = async (e: React.DragEvent, variant: LogoVariant) => {
    e.preventDefault();
    if (variant === "small") setIsDraggingSmall(false);
    else setIsDraggingLarge(false);

    if (!canEdit) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    try {
      await validateFile(file, variant);
      const previewUrl = URL.createObjectURL(file);
      if (variant === "small") {
        if (smallPreview?.startsWith("blob:")) URL.revokeObjectURL(smallPreview);
        setSmallFile(file);
        setSmallPreview(previewUrl);
        setRemoveSmall(false);
      } else {
        if (largePreview?.startsWith("blob:")) URL.revokeObjectURL(largePreview);
        setLargeFile(file);
        setLargePreview(previewUrl);
        setRemoveLarge(false);
      }
      toast.success(`${rules[variant].label} staged for upload`);
    } catch (err: any) {
      toast.error(err.message || "Invalid logo file");
    }
  };

  const markForRemoval = (variant: LogoVariant) => {
    if (variant === "small") {
      if (smallPreview?.startsWith("blob:")) URL.revokeObjectURL(smallPreview);
      setSmallPreview(null);
      setSmallFile(null);
      if (smallInputRef.current) smallInputRef.current.value = "";
      setRemoveSmall(Boolean(savedSmallLogo));
    } else {
      if (largePreview?.startsWith("blob:")) URL.revokeObjectURL(largePreview);
      setLargePreview(null);
      setLargeFile(null);
      if (largeInputRef.current) largeInputRef.current.value = "";
      setRemoveLarge(Boolean(savedLargeLogo));
    }
  };

  const undoRemoval = (variant: LogoVariant) => {
    if (variant === "small") setRemoveSmall(false);
    else setRemoveLarge(false);
  };

  const saveBranding = async () => {
    if (!currentOrganization || !hasChanges || !canEdit) return;
    const data = new FormData();
    if (smallFile) data.append("smallLogo", smallFile);
    if (largeFile) data.append("largeLogo", largeFile);
    if (removeSmall) data.append("removeSmallLogo", "true");
    if (removeLarge) data.append("removeLargeLogo", "true");

    setIsSaving(true);
    try {
      await updateOrganizationBranding(currentOrganization.id, data);
      resetChanges();
      toast.success("Organization branding updated successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update organization branding");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <Card className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
        {/* Header */}
        <CardHeader className="p-5 md:p-6 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-sm md:text-base font-bold text-foreground">
              Workspace Branding
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Manage your company logos for navigation, invoices, and exported financial documents.
            </CardDescription>
          </div>
          <div className="shrink-0">
            {canEdit ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary/12 text-primary border border-primary/25 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                Owners & Admins
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-muted/40 text-muted-foreground border border-border/60">
                <Shield className="w-3.5 h-3.5" />
                View Only
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 md:p-6 space-y-6">
          {/* Two-column Logo Panels */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Panel 1: Compact Mark (Square) */}
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 flex flex-col justify-between space-y-4 shadow-2xs">
              <div>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Compact Mark</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Used in the sidebar, organization switcher, and small UI spaces.
                    </p>
                  </div>
                  <span className="rounded-md bg-primary/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/20 shrink-0 font-mono">
                    1:1 Recommended
                  </span>
                </div>

                {/* Dropzone / Preview */}
                <div
                  className={`mt-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center relative min-h-[170px] ${
                    isDraggingSmall ? "border-primary bg-primary/10 scale-[1.01]" : ""
                  } ${removeSmall ? "border-destructive/40 bg-destructive/5" : ""} ${
                    !isDraggingSmall && !removeSmall
                      ? "border-border/70 hover:border-primary/50 hover:bg-background/80 bg-background/50 cursor-pointer"
                      : ""
                  }`}
                  onClick={() => canEdit && !removeSmall && smallInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (canEdit) setIsDraggingSmall(true);
                  }}
                  onDragLeave={() => setIsDraggingSmall(false)}
                  onDrop={(e) => handleDrop(e, "small")}
                >
                  {removeSmall ? (
                    <div className="flex flex-col items-center gap-1.5 py-3">
                      <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-destructive">Marked for Removal</p>
                      <p className="text-[10px] text-muted-foreground">
                        Will be permanently deleted upon saving changes
                      </p>
                    </div>
                  ) : displayedSmallLogo ? (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-22 h-22 rounded-2xl border border-border/70 bg-background flex items-center justify-center overflow-hidden p-2.5 shadow-xs relative group">
                        <img
                          src={displayedSmallLogo}
                          alt={`${currentOrganization?.name || "Organization"} compact logo`}
                          className="w-full h-full object-contain"
                        />
                        {canEdit && (
                          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white rounded-2xl">
                            <Camera className="w-4 h-4 mb-0.5" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">
                              Replace
                            </span>
                          </div>
                        )}
                      </div>
                      {smallFile && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
                          <Sparkles className="w-2.5 h-2.5" />
                          Pending Save
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Click to upload or drag & drop
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                          PNG, JPEG, or WebP • Up to 5 MB • Square recommended
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              {canEdit && (
                <div className="pt-2 border-t border-border/40">
                  <input
                    ref={smallInputRef}
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handleFileSelection(e, "small")}
                  />

                  {removeSmall ? (
                    <div className="w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-full rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 text-foreground hover:bg-muted/50 border-border/70 cursor-pointer"
                        onClick={() => undoRemoval("small")}
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        Undo Removal
                      </Button>
                    </div>
                  ) : displayedSmallLogo ? (
                    <div className="flex items-center gap-2 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 hover:bg-primary/5 hover:border-primary/30 text-foreground border-border/70 transition-all cursor-pointer"
                        onClick={() => smallInputRef.current?.click()}
                      >
                        <Upload className="w-3.5 h-3.5 text-primary" />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3.5 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                        onClick={() => markForRemoval("small")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-full rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 hover:bg-primary/5 hover:border-primary/30 text-foreground border-border/70 transition-all cursor-pointer"
                        onClick={() => smallInputRef.current?.click()}
                      >
                        <Upload className="w-3.5 h-3.5 text-primary" />
                        Upload Compact Mark
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel 2: Full Document & Invoice Logo */}
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 flex flex-col justify-between space-y-4 shadow-2xs">
              <div>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Document & Invoice Logo</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Printed on official invoices, estimates, credit notes, and reports.
                    </p>
                  </div>
                  <span className="rounded-md bg-primary/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/20 shrink-0 font-mono">
                    Wide Recommended
                  </span>
                </div>

                {/* Dropzone / Preview */}
                <div
                  className={`mt-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center relative min-h-[170px] ${
                    isDraggingLarge ? "border-primary bg-primary/10 scale-[1.01]" : ""
                  } ${removeLarge ? "border-destructive/40 bg-destructive/5" : ""} ${
                    !isDraggingLarge && !removeLarge
                      ? "border-border/70 hover:border-primary/50 hover:bg-background/80 bg-background/50 cursor-pointer"
                      : ""
                  }`}
                  onClick={() => canEdit && !removeLarge && largeInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (canEdit) setIsDraggingLarge(true);
                  }}
                  onDragLeave={() => setIsDraggingLarge(false)}
                  onDrop={(e) => handleDrop(e, "large")}
                >
                  {removeLarge ? (
                    <div className="flex flex-col items-center gap-1.5 py-3">
                      <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-destructive">Marked for Removal</p>
                      <p className="text-[10px] text-muted-foreground">
                        Will be permanently deleted upon saving changes
                      </p>
                    </div>
                  ) : displayedLargeLogo ? (
                    <div className="flex flex-col items-center gap-2.5 w-full">
                      <div className="w-full max-w-sm h-22 rounded-xl border border-border/70 bg-background flex items-center justify-center overflow-hidden p-3 shadow-xs relative group">
                        <img
                          src={displayedLargeLogo}
                          alt={`${currentOrganization?.name || "Organization"} full logo`}
                          className="max-w-full max-h-full object-contain"
                        />
                        {canEdit && (
                          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white rounded-xl">
                            <Camera className="w-4 h-4 mb-0.5" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">
                              Replace
                            </span>
                          </div>
                        )}
                      </div>
                      {largeFile && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
                          <Sparkles className="w-2.5 h-2.5" />
                          Pending Save
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Click to upload or drag & drop
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                          Horizontal format • Transparent PNG recommended • Up to 5 MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              {canEdit && (
                <div className="pt-2 border-t border-border/40">
                  <input
                    ref={largeInputRef}
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handleFileSelection(e, "large")}
                  />

                  {removeLarge ? (
                    <div className="w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-full rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 text-foreground hover:bg-muted/50 border-border/70 cursor-pointer"
                        onClick={() => undoRemoval("large")}
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        Undo Removal
                      </Button>
                    </div>
                  ) : displayedLargeLogo ? (
                    <div className="flex items-center gap-2 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 hover:bg-primary/5 hover:border-primary/30 text-foreground border-border/70 transition-all cursor-pointer"
                        onClick={() => largeInputRef.current?.click()}
                      >
                        <Upload className="w-3.5 h-3.5 text-primary" />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3.5 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                        onClick={() => markForRemoval("large")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-full rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 hover:bg-primary/5 hover:border-primary/30 text-foreground border-border/70 transition-all cursor-pointer"
                        onClick={() => largeInputRef.current?.click()}
                      >
                        <Upload className="w-3.5 h-3.5 text-primary" />
                        Upload Document Logo
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Live Document Header Mockup Preview Strip */}
          <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground">Live Invoice Header Preview</h4>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                Simulated export output
              </span>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4 md:p-5 flex items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-10 max-w-[140px] md:max-w-[180px] flex items-center justify-start shrink-0 overflow-hidden">
                  {displayedLargeLogo ? (
                    <img
                      src={displayedLargeLogo}
                      alt="Invoice Header Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : displayedSmallLogo ? (
                    <div className="flex items-center gap-2.5">
                      <img
                        src={displayedSmallLogo}
                        alt="Invoice Header Logo"
                        className="w-9 h-9 rounded-lg object-contain"
                      />
                      <span className="text-sm font-bold tracking-tight text-foreground truncate">
                        {currentOrganization?.name || "My Company"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground/60">
                      <Building2 className="w-7 h-7 text-primary/40" />
                      <span className="text-xs font-bold text-foreground truncate">
                        {currentOrganization?.name || "My Company"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="hidden sm:block border-l border-border/60 pl-3 space-y-0.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {currentOrganization?.is_gst_registered
                      ? `GSTIN: ${currentOrganization?.gstin || "22AAAAA0000A1Z5"}`
                      : "Unregistered Business"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 truncate max-w-[200px]">
                    {currentOrganization?.address || "Registered Office Address"}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                  Tax Invoice
                </span>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">#INV-2025-001</p>
              </div>
            </div>
          </div>

          {!canEdit && (
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 flex items-center gap-2.5 text-xs text-muted-foreground">
              <Info className="w-4 h-4 text-primary shrink-0" />
              You are viewing workspace branding as a member. Only owners and administrators can upload or replace logos.
            </div>
          )}
        </CardContent>

        {canEdit && (
          <CardFooter className="p-4 md:px-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 text-center sm:text-left">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary/80 shrink-0" />
              <span>Uploaded branding assets are optimized and delivered globally via CDN.</span>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              {hasChanges && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3.5 rounded-xl font-bold uppercase tracking-wider text-[11px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                  disabled={isSaving}
                  onClick={resetChanges}
                >
                  <RotateCcw className="w-3 h-3" />
                  Discard
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                className="h-9 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 transition-all active:scale-[0.98] cursor-pointer"
                disabled={!hasChanges || isSaving}
                onClick={saveBranding}
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{isSaving ? "Saving..." : "Save Branding"}</span>
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}


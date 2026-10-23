import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Users,
  Palette,
  Trash2,
  ShieldCheck,
  Crown,
  User,
  SlidersHorizontal,
  MapPin,
  Receipt,
  Camera,
  RotateCcw,
  Check,
  Loader2,
  Info,
  Calendar,
  CheckCircle2,
  BookmarkCheck,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { OrganizationBrandingSettings } from "@/components/settings/OrganizationBrandingSettings";
import { MemberManagement } from "@/components/settings/MemberManagement";
import { CustomFieldsManagement } from "@/components/settings/CustomFieldsManagement";
import { AuditLogs } from "@/components/settings/AuditLogs";
import { RecentlyDeleted } from "@/components/settings/RecentlyDeleted";

type SettingsTab =
  | "info"
  | "branding"
  | "members"
  | "custom-fields"
  | "audit-logs"
  | "recently-deleted";

export function OrganizationSettings() {
  const { currentOrganization, updateOrganization, fetchOrganizations, setCurrentOrganization, organizations } = useAuth();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getInitialTab = (): SettingsTab => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p === "branding") return "branding";
      if (p === "members" || p === "team") return "members";
      if (p === "custom-fields" || p === "custom_fields") return "custom-fields";
      if (p === "audit-logs" || p === "audit") return "audit-logs";
      if (p === "recently-deleted" || p === "trash") return "recently-deleted";
      if (p === "info" || p === "general") return "info";
    }
    return "info";
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab);

  const canEdit = ["owner", "admin"].includes(currentOrganization?.role || "");
  const isOwner = currentOrganization?.role === "owner";

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    gstin: "",
    is_gst_registered: false,
    address: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isFetchingGst, setIsFetchingGst] = useState(false);

  // Default Org State
  const [defaultOrgId, setDefaultOrgId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accountiva_default_org_id");
    }
    return null;
  });

  const isDefaultOrg = defaultOrgId === currentOrganization?.id;

  // Delete Org State
  const [isDeleteOrgModalOpen, setIsDeleteOrgModalOpen] = useState(false);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const syncFormData = () => {
    if (currentOrganization) {
      setFormData({
        name: currentOrganization.name || "",
        gstin: currentOrganization.gstin || "",
        is_gst_registered: Boolean(currentOrganization.is_gst_registered),
        address: currentOrganization.address || "",
      });
      setLogoFile(null);
      if (logoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoPreview(null);
    }
  };

  useEffect(() => {
    syncFormData();
  }, [currentOrganization?.id]);

  const hasFormChanges = useMemo(() => {
    if (!currentOrganization) return false;
    if (logoFile) return true;
    return (
      formData.name !== (currentOrganization.name || "") ||
      formData.gstin !== (currentOrganization.gstin || "") ||
      formData.is_gst_registered !== Boolean(currentOrganization.is_gst_registered) ||
      formData.address !== (currentOrganization.address || "")
    );
  }, [formData, logoFile, currentOrganization]);

  const handleSelectTab = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabId);
    window.history.replaceState({}, "", url.toString());
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      if (logoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleFetchGst = async () => {
    if (!formData.gstin.trim()) return;
    try {
      setIsFetchingGst(true);
      const res = await api.get(`/customers/gstin/${formData.gstin.trim()}`);
      if (res.data) {
        setFormData((prev) => ({
          ...prev,
          name: res.data.name || prev.name,
          address: res.data.address || prev.address,
        }));
        toast.success("Business details retrieved from GSTIN");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Invalid GSTIN or lookup failed");
    } finally {
      setIsFetchingGst(false);
    }
  };

  const handleDiscardChanges = () => {
    syncFormData();
    toast.info("Changes discarded");
  };

  const handleSaveProfile = async () => {
    if (!canEdit || !currentOrganization) return;
    if (!formData.name.trim()) {
      toast.error("Organization name cannot be empty");
      return;
    }

    setIsSavingProfile(true);
    try {
      const data = new FormData();
      data.append("name", formData.name.trim());
      data.append("gstin", formData.gstin.trim());
      data.append("is_gst_registered", String(formData.is_gst_registered));
      data.append("address", formData.address.trim());

      if (logoFile) {
        data.append("logo", logoFile);
      }

      await updateOrganization(currentOrganization.id, data);
      toast.success("Workspace profile updated successfully");
      setLogoFile(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update workspace profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const toggleDefaultOrg = () => {
    if (!currentOrganization) return;
    if (isDefaultOrg) {
      localStorage.removeItem("accountiva_default_org_id");
      setDefaultOrgId(null);
      toast.success("Default workspace preference removed");
    } else {
      localStorage.setItem("accountiva_default_org_id", currentOrganization.id);
      setDefaultOrgId(currentOrganization.id);
      toast.success(`${currentOrganization.name} is now your default workspace`);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!currentOrganization) return;
    if (deleteConfirmName.trim() !== currentOrganization.name.trim()) {
      toast.error("Organization name does not match");
      return;
    }

    setIsDeletingOrg(true);
    try {
      await api.delete(`/organizations/${currentOrganization.id}`);
      if (localStorage.getItem("accountiva_default_org_id") === currentOrganization.id) {
        localStorage.removeItem("accountiva_default_org_id");
      }
      toast.success("Organization deleted successfully");
      setIsDeleteOrgModalOpen(false);

      await fetchOrganizations();
      const remaining = organizations.filter((o) => o.id !== currentOrganization.id);
      if (remaining.length > 0) {
        setCurrentOrganization(remaining[0]);
        navigate({ to: "/dashboard" });
      } else {
        setCurrentOrganization(null);
        navigate({ to: "/onboarding" });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete organization");
    } finally {
      setIsDeletingOrg(false);
    }
  };

  const settingsSections = useMemo(() => {
    const sections: { id: SettingsTab; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
      { id: "info", icon: Building2, label: "General" },
      { id: "branding", icon: Palette, label: "Branding" },
      { id: "members", icon: Users, label: "Team & Invites" },
    ];
    if (canEdit) {
      sections.push({ id: "custom-fields", icon: SlidersHorizontal, label: "Custom Fields" });
      sections.push({ id: "audit-logs", icon: ShieldCheck, label: "Audit Logs" });
    }
    sections.push({ id: "recently-deleted", icon: Trash2, label: "Recently Deleted" });
    return sections;
  }, [canEdit]);

  const activeAvatarSrc =
    logoPreview ||
    currentOrganization?.small_logo_url ||
    currentOrganization?.logo_url;

  return (
    <div className="max-w-7xl mx-auto w-full px-6 md:px-8 flex flex-col h-full overflow-hidden min-h-0 select-none">
      {/* Header */}
      <div className="pt-5 pb-4 shrink-0 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Organization Settings
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Manage your workspace profile, tax configuration, branding assets, and team collaboration.
            </p>
          </div>
        </div>
      </div>

      {/* Body with sidebar navigation & content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden md:gap-8 pt-4 min-h-0">
        {/* Tab Navigation */}
        <nav className="shrink-0 flex gap-1 pb-3 md:pb-0 overflow-x-auto md:w-48 lg:w-52 md:flex-col md:space-y-1 scrollbar-hide border-b md:border-b-0 border-border/60 px-1 md:px-0">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeTab === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleSelectTab(section.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-primary/12 text-primary border border-primary/25 shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  }`}
                />
                <span className="whitespace-nowrap">{section.label}</span>
                {isActive && (
                  <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0 ml-auto" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pb-10 pr-2 -mr-2 min-h-0 custom-scrollbar">
          <div className="space-y-6 max-w-4xl">
            {/* General Tab (Workspace Profile) */}
            {activeTab === "info" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                {/* Card 1: Workspace Profile */}
                <Card className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                  <CardHeader className="p-5 md:p-6 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-sm md:text-base font-bold text-foreground">
                        Workspace Profile
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Update your organization display name, tax registration status, and official business address.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectTab("branding")}
                      className="shrink-0 h-8 px-3 rounded-xl border-border/70 hover:bg-primary/5 hover:border-primary/30 text-muted-foreground hover:text-primary font-bold uppercase tracking-wider text-[10px] gap-1.5 transition-all cursor-pointer"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Branding Tab</span>
                      <ArrowUpRight className="w-3 h-3 opacity-60" />
                    </Button>
                  </CardHeader>

                  <CardContent className="p-5 md:p-6 space-y-6">
                    {/* Profile Identity Banner */}
                    <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 md:p-5 flex flex-col sm:flex-row gap-4 md:gap-5 items-center sm:items-start shadow-2xs">
                      {/* Avatar with Hover Trigger */}
                      <div className="relative group shrink-0">
                        <div
                          className={`w-18 h-18 md:w-20 md:h-20 rounded-2xl border border-border/70 overflow-hidden bg-background flex items-center justify-center shadow-2xs relative ${
                            canEdit ? "cursor-pointer" : ""
                          }`}
                          onClick={() => canEdit && fileInputRef.current?.click()}
                        >
                          {activeAvatarSrc ? (
                            <img
                              src={activeAvatarSrc}
                              alt={currentOrganization?.name || "Organization Logo"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-8 h-8 text-primary/60" />
                          )}

                          {canEdit && (
                            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white">
                              <Camera className="w-4 h-4 mb-0.5" />
                              <span className="text-[9px] font-bold uppercase tracking-wider">Change</span>
                            </div>
                          )}
                        </div>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-lg shadow-sm transition-transform hover:scale-110 active:scale-95 z-10 cursor-pointer"
                            title="Upload workspace logo"
                          >
                            <Camera className="w-3 h-3" />
                          </button>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoChange}
                        />
                      </div>

                      {/* Identity Details & Badges */}
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground leading-tight truncate">
                          {currentOrganization?.name || "Workspace"}
                        </h2>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2.5">
                          {/* Role Badge */}
                          <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-2xs ${
                              currentOrganization?.role === "owner"
                                ? "bg-amber-500 text-white dark:bg-amber-600 dark:text-white border-transparent"
                                : currentOrganization?.role === "admin"
                                ? "bg-blue-600 text-white dark:bg-blue-500 dark:text-white border-transparent"
                                : "bg-secondary text-secondary-foreground border-border/60"
                            }`}
                          >
                            {currentOrganization?.role === "owner" ? (
                              <Crown className="w-3 h-3" />
                            ) : currentOrganization?.role === "admin" ? (
                              <ShieldCheck className="w-3 h-3" />
                            ) : (
                              <User className="w-3 h-3" />
                            )}
                            <span>{currentOrganization?.role || "Member"}</span>
                          </div>

                          {/* Created Date Badge */}
                          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1 text-muted-foreground shadow-2xs">
                            <Calendar className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {currentOrganization?.created_at
                                ? new Date(currentOrganization.created_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "Recently"}
                            </span>
                          </div>

                          {/* GST Status Badge */}
                          <div
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-2xs ${
                              formData.is_gst_registered
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {formData.is_gst_registered ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Info className="w-3 h-3" />
                            )}
                            <span>{formData.is_gst_registered ? "GST Registered" : "Unregistered"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Form Grid */}
                    <div className="space-y-5">
                      {/* Workspace Name Field */}
                      <div className="space-y-1.5">
                        <Label htmlFor="org-name" className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span>Workspace Display Name <span className="text-destructive">*</span></span>
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                          <Input
                            id="org-name"
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            disabled={!canEdit}
                            placeholder="e.g. Acme Corporation"
                            className="pl-10 h-10 rounded-xl border-border/70 bg-background focus:border-primary focus:ring-primary/20 transition-all text-xs font-semibold"
                          />
                        </div>
                      </div>

                      {/* GST Registration Switch Container */}
                      <div className="rounded-xl border border-border/60 bg-muted/10 p-4 flex items-center justify-between gap-4 transition-colors">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-bold text-foreground cursor-pointer" htmlFor="gst-switch">
                            Registered under GST
                          </Label>
                          <p className="text-[11px] text-muted-foreground leading-normal">
                            Enable if this workspace operates as a registered tax entity under Goods and Services Tax.
                          </p>
                        </div>
                        <Switch
                          id="gst-switch"
                          checked={formData.is_gst_registered}
                          onCheckedChange={(val) => setFormData((prev) => ({ ...prev, is_gst_registered: val }))}
                          disabled={!canEdit}
                        />
                      </div>

                      {/* GSTIN Input with Auto-Fetch */}
                      {formData.is_gst_registered && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-200">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="org-gstin" className="text-xs font-semibold text-foreground">
                              GSTIN (Tax Identification Number) <span className="text-destructive">*</span>
                            </Label>
                            <span className="text-[10px] text-muted-foreground font-mono">15 Characters</span>
                          </div>

                          <div className="relative group">
                            <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                            <Input
                              id="org-gstin"
                              value={formData.gstin}
                              onChange={(e) => setFormData((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                              disabled={!canEdit}
                              maxLength={15}
                              placeholder="22AAAAA0000A1Z5"
                              className="pl-10 pr-28 h-10 rounded-xl border-border/70 bg-background focus:border-primary focus:ring-primary/20 transition-all text-xs font-bold uppercase tracking-wider"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleFetchGst}
                              disabled={isFetchingGst || !formData.gstin.trim() || !canEdit}
                              className="absolute right-1 top-1 bottom-1 h-8 px-2.5 rounded-lg font-bold uppercase tracking-wider text-[10px] text-primary hover:bg-primary/10 active:scale-95 transition-all disabled:opacity-30 cursor-pointer"
                            >
                              {isFetchingGst ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="mr-1 h-3 w-3 text-primary" />
                              )}
                              {isFetchingGst ? "Fetching..." : "Fetch Details"}
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-normal">
                            Click <strong className="text-foreground">Fetch Details</strong> to automatically retrieve and populate the legal entity name and registered address.
                          </p>
                        </div>
                      )}

                      {/* Business Address Field */}
                      <div className="space-y-1.5">
                        <Label htmlFor="org-address" className="text-xs font-semibold text-foreground">
                          Registered Business Address
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                          <Textarea
                            id="org-address"
                            value={formData.address}
                            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                            disabled={!canEdit}
                            placeholder="Building number, Street, City, State, and Postal Code"
                            rows={3}
                            className="pl-10 min-h-[90px] rounded-xl border-border/70 bg-background focus:border-primary focus:ring-primary/20 transition-all text-xs font-medium leading-relaxed"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          This address appears on generated tax invoices, estimates, and customer billing statements.
                        </p>
                      </div>
                    </div>
                  </CardContent>

                  {/* Card Footer with Inline Actions */}
                  <CardFooter className="p-4 md:px-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 text-center sm:text-left">
                      <Info className="w-3.5 h-3.5 text-primary/80 shrink-0" />
                      {canEdit ? (
                        <span>Changes will apply across all new invoices and workspace documents.</span>
                      ) : (
                        <span>You are viewing this workspace as a member. Contact an administrator to update settings.</span>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        {hasFormChanges && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleDiscardChanges}
                            disabled={isSavingProfile}
                            className="h-9 px-3.5 rounded-xl font-bold uppercase tracking-wider text-[11px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Discard
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveProfile}
                          disabled={!hasFormChanges || isSavingProfile}
                          className="h-9 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 transition-all active:scale-[0.98] cursor-pointer"
                        >
                          {isSavingProfile ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{isSavingProfile ? "Saving..." : "Save Changes"}</span>
                        </Button>
                      </div>
                    )}
                  </CardFooter>
                </Card>

                {/* Card 2: Default Workspace */}
                <Card className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                  <CardHeader className="p-5 md:p-6 border-b border-border/50 bg-muted/10">
                    <CardTitle className="text-sm md:text-base font-bold text-foreground">
                      Default Workspace
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Specify which workspace automatically loads when you sign in or launch Accountiva.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 md:p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-muted/10 border border-border/60">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                          <BookmarkCheck className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="font-bold text-xs text-foreground">Launch on Startup</h4>
                          <p className="text-[11px] text-muted-foreground leading-normal">
                            {isDefaultOrg
                              ? "This workspace is currently configured to load automatically on sign-in."
                              : "Make this workspace load automatically instead of the last active organization."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-2xs ${
                            isDefaultOrg
                              ? "bg-primary/12 text-primary border-primary/25"
                              : "bg-muted/40 text-muted-foreground border-border/60"
                          }`}
                        >
                          {isDefaultOrg && <Check className="w-3 h-3" />}
                          {isDefaultOrg ? "Default" : "Standard"}
                        </span>
                        <Switch
                          checked={isDefaultOrg}
                          onCheckedChange={toggleDefaultOrg}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 3: Danger Zone (Delete Workspace) */}
                {isOwner && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="bg-card border border-destructive/25 rounded-2xl shadow-2xs overflow-hidden py-0 gap-0">
                      <CardHeader className="p-5 md:p-6 border-b border-destructive/15 bg-destructive/[0.02]">
                        <CardTitle className="text-sm md:text-base font-bold text-destructive flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Delete Organization
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                          Permanently delete this organization, including all associated invoices, transactions, customer records, and team memberships.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-5 md:p-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-destructive/[0.03] border border-destructive/20">
                          <div className="space-y-0.5 text-center sm:text-left">
                            <h4 className="font-bold text-xs text-foreground">Confirm Permanent Removal</h4>
                            <p className="text-[11px] text-muted-foreground leading-normal">
                              This action requires owner privileges and cannot be reversed or undone.
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            onClick={() => setIsDeleteOrgModalOpen(true)}
                            className="h-9 shrink-0 gap-1.5 px-4 text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Workspace
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* Branding Tab */}
            {activeTab === "branding" && <OrganizationBrandingSettings />}

            {/* Team & Invites Tab */}
            {activeTab === "members" && <MemberManagement />}

            {/* Custom Fields Tab */}
            {activeTab === "custom-fields" && canEdit && <CustomFieldsManagement />}

            {/* Audit Logs Tab */}
            {activeTab === "audit-logs" && canEdit && <AuditLogs />}

            {/* Recently Deleted Tab */}
            {activeTab === "recently-deleted" && (
              <RecentlyDeleted key={`${currentOrganization?.id || "default"}-recently-deleted`} />
            )}
          </div>
        </div>
      </div>

      {/* Delete Organization Confirmation Modal */}
      <Dialog open={isDeleteOrgModalOpen} onOpenChange={setIsDeleteOrgModalOpen}>
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card">
          <div className="p-6 border-b border-border/40 bg-muted/20">
            <DialogHeader className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3 mx-auto border border-destructive/20 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-base md:text-lg font-bold">Delete Organization</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium text-xs mt-1">
                You are about to permanently delete{" "}
                <span className="text-foreground font-bold">"{currentOrganization?.name}"</span>.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/15">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-[11px] font-medium text-destructive/90 leading-relaxed space-y-1">
                <p>
                  All financial ledgers, tax invoices, customer lists, and member associations within this workspace will be permanently erased.
                </p>
                {organizations.length <= 1 && (
                  <p className="font-bold text-destructive">
                    Since this is your only workspace, you will be redirected to onboarding to create or join a new workspace.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Please type <strong className="text-foreground font-bold">"{currentOrganization?.name}"</strong> to confirm:
              </Label>
              <Input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={currentOrganization?.name}
                className="h-10 rounded-xl border-border/70 focus:border-destructive transition-all bg-background px-3 text-xs font-semibold"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/15 border-t border-border/40 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteOrgModalOpen(false)}
              className="flex-1 h-9 rounded-xl font-bold uppercase tracking-wider text-[11px] text-muted-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteOrganization}
              disabled={isDeletingOrg || deleteConfirmName.trim() !== currentOrganization?.name}
              className="flex-1 h-9 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 shadow-xs cursor-pointer"
            >
              {isDeletingOrg ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              {isDeletingOrg ? "Deleting..." : "Delete Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  User,
  Bell,
  Palette,
  Shield,
  CreditCard,
  Sun,
  Moon,
  Laptop,
  Building2,
  Mail,
  Camera,
  Loader2,
  Check,
  Globe,
  Receipt,
  Hash,
  ArrowRight,
} from "lucide-react";
import api from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useTheme, ACCENT_COLORS, Theme, AccentColor } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SettingsTab = "Account" | "Notifications" | "Display" | "Invoices" | "Security" | "Billing";

interface NumberingSequenceItem {
  module: "customers" | "vendors" | "items";
  prefix: string;
  nextNumber: number;
  padding: number;
  enabled: boolean;
  preview?: string;
}

export function Settings() {
  const { theme, accentColor, setTheme, setAccentColor } = useTheme();
  const { user, profile, currentOrganization, fetchOrganizations } = useAuth();

  const getInitialTab = (): SettingsTab => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab")?.toLowerCase();
      if (tab === "organization") {
        window.location.replace("/organization-settings");
        return "Account";
      }
      if (tab === "appearance" || tab === "display") return "Display";
      if (tab === "notifications") return "Notifications";
      if (tab === "invoices") return "Invoices";
      if (tab === "security") return "Security";
      if (tab === "billing" || tab === "plans") return "Billing";
    }
    return "Account";
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab);

  // Profile Form
  const [fullName, setFullName] = useState(profile?.full_name || user?.name || "");
  const [profilePictureUrl, setProfilePictureUrl] = useState(profile?.profile_picture || "");
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(profile?.profile_picture || null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    } else if (user?.name) {
      setFullName(user.name);
    }
    if (profile?.profile_picture) {
      setProfilePictureUrl(profile.profile_picture);
      setProfilePreviewUrl(profile.profile_picture);
    }
  }, [profile, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a valid image (JPEG, PNG, or WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile picture must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    setIsSavingProfile(true);
    try {
      try {
        await api.put("/profile", { fullName: fullName.trim() });
      } catch {
        if ((authClient as any)?.updateUser) {
          await (authClient as any).updateUser({ name: fullName.trim() });
        }
      }
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Notification Preferences
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);

  useEffect(() => {
    api
      .get("/notifications/preferences")
      .then(({ data }) => {
        if (data && typeof data.weekly_report === "boolean") {
          setWeeklyReport(data.weekly_report);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleWeeklyReport = async (val: boolean) => {
    setWeeklyReport(val);
    setIsUpdatingPrefs(true);
    try {
      await api.put("/notifications/preferences", { weekly_report: val });
      toast.success("Notification preferences updated");
    } catch {
      toast.error("Failed to update preferences");
      setWeeklyReport(!val);
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  // Record Numbering
  const [sequences, setSequences] = useState<NumberingSequenceItem[]>([
    { module: "customers", prefix: "CUST-", nextNumber: 1, padding: 4, enabled: true, preview: "CUST-0001" },
    { module: "items", prefix: "ITEM-", nextNumber: 1, padding: 4, enabled: true, preview: "ITEM-0001" },
  ]);
  const [isLoadingSequences, setIsLoadingSequences] = useState(false);
  const [savingSequenceModule, setSavingSequenceModule] = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingSequences(true);
    api
      .get("/organizations/numbering-sequences")
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          setSequences(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingSequences(false);
      });
  }, []);

  const handleSaveSequence = async (seq: NumberingSequenceItem) => {
    setSavingSequenceModule(seq.module);
    try {
      const { data } = await api.put(`/organizations/numbering-sequences/${seq.module}`, {
        prefix: seq.prefix,
        nextNumber: Number(seq.nextNumber),
        padding: Number(seq.padding),
        enabled: seq.enabled,
      });
      setSequences((prev) => prev.map((s) => (s.module === seq.module ? data || s : s)));
      toast.success(`${seq.module.toUpperCase()} numbering sequence updated`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save sequence");
    } finally {
      setSavingSequenceModule(null);
    }
  };

  // Language state
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accountiva_locale") || "en";
    }
    return "en";
  });

  const handleLanguageChange = (code: string, name: string) => {
    setSelectedLanguage(code);
    if (typeof window !== "undefined") {
      localStorage.setItem("accountiva_locale", code);
    }
    toast.success(`Language updated to ${name}`);
  };

  // Invoice Template Defaults
  const [defaultTemplate, setDefaultTemplate] = useState("standard");
  const handleUpdateTemplate = (id: string) => {
    setDefaultTemplate(id);
    toast.success("Invoice template default updated");
  };

  // Billing State
  const [isBillingMonthly, setIsBillingMonthly] = useState(true);

  const plans = [
    {
      id: "free",
      name: "Free Starter",
      priceMonthly: 0,
      priceAnnually: 0,
      description: "Essential invoicing tools for growing your business.",
      features: [
        { text: "Invoices & Estimates", included: true },
        { text: "Credit Notes & Refunds", included: true },
        { text: "Customer & Product Catalog", included: true },
        { text: "Multi-Currency Invoicing", included: true },
        { text: "Multiple Invoice Templates", included: true },
        { text: "Direct Email Invoicing", included: true },
        { text: "CSV & JSON Data Exports", included: true },
        { text: "5 GSTIN Fetches included", included: true },
        { text: "Multiple Users", included: false },
        { text: "Watermark Removal", included: false },
        { text: "Custom Fields", included: false },
      ],
    },
    {
      id: "pro",
      name: "Professional",
      priceMonthly: 199,
      priceAnnually: 1999,
      description: "Complete power and automation for your entire team.",
      popular: true,
      features: [
        { text: "Invoices & Estimates", included: true },
        { text: "Credit Notes & Refunds", included: true },
        { text: "Customer & Product Catalog", included: true },
        { text: "Multi-Currency Invoicing", included: true },
        { text: "Multiple Invoice Templates", included: true },
        { text: "Direct Email Invoicing", included: true },
        { text: "CSV & JSON Data Exports", included: true },
        { text: "Unlimited GSTIN Auto-Fetching", included: true },
        { text: "Multiple Users", included: true },
        { text: "Watermark Removal", included: true },
        { text: "Custom Fields", included: true },
      ],
    },
  ];

  const settingsSections = [
    { id: "Account" as SettingsTab, icon: User, label: "Account" },
    { id: "Notifications" as SettingsTab, icon: Bell, label: "Notifications" },
    { id: "Display" as SettingsTab, icon: Palette, label: "Display" },
    { id: "Invoices" as SettingsTab, icon: Receipt, label: "Invoices" },
    { id: "Security" as SettingsTab, icon: Shield, label: "Security" },
    { id: "Billing" as SettingsTab, icon: CreditCard, label: "Plans" },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full px-8 flex flex-col h-full overflow-hidden min-h-0">
      {/* Header (Fixed) */}
      <div className="pt-4 pb-3 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-display">
            Settings
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage your preferences, account details, and appearance
          </p>
        </div>
      </div>

      {/* Body with independent scroll */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden md:gap-8 pt-2 md:pt-4 min-h-0">
        {/* Sidebar Navigation */}
        <nav className="shrink-0 flex gap-1 pb-4 md:pb-0 scrollbar-hide md:w-48 lg:w-52 flex-row md:flex-col overflow-x-auto md:overflow-x-visible">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeTab === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveTab(section.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left shrink-0 cursor-pointer",
                  isActive
                    ? "bg-primary/12 text-primary border border-primary/25 shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  )}
                />
                <span className="whitespace-nowrap">{section.label}</span>
                {isActive && (
                  <span className="hidden md:inline-block size-1.5 rounded-full bg-primary shrink-0 ml-auto" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pb-6 pt-4 md:pt-0 pr-4 -mr-4 min-h-0 custom-scrollbar">
          <div className="space-y-6">
            {/* Account Section */}
            {activeTab === "Account" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Card className="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                  <CardHeader className="p-5 md:p-6 border-b border-border/60 bg-card/30">
                    <CardTitle className="text-sm md:text-base font-bold text-foreground">
                      Personal Profile
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Your identity and contact information across the platform.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
                      {/* Profile Picture Upload */}
                      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/40 p-4 lg:flex-col lg:items-start">
                        <button
                          type="button"
                          className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card cursor-pointer"
                          aria-label="Upload profile picture"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <span className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-background/60 transition-colors group-hover:border-primary/60 shadow-2xs">
                            {profilePreviewUrl ? (
                              <img
                                src={profilePreviewUrl}
                                alt="Profile avatar"
                                className="size-full object-cover"
                              />
                            ) : (
                              <User className="size-8 text-muted-foreground" />
                            )}
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                              <Camera className="size-5 text-white" />
                            </span>
                          </span>
                          <span className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-2xs">
                            <Camera className="size-3.5" />
                          </span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleFileChange}
                        />
                        <div className="min-w-0 space-y-1 lg:pt-1 text-left">
                          <h4 className="text-sm font-bold text-foreground">Profile Picture</h4>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            JPG, PNG or WebP under 5MB.
                          </p>
                        </div>
                      </div>

                      <div className="grid min-w-0 gap-5 text-left">
                        <div className="grid gap-1.5">
                          <Label className="ml-0.5 text-xs font-bold text-foreground">
                            Public Name <span className="text-destructive ml-0.5">*</span>
                          </Label>
                          <Input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your full name"
                            className="h-10 rounded-xl border-border/70 bg-field/90 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          />
                        </div>

                        <div className="grid gap-1.5">
                          <Label className="ml-0.5 text-xs font-bold text-foreground">
                            Email Address
                          </Label>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={user?.email || ""}
                              disabled
                              className="h-10 cursor-not-allowed rounded-xl border-border/60 bg-muted/40 pl-9 text-sm text-muted-foreground disabled:opacity-100 shadow-2xs"
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground ml-1 italic">
                            Email address is linked to your authentication provider.
                          </p>
                        </div>

                        <div className="flex justify-end border-t border-border/60 pt-5">
                          <Button
                            type="button"
                            onClick={() => handleUpdateProfile()}
                            disabled={isSavingProfile}
                            className="h-10 min-w-32 gap-2 rounded-xl px-5 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all cursor-pointer"
                          >
                            {isSavingProfile && <Loader2 className="size-3.5 animate-spin" />}
                            <span>{isSavingProfile ? "Saving..." : "Update Profile"}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Record Numbering Card */}
                <Card className="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                  <CardHeader className="p-5 md:p-6 border-b border-border/60 bg-card/30 text-left">
                    <CardTitle className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
                      <Hash className="size-4 text-primary" />
                      <span>Record Numbering</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Configure automatic serial codes for customers, vendors, and products.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {isLoadingSequences ? (
                      <div className="text-xs text-muted-foreground font-medium py-4 text-center">
                        Loading numbering sequences...
                      </div>
                    ) : (
                      sequences.map((sequence, idx) => {
                        const isSaving = savingSequenceModule === sequence.module;
                        const preview = `${sequence.prefix || ""}${String(
                          sequence.nextNumber || 1
                        ).padStart(Number(sequence.padding) || 4, "0")}`;

                        return (
                          <div
                            key={sequence.module}
                            className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto] gap-3 items-end rounded-xl border border-border/60 bg-muted/20 p-4 hover:border-primary/30 transition-colors text-left"
                          >
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {sequence.module} Sequence
                              </Label>
                              <div className="text-xs text-foreground font-mono font-bold">
                                {preview || "Manual only"}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Prefix
                              </Label>
                              <Input
                                value={sequence.prefix}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  setSequences((prev) =>
                                    prev.map((s, i) => (i === idx ? { ...s, prefix: val } : s))
                                  );
                                }}
                                className="h-10 rounded-xl font-mono uppercase bg-field/90 border-border/70 shadow-2xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Next No.
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                value={sequence.nextNumber}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 1;
                                  setSequences((prev) =>
                                    prev.map((s, i) => (i === idx ? { ...s, nextNumber: val } : s))
                                  );
                                }}
                                className="h-10 rounded-xl font-mono bg-field/90 border-border/70 shadow-2xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Digits
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                max={12}
                                value={sequence.padding}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 4;
                                  setSequences((prev) =>
                                    prev.map((s, i) => (i === idx ? { ...s, padding: val } : s))
                                  );
                                }}
                                className="h-10 rounded-xl font-mono bg-field/90 border-border/70 shadow-2xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Auto
                              </Label>
                              <div className="h-10 flex items-center">
                                <Switch
                                  checked={sequence.enabled}
                                  onCheckedChange={(val) => {
                                    setSequences((prev) =>
                                      prev.map((s, i) => (i === idx ? { ...s, enabled: val } : s))
                                    );
                                  }}
                                />
                              </div>
                            </div>

                            <Button
                              type="button"
                              onClick={() => handleSaveSequence(sequence)}
                              disabled={isSaving}
                              size="sm"
                              className="h-10 px-4 rounded-xl font-bold uppercase tracking-wider text-[11px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all cursor-pointer"
                            >
                              {isSaving ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notifications Section */}
            {activeTab === "Notifications" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Card className="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                  <CardHeader className="p-5 md:p-6 border-b border-border/60 bg-card/30 text-left">
                    <CardTitle className="text-sm md:text-base font-bold text-foreground">
                      Notification Preferences
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Configure automated reports and digest schedules.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/60">
                      <div className="space-y-0.5 pr-4 text-left">
                        <Label className="text-xs font-bold text-foreground">
                          Weekly Financial Summary Email
                        </Label>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          Receive automated Monday morning summaries of your organization's revenue and invoice statuses.
                        </p>
                      </div>
                      <Switch
                        checked={weeklyReport}
                        disabled={isUpdatingPrefs}
                        onCheckedChange={handleToggleWeeklyReport}
                      />
                    </div>

                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5 text-left">
                        <span className="text-xs font-bold text-foreground block">
                          In-App Notification Center
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Review workspace alerts, role invitations, and real-time updates.
                        </p>
                      </div>
                      <Link to="/notifications">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0 cursor-pointer">
                          <span>Open Notifications</span>
                          <ArrowRight className="size-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Display Section */}
            {activeTab === "Display" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Card className="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                  <CardHeader className="p-5 md:p-6 border-b border-border/60 bg-card/30 text-left">
                    <CardTitle className="text-sm md:text-base font-bold text-foreground">
                      Display & Interface Appearance
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Customize how the application looks and feels across your devices.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6 text-left">
                    {/* Theme Mode Selector with 1:1 Aspect-Video Mockups */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-foreground">Theme Mode</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {(["light", "dark", "system"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTheme(t)}
                            className={cn(
                              "p-4 rounded-xl border text-left space-y-3 transition-all relative overflow-hidden group shadow-2xs cursor-pointer",
                              theme === t
                                ? "border-primary bg-primary/5 shadow-xs"
                                : "border-border/60 bg-muted/20 hover:border-primary/40"
                            )}
                          >
                            {t === "light" && (
                              <div className="w-full aspect-video bg-white rounded-lg border border-border flex items-center justify-center shadow-2xs">
                                <Sun className="size-6 text-foreground" />
                              </div>
                            )}
                            {t === "dark" && (
                              <div className="w-full aspect-video bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-center shadow-2xs">
                                <Moon className="size-6 text-zinc-100" />
                              </div>
                            )}
                            {t === "system" && (
                              <div className="w-full aspect-video rounded-lg border border-border flex relative overflow-hidden shadow-2xs">
                                <div className="flex-1 bg-white" />
                                <div className="flex-1 bg-zinc-950" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="size-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-none">
                                    <Laptop className="size-5 text-foreground" />
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs capitalize">{t}</span>
                              {theme === t && (
                                <div className="size-4 rounded-full bg-primary flex items-center justify-center">
                                  <div className="size-1.5 rounded-full bg-primary-foreground" />
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Accent Color Selection Pill */}
                    <div className="pt-6 border-t border-border/60 space-y-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Palette className="size-4 text-primary" />
                          <span>Accent Color</span>
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Choose an accent color that coordinates with your brand identity.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-2.5 rounded-2xl border border-border/50 bg-muted/20 w-fit">
                        {ACCENT_COLORS.map((color) => (
                          <button
                            key={color.id}
                            type="button"
                            title={color.name}
                            aria-label={color.name}
                            onClick={() => setAccentColor(color.id)}
                            className={cn(
                              "relative flex items-center justify-center size-9 sm:size-10 rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:scale-110 active:scale-95 cursor-pointer shadow-xs",
                              accentColor === color.id
                                ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-105 shadow-sm"
                                : "opacity-85 hover:opacity-100"
                            )}
                            style={{ backgroundColor: color.colorHex }}
                          >
                            {accentColor === color.id && (
                              <Check className="size-4 sm:size-4.5 text-white stroke-[3] drop-shadow-xs" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language Selection Grid */}
                    <div className="pt-6 border-t border-border/60 space-y-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Globe className="size-4 text-primary" />
                          <span>Display Language</span>
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Set your preferred language for navigation, labels, and formatting.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                        {[
                          { code: "en", name: "English", flag: "🇺🇸" },
                          { code: "hi", name: "हिन्दी (Hindi)", flag: "🇮🇳" },
                          { code: "es", name: "Español (Spanish)", flag: "🇪🇸" },
                          { code: "ar", name: "العربية (Arabic)", flag: "🇸🇦" },
                        ].map((lang) => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => handleLanguageChange(lang.code, lang.name)}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl border text-left transition-all relative overflow-hidden group shadow-2xs h-11 cursor-pointer",
                              selectedLanguage === lang.code
                                ? "border-primary bg-primary/10 shadow-xs"
                                : "border-border/60 bg-muted/20 hover:border-primary/40"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm">{lang.flag}</span>
                              <span className="font-bold text-xs">{lang.name}</span>
                            </div>
                            {selectedLanguage === lang.code && (
                              <div className="size-4 rounded-full bg-primary flex items-center justify-center shadow-none">
                                <div className="size-1.5 rounded-full bg-primary-foreground" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Invoices Section */}
            {activeTab === "Invoices" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Card className="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                  <CardHeader className="p-5 md:p-6 border-b border-border/60 bg-card/30 text-left">
                    <CardTitle className="text-sm md:text-base font-bold text-foreground">
                      Invoice Template Design
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Choose the default visual PDF presentation for generated invoices.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { id: "standard", name: "Template 1", desc: "Professional & Classic" },
                        { id: "modern", name: "Template 2", desc: "Sleek & Contemporary" },
                        { id: "minimal", name: "Template 3", desc: "Simple & Minimal" },
                        { id: "premium", name: "Template 4", desc: "Elegant & Sophisticated" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleUpdateTemplate(t.id)}
                          className={cn(
                            "p-4 rounded-xl border text-left space-y-3 transition-all group shadow-2xs cursor-pointer",
                            defaultTemplate === t.id
                              ? "border-primary bg-primary/10 shadow-xs"
                              : "border-border/60 bg-muted/20 hover:border-primary/40"
                          )}
                        >
                          <div className="w-full aspect-[4/3] bg-muted/20 rounded-lg border border-border flex flex-col items-center justify-center gap-2 overflow-hidden relative">
                            {t.id === "standard" && (
                              <div className="w-full h-full p-4 flex flex-col">
                                <div className="w-10 h-2 rounded-full bg-muted-foreground/20 mb-1" />
                                <div className="w-6 h-1 rounded-full bg-muted-foreground/10 mb-6" />
                                <div className="space-y-2 mt-auto">
                                  <div className="w-full h-1 rounded-full bg-muted-foreground/5" />
                                  <div className="w-full h-1 rounded-full bg-muted-foreground/5" />
                                  <div className="w-3/4 h-1 rounded-full bg-muted-foreground/5" />
                                </div>
                              </div>
                            )}
                            {t.id === "modern" && (
                              <div className="w-full h-full flex flex-col">
                                <div className="w-full h-1/3 bg-muted-foreground/10 p-3">
                                  <div className="w-8 h-2 rounded-full bg-muted-foreground/20" />
                                </div>
                                <div className="p-3 space-y-2">
                                  <div className="w-full h-1 rounded-full bg-muted-foreground/5" />
                                  <div className="w-2/3 h-1 rounded-full bg-muted-foreground/5" />
                                </div>
                              </div>
                            )}
                            {t.id === "minimal" && (
                              <div className="w-full h-full p-6 flex flex-col items-center text-center">
                                <div className="size-8 rounded-full bg-muted-foreground/10 mb-2" />
                                <div className="w-full space-y-1">
                                  <div className="w-full h-1 rounded-full bg-muted-foreground/5" />
                                  <div className="w-full h-1 rounded-full bg-muted-foreground/5" />
                                </div>
                              </div>
                            )}
                            {t.id === "premium" && (
                              <div className="w-full h-full border-4 border-muted-foreground/10 p-4 flex flex-col">
                                <div className="flex justify-between mb-6">
                                  <div className="size-8 bg-muted-foreground/20 rounded" />
                                  <div className="w-12 h-2 bg-muted-foreground/10 rounded" />
                                </div>
                                <div className="space-y-2">
                                  <div className="w-full h-1 rounded-full bg-muted-foreground/5" />
                                  <div className="w-full h-1 rounded-full bg-muted-foreground/5" />
                                </div>
                              </div>
                            )}

                            {defaultTemplate === t.id && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                <Check className="size-8 text-primary opacity-50" />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-xs">{t.name}</span>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                            </div>
                            {defaultTemplate === t.id && (
                              <div className="size-4 rounded-full bg-primary flex items-center justify-center shadow-none">
                                <div className="size-1.5 rounded-full bg-primary-foreground" />
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Security Section */}
            {activeTab === "Security" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Card className="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                  <CardHeader className="p-5 md:p-6 border-b border-border/60 bg-card/30 text-left">
                    <CardTitle className="text-sm md:text-base font-bold text-foreground">
                      Security & Authentication
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Manage password access and account protection settings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3 text-left">
                    <Button
                      variant="outline"
                      onClick={() => toast.info("Password reset link sent to your registered email.")}
                      className="w-full h-10 px-5 rounded-xl border-border/70 hover:bg-muted/50 justify-start font-bold uppercase tracking-wider text-[11px] shadow-none cursor-pointer"
                    >
                      Change Password
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toast.warning("To delete your account, please contact team support.")}
                      className="w-full h-10 px-5 rounded-xl border-border/70 justify-start text-destructive hover:text-destructive hover:bg-destructive/10 font-bold uppercase tracking-wider text-[11px] shadow-none cursor-pointer"
                    >
                      Delete Account
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Billing Section */}
            {activeTab === "Billing" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Card className="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                  <CardHeader className="p-5 md:p-6 border-b border-border/60 bg-card/30 text-left">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="grid gap-1">
                        <CardTitle className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
                          <span>Subscription Plans & Billing</span>
                          {currentOrganization?.name && (
                            <span className="font-normal text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
                              {currentOrganization.name}
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          Subscription plans and entitlements are per-organization. All members in{" "}
                          {currentOrganization?.name || "this workspace"} share plan benefits.
                        </CardDescription>
                      </div>

                      {/* Billing Cycle Toggle */}
                      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60 self-start md:self-auto shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setIsBillingMonthly(true)}
                          className={cn(
                            "px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                            isBillingMonthly
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBillingMonthly(false)}
                          className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                            !isBillingMonthly
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <span>Annual</span>
                          <span className="bg-primary-foreground/20 text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                            -16%
                          </span>
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
                      {plans.map((plan) => {
                        const isCurrent =
                          (currentOrganization?.plan || "free") === plan.id;

                        return (
                          <div
                            key={plan.id}
                            className={cn(
                              "relative flex flex-col p-6 rounded-2xl border transition-all duration-300 shadow-2xs",
                              isCurrent
                                ? "border-primary/50 bg-primary/[0.04]"
                                : "border-border/60 hover:border-primary/40 bg-card/50"
                            )}
                          >
                            {plan.popular && (
                              <span className="absolute top-4 right-4 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
                                Most Popular
                              </span>
                            )}

                            <div className="mb-4">
                              <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                              <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                            </div>

                            <div className="mb-6">
                              <span className="text-3xl font-extrabold text-foreground">
                                ₹{isBillingMonthly ? plan.priceMonthly : plan.priceAnnually}
                              </span>
                              <span className="text-xs text-muted-foreground ml-1">
                                /{isBillingMonthly ? "month" : "year"}
                              </span>
                            </div>

                            <ul className="space-y-2.5 mb-8 flex-1">
                              {plan.features.map((feat, fIdx) => (
                                <li
                                  key={fIdx}
                                  className={cn(
                                    "flex items-center gap-2 text-xs",
                                    feat.included ? "text-foreground font-medium" : "text-muted-foreground/50 line-through"
                                  )}
                                >
                                  <Check
                                    className={cn(
                                      "size-3.5 shrink-0",
                                      feat.included ? "text-primary" : "text-muted-foreground/30"
                                    )}
                                  />
                                  <span>{feat.text}</span>
                                </li>
                              ))}
                            </ul>

                            <Button
                              type="button"
                              disabled={isCurrent}
                              variant={isCurrent ? "outline" : "default"}
                              className={cn(
                                "w-full h-10 rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-sm cursor-pointer",
                                isCurrent
                                  ? "border-primary/30 text-primary cursor-default"
                                  : "bg-primary text-primary-foreground hover:bg-primary/95"
                              )}
                              onClick={() => {
                                if (plan.id === "pro") {
                                  toast.info("Pro plan upgrade checkout initiated!");
                                }
                              }}
                            >
                              {isCurrent ? "Current Plan" : "Upgrade to Pro"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;

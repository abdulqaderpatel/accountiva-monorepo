import React, { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  User,
  Bell,
  Palette,
  Shield,
  Sun,
  Moon,
  Laptop,
  Building2,
  Mail,
  Camera,
  Loader2,
  Check,
  Globe,
  Hash,
  ArrowRight,
} from "lucide-react";
import api from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useTheme, ACCENT_COLORS, Theme, AccentColor } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useI18n, LocaleCode } from "@/i18n";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SettingsTab = "Account" | "Notifications" | "Display" | "Security";

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
  const { user, profile } = useAuth();

  const getInitialTab = (): SettingsTab => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab")?.toLowerCase();
      if (tab === "organization") {
        window.location.replace("/organization-settings");
        return "Account";
      }
      if (tab === "billing" || tab === "plans") {
        window.location.replace("/organization-settings?tab=plans");
        return "Account";
      }
      if (tab === "invoices" || tab === "templates") {
        window.location.replace("/organization-settings?tab=templates");
        return "Account";
      }
      if (tab === "appearance" || tab === "display") return "Display";
      if (tab === "notifications") return "Notifications";
      if (tab === "security") return "Security";
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

  // Language state & i18n
  const { locale: selectedLanguage, setLocale } = useI18n();

  const handleLanguageChange = (code: string, name: string) => {
    setLocale(code as LocaleCode);
    let msg = `Language updated to ${name}`;
    if (code === "hi") msg = "भाषा हिन्दी में बदली गई";
    else if (code === "es") msg = "Idioma cambiado a Español";
    else if (code === "ar") msg = "تم تغيير اللغة إلى العربية";
    toast.success(msg);
  };

  const settingsSections = [
    { id: "Account" as SettingsTab, icon: User, label: "Account" },
    { id: "Notifications" as SettingsTab, icon: Bell, label: "Notifications" },
    { id: "Display" as SettingsTab, icon: Palette, label: "Display" },
    { id: "Security" as SettingsTab, icon: Shield, label: "Security" },
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
                            loading={isSavingProfile}
                            className="h-10 min-w-32 gap-2 rounded-xl px-5 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all cursor-pointer"
                          >
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
                              loading={isSaving}
                              size="sm"
                              className="h-10 px-4 rounded-xl font-bold uppercase tracking-wider text-[11px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all cursor-pointer"
                            >
                              <span>{isSaving ? "Saving..." : "Save"}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;

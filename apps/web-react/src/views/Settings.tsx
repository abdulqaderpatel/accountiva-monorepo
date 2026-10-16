import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  User,
  Palette,
  Sun,
  Moon,
  Laptop,
  Check,
  Building2,
  Mail,
  Shield,
  FileText,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Bell,
  Hash,
} from "lucide-react";
import api from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useTheme, ACCENT_COLORS, Theme, AccentColor } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SettingsTab = "profile" | "appearance" | "invoices" | "notifications";

export function Settings() {
  const { theme, accentColor, setTheme, setAccentColor } = useTheme();
  const { user, currentOrganization, fetchOrganizations } = useAuth();

  const getInitialTab = (): SettingsTab => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab")?.toLowerCase();
      if (tab === "organization") {
        window.location.replace("/organization-settings");
        return "profile";
      }
      if (tab === "profile" || tab === "account") return "profile";
      if (tab === "invoices") return "invoices";
      if (tab === "notifications") return "notifications";
    }
    return "profile";
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab);

  // Profile Form
  const [fullName, setFullName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notification Preferences
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);

  useEffect(() => {
    api.get("/notifications/preferences").then(({ data }) => {
      if (data && typeof data.weekly_report === "boolean") {
        setWeeklyReport(data.weekly_report);
      }
    }).catch(() => {});
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

  // Numbering Sequences
  interface NumberingSequenceItem {
    module: "customers" | "vendors" | "items";
    prefix: string;
    nextNumber: number;
    padding: number;
    enabled: boolean;
    preview?: string;
  }

  const [sequences, setSequences] = useState<NumberingSequenceItem[]>([
    { module: "customers", prefix: "CUST-", nextNumber: 1, padding: 4, enabled: true, preview: "CUST-0001" },
    { module: "items", prefix: "ITEM-", nextNumber: 1, padding: 4, enabled: true, preview: "ITEM-0001" },
  ]);
  const [isLoadingSequences, setIsLoadingSequences] = useState(false);
  const [savingSequenceModule, setSavingSequenceModule] = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingSequences(true);
    api.get("/organizations/numbering-sequences").then(({ data }) => {
      if (Array.isArray(data) && data.length > 0) {
        setSequences(data);
      }
    }).catch(() => {}).finally(() => {
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
      setSequences((prev) => prev.map((s) => (s.module === seq.module ? (data || s) : s)));
      toast.success(`${seq.module.toUpperCase()} numbering sequence updated`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save sequence");
    } finally {
      setSavingSequenceModule(null);
    }
  };

  useEffect(() => {
    if (user?.name) {
      setFullName(user.name);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      try {
        await api.put("/profile", { fullName });
      } catch {
        if ((authClient as any)?.updateUser) {
          await (authClient as any).updateUser({ name: fullName });
        }
      }
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const tabs = [
    { id: "profile" as SettingsTab, label: "Account Profile", icon: User },
    { id: "appearance" as SettingsTab, label: "Appearance & Theme", icon: Palette },
    { id: "invoices" as SettingsTab, label: "Numbering & Invoices", icon: FileText },
    { id: "notifications" as SettingsTab, label: "Notifications", icon: Bell },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
          Settings & Preferences
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account credentials, company information, and visual design system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap text-left",
                activeTab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          {/* Organization Settings Quick Access Banner */}
          {currentOrganization && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-primary/20 bg-primary/5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span>Active Workspace: {currentOrganization.name}</span>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0 px-1.5">{currentOrganization.role}</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Looking for organization settings? Manage your company identity, tax info, team members, and custom fields.
                  </div>
                </div>
              </div>
              <Link to="/organization-settings" className="shrink-0">
                <Button size="sm" className="gap-1.5 font-semibold text-xs shadow-xs">
                  <span>Organization Settings</span>
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          )}

          {/* Appearance Section */}
          {activeTab === "appearance" && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Appearance & Theme</CardTitle>
                <CardDescription className="text-xs">
                  Customize the interface theme and select an accent color that matches your brand.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">Theme Mode</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "light" as Theme, label: "Light", icon: Sun },
                      { id: "dark" as Theme, label: "Dark", icon: Moon },
                      { id: "system" as Theme, label: "System", icon: Laptop },
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTheme(id)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer",
                          theme === id
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                            : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                        )}
                      >
                        <Icon className="size-5 mb-2" />
                        <span className="text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Colors */}
                <div className="space-y-3 pt-4 border-t border-border/60">
                  <div>
                    <Label className="text-xs font-medium text-foreground">Accent Tint</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Buttons, active tabs, and focus rings will reflect this color tint.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl border border-border/60 bg-muted/20 w-fit">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setAccentColor(c.id)}
                        title={c.name}
                        className={cn(
                          "relative size-7 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                          accentColor === c.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                        )}
                        style={{ backgroundColor: c.colorHex }}
                      >
                        {accentColor === c.id && (
                          <Check className="size-3.5 text-white stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Profile Section */}
          {activeTab === "profile" && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Personal Profile</CardTitle>
                <CardDescription className="text-xs">
                  Your public display name and contact email address.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={email}
                        disabled
                        className="pl-9 bg-muted/40 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Email address is linked to your authentication provider.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button type="submit" disabled={isSavingProfile}>
                      {isSavingProfile ? "Updating..." : "Update Profile"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}


          {/* Invoices & Numbering Presets Section */}
          {activeTab === "invoices" && (
            <div className="space-y-6">
              <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base">Invoice Defaults</CardTitle>
                  <CardDescription className="text-xs">
                    Standard payment terms and default credit policy.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Invoice Numbering Prefix</Label>
                      <Input defaultValue="INV-" className="font-mono text-xs uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Default Payment Terms</Label>
                      <Select
                        value="Due on Receipt"
                        onChange={() => {}}
                        options={[
                          { id: "Due on Receipt", name: "Due on Receipt" },
                          { id: "Net 15 Days", name: "Net 15 Days" },
                          { id: "Net 30 Days", name: "Net 30 Days" },
                          { id: "Net 60 Days", name: "Net 60 Days" },
                        ]}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button onClick={() => toast.success("Invoice preferences updated!")}>
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Numbering Sequences */}
              <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base">Entity Numbering Sequences</CardTitle>
                  <CardDescription className="text-xs">
                    Automated prefixes, zero-padding, and sequential counters across records.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingSequences ? (
                    <div className="py-8 flex justify-center">
                      <Spinner size="md" />
                    </div>
                  ) : (
                    sequences.map((seq, idx) => {
                      const isSaving = savingSequenceModule === seq.module;
                      const previewStr = `${seq.prefix || ""}${String(seq.nextNumber || 1).padStart(Number(seq.padding) || 4, "0")}`;

                      return (
                        <div
                          key={seq.module}
                          className="p-4 rounded-xl border border-border/50 bg-muted/10 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Hash className="size-4 text-primary" />
                              <span className="text-xs font-bold text-foreground capitalize">
                                {seq.module} Sequence
                              </span>
                            </div>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              Preview: {previewStr}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Prefix</Label>
                              <Input
                                value={seq.prefix}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  setSequences((prev) =>
                                    prev.map((s, i) => (i === idx ? { ...s, prefix: val } : s))
                                  );
                                }}
                                className="font-mono text-xs uppercase"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Next Counter</Label>
                              <Input
                                type="number"
                                min={1}
                                value={seq.nextNumber}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 1;
                                  setSequences((prev) =>
                                    prev.map((s, i) => (i === idx ? { ...s, nextNumber: val } : s))
                                  );
                                }}
                                className="font-mono text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Zero Padding</Label>
                              <Input
                                type="number"
                                min={1}
                                max={8}
                                value={seq.padding}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 4;
                                  setSequences((prev) =>
                                    prev.map((s, i) => (i === idx ? { ...s, padding: val } : s))
                                  );
                                }}
                                className="font-mono text-xs"
                              />
                            </div>
                          </div>

                          <div className="pt-1 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveSequence(seq)}
                              disabled={isSaving}
                              className="text-xs gap-1.5"
                            >
                              {isSaving && <Spinner size="sm" />}
                              <span>{isSaving ? "Saving..." : "Save Sequence"}</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notifications Preferences Section */}
          {activeTab === "notifications" && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Notification Preferences</CardTitle>
                <CardDescription className="text-xs">
                  Configure email summaries, activity digests, and notification alerts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-xl border border-border/50 bg-muted/10 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground block">
                      Weekly Performance Digest
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Receive a weekly automated email summary detailing invoices paid, outstanding receivables, and business growth metrics.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={weeklyReport}
                      disabled={isUpdatingPrefs}
                      onChange={(e) => handleToggleWeeklyReport(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>

                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">
                      In-App Notification Center
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Review live workspace activity logs, customer events, and invitation updates.
                    </p>
                  </div>
                  <Link to="/notifications">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0">
                      <span>Open Notification Center</span>
                      <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;

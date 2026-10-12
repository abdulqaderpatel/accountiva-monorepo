import React, { useState } from "react";
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
} from "lucide-react";
import { useTheme, ACCENT_COLORS, Theme, AccentColor } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SettingsTab = "profile" | "organization" | "appearance" | "invoices";

export function Settings() {
  const { theme, accentColor, setTheme, setAccentColor } = useTheme();
  const { user, currentOrganization } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  // Profile Form
  const [fullName, setFullName] = useState(user?.name || "Demo Administrator");
  const [email] = useState(user?.email || "admin@accountiva.com");

  // Organization Form
  const [orgName, setOrgName] = useState(currentOrganization?.name || "Acme Technologies Pvt Ltd");
  const [currency, setCurrency] = useState(currentOrganization?.currency || "INR");
  const [gstin, setGstin] = useState("27AABCU9603R1ZM");
  const [pan, setPan] = useState("AABCU9603R");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Profile updated successfully!");
  };

  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Organization settings saved!");
  };

  const tabs = [
    { id: "appearance" as SettingsTab, label: "Appearance", icon: Palette },
    { id: "profile" as SettingsTab, label: "Account Profile", icon: User },
    { id: "organization" as SettingsTab, label: "Organization Details", icon: Building2 },
    { id: "invoices" as SettingsTab, label: "Invoice Presets", icon: FileText },
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
                    <Button type="submit">Update Profile</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Organization Details Section */}
          {activeTab === "organization" && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Organization Profile</CardTitle>
                <CardDescription className="text-xs">
                  Legal company identity, tax compliance codes, and base billing currency.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveOrg} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="orgName">Organization Name *</Label>
                      <Input
                        id="orgName"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="currency">Base Currency</Label>
                      <select
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="INR">INR (₹ - Indian Rupee)</option>
                        <option value="USD">USD ($ - US Dollar)</option>
                        <option value="EUR">EUR (€ - Euro)</option>
                        <option value="GBP">GBP (£ - British Pound)</option>
                        <option value="AED">AED (د.إ - UAE Dirham)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="gstin">GSTIN</Label>
                      <Input
                        id="gstin"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        maxLength={15}
                        className="font-mono uppercase text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pan">PAN</Label>
                      <Input
                        id="pan"
                        value={pan}
                        onChange={(e) => setPan(e.target.value.toUpperCase())}
                        maxLength={10}
                        className="font-mono uppercase text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button type="submit">Save Organization</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Invoices Presets Section */}
          {activeTab === "invoices" && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Invoice Defaults & Sequence</CardTitle>
                <CardDescription className="text-xs">
                  Standard payment terms and automated numbering prefixes.
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
                    <select className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                      <option>Due on Receipt</option>
                      <option>Net 15 Days</option>
                      <option>Net 30 Days</option>
                      <option>Net 60 Days</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button onClick={() => toast.success("Invoice preferences updated!")}>
                    Save Preferences
                  </Button>
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

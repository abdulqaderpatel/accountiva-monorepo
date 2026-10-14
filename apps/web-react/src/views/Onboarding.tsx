import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  ArrowRight,
  UserPlus,
  ChevronLeft,
  LogOut,
  Globe,
  MapPin,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export function Onboarding() {
  const navigate = useNavigate();
  const { createOrganization, logout, user } = useAuth();

  const [step, setStep] = useState<"choice" | "create" | "join">("choice");
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [country, setCountry] = useState("India");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [inviteToken, setInviteToken] = useState("");

  const handleGstinChange = (val: string) => {
    const uppercase = val.toUpperCase().trim();
    setGstin(uppercase);
    if (uppercase.length >= 12 && !pan) {
      setPan(uppercase.substring(2, 12));
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    if (postalCode && postalCode.length !== 6) {
      toast.error("PIN code must be exactly 6 digits");
      return;
    }

    try {
      setLoading(true);
      await createOrganization({
        name: name.trim(),
        currency,
        country,
        region: country,
        gstin: gstin.trim(),
        pan: pan.trim(),
        address: `${address.trim()} ${city.trim()} ${state.trim()}`.trim(),
        address_line1: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
      });

      toast.success("Workspace created successfully!", {
        description: `Welcome to ${name.trim()}.`,
      });
      navigate({ to: "/dashboard" as any });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = inviteToken.trim();
    if (!raw) {
      toast.error("Please enter an invitation token or URL");
      return;
    }
    const token = raw.split("/").pop();
    if (!token) {
      toast.error("Could not parse token");
      return;
    }
    navigate({ to: `/invite/${token}` as any });
  };

  const handleSignOut = async () => {
    await logout();
    navigate({ to: "/login" as any });
  };

  return (
    <div className="min-h-screen bg-muted/10 text-foreground flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Top Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shadow-xs">
            A
          </div>
          <span className="font-display font-bold text-base tracking-tight text-foreground">
            Accountiva
          </span>
        </div>

        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <LogOut className="size-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>

      {/* Main Choice Card */}
      {step === "choice" && (
        <Card className="w-full max-w-xl border-border/80 bg-card shadow-xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
              Setup Your Workspace
            </h1>
            <p className="text-xs text-muted-foreground">
              Welcome{user?.name ? `, ${user.name}` : ""}! Choose how you would like to get started with Accountiva.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Create New Org Option */}
            <button
              onClick={() => setStep("create")}
              className="flex flex-col items-start p-5 rounded-2xl border border-border/80 bg-muted/20 hover:border-primary hover:bg-primary/5 transition-all text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                <Building2 className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Create New Workspace</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Establish a new company organization for invoicing, tax filing, and bookkeeping.
              </p>
              <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-4 group-hover:translate-x-1 transition-transform">
                <span>Configure details</span>
                <ArrowRight className="size-3.5" />
              </div>
            </button>

            {/* Join via Invite Option */}
            <button
              onClick={() => setStep("join")}
              className="flex flex-col items-start p-5 rounded-2xl border border-border/80 bg-muted/20 hover:border-primary hover:bg-primary/5 transition-all text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/40 border border-border flex items-center justify-center text-foreground mb-4 group-hover:scale-110 transition-transform">
                <UserPlus className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Join with Invitation</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Have an invitation token or email link from an existing workspace owner?
              </p>
              <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-foreground mt-4 group-hover:translate-x-1 transition-transform">
                <span>Enter code</span>
                <ArrowRight className="size-3.5" />
              </div>
            </button>
          </div>
        </Card>
      )}

      {/* Create Organization Form */}
      {step === "create" && (
        <Card className="w-full max-w-2xl border-border/80 bg-card shadow-xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <button
              onClick={() => setStep("choice")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-4" />
              <span>Back</span>
            </button>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Step 1 of 1: Organization Details
            </span>
          </div>

          <div>
            <h2 className="text-xl font-bold font-display tracking-tight text-foreground">
              Company Registration
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter your legal corporate entity information for invoicing headers and compliance.
            </p>
          </div>

          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Organization / Legal Business Name *</Label>
              <Input
                id="orgName"
                placeholder="e.g. Acme Technologies Pvt Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="orgCurrency">Base Billing Currency</Label>
                <select
                  id="orgCurrency"
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
                <Label htmlFor="orgCountry">Country / Region</Label>
                <select
                  id="orgCountry"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="orgGstin">GSTIN (Optional)</Label>
                <Input
                  id="orgGstin"
                  placeholder="27AABCU9603R1ZM"
                  value={gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  maxLength={15}
                  className="text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="orgPan">PAN (Optional)</Label>
                <Input
                  id="orgPan"
                  placeholder="AABCU9603R"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="orgAddress">Business Street Address</Label>
                <Input
                  id="orgAddress"
                  placeholder="Suite 400, Financial Tech Park"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="orgCity">City</Label>
                <Input
                  id="orgCity"
                  placeholder="Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="orgPostalCode">PIN / Postal Code</Label>
                <Input
                  id="orgPostalCode"
                  placeholder="400001"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  maxLength={6}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep("choice")}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="gap-2 font-bold shadow-xs">
                <span>{loading ? "Creating..." : "Launch Organization"}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Join with Invite Form */}
      {step === "join" && (
        <Card className="w-full max-w-lg border-border/80 bg-card shadow-xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <button
              onClick={() => setStep("choice")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-4" />
              <span>Back</span>
            </button>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Invitation Code
            </span>
          </div>

          <div>
            <h2 className="text-xl font-bold font-display tracking-tight text-foreground">
              Accept Team Invitation
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paste the invite link or security token from your administrator.
            </p>
          </div>

          <form onSubmit={handleJoinInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inviteToken">Invitation Token or URL *</Label>
              <Input
                id="inviteToken"
                placeholder="e.g. inv_sec_89324823 or full link..."
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                required
                className="text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep("choice")}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="gap-2 font-bold shadow-xs">
                <span>Verify & Join</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

export default Onboarding;


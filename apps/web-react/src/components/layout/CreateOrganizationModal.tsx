import React, { useState, useRef } from "react";
import {
  Building2,
  MapPin,
  Camera,
  Upload,
  Briefcase,
  Layers,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/Select";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { Modal } from "@/components/ui/modal";
import { UpgradePlanModal } from "@/components/ui/UpgradePlanModal";
import {
  COMMON_CURRENCIES,
  INDIAN_STATES,
  INDUSTRY_TYPES,
} from "@accountiva/shared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateOrganizationModal({
  isOpen,
  onClose,
}: CreateOrganizationModalProps) {
  const { createOrganization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [planLimitError, setPlanLimitError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [country, setCountry] = useState("India");
  const [region, setRegion] = useState<"India" | "Other">("India");
  const [currency, setCurrency] = useState("INR");
  const [isGstRegistered, setIsGstRegistered] = useState(false);
  const [gstin, setGstin] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [businessNature, setBusinessNature] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetForm = () => {
    setName("");
    setCountry("India");
    setRegion("India");
    setCurrency("INR");
    setIsGstRegistered(false);
    setGstin("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setState("");
    setStateCode("");
    setPostalCode("");
    setIndustryType("");
    setBusinessNature("");
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  const handleCountryChange = (val: string) => {
    setCountry(val);
    if (val === "India") {
      setRegion("India");
      setCurrency("INR");
    } else {
      setRegion("Other");
      if (val === "United States") setCurrency("USD");
      else if (val === "United Kingdom") setCurrency("GBP");
      else if (val === "United Arab Emirates") setCurrency("AED");
    }
  };

  const handleGstinChange = (val: string) => {
    const uppercase = val.toUpperCase().trim();
    setGstin(uppercase);
    if (uppercase.length >= 2) {
      const code = uppercase.substring(0, 2);
      const matched = INDIAN_STATES.find((s) => s.code === code);
      if (matched) {
        setState(matched.name);
        setStateCode(matched.code);
      }
    }
  };

  const handleStateChange = (stateName: string) => {
    setState(stateName);
    const matched = INDIAN_STATES.find((s) => s.name === stateName);
    if (matched) {
      setStateCode(matched.code);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a valid image (JPEG, PNG, or WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5MB");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    if (region === "India" && postalCode && postalCode.length !== 6) {
      toast.error("PIN code must be exactly 6 digits");
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();
      data.append("name", name.trim());
      data.append("region", region);
      data.append("country", country || (region === "India" ? "India" : "Other"));
      data.append("currency", currency);
      data.append("is_gst_registered", String(isGstRegistered));
      data.append("gstin", gstin || "");
      data.append("address_line1", addressLine1 || "");
      data.append("address_line2", addressLine2 || "");
      data.append("city", city || "");
      data.append("state", state || "");
      data.append("state_code", stateCode || "");
      data.append("postal_code", postalCode || "");
      data.append("industry_type", industryType || "");
      data.append("business_nature", businessNature || "");

      if (selectedFile) {
        data.append("logo", selectedFile);
      }

      await createOrganization(data);
      toast.success("Organization created successfully");
      resetForm();
      onClose();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.message || "Failed to create organization";
      const isLimit =
        err.response?.status === 403 &&
        (errorMsg.toLowerCase().includes("limit") ||
          errorMsg.toLowerCase().includes("plan") ||
          errorMsg.toLowerCase().includes("upgrade"));
      if (isLimit) {
        setPlanLimitError(errorMsg);
        resetForm();
        onClose();
        setIsUpgradeModalOpen(true);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Create Organization"
      maxWidthClass="max-w-[560px]"
      bodyClass="p-0 overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Logo & Primary Info */}
          <div className="flex items-start gap-4 pb-4 border-b border-border/60">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="size-16 rounded-xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/20 flex flex-col items-center justify-center cursor-pointer transition-all shrink-0 relative overflow-hidden group"
              title="Upload Organization Logo"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="size-full object-contain p-1"
                />
              ) : (
                <>
                  <Camera className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[9px] text-muted-foreground font-semibold mt-1">Logo</span>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex-1 space-y-2">
              <div className="space-y-1">
                <Label htmlFor="org-name" className="text-xs font-bold text-foreground">
                  Organization Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Country & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Country / Region</Label>
              <CountrySelect
                value={country}
                onChange={handleCountryChange}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Base Currency</Label>
              <Select
                value={currency}
                onChange={setCurrency}
                options={COMMON_CURRENCIES.map((c) => ({
                  id: c.code,
                  name: `${c.code} (${c.symbol}) - ${c.label.split(" - ")[1] || c.code}`,
                }))}
              />
            </div>
          </div>

          {/* GSTIN Toggle & Input (India) */}
          {region === "India" && (
            <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground">GST Registered</Label>
                  <p className="text-[10px] text-muted-foreground">Is this business registered under GST?</p>
                </div>
                <Switch
                  checked={isGstRegistered}
                  onCheckedChange={setIsGstRegistered}
                />
              </div>

              {isGstRegistered && (
                <div className="space-y-1 pt-2 border-t border-border/40 animate-in fade-in">
                  <Label htmlFor="org-gstin" className="text-xs font-bold text-foreground">
                    GSTIN
                  </Label>
                  <Input
                    id="org-gstin"
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                    className="h-9 font-mono uppercase text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* Address Fields */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" />
              <span>Registered Address</span>
            </Label>
            <div className="space-y-2">
              <Input
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Address line 1"
                className="h-9 text-xs"
              />
              <Input
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Address line 2 (optional)"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="h-9 text-xs"
              />
              {region === "India" ? (
                <Select
                  value={state}
                  onChange={handleStateChange}
                  placeholder="Select State"
                  options={INDIAN_STATES.map((s) => ({
                    id: s.name,
                    name: s.label,
                  }))}
                />
              ) : (
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State / Province"
                  className="h-9 text-xs"
                />
              )}
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder={region === "India" ? "PIN Code" : "Postal Code"}
                maxLength={region === "India" ? 6 : 10}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Industry Type & Nature */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Industry</Label>
              <Select
                value={industryType}
                onChange={setIndustryType}
                placeholder="Select Industry"
                options={INDUSTRY_TYPES.map((ind) => ({
                  id: ind,
                  name: ind,
                }))}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Business Nature</Label>
              <Input
                value={businessNature}
                onChange={(e) => setBusinessNature(e.target.value)}
                placeholder="e.g. Consulting, Services"
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-muted/15 border-t border-border/60 flex items-center justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading || !name.trim()}
            className="gap-1.5"
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            <span>Create Organization</span>
          </Button>
        </div>
      </form>
    </Modal>

    <UpgradePlanModal
      open={isUpgradeModalOpen}
      onClose={() => setIsUpgradeModalOpen(false)}
      title="Organization Limit Reached"
      description={planLimitError || "Free plan users can only create 1 organization. Please upgrade to the Professional plan to create additional organizations."}
    />
  </>
  );
}

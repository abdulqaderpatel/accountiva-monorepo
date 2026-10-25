import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Select } from "@/components/ui/Select";
import { GstTreatmentSelect } from "@/components/ui/GstTreatmentSelect";
import { CustomFieldRenderer } from "@/components/ui/CustomFieldRenderer";
import { UpgradePlanModal } from "@/components/ui/UpgradePlanModal";
import { User, Copy, Check, Sparkles, Building2, Globe, Mail, Phone, Hash, CreditCard, X } from "lucide-react";
import { customerSchema, COMMON_CURRENCIES } from "@accountiva/shared";
import { useCreateCustomer, useUpdateCustomer } from "@accountiva/api";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FormTab = "contact" | "address" | "accounting" | "notes" | "custom-fields";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer?: any) => void;
  customer?: any | null;
}

const PAYMENT_TERMS_OPTIONS = [
  { id: "Due on Receipt", name: "Due on Receipt" },
  { id: "Net 15", name: "Net 15" },
  { id: "Net 30", name: "Net 30" },
  { id: "Net 45", name: "Net 45" },
  { id: "Net 60", name: "Net 60" },
];

export function AddCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  customer,
}: AddCustomerModalProps) {
  const { currentOrganization } = useAuth();
  const orgCurrency = currentOrganization?.currency || "INR";
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();

  const [activeTab, setActiveTab] = useState<FormTab>("contact");
  const [name, setName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [gstTreatment, setGstTreatment] = useState("Consumer (Unregistered)");
  const [gstNumber, setGstNumber] = useState("");
  const [pan, setPan] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Due on Receipt");
  const [currency, setCurrency] = useState(orgCurrency);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [notes, setNotes] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFetchingGst, setIsFetchingGst] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isPanManuallyEdited, setIsPanManuallyEdited] = useState(false);
  const [lastAutoPan, setLastAutoPan] = useState("");

  const currencies = React.useMemo(() => {
    const list = COMMON_CURRENCIES.map((c: any) => ({ id: c.code, name: c.label }));
    if (orgCurrency && !list.some((c: any) => c.id === orgCurrency)) {
      list.unshift({ id: orgCurrency, name: `${orgCurrency} - Local Currency` });
    }
    return list;
  }, [orgCurrency]);

  const fetchNextCustomerCode = async () => {
    try {
      const res = await api.get(`/organizations/numbering-sequences/customers/next?t=${Date.now()}`);
      if (res.data?.nextCode) {
        setCustomerCode(res.data.nextCode);
      }
    } catch {
      // Fallback silent
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab("contact");
      setErrors({});
      if (customer) {
        const initialPan = customer.pan || "";
        setName(customer.name || "");
        setCustomerCode(customer.customerCode || "");
        setEmail(customer.email || "");
        setPhone(customer.phone || "");
        setCompany(customer.company || "");
        setWebsite(customer.website || "");
        setBillingAddress(customer.billingAddress || customer.address || "");
        setShippingAddress(customer.shippingAddress || "");
        setGstTreatment(customer.gstTreatment || "Consumer (Unregistered)");
        setGstNumber(customer.gstNumber || "");
        setPan(initialPan);
        setIsPanManuallyEdited(Boolean(initialPan));
        setLastAutoPan("");
        setPaymentTerms(customer.paymentTerms || "Due on Receipt");
        setCurrency(customer.currency || orgCurrency);
        setOpeningBalance(String(customer.opening_balance ?? customer.openingBalance ?? 0));
        setNotes(customer.notes || "");
        setCustomFields(customer.customFields || customer.custom_fields || {});
      } else {
        setName("");
        setCustomerCode("");
        setEmail("");
        setPhone("");
        setCompany("");
        setWebsite("");
        setBillingAddress("");
        setShippingAddress("");
        setGstTreatment("Consumer (Unregistered)");
        setGstNumber("");
        setPan("");
        setIsPanManuallyEdited(false);
        setLastAutoPan("");
        setPaymentTerms("Due on Receipt");
        setCurrency(orgCurrency);
        setOpeningBalance("0");
        setNotes("");
        setCustomFields({});
        void fetchNextCustomerCode();
      }
    }
  }, [customer, isOpen, orgCurrency]);

  // Handle GSTIN input and auto-extract PAN
  const handleGstChange = (val: string) => {
    const cleanGst = val.toUpperCase().trim();
    setGstNumber(cleanGst);

    if (cleanGst.length >= 12) {
      const extractedPan = cleanGst.substring(2, 12);
      if (!pan || !isPanManuallyEdited || pan === lastAutoPan) {
        setPan(extractedPan);
        setLastAutoPan(extractedPan);
        setIsPanManuallyEdited(false);
      }
    }
  };

  const handlePanInput = (val: string) => {
    const formatted = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    setPan(formatted);
    if (!formatted) {
      setIsPanManuallyEdited(false);
      setLastAutoPan("");
    } else {
      setIsPanManuallyEdited(true);
    }
  };

  const handleFetchGstin = async () => {
    const gstin = gstNumber.trim().toUpperCase();
    if (!gstin) {
      toast.error("Please enter a valid GSTIN first");
      return;
    }

    try {
      setIsFetchingGst(true);
      const res = await api.get(`/customers/gstin/${gstin}`);
      const data = res.data;

      if (data.name) setName(data.name);
      if (data.company) setCompany(data.company);
      if (data.address) {
        if (!billingAddress || data.source !== "decoded") {
          setBillingAddress(data.address);
        }
      }
      if (gstTreatment === "Consumer (Unregistered)") {
        setGstTreatment("Registered Business - Regular");
      }

      if (data.source === "decoded") {
        toast.info("State & entity type auto-detected!", {
          description: `${data.state} • ${data.entityType}. Trade name can be filled manually.`,
        });
      } else {
        toast.success("Business details verified from GST records!", {
          description: data.company || data.name || `Registered in ${data.state}`,
        });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Invalid GSTIN format or fetch failed";
      toast.error(errorMsg, {
        description: "Please verify the 15-character GSTIN or enter details manually.",
      });
    } finally {
      setIsFetchingGst(false);
    }
  };

  const copyBillingToShipping = () => {
    setShippingAddress(billingAddress);
    toast.success("Billing address copied to Shipping");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData = {
      name: name.trim(),
      customerCode: customerCode.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim(),
      website: website.trim(),
      address: billingAddress.trim(),
      billingAddress: billingAddress.trim(),
      shippingAddress: shippingAddress.trim(),
      gstTreatment,
      gstNumber: gstNumber.trim(),
      pan: pan.trim(),
      paymentTerms,
      currency,
      opening_balance: Number(openingBalance) || 0,
      notes: notes.trim(),
      customFields,
    };

    const result = customerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as string;
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      toast.error("Customer details validation failed", {
        description: "Please resolve the highlighted errors in the form.",
      });
      return;
    }

    try {
      let savedResult;
      if (customer?.id) {
        savedResult = await updateCustomerMutation.mutateAsync({
          id: customer.id,
          payload: formData,
        });
        toast.success("Customer updated successfully!");
      } else {
        savedResult = await createCustomerMutation.mutateAsync(formData);
        toast.success("Customer added successfully!");
      }

      onSuccess?.(savedResult);
      onClose();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.response?.data?.message || "Failed to save customer";
      toast.error(errorMsg);
      if (
        !customer?.id &&
        (errorMsg.toLowerCase().includes("limit") ||
          errorMsg.toLowerCase().includes("plan") ||
          errorMsg.toLowerCase().includes("upgrade"))
      ) {
        setIsUpgradeModalOpen(true);
      }
    }
  };

  const isSaving = createCustomerMutation.isPending || updateCustomerMutation.isPending;

  return (
    <>
      <Modal
        open={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      bodyClass="p-6 overflow-y-auto flex-1 custom-scrollbar max-h-[52vh]"
      header={
        <div className="shrink-0 border-b border-border bg-background">
          {/* Header Title Bar */}
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {customer ? "Edit Customer" : "New Customer"}
              </h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                {customer ? "Update customer billing details" : "Record a new business or consumer client"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Form Tabs Bar */}
          <div className="px-6 border-t border-border bg-muted/10 flex gap-2 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setActiveTab("contact")}
              className={cn(
                "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap cursor-pointer",
                activeTab === "contact"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Primary Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("address")}
              className={cn(
                "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap cursor-pointer",
                activeTab === "address"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Addresses
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("accounting")}
              className={cn(
                "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap cursor-pointer",
                activeTab === "accounting"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Tax & Accounting
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notes")}
              className={cn(
                "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap cursor-pointer",
                activeTab === "notes"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom-fields")}
              className={cn(
                "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap cursor-pointer",
                activeTab === "custom-fields"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Custom Fields
            </button>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={handleSubmit}
            className="gap-2 font-bold cursor-pointer"
          >
            {isSaving && <Spinner className="size-3.5" />}
            <span>{customer ? "Update Customer" : "Save Customer"}</span>
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* TAB 1: Primary Details */}
        {activeTab === "contact" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1.5">
              <Label htmlFor="custCode" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                Customer Code
              </Label>
              <Input
                id="custCode"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value.toUpperCase())}
                placeholder="Auto-generated"
                className="h-11 rounded-xl font-mono uppercase"
              />
              <p className="text-[10px] text-muted-foreground ml-1">
                Leave blank to use the next configured sequence number.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custName" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                Customer Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="custName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corporation or John Doe"
                  className={cn("h-11 rounded-xl pl-10", errors.name && "border-destructive")}
                  required
                />
              </div>
              {errors.name && (
                <p className="text-[10px] text-destructive font-semibold mt-1">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="custEmail" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="custEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="billing@company.com"
                    className={cn("h-11 rounded-xl pl-10", errors.email && "border-destructive")}
                  />
                </div>
                {errors.email && (
                  <p className="text-[10px] text-destructive font-semibold mt-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custPhone" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="custPhone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="custCompany" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                  Company / Organization
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="custCompany"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Legal trade name"
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custWebsite" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                  Website
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="custWebsite"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Addresses */}
        {activeTab === "address" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1.5">
              <Label htmlFor="custBilling" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                Billing Address
              </Label>
              <Textarea
                id="custBilling"
                rows={3}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Street address, building, suite, city, postal code..."
                className="text-xs font-sans leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="custShipping" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                  Shipping Address
                </Label>
                <button
                  type="button"
                  onClick={copyBillingToShipping}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="size-3" />
                  <span>Copy from Billing</span>
                </button>
              </div>
              <Textarea
                id="custShipping"
                rows={3}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Delivery address for physical orders and items..."
                className="text-xs font-sans leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* TAB 3: Tax & Accounting */}
        {activeTab === "accounting" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                GST Treatment
              </Label>
              <GstTreatmentSelect
                value={gstTreatment}
                onChange={setGstTreatment}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custGst" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                    GSTIN / Tax ID
                  </Label>
                  {gstNumber.trim().length >= 15 && (
                    <button
                      type="button"
                      onClick={handleFetchGstin}
                      disabled={isFetchingGst}
                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isFetchingGst ? <Spinner className="size-3" /> : <Sparkles className="size-3" />}
                      <span>Verify & Fill</span>
                    </button>
                  )}
                </div>
                <Input
                  id="custGst"
                  value={gstNumber}
                  onChange={(e) => handleGstChange(e.target.value)}
                  placeholder="27AAAAA0000A1Z5"
                  className="h-11 rounded-xl font-mono uppercase"
                  maxLength={15}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custPan" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                  PAN
                </Label>
                <Input
                  id="custPan"
                  value={pan}
                  onChange={(e) => handlePanInput(e.target.value)}
                  placeholder="AAAAA0000A"
                  className="h-11 rounded-xl font-mono uppercase"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                  Payment Terms
                </Label>
                <Select
                  value={paymentTerms}
                  onChange={setPaymentTerms}
                  options={PAYMENT_TERMS_OPTIONS}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                  Currency
                </Label>
                <Select
                  value={currency}
                  onChange={setCurrency}
                  options={currencies}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custOpeningBalance" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                Opening Balance ({currency})
              </Label>
              <Input
                id="custOpeningBalance"
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="h-11 rounded-xl font-mono"
              />
            </div>
          </div>
        )}

        {/* TAB 4: Notes */}
        {activeTab === "notes" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1.5">
              <Label htmlFor="custNotes" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                Private Internal Notes
              </Label>
              <Textarea
                id="custNotes"
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Private notes visible only to organization members (payment habits, contact preferences, special terms)..."
                className="text-xs font-sans leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* TAB 5: Custom Fields */}
        {activeTab === "custom-fields" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <CustomFieldRenderer
              entity="customer"
              value={customFields}
              onChange={setCustomFields}
            />
          </div>
        )}
      </form>
      </Modal>

      <UpgradePlanModal
        open={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        feature="customer"
      />
    </>
  );
}

export default AddCustomerModal;

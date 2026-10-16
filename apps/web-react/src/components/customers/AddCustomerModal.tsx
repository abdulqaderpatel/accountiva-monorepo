import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { GstTreatmentSelect } from "@/components/ui/GstTreatmentSelect";
import { CustomFieldRenderer } from "@/components/ui/CustomFieldRenderer";
import { Search, Building2, Check } from "lucide-react";
import { customerSchema } from "@accountiva/shared";
import { useCreateCustomer, useUpdateCustomer } from "@accountiva/api";
import api from "@/lib/api";
import { toast } from "sonner";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  customer?: any | null;
}

export function AddCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  customer,
}: AddCustomerModalProps) {
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();

  const [name, setName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [gstTreatment, setGstTreatment] = useState("Consumer");
  const [gstNumber, setGstNumber] = useState("");
  const [pan, setPan] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [notes, setNotes] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFetchingGst, setIsFetchingGst] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      setName(customer.name || "");
      setCustomerCode(customer.customerCode || "");
      setEmail(customer.email || "");
      setPhone(customer.phone || "");
      setCompany(customer.company || "");
      setGstTreatment(customer.gstTreatment || "Consumer");
      setGstNumber(customer.gstNumber || "");
      setPan(customer.pan || "");
      setBillingAddress(customer.billingAddress || customer.address || "");
      setShippingAddress(customer.shippingAddress || "");
      setSameAsBilling(
        !customer.shippingAddress || customer.shippingAddress === (customer.billingAddress || customer.address)
      );
      setNotes(customer.notes || "");
      setOpeningBalance(String(customer.opening_balance ?? customer.openingBalance ?? 0));
      setCustomFields(customer.customFields || customer.custom_fields || {});
      setErrors({});
    } else if (isOpen) {
      setName("");
      setCustomerCode("");
      setEmail("");
      setPhone("");
      setCompany("");
      setGstTreatment("Consumer");
      setGstNumber("");
      setPan("");
      setBillingAddress("");
      setShippingAddress("");
      setSameAsBilling(true);
      setNotes("");
      setOpeningBalance("0");
      setCustomFields({});
      setErrors({});
    }
  }, [customer, isOpen]);

  // Auto-extract PAN if 15-char GST entered
  const handleGstChange = (val: string) => {
    const uppercaseVal = val.toUpperCase().trim();
    setGstNumber(uppercaseVal);
    if (uppercaseVal.length >= 12 && !pan) {
      setPan(uppercaseVal.substring(2, 12));
    }
  };

  const handleFetchGstin = async () => {
    const gstin = gstNumber.trim().toUpperCase();
    if (!gstin) {
      toast.error("Please enter a GSTIN first");
      return;
    }
    try {
      setIsFetchingGst(true);
      const res = await api.get(`/customers/gstin/${gstin}`);
      const data = res.data;
      if (data.name && !name) setName(data.name);
      if (data.company) setCompany(data.company);
      if (data.address && !billingAddress) {
        setBillingAddress(data.address);
      }
      if (gstTreatment === "Consumer") {
        setGstTreatment("Registered");
      }
      if (gstin.length >= 12 && !pan) {
        setPan(gstin.substring(2, 12));
      }
      toast.success(data.company || data.name || "Business details verified!", {
        description: `Registered in ${data.state || "India"}`,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Invalid GSTIN or lookup failed", {
        description: "Please verify the 15-character GSTIN or enter details manually.",
      });
    } finally {
      setIsFetchingGst(false);
    }
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
      gstTreatment,
      gstNumber: gstNumber.trim(),
      pan: pan.trim().toUpperCase(),
      billingAddress: billingAddress.trim(),
      shippingAddress: sameAsBilling ? billingAddress.trim() : shippingAddress.trim(),
      notes: notes.trim(),
      opening_balance: Number(openingBalance) || 0,
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
      toast.error("Please fix the validation errors");
      return;
    }

    try {
      if (customer?.id) {
        await updateCustomerMutation.mutateAsync({
          id: customer.id,
          payload: formData,
        });
        toast.success("Customer updated successfully", {
          description: `${formData.name} record saved.`,
        });
      } else {
        await createCustomerMutation.mutateAsync(formData);
        toast.success("Customer added successfully", {
          description: `${formData.name} was added to your directory.`,
        });
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(customer?.id ? "Failed to update customer" : "Failed to add customer", {
        description: err.response?.data?.message || err.message,
      });
    }
  };

  const isPending = createCustomerMutation.isPending || updateCustomerMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? "Edit Customer" : "Add New Customer"}
      description="Enter customer details, tax identification, and billing addresses."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="custName">Display Name *</Label>
            <Input
              id="custName"
              placeholder="e.g. Acme Corp or John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-xs"
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custCompany">Company / Business Name</Label>
            <Input
              id="custCompany"
              placeholder="e.g. Acme Industries Ltd."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custEmail">Email Address</Label>
            <Input
              id="custEmail"
              type="email"
              placeholder="billing@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-xs"
            />
            {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custPhone">Phone Number</Label>
            <Input
              id="custPhone"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* GST & Tax Details */}
        <div className="pt-2 border-t border-border/60">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Tax & GST Treatment
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4 space-y-1.5">
              <Label htmlFor="custGstTreatment">GST Registration</Label>
              <GstTreatmentSelect
                value={gstTreatment}
                onChange={setGstTreatment}
                error={errors.gstTreatment}
              />
            </div>

            <div className="sm:col-span-5 space-y-1.5">
              <Label htmlFor="custGstNumber">GSTIN</Label>
              <div className="flex gap-1.5">
                <Input
                  id="custGstNumber"
                  placeholder="22AAAAA0000A1Z5"
                  value={gstNumber}
                  onChange={(e) => handleGstChange(e.target.value)}
                  maxLength={15}
                  className="font-mono text-xs uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFetchGstin}
                  disabled={isFetchingGst || !gstNumber.trim()}
                  className="h-9 px-2.5 text-xs gap-1 shrink-0 cursor-pointer"
                  title="Auto-fetch trade name & address from GSTIN"
                >
                  {isFetchingGst ? <Spinner size="sm" /> : <Search className="size-3.5" />}
                  <span>Lookup</span>
                </Button>
              </div>
              {errors.gstNumber && (
                <p className="text-[11px] text-destructive">{errors.gstNumber}</p>
              )}
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <Label htmlFor="custPan">PAN</Label>
              <Input
                id="custPan"
                placeholder="AAAAA0000A"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
                maxLength={10}
                className="font-mono text-xs uppercase"
              />
              {errors.pan && <p className="text-[11px] text-destructive">{errors.pan}</p>}
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="space-y-3 pt-2 border-t border-border/60">
          <div className="space-y-1.5">
            <Label htmlFor="custBillingAddress">Billing Address</Label>
            <Textarea
              id="custBillingAddress"
              placeholder="Street, City, State, PIN Code"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              className="h-16 text-xs resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <Checkbox
                checked={sameAsBilling}
                onCheckedChange={(c) => setSameAsBilling(Boolean(c))}
              />
              <span>Shipping address is same as billing address</span>
            </label>

            {!sameAsBilling && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="custShippingAddress">Shipping Address</Label>
                <Textarea
                  id="custShippingAddress"
                  placeholder="Delivery address, site location, or recipient address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="h-16 text-xs resize-none"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custNotes">Notes / Terms</Label>
            <Input
              id="custNotes"
              placeholder="Internal remarks or preferred terms"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Custom Fields */}
          <CustomFieldRenderer
            entity="customer"
            value={customFields}
            onChange={setCustomFields}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="font-bold min-w-28 cursor-pointer">
            {isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : customer ? (
              "Update Customer"
            ) : (
              "Save Customer"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

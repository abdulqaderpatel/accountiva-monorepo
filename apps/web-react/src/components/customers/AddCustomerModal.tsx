import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { customerSchema } from "@accountiva/shared";
import { useCreateCustomer } from "@accountiva/api";
import { toast } from "sonner";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCustomerModalProps) {
  const createCustomerMutation = useCreateCustomer();

  const [name, setName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [gstTreatment, setGstTreatment] = useState("Consumer");
  const [gstNumber, setGstNumber] = useState("");
  const [pan, setPan] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-extract PAN if 15-char GST entered
  const handleGstChange = (val: string) => {
    const uppercaseVal = val.toUpperCase().trim();
    setGstNumber(uppercaseVal);
    if (uppercaseVal.length >= 12 && !pan) {
      setPan(uppercaseVal.substring(2, 12));
    }
  };

  const resetForm = () => {
    setName("");
    setCustomerCode("");
    setEmail("");
    setPhone("");
    setCompany("");
    setGstTreatment("Consumer");
    setGstNumber("");
    setPan("");
    setBillingAddress("");
    setNotes("");
    setOpeningBalance("0");
    setErrors({});
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
      notes: notes.trim(),
      opening_balance: Number(openingBalance) || 0,
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
      await createCustomerMutation.mutateAsync(formData);
      toast.success("Customer added successfully", {
        description: `${formData.name} was added to your client list.`,
      });
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to add customer", {
        description: err.response?.data?.message || err.message,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Customer"
      description="Enter customer details, tax information, and contact info."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Display Name *</Label>
            <Input
              id="name"
              placeholder="e.g. John Doe or Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company">Company Name</Label>
            <Input
              id="company"
              placeholder="e.g. Acme Industries Ltd."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        {/* GST & Tax Details */}
        <div className="pt-2 border-t border-border/60">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Tax & GST Treatment
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gstTreatment">GST Registration</Label>
              <select
                id="gstTreatment"
                value={gstTreatment}
                onChange={(e) => setGstTreatment(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Consumer">Consumer (Unregistered)</option>
                <option value="Registered">Registered Business (Regular)</option>
                <option value="Composition">Composition Scheme</option>
                <option value="Overseas">Overseas (Export/SEZ)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gstNumber">GSTIN</Label>
              <Input
                id="gstNumber"
                placeholder="22AAAAA0000A1Z5"
                value={gstNumber}
                onChange={(e) => handleGstChange(e.target.value)}
                maxLength={15}
                className="font-mono text-xs uppercase"
              />
              {errors.gstNumber && (
                <p className="text-[11px] text-destructive">{errors.gstNumber}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pan">PAN</Label>
              <Input
                id="pan"
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

        {/* Address & Notes */}
        <div className="space-y-3 pt-2 border-t border-border/60">
          <div className="space-y-1.5">
            <Label htmlFor="billingAddress">Billing Address</Label>
            <Textarea
              id="billingAddress"
              placeholder="Street, City, State, PIN Code"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              className="h-16 text-xs resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Internal remarks or payment terms"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createCustomerMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createCustomerMutation.isPending}>
            {createCustomerMutation.isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              "Save Customer"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

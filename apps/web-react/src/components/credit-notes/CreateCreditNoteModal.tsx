import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { CustomFieldRenderer } from "@/components/ui/CustomFieldRenderer";
import { Trash2, Plus } from "lucide-react";
import { formatCurrency, getCurrencySymbol } from "@accountiva/shared";
import { useCreateCreditNote, useUpdateCreditNote, useCustomers, useInvoices, useItems } from "@accountiva/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface LineItemRow {
  itemId: string;
  description: string;
  quantity: number;
  rate: number;
}

interface CreateCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (creditNote?: any) => void;
  creditNoteToEdit?: any;
}

const DISCOUNT_TYPE_OPTIONS = [
  { id: "", name: "No Discount" },
  { id: "percentage", name: "Percentage (%)" },
  { id: "fixed", name: "Fixed Amount" },
];

export function CreateCreditNoteModal({
  isOpen,
  onClose,
  onSuccess,
  creditNoteToEdit,
}: CreateCreditNoteModalProps) {
  const { currentOrganization } = useAuth();
  const currencyCode = currentOrganization?.currency || "INR";
  const currencySymbol = getCurrencySymbol(currencyCode);

  const createCreditNoteMutation = useCreateCreditNote();
  const updateCreditNoteMutation = useUpdateCreditNote();
  const { data: apiCustomers } = useCustomers();
  const { data: apiInvoices } = useInvoices();
  const { data: apiItems } = useItems();

  const customerList: any[] = useMemo(() => {
    if (Array.isArray(apiCustomers) && apiCustomers.length > 0) return apiCustomers;
    if (Array.isArray(apiCustomers?.data) && apiCustomers.data.length > 0) return apiCustomers.data;
    return [];
  }, [apiCustomers]);

  const rawInvoices: any[] = useMemo(() => {
    if (Array.isArray(apiInvoices) && apiInvoices.length > 0) return apiInvoices;
    if (Array.isArray(apiInvoices?.data) && apiInvoices.data.length > 0) return apiInvoices.data;
    if (Array.isArray(apiInvoices?.invoices) && apiInvoices.invoices.length > 0) return apiInvoices.invoices;
    return [];
  }, [apiInvoices]);

  const catalogItems: any[] = useMemo(() => {
    if (Array.isArray(apiItems) && apiItems.length > 0) return apiItems;
    if (Array.isArray(apiItems?.data) && apiItems.data.length > 0) return apiItems.data;
    return [];
  }, [apiItems]);

  const [isEditing, setIsEditing] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [creditNoteNumber, setCreditNoteNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [referenceInvoiceId, setReferenceInvoiceId] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [adjustment, setAdjustment] = useState<number>(0);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  const [items, setItems] = useState<LineItemRow[]>([
    { itemId: "", description: "", quantity: 1, rate: 0 },
  ]);

  useEffect(() => {
    if (isOpen) {
      if (creditNoteToEdit) {
        setIsEditing(true);
        setCustomerId(creditNoteToEdit.customerId || "");
        setCreditNoteNumber(creditNoteToEdit.creditNoteNumber || creditNoteToEdit.number || "");
        setDate(creditNoteToEdit.date || new Date().toISOString().split("T")[0]);
        setReferenceNumber(creditNoteToEdit.referenceNumber || "");
        setReferenceInvoiceId(creditNoteToEdit.referenceInvoiceId || creditNoteToEdit.invoiceId || "");
        setBillingAddress(creditNoteToEdit.billingAddress || "");
        setNotes(creditNoteToEdit.notes || "");
        setDiscountType(creditNoteToEdit.discountType || "");
        setDiscountValue(Number(creditNoteToEdit.discountValue) || 0);
        setTaxPercent(Number(creditNoteToEdit.taxPercent) || 0);
        setAdjustment(Number(creditNoteToEdit.adjustment) || 0);
        setCustomFields(creditNoteToEdit.customFields || creditNoteToEdit.custom_fields || {});

        if (Array.isArray(creditNoteToEdit.items) && creditNoteToEdit.items.length > 0) {
          setItems(
            creditNoteToEdit.items.map((it: any) => ({
              itemId: it.itemId || it.id || "",
              description: it.description || it.itemName || "",
              quantity: Number(it.quantity) || 1,
              rate: Number(it.rate) || 0,
            }))
          );
        } else {
          setItems([{ itemId: "", description: "", quantity: 1, rate: 0 }]);
        }
      } else {
        setIsEditing(false);
        const randomNum = Math.floor(100 + Math.random() * 900);
        setCreditNoteNumber(`CN-${new Date().getFullYear()}-${randomNum}`);
        setCustomerId("");
        setDate(new Date().toISOString().split("T")[0]);
        setReferenceNumber("");
        setReferenceInvoiceId("");
        setBillingAddress("");
        setNotes("");
        setDiscountType("");
        setDiscountValue(0);
        setTaxPercent(0);
        setAdjustment(0);
        setCustomFields({});
        setItems([{ itemId: "", description: "", quantity: 1, rate: 0 }]);
      }
    }
  }, [isOpen, creditNoteToEdit]);

  // Customer Invoices for dropdown
  const customerInvoices = useMemo(() => {
    if (!customerId) return [];
    return rawInvoices
      .filter((inv) => inv.customerId === customerId)
      .map((inv) => ({
        id: inv.id,
        name: `${inv.invoiceNumber || "INV"} (${currencySymbol}${inv.amount})`,
      }));
  }, [customerId, rawInvoices, currencySymbol]);

  const handleCustomerChange = (cId: string) => {
    setCustomerId(cId);
    setReferenceInvoiceId("");
    const selected = customerList.find((c) => c.id === cId);
    if (selected) {
      setBillingAddress(selected.billingAddress || selected.address || "");
    }
  };

  const handleItemSelect = (idx: number, itId: string) => {
    const found = catalogItems.find((i) => i.id === itId);
    const updated = [...items];
    if (found) {
      updated[idx].itemId = found.id;
      updated[idx].description = found.name;
      updated[idx].rate = Number(found.sellingPrice ?? found.unitPrice ?? 0);
    } else {
      updated[idx].itemId = itId;
    }
    setItems(updated);
  };

  const addLineItem = () => {
    setItems([...items, { itemId: "", description: "", quantity: 1, rate: 0 }]);
  };

  const removeLineItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    if (!discountType || !discountValue) return 0;
    if (discountType === "percentage") {
      return (subtotal * Number(discountValue)) / 100;
    }
    return Math.min(Number(discountValue), subtotal);
  }, [subtotal, discountType, discountValue]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * Number(taxPercent || 0)) / 100;
  const grandTotal = Math.max(0, taxableAmount + taxAmount + Number(adjustment || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    if (!creditNoteNumber.trim()) {
      toast.error("Credit Note number is required");
      return;
    }

    const payload = {
      customerId,
      creditNoteNumber: creditNoteNumber.trim(),
      date,
      referenceNumber: referenceNumber.trim(),
      referenceInvoiceId: referenceInvoiceId || undefined,
      billingAddress: billingAddress.trim(),
      notes: notes.trim(),
      amount: grandTotal,
      subtotal,
      discountType,
      discountValue: Number(discountValue) || 0,
      taxPercent: Number(taxPercent) || 0,
      taxAmount,
      adjustment: Number(adjustment) || 0,
      customFields,
      items: items.map((i) => {
        const found = catalogItems.find((it) => it.id === i.itemId);
        return {
          itemId: i.itemId || undefined,
          itemName: found?.name || i.description || "Credit Item",
          description: i.description,
          quantity: Number(i.quantity) || 1,
          rate: Number(i.rate) || 0,
          amount: (Number(i.quantity) || 1) * (Number(i.rate) || 0),
        };
      }),
    };

    try {
      let result;
      if (isEditing && creditNoteToEdit?.id) {
        result = await updateCreditNoteMutation.mutateAsync({
          id: creditNoteToEdit.id,
          payload,
        });
        toast.success(`Credit Note updated successfully!`);
      } else {
        result = await createCreditNoteMutation.mutateAsync(payload);
        toast.success(`Credit Note created successfully!`);
      }

      onSuccess?.(result);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to save credit note");
    }
  };

  const isSaving = createCreditNoteMutation.isPending || updateCreditNoteMutation.isPending;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-5xl"
      bodyClass="p-6 max-h-[78vh] overflow-y-auto custom-scrollbar"
      title={isEditing ? "Edit Credit Note" : "New Credit Note"}
      description="Create a customer credit with the same details and calculations used across sales documents."
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
            <span>{isEditing ? "Update Credit Note" : "Save Credit Note"}</span>
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Form Fields (grid of 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Customer *</Label>
            <Select
              value={customerId}
              onChange={handleCustomerChange}
              placeholder="Select a customer"
              options={customerList.map((c) => ({ id: c.id, name: c.name }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cnNumber" className="text-xs font-semibold">Credit Note # *</Label>
            <Input
              id="cnNumber"
              value={creditNoteNumber}
              onChange={(e) => setCreditNoteNumber(e.target.value)}
              placeholder="e.g. CN-0001"
              className="text-xs font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Date *</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>
        </div>

        {/* Reference Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-border/60 pt-5">
          <div className="space-y-1.5">
            <Label htmlFor="cnRefNumber" className="text-xs font-semibold">Reference Number</Label>
            <Input
              id="cnRefNumber"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Optional reference number"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Reference Invoice (Optional)</Label>
            <Select
              value={referenceInvoiceId}
              onChange={setReferenceInvoiceId}
              placeholder={customerId ? "Link to customer invoice" : "Select a customer first"}
              disabled={!customerId}
              options={customerInvoices}
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border-t border-border/60 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Line Items
          </h3>
          <div className="overflow-x-auto border border-border/80 rounded-xl bg-card">
            <table className="w-full text-left border-collapse min-w-[650px] text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  <th className="py-2.5 px-4 w-1/3">Item / Service</th>
                  <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                  <th className="py-2.5 px-2 w-32 text-right">Rate ({currencySymbol})</th>
                  <th className="py-2.5 px-4 w-28 text-right">Row Total</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-3 px-4">
                      <Select
                        value={item.itemId}
                        onChange={(val) => handleItemSelect(idx, val)}
                        placeholder="Select catalog item..."
                        options={catalogItems.map((i) => ({ id: i.id, name: i.name }))}
                      />
                      <Input
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].description = e.target.value;
                          setItems(updated);
                        }}
                        placeholder="Description"
                        className="mt-2 text-xs"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].quantity = Math.max(1, Number(e.target.value) || 1);
                          setItems(updated);
                        }}
                        className="text-center w-20 mx-auto text-xs font-mono"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].rate = Math.max(0, Number(e.target.value) || 0);
                          setItems(updated);
                        }}
                        className="text-right w-32 ml-auto text-xs font-mono"
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-xs text-foreground align-middle">
                      {formatCurrency(item.quantity * item.rate, currencyCode)}
                    </td>
                    <td className="py-3 px-2 text-center align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(idx)}
                        disabled={items.length <= 1}
                        className="text-destructive hover:bg-destructive/10 rounded-lg size-8 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
            className="mt-3 gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Plus className="size-3.5" /> Add Line
          </Button>
        </div>

        {/* Calculations and Notes 2-Col Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-border/60 pt-5">
          {/* Address, Notes, Custom Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cnBilling" className="text-xs font-semibold">Billing Address</Label>
              <Textarea
                id="cnBilling"
                rows={2}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Customer billing details"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnNotes" className="text-xs font-semibold">Notes</Label>
              <Textarea
                id="cnNotes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter notes visible to the customer"
                className="text-xs"
              />
            </div>

            {/* Custom Fields */}
            <CustomFieldRenderer
              entity="credit_note"
              value={customFields}
              onChange={setCustomFields}
            />
          </div>

          {/* Totals Summary Card */}
          <div className="bg-muted/30 p-5 rounded-2xl border border-border/60 space-y-3.5 text-xs">
            <div className="flex justify-between text-muted-foreground font-semibold">
              <span>Subtotal</span>
              <span className="font-mono text-foreground font-bold">{formatCurrency(subtotal, currencyCode)}</span>
            </div>

            {/* Discount */}
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-muted-foreground font-semibold">Discount</span>
              <div className="col-span-2 flex gap-2">
                <Select
                  value={discountType}
                  onChange={setDiscountType}
                  options={DISCOUNT_TYPE_OPTIONS}
                  className="w-1/2"
                />
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                  disabled={!discountType}
                  placeholder="0"
                  className="w-1/2 text-right font-mono text-xs"
                />
              </div>
            </div>

            {/* Tax */}
            <div className="flex justify-between items-center gap-4">
              <span className="text-muted-foreground font-semibold">Tax Rate (%)</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-24 text-right font-mono text-xs"
                />
                <span className="font-mono text-muted-foreground text-[11px]">
                  ({formatCurrency(taxAmount, currencyCode)})
                </span>
              </div>
            </div>

            {/* Adjustment */}
            <div className="flex justify-between items-center gap-4">
              <span className="text-muted-foreground font-semibold">Adjustment ({currencySymbol})</span>
              <Input
                type="number"
                value={adjustment}
                onChange={(e) => setAdjustment(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-24 text-right font-mono text-xs"
              />
            </div>

            {/* Grand Total */}
            <div className="pt-3 border-t border-border/60 flex justify-between items-center text-sm font-bold text-foreground">
              <span>Total Credit Amount</span>
              <span className="font-mono text-primary text-base">
                {formatCurrency(grandTotal, currencyCode)}
              </span>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default CreateCreditNoteModal;

import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { CustomFieldRenderer } from "@/components/ui/CustomFieldRenderer";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";
import { AddItemModal } from "@/components/items/AddItemModal";
import {
  Plus,
  Trash2,
  Package,
  ChevronDown,
  ExternalLink,
  Check,
} from "lucide-react";
import { formatCurrency, getCurrencySymbol } from "@accountiva/shared";
import { useCreateInvoice, useUpdateInvoice, useCustomers, useItems } from "@accountiva/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InvoiceItemRow {
  itemId?: string;
  itemName: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invoice?: any) => void;
  invoiceToEdit?: any;
}

const DISCOUNT_TYPE_OPTIONS = [
  { id: "", name: "No Discount" },
  { id: "percentage", name: "Percentage (%)" },
  { id: "fixed", name: "Fixed Amount" },
];

export function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  invoiceToEdit,
}: CreateInvoiceModalProps) {
  const { currentOrganization } = useAuth();
  const currencyCode = currentOrganization?.currency || "INR";
  const currencySymbol = getCurrencySymbol(currencyCode);

  const createInvoiceMutation = useCreateInvoice();
  const updateInvoiceMutation = useUpdateInvoice();
  const { data: apiCustomers } = useCustomers();
  const { data: apiItems } = useItems();

  const customerList: any[] = useMemo(() => {
    if (Array.isArray(apiCustomers) && apiCustomers.length > 0) return apiCustomers;
    if (Array.isArray(apiCustomers?.data) && apiCustomers.data.length > 0) return apiCustomers.data;
    return [];
  }, [apiCustomers]);

  const catalogItems: any[] = useMemo(() => {
    if (Array.isArray(apiItems) && apiItems.length > 0) return apiItems;
    if (Array.isArray(apiItems?.data) && apiItems.data.length > 0) return apiItems.data;
    return [];
  }, [apiItems]);

  const [isEditing, setIsEditing] = useState(false);
  const [autoGenerateNumber, setAutoGenerateNumber] = useState(true);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [manualAmount, setManualAmount] = useState<number | string>(0);
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [items, setItems] = useState<InvoiceItemRow[]>([]);
  const [status, setStatus] = useState<"Draft" | "Outstanding" | "Paid">("Outstanding");
  const [notes, setNotes] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [terms, setTerms] = useState("Net 30");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  // Discounts & Taxes
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTaxesDiscounts, setShowTaxesDiscounts] = useState(false);
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(18);
  const [shippingCharges, setShippingCharges] = useState<number>(0);
  const [adjustment, setAdjustment] = useState<number>(0);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Inline Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (invoiceToEdit) {
        setIsEditing(true);
        setAutoGenerateNumber(false);
        setInvoiceNumber(invoiceToEdit.invoiceNumber || "");
        setManualAmount(Number(invoiceToEdit.amount) || 0);
        setCustomerId(invoiceToEdit.customerId || invoiceToEdit.customers?.id || "");
        setDate(invoiceToEdit.date || invoiceToEdit.issueDate || new Date().toISOString().split("T")[0]);
        setDueDate(invoiceToEdit.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
        setStatus(
          invoiceToEdit.status === "Paid"
            ? "Paid"
            : invoiceToEdit.status === "Draft"
            ? "Draft"
            : "Outstanding"
        );
        setNotes(invoiceToEdit.notes || "");
        setTermsConditions(invoiceToEdit.termsConditions || "");
        setReferenceNumber(invoiceToEdit.referenceNumber || "");
        setTerms(invoiceToEdit.terms || "Net 30");
        setBillingAddress(invoiceToEdit.billingAddress || invoiceToEdit.customers?.billingAddress || "");
        setShippingAddress(invoiceToEdit.shippingAddress || invoiceToEdit.customers?.shippingAddress || "");
        setDiscountType(invoiceToEdit.discountType || "");
        setDiscountValue(Number(invoiceToEdit.discountValue) || 0);
        setTaxPercent(Number(invoiceToEdit.taxPercent) || 0);
        setShippingCharges(Number(invoiceToEdit.shippingCharges) || 0);
        setAdjustment(Number(invoiceToEdit.adjustment) || 0);
        setCustomFields(invoiceToEdit.customFields || invoiceToEdit.custom_fields || {});

        if (Array.isArray(invoiceToEdit.items) && invoiceToEdit.items.length > 0) {
          setItems(
            invoiceToEdit.items.map((it: any) => ({
              itemId: it.itemId || it.id,
              itemName: it.itemName || it.name || "Item",
              description: it.description || "",
              quantity: Number(it.quantity) || 1,
              rate: Number(it.rate) || Number(it.unitPrice) || 0,
              amount: (Number(it.quantity) || 1) * (Number(it.rate) || Number(it.unitPrice) || 0),
            }))
          );
        } else {
          setItems([]);
        }
      } else {
        setIsEditing(false);
        setAutoGenerateNumber(true);
        setInvoiceNumber("");
        setManualAmount(0);
        setCustomerId("");
        setDate(new Date().toISOString().split("T")[0]);
        setDueDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
        setItems([]);
        setStatus("Outstanding");
        setNotes("");
        setTermsConditions("");
        setReferenceNumber("");
        setTerms("Net 30");
        setBillingAddress("");
        setShippingAddress("");
        setShowAdvanced(false);
        setShowTaxesDiscounts(false);
        setDiscountType("");
        setDiscountValue(0);
        setTaxPercent(18);
        setShippingCharges(0);
        setAdjustment(0);
        setCustomFields({});
      }
    }
  }, [isOpen, invoiceToEdit]);

  // When customer is selected, auto-fill address if available
  const handleCustomerChange = (cId: string) => {
    setCustomerId(cId);
    const selected = customerList.find((c) => c.id === cId);
    if (selected) {
      if (selected.billingAddress || selected.address) {
        setBillingAddress(selected.billingAddress || selected.address);
      }
      if (selected.shippingAddress) {
        setShippingAddress(selected.shippingAddress);
      }
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    if (items.length > 0) {
      return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }
    return Number(manualAmount) || 0;
  }, [items, manualAmount]);

  const discountAmount = useMemo(() => {
    if (!discountType || !discountValue) return 0;
    if (discountType === "percentage") {
      return (subtotal * Number(discountValue)) / 100;
    }
    return Math.min(Number(discountValue), subtotal);
  }, [subtotal, discountType, discountValue]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * Number(taxPercent || 0)) / 100;
  const grandTotal = Math.max(
    0,
    taxableAmount + taxAmount + Number(shippingCharges || 0) + Number(adjustment || 0)
  );

  // Line Item Helpers
  const addItemToInvoice = (catItem: any) => {
    const rate = Number(catItem.sellingPrice) || Number(catItem.unitPrice) || 0;
    const existingIdx = items.findIndex((it) => it.itemId === catItem.id);
    if (existingIdx >= 0) {
      const updated = [...items];
      updated[existingIdx].quantity += 1;
      updated[existingIdx].amount = updated[existingIdx].quantity * updated[existingIdx].rate;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          itemId: catItem.id,
          itemName: catItem.name,
          description: catItem.salesDescription || catItem.description || "",
          quantity: 1,
          rate,
          amount: rate,
        },
      ]);
    }
  };

  const updateItemQuantity = (index: number, newQty: number) => {
    const qty = Math.max(1, newQty);
    const updated = [...items];
    updated[index].quantity = qty;
    updated[index].amount = qty * updated[index].rate;
    setItems(updated);
  };

  const updateItemRate = (index: number, newRate: number) => {
    const rate = Math.max(0, newRate);
    const updated = [...items];
    updated[index].rate = rate;
    updated[index].amount = updated[index].quantity * rate;
    setItems(updated);
  };

  const updateItemDescription = (index: number, desc: string) => {
    const updated = [...items];
    updated[index].description = desc;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    if (!autoGenerateNumber && !invoiceNumber.trim()) {
      toast.error("Invoice number is required");
      return;
    }

    const selectedCust = customerList.find((c) => c.id === customerId);
    const payload = {
      customerId,
      customerName: selectedCust?.name || "Customer",
      invoiceNumber: autoGenerateNumber && !isEditing ? undefined : invoiceNumber.trim(),
      amount: grandTotal,
      subtotal,
      taxPercent: Number(taxPercent) || 0,
      taxAmount,
      discountType,
      discountValue: Number(discountValue) || 0,
      discountAmount,
      shippingCharges: Number(shippingCharges) || 0,
      adjustment: Number(adjustment) || 0,
      date,
      dueDate,
      status,
      notes: notes.trim(),
      termsConditions: termsConditions.trim(),
      referenceNumber: referenceNumber.trim(),
      terms: terms.trim(),
      billingAddress: billingAddress.trim(),
      shippingAddress: shippingAddress.trim(),
      customFields,
      items: items.map((i) => ({
        itemId: i.itemId,
        itemName: i.itemName,
        description: i.description,
        quantity: Number(i.quantity),
        rate: Number(i.rate),
        amount: Number(i.amount),
      })),
    };

    try {
      let result;
      if (isEditing && invoiceToEdit?.id) {
        result = await updateInvoiceMutation.mutateAsync({
          id: invoiceToEdit.id,
          payload,
        });
        toast.success(`Invoice updated successfully!`);
      } else {
        result = await createInvoiceMutation.mutateAsync(payload);
        toast.success(`Invoice created successfully!`);
      }

      onSuccess?.(result);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to save invoice");
    }
  };

  const isSaving = createInvoiceMutation.isPending || updateInvoiceMutation.isPending;

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        maxWidthClass="max-w-xl"
        bodyClass="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar"
        title={isEditing ? "Edit Invoice" : "New Invoice"}
        description="Fill out invoice details, select items, and calculate taxes."
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
              <span>{isEditing ? "Update Invoice" : "Create Invoice"}</span>
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Top 2-Column Grid: Invoice Number & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="invNumber" className="text-xs font-semibold">
                  Invoice Number <span className="text-destructive">*</span>
                </Label>
                {!isEditing && (
                  <div className="flex items-center gap-1.5 select-none">
                    <Checkbox
                      id="autoGenNumber"
                      checked={autoGenerateNumber}
                      onCheckedChange={(val) => setAutoGenerateNumber(Boolean(val))}
                    />
                    <Label htmlFor="autoGenNumber" className="text-[11px] text-muted-foreground font-normal cursor-pointer select-none">
                      Auto-generate
                    </Label>
                  </div>
                )}
              </div>
              <Input
                id="invNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                disabled={autoGenerateNumber && !isEditing}
                placeholder={autoGenerateNumber && !isEditing ? "Auto-generated sequence" : "INV-001"}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invAmount" className="text-xs font-semibold">
                Total Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-medium text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  id="invAmount"
                  type="number"
                  value={items.length > 0 ? grandTotal.toFixed(2) : manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  disabled={items.length > 0}
                  placeholder="0.00"
                  className="pl-7 font-mono text-xs"
                />
              </div>
              {items.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Computed dynamically from {items.length} line item(s).
                </p>
              )}
            </div>
          </div>

          {/* Customer Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Customer <span className="text-destructive">*</span>
              </Label>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(true)}
                className="text-xs font-medium text-primary flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus className="size-3" /> New Customer
              </button>
            </div>
            <Select
              value={customerId}
              onChange={handleCustomerChange}
              placeholder="Select a client..."
              options={customerList.map((c) => ({
                id: c.id,
                name: `${c.name}${c.company ? ` (${c.company})` : ""}`,
              }))}
            />
          </div>

          {/* Dates 2-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Invoice Date</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Due Date</Label>
              <DatePicker value={dueDate} onChange={setDueDate} />
            </div>
          </div>

          {/* Selected Items List */}
          {items.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label className="text-xs font-semibold">Selected Line Items ({items.length})</Label>
              <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border/60 bg-card">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="font-semibold truncate text-foreground text-xs">{item.itemName}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">Rate {currencySymbol}</span>
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItemRate(idx, Number(e.target.value) || 0)}
                          min={0}
                          step="any"
                          className="w-24 h-7 text-xs font-mono"
                        />
                        <span className="text-[11px] text-muted-foreground ml-1">each</span>
                      </div>
                      <Input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItemDescription(idx, e.target.value)}
                        placeholder="Description or notes for this line..."
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-border rounded-lg bg-background overflow-hidden h-7">
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(idx, item.quantity - 1)}
                          className="px-2 text-muted-foreground hover:bg-muted text-xs font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(idx, Number(e.target.value) || 1)}
                          min={1}
                          className="w-10 text-center h-full bg-transparent border-none focus:outline-none text-xs font-mono font-medium text-foreground [appearance:textfield] border-x border-border"
                        />
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(idx, item.quantity + 1)}
                          className="px-2 text-muted-foreground hover:bg-muted text-xs font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <div className="w-20 text-right font-mono font-semibold text-xs text-foreground">
                        {formatCurrency(item.amount, currencyCode)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catalog Selector */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Select from Catalog</Label>
              <button
                type="button"
                onClick={() => setIsAddItemOpen(true)}
                className="text-xs font-medium text-primary flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus className="size-3" /> New Item
              </button>
            </div>

            {catalogItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {catalogItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => addItemToInvoice(item)}
                    className="p-2.5 bg-card/60 rounded-xl border border-border/80 flex items-center justify-between hover:bg-muted/50 hover:border-primary/40 transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Package className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {formatCurrency(Number(item.sellingPrice ?? item.unitPrice ?? 0), currencyCode)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary font-medium">
                      <Plus className="size-3.5" />
                      <span>Add</span>
                    </div>
                  </div>
                ))}

                {catalogItems.length > 3 && (
                  <p className="text-[11px] text-center text-muted-foreground italic">
                    +{catalogItems.length - 3} more items in catalog
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-5 border-2 border-dashed border-border/60 rounded-xl">
                <Package className="size-7 mx-auto mb-1.5 text-muted-foreground/40" />
                <p className="text-xs font-medium text-muted-foreground">No catalog items found</p>
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(true)}
                  className="text-xs font-medium text-primary mt-1 hover:underline cursor-pointer"
                >
                  Create your first product or service
                </button>
              </div>
            )}
          </div>

          {/* Section 1: Additional Information Collapsible */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-card/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-xs font-semibold text-foreground cursor-pointer"
            >
              <span>Additional Information (Addresses, PO, Terms)</span>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200 text-muted-foreground",
                  showAdvanced && "rotate-180"
                )}
              />
            </button>
            {showAdvanced && (
              <div className="p-4 space-y-4 border-t border-border/80 bg-background/50 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Reference Number / PO</Label>
                    <Input
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="PO-2026-001"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Payment Terms</Label>
                    <Input
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      placeholder="Net 30"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Billing Address</Label>
                    <Textarea
                      rows={2}
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      placeholder="Street, City, State, PIN"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Shipping Address</Label>
                    <Textarea
                      rows={2}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Street, City, State, PIN"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Customer Notes</Label>
                    <Textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes visible on the invoice PDF..."
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Terms & Conditions</Label>
                    <Textarea
                      rows={2}
                      value={termsConditions}
                      onChange={(e) => setTermsConditions(e.target.value)}
                      placeholder="Standard legal or bank wire terms..."
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Discounts, Taxes & Charges Collapsible */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-card/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setShowTaxesDiscounts(!showTaxesDiscounts)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-xs font-semibold text-foreground cursor-pointer"
            >
              <span>Discounts, Taxes & Adjustments</span>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200 text-muted-foreground",
                  showTaxesDiscounts && "rotate-180"
                )}
              />
            </button>
            {showTaxesDiscounts && (
              <div className="p-4 space-y-4 border-t border-border/80 bg-background/50 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Discount Type</Label>
                    <Select
                      value={discountType}
                      onChange={setDiscountType}
                      options={DISCOUNT_TYPE_OPTIONS}
                    />
                  </div>
                  {Boolean(discountType) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Discount Value ({discountType === "percentage" ? "%" : currencySymbol})
                      </Label>
                      <Input
                        type="number"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="text-xs font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">GST / Tax Percent (%)</Label>
                    <Input
                      type="number"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                      placeholder="18"
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Shipping Charges ({currencySymbol})</Label>
                    <Input
                      type="number"
                      value={shippingCharges}
                      onChange={(e) => setShippingCharges(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Adjustment ({currencySymbol})</Label>
                    <Input
                      type="number"
                      value={adjustment}
                      onChange={(e) => setAdjustment(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-end pt-2 pr-1 space-y-1 text-right text-xs">
                  <p className="text-muted-foreground">
                    Calculated Tax:{" "}
                    <span className="font-mono text-foreground font-semibold">
                      {formatCurrency(taxAmount, currencyCode)}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Calculated Discount:{" "}
                    <span className="font-mono text-foreground font-semibold">
                      {formatCurrency(discountAmount, currencyCode)}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Custom Fields */}
          <CustomFieldRenderer
            entity="invoice"
            value={customFields}
            onChange={setCustomFields}
          />

          {/* Status Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Invoice Status</Label>
            <div className="flex p-1 bg-muted/60 border border-border/80 rounded-xl text-xs font-medium gap-1">
              {(["Draft", "Outstanding", "Paid"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    status === s
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Inline Customer Creation Modal */}
      {isAddCustomerOpen && (
        <AddCustomerModal
          isOpen={isAddCustomerOpen}
          onClose={() => setIsAddCustomerOpen(false)}
          onSuccess={(newCust) => {
            if (newCust?.id) {
              setCustomerId(newCust.id);
            }
            setIsAddCustomerOpen(false);
          }}
        />
      )}

      {/* Inline Catalog Item Creation Modal */}
      {isAddItemOpen && (
        <AddItemModal
          isOpen={isAddItemOpen}
          onClose={() => setIsAddItemOpen(false)}
          onSuccess={() => setIsAddItemOpen(false)}
        />
      )}
    </>
  );
}

export default CreateInvoiceModal;

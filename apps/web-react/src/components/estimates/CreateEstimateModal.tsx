import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import {
  ESTIMATE_STATUSES,
  calculateDocumentTotals,
  formatCurrency,
  getCurrencySymbol,
  isDuplicateDocumentNumberError,
  validateFinancialDocumentDates,
  validateFinancialLineItems,
  type EstimatePayload,
  type EstimateStatus,
} from "@accountiva/shared";
import {
  fetchNextEstimateNumber,
  useCreateEstimate,
  useUpdateEstimate,
  useCustomers,
  useItems,
} from "@accountiva/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EstimateItemRow {
  id?: string;
  itemId?: string;
  itemName: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface CreateEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (estimate?: any) => void;
  estimateToEdit?: any;
}

const DISCOUNT_TYPE_OPTIONS = [
  { id: "", name: "No Discount" },
  { id: "percentage", name: "Percentage (%)" },
  { id: "fixed", name: "Fixed Amount" },
];

const today = () => new Date().toISOString().split("T")[0];
const defaultExpiryDate = () =>
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

export function CreateEstimateModal({
  isOpen,
  onClose,
  onSuccess,
  estimateToEdit,
}: CreateEstimateModalProps) {
  const { currentOrganization } = useAuth();
  const currencyCode = currentOrganization?.currency || "INR";
  const currencySymbol = getCurrencySymbol(currencyCode);

  const createEstimateMutation = useCreateEstimate();
  const updateEstimateMutation = useUpdateEstimate();
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
  const [estimateNumber, setEstimateNumber] = useState("");
  const [isNumberLoading, setIsNumberLoading] = useState(false);
  const [numberError, setNumberError] = useState("");
  const numberRequestRef = useRef(0);
  const [manualAmount, setManualAmount] = useState<number | string>(0);
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(today());
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate());
  const [items, setItems] = useState<EstimateItemRow[]>([]);
  const [status, setStatus] = useState<EstimateStatus>("Draft");
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
  const [packagingCharges, setPackagingCharges] = useState<number>(0);
  const [autoRoundOff, setAutoRoundOff] = useState<boolean>(true);
  const [roundOff, setRoundOff] = useState<number>(0);
  const [adjustment, setAdjustment] = useState<number>(0);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Inline Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  const loadNextEstimateNumber = useCallback(async () => {
    const requestId = ++numberRequestRef.current;
    setIsNumberLoading(true);
    setNumberError("");
    try {
      const nextNumber = await fetchNextEstimateNumber();
      if (numberRequestRef.current === requestId) {
        setEstimateNumber(nextNumber);
      }
      return nextNumber;
    } catch (error: any) {
      if (numberRequestRef.current === requestId) {
        setEstimateNumber("");
        setNumberError(
          error.response?.data?.error ||
            error.message ||
            "Could not load the next estimate number.",
        );
      }
      return null;
    } finally {
      if (numberRequestRef.current === requestId) {
        setIsNumberLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (estimateToEdit) {
        numberRequestRef.current += 1;
        setIsNumberLoading(false);
        setNumberError("");
        setIsEditing(true);
        setEstimateNumber(estimateToEdit.estimateNumber || estimateToEdit.number || "");
        setManualAmount(Number(estimateToEdit.amount) || 0);
        setCustomerId(estimateToEdit.customerId || estimateToEdit.customers?.id || "");
        setDate(estimateToEdit.date || estimateToEdit.issueDate || today());
        setExpiryDate(estimateToEdit.expiryDate || defaultExpiryDate());
        setStatus(
          ESTIMATE_STATUSES.includes(estimateToEdit.status as EstimateStatus)
            ? estimateToEdit.status
            : "Draft",
        );
        setNotes(estimateToEdit.notes || "");
        setTermsConditions(estimateToEdit.termsConditions || "");
        setReferenceNumber(estimateToEdit.referenceNumber || "");
        setTerms(estimateToEdit.terms || "Net 30");
        setBillingAddress(estimateToEdit.billingAddress || estimateToEdit.customers?.billingAddress || "");
        setShippingAddress(estimateToEdit.shippingAddress || estimateToEdit.customers?.shippingAddress || "");
        setDiscountType(estimateToEdit.discountType || "");
        setDiscountValue(Number(estimateToEdit.discountValue) || 0);
        setTaxPercent(Number(estimateToEdit.taxPercent) || 0);
        setShippingCharges(Number(estimateToEdit.shippingCharges) || 0);
        setPackagingCharges(Number((estimateToEdit as any).packagingCharges || (estimateToEdit as any).packaging_charges) || 0);
        setRoundOff(Number((estimateToEdit as any).roundOff ?? estimateToEdit.adjustment) || 0);
        setAdjustment(Number((estimateToEdit as any).roundOff ?? estimateToEdit.adjustment) || 0);
        setCustomFields(estimateToEdit.customFields || estimateToEdit.custom_fields || {});

        if (Array.isArray(estimateToEdit.items) && estimateToEdit.items.length > 0) {
          setItems(
            estimateToEdit.items.map((it: any) => ({
              id: it.id,
              itemId: it.itemId,
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
        setEstimateNumber("");
        setNumberError("");
        setManualAmount(0);
        setCustomerId("");
        setDate(today());
        setExpiryDate(defaultExpiryDate());
        setItems([]);
        setStatus("Draft");
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
        void loadNextEstimateNumber();
      }
    }
    return () => {
      numberRequestRef.current += 1;
    };
  }, [isOpen, estimateToEdit, loadNextEstimateNumber]);

  // When customer changes, auto-fill address
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

  // Calculations using core accounting engine
  const totals = useMemo(() => {
    return calculateDocumentTotals({
      items,
      manualAmount,
      discountType,
      discountValue,
      taxPercent,
      shippingCharges,
      packagingCharges,
      roundOff,
      autoRoundOff,
      adjustment,
    });
  }, [items, manualAmount, discountType, discountValue, taxPercent, shippingCharges, packagingCharges, roundOff, autoRoundOff, adjustment]);

  const {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total: grandTotal,
  } = totals;

  // Line item helpers
  const addItemToEstimate = (catItem: any) => {
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

    if (!estimateNumber.trim()) {
      toast.error("Estimate number is required");
      return;
    }

    const itemError = validateFinancialLineItems(items);
    if (itemError) {
      toast.error(itemError);
      return;
    }

    const dateError = validateFinancialDocumentDates(date, expiryDate, "Expiry date");
    if (dateError) {
      toast.error(dateError);
      return;
    }

    if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
      toast.error("Estimate total must be greater than zero");
      return;
    }

    const payload: EstimatePayload = {
      customerId,
      estimateNumber: estimateNumber.trim(),
      amount: grandTotal,
      taxPercent: Number(taxPercent) || 0,
      taxAmount,
      discountType,
      discountValue: Number(discountValue) || 0,
      discountAmount,
      shippingCharges: Number(shippingCharges) || 0,
      packagingCharges: Number(packagingCharges) || 0,
      roundOff: totals.roundOff,
      adjustment: totals.roundOff,
      date,
      expiryDate,
      status,
      notes: notes.trim(),
      termsConditions: termsConditions.trim(),
      referenceNumber: referenceNumber.trim(),
      terms: terms.trim(),
      billingAddress: billingAddress.trim(),
      shippingAddress: shippingAddress.trim(),
      customFields,
      items: items.map((i) => ({
        id: i.id,
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
      if (isEditing && estimateToEdit?.id) {
        result = await updateEstimateMutation.mutateAsync({
          id: estimateToEdit.id,
          payload,
        });
        toast.success(`Estimate updated successfully!`);
      } else {
        result = await createEstimateMutation.mutateAsync(payload);
        toast.success(`Estimate created successfully!`);
      }

      onSuccess?.(result);
      onClose();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to save estimate";
      if (!isEditing && isDuplicateDocumentNumberError(err)) {
        toast.error(message, {
          description: "Your entries were kept and a fresh estimate number is being loaded.",
        });
        await loadNextEstimateNumber();
        return;
      }
      toast.error(message);
    }
  };

  const isSaving = createEstimateMutation.isPending || updateEstimateMutation.isPending;
  const isNumberUnresolved = !isEditing && (isNumberLoading || !estimateNumber.trim());

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        maxWidthClass="max-w-xl"
        bodyClass="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar"
        title={isEditing ? "Edit Estimate" : "New Estimate"}
        description="Prepare a quotation with pricing, line items, and terms."
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
              disabled={isSaving || isNumberUnresolved}
              onClick={handleSubmit}
              className="gap-2 font-bold cursor-pointer"
            >
              {isSaving && <Spinner className="size-3.5" />}
              <span>{isEditing ? "Update Estimate" : "Create Estimate"}</span>
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Top 2-Column Grid: Estimate Number & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="estNumber" className="text-xs font-semibold">
                Estimate Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="estNumber"
                value={estimateNumber}
                onChange={(e) => setEstimateNumber(e.target.value)}
                placeholder="EST-001"
                className="font-mono text-xs"
                required
              />
              {!isEditing && isNumberLoading && (
                <p className="text-[10px] text-muted-foreground">Loading the next estimate number...</p>
              )}
              {!isEditing && numberError && (
                <div className="flex items-center justify-between gap-2 text-[10px] text-destructive">
                  <span>{numberError}</span>
                  <button
                    type="button"
                    onClick={() => void loadNextEstimateNumber()}
                    className="font-semibold underline underline-offset-2"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estAmount" className="text-xs font-semibold">
                Estimate Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-medium text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  id="estAmount"
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
              placeholder="Select a client for quotation..."
              options={customerList.map((c) => ({
                id: c.id,
                name: `${c.name}${c.company ? ` (${c.company})` : ""}`,
              }))}
            />
          </div>

          {/* Dates 2-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Estimate Date</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Expiry Date</Label>
              <DatePicker value={expiryDate} onChange={setExpiryDate} />
            </div>
          </div>

          {/* Selected Items List */}
          {items.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label className="text-xs font-semibold">Selected Quote Items ({items.length})</Label>
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
                        placeholder="Description or scope of work..."
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
                        title="Remove line"
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
                    onClick={() => addItemToEstimate(item)}
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
                    <Label className="text-xs font-medium">Reference Number / RFP</Label>
                    <Input
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="RFQ-2026-001"
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
                    <Label className="text-xs font-medium">Client Notes</Label>
                    <Textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes visible on the quote..."
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Terms & Conditions</Label>
                    <Textarea
                      rows={2}
                      value={termsConditions}
                      onChange={(e) => setTermsConditions(e.target.value)}
                      placeholder="Quotation validity, warranties, or payment conditions..."
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
                    <Label className="text-xs font-medium">Tax Percent (%)</Label>
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
                    <Label className="text-xs font-medium">Packaging Charges ({currencySymbol})</Label>
                    <Input
                      type="number"
                      value={packagingCharges}
                      onChange={(e) => setPackagingCharges(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Round Off ({currencySymbol})</Label>
                      <button
                        type="button"
                        onClick={() => setAutoRoundOff((prev) => !prev)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                          autoRoundOff
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Auto {autoRoundOff ? "ON" : "OFF"}
                      </button>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={autoRoundOff ? totals.roundOff : roundOff}
                      disabled={autoRoundOff}
                      onChange={(e) => setRoundOff(Number(e.target.value) || 0)}
                      placeholder="0.00"
                      className="text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Estimate Live Breakdown Card */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between font-medium text-muted-foreground">
              <span>Line Items Subtotal</span>
              <span className="font-mono text-foreground font-semibold">
                {formatCurrency(subtotal, currencyCode)}
              </span>
            </div>

            {Boolean(discountType && discountAmount > 0) && (
              <div className="flex items-center justify-between font-medium text-emerald-600 dark:text-emerald-400">
                <span>
                  Discount {discountType === "percentage" ? `(${discountValue}%)` : "(Fixed)"}
                </span>
                <span className="font-mono font-semibold">
                  -{formatCurrency(discountAmount, currencyCode)}
                </span>
              </div>
            )}

            {Boolean(discountType && discountAmount > 0) && (
              <div className="flex items-center justify-between font-medium text-muted-foreground">
                <span>Taxable Base</span>
                <span className="font-mono text-foreground">
                  {formatCurrency(taxableAmount, currencyCode)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between font-medium text-muted-foreground">
              <span>GST / Tax ({taxPercent || 0}%)</span>
              <span className="font-mono text-foreground font-semibold">
                {formatCurrency(taxAmount, currencyCode)}
              </span>
            </div>

            {Number(shippingCharges) > 0 && (
              <div className="flex items-center justify-between font-medium text-muted-foreground">
                <span>Shipping Charges</span>
                <span className="font-mono text-foreground font-semibold">
                  +{formatCurrency(Number(shippingCharges), currencyCode)}
                </span>
              </div>
            )}

            {Number(packagingCharges) > 0 && (
              <div className="flex items-center justify-between font-medium text-muted-foreground">
                <span>Packaging Charges</span>
                <span className="font-mono text-foreground font-semibold">
                  +{formatCurrency(Number(packagingCharges), currencyCode)}
                </span>
              </div>
            )}

            {totals.roundOff !== 0 && (
              <div className="flex items-center justify-between font-medium text-muted-foreground">
                <span>Round Off</span>
                <span className="font-mono text-foreground font-semibold">
                  {totals.roundOff > 0 ? "+" : ""}
                  {formatCurrency(totals.roundOff, currencyCode)}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-between font-bold text-sm text-foreground">
              <span>Total Estimate Amount</span>
              <span className="font-mono text-primary text-base">
                {formatCurrency(grandTotal, currencyCode)}
              </span>
            </div>
          </div>

          {/* Section 3: Custom Fields */}
          <CustomFieldRenderer
            entity="estimate"
            value={customFields}
            onChange={setCustomFields}
          />

          {/* Status Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Quotation Status</Label>
            <div className="flex p-1 bg-muted/60 border border-border/80 rounded-xl text-xs font-medium gap-1">
              {ESTIMATE_STATUSES.map((s) => (
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

export default CreateEstimateModal;

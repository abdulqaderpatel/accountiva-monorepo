import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/ui/DatePicker";
import { CustomFieldRenderer } from "@/components/ui/CustomFieldRenderer";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@accountiva/shared";
import { useCreateInvoice, useUpdateInvoice, useCustomers, useItems } from "@accountiva/api";
import { toast } from "sonner";

interface LineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  invoiceToEdit?: any;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  invoiceToEdit,
}: CreateInvoiceModalProps) {
  const createInvoiceMutation = useCreateInvoice();
  const updateInvoiceMutation = useUpdateInvoice();
  const { data: apiCustomers } = useCustomers();
  const { data: apiItems } = useItems();

  const customerList: any[] = React.useMemo(() => {
    if (Array.isArray(apiCustomers) && apiCustomers.length > 0) return apiCustomers;
    if (Array.isArray(apiCustomers?.data) && apiCustomers.data.length > 0) return apiCustomers.data;
    return [];
  }, [apiCustomers]);

  const catalogItems: any[] = React.useMemo(() => {
    if (Array.isArray(apiItems) && apiItems.length > 0) return apiItems;
    if (Array.isArray(apiItems?.data) && apiItems.data.length > 0) return apiItems.data;
    return [];
  }, [apiItems]);

  const [customerName, setCustomerName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(18); // Default 18% GST
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  const [items, setItems] = useState<LineItem[]>([
    {
      id: "1",
      name: "",
      description: "",
      quantity: 1,
      rate: 0,
    },
  ]);

  React.useEffect(() => {
    if (invoiceToEdit && isOpen) {
      setCustomerName(invoiceToEdit.customerName || invoiceToEdit.customers?.name || "");
      setInvoiceNumber(invoiceToEdit.invoiceNumber || "");
      setInvoiceDate(invoiceToEdit.date || invoiceToEdit.issueDate || new Date().toISOString().split("T")[0]);
      setDueDate(invoiceToEdit.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
      setNotes(invoiceToEdit.notes || "");
      setTaxRate(Number(invoiceToEdit.taxPercent) || 18);
      setCustomFields(invoiceToEdit.customFields || {});
      if (Array.isArray(invoiceToEdit.items) && invoiceToEdit.items.length > 0) {
        setItems(
          invoiceToEdit.items.map((it: any, idx: number) => ({
            id: String(idx + 1),
            name: it.itemName || it.name || "",
            description: it.description || "",
            quantity: Number(it.quantity) || 1,
            rate: Number(it.rate) || 0,
          }))
        );
      }
    } else if (!invoiceToEdit && isOpen) {
      setCustomerName("");
      setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setInvoiceDate(new Date().toISOString().split("T")[0]);
      setDueDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
      setNotes("");
      setTaxRate(18);
      setCustomFields({});
      setItems([{ id: "1", name: "", description: "", quantity: 1, rate: 0 }]);
    }
  }, [invoiceToEdit, isOpen]);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        name: "",
        description: "",
        quantity: 1,
        rate: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      toast.error("At least one line item is required");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<LineItem>) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleSelectItemFromCatalog = (id: string, selectedCatalogName: string) => {
    const found = catalogItems.find((i) => i.name === selectedCatalogName);
    if (found) {
      updateItem(id, {
        name: found.name,
        description: found.description || "",
        rate: Number(found.sellingPrice) || Number(found.unitPrice) || 0,
      });
    } else {
      updateItem(id, { name: selectedCatalogName });
    }
  };

  const subtotal = items.reduce(
    (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
    0
  );
  const taxAmount = (subtotal * taxRate) / 100;
  const grandTotal = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!invoiceNumber.trim()) {
      toast.error("Invoice number is required");
      return;
    }

    const invalidItem = items.find((i) => !i.name.trim() || Number(i.rate) <= 0);
    if (invalidItem) {
      toast.error("All items must have a name and rate greater than 0");
      return;
    }

    try {
      const payload = {
        invoiceNumber,
        customerName,
        date: invoiceDate,
        dueDate,
        amount: grandTotal,
        subtotal,
        taxPercent: taxRate,
        taxAmount,
        notes,
        status: invoiceToEdit?.status || "Draft",
        customFields,
        items: items.map((i) => ({
          itemName: i.name,
          description: i.description,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          amount: Number(i.quantity) * Number(i.rate),
        })),
      };

      if (invoiceToEdit?.id) {
        await updateInvoiceMutation.mutateAsync({ id: invoiceToEdit.id, payload });
        toast.success(`Invoice ${invoiceNumber} updated successfully!`);
      } else {
        await createInvoiceMutation.mutateAsync(payload);
        toast.success(`Invoice ${invoiceNumber} created successfully!`);
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error("Failed to save invoice", {
        description: error.response?.data?.message || error.message,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Invoice"
      description="Issue a new invoice with itemized line entries and taxes."
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer *</Label>
            <div className="relative">
              <Input
                id="customerName"
                list="customers-datalist"
                placeholder="Select or type customer name..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
              <datalist id="customers-datalist">
                {customerList.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number *</Label>
            <Input
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Invoice Date</Label>
            <DatePicker
              value={invoiceDate}
              onChange={setInvoiceDate}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
            />
          </div>
        </div>

        {/* Items Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Line Items
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="h-8 gap-1.5 text-xs rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>

          <datalist id="catalog-items-datalist">
            {catalogItems.map((item) => (
              <option key={item.id} value={item.name} />
            ))}
          </datalist>

          <div className="space-y-2.5">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2.5 items-center p-3 rounded-xl border border-border/60 bg-muted/20"
              >
                <div className="col-span-12 sm:col-span-5 space-y-1">
                  <Input
                    list="catalog-items-datalist"
                    placeholder="Search catalog or type item..."
                    value={item.name}
                    onChange={(e) => handleSelectItemFromCatalog(item.id, e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={item.description || ""}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    className="h-8 text-xs text-muted-foreground"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })
                    }
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Rate (₹)"
                    value={item.rate || ""}
                    onChange={(e) =>
                      updateItem(item.id, { rate: Number(e.target.value) || 0 })
                    }
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="col-span-3 sm:col-span-2 text-right">
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {formatCurrency((Number(item.quantity) || 0) * (Number(item.rate) || 0))}
                  </span>
                </div>

                <div className="col-span-1 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Breakdown Summary */}
        <div className="flex justify-end pt-2 border-t border-border/60">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono text-foreground font-semibold">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">GST Tax Rate</span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                  className="w-16 h-7 text-xs text-right font-mono"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>

            <div className="flex justify-between text-muted-foreground">
              <span>Tax Amount</span>
              <span className="font-mono text-foreground font-semibold">{formatCurrency(taxAmount)}</span>
            </div>

            <div className="flex justify-between pt-2 border-t border-border/60 text-sm font-bold text-foreground">
              <span>Total Amount</span>
              <span className="font-mono text-primary font-black">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Custom Fields */}
        <CustomFieldRenderer
          entity="invoice"
          value={customFields}
          onChange={setCustomFields}
        />

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Terms & Notes</Label>
          <Textarea
            id="notes"
            placeholder="Payment instructions, bank transfer details, or thank you note..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Footer CTAs */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createInvoiceMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createInvoiceMutation.isPending}
            className="font-bold shadow-xs min-w-28"
          >
            {createInvoiceMutation.isPending ? (
              <Spinner size="sm" />
            ) : (
              "Save & Issue"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

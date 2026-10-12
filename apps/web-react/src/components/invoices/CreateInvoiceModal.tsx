import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@accountiva/shared";
import { useCreateInvoice } from "@accountiva/api";
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
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateInvoiceModalProps) {
  const createInvoiceMutation = useCreateInvoice();

  const [customerName, setCustomerName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(18); // Default 18% GST

  const [items, setItems] = useState<LineItem[]>([
    {
      id: "1",
      name: "",
      description: "",
      quantity: 1,
      rate: 0,
    },
  ]);

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
      await createInvoiceMutation.mutateAsync({
        invoiceNumber,
        customerName,
        date: invoiceDate,
        dueDate,
        amount: grandTotal,
        subtotal,
        taxPercent: taxRate,
        taxAmount,
        notes,
        status: "Draft",
        items: items.map((i) => ({
          itemName: i.name,
          description: i.description,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          amount: Number(i.quantity) * Number(i.rate),
        })),
      });

      toast.success("Invoice created successfully!", {
        description: `Invoice ${invoiceNumber} saved.`,
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error("Failed to create invoice", {
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
            <Input
              id="customerName"
              placeholder="e.g. Acme Corp or John Doe"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
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
            <Label htmlFor="invoiceDate">Invoice Date *</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Line Items Section */}
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

          <div className="space-y-2.5">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2.5 items-center p-3 rounded-xl border border-border/60 bg-muted/20"
              >
                <div className="col-span-12 sm:col-span-5 space-y-1">
                  <Input
                    placeholder="Item / Service Name"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
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
                    placeholder="Rate"
                    value={item.rate || ""}
                    onChange={(e) =>
                      updateItem(item.id, { rate: Math.max(0, Number(e.target.value)) })
                    }
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="col-span-3 sm:col-span-2 text-right font-medium text-xs font-mono">
                  {formatCurrency((Number(item.quantity) || 0) * (Number(item.rate) || 0))}
                </div>

                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals & Notes Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-border/60">
          <div className="space-y-2">
            <Label htmlFor="notes">Customer Notes & Payment Instructions</Label>
            <Textarea
              id="notes"
              placeholder="e.g. Thanks for your business. Please pay via UPI or Bank Transfer."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none h-24"
            />
          </div>

          <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/60">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono font-medium text-foreground">
                {formatCurrency(subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span>Tax Rate</span>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                >
                  <option value={0}>0% (Tax Exempt)</option>
                  <option value={5}>5% GST</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST (Standard)</option>
                  <option value={28}>28% GST</option>
                </select>
              </div>
              <span className="font-mono font-medium text-foreground">
                {formatCurrency(taxAmount)}
              </span>
            </div>

            <div className="border-t border-border/60 pt-2 flex justify-between text-sm font-semibold text-foreground">
              <span>Total Amount</span>
              <span className="font-mono text-primary text-base">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
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
            className="gap-2"
          >
            {createInvoiceMutation.isPending ? (
              <>
                <Spinner size="sm" />
                Saving...
              </>
            ) : (
              "Save Invoice"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

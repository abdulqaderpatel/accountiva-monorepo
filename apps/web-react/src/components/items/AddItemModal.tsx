import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { itemSchema } from "@accountiva/shared";
import { useCreateItem } from "@accountiva/api";
import { toast } from "sonner";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddItemModal({ isOpen, onClose, onSuccess }: AddItemModalProps) {
  const createItemMutation = useCreateItem();

  const [name, setName] = useState("");
  const [type, setType] = useState<"Product" | "Service">("Product");
  const [productType, setProductType] = useState<"Inventory" | "Non-Inventory">("Inventory");
  const [sku, setSku] = useState("");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [costPrice, setCostPrice] = useState("0");
  const [salesTaxRate, setSalesTaxRate] = useState(18);
  const [openingStock, setOpeningStock] = useState("0");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName("");
    setType("Product");
    setProductType("Inventory");
    setSku("");
    setSellingPrice("0");
    setCostPrice("0");
    setSalesTaxRate(18);
    setOpeningStock("0");
    setDescription("");
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData = {
      name: name.trim(),
      type,
      productType: type === "Product" ? productType : null,
      sku: sku.trim(),
      sellingPrice: Number(sellingPrice) || 0,
      unitPrice: Number(sellingPrice) || 0,
      costPrice: Number(costPrice) || 0,
      salesTaxRate: Number(salesTaxRate) || 0,
      openingStock: type === "Product" && productType === "Inventory" ? Number(openingStock) || 0 : undefined,
      description: description.trim(),
      isSellable: true,
      isPurchasable: true,
    };

    const result = itemSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as string;
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      toast.error("Please resolve the validation errors");
      return;
    }

    try {
      await createItemMutation.mutateAsync(formData);
      toast.success("Item created successfully", {
        description: `${formData.name} was added to the catalog.`,
      });
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to create item", {
        description: err.response?.data?.message || err.message,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Item"
      description="Create a product or service catalog entry with pricing and tax rate."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selector Tabs */}
        <div className="flex gap-2 p-1 bg-muted/40 rounded-xl border border-border/40">
          <button
            type="button"
            onClick={() => setType("Product")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              type === "Product"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Product
          </button>
          <button
            type="button"
            onClick={() => setType("Service")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              type === "Service"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Service
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="itemName">Item Name *</Label>
            <Input
              id="itemName"
              placeholder="e.g. Ergonomic Office Chair or Consulting Hours"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU / Code</Label>
            <Input
              id="sku"
              placeholder="e.g. PRD-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="font-mono text-xs uppercase"
            />
          </div>

          {type === "Product" && (
            <div className="space-y-1.5">
              <Label htmlFor="productType">Inventory Tracking</Label>
              <select
                id="productType"
                value={productType}
                onChange={(e) => setProductType(e.target.value as any)}
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Inventory">Inventory (Track Stock)</option>
                <option value="Non-Inventory">Non-Inventory (No Stock Count)</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="sellingPrice">Selling Price (INR) *</Label>
            <Input
              id="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              required
              className="font-mono"
            />
            {errors.sellingPrice && (
              <p className="text-[11px] text-destructive">{errors.sellingPrice}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="costPrice">Cost Price (INR)</Label>
            <Input
              id="costPrice"
              type="number"
              min="0"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="salesTaxRate">Applicable GST Rate</Label>
            <select
              id="salesTaxRate"
              value={salesTaxRate}
              onChange={(e) => setSalesTaxRate(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={0}>0% (Tax Exempt)</option>
              <option value={5}>5% GST</option>
              <option value={12}>12% GST</option>
              <option value={18}>18% GST (Standard)</option>
              <option value={28}>28% GST</option>
            </select>
          </div>

          {type === "Product" && productType === "Inventory" && (
            <div className="space-y-1.5">
              <Label htmlFor="openingStock">Opening Stock Qty *</Label>
              <Input
                id="openingStock"
                type="number"
                min="0"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
                required
                className="font-mono"
              />
              {errors.openingStock && (
                <p className="text-[11px] text-destructive">{errors.openingStock}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <Label htmlFor="description">Item Description</Label>
          <Textarea
            id="description"
            placeholder="Add specifications, details, or notes to appear on customer invoices..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-20 text-xs resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createItemMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createItemMutation.isPending}>
            {createItemMutation.isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              "Save Item"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

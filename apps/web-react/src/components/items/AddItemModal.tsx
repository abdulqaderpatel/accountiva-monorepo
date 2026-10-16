import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Select } from "@/components/ui/Select";
import { CustomFieldRenderer } from "@/components/ui/CustomFieldRenderer";
import { itemSchema } from "@accountiva/shared";
import { useCreateItem, useUpdateItem } from "@accountiva/api";
import { toast } from "sonner";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  itemToEdit?: any | null;
}

export function AddItemModal({
  isOpen,
  onClose,
  onSuccess,
  itemToEdit,
}: AddItemModalProps) {
  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();

  const [name, setName] = useState("");
  const [type, setType] = useState<"Product" | "Service">("Product");
  const [productType, setProductType] = useState<"Inventory" | "Non-Inventory">("Inventory");
  const [sku, setSku] = useState("");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [costPrice, setCostPrice] = useState("0");
  const [salesTaxRate, setSalesTaxRate] = useState(18);
  const [openingStock, setOpeningStock] = useState("0");
  const [description, setDescription] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (itemToEdit && isOpen) {
      setName(itemToEdit.name || "");
      setType(itemToEdit.type || "Product");
      setProductType(itemToEdit.productType || "Inventory");
      setSku(itemToEdit.sku || "");
      setSellingPrice(String(itemToEdit.sellingPrice ?? itemToEdit.unitPrice ?? 0));
      setCostPrice(String(itemToEdit.costPrice ?? 0));
      setSalesTaxRate(Number(itemToEdit.salesTaxRate) || 18);
      setOpeningStock(String(itemToEdit.openingStock ?? itemToEdit.stockOnHand ?? 0));
      setDescription(itemToEdit.description || "");
      setCustomFields(itemToEdit.customFields || itemToEdit.custom_fields || {});
      setErrors({});
    } else if (isOpen) {
      setName("");
      setType("Product");
      setProductType("Inventory");
      setSku("");
      setSellingPrice("0");
      setCostPrice("0");
      setSalesTaxRate(18);
      setOpeningStock("0");
      setDescription("");
      setCustomFields({});
      setErrors({});
    }
  }, [itemToEdit, isOpen]);

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
      customFields,
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
      if (itemToEdit?.id) {
        await updateItemMutation.mutateAsync({
          id: itemToEdit.id,
          payload: formData,
        });
        toast.success("Item updated successfully", {
          description: `${formData.name} record saved.`,
        });
      } else {
        await createItemMutation.mutateAsync(formData);
        toast.success("Item created successfully", {
          description: `${formData.name} was added to the catalog.`,
        });
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(itemToEdit?.id ? "Failed to update item" : "Failed to create item", {
        description: err.response?.data?.message || err.message,
      });
    }
  };

  const isPending = createItemMutation.isPending || updateItemMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? "Edit Catalog Item" : "Add New Item"}
      description="Create or edit a product or service catalog entry with pricing and tax rate."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selector Tabs */}
        <div className="flex gap-2 p-1 rounded-xl bg-muted/40 border border-border/40">
          <button
            type="button"
            onClick={() => setType("Product")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              type === "Product"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Product (Physical Good)
          </button>
          <button
            type="button"
            onClick={() => setType("Service")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              type === "Service"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Service (Hourly / Fixed)
          </button>
        </div>

        {/* Basic Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="itemName">Item Name *</Label>
            <Input
              id="itemName"
              placeholder="e.g. Standard Consultation or Widget A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-xs"
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="itemSku">SKU / Item Code</Label>
            <Input
              id="itemSku"
              placeholder="e.g. PRD-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="text-xs font-mono uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sellingPrice">Selling Price (₹) *</Label>
            <Input
              id="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              required
              className="text-xs font-mono"
            />
            {errors.sellingPrice && (
              <p className="text-[11px] text-destructive">{errors.sellingPrice}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="costPrice">Cost / Purchase Price (₹)</Label>
            <Input
              id="costPrice"
              type="number"
              min="0"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="salesTaxRate">Applicable GST Tax Rate (%)</Label>
            <Select
              value={salesTaxRate}
              onChange={(val) => setSalesTaxRate(Number(val))}
              options={[
                { id: 0, name: "0% (Exempt)" },
                { id: 5, name: "5% GST" },
                { id: 12, name: "12% GST" },
                { id: 18, name: "18% GST (Standard)" },
                { id: 28, name: "28% GST" },
              ]}
              className="font-mono text-xs"
            />
          </div>

          {type === "Product" && (
            <div className="space-y-1.5">
              <Label htmlFor="productType">Inventory Tracking</Label>
              <Select
                value={productType}
                onChange={(val) => setProductType(val as any)}
                options={[
                  { id: "Inventory", name: "Inventory (Track stock on hand)" },
                  { id: "Non-Inventory", name: "Non-Inventory (Consumables)" },
                ]}
                className="text-xs"
              />
            </div>
          )}

          {type === "Product" && productType === "Inventory" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="openingStock">Opening Stock On Hand</Label>
              <Input
                id="openingStock"
                type="number"
                min="0"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <Label htmlFor="itemDesc">Item Description</Label>
          <Textarea
            id="itemDesc"
            placeholder="Detailed description to be printed on quotes and invoices..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-18 text-xs resize-none"
          />
        </div>

        {/* Custom Fields */}
        <CustomFieldRenderer
          entity="item"
          value={customFields}
          onChange={setCustomFields}
        />

        {/* Actions */}
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
            ) : itemToEdit ? (
              "Update Item"
            ) : (
              "Create Item"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

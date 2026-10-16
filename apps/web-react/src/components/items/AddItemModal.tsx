import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Select } from "@/components/ui/Select";
import { CustomFieldRenderer } from "@/components/ui/CustomFieldRenderer";
import {
  Package,
  Wrench,
  RefreshCw,
  Layers,
  Plus,
  AlertCircle,
} from "lucide-react";
import { itemSchema, getCurrencySymbol } from "@accountiva/shared";
import { useCreateItem, useUpdateItem } from "@accountiva/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (item?: any) => void;
  itemToEdit?: any | null;
}

const UOM_OPTIONS = [
  { id: "Pcs", name: "Pcs (Pieces)" },
  { id: "Kg", name: "Kg (Kilograms)" },
  { id: "Mtr", name: "Mtr (Meters)" },
  { id: "Box", name: "Box" },
  { id: "Hours", name: "Hours" },
  { id: "Set", name: "Set" },
  { id: "Dozen", name: "Dozen" },
  { id: "Litre", name: "Litre" },
  { id: "Sq.Ft", name: "Sq.Ft" },
  { id: "Cu.Mtr", name: "Cu.Mtr" },
  { id: "Bundle", name: "Bundle" },
];

const TAX_RATE_OPTIONS = [
  { id: "0", name: "GST 0%" },
  { id: "5", name: "GST 5%" },
  { id: "12", name: "GST 12%" },
  { id: "18", name: "GST 18%" },
  { id: "28", name: "GST 28%" },
];

const TAX_PREFERENCE_OPTIONS = [
  { id: "Taxable", name: "Taxable" },
  { id: "Non-Taxable", name: "Non-Taxable" },
  { id: "Out of Scope", name: "Out of Scope" },
  { id: "Exempt", name: "Exempt" },
];

export function AddItemModal({
  isOpen,
  onClose,
  onSuccess,
  itemToEdit,
}: AddItemModalProps) {
  const { currentOrganization } = useAuth();
  const currencyCode = currentOrganization?.currency || "INR";
  const currencySymbol = getCurrencySymbol(currencyCode);

  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();

  const [type, setType] = useState<"Product" | "Service">("Product");
  const [productType, setProductType] = useState<"Inventory" | "Non-Inventory">("Inventory");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("General");
  const [uom, setUom] = useState("Pcs");
  const [hsnSacCode, setHsnSacCode] = useState("");
  const [taxPreference, setTaxPreference] = useState("Taxable");

  // Pricing
  const [sellingPrice, setSellingPrice] = useState<number | string>(0);
  const [salesTaxRate, setSalesTaxRate] = useState<string>("18");
  const [salesDescription, setSalesDescription] = useState("");

  const [costPrice, setCostPrice] = useState<number | string>(0);
  const [purchaseTaxRate, setPurchaseTaxRate] = useState<string>("18");
  const [purchaseDescription, setPurchaseDescription] = useState("");

  // Inventory
  const [openingStock, setOpeningStock] = useState<number | string>(0);
  const [valuationRate, setValuationRate] = useState<number | string>(0);
  const [reorderPoint, setReorderPoint] = useState<number | string>(5);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);

  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (itemToEdit) {
        setType(itemToEdit.type || "Product");
        setProductType(itemToEdit.productType || "Inventory");
        setName(itemToEdit.name || "");
        setSku(itemToEdit.sku || "");
        setCategory(itemToEdit.category || "General");
        setUom(itemToEdit.uom || (itemToEdit.type === "Service" ? "Hours" : "Pcs"));
        setHsnSacCode(itemToEdit.hsnSacCode || "");
        setTaxPreference(itemToEdit.taxPreference || "Taxable");

        setSellingPrice(itemToEdit.sellingPrice ?? itemToEdit.unitPrice ?? 0);
        setSalesTaxRate(String(itemToEdit.salesTaxRate ?? 18));
        setSalesDescription(itemToEdit.salesDescription || itemToEdit.description || "");

        setCostPrice(itemToEdit.costPrice ?? 0);
        setPurchaseTaxRate(String(itemToEdit.purchaseTaxRate ?? 18));
        setPurchaseDescription(itemToEdit.purchaseDescription || "");

        setOpeningStock(itemToEdit.openingStock ?? itemToEdit.stockOnHand ?? 0);
        setValuationRate(itemToEdit.valuationRate ?? itemToEdit.costPrice ?? 0);
        setReorderPoint(itemToEdit.reorderPoint ?? 5);
        setAsOfDate(itemToEdit.asOfDate || new Date().toISOString().split("T")[0]);

        setCustomFields(itemToEdit.customFields || itemToEdit.custom_fields || {});
      } else {
        setType("Product");
        setProductType("Inventory");
        setName("");
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        setSku(`PRD-${randomNum}`);
        setCategory("General");
        setUom("Pcs");
        setHsnSacCode("");
        setTaxPreference("Taxable");

        setSellingPrice(0);
        setSalesTaxRate("18");
        setSalesDescription("");

        setCostPrice(0);
        setPurchaseTaxRate("18");
        setPurchaseDescription("");

        setOpeningStock(0);
        setValuationRate(0);
        setReorderPoint(5);
        setAsOfDate(new Date().toISOString().split("T")[0]);

        setCustomFields({});
      }
    }
  }, [isOpen, itemToEdit]);

  const selectType = (newType: "Product" | "Service") => {
    setType(newType);
    if (newType === "Service") {
      setUom("Hours");
      if (!itemToEdit) {
        setSku(`SRV-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    } else {
      setUom("Pcs");
      if (!itemToEdit) {
        setSku(`PRD-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  };

  const generateSku = () => {
    const prefix = type === "Product" ? "PRD" : "SRV";
    const bytes = crypto.getRandomValues(new Uint8Array(3));
    const suffix = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const newSku = `${prefix}-${suffix}`;
    setSku(newSku);
    toast.info(`Generated Code: ${newSku}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData = {
      name: name.trim(),
      type,
      productType: type === "Product" ? productType : null,
      sku: sku.trim(),
      category: category.trim(),
      uom,
      hsnSacCode: hsnSacCode.trim(),
      taxPreference,
      sellingPrice: Number(sellingPrice) || 0,
      unitPrice: Number(sellingPrice) || 0,
      salesTaxRate: Number(salesTaxRate) || 0,
      salesDescription: salesDescription.trim(),
      description: salesDescription.trim(),
      costPrice: Number(costPrice) || 0,
      purchaseTaxRate: Number(purchaseTaxRate) || 0,
      purchaseDescription: purchaseDescription.trim(),
      openingStock: type === "Product" && productType === "Inventory" ? Number(openingStock) || 0 : undefined,
      valuationRate: Number(valuationRate) || 0,
      reorderPoint: Number(reorderPoint) || 5,
      asOfDate,
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
      toast.error("Form Validation Failed", {
        description: "Please fill out all required fields before saving.",
      });
      return;
    }

    try {
      let savedItem;
      if (itemToEdit?.id) {
        savedItem = await updateItemMutation.mutateAsync({
          id: itemToEdit.id,
          payload: formData,
        });
        toast.success("Item updated successfully!");
      } else {
        savedItem = await createItemMutation.mutateAsync(formData);
        toast.success(`${type} added successfully!`);
      }

      onSuccess?.(savedItem);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to save item");
    }
  };

  const isSaving = createItemMutation.isPending || updateItemMutation.isPending;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      bodyClass="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar"
      title={itemToEdit ? "Edit Item / Service" : "New Item / Service"}
      description="Create or manage catalog entries with automated stock valuation and pricing."
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
            <span>{itemToEdit ? "Update Item" : "Save Item"}</span>
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ================= 1. TWO-LEVEL CLASSIFICATION ENGINE ================= */}
        <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4">
          <Label className="text-xs font-semibold block text-foreground">Item Type</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* PRODUCT CARD */}
            <div
              onClick={() => selectType("Product")}
              className={cn(
                "p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3",
                type === "Product"
                  ? "border-primary bg-background shadow-xs ring-1 ring-primary/20"
                  : "border-border bg-card/60 hover:bg-muted/40 text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  type === "Product" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                <Package className="size-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">Product</h4>
                  {type === "Product" && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Physical goods, merchandise, raw materials, or consumables.
                </p>
              </div>
            </div>

            {/* SERVICE CARD */}
            <div
              onClick={() => selectType("Service")}
              className={cn(
                "p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3",
                type === "Service"
                  ? "border-primary bg-background shadow-xs ring-1 ring-primary/20"
                  : "border-border bg-card/60 hover:bg-muted/40 text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  type === "Service" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                <Wrench className="size-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">Service</h4>
                  {type === "Service" && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Professional services, consulting, maintenance, or labor.
                </p>
              </div>
            </div>
          </div>

          {/* SUB-TYPE (PRODUCT ONLY) */}
          {type === "Product" && (
            <div className="pt-3 border-t border-border/60 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground block">
                Inventory Tracking Method
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    productType === "Inventory"
                      ? "border-primary bg-background shadow-xs"
                      : "border-border bg-card/60 hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <input
                    type="radio"
                    name="productType"
                    checked={productType === "Inventory"}
                    onChange={() => setProductType("Inventory")}
                    className="accent-primary size-4"
                  />
                  <div>
                    <span className="text-xs font-semibold block text-foreground">Inventory Product</span>
                    <span className="text-[11px] text-muted-foreground">Quantities & stock movement dynamically tracked</span>
                  </div>
                </label>

                <label
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    productType === "Non-Inventory"
                      ? "border-primary bg-background shadow-xs"
                      : "border-border bg-card/60 hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <input
                    type="radio"
                    name="productType"
                    checked={productType === "Non-Inventory"}
                    onChange={() => setProductType("Non-Inventory")}
                    className="accent-primary size-4"
                  />
                  <div>
                    <span className="text-xs font-semibold block text-foreground">Non-Inventory Product</span>
                    <span className="text-[11px] text-muted-foreground">Goods bought/sold without quantity tracking</span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ================= 2. BASIC DETAILS ================= */}
        <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" /> Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="itemName" className="text-xs font-semibold">
                {type === "Product" ? "Product Name" : "Service Name"} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="itemName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === "Product" ? "e.g. Wireless Ergonomic Mouse" : "e.g. Financial Consulting"}
                className={cn("text-xs", errors.name && "border-destructive")}
                required
              />
              {errors.name && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="size-3" /> {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="itemSku" className="text-xs font-semibold">Item Code / SKU</Label>
                <button
                  type="button"
                  onClick={generateSku}
                  className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="size-3" /> Auto-generate
                </button>
              </div>
              <Input
                id="itemSku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. PRD-1002"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Unit of Measure (UOM)</Label>
              <Select
                value={uom}
                onChange={setUom}
                options={UOM_OPTIONS}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hsnCode" className="text-xs font-semibold">HSN / SAC Code</Label>
              <Input
                id="hsnCode"
                value={hsnSacCode}
                onChange={(e) => setHsnSacCode(e.target.value)}
                placeholder="e.g. 84713010"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tax Preference</Label>
              <Select
                value={taxPreference}
                onChange={setTaxPreference}
                options={TAX_PREFERENCE_OPTIONS}
              />
            </div>
          </div>
        </div>

        {/* ================= 3. SALES & PURCHASE PRICING ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sales Information */}
          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Sales Information
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="sellingPrice" className="text-xs font-semibold">
                Selling Price ({currencySymbol}) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sellingPrice"
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Sales Tax Rate</Label>
              <Select
                value={salesTaxRate}
                onChange={setSalesTaxRate}
                options={TAX_RATE_OPTIONS}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="salesDesc" className="text-xs font-semibold">Sales Description</Label>
              <Textarea
                id="salesDesc"
                rows={2}
                value={salesDescription}
                onChange={(e) => setSalesDescription(e.target.value)}
                placeholder="Description shown on client invoices..."
                className="text-xs"
              />
            </div>
          </div>

          {/* Purchase Information */}
          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Purchase Information
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="costPrice" className="text-xs font-semibold">
                Cost Price ({currencySymbol})
              </Label>
              <Input
                id="costPrice"
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Purchase Tax Rate</Label>
              <Select
                value={purchaseTaxRate}
                onChange={setPurchaseTaxRate}
                options={TAX_RATE_OPTIONS}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="purchDesc" className="text-xs font-semibold">Purchase Description</Label>
              <Textarea
                id="purchDesc"
                rows={2}
                value={purchaseDescription}
                onChange={(e) => setPurchaseDescription(e.target.value)}
                placeholder="Description shown on purchase bills..."
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* ================= 4. INVENTORY DETAILS (IF INVENTORY PRODUCT) ================= */}
        {type === "Product" && productType === "Inventory" && (
          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Inventory Tracking & Stock
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="openingStock" className="text-xs font-semibold">Opening Stock Quantity</Label>
                <Input
                  id="openingStock"
                  type="number"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(e.target.value)}
                  placeholder="0"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reorderPoint" className="text-xs font-semibold">Low Stock Alert Threshold</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(e.target.value)}
                  placeholder="5"
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. CUSTOM FIELDS ================= */}
        <CustomFieldRenderer
          entity="item"
          value={customFields}
          onChange={setCustomFields}
        />
      </form>
    </Modal>
  );
}

export default AddItemModal;

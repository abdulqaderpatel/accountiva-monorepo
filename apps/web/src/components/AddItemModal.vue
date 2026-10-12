<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import {
  Package,
  Wrench,
  Sparkles,
  IndianRupee,
  Plus,
  RefreshCw,
  Search,
  Upload,
  Check,
  AlertCircle,
  HelpCircle,
  Box,
  Layers,
  ArrowRight,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Select from "@/components/ui/Select.vue";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "vue-sonner";
import { useItemStore, type Item } from "@/stores/itemStore";
import { useFormValidation } from "@/composables/useFormValidation";
import { itemSchema } from "@/utils/validationSchemas";
import Modal from "@/components/Modal.vue";
import { useI18n } from "vue-i18n";
import api from "@/lib/api";

const props = defineProps<{
  open: boolean;
  itemToEdit?: Item | null;
}>();

const emit = defineEmits(["close", "success"]);

const itemStore = useItemStore();
const { t } = useI18n();
const loading = ref(false);
const vendors = ref<{ id: string; name: string }[]>([]);
const isAddingCategory = ref(false);
const newCategoryInput = ref("");

// Default form state
const defaultForm = () => ({
  name: "",
  type: "Product" as "Product" | "Service",
  productType: "Inventory" as "Inventory" | "Non-Inventory" | null,
  sku: "",
  category: "General",
  uom: "Pcs",
  hsnSacCode: "",
  taxPreference: "Taxable",
  imageUrl: "",
  isSellable: true,
  sellingPrice: 0,
  salesTaxInclusive: false,
  salesTaxRate: 18,
  incomeAccount: "Sales / Operating Revenue",
  salesDescription: "",
  isPurchasable: true,
  costPrice: 0,
  purchaseTaxInclusive: false,
  purchaseTaxRate: 18,
  expenseAccount: "Cost of Goods Sold",
  preferredVendorId: null as string | null,
  purchaseDescription: "",
  inventoryAccount: "Inventory Asset",
  openingStock: 0,
  valuationRate: 0,
  asOfDate: new Date().toISOString().split("T")[0],
  reorderPoint: 5,
  unitPrice: 0,
  description: "",
});

const newItem = ref(defaultForm());

const { errors, validate, clearErrors } = useFormValidation(itemSchema, newItem);

// Option lists
const uomOptions = [
  "Pcs",
  "Kg",
  "Mtr",
  "Box",
  "Hours",
  "Set",
  "Dozen",
  "Litre",
  "Sq.Ft",
  "Cu.Mtr",
  "Bundle",
];

const taxRates = [0, 5, 12, 18, 28];

const incomeAccounts = [
  "Sales / Operating Revenue",
  "Service Income",
  "Consulting Fees",
  "Other Operating Income",
  "Unearned Revenue",
];

const expenseAccounts = [
  "Cost of Goods Sold",
  "Direct Expenses",
  "Operating Expenses",
  "Subcontractor Expenses",
  "Raw Materials Expense",
];

const inventoryAccounts = [
  "Inventory Asset",
  "Finished Goods Inventory",
  "Work in Progress (WIP)",
  "Consumable Stores Asset",
];

const taxPreferenceOptions = [
  { id: "Taxable", name: "Taxable" },
  { id: "Non-Taxable", name: "Non-Taxable" },
  { id: "Out of Scope", name: "Out of Scope" },
  { id: "Exempt", name: "Exempt" },
];

const taxRateSelectOptions = computed(() =>
  taxRates.map((r) => ({ id: r, name: `GST ${r}%` }))
);

const vendorSelectOptions = computed(() => [
  { id: "", name: "-- None --" },
  ...vendors.value.map((v) => ({ id: v.id, name: v.name })),
]);

// Fetch vendors & categories when modal opens
const loadAuxiliaryData = async () => {
  try {
    const [vendorRes] = await Promise.all([
      api.get("/vendors?limit=100"),
      itemStore.fetchCategories(),
    ]);
    vendors.value = vendorRes.data.data.map((v: any) => ({
      id: v.id,
      name: v.name || v.company || "Unnamed Vendor",
    }));
  } catch (err) {
    console.error("Failed to load vendors/categories auxiliary data", err);
  }
};

const fetchNextItemSku = async () => {
  try {
    const res = await api.get(`/organizations/numbering-sequences/items/next?t=${Date.now()}`);
    if (res.data?.nextCode) {
      newItem.value.sku = res.data.nextCode;
    }
  } catch (err) {
    console.error("Failed to fetch next item SKU:", err);
  }
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      clearErrors();
      loadAuxiliaryData();
      if (props.itemToEdit) {
        newItem.value = {
          ...defaultForm(),
          ...props.itemToEdit,
          type: props.itemToEdit.type || "Product",
          productType: props.itemToEdit.productType || (props.itemToEdit.type === "Service" ? null : "Inventory"),
          category: props.itemToEdit.category || "General",
          uom: props.itemToEdit.uom || (props.itemToEdit.type === "Service" ? "Hours" : "Pcs"),
          hsnSacCode: props.itemToEdit.hsnSacCode || "",
          taxPreference: props.itemToEdit.taxPreference || "Taxable",
          sellingPrice: props.itemToEdit.sellingPrice ?? props.itemToEdit.unitPrice ?? 0,
          costPrice: props.itemToEdit.costPrice ?? 0,
          openingStock: props.itemToEdit.openingStock ?? props.itemToEdit.stockOnHand ?? 0,
          valuationRate: props.itemToEdit.valuationRate ?? props.itemToEdit.costPrice ?? 0,
          asOfDate: props.itemToEdit.asOfDate || new Date().toISOString().split("T")[0],
          reorderPoint: props.itemToEdit.reorderPoint ?? 5,
        };
      } else {
        newItem.value = defaultForm();
        void fetchNextItemSku();
      }
    }
  }
);

// Switch Level 1 Classification
const selectType = (type: "Product" | "Service") => {
  newItem.value.type = type;
  if (type === "Service") {
    newItem.value.productType = null;
    newItem.value.uom = "Hours";
    newItem.value.expenseAccount = "Direct Expenses";
    newItem.value.incomeAccount = "Service Income";
  } else {
    newItem.value.productType = "Inventory";
    newItem.value.uom = "Pcs";
    newItem.value.expenseAccount = "Cost of Goods Sold";
    newItem.value.incomeAccount = "Sales / Operating Revenue";
  }
};

// Generate SKU
const generateSku = () => {
  const prefix = newItem.value.type === "Product" ? "PRD" : "SRV";
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  newItem.value.sku = `${prefix}-${suffix}`;
  toast.info(`Generated Code: ${newItem.value.sku}`);
};

// Handle Add Category
const handleAddCategory = () => {
  const catName = newCategoryInput.value.trim();
  if (catName) {
    if (!itemStore.categories.includes(catName)) {
      itemStore.categories.push(catName);
    }
    newItem.value.category = catName;
    newCategoryInput.value = "";
    isAddingCategory.value = false;
    toast.success(`Category "${catName}" added`);
  }
};

// Handle Submit
const handleSaveItem = async () => {
  if (!validate()) {
    toast.error("Form Validation Failed", {
      description: "Please fill out all required fields before saving.",
    });
    return;
  }

  loading.value = true;
  try {
    const payload = {
      ...newItem.value,
      unitPrice: newItem.value.sellingPrice || 0,
      description: newItem.value.salesDescription || newItem.value.description || "",
    };

    if (props.itemToEdit) {
      await itemStore.updateItem(props.itemToEdit.id, payload);
      toast.success("Item updated successfully");
    } else {
      await itemStore.addItem(payload);
      toast.success(`${newItem.value.type} added successfully`);
    }

    emit("success");
    emit("close");
  } catch (err: any) {
    toast.error(err.response?.data?.error || "Failed to save item");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Modal
    :open="open"
    :title="itemToEdit ? 'Edit Item / Service' : 'New Item / Service'"
    max-width-class="max-w-4xl"
    @close="emit('close')"
  >
    <div class="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

      <!-- ================= 1. TWO-LEVEL CLASSIFICATION ENGINE ================= -->
      <div class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <label class="text-sm font-medium text-foreground block">
          Item Type
        </label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- PRODUCT CARD -->
          <div
            @click="selectType('Product')"
            :class="[
              'p-3.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3 relative',
              newItem.type === 'Product'
                ? 'border-primary bg-background shadow-xs ring-1 ring-primary/20'
                : 'border-border bg-card hover:bg-accent/40 text-muted-foreground',
            ]"
          >
            <div
              :class="[
                'w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-colors',
                newItem.type === 'Product' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              ]"
            >
              <Package class="w-4 h-4" />
            </div>
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-semibold text-foreground">Product</h4>
                <span
                  v-if="newItem.type === 'Product'"
                  class="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
                >
                  Selected
                </span>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed">
                Physical goods, merchandise, raw materials, or consumables.
              </p>
            </div>
          </div>

          <!-- SERVICE CARD -->
          <div
            @click="selectType('Service')"
            :class="[
              'p-3.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3 relative',
              newItem.type === 'Service'
                ? 'border-primary bg-background shadow-xs ring-1 ring-primary/20'
                : 'border-border bg-card hover:bg-accent/40 text-muted-foreground',
            ]"
          >
            <div
              :class="[
                'w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-colors',
                newItem.type === 'Service' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              ]"
            >
              <Wrench class="w-4 h-4" />
            </div>
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-semibold text-foreground">Service</h4>
                <span
                  v-if="newItem.type === 'Service'"
                  class="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
                >
                  Selected
                </span>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed">
                Professional services, consulting, maintenance, or labor.
              </p>
            </div>
          </div>
        </div>

        <!-- LEVEL 2: SUB-TYPE (PRODUCT ONLY) -->
        <div v-if="newItem.type === 'Product'" class="pt-3 border-t border-border space-y-2">
          <label class="text-xs font-medium text-muted-foreground block">
            Inventory Tracking Method
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- INVENTORY PRODUCT -->
            <label
              :class="[
                'flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-all',
                newItem.productType === 'Inventory'
                  ? 'border-primary bg-background shadow-xs'
                  : 'border-border bg-card hover:bg-accent/40 text-muted-foreground',
              ]"
            >
              <input
                type="radio"
                name="productType"
                value="Inventory"
                v-model="newItem.productType"
                class="accent-primary w-4 h-4"
              />
              <div>
                <span class="text-xs font-medium block text-foreground">Inventory Product</span>
                <span class="text-[11px] text-muted-foreground">Quantities & stock movement dynamically tracked</span>
              </div>
            </label>

            <!-- NON-INVENTORY PRODUCT -->
            <label
              :class="[
                'flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-all',
                newItem.productType === 'Non-Inventory'
                  ? 'border-primary bg-background shadow-xs'
                  : 'border-border bg-card hover:bg-accent/40 text-muted-foreground',
              ]"
            >
              <input
                type="radio"
                name="productType"
                value="Non-Inventory"
                v-model="newItem.productType"
                class="accent-primary w-4 h-4"
              />
              <div>
                <span class="text-xs font-medium block text-foreground">Non-Inventory Product</span>
                <span class="text-[11px] text-muted-foreground">Goods bought/sold without quantity tracking</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- ================= 2. SECTION A: BASIC DETAILS ================= -->
      <div class="space-y-4 rounded-lg border border-border bg-card p-4 shadow-xs">
        <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
          <Layers class="w-4 h-4 text-muted-foreground" /> Basic Information
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Item Name -->
          <div class="space-y-1.5 md:col-span-2">
            <label class="text-sm font-medium text-foreground">
              {{ newItem.type === 'Product' ? 'Product Name' : 'Service Name' }} <span class="text-destructive">*</span>
            </label>
            <Input
              v-model="newItem.name"
              :placeholder="newItem.type === 'Product' ? 'e.g. Wireless Ergonomic Mouse' : 'e.g. Financial Consulting Service'"
            />
            <p v-if="errors.name" class="text-xs text-destructive flex items-center gap-1 mt-1">
              <AlertCircle class="w-3 h-3" /> {{ errors.name }}
            </p>
          </div>

          <!-- SKU / Item Code -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-foreground">Item Code / SKU</label>
              <button
                type="button"
                @click="generateSku"
                class="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw class="w-3 h-3" /> Auto-generate
              </button>
            </div>
            <Input
              v-model="newItem.sku"
              placeholder="e.g. PRD-1002"
              class="font-mono text-xs"
            />
          </div>

          <!-- Category Selector -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-foreground">Category</label>
              <button
                type="button"
                @click="isAddingCategory = !isAddingCategory"
                class="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus class="w-3 h-3" /> Add Category
              </button>
            </div>

            <div v-if="isAddingCategory" class="flex gap-2">
              <Input
                v-model="newCategoryInput"
                placeholder="New Category Name"
              />
              <Button size="sm" @click="handleAddCategory">
                Save
              </Button>
            </div>
            <Select
              v-else
              v-model="newItem.category"
              :options="itemStore.categories"
              placeholder="Select category"
            />
          </div>

          <!-- Unit of Measurement (UOM) -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Unit of Measurement (UOM)</label>
            <Select
              v-model="newItem.uom"
              :options="uomOptions"
              placeholder="Select UOM"
            />
          </div>

          <!-- HSN / SAC Code -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground flex items-center justify-between">
              <span>{{ newItem.type === 'Product' ? 'HSN Code' : 'SAC Code' }}</span>
              <span class="text-xs text-muted-foreground font-normal">GST Taxonomy</span>
            </label>
            <div class="relative">
              <Input
                v-model="newItem.hsnSacCode"
                :placeholder="newItem.type === 'Product' ? 'e.g. 847160' : 'e.g. 998311'"
                class="font-mono text-xs pr-8"
              />
              <Search class="w-4 h-4 text-muted-foreground/50 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <!-- Tax Preference -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Tax Preference</label>
            <Select
              v-model="newItem.taxPreference"
              :options="taxPreferenceOptions"
              placeholder="Select tax preference"
            />
          </div>

          <!-- Image URL / Thumbnail -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Thumbnail / Image URL</label>
            <Input
              v-model="newItem.imageUrl"
              placeholder="https://example.com/image.png"
            />
          </div>
        </div>
      </div>

      <!-- ================= 3. SECTION B: SALES INFORMATION ================= -->
      <div class="space-y-4 rounded-lg border border-border bg-card p-4 shadow-xs">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <IndianRupee class="w-4 h-4 text-muted-foreground" /> Sales Information
          </h3>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              v-model="newItem.isSellable"
              class="accent-primary rounded w-4 h-4"
            />
            <span class="text-xs font-medium text-muted-foreground">I sell this {{ newItem.type.toLowerCase() }}</span>
          </label>
        </div>

        <div v-if="newItem.isSellable" class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <!-- Selling Price -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Selling Price / Rate (₹)</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">₹</span>
              <Input
                type="number"
                step="0.01"
                v-model="newItem.sellingPrice"
                placeholder="0.00"
                class="pl-7 font-mono"
              />
            </div>
          </div>

          <!-- Inclusive / Exclusive Tax Toggle -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Tax Treatment</label>
            <div class="flex items-center gap-4 h-9 px-3 rounded-md border border-input bg-transparent text-sm">
              <label class="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input type="radio" :value="false" v-model="newItem.salesTaxInclusive" class="accent-primary" />
                Exclusive of Tax
              </label>
              <label class="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input type="radio" :value="true" v-model="newItem.salesTaxInclusive" class="accent-primary" />
                Inclusive of Tax
              </label>
            </div>
          </div>

          <!-- Sales Tax Rate -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Sales Tax Rate (GST)</label>
            <Select
              :model-value="newItem.salesTaxRate"
              @update:model-value="newItem.salesTaxRate = Number($event)"
              :options="taxRateSelectOptions"
              placeholder="Select tax rate"
            />
          </div>

          <!-- Income Account -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Income Account</label>
            <Select
              v-model="newItem.incomeAccount"
              :options="incomeAccounts"
              placeholder="Select income account"
            />
          </div>

          <!-- Sales Description -->
          <div class="space-y-1.5 md:col-span-2">
            <label class="text-sm font-medium text-foreground">Sales Description</label>
            <Textarea
              v-model="newItem.salesDescription"
              placeholder="Description to display on invoices & estimates..."
              rows="2"
            />
          </div>
        </div>
      </div>

      <!-- ================= 4. SECTION C: PURCHASE INFORMATION ================= -->
      <div class="space-y-4 rounded-lg border border-border bg-card p-4 shadow-xs">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package class="w-4 h-4 text-muted-foreground" /> Purchase Information
          </h3>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              v-model="newItem.isPurchasable"
              class="accent-primary rounded w-4 h-4"
            />
            <span class="text-xs font-medium text-muted-foreground">I purchase this {{ newItem.type.toLowerCase() }}</span>
          </label>
        </div>

        <div v-if="newItem.isPurchasable" class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <!-- Cost Price -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Cost Price / Purchase Rate (₹)</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">₹</span>
              <Input
                type="number"
                step="0.01"
                v-model="newItem.costPrice"
                placeholder="0.00"
                class="pl-7 font-mono"
              />
            </div>
          </div>

          <!-- Purchase Tax Inclusive / Exclusive -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Purchase Tax Treatment</label>
            <div class="flex items-center gap-4 h-9 px-3 rounded-md border border-input bg-transparent text-sm">
              <label class="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input type="radio" :value="false" v-model="newItem.purchaseTaxInclusive" class="accent-primary" />
                Exclusive of Tax
              </label>
              <label class="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input type="radio" :value="true" v-model="newItem.purchaseTaxInclusive" class="accent-primary" />
                Inclusive of Tax
              </label>
            </div>
          </div>

          <!-- Purchase Tax Rate -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Purchase Tax Rate (GST)</label>
            <Select
              :model-value="newItem.purchaseTaxRate"
              @update:model-value="newItem.purchaseTaxRate = Number($event)"
              :options="taxRateSelectOptions"
              placeholder="Select tax rate"
            />
          </div>

          <!-- Expense / COGS Account -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Expense / COGS Account</label>
            <Select
              v-model="newItem.expenseAccount"
              :options="expenseAccounts"
              placeholder="Select expense account"
            />
          </div>

          <!-- Preferred Vendor -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Preferred Vendor / Supplier</label>
            <Select
              :model-value="newItem.preferredVendorId || ''"
              @update:model-value="newItem.preferredVendorId = $event || null"
              :options="vendorSelectOptions"
              placeholder="Select vendor"
            />
          </div>

          <!-- Purchase Description -->
          <div class="space-y-1.5 md:col-span-2">
            <label class="text-sm font-medium text-foreground">Purchase Description</label>
            <Textarea
              v-model="newItem.purchaseDescription"
              placeholder="Description to display on purchase orders & bills..."
              rows="2"
            />
          </div>
        </div>
      </div>

      <!-- ================= 5. SECTION D: INVENTORY TRACKING DETAILS (PRODUCT + INVENTORY ONLY) ================= -->
      <div
        v-if="newItem.type === 'Product' && newItem.productType === 'Inventory'"
        class="space-y-4 rounded-lg border border-border bg-card p-4 shadow-xs"
      >
        <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
          <Box class="w-4 h-4 text-muted-foreground" /> Inventory Tracking & Valuation
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Inventory Asset Account -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Inventory Asset Account</label>
            <Select
              v-model="newItem.inventoryAccount"
              :options="inventoryAccounts"
              placeholder="Select inventory account"
            />
          </div>

          <!-- Opening Stock Qty -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">
              Opening Stock Quantity <span class="text-destructive">*</span>
            </label>
            <Input
              type="number"
              v-model="newItem.openingStock"
              placeholder="0"
              class="font-mono"
            />
            <p v-if="errors.openingStock" class="text-xs text-destructive flex items-center gap-1 mt-1">
              <AlertCircle class="w-3 h-3" /> {{ errors.openingStock }}
            </p>
          </div>

          <!-- Valuation Rate -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">
              Cost Per Unit / Valuation Rate (₹) <span class="text-destructive">*</span>
            </label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">₹</span>
              <Input
                type="number"
                step="0.01"
                v-model="newItem.valuationRate"
                placeholder="0.00"
                class="pl-7 font-mono"
              />
            </div>
          </div>

          <!-- As of Date -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">As of Date <span class="text-destructive">*</span></label>
            <Input
              type="date"
              v-model="newItem.asOfDate"
              class="text-xs"
            />
          </div>

          <!-- Reorder Point -->
          <div class="space-y-1.5 md:col-span-2">
            <label class="text-sm font-medium text-foreground flex items-center justify-between">
              <span>Reorder Point / Safety Stock Level</span>
              <span class="text-xs text-muted-foreground font-normal">Triggers Low Stock Alert on Dashboard</span>
            </label>
            <Input
              type="number"
              v-model="newItem.reorderPoint"
              placeholder="5"
              class="font-mono"
            />
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          @click="emit('close')"
        >
          Cancel
        </Button>
        <Button
          type="button"
          @click="handleSaveItem"
          :disabled="loading"
        >
          <Spinner v-if="loading" class="w-4 h-4 mr-2" />
          {{ itemToEdit ? 'Save Changes' : (newItem.type === 'Product' ? 'Create Product' : 'Create Service') }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import {
  Building2,
  Receipt,
  MapPin,
  Camera,
  Upload,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "vue-sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import Select from "@/components/ui/Select.vue";
import CountrySelect from "@/components/ui/CountrySelect.vue";
import { type CountryOption } from "@/constants/countries";
import {
  COMMON_CURRENCIES,
  INDUSTRY_TYPES,
  INDIAN_STATES,
  sanitizeAddressLine1,
} from "@/constants/organization";

export interface OrganizationFormData {
  name: string;
  country: string;
  region: "India" | "Other";
  currency: string;
  is_gst_registered: boolean;
  gstin: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  state_code: string;
  postal_code: string;
  address?: string;
  industry_type: string;
  business_nature: string;
}

const props = defineProps<{
  modelValue: OrganizationFormData;
  previewUrl: string | null;
}>();

const emit = defineEmits(["update:modelValue", "select-file"]);

const isBusinessDetailsExpanded = ref(true);
const fileInput = ref<HTMLInputElement | null>(null);
const postalCodeError = ref<string | null>(null);

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    emit("select-file", input.files[0]);
  }
};

// Helper: Get code from state name
const getCodeFromStateName = (stateName: string): string => {
  if (!stateName) return "";
  const found = INDIAN_STATES.find(
    (s) => s.name.toLowerCase() === stateName.toLowerCase() || s.code === stateName
  );
  return found ? found.code : "";
};

// Handle Indian State Select
const onIndianStateSelect = (code: string) => {
  const found = INDIAN_STATES.find((s) => s.code === code);
  emit("update:modelValue", {
    ...props.modelValue,
    state_code: code,
    state: found ? found.name : "",
  });
};

// Handle Postal Code Input & Validation
const onPostalCodeInput = (value: string) => {
  if (props.modelValue.region === "India") {
    // Only numeric digits, max 6
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    if (numericValue && numericValue.length !== 6) {
      postalCodeError.value = "PIN code must be exactly 6 digits";
    } else {
      postalCodeError.value = null;
    }
    emit("update:modelValue", {
      ...props.modelValue,
      postal_code: numericValue,
    });
  } else {
    postalCodeError.value = null;
    emit("update:modelValue", {
      ...props.modelValue,
      postal_code: value,
    });
  }
};

// Auto-sync state code if GSTIN is entered (first 2 digits)
watch(
  () => props.modelValue.gstin,
  (newGstin) => {
    if (
      props.modelValue.region === "India" &&
      newGstin &&
      newGstin.length >= 2
    ) {
      const stateCodeFromGstin = newGstin.slice(0, 2);
      const matchedState = INDIAN_STATES.find((s) => s.code === stateCodeFromGstin);
      if (matchedState && !props.modelValue.state_code) {
        emit("update:modelValue", {
          ...props.modelValue,
          state_code: matchedState.code,
          state: matchedState.name,
        });
      }
    }
  }
);

const isFetchingGst = ref(false);

const handleFetchGst = async () => {
  const gstin = (props.modelValue.gstin || "").trim().toUpperCase();
  if (!gstin) return;

  try {
    isFetchingGst.value = true;
    const res = await api.get(`/organizations/gstin/${gstin}`);
    const data = res.data;

    const updated: OrganizationFormData = { ...props.modelValue };

    // Auto-populate Organization/Business Name if present
    if (data.company || data.name) {
      if (!updated.name || data.source !== "decoded") {
        updated.name = data.company || data.name;
      }
    }

    // Auto-populate City
    if (data.city && data.source !== "decoded") {
      updated.city = data.city;
    }

    // Auto-populate PIN Code
    if (data.pincode && data.source !== "decoded") {
      updated.postal_code = data.pincode;
    }

    // Auto-populate State & State Code
    if (data.stateCode) {
      const matchedState = INDIAN_STATES.find((s) => s.code === data.stateCode);
      if (matchedState) {
        updated.state_code = matchedState.code;
        updated.state = matchedState.name;
      }
    } else if (data.state) {
      const matchedState = INDIAN_STATES.find(
        (s) => s.name.toLowerCase() === data.state.toLowerCase()
      );
      if (matchedState) {
        updated.state_code = matchedState.code;
        updated.state = matchedState.name;
      }
    }

    // Auto-populate Address Line 1 (district, state, and pincode omitted from line 1)
    const rawLine1 = data.address_line1 || data.address || "";
    if (rawLine1 && data.source !== "decoded") {
      updated.address_line1 = sanitizeAddressLine1(rawLine1, {
        city: updated.city,
        state: updated.state,
        postal_code: updated.postal_code,
      });
    }

    // Auto-populate Address Line 2 if available and empty
    if (data.address_line2 && data.source !== "decoded" && !updated.address_line2) {
      updated.address_line2 = data.address_line2;
    }

    emit("update:modelValue", updated);

    if (data.source === "decoded") {
      toast.info("State & entity auto-detected!", {
        description: `${data.state} • ${data.entityType}. Enter business name & address to complete.`,
      });
    } else {
      toast.success("Business details fetched!", {
        description: data.company || data.name || `Registered in ${data.state}`,
      });
    }
  } catch (err: any) {
    toast.error(err.response?.data?.error || "Invalid GSTIN or fetch failed");
  } finally {
    isFetchingGst.value = false;
  }
};

// Handle Country Change
const onCountrySelect = (country: CountryOption) => {
  const isIndia = country.name.toLowerCase() === "india";
  const updated: OrganizationFormData = {
    ...props.modelValue,
    country: country.name,
    region: isIndia ? "India" : "Other",
    currency: country.currency || (isIndia ? "INR" : "USD"),
  };
  postalCodeError.value = null;

  if (!isIndia) {
    updated.is_gst_registered = false;
    updated.gstin = "";
    updated.state_code = "";
  }
  emit("update:modelValue", updated);
};

// Dynamic currency options incorporating selected currency if not in standard list
const currencyOptions = computed(() => {
  const options = COMMON_CURRENCIES.map((curr) => ({ id: curr.code, name: curr.label }));
  if (props.modelValue.currency && !options.some((o) => o.id === props.modelValue.currency)) {
    options.unshift({
      id: props.modelValue.currency,
      name: `${props.modelValue.currency} - Local Currency`,
    });
  }
  return options;
});

// Update generic field helper
const updateField = (field: keyof OrganizationFormData, value: any) => {
  emit("update:modelValue", {
    ...props.modelValue,
    [field]: value,
  });
};
</script>

<template>
  <div class="space-y-4">
    <!-- Top Section: Logo Upload & Name -->
    <div class="flex flex-col sm:flex-row gap-5 items-start">
      <!-- Left: Logo Upload -->
      <div class="flex flex-col items-center sm:items-start gap-2 shrink-0">
        <div class="relative group">
          <div
            class="w-20 h-20 rounded-lg border border-dashed border-border overflow-hidden bg-muted/30 flex items-center justify-center transition-all group-hover:border-primary/50 group-hover:bg-primary/5 cursor-pointer relative shadow-xs"
            @click="triggerFileInput"
          >
            <img
              v-if="previewUrl"
              :src="previewUrl"
              class="w-full h-full object-cover"
            />
            <div v-else class="flex flex-col items-center gap-1 text-muted-foreground/70">
              <Upload class="w-5 h-5" />
              <span class="text-[11px] font-medium">Logo</span>
            </div>

            <!-- Hover Overlay -->
            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Camera class="w-5 h-5 text-white" />
            </div>
          </div>
          <button
            type="button"
            @click="triggerFileInput"
            class="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-md shadow-xs transition-transform hover:scale-105 active:scale-95 z-10"
            title="Upload Logo"
          >
            <Camera class="w-3 h-3" />
          </button>
          <input
            type="file"
            ref="fileInput"
            class="hidden"
            accept="image/*"
            @change="handleFileChange"
          />
        </div>
        <div class="text-center sm:text-left">
          <h4 class="font-medium text-xs text-foreground">Organization Logo</h4>
          <p class="text-[11px] text-muted-foreground max-w-[100px] leading-tight mt-0.5">
            PNG or JPG up to 5MB
          </p>
        </div>
      </div>

      <!-- Right: Core Fields -->
      <div class="flex-1 w-full space-y-4">
        <!-- Organization Name -->
        <div class="space-y-1.5">
          <Label for="org-name" class="text-sm font-medium text-foreground">
            Organization Name <span class="text-destructive">*</span>
          </Label>
          <div class="relative">
            <Building2 class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="org-name"
              :modelValue="modelValue.name"
              @update:modelValue="updateField('name', $event)"
              placeholder="e.g. Acme Corporation"
              class="pl-9"
              required
            />
          </div>
        </div>

        <!-- Country Selector -->
        <div class="space-y-1.5">
          <Label class="text-sm font-medium text-foreground">
            Country <span class="text-destructive">*</span>
          </Label>
          <CountrySelect
            :model-value="modelValue.country || (modelValue.region === 'India' ? 'India' : 'United States')"
            @select="onCountrySelect"
          />
        </div>
      </div>
    </div>

    <!-- Currency & GST Conditional Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Currency Display / Selector -->
      <div class="space-y-1.5">
        <Label class="text-sm font-medium text-foreground">
          Currency <span class="text-destructive">*</span>
        </Label>
        <Select
          :model-value="modelValue.currency"
          @update:model-value="updateField('currency', String($event))"
          :options="currencyOptions"
          placeholder="Select currency"
        />
      </div>

      <!-- GST Registered Toggle (Visible ONLY if Region = India) -->
      <div v-if="modelValue.region === 'India'" class="space-y-1.5">
        <Label class="text-sm font-medium text-foreground">GST Registration</Label>
        <div class="flex items-center justify-between h-9 px-3 rounded-md border border-input bg-transparent dark:bg-input/30 shadow-xs">
          <span class="text-xs text-muted-foreground">Is business GST-registered?</span>
          <Switch
            :modelValue="modelValue.is_gst_registered"
            @update:modelValue="updateField('is_gst_registered', $event)"
          />
        </div>
      </div>
    </div>

    <!-- GSTIN Input Field (If Region = India AND GST Registered = true) -->
    <div v-if="modelValue.region === 'India' && modelValue.is_gst_registered" class="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
      <div class="flex items-center justify-between">
        <Label for="gstin-input" class="text-sm font-medium text-foreground">
          GSTIN <span class="text-destructive">*</span>
        </Label>
        <span class="text-[10px] text-muted-foreground font-mono">15 Characters</span>
      </div>
      <div class="relative group">
        <Receipt class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
        <Input
          id="gstin-input"
          :modelValue="modelValue.gstin"
          @update:modelValue="updateField('gstin', $event)"
          placeholder="22AAAAA0000A1Z5"
          maxlength="15"
          class="pl-9 pr-28 uppercase font-medium tracking-wider"
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          @click="handleFetchGst"
          :disabled="isFetchingGst || !modelValue.gstin"
          class="absolute right-1 top-1 bottom-1 h-7 px-2.5 rounded-lg font-bold uppercase tracking-wider text-[10px] text-primary hover:bg-primary/10 active:scale-95 transition-all disabled:opacity-30"
        >
          <Loader2 v-if="isFetchingGst" class="mr-1 h-3 w-3 animate-spin" />
          <Sparkles v-else class="mr-1 h-3 w-3 text-primary" />
          {{ isFetchingGst ? 'Fetching...' : 'Fetch Details' }}
        </Button>
      </div>
    </div>

    <!-- STRUCTURED BUSINESS ADDRESS GRID -->
    <div class="space-y-3 pt-2 border-t border-border">
      <div class="flex items-center gap-2">
        <MapPin class="w-4 h-4 text-muted-foreground" />
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business Address</h4>
      </div>

      <!-- Address Line 1 -->
      <div class="space-y-1.5">
        <Label for="address-line1" class="text-sm font-medium text-foreground">
          Address Line 1 <span class="text-destructive">*</span>
        </Label>
        <Input
          id="address-line1"
          :modelValue="modelValue.address_line1"
          @update:modelValue="updateField('address_line1', $event)"
          placeholder="e.g., Suite 402, Trade Tower"
          required
        />
      </div>

      <!-- Address Line 2 -->
      <div class="space-y-1.5">
        <Label for="address-line2" class="text-sm font-medium text-foreground">
          Address Line 2 <span class="text-xs text-muted-foreground font-normal">(Optional)</span>
        </Label>
        <Input
          id="address-line2"
          :modelValue="modelValue.address_line2"
          @update:modelValue="updateField('address_line2', $event)"
          placeholder="e.g., MG Road, Near Metro Station"
        />
      </div>

      <!-- 2-Column Grid: City & State -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- City / District -->
        <div class="space-y-1.5">
          <Label for="city-input" class="text-sm font-medium text-foreground">
            City / District <span class="text-destructive">*</span>
          </Label>
          <Input
            id="city-input"
            :modelValue="modelValue.city"
            @update:modelValue="updateField('city', $event)"
            placeholder="e.g., Mumbai"
            required
          />
        </div>

        <!-- State / Province (Dynamic Dropdown for India / Input for Other) -->
        <div class="space-y-1.5">
          <Label for="state-input" class="text-sm font-medium text-foreground">
            State / Province <span class="text-destructive">*</span>
          </Label>

          <!-- Region = India: Searchable/Selectable Dropdown with GST state codes -->
          <Select
            v-if="modelValue.region === 'India'"
            :model-value="modelValue.state_code || getCodeFromStateName(modelValue.state)"
            @update:model-value="onIndianStateSelect(String($event))"
            :options="INDIAN_STATES.map(st => ({ id: st.code, name: st.label }))"
            placeholder="Select State / UT"
          />

          <!-- Region = Other: Text Input -->
          <Input
            v-else
            id="state-input"
            :modelValue="modelValue.state"
            @update:modelValue="updateField('state', $event)"
            placeholder="e.g., California"
            required
          />
        </div>
      </div>

      <!-- PIN / Postal Code -->
      <div class="space-y-1.5">
        <Label for="postal-code-input" class="text-sm font-medium text-foreground">
          {{ modelValue.region === 'India' ? 'PIN Code' : 'Postal Code' }} <span class="text-destructive">*</span>
        </Label>
        <Input
          id="postal-code-input"
          :modelValue="modelValue.postal_code"
          @update:modelValue="onPostalCodeInput($event)"
          :placeholder="modelValue.region === 'India' ? 'e.g., 400001' : 'ZIP / Postal code'"
          :maxlength="modelValue.region === 'India' ? 6 : 12"
          required
        />
        <p v-if="postalCodeError" class="text-xs text-destructive ml-0.5">
          {{ postalCodeError }}
        </p>
      </div>
    </div>

    <!-- Industry & Business Profile (Optional) -->
    <div class="rounded-lg border border-border bg-card overflow-hidden transition-all shadow-xs">
      <button
        type="button"
        @click="isBusinessDetailsExpanded = !isBusinessDetailsExpanded"
        class="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors text-left cursor-pointer"
      >
        <div class="flex items-center gap-2.5">
          <Briefcase class="w-4 h-4 text-muted-foreground" />
          <span class="text-xs font-semibold text-foreground">Industry & Business Profile</span>
          <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">Optional</span>
        </div>
        <component :is="isBusinessDetailsExpanded ? ChevronUp : ChevronDown" class="w-4 h-4 text-muted-foreground" />
      </button>

      <div v-if="isBusinessDetailsExpanded" class="p-4 pt-2 space-y-3.5 border-t border-border bg-muted/5">
        <p class="text-xs text-muted-foreground">
          Configure industry classification and business description for tax and reporting defaults.
        </p>

        <!-- Industry Type Dropdown -->
        <div class="space-y-1.5">
          <Label class="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Layers class="w-3.5 h-3.5 text-muted-foreground" /> Industry Type
          </Label>
          <Select
            :model-value="modelValue.industry_type"
            @update:model-value="updateField('industry_type', String($event))"
            :options="[{ id: '', name: 'Select Industry' }, ...INDUSTRY_TYPES.map(ind => ({ id: ind, name: ind }))]"
            placeholder="Select Industry"
          />
        </div>

        <!-- Nature of Business Textarea -->
        <div class="space-y-1.5">
          <Label class="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Briefcase class="w-3.5 h-3.5 text-muted-foreground" /> Nature of Business
          </Label>
          <Textarea
            :modelValue="modelValue.business_nature"
            @update:modelValue="updateField('business_nature', $event)"
            rows="2"
            placeholder="Briefly describe your business operations (e.g., B2B wholesale distributor of electronics, IT consulting)..."
            class="resize-none text-xs"
          />
        </div>
      </div>
    </div>
  </div>
</template>

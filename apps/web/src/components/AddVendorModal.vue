<script setup lang="ts">
import { ref, watch } from "vue";
import { User, Building2, Landmark, X, Loader2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "vue-sonner";
import api from "@/lib/api";
import { useVendorStore } from "@/stores/vendorStore";
import { useFormValidation } from "@/composables/useFormValidation";
import { vendorSchema } from "@/utils/validationSchemas";
import GstTreatmentSelect from "@/components/ui/GstTreatmentSelect.vue";
import Select from "@/components/ui/Select.vue";
import Modal from "@/components/Modal.vue";
import CustomFieldRenderer from "@/components/ui/CustomFieldRenderer.vue";
import { useI18n } from "vue-i18n";
import { useCurrency } from "@/composables/useCurrency";
import { COMMON_CURRENCIES } from "@/constants/organization";
import PlanUpgradeCard from "@/components/ui/PlanUpgradeCard.vue";
import UpgradePlanModal from "@/components/UpgradePlanModal.vue";

const props = defineProps<{
  open: boolean;
  vendor?: any;
}>();

const emit = defineEmits(["close", "success"]);

const vendorStore = useVendorStore();
const { currencyCode } = useCurrency();
const { t } = useI18n();
const isUpgradeModalOpen = ref(false);
const gstLimitError = ref<string | null>(null);
const loading = ref(false);
const activeFormTab = ref("contact"); // 'contact', 'tax_address', 'bank', 'notes'

const newVendor = ref({
  name: "",
  vendorCode: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  gst_number: "",
  gst_treatment: "Unregistered",
  pan: "",
  payment_terms: "Due on Receipt",
  currency: currencyCode.value,
  website: "",
  bank_name: "",
  bank_account_no: "",
  bank_ifsc: "",
  notes: "",
  opening_balance: 0,
  customFields: {},
});

const isPanManuallyEdited = ref(false);
const lastAutoPan = ref("");

const handlePanInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const val = target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  newVendor.value.pan = val;
  if (!val) {
    isPanManuallyEdited.value = false;
    lastAutoPan.value = "";
  } else {
    isPanManuallyEdited.value = true;
  }
};

watch(
  () => newVendor.value.gst_number,
  (gst) => {
    const cleanGst = (gst || "").trim().toUpperCase();
    if (cleanGst.length >= 12) {
      const extractedPan = cleanGst.substring(2, 12);
      if (!newVendor.value.pan || !isPanManuallyEdited.value || newVendor.value.pan === lastAutoPan.value) {
        newVendor.value.pan = extractedPan;
        lastAutoPan.value = extractedPan;
        isPanManuallyEdited.value = false;
      }
    }
  },
  { immediate: true }
);

const fetchNextVendorCode = async () => {
  try {
    const res = await api.get(`/organizations/numbering-sequences/vendors/next?t=${Date.now()}`);
    newVendor.value.vendorCode = res.data.nextCode || '';
  } catch (err) {
    newVendor.value.vendorCode = '';
  }
};

const currencies = computed(() => {
  const list = COMMON_CURRENCIES.map((c) => ({ id: c.code, name: c.label }));
  if (currencyCode.value && !list.some((c) => c.id === currencyCode.value)) {
    list.unshift({ id: currencyCode.value, name: `${currencyCode.value} - Local Currency` });
  }
  return list;
});

const paymentTermsOptions = [
  { id: 'Due on Receipt', name: 'Due on Receipt' },
  { id: 'Net 15', name: 'Net 15' },
  { id: 'Net 30', name: 'Net 30' },
  { id: 'Net 45', name: 'Net 45' },
  { id: 'Net 60', name: 'Net 60' },
];

watch(
  () => newVendor.value.gst_treatment,
  (val) => {
    if (val === 'Unregistered' || val === 'Consumer (Unregistered)' || val === 'Unregistered Business') {
      newVendor.value.gst_number = '';
    }
  }
);

const { errors, validate, clearErrors } = useFormValidation(vendorSchema, newVendor);

watch(
  () => props.open,
  (val) => {
    if (val) {
      activeFormTab.value = "contact";
      if (props.vendor) {
        let rawTreatment = props.vendor.gst_treatment || "Unregistered";
        if (rawTreatment === "Consumer (Unregistered)" || rawTreatment === "Unregistered Business") {
          rawTreatment = "Unregistered";
        }
        const initialPan = props.vendor.pan || "";
        isPanManuallyEdited.value = !!initialPan;
        lastAutoPan.value = "";
        newVendor.value = {
          name: props.vendor.name || "",
          vendorCode: props.vendor.vendorCode || "",
          email: props.vendor.email || "",
          phone: props.vendor.phone || "",
          company: props.vendor.company || "",
          address: props.vendor.address || "",
          gst_number: props.vendor.gst_number || "",
          gst_treatment: rawTreatment,
          pan: initialPan,
          payment_terms: props.vendor.payment_terms || "Due on Receipt",
          currency: props.vendor.currency || "INR",
          website: props.vendor.website || "",
          bank_name: props.vendor.bank_name || "",
          bank_account_no: props.vendor.bank_account_no || "",
          bank_ifsc: props.vendor.bank_ifsc || "",
          notes: props.vendor.notes || "",
          opening_balance: props.vendor.opening_balance || 0,
          customFields: props.vendor.customFields || {},
        };
      } else {
        isPanManuallyEdited.value = false;
        lastAutoPan.value = "";
        newVendor.value = {
          name: "",
          vendorCode: "",
          email: "",
          phone: "",
          company: "",
          address: "",
          gst_number: "",
          gst_treatment: "Unregistered",
          pan: "",
          payment_terms: "Due on Receipt",
          currency: currencyCode.value,
          website: "",
          bank_name: "",
          bank_account_no: "",
          bank_ifsc: "",
          notes: "",
          opening_balance: 0,
          customFields: {},
        };
        void fetchNextVendorCode();
      }
      clearErrors();
    }
  },
  { immediate: true }
);

const isFetchingGst = ref(false);

const handleFetchGst = async () => {
  const gstin = newVendor.value.gst_number?.trim().toUpperCase();
  if (!gstin) return;
  try {
    isFetchingGst.value = true;
    const res = await api.get(`/vendors/gstin/${gstin}`);
    const data = res.data;

    if (data.name) newVendor.value.name = data.name;
    if (data.company) newVendor.value.company = data.company;
    if (data.address && (!newVendor.value.address || data.source !== 'decoded')) {
      newVendor.value.address = data.address;
    }

    if (newVendor.value.gst_treatment === 'Unregistered' || newVendor.value.gst_treatment === 'Consumer (Unregistered)') {
      newVendor.value.gst_treatment = 'Registered';
    }

    if (data.source === 'decoded') {
      toast.info('State & entity type auto-detected!', {
        description: `${data.state} • ${data.entityType}. You can complete vendor name manually.`,
      });
    } else {
      const isCached = data.source === 'cache' || data.source === 'local_records';
      toast.success(isCached ? 'Business details verified!' : 'Business details fetched!', {
        description: data.company || data.name || `Registered in ${data.state}`,
      });
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.error || 'Invalid GSTIN format or fetch failed';
    const isPlanLimit = err.response?.status === 403 && (err.response?.data?.code === 'LIMIT_REACHED' || errorMsg.toLowerCase().includes('upgrade') || errorMsg.toLowerCase().includes('limit'));

    if (isPlanLimit) {
      gstLimitError.value = errorMsg;
      isUpgradeModalOpen.value = true;
    } else {
      gstLimitError.value = null;
      toast.error(errorMsg, {
        description: 'Please verify the 15-character GSTIN or enter details manually.',
      });
    }
  } finally {
    isFetchingGst.value = false;
  }
};

const handleSaveVendor = async () => {
  if (!validate()) {
    toast.error("Vendor details validation failed", {
      description: "Please correct the errors in the form before saving.",
    });
    return;
  }

  loading.value = true;
  try {
    let result;
    if (props.vendor?.id) {
      result = await vendorStore.updateVendor(props.vendor.id, { ...newVendor.value });
      toast.success("Vendor updated successfully");
    } else {
      result = await vendorStore.addVendor({ ...newVendor.value });
      toast.success("Vendor added successfully");
    }
    emit("success", result);
    emit("close");
    clearErrors();
  } catch (err: any) {
    toast.error(err.response?.data?.error || "Failed to save vendor details");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Modal
    :open="open"
    z-index-class="z-[110]"
    max-width-class="max-w-xl"
    body-class="p-6 overflow-y-auto flex-1 custom-scrollbar max-h-[50vh]"
    @close="emit('close'); clearErrors();"
  >
    <template #header>
      <!-- Header -->
      <div class="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 class="text-xl font-bold text-foreground">{{ props.vendor ? t('modals.vendor.editTitle') : t('modals.vendor.newTitle') }}</h2>
          <p class="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
            {{ props.vendor ? t('modals.vendor.editSubtitle') : t('modals.vendor.newSubtitle') }}
          </p>
        </div>
        <button type="button" aria-label="Close dialog" @click="emit('close'); clearErrors();" class="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <X class="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="px-6 border-b border-border bg-muted/10 flex gap-2 shrink-0 overflow-x-auto py-1">
        <button
          type="button"
          @click="activeFormTab = 'contact'"
          :class="[
            'px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap',
            activeFormTab === 'contact' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          ]"
        >
          {{ t('modals.vendor.tabs.primary') }}
        </button>
        <button
          type="button"
          @click="activeFormTab = 'tax_address'"
          :class="[
            'px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap',
            activeFormTab === 'tax_address' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          ]"
        >
          {{ t('modals.vendor.tabs.taxAddress') }}
        </button>
        <button
          type="button"
          @click="activeFormTab = 'bank'"
          :class="[
            'px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap',
            activeFormTab === 'bank' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          ]"
        >
          {{ t('modals.vendor.tabs.bank') }}
        </button>
        <button
          type="button"
          @click="activeFormTab = 'notes'"
          :class="[
            'px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap',
            activeFormTab === 'notes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          ]"
        >
          {{ t('modals.vendor.tabs.notes') }}
        </button>
        <button
          type="button"
          @click="activeFormTab = 'custom-fields'"
          :class="[
            'px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap',
            activeFormTab === 'custom-fields' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          ]"
        >
          Custom Fields
        </button>
      </div>
    </template>

    <!-- Contact details tab -->
    <div v-show="activeFormTab === 'contact'" class="space-y-4 animate-in fade-in duration-200">
      <div class="space-y-2">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1">
          Vendor Code
        </label>
        <Input
          v-model="newVendor.vendorCode"
          placeholder="Auto-generated"
          class="h-11 rounded-xl font-mono uppercase"
        />
        <p class="text-[10px] text-muted-foreground ml-1">
          Leave blank to use the next configured number.
        </p>
      </div>

      <div class="space-y-2">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
          >{{ t('modals.vendor.fields.name') }} <span class="text-destructive ml-0.5">*</span></label
        >
        <div class="relative">
          <User class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="newVendor.name"
            placeholder="Acme Supplies"
            class="h-11 rounded-xl pl-10"
            :class="{ 'border-destructive focus:border-destructive': errors.name }"
          />
        </div>
        <p v-if="errors.name" class="text-[10px] text-destructive font-semibold mt-1">
          {{ errors.name }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.vendor.fields.email') }}</label
          >
          <Input
            v-model="newVendor.email"
            placeholder="sales@acme.com"
            class="h-11 rounded-xl"
            :class="{ 'border-destructive focus:border-destructive': errors.email }"
          />
          <p v-if="errors.email" class="text-[10px] text-destructive font-semibold mt-1">
            {{ errors.email }}
          </p>
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.vendor.fields.phone') }}</label
          >
          <Input v-model="newVendor.phone" placeholder="+91 99999-99999" class="h-11 rounded-xl" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.vendor.fields.company') }}</label
          >
          <div class="relative">
            <Building2 class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input v-model="newVendor.company" placeholder="Acme Corp" class="h-11 rounded-xl pl-10" />
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.vendor.fields.website') }}</label
          >
          <Input v-model="newVendor.website" placeholder="www.acmesupplies.com" class="h-11 rounded-xl" />
        </div>
      </div>
    </div>

    <!-- Tax & Address tab -->
    <div v-show="activeFormTab === 'tax_address'" class="space-y-4 animate-in fade-in duration-200">
      <div class="space-y-2">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
          >{{ t('modals.vendor.fields.gstStatus') }}</label
        >
        <GstTreatmentSelect
          v-model="newVendor.gst_treatment"
          context="vendor"
          :error="!!errors.gst_treatment"
        />
      </div>

      <div v-if="newVendor.gst_treatment === 'Registered' || newVendor.gst_treatment === 'Composition'" class="space-y-2 animate-in slide-in-from-top-2 duration-200">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
          >{{ t('modals.vendor.fields.gstNumber') }}</label
        >
        <div class="relative group">
          <Input
            v-model="newVendor.gst_number"
            placeholder="22AAAAA0000A1Z5"
            class="h-11 rounded-xl uppercase pr-20 border-border/60 focus:border-primary/50 transition-all"
            :class="{ 'border-destructive focus:border-destructive': errors.gst_number }"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            @click="handleFetchGst"
            :disabled="isFetchingGst || !newVendor.gst_number"
            class="absolute right-1 top-1 bottom-1 h-9 px-3 rounded-lg font-black uppercase tracking-widest text-[9px] text-primary hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-30"
          >
            <Loader2 v-if="isFetchingGst" class="mr-1 h-3 w-3 animate-spin" />
            {{ isFetchingGst ? t('common.fetching') : t('common.fetch') }}
          </Button>
        </div>
        <p v-if="errors.gst_number" class="text-[10px] text-destructive font-semibold mt-1">
          {{ errors.gst_number }}
        </p>

        <!-- Plan Limit Upgrade Card -->
        <PlanUpgradeCard
          v-if="gstLimitError"
          title="GSTIN Lookup Limit Reached"
          :description="gstLimitError"
          :dismissible="true"
          @dismiss="gstLimitError = null"
          class="mt-3"
        />
      </div>

      <div class="space-y-2">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1">
          PAN Number
        </label>
        <Input
          :model-value="newVendor.pan"
          @input="handlePanInput"
          placeholder="e.g. AAAAA0000A"
          maxlength="10"
          class="h-11 rounded-xl uppercase border-border/60 focus:border-primary/50 transition-all font-mono"
          :class="{ 'border-destructive focus:border-destructive': errors.pan }"
        />
        <p v-if="errors.pan" class="text-[10px] text-destructive font-semibold mt-1">
          {{ errors.pan }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.vendor.fields.currency') }}</label
          >
          <Select
            v-model="newVendor.currency"
            :options="currencies"
            placeholder="Select Currency"
          />
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.vendor.fields.paymentTerms') }}</label
          >
          <Select
            v-model="newVendor.payment_terms"
            :options="paymentTermsOptions"
            placeholder="Select Terms"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.vendor.fields.openingBalance') }}</label
          >
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">₹</span>
            <Input
              type="number"
              v-model="newVendor.opening_balance"
              placeholder="0.00"
              class="h-11 rounded-xl pl-8"
              :class="{ 'border-destructive focus:border-destructive': errors.opening_balance }"
            />
          </div>
          <p v-if="errors.opening_balance" class="text-[10px] text-destructive font-semibold mt-1">
            {{ errors.opening_balance }}
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1">{{ t('modals.vendor.fields.address') }}</label>
        <Textarea
          v-model="newVendor.address"
          :placeholder="t('modals.vendor.fields.addressPlaceholder')"
          class="min-h-[70px] rounded-xl"
        />
      </div>
    </div>

    <!-- Bank Details tab -->
    <div v-show="activeFormTab === 'bank'" class="space-y-4 animate-in fade-in duration-200">
      <div class="space-y-2">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
          >{{ t('modals.vendor.fields.bankName') }}</label
        >
        <div class="relative">
          <Landmark class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input v-model="newVendor.bank_name" placeholder="HDFC Bank" class="h-11 rounded-xl pl-10" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.vendor.fields.accountNumber') }}</label
          >
          <Input v-model="newVendor.bank_account_no" placeholder="50100012345678" class="h-11 rounded-xl" />
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.vendor.fields.ifsc') }}</label
          >
          <Input v-model="newVendor.bank_ifsc" placeholder="HDFC0001234" class="h-11 rounded-xl uppercase" />
        </div>
      </div>
    </div>

    <!-- Notes tab -->
    <div v-show="activeFormTab === 'notes'" class="space-y-4 animate-in fade-in duration-200">
      <div class="space-y-2">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1">{{ t('modals.vendor.fields.internalNotes') }}</label>
        <Textarea
          v-model="newVendor.notes"
          :placeholder="t('modals.vendor.fields.internalNotesPlaceholder')"
          class="min-h-[150px] rounded-xl leading-relaxed"
        />
      </div>
    </div>

    <!-- Custom Fields tab -->
    <div v-show="activeFormTab === 'custom-fields'" class="space-y-4 animate-in fade-in duration-200">
      <CustomFieldRenderer
        entity="vendor"
        v-model="newVendor.customFields"
        :show-title="false"
      />
    </div>

    <!-- Footer Slot -->
    <template #footer>
      <Button
        @click="emit('close')"
        variant="ghost"
        class="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px]"
        >{{ t('common.cancel') }}</Button
      >
      <Button
        @click="handleSaveVendor"
        :disabled="loading"
        class="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2"
      >
        <Spinner v-if="loading" size="sm" class="text-primary-foreground" />
        {{ loading ? t('common.saving') : (props.vendor ? t('common.save') : t('modals.vendor.saveNew')) }}
      </Button>
    </template>
  </Modal>

  <UpgradePlanModal
    v-model:open="isUpgradeModalOpen"
    feature="gstin"
    title="GSTIN Lookup Limit Reached"
    :description="gstLimitError || 'You have reached the free limit of 5 GSTIN auto-lookups. Upgrade to Professional for unlimited lookups and automated details.'"
  />
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}
</style>

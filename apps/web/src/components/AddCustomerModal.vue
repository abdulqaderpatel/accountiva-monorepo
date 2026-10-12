<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Loader2, Building2, User, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'vue-sonner';
import api from '@/lib/api';
import { useCustomerStore } from '@/stores/customerStore';
import { useFormValidation } from '@/composables/useFormValidation';
import { customerSchema } from '@/utils/validationSchemas';
import GstTreatmentSelect from '@/components/ui/GstTreatmentSelect.vue';
import Select from '@/components/ui/Select.vue';
import Modal from '@/components/Modal.vue';
import CustomFieldRenderer from '@/components/ui/CustomFieldRenderer.vue';
import { useI18n } from 'vue-i18n';
import { useCurrency } from '@/composables/useCurrency';
import { COMMON_CURRENCIES } from '@/constants/organization';
import UpgradePlanModal from '@/components/UpgradePlanModal.vue';
import PlanUpgradeCard from '@/components/ui/PlanUpgradeCard.vue';

const props = defineProps<{
  open: boolean;
  customer?: any;
}>();

const emit = defineEmits(['close', 'success']);

const customerStore = useCustomerStore();
const { currencyCode } = useCurrency();
const { t } = useI18n();
const isUpgradeModalOpen = ref(false);
const gstLimitError = ref<string | null>(null);
const loading = ref(false);
const isFetchingGst = ref(false);
const activeFormTab = ref('contact'); // 'contact', 'address', 'accounting', 'notes'

const newCustomer = ref({
  name: '',
  customerCode: '',
  email: '',
  phone: '',
  company: '',
  address: '',
  billingAddress: '',
  shippingAddress: '',
  paymentTerms: 'Due on Receipt',
  currency: currencyCode.value,
  website: '',
  notes: '',
  gstTreatment: 'Consumer (Unregistered)',
  gstNumber: '',
  pan: '',
  opening_balance: 0,
  customFields: {},
});

const isPanManuallyEdited = ref(false);
const lastAutoPan = ref('');

const handlePanInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const val = target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  newCustomer.value.pan = val;
  if (!val) {
    isPanManuallyEdited.value = false;
    lastAutoPan.value = '';
  } else {
    isPanManuallyEdited.value = true;
  }
};

watch(
  () => newCustomer.value.gstNumber,
  (gst) => {
    const cleanGst = (gst || '').trim().toUpperCase();
    if (cleanGst.length >= 12) {
      const extractedPan = cleanGst.substring(2, 12);
      if (!newCustomer.value.pan || !isPanManuallyEdited.value || newCustomer.value.pan === lastAutoPan.value) {
        newCustomer.value.pan = extractedPan;
        lastAutoPan.value = extractedPan;
        isPanManuallyEdited.value = false;
      }
    }
  },
  { immediate: true }
);

const fetchNextCustomerCode = async () => {
  try {
    const res = await api.get(`/organizations/numbering-sequences/customers/next?t=${Date.now()}`);
    newCustomer.value.customerCode = res.data.nextCode || '';
  } catch (err) {
    newCustomer.value.customerCode = '';
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
  () => newCustomer.value.gstTreatment,
  (val) => {
    if (val === 'Consumer (Unregistered)') {
      newCustomer.value.gstNumber = '';
    }
  }
);

const { errors, validate, clearErrors } = useFormValidation(customerSchema, newCustomer);

watch(
  () => props.open,
  (val) => {
    if (val) {
      activeFormTab.value = 'contact';
      if (props.customer) {
        const initialPan = props.customer.pan || '';
        isPanManuallyEdited.value = !!initialPan;
        lastAutoPan.value = '';
        newCustomer.value = {
          name: props.customer.name || '',
          customerCode: props.customer.customerCode || '',
          email: props.customer.email || '',
          phone: props.customer.phone || '',
          company: props.customer.company || '',
          address: props.customer.address || '',
          billingAddress: props.customer.billingAddress || '',
          shippingAddress: props.customer.shippingAddress || '',
          paymentTerms: props.customer.paymentTerms || 'Due on Receipt',
          currency: props.customer.currency || 'INR',
          website: props.customer.website || '',
          notes: props.customer.notes || '',
          gstTreatment: props.customer.gstTreatment || 'Consumer (Unregistered)',
          gstNumber: props.customer.gstNumber || '',
          pan: initialPan,
          opening_balance: props.customer.opening_balance || 0,
          customFields: props.customer.customFields || {},
        };
      } else {
        isPanManuallyEdited.value = false;
        lastAutoPan.value = '';
        newCustomer.value = {
          name: '',
          customerCode: '',
          email: '',
          phone: '',
          company: '',
          address: '',
          billingAddress: '',
          shippingAddress: '',
          paymentTerms: 'Due on Receipt',
          currency: currencyCode.value,
          website: '',
          notes: '',
          gstTreatment: 'Consumer (Unregistered)',
          gstNumber: '',
          pan: '',
          opening_balance: 0,
          customFields: {},
        };
        void fetchNextCustomerCode();
      }
      clearErrors();
    }
  },
  { immediate: true }
);

const handleFetchGst = async () => {
  const gstin = newCustomer.value.gstNumber?.trim().toUpperCase();
  if (!gstin) return;
  try {
    isFetchingGst.value = true;
    const res = await api.get(`/customers/gstin/${gstin}`);
    const data = res.data;

    if (data.name) newCustomer.value.name = data.name;
    if (data.company) newCustomer.value.company = data.company;
    if (data.address) {
      if (!newCustomer.value.address || data.source !== 'decoded') {
        newCustomer.value.address = data.address;
      }
      if (!newCustomer.value.billingAddress || data.source !== 'decoded') {
        newCustomer.value.billingAddress = data.address;
      }
    }

    if (newCustomer.value.gstTreatment === 'Consumer (Unregistered)') {
      newCustomer.value.gstTreatment = 'Registered';
    }

    if (data.source === 'decoded') {
      toast.info('State & entity type auto-detected!', {
        description: `${data.state} • ${data.entityType}. You can complete trade name manually.`,
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

const copyBillingToShipping = () => {
  newCustomer.value.shippingAddress = newCustomer.value.billingAddress;
  toast.success('Billing address copied to Shipping');
};

const handleSaveCustomer = async () => {
  if (!validate()) {
    toast.error('Customer details validation failed', {
      description: 'Please correct the errors in the form before saving.',
    });
    return;
  }

  loading.value = true;
  try {
    let result;
    if (props.customer?.id) {
      result = await customerStore.updateCustomer(props.customer.id, { ...newCustomer.value });
      toast.success('Customer updated successfully');
    } else {
      result = await customerStore.addCustomer({ ...newCustomer.value });
      toast.success('Customer added successfully');
    }
    emit('success', result);
    emit('close');
    clearErrors();
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to save customer details');
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
          <h2 class="text-xl font-bold text-foreground">{{ props.customer ? t('modals.customer.editTitle') : t('modals.customer.newTitle') }}</h2>
          <p class="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
            {{ props.customer ? t('modals.customer.editSubtitle') : t('modals.customer.newSubtitle') }}
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
          {{ t('modals.customer.tabs.primary') }}
        </button>
        <button
          type="button"
          @click="activeFormTab = 'address'"
          :class="[
            'px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap',
            activeFormTab === 'address' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          ]"
        >
          {{ t('modals.customer.tabs.addresses') }}
        </button>
        <button
          type="button"
          @click="activeFormTab = 'accounting'"
          :class="[
            'px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap',
            activeFormTab === 'accounting' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          ]"
        >
          {{ t('modals.customer.tabs.accounting') }}
        </button>
        <button
          type="button"
          @click="activeFormTab = 'notes'"
          :class="[
            'px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap',
            activeFormTab === 'notes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          ]"
        >
          {{ t('modals.customer.tabs.notes') }}
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
          Customer Code
        </label>
        <Input
          v-model="newCustomer.customerCode"
          placeholder="Auto-generated"
          class="h-11 rounded-xl font-mono uppercase"
        />
        <p class="text-[10px] text-muted-foreground ml-1">
          Leave blank to use the next configured number.
        </p>
      </div>

      <div class="space-y-2">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
          >{{ t('modals.customer.fields.name') }} <span class="text-destructive ml-0.5">*</span></label
        >
        <div class="relative">
          <User class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            v-model="newCustomer.name" 
            placeholder="John Doe" 
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
            >{{ t('modals.customer.fields.email') }}</label
          >
          <Input 
            v-model="newCustomer.email" 
            placeholder="john@example.com" 
            class="h-11 rounded-xl" 
            :class="{ 'border-destructive focus:border-destructive': errors.email }"
          />
          <p v-if="errors.email" class="text-[10px] text-destructive font-semibold mt-1">
            {{ errors.email }}
          </p>
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.customer.fields.phone') }}</label
          >
          <Input v-model="newCustomer.phone" placeholder="+91 99999-99999" class="h-11 rounded-xl" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.customer.fields.company') }}</label
          >
          <div class="relative">
            <Building2 class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input v-model="newCustomer.company" placeholder="Acme Inc." class="h-11 rounded-xl pl-10" />
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.customer.fields.website') }}</label
          >
          <Input v-model="newCustomer.website" placeholder="www.acme.com" class="h-11 rounded-xl" />
        </div>
      </div>
    </div>

    <!-- Addresses tab -->
    <div v-show="activeFormTab === 'address'" class="space-y-4 animate-in fade-in duration-200">
      <div class="space-y-2">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1">{{ t('modals.customer.fields.generalAddress') }}</label>
        <Textarea
          v-model="newCustomer.address"
          :placeholder="t('modals.customer.fields.generalAddressPlaceholder')"
          class="min-h-[70px] rounded-xl"
        />
      </div>

      <div class="border-t border-border/50 my-2 pt-2"></div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1">{{ t('modals.customer.fields.billingAddress') }}</label>
          <span class="text-[10px] text-muted-foreground font-medium">For Invoicing</span>
        </div>
        <Textarea
          v-model="newCustomer.billingAddress"
          :placeholder="t('modals.customer.fields.billingAddressPlaceholder')"
          class="min-h-[70px] rounded-xl"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1">{{ t('modals.customer.fields.shippingAddress') }}</label>
          <button
            type="button"
            @click="copyBillingToShipping"
            class="text-[9px] font-bold text-primary uppercase tracking-wider hover:underline"
          >
            {{ t('modals.customer.fields.copyBilling') }}
          </button>
        </div>
        <Textarea
          v-model="newCustomer.shippingAddress"
          :placeholder="t('modals.customer.fields.shippingAddressPlaceholder')"
          class="min-h-[70px] rounded-xl"
        />
      </div>
    </div>

    <!-- Accounting and tax tab -->
    <div v-show="activeFormTab === 'accounting'" class="space-y-4 animate-in fade-in duration-200">
      <div class="space-y-2">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
          >{{ t('modals.customer.fields.gstStatus') }} <span class="text-destructive ml-0.5">*</span></label
        >
        <GstTreatmentSelect
          v-model="newCustomer.gstTreatment"
          :error="!!errors.gstTreatment"
        />
        <p v-if="errors.gstTreatment" class="text-[10px] text-destructive font-semibold mt-1">
          {{ errors.gstTreatment }}
        </p>
      </div>

      <div v-if="newCustomer.gstTreatment === 'Registered' || newCustomer.gstTreatment === 'Composition'" class="space-y-2 animate-in slide-in-from-top-2 duration-200">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
          >{{ t('modals.customer.fields.gstNumber') }} <span class="text-destructive ml-0.5">*</span></label
        >
        <div class="relative group">
          <Input
            v-model="newCustomer.gstNumber"
            placeholder="22AAAAA0000A1Z5"
            class="h-12 rounded-xl uppercase pr-20 border-border/60 focus:border-primary/50 transition-all"
            :class="{ 'border-destructive focus:border-destructive': errors.gstNumber }"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            @click="handleFetchGst"
            :disabled="isFetchingGst || !newCustomer.gstNumber"
            class="absolute right-1 top-1 bottom-1 h-10 px-3 rounded-lg font-black uppercase tracking-widest text-[9px] text-primary hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-30"
          >
            <Loader2 v-if="isFetchingGst" size="sm" class="mr-1 h-3 w-3 animate-spin" />
            {{ isFetchingGst ? t('common.fetching') : t('common.fetch') }}
          </Button>
        </div>
        <p v-if="errors.gstNumber" class="text-[10px] text-destructive font-semibold mt-1">
          {{ errors.gstNumber }}
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
          :model-value="newCustomer.pan"
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
            >{{ t('modals.customer.fields.currency') }}</label
          >
          <Select
            v-model="newCustomer.currency"
            :options="currencies"
            placeholder="Select Currency"
          />
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
            >{{ t('modals.customer.fields.paymentTerms') }}</label
          >
          <Select
            v-model="newCustomer.paymentTerms"
            :options="paymentTermsOptions"
            placeholder="Select Terms"
          />
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
          >{{ t('modals.customer.fields.openingBalance') }}</label
        >
        <div class="relative">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">₹</span>
          <Input 
            type="number" 
            v-model="newCustomer.opening_balance" 
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

    <!-- Notes tab -->
    <div v-show="activeFormTab === 'notes'" class="space-y-4 animate-in fade-in duration-200">
      <div class="space-y-2">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1">{{ t('modals.customer.fields.internalNotes') }}</label>
        <Textarea
          v-model="newCustomer.notes"
          :placeholder="t('modals.customer.fields.internalNotesPlaceholder')"
          class="min-h-[150px] rounded-xl leading-relaxed"
        />
      </div>
    </div>

    <!-- Custom Fields tab -->
    <div v-show="activeFormTab === 'custom-fields'" class="space-y-4 animate-in fade-in duration-200">
      <CustomFieldRenderer
        entity="customer"
        v-model="newCustomer.customFields"
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
        @click="handleSaveCustomer"
        :disabled="loading"
        class="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2"
      >
        <Spinner v-if="loading" size="sm" class="text-primary-foreground" />
        {{ loading ? t('common.saving') : (props.customer ? t('common.save') : t('modals.customer.saveNew')) }}
      </Button>
    </template>
  </Modal>

  <UpgradePlanModal
    v-model:open="isUpgradeModalOpen"
    feature="general"
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

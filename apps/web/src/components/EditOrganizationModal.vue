<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "vue-sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Receipt,
  Building2,
  Loader2,
  MapPin,
  Camera,
  Upload,
  X,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useFormValidation } from "@/composables/useFormValidation";
import { organizationSchema } from "@/utils/validationSchemas";
import Modal from "@/components/Modal.vue";
import { useI18n } from "vue-i18n";

const emit = defineEmits(["close"]);

const authStore = useAuthStore();
const { t } = useI18n();
const { currentOrganization } = storeToRefs(authStore);
const loading = ref(false);
const isFetchingGst = ref(false);

const handleFetchGst = async () => {
  if (!formData.value.gstin) return;
  try {
    isFetchingGst.value = true;
    const res = await api.get(`/customers/gstin/${formData.value.gstin}`);
    if (res.data.name) formData.value.name = res.data.name;
    if (res.data.address) formData.value.address = res.data.address;
    toast.success("Business details fetched!");
  } catch (err: any) {
    toast.error(err.response?.data?.error || "Invalid GSTIN or fetch failed");
  } finally {
    isFetchingGst.value = false;
  }
};

const formData = ref({
  name: "",
  gstin: "",
  is_gst_registered: false,
  address: "",
});

const {
  errors,
  validate,
  clearErrors,
} = useFormValidation(organizationSchema, formData);

const fileInput = ref<HTMLInputElement | null>(null);
const previewUrl = ref<string | null>(null);
const selectedFile = ref<File | null>(null);

onMounted(() => {
  if (currentOrganization.value) {
    formData.value = {
      name: currentOrganization.value.name || "",
      gstin: currentOrganization.value.gstin || "",
      is_gst_registered: !!currentOrganization.value.is_gst_registered,
      address: currentOrganization.value.address || "",
    };
    previewUrl.value =
      currentOrganization.value.small_logo_url ||
      currentOrganization.value.logo_url ||
      null;
    clearErrors();
  }
});

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    selectedFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
  }
};

const handleSubmit = async () => {
  if (!validate()) {
    toast.error("Organization update failed", {
      description: "Please correct the errors in the organization form.",
    });
    return;
  }

  try {
    loading.value = true;

    const data = new FormData();
    data.append("name", formData.value.name);
    data.append("gstin", formData.value.gstin);
    data.append("is_gst_registered", String(formData.value.is_gst_registered));
    data.append("address", formData.value.address);

    if (selectedFile.value) {
      data.append("logo", selectedFile.value);
    }

    await authStore.updateOrganization(currentOrganization.value.id, data);
    toast.success("Organization updated successfully");
    emit("close");
  } catch (err: any) {
    toast.error(err.response?.data?.error || "Failed to update organization");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Modal
    :open="true"
    z-index-class="z-[100]"
    max-width-class="max-w-[500px]"
    body-class="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar"
    @close="emit('close')"
  >
    <template #header>
      <div class="px-5 py-4 border-b border-border/40 flex items-center justify-between bg-muted/5">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Building2 class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-foreground leading-none">{{ t('organization.editTitle') }}</h2>
            <p class="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-1">{{ t('organization.settingsIdentity') }}</p>
          </div>
        </div>
        <button type="button" aria-label="Close dialog" @click="emit('close')" class="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <X class="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </template>

    <form @submit.prevent="handleSubmit" id="edit-org-form" class="space-y-5">
      <div class="flex flex-col sm:flex-row gap-6 items-start">
        <!-- Left: Logo Upload -->
        <div class="flex flex-col items-center sm:items-start gap-2.5 shrink-0">
          <div class="relative group">
            <div
              class="w-20 h-20 rounded-xl border border-dashed border-border/60 overflow-hidden bg-muted/10 flex items-center justify-center transition-all group-hover:border-primary/50 group-hover:bg-primary/5 cursor-pointer relative"
              @click="triggerFileInput"
            >
              <img
                v-if="previewUrl"
                :src="previewUrl"
                class="w-full h-full object-cover"
              />
              <div v-else class="flex flex-col items-center gap-1 text-muted-foreground/60">
                <Upload class="w-6 h-6" />
                <span class="text-[9px] font-bold uppercase tracking-wider">{{ t('common.logo') }}</span>
              </div>
              
              <!-- Hover Overlay -->
              <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Camera class="w-5 h-5 text-white" />
              </div>
            </div>
            <button
              type="button"
              @click="triggerFileInput"
              class="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-lg shadow-md transition-transform hover:scale-105 active:scale-95 z-10"
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
          <div class="text-center sm:text-left mt-1">
            <h4 class="font-bold text-[11px] text-foreground leading-none">{{ t('organization.logoHelp') }}</h4>
            <p class="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-1.5 max-w-[100px] leading-tight">
              {{ t('organization.squareHelp') }}
            </p>
          </div>
        </div>

        <!-- Right: Main Form fields -->
        <div class="flex-1 w-full space-y-5">
          <!-- Name -->
          <div class="space-y-1.5">
            <Label
              for="name"
              class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-0.5"
              >{{ t('organization.name') }} <span class="text-destructive">*</span></Label
            >
            <div class="relative">
              <Building2 class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                id="name"
                v-model="formData.name"
                placeholder="e.g. Acme Corporation"
                class="pl-9 h-10 rounded-lg border-border/60 bg-muted/10 focus:border-primary focus:bg-transparent transition-all text-xs font-semibold"
                :class="{ 'border-destructive focus:border-destructive': errors.name }"
                required
              />
            </div>
            <p v-if="errors.name" class="text-[10px] text-destructive font-semibold mt-1 animate-in fade-in slide-in-from-top-1 duration-200 ml-0.5">
              {{ errors.name }}
            </p>
          </div>

          <!-- GST Toggle Switch -->
          <div
            class="flex items-center justify-between p-3.5 rounded-lg bg-muted/15 border border-border/60"
          >
            <div class="space-y-0.5">
              <Label class="text-xs font-bold text-foreground">{{ t('organization.gstRegistered') }}</Label>
              <p class="text-[9px] text-muted-foreground font-semibold uppercase tracking-tight">
                {{ t('organization.gstQuestion') }}
              </p>
            </div>
            <Switch v-model="formData.is_gst_registered" />
          </div>

          <!-- GSTIN Input -->
          <div v-if="formData.is_gst_registered" class="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
            <Label
              for="gstin"
              class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-0.5"
              >{{ t('organization.gstin') }} <span class="text-destructive">*</span></Label
            >
            <div class="relative group">
              <Receipt class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                id="gstin"
                v-model="formData.gstin"
                placeholder="22AAAAA0000A1Z5"
                class="pl-9 pr-16 h-10 rounded-lg border-border/60 bg-muted/10 focus:border-primary focus:bg-transparent transition-all text-xs font-semibold uppercase"
                :class="{ 'border-destructive focus:border-destructive': errors.gstin }"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                @click="handleFetchGst"
                :disabled="isFetchingGst || !formData.gstin"
                class="absolute right-1 top-1 bottom-1 h-8 px-2.5 rounded-md font-bold uppercase tracking-wider text-[9px] text-primary hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-30"
              >
                <Loader2 v-if="isFetchingGst" class="mr-1 h-3 w-3 animate-spin" />
                {{ isFetchingGst ? t('common.fetching') : t('common.fetch') }}
              </Button>
            </div>
            <p v-if="errors.gstin" class="text-[10px] text-destructive font-semibold mt-1 animate-in fade-in slide-in-from-top-1 duration-200 ml-0.5">
              {{ errors.gstin }}
            </p>
          </div>
        </div>
      </div>

      <!-- Address -->
      <div class="space-y-1.5 pt-1">
        <Label
          for="address"
          class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-0.5"
          >{{ t('organization.address') }}</Label
        >
        <div class="relative">
          <MapPin class="absolute left-3 top-3.5 h-3.5 w-3.5 text-muted-foreground/60" />
          <Textarea
            id="address"
            v-model="formData.address"
            class="pl-9 min-h-[85px] rounded-lg border-border/60 bg-muted/10 focus:border-primary focus:bg-transparent transition-all text-xs font-semibold"
            :class="{ 'border-destructive focus-visible:ring-destructive': errors.address }"
            :placeholder="t('organization.addressPlaceholder')"
          />
        </div>
      </div>
    </form>

    <!-- Footer -->
    <template #footer>
      <Button
        type="button"
        variant="ghost"
        class="flex-1 h-10 rounded-lg font-bold text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/40"
        @click="emit('close')"
      >
        {{ t('common.cancel') }}
      </Button>
      <Button
        type="submit"
        form="edit-org-form"
        class="flex-1 h-10 rounded-lg font-bold text-xs gap-2 shadow-none"
        :disabled="loading"
      >
        <Loader2 v-if="loading" class="w-3.5 h-3.5 animate-spin" />
        <span v-else>{{ t('common.save') }}</span>
      </Button>
    </template>
  </Modal>
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

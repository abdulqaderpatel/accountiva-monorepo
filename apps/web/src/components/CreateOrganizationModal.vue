<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, X } from "lucide-vue-next";
import Modal from "@/components/Modal.vue";
import { useI18n } from "vue-i18n";
import OrganizationFormFields, { type OrganizationFormData } from "./OrganizationFormFields.vue";
import UpgradePlanModal from "@/components/UpgradePlanModal.vue";

const emit = defineEmits(["close"]);

const authStore = useAuthStore();
const { t } = useI18n();
const loading = ref(false);
const isUpgradeModalOpen = ref(false);
const planLimitError = ref<string | null>(null);

const formData = ref<OrganizationFormData>({
  name: "",
  country: "India",
  region: "India",
  currency: "INR",
  is_gst_registered: false,
  gstin: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  state_code: "",
  postal_code: "",
  address: "",
  industry_type: "",
  business_nature: "",
});

const previewUrl = ref<string | null>(null);
const selectedFile = ref<File | null>(null);

const handleSelectFile = (file: File) => {
  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
};

const handleSubmit = async () => {
  if (!formData.value.name.trim()) {
    toast.error("Organization name is required");
    return;
  }

  if (formData.value.region === "India" && formData.value.postal_code && formData.value.postal_code.length !== 6) {
    toast.error("PIN code must be exactly 6 digits");
    return;
  }

  try {
    loading.value = true;
    
    const data = new FormData();
    data.append("name", formData.value.name.trim());
    data.append("region", formData.value.region);
    data.append("country", formData.value.country || (formData.value.region === "India" ? "India" : "Other"));
    data.append("currency", formData.value.currency);
    data.append("is_gst_registered", String(formData.value.is_gst_registered));
    data.append("gstin", formData.value.gstin || "");
    data.append("address_line1", formData.value.address_line1 || "");
    data.append("address_line2", formData.value.address_line2 || "");
    data.append("city", formData.value.city || "");
    data.append("state", formData.value.state || "");
    data.append("state_code", formData.value.state_code || "");
    data.append("postal_code", formData.value.postal_code || "");
    data.append("industry_type", formData.value.industry_type || "");
    data.append("business_nature", formData.value.business_nature || "");
    
    if (selectedFile.value) {
      data.append("logo", selectedFile.value);
    }

    await authStore.createOrganization(data);
    toast.success("Organization created successfully");
    emit("close");
  } catch (err: any) {
    const errorMsg = err.response?.data?.error || "Failed to create organization";
    const isPlanLimit = err.response?.status === 403 && (err.response?.data?.code === 'LIMIT_REACHED' || errorMsg.toLowerCase().includes('upgrade') || errorMsg.toLowerCase().includes('limit'));

    if (isPlanLimit) {
      planLimitError.value = errorMsg;
      isUpgradeModalOpen.value = true;
    } else {
      toast.error(errorMsg);
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Modal
    :open="true"
    z-index-class="z-[100]"
    max-width-class="max-w-[560px]"
    body-class="p-6 space-y-5 max-h-[82vh] overflow-y-auto custom-scrollbar"
    @close="emit('close')"
  >
    <template #header>
      <div class="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-surface-subtle">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Building2 class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-foreground leading-none">{{ t('organization.createTitle') }}</h2>
            <p class="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-1">{{ t('organization.newSetup') }}</p>
          </div>
        </div>
        <button type="button" aria-label="Close dialog" @click="emit('close')" class="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <X class="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </template>

    <form @submit.prevent="handleSubmit" id="create-org-form">
      <OrganizationFormFields
        v-model="formData"
        :previewUrl="previewUrl"
        @select-file="handleSelectFile"
      />
    </form>

    <!-- Footer -->
    <template #footer>
      <Button
        type="button"
        variant="outline"
        class="flex-1"
        @click="emit('close')"
      >
        {{ t('common.cancel') }}
      </Button>
      <Button
        type="submit"
        form="create-org-form"
        class="flex-1 gap-2"
        :disabled="loading"
      >
        <Loader2 v-if="loading" class="w-3.5 h-3.5 animate-spin" />
        <span v-else>{{ t('organization.createTitle') }}</span>
      </Button>
    </template>
  </Modal>

  <UpgradePlanModal
    :open="isUpgradeModalOpen"
    @update:open="isUpgradeModalOpen = $event"
    title="Organization Limit Reached"
    :description="planLimitError || 'Free plan users can only create 1 organization. Please upgrade to the Professional plan to create additional organizations.'"
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

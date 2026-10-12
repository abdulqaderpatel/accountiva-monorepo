<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "vue-sonner";
import { useExpenseStore } from "@/stores/expenseStore";
import Modal from "@/components/Modal.vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits(["close", "success"]);

const expenseStore = useExpenseStore();
const { t } = useI18n();
const loading = ref(false);
const accountName = ref("");
const error = ref("");

const handleAddAccount = async () => {
  const name = accountName.value.trim();
  if (!name) {
    error.value = "Account name is required";
    return;
  }
  
  error.value = "";
  loading.value = true;
  try {
    const created = await expenseStore.addPaymentAccount(name);
    toast.success("Payment account added successfully");
    emit("success", created);
    emit("close");
    accountName.value = "";
  } catch (err: any) {
    toast.error(err.response?.data?.error || "Failed to add payment account");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Modal
    :open="open"
    :title="t('modals.account.title')"
    :description="t('modals.account.subtitle')"
    max-width-class="max-w-md"
    z-index-class="z-[110]"
    body-class="p-6 space-y-4"
    @close="emit('close'); accountName = ''; error = '';"
  >
    <div class="space-y-2">
      <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1"
        >{{ t('modals.account.name') }} <span class="text-destructive ml-0.5">*</span></label
      >
      <Input
        v-model="accountName"
        :placeholder="t('modals.account.namePlaceholder')"
        class="h-11 rounded-xl"
        :class="{ 'border-destructive focus:border-destructive': error }"
        @keyup.enter="handleAddAccount"
      />
      <p v-if="error" class="text-[10px] text-destructive font-semibold mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
        {{ error }}
      </p>
    </div>

    <template #footer>
      <Button
        @click="emit('close')"
        variant="ghost"
        class="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px]"
        >{{ t('common.cancel') }}</Button
      >
      <Button
        @click="handleAddAccount"
        :disabled="loading"
        class="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2"
      >
        <Spinner v-if="loading" size="sm" class="text-primary-foreground" />
        {{ loading ? t('common.adding') : t('modals.account.add') }}
      </Button>
    </template>
  </Modal>
</template>

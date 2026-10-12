<script setup lang="ts">
import { ref, watch } from 'vue';
import { 
  Send, 
  Mail, 
  FileText,
  Loader2,
  AlertCircle,
  X
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useInvoiceStore } from '@/stores/invoiceStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'vue-sonner';
import Modal from '@/components/Modal.vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  open: boolean;
  invoice: any;
}>();

const emit = defineEmits(['close']);

const invoiceStore = useInvoiceStore();
const authStore = useAuthStore();
const { t } = useI18n();
const loading = ref(false);

const emailData = ref({
  recipientEmail: '',
  subject: '',
  message: ''
});

// Pre-fill when modal opens
watch(() => props.open, (isOpen) => {
  if (isOpen && props.invoice) {
    emailData.value = {
      recipientEmail: props.invoice.customers?.email || '',
      subject: t('modals.sendInvoice.emailSubject', {
        number: props.invoice.invoiceNumber,
        org: authStore.currentOrganization?.name || 'Accountiva'
      }),
      message: t('modals.sendInvoice.emailMessage', {
        customer: props.invoice.customers?.name || t('modals.customer.fields.customerPlaceholder'),
        org: authStore.currentOrganization?.name || 'Accountiva'
      })
    };
  }
}, { immediate: true });

const handleSend = async () => {
  if (!emailData.value.recipientEmail) {
    toast.error(t('modals.sendInvoice.recipientRequired') || 'Recipient email is required');
    return;
  }

  loading.value = true;
  try {
    await invoiceStore.sendInvoice(props.invoice.id, emailData.value);
    toast.success(t('modals.sendInvoice.sentSuccess') || 'Invoice sent successfully!', {
      description: `${t('modals.sendInvoice.sentTo') || 'Sent to'} ${emailData.value.recipientEmail}`
    });
    emit('close');
  } catch (err: any) {
    toast.error(err.response?.data?.error || t('modals.sendInvoice.sentFailed') || 'Failed to send email');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Modal
    :open="open"
    z-index-class="z-[120]"
    max-width-class="max-w-lg"
    body-class="p-6 space-y-6 overflow-y-auto max-h-[60vh]"
    @close="emit('close')"
  >
    <template #header>
      <div class="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Send class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-foreground">{{ t('modals.sendInvoice.title') }}</h2>
            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{{ t('modals.sendInvoice.subtitle') }}</p>
          </div>
        </div>
        <button type="button" aria-label="Close dialog" @click="emit('close')" class="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <X class="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </template>

    <!-- Recipient -->
    <div class="space-y-2">
      <Label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{{ t('modals.sendInvoice.recipient') }}</Label>
      <div class="relative group">
        <Mail class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          v-model="emailData.recipientEmail" 
          placeholder="customer@example.com"
          class="pl-11 h-11 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all"
        />
      </div>
      <div v-if="!invoice.customers?.email" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[10px] font-bold text-amber-500 uppercase tracking-tight">
        <AlertCircle class="w-3.5 h-3.5" />
        {{ t('modals.sendInvoice.noEmail') }}
      </div>
    </div>

    <!-- Subject -->
    <div class="space-y-2">
      <Label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{{ t('modals.sendInvoice.subject') }}</Label>
      <Input 
        v-model="emailData.subject" 
        placeholder="Invoice notification..."
        class="h-11 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all"
      />
    </div>

    <!-- Message -->
    <div class="space-y-2">
      <Label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{{ t('modals.sendInvoice.message') }}</Label>
      <Textarea 
        v-model="emailData.message" 
        :placeholder="t('modals.sendInvoice.messagePlaceholder')"
        class="min-h-[120px] rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all resize-none p-4"
      />
    </div>

    <!-- Quick Summary Card -->
    <div class="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between group">
       <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-border shadow-sm">
             <FileText class="w-4 h-4 text-primary" />
          </div>
          <div>
             <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{{ invoice.invoiceNumber }}</p>
             <p class="text-xs font-black text-foreground">{{ new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(invoice.amount) }}</p>
          </div>
       </div>
       <div class="text-right">
          <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{{ t('modals.sendInvoice.client') }}</p>
          <p class="text-xs font-bold text-foreground">{{ invoice.customers?.name }}</p>
       </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <Button @click="emit('close')" variant="ghost" class="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px]">
        {{ t('common.cancel') }}
      </Button>
      <Button @click="handleSend" :disabled="loading" class="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2">
        <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
        <Send v-else class="w-4 h-4" />
        {{ loading ? t('common.sending') : t('modals.sendInvoice.send') }}
      </Button>
    </template>
  </Modal>
</template>

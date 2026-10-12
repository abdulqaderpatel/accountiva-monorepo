<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Lock, ArrowUpCircle, Loader2 } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { openRazorpayCheckout } from '@/lib/razorpay';

const props = withDefaults(
  defineProps<{
    open: boolean;
    feature?: 'invoice' | 'customer' | 'general' | 'gstin' | 'member' | 'custom_fields';
    title?: string;
    description?: string;
  }>(),
  {
    feature: 'general',
  }
);

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const isUpgrading = ref(false);

const handleUpgrade = async () => {
  try {
    isUpgrading.value = true;

    // 1. Create Razorpay order on backend
    const { data: orderData } = await api.post('/billing/create-order', {
      billingCycle: 'monthly',
    });

    if (!orderData.orderId || !orderData.keyId) {
      throw new Error('Payment session was not created.');
    }

    emit('update:open', false);

    // 2. Open Razorpay Checkout modal
    await openRazorpayCheckout({
      keyId: orderData.keyId,
      orderId: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Accountiva',
      description: 'Accountiva Pro Plan (Monthly)',
      prefill: {
        name: authStore.user?.name || '',
        email: authStore.user?.email || '',
      },
      onSuccess: async (response) => {
        try {
          const verifyRes = await api.post('/billing/verify-payment', {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });

          if (verifyRes.data.success) {
            authStore.updateCurrentOrgPlan({
              plan: 'pro',
              plan_id: '00000000-0000-0000-0000-000000000002',
              plan_expires_at: verifyRes.data.expiresAt,
              billing_cycle: verifyRes.data.billingCycle,
            });
            toast.success('🎉 Welcome to Accountiva Pro!', {
              description: 'Your workspace has been upgraded successfully.',
            });
            await authStore.fetchOrganizations();
          }
        } catch (verifyErr: any) {
          console.error('[Billing] Payment verification failed:', verifyErr);
          toast.error(verifyErr.response?.data?.error || 'Payment verification failed');
        }
      },
      onDismiss: () => {
        toast.info('Payment window was closed.');
      },
    });
  } catch (err: any) {
    console.error('Upgrade initiation error:', err);
    toast.error(err.response?.data?.error || err.message || 'Payment initiation failed');
  } finally {
    isUpgrading.value = false;
  }
};

const handleViewPlans = () => {
  emit('update:open', false);
  router.push('/settings?tab=Billing');
};
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[480px] p-0 overflow-hidden bg-card border border-border/50 rounded-3xl">
      <!-- Header Section -->
      <div class="relative bg-muted/20 p-8 text-center border-b border-border/30">
        <div class="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-4">
          <Lock class="w-6 h-6" />
        </div>
        
        <DialogTitle class="text-2xl font-black tracking-tight text-foreground mb-1">
          {{ props.title || t('modals.upgrade.title') }}
        </DialogTitle>
        <DialogDescription class="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          <span v-if="props.description">{{ props.description }}</span>
          <span v-else-if="feature === 'invoice'">{{ t('modals.upgrade.subtitle.invoice') }}</span>
          <span v-else-if="feature === 'customer'">{{ t('modals.upgrade.subtitle.customer') }}</span>
          <span v-else>{{ t('modals.upgrade.subtitle.general') }}</span>
        </DialogDescription>
      </div>

      <!-- Feature List Section -->
      <div class="p-8 space-y-6">
        <div class="space-y-4">
          <h4 class="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{{ t('modals.upgrade.whatsIncluded') }}</h4>
          
            <div class="flex items-start gap-3">
              <div class="p-0.5 rounded-full bg-success/10 text-success mt-0.5">
                <Check class="w-3.5 h-3.5 font-bold" />
              </div>
              <div>
                <p class="text-xs font-bold text-foreground">{{ t('modals.upgrade.multiUser') }}</p>
                <p class="text-[10px] text-muted-foreground">{{ t('modals.upgrade.multiUserDesc') }}</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="p-0.5 rounded-full bg-success/10 text-success mt-0.5">
                <Check class="w-3.5 h-3.5 font-bold" />
              </div>
              <div>
                <p class="text-xs font-bold text-foreground">{{ t('modals.upgrade.watermark') }}</p>
                <p class="text-[10px] text-muted-foreground">{{ t('modals.upgrade.watermarkDesc') }}</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="p-0.5 rounded-full bg-success/10 text-success mt-0.5">
                <Check class="w-3.5 h-3.5 font-bold" />
              </div>
              <div>
                <p class="text-xs font-bold text-foreground">{{ t('modals.upgrade.gstFetch') }}</p>
                <p class="text-[10px] text-muted-foreground">{{ t('modals.upgrade.gstFetchDesc') }}</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="p-0.5 rounded-full bg-success/10 text-success mt-0.5">
                <Check class="w-3.5 h-3.5 font-bold" />
              </div>
              <div>
                <p class="text-xs font-bold text-foreground">{{ t('modals.upgrade.customFields') }}</p>
                <p class="text-[10px] text-muted-foreground">{{ t('modals.upgrade.customFieldsDesc') }}</p>
              </div>
            </div>
        </div>

        <!-- Price Banner -->
        <div class="bg-muted/30 border border-border/50 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span class="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-0.5">{{ t('modals.upgrade.plan') }}</span>
            <span class="text-lg font-black text-foreground">₹199 <span class="text-[10px] font-medium text-muted-foreground">/ {{ t('settings.billing.month') }}</span></span>
          </div>
          <span class="text-[9px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg uppercase tracking-wider">{{ t('modals.upgrade.discount') }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-2">
          <Button
            :disabled="isUpgrading"
            @click="handleUpgrade"
            class="w-full h-11 rounded-2xl font-bold uppercase tracking-widest text-[10px] gap-2"
          >
            <Loader2 v-if="isUpgrading" class="w-4 h-4 animate-spin" />
            <ArrowUpCircle v-else class="w-4 h-4" />
            {{ t('modals.upgrade.button') }}
          </Button>
          
          <Button
            variant="outline"
            @click="handleViewPlans"
            class="w-full h-11 rounded-2xl font-bold uppercase tracking-widest text-[10px] border-border/50 hover:bg-muted"
          >
            {{ t('modals.upgrade.compare') }}
          </Button>

        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

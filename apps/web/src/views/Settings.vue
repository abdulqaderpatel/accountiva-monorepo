<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import TopBar from '@/components/TopBar.vue';
import { useTheme, ACCENT_COLORS } from '@/composables/useTheme';
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core';
import {
  User,
  Bell,
  Palette,
  Shield,
  Globe,
  CreditCard,
  Sun,
  Moon,
  MoonStar,
  Monitor,
  Building2,
  MapPin,
  Receipt,
  Camera,
  Mail,
  Upload,
  Loader2,
  Settings as SettingsIcon,
  ChevronRight,
  Check,
  X,
  User as UserIcon,
	  Hash,
	} from 'lucide-vue-next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'vue-sonner';
import { storeToRefs } from 'pinia';
import { onMounted, watch } from 'vue';
import ViewGuard from '@/components/ViewGuard.vue';
import api from '@/lib/api';
import { openRazorpayCheckout } from '@/lib/razorpay';
import { useRouter, useRoute } from 'vue-router';
import { useFormValidation } from '@/composables/useFormValidation';
import { profileSchema } from '@/utils/validationSchemas';
import { useI18n } from 'vue-i18n';

const { theme, accentColor, setTheme, setAccentColor } = useTheme();
const { locale, t } = useI18n();
const currentLocale = computed(() => locale.value);

const changeLocale = (code: string) => {
  locale.value = code;
  localStorage.setItem('accountiva_locale', code);
  let msg = 'Language updated to English';
  if (code === 'hi') msg = 'भाषा हिन्दी में बदली गई';
  else if (code === 'es') msg = 'Idioma cambiado a Español';
  else if (code === 'ar') msg = 'تم تغيير اللغة إلى العربية';
  toast.success(msg);
};

const activeTab = ref('Account');
const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller('md');

const settingsSections = [
  { id: 'Account', icon: User, label: 'Account' },
  { id: 'Notifications', icon: Bell, label: 'Notifications' },
  { id: 'Display', icon: Palette, label: 'Display' },
  { id: 'Invoices', icon: Receipt, label: 'Invoices' },
  { id: 'Security', icon: Shield, label: 'Security' },
  { id: 'Billing', icon: CreditCard, label: 'Plans' },
];
const settingsSectionIds = new Set(settingsSections.map((section) => section.id));
const resolveSettingsTab = (tab: unknown) =>
  typeof tab === 'string' && settingsSectionIds.has(tab) ? tab : 'Account';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const { user, profile, currentOrganization } = storeToRefs(authStore);

// Profile Form State
const profileForm = ref({
  fullName: '',
  profilePictureUrl: '',
});
const profileFileInput = ref<HTMLInputElement | null>(null);
const profilePreviewUrl = ref<string | null>(null);
const profileSelectedFile = ref<File | null>(null);
const isSavingProfile = ref(false);
const PROFILE_PICTURE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_PICTURE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const {
  errors: profileErrors,
  validate: validateProfile,
  clearErrors: clearProfileErrors,
} = useFormValidation(profileSchema, profileForm);

const syncProfileForm = () => {
  if (profile.value) {
    if (profilePreviewUrl.value?.startsWith('blob:')) {
      URL.revokeObjectURL(profilePreviewUrl.value);
    }
    profileForm.value = {
      fullName: profile.value.full_name || '',
      profilePictureUrl: profile.value.profile_picture || '',
    };
    profilePreviewUrl.value = profile.value.profile_picture || null;
    clearProfileErrors();
  }
};

watch(profile, syncProfileForm);

watch(() => route.query.tab, (newTab) => {
  activeTab.value = resolveSettingsTab(newTab);
});

// Notification Preferences Logic
const notificationPreferences = ref({
  weekly_report: true,
});
const loadingPrefs = ref(false);

const fetchNotificationPreferences = async () => {
  loadingPrefs.value = true;
  try {
    const response = await api.get('/notifications/preferences');
    notificationPreferences.value = {
      weekly_report: response.data.weekly_report ?? true,
    };
  } catch (err) {
    console.error('Failed to fetch notification preferences:', err);
  } finally {
    loadingPrefs.value = false;
  }
};

const updatePreference = async (key: 'weekly_report', val: boolean) => {
  const oldVal = notificationPreferences.value[key];
  notificationPreferences.value[key] = val;

  try {
    const response = await api.put('/notifications/preferences', {
      [key]: val,
    });
    if (response?.data) {
      notificationPreferences.value.weekly_report = response.data.weekly_report ?? val;
    }
    toast.success('Preferences updated successfully');
  } catch (err: any) {
    console.error('Failed to update preference:', err);
    notificationPreferences.value[key] = oldVal;
    toast.error('Failed to update preferences');
  }
};

onMounted(async () => {
  activeTab.value = resolveSettingsTab(route.query.tab);
  if (!profile.value) {
    await authStore.fetchProfile();
  }
  await fetchNumberingSequences();
  syncProfileForm();
  await fetchNotificationPreferences();
});

// Profile Picture Handlers
const triggerProfileFileInput = () => profileFileInput.value?.click();
const handleProfileFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!PROFILE_PICTURE_TYPES.has(file.type)) {
    input.value = '';
    toast.error(t('settings.account.toast.invalidPictureType'));
    return;
  }

  if (file.size > PROFILE_PICTURE_MAX_BYTES) {
    input.value = '';
    toast.error(t('settings.account.toast.pictureTooLarge'));
    return;
  }

  if (profilePreviewUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(profilePreviewUrl.value);
  }
  profileSelectedFile.value = file;
  profilePreviewUrl.value = URL.createObjectURL(file);
};

onBeforeUnmount(() => {
  if (profilePreviewUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(profilePreviewUrl.value);
  }
});

const handleUpdateProfile = async () => {
  if (!validateProfile()) {
    toast.error(t('settings.account.toast.updateFailed'), {
      description: t('settings.account.toast.correctErrors'),
    });
    return;
  }
  isSavingProfile.value = true;
  try {
    const formData = new FormData();
    formData.append('fullName', profileForm.value.fullName);
    formData.append('profilePictureUrl', profileForm.value.profilePictureUrl);
    if (profileSelectedFile.value) {
      formData.append('profilePicture', profileSelectedFile.value);
    }
    await authStore.updateProfile(formData);
    toast.success(t('settings.account.toast.updateSuccess'));
    profileSelectedFile.value = null;
    if (profileFileInput.value) profileFileInput.value.value = '';
  } catch (error) {
    toast.error(t('settings.account.toast.saveError'));
  } finally {
    isSavingProfile.value = false;
  }
};

// Invoice Template State
const defaultTemplate = ref(localStorage.getItem('accountiva_default_template') || 'standard');

const handleUpdateTemplate = (id: string) => {
  defaultTemplate.value = id;
  localStorage.setItem('accountiva_default_template', id);
  toast.success('Default template updated');
};

type NumberingSequence = {
  module: 'customers' | 'vendors' | 'items';
  prefix: string;
  nextNumber: number;
  padding: number;
  enabled: boolean;
  preview: string;
};

const numberingLabels: Record<NumberingSequence['module'], string> = {
  customers: 'Customers',
  vendors: 'Vendors',
  items: 'Products / Items',
};

const numberingSequences = ref<NumberingSequence[]>([]);
const loadingNumbering = ref(false);
const savingNumberingModule = ref<string | null>(null);

const fetchNumberingSequences = async () => {
  loadingNumbering.value = true;
  try {
    const res = await api.get('/organizations/numbering-sequences');
    numberingSequences.value = res.data;
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to load numbering settings');
  } finally {
    loadingNumbering.value = false;
  }
};

const handleSaveNumbering = async (sequence: NumberingSequence) => {
  savingNumberingModule.value = sequence.module;
  try {
    const res = await api.put(`/organizations/numbering-sequences/${sequence.module}`, {
      prefix: sequence.prefix,
      nextNumber: Number(sequence.nextNumber),
      padding: Number(sequence.padding),
      enabled: sequence.enabled,
    });
    const index = numberingSequences.value.findIndex((item) => item.module === sequence.module);
    if (index >= 0) {
      numberingSequences.value[index] = res.data;
    }
    toast.success(`${numberingLabels[sequence.module]} numbering updated`);
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to save numbering settings');
  } finally {
    savingNumberingModule.value = null;
  }
};

// Pricing Plan State & Methods
const isBillingMonthly = ref(true);
const isSwitchingPlan = ref(false);
const selectedPlanId = ref<string | null>(null);

const plans = [
  {
    id: 'free',
    name: 'Free Starter',
    priceMonthly: 0,
    priceAnnually: 0,
    description: 'Essential invoicing tools for growing your business.',
    features: [
      { text: 'Invoices & Estimates', included: true },
      { text: 'Credit Notes & Refunds', included: true },
      { text: 'Customer & Product Catalog', included: true },
      { text: 'Multi-Currency Invoicing', included: true },
      { text: 'Multiple Invoice Templates', included: true },
      { text: 'Direct Email Invoicing', included: true },
      { text: 'CSV & JSON Data Exports', included: true },
      { text: '5 GSTIN Fetches included', included: true },
      { text: 'Multiple Users', included: false },
      { text: 'Watermark Removal', included: false },
      { text: 'Custom Fields', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Professional',
    priceMonthly: 199,
    priceAnnually: 1999,
    description: 'Complete power and automation for your entire team.',
    features: [
      { text: 'Invoices & Estimates', included: true },
      { text: 'Credit Notes & Refunds', included: true },
      { text: 'Customer & Product Catalog', included: true },
      { text: 'Multi-Currency Invoicing', included: true },
      { text: 'Multiple Invoice Templates', included: true },
      { text: 'Direct Email Invoicing', included: true },
      { text: 'CSV & JSON Data Exports', included: true },
      { text: 'Unlimited GSTIN Auto-Fetching', included: true },
      { text: 'Multiple Users', included: true },
      { text: 'Watermark Removal', included: true },
      { text: 'Custom Fields', included: true },
    ],
    popular: true,
  },
];

const isPlanActive = (planId: string) => {
  const currentOrgPlan = currentOrganization.value?.plan || (currentOrganization.value?.plan_id === '00000000-0000-0000-0000-000000000002' ? 'pro' : 'free');
  if (planId === 'free') {
    return currentOrgPlan === 'free';
  }
  if (planId === 'pro') {
    return currentOrgPlan === 'pro';
  }
  return false;
};

const handleSwitchPlan = async (planId: string) => {
  if (isPlanActive(planId)) return;

  if (planId === 'free') {
    toast.info('Plan Downgrade', {
      description: 'Your Pro subscription will automatically transition to Free Starter at the end of your paid billing period.',
    });
    return;
  }

  try {
    isSwitchingPlan.value = true;
    selectedPlanId.value = planId;

    // 1. Create Razorpay order session on backend
    const { data: orderData } = await api.post('/billing/create-order', {
      billingCycle: isBillingMonthly.value ? 'monthly' : 'yearly',
    });

    if (!orderData.orderId || !orderData.keyId) {
      throw new Error('Payment session was not created.');
    }

    // 2. Open Razorpay Checkout Modal
    await openRazorpayCheckout({
      keyId: orderData.keyId,
      orderId: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Accountiva',
      description: `Accountiva Pro Plan (${isBillingMonthly.value ? 'Monthly' : 'Annual'})`,
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
    console.error('Plan upgrade error:', err);
    toast.error(err.response?.data?.error || err.message || 'Payment initiation failed');
  } finally {
    isSwitchingPlan.value = false;
    selectedPlanId.value = null;
  }
};
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">

    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Settings" />

    <main class="flex-1 overflow-hidden bg-background flex flex-col relative">
      <ViewGuard module="settings" class="h-full">
        <div class="max-w-7xl mx-auto w-full px-8 flex flex-col h-full overflow-hidden min-h-0">
          <!-- Header (Fixed) -->
          <div class="pt-4 pb-3 shrink-0">
            <div>
              <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {{ $t('settings.title') }}
              </h1>
              <p class="text-xs md:text-sm text-muted-foreground mt-0.5">{{ $t('settings.subtitle') }}</p>
            </div>
          </div>

          <!-- Body with independent scroll -->
          <div class="flex-1 flex flex-col md:flex-row overflow-hidden md:gap-8 pt-2 md:pt-4 min-h-0">
            <!-- Sidebar Navigation -->
            <nav
              :class="[
                'shrink-0 flex gap-1 pb-4 md:pb-0 scrollbar-hide',
                isMobile ? 'overflow-x-auto border-b border-border/60 px-1' : 'w-48 lg:w-52 flex-col space-y-1'
              ]"
            >
              <button
                type="button"
                v-for="section in settingsSections"
                :key="section.id"
                @click="activeTab = section.id"
                :class="[
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left shrink-0 cursor-pointer',
                  activeTab === section.id
                    ? 'bg-primary/12 text-primary border border-primary/25 shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent',
                ]"
              >
                <component
                  :is="section.icon"
                  class="w-4 h-4 shrink-0 transition-colors"
                  :class="activeTab === section.id ? 'text-primary' : 'text-muted-foreground/70'"
                />
                <span :class="{ 'whitespace-nowrap': isMobile }">{{ $t('settings.sections.' + section.id.toLowerCase()) }}</span>
                <span
                  v-if="activeTab === section.id && !isMobile"
                  class="w-1.5 h-1.5 rounded-full bg-primary shrink-0 ml-auto"
                ></span>
              </button>
            </nav>

            <!-- Scrollable Content Area -->
            <div class="flex-1 overflow-y-auto pb-6 pt-4 md:pt-0 pr-4 -mr-4 min-h-0">
              <div class="space-y-6">
                <!-- Account Section -->
                <div
                  v-if="activeTab === 'Account'"
                  class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <Card class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                    <CardHeader class="p-5 md:p-6 border-b border-border/60 bg-card/30">
                      <CardTitle class="text-sm md:text-base font-bold text-foreground">{{ $t('settings.account.title') }}</CardTitle>
                      <CardDescription class="text-xs text-muted-foreground">{{ $t('settings.account.description') }}</CardDescription>
                    </CardHeader>
                    <CardContent class="p-6">
                      <div class="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
                        <!-- Profile Picture Upload -->
                        <div class="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/40 p-4 lg:flex-col lg:items-start">
                          <button
                            type="button"
                            class="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                            :aria-label="$t('settings.account.picture')"
                            @click="triggerProfileFileInput"
                          >
                            <span
                              class="flex size-20 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-background/60 transition-colors group-hover:border-primary/60 shadow-2xs"
                            >
                              <img
                                v-if="profilePreviewUrl"
                                :src="profilePreviewUrl"
                                :alt="$t('settings.account.picture')"
                                class="size-full object-cover"
                              />
                              <User v-else class="size-8 text-muted-foreground" />
                              <span class="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                <Camera class="size-5 text-white" />
                              </span>
                            </span>
                            <span class="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-2xs">
                              <Camera class="size-3.5" />
                            </span>
                          </button>
                          <input
                            ref="profileFileInput"
                            type="file"
                            class="hidden"
                            accept="image/jpeg,image/png,image/webp"
                            @change="handleProfileFileChange"
                          />
                          <div class="min-w-0 space-y-1 lg:pt-1">
                            <h4 class="text-sm font-bold text-foreground">{{ $t('settings.account.picture') }}</h4>
                            <p class="text-xs leading-relaxed text-muted-foreground">
                              {{ $t('settings.account.pictureHelp') }}
                            </p>
                          </div>
                        </div>

                        <div class="grid min-w-0 gap-5">
                        <div class="grid gap-1.5">
                          <Label class="ml-0.5 text-xs font-bold text-foreground"
                            >{{ $t('settings.account.publicName') }} <span class="text-destructive ml-0.5">*</span></Label
                          >
                          <Input
                            v-model="profileForm.fullName"
                            :placeholder="$t('settings.account.publicNamePlaceholder')"
                            class="h-10 rounded-xl border-border/70 bg-field/90 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs"
                            :class="{ 'border-destructive focus:border-destructive': profileErrors.fullName }"
                          />
                          <p v-if="profileErrors.fullName" class="text-[10px] text-destructive font-semibold mt-1 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
                            {{ $t('settings.account.toast.fullNameRequired') }}
                          </p>
                        </div>

                        <div class="grid gap-1.5">
                          <Label class="ml-0.5 text-xs font-bold text-foreground"
                            >{{ $t('settings.account.email') }}</Label
                          >
                          <div class="relative">
                            <Mail class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              :value="user?.email || ''"
                              disabled
                              class="h-10 cursor-not-allowed rounded-xl border-border/60 bg-muted/40 pl-9 text-sm text-muted-foreground disabled:opacity-100 shadow-2xs"
                            />
                          </div>
                          <p class="text-[10px] text-muted-foreground ml-1 italic">{{ $t('settings.account.emailHelp') }}</p>
                        </div>

                          <div class="flex justify-end border-t border-border/60 pt-5">
                            <Button
                              type="button"
                              @click="handleUpdateProfile"
                              :disabled="isSavingProfile"
                              class="h-10 min-w-32 gap-2 rounded-xl px-5 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all"
                            >
                              <Loader2 v-if="isSavingProfile" class="size-3.5 animate-spin" />
                              <span>{{ isSavingProfile ? $t('common.saving') : $t('settings.account.updateBtn') }}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
	                    </CardContent>
	                  </Card>

	                  <Card class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
	                    <CardHeader class="p-5 md:p-6 border-b border-border/60 bg-card/30">
	                      <CardTitle class="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
	                        <Hash class="w-4 h-4 text-primary" />
	                        Record Numbering
	                      </CardTitle>
	                      <CardDescription class="text-xs text-muted-foreground">
	                        Configure automatic serial codes for customers, vendors, and products.
	                      </CardDescription>
	                    </CardHeader>
	                    <CardContent class="p-6 space-y-4">
	                      <div v-if="loadingNumbering" class="text-xs text-muted-foreground font-medium">
	                        Loading numbering settings...
	                      </div>
	                      <div
	                        v-for="sequence in numberingSequences"
	                        :key="sequence.module"
	                        class="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] gap-3 items-end rounded-xl border border-border/60 bg-muted/20 p-4 hover:border-primary/30 transition-colors"
	                      >
	                        <div class="space-y-1">
	                          <Label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
	                            {{ numberingLabels[sequence.module] }}
	                          </Label>
	                          <div class="text-xs text-foreground font-mono font-bold">
	                            {{ sequence.preview || 'Manual only' }}
	                          </div>
	                        </div>
	                        <div class="space-y-1.5">
	                          <Label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prefix</Label>
	                          <Input v-model="sequence.prefix" class="h-10 rounded-xl font-mono uppercase bg-field/90 border-border/70 shadow-2xs" />
	                        </div>
	                        <div class="space-y-1.5">
	                          <Label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next No.</Label>
	                          <Input v-model.number="sequence.nextNumber" type="number" min="1" class="h-10 rounded-xl font-mono bg-field/90 border-border/70 shadow-2xs" />
	                        </div>
	                        <div class="space-y-1.5">
	                          <Label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Digits</Label>
	                          <Input v-model.number="sequence.padding" type="number" min="1" max="12" class="h-10 rounded-xl font-mono bg-field/90 border-border/70 shadow-2xs" />
	                        </div>
	                        <div class="space-y-1.5">
	                          <Label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Auto</Label>
	                          <div class="h-10 flex items-center">
	                            <Switch v-model="sequence.enabled" />
	                          </div>
	                        </div>
	                        <Button
	                          @click="handleSaveNumbering(sequence)"
	                          :disabled="savingNumberingModule === sequence.module"
	                          size="sm"
	                          class="h-10 px-4 rounded-xl font-bold uppercase tracking-wider text-[11px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all"
	                        >
	                          {{ savingNumberingModule === sequence.module ? 'Saving...' : 'Save' }}
	                        </Button>
	                      </div>
	                    </CardContent>
	                  </Card>
	                </div>

                <!-- Notifications Section -->
                <div
                  v-if="activeTab === 'Notifications'"
                  class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <Card class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                    <CardHeader class="p-5 md:p-6 border-b border-border/60 bg-card/30">
                      <CardTitle class="text-sm md:text-base font-bold text-foreground">{{ $t('settings.notifications.title') }}</CardTitle>
                      <CardDescription class="text-xs text-muted-foreground">{{ $t('settings.notifications.description') }}</CardDescription>
                    </CardHeader>
                    <CardContent class="p-6 space-y-4">
                      <div v-if="loadingPrefs" class="py-8 flex justify-center items-center">
                        <Loader2 class="w-6 h-6 animate-spin text-primary" />
                        <span class="text-xs text-muted-foreground ml-2">Loading preferences...</span>
                      </div>
                      <div v-else class="space-y-4">
                        <!-- Weekly Financial Summary Email -->
                        <div class="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/60">
                          <div class="space-y-0.5 pr-4">
                            <Label class="text-xs font-bold text-foreground">{{ $t('settings.notifications.weeklyReport') }}</Label>
                            <p class="text-[11px] text-muted-foreground leading-normal">{{ $t('settings.notifications.weeklyReportDesc') }}</p>
                          </div>
                          <Switch
                            :modelValue="notificationPreferences.weekly_report"
                            @update:modelValue="(val) => updatePreference('weekly_report', val)"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <!-- Display Section -->
                <div
                  v-if="activeTab === 'Display'"
                  class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <Card class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                    <CardHeader class="p-5 md:p-6 border-b border-border/60 bg-card/30">
                      <CardTitle class="text-sm md:text-base font-bold text-foreground">{{ $t('settings.display.title') }}</CardTitle>
                      <CardDescription class="text-xs text-muted-foreground">{{ $t('settings.display.description') }}</CardDescription>
                    </CardHeader>
                    <CardContent class="p-6 space-y-6">
                      <div class="space-y-2">
                        <Label class="text-xs font-bold text-foreground">{{ $t('settings.display.theme') }}</Label>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <button type="button"
                            v-for="t in ['light', 'dark', 'system']"
                            :key="t"
                            @click="setTheme(t)"
                            :class="[
                              'p-4 rounded-xl border text-left space-y-3 transition-all relative overflow-hidden group shadow-2xs',
                              theme === t
                                ? 'border-primary bg-primary/5 shadow-xs'
                                : 'border-border/60 bg-muted/20 hover:border-primary/40'
                            ]"
                          >
                            <div
                              v-if="t === 'light'"
                              class="w-full aspect-video bg-white rounded-lg border border-border flex items-center justify-center shadow-2xs"
                            >
                              <Sun class="w-6 h-6 text-foreground" />
                            </div>
                            <div
                              v-else-if="t === 'dark'"
                              class="w-full aspect-video bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-center shadow-2xs"
                            >
                              <Moon class="w-6 h-6 text-zinc-100" />
                            </div>
                            <div
                              v-else
                              class="w-full aspect-video rounded-lg border border-border flex relative overflow-hidden shadow-2xs"
                            >
                              <div class="flex-1 bg-white"></div>
                              <div class="flex-1 bg-zinc-950"></div>
                              <div class="absolute inset-0 flex items-center justify-center">
                                <div
                                  class="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-none"
                                >
                                  <Monitor class="w-5 h-5 text-foreground" />
                                </div>
                              </div>
                            </div>
                            <div class="flex items-center justify-between">
                              <span class="font-bold text-xs capitalize">{{ $t('settings.display.' + t) }}</span>
                              <div
                                v-if="theme === t"
                                class="w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                              >
                                <div class="w-1.5 h-1.5 rounded-full bg-primary-foreground"></div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>

                      <!-- Accent Color Selection -->
                      <div class="pt-6 border-t border-border/60 space-y-4">
                        <div class="space-y-1">
                          <Label class="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Palette class="w-4 h-4 text-primary" />
                            {{ $t('settings.display.accentColor') }}
                          </Label>
                          <p class="text-[11px] text-muted-foreground">{{ $t('settings.display.accentColorDesc') }}</p>
                        </div>
                        <div class="flex items-center gap-3 sm:gap-4 p-2 sm:p-2.5 rounded-2xl border border-border/50 bg-muted/20 w-fit">
                          <button
                            type="button"
                            v-for="color in ACCENT_COLORS"
                            :key="color.id"
                            :title="color.name"
                            :aria-label="color.name"
                            @click="setAccentColor(color.id)"
                            class="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                            :style="{ backgroundColor: color.colorHex }"
                            :class="[
                              accentColor === color.id
                                ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-105 shadow-sm'
                                : 'opacity-85 hover:opacity-100'
                            ]"
                          >
                            <Check
                              v-if="accentColor === color.id"
                              class="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white stroke-[3] drop-shadow-xs"
                            />
                          </button>
                        </div>
                      </div>

                      <!-- Language Selection -->
                      <div class="pt-6 border-t border-border/60 space-y-4">
                        <div class="space-y-1">
                          <Label class="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Globe class="w-4 h-4 text-primary" />
                            {{ $t('settings.display.language') }}
                          </Label>
                          <p class="text-[11px] text-muted-foreground">{{ $t('settings.display.languageDesc') }}</p>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                          <button type="button"
                            v-for="lang in [
                              { code: 'en', name: 'English', flag: '🇺🇸' },
                              { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
                              { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸' },
                              { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦' }
                            ]"
                            :key="lang.code"
                            @click="changeLocale(lang.code)"
                            :class="[
                              'flex items-center justify-between p-3 rounded-xl border text-left transition-all relative overflow-hidden group shadow-2xs h-11',
                              currentLocale === lang.code
                                ? 'border-primary bg-primary/10 shadow-xs'
                                : 'border-border/60 bg-muted/20 hover:border-primary/40'
                            ]"
                          >
                            <div class="flex items-center gap-2.5">
                              <span class="text-sm">{{ lang.flag }}</span>
                              <span class="font-bold text-xs">{{ lang.name }}</span>
                            </div>
                            <div
                              v-if="currentLocale === lang.code"
                              class="w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-none"
                            >
                              <div class="w-1.5 h-1.5 rounded-full bg-primary-foreground"></div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <!-- Invoices Section -->
                <div
                  v-if="activeTab === 'Invoices'"
                  class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <Card class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                    <CardHeader class="p-5 md:p-6 border-b border-border/60 bg-card/30">
                      <CardTitle class="text-sm md:text-base font-bold text-foreground">{{ $t('settings.invoices.title') }}</CardTitle>
                      <CardDescription class="text-xs text-muted-foreground">{{ $t('settings.invoices.description') }}</CardDescription>
                    </CardHeader>
                    <CardContent class="p-6 space-y-6">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button type="button"
                          v-for="t in [
                            { id: 'standard', name: 'Template 1', desc: 'Professional & Classic' },
                            { id: 'modern', name: 'Template 2', desc: 'Sleek & Contemporary' },
                            { id: 'minimal', name: 'Template 3', desc: 'Simple & Minimal' },
                            { id: 'premium', name: 'Template 4', desc: 'Elegant & Sophisticated' },
                          ]"
                          :key="t.id"
                          @click="handleUpdateTemplate(t.id)"
                          :class="[
                            'p-4 rounded-xl border text-left space-y-3 transition-all group shadow-2xs',
                            defaultTemplate === t.id
                              ? 'border-primary bg-primary/10 shadow-xs'
                              : 'border-border/60 bg-muted/20 hover:border-primary/40',
                          ]"
                        >
                          <div
                            class="w-full aspect-[4/3] bg-muted/20 rounded-lg border border-border flex flex-col items-center justify-center gap-2 overflow-hidden relative"
                          >
                            <!-- Template Preview Mockup (Differentiated per ID) -->
                            <div v-if="t.id === 'standard'" class="w-full h-full p-4 flex flex-col">
                              <div class="w-10 h-2 rounded-full bg-muted-foreground/20 mb-1"></div>
                              <div class="w-6 h-1 rounded-full bg-muted-foreground/10 mb-6"></div>
                              <div class="space-y-2 mt-auto">
                                <div class="w-full h-1 rounded-full bg-muted-foreground/5"></div>
                                <div class="w-full h-1 rounded-full bg-muted-foreground/5"></div>
                                <div class="w-3/4 h-1 rounded-full bg-muted-foreground/5"></div>
                              </div>
                            </div>
                            <div v-else-if="t.id === 'modern'" class="w-full h-full flex flex-col">
                              <div class="w-full h-1/3 bg-muted-foreground/10 p-3">
                                <div class="w-8 h-2 rounded-full bg-muted-foreground/20"></div>
                              </div>
                              <div class="p-3 space-y-2">
                                <div class="w-full h-1 rounded-full bg-muted-foreground/5"></div>
                                <div class="w-2/3 h-1 rounded-full bg-muted-foreground/5"></div>
                              </div>
                            </div>
                            <div
                              v-else-if="t.id === 'minimal'"
                              class="w-full h-full p-6 flex flex-col items-center text-center"
                            >
                              <div class="w-8 h-8 rounded-full bg-muted-foreground/10 mb-2"></div>
                              <div class="w-full space-y-1">
                                <div class="w-full h-1 rounded-full bg-muted-foreground/5"></div>
                                <div class="w-full h-1 rounded-full bg-muted-foreground/5"></div>
                              </div>
                            </div>
                            <div
                              v-else-if="t.id === 'premium'"
                              class="w-full h-full border-4 border-muted-foreground/10 p-4 flex flex-col"
                            >
                              <div class="flex justify-between mb-6">
                                <div class="w-8 h-8 bg-muted-foreground/20 rounded"></div>
                                <div class="w-12 h-2 bg-muted-foreground/10 rounded"></div>
                              </div>
                              <div class="space-y-2">
                                <div class="w-full h-1 rounded-full bg-muted-foreground/5"></div>
                                <div class="w-full h-1 rounded-full bg-muted-foreground/5"></div>
                              </div>
                            </div>

                            <div
                              v-if="defaultTemplate === t.id"
                              class="absolute inset-0 bg-primary/10 flex items-center justify-center"
                            >
                              <Check class="w-8 h-8 text-primary opacity-50" />
                            </div>
                          </div>
                          <div class="flex items-center justify-between">
                            <div>
                              <span class="font-bold text-xs">{{ $t('settings.invoices.' + t.id) }}</span>
                              <p class="text-[10px] text-muted-foreground mt-0.5">{{ $t('settings.invoices.' + t.id + 'Desc') }}</p>
                            </div>
                            <div
                              v-if="defaultTemplate === t.id"
                              class="w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-none"
                            >
                              <div class="w-1.5 h-1.5 rounded-full bg-primary-foreground"></div>
                            </div>
                          </div>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <!-- Security Section -->
                <div
                  v-if="activeTab === 'Security'"
                  class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <Card class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                    <CardHeader class="p-5 md:p-6 border-b border-border/60 bg-card/30">
                      <CardTitle class="text-sm md:text-base font-bold text-foreground">{{ $t('settings.security.title') }}</CardTitle>
                      <CardDescription class="text-xs text-muted-foreground">{{ $t('settings.security.description') }}</CardDescription>
                    </CardHeader>
                    <CardContent class="p-6 space-y-3">
                      <Button
                        variant="outline"
                        class="w-full h-10 px-5 rounded-xl border-border/70 hover:bg-muted/50 justify-start font-bold uppercase tracking-wider text-[11px] shadow-none"
                        >{{ $t('settings.security.changePassword') }}</Button
                      >
                      <Button
                        variant="outline"
                        class="w-full h-10 px-5 rounded-xl border-border/70 justify-start text-destructive hover:text-destructive hover:bg-destructive/10 font-bold uppercase tracking-wider text-[11px] shadow-none"
                        >{{ $t('settings.security.deleteAccount') }}</Button
                      >
                    </CardContent>
                  </Card>
                </div>

                <!-- Billing Section -->
                <div
                  v-if="activeTab === 'Billing'"
                  class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <Card class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                    <CardHeader class="p-5 md:p-6 border-b border-border/60 bg-card/30">
                      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div class="grid gap-1">
                          <CardTitle class="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
                            <span>{{ $t('settings.billing.title') }}</span>
                            <span v-if="currentOrganization?.name" class="font-normal text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
                              {{ currentOrganization.name }}
                            </span>
                          </CardTitle>
                          <CardDescription class="text-xs text-muted-foreground">
                            Subscription plans and entitlements are per-organization. All members in {{ currentOrganization?.name || 'this organization' }} share these plan benefits.
                          </CardDescription>
                        </div>

                        <!-- Billing Cycle Toggle -->
                        <div class="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60 self-start md:self-auto shadow-2xs">
                          <button type="button"
                            @click="isBillingMonthly = true"
                            :class="[
                              'px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all',
                              isBillingMonthly
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/50'
                            ]"
                          >
                            {{ $t('settings.billing.monthly') }}
                          </button>
                          <button type="button"
                            @click="isBillingMonthly = false"
                            :class="[
                              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all',
                              !isBillingMonthly
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/50'
                            ]"
                          >
                            {{ $t('settings.billing.annual') }}
                            <span class="bg-primary-foreground/20 text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-md">-16%</span>
                          </button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent class="p-6">
                      <!-- Billing Plan Cards Grid -->
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <div
                          v-for="plan in plans"
                          :key="plan.id"
                          :class="[
                            'relative flex flex-col p-6 rounded-2xl border transition-all duration-300 shadow-2xs',
                            isPlanActive(plan.id)
                              ? 'border-primary/50 bg-primary/[0.04]'
                              : 'border-border/60 hover:border-primary/40 bg-card/50'
                          ]"
                        >
                          <!-- Popular Badge -->
                          <span
                            v-if="plan.popular"
                            class="absolute top-4 right-4 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs"
                          >
                            {{ $t('settings.billing.popular') }}
                          </span>

                          <div class="mb-5">
                            <h4 class="text-sm font-bold text-foreground mb-1">{{ plan.name }}</h4>
                            <p class="text-[11px] text-muted-foreground font-medium min-h-[32px]">{{ plan.description }}</p>
                          </div>

                          <div class="flex items-baseline gap-1 mb-6">
                            <span class="text-2xl font-bold font-mono text-foreground">
                              ₹{{ isBillingMonthly ? plan.priceMonthly : plan.priceAnnually }}
                            </span>
                            <span class="text-xs text-muted-foreground font-bold">/ {{ isBillingMonthly ? $t('settings.billing.month') : $t('settings.billing.year') }}</span>
                          </div>

                          <!-- Switch Plan Button -->
                          <Button
                            :variant="isPlanActive(plan.id) ? 'outline' : 'default'"
                            class="w-full h-10 rounded-xl font-bold uppercase tracking-wider text-[11px] mb-6 flex items-center justify-center gap-2 transition-all"
                            :class="!isPlanActive(plan.id) ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/95' : 'border-border/70 hover:bg-muted/50'"
                            :disabled="isPlanActive(plan.id) || isSwitchingPlan"
                            @click="handleSwitchPlan(plan.id)"
                          >
                            <Loader2 v-if="isSwitchingPlan && selectedPlanId === plan.id" class="w-3.5 h-3.5 animate-spin" />
                            <span v-if="isPlanActive(plan.id)" class="flex items-center gap-1.5">
                              <Check class="w-3.5 h-3.5 font-bold" />
                              {{ $t('settings.billing.activePlan') }}
                            </span>
                            <span v-else-if="plan.priceMonthly > (plans.find(p => isPlanActive(p.id))?.priceMonthly || 0)">
                              {{ $t('settings.billing.upgradeTo', { plan: plan.name }) }}
                            </span>
                            <span v-else>
                              {{ $t('settings.billing.switchTo', { plan: plan.name }) }}
                            </span>
                          </Button>

                          <!-- Feature Checklist -->
                          <div class="space-y-3 mt-auto">
                            <div
                              v-for="(feature, fIndex) in plan.features"
                              :key="fIndex"
                              class="flex items-center gap-3"
                            >
                              <div
                                :class="[
                                  'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                                  feature.included
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                ]"
                              >
                                <Check v-if="feature.included" class="w-3 h-3 font-extrabold" />
                                <X v-else class="w-3 h-3" />
                              </div>
                              <span
                                :class="[
                                  'text-xs font-semibold',
                                  feature.included ? 'text-foreground/80' : 'text-muted-foreground line-through decoration-muted-foreground/30'
                                ]"
                              >
                                {{ feature.text }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ViewGuard>
    </main>
    </div>

    <!-- Modals -->
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

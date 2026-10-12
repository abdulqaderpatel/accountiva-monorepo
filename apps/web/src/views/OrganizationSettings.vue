<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import TopBar from '@/components/TopBar.vue';
import { useAuthStore } from '@/stores/authStore';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import api from '@/lib/api';
import { useRouter, useRoute } from 'vue-router';
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core';
import {
  Building2,
  MapPin,
  Receipt,
  Crown,
  ShieldCheck,
  Shield,
  Trash2,
  AlertTriangle,
  Calendar,
  Users,
  User,
  Loader2,
  Check,
  Info,
  Palette,
  Camera,
  Sparkles,
  CheckCircle2,
  BookmarkCheck,
  ArrowUpRight,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-vue-next';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import MemberManagement from '@/components/MemberManagement.vue';
import ViewGuard from '@/components/ViewGuard.vue';
import AuditLogs from '@/components/AuditLogs.vue';
import OrganizationBrandingSettings from '@/components/OrganizationBrandingSettings.vue';
import CustomFieldsManagement from '@/components/CustomFieldsManagement.vue';
import RecentlyDeleted from '@/components/RecentlyDeleted.vue';
import { useFormValidation } from '@/composables/useFormValidation';
import { organizationSchema } from '@/utils/validationSchemas';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const { currentOrganization } = storeToRefs(authStore);

type SettingsTab = 'info' | 'branding' | 'members' | 'custom-fields' | 'audit-logs' | 'recently-deleted';
const activeTab = ref<SettingsTab>('info');
const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller('md');

const canEdit = computed(() => {
  return currentOrganization.value?.role === 'owner' || currentOrganization.value?.role === 'admin';
});

const isOwner = computed(() => {
  return currentOrganization.value?.role === 'owner';
});

const settingsSections = computed(() => {
  const sections = [
    { id: 'info', icon: Building2, label: 'General' },
    { id: 'branding', icon: Palette, label: 'Branding' },
    { id: 'members', icon: Users, label: 'Team & Invites' },
  ];
  if (canEdit.value) {
    sections.push({ id: 'custom-fields', icon: SlidersHorizontal, label: 'Custom Fields' });
    sections.push({ id: 'audit-logs', icon: ShieldCheck, label: 'Audit Logs' });
  }
  sections.push({ id: 'recently-deleted', icon: Trash2, label: 'Recently Deleted' });
  return sections;
});

watch(
  () => route.query.tab,
  (newTab) => {
    if (
      newTab &&
      typeof newTab === 'string' &&
      ['info', 'branding', 'members', 'custom-fields', 'audit-logs', 'recently-deleted'].includes(newTab)
    ) {
      activeTab.value = newTab as SettingsTab;
    }
  },
  { immediate: true }
);

const handleSelectTab = (tabId: SettingsTab) => {
  activeTab.value = tabId;
  router.replace({ query: { ...route.query, tab: tabId } });
};

// Inline Form State for Workspace Profile
const formData = ref({
  name: '',
  gstin: '',
  is_gst_registered: false,
  address: '',
});

const { errors, validate, clearErrors } = useFormValidation(organizationSchema, formData);

const fileInput = ref<HTMLInputElement | null>(null);
const logoFile = ref<File | null>(null);
const logoPreview = ref<string | null>(null);
const isSavingProfile = ref(false);
const isFetchingGst = ref(false);

const syncFormData = () => {
  if (currentOrganization.value) {
    formData.value = {
      name: currentOrganization.value.name || '',
      gstin: currentOrganization.value.gstin || '',
      is_gst_registered: Boolean(currentOrganization.value.is_gst_registered),
      address: currentOrganization.value.address || '',
    };
    logoFile.value = null;
    if (logoPreview.value?.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview.value);
    }
    logoPreview.value = null;
    clearErrors();
  }
};

watch(() => currentOrganization.value?.id, syncFormData);

const hasFormChanges = computed(() => {
  if (!currentOrganization.value) return false;
  if (logoFile.value) return true;
  return (
    formData.value.name !== (currentOrganization.value.name || '') ||
    formData.value.gstin !== (currentOrganization.value.gstin || '') ||
    formData.value.is_gst_registered !== Boolean(currentOrganization.value.is_gst_registered) ||
    formData.value.address !== (currentOrganization.value.address || '')
  );
});

const triggerFileInput = () => {
  if (!canEdit.value) return;
  fileInput.value?.click();
};

const handleLogoChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    logoFile.value = file;
    if (logoPreview.value?.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview.value);
    }
    logoPreview.value = URL.createObjectURL(file);
  }
};

const handleFetchGst = async () => {
  if (!formData.value.gstin) return;
  try {
    isFetchingGst.value = true;
    const res = await api.get(`/customers/gstin/${formData.value.gstin}`);
    if (res.data.name) formData.value.name = res.data.name;
    if (res.data.address) formData.value.address = res.data.address;
    toast.success('Business details retrieved from GSTIN');
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Invalid GSTIN or lookup failed');
  } finally {
    isFetchingGst.value = false;
  }
};

const handleDiscardChanges = () => {
  syncFormData();
  toast.info('Changes discarded');
};

const handleSaveProfile = async () => {
  if (!canEdit.value || !currentOrganization.value) return;

  if (!validate()) {
    toast.error('Please resolve the errors before saving.');
    return;
  }

  isSavingProfile.value = true;
  try {
    const data = new FormData();
    data.append('name', formData.value.name);
    data.append('gstin', formData.value.gstin);
    data.append('is_gst_registered', String(formData.value.is_gst_registered));
    data.append('address', formData.value.address);

    if (logoFile.value) {
      data.append('logo', logoFile.value);
    }

    await authStore.updateOrganization(currentOrganization.value.id, data);
    toast.success('Workspace profile updated successfully');
    logoFile.value = null;
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to update workspace profile');
  } finally {
    isSavingProfile.value = false;
  }
};

// Default Org State
const defaultOrgId = ref<string | null>(localStorage.getItem('accountiva_default_org_id'));

const isDefaultOrg = computed(() => {
  return defaultOrgId.value === currentOrganization.value?.id;
});

const toggleDefaultOrg = () => {
  if (!currentOrganization.value) return;
  if (isDefaultOrg.value) {
    localStorage.removeItem('accountiva_default_org_id');
    defaultOrgId.value = null;
    toast.success('Default workspace preference removed');
  } else {
    localStorage.setItem('accountiva_default_org_id', currentOrganization.value.id);
    defaultOrgId.value = currentOrganization.value.id;
    toast.success(`${currentOrganization.value.name} is now your default workspace`);
  }
};

// Delete Org State
const isDeleteOrgModalOpen = ref(false);
const isDeletingOrg = ref(false);
const deleteConfirmName = ref('');

const handleDeleteOrganization = async () => {
  if (!currentOrganization.value) return;

  if (deleteConfirmName.value !== currentOrganization.value.name) {
    toast.error('Organization name does not match');
    return;
  }

  isDeletingOrg.value = true;
  try {
    await api.delete(`/organizations/${currentOrganization.value.id}`);
    if (localStorage.getItem('accountiva_default_org_id') === currentOrganization.value.id) {
      localStorage.removeItem('accountiva_default_org_id');
    }
    toast.success('Organization deleted successfully');
    isDeleteOrgModalOpen.value = false;

    await authStore.fetchOrganizations();
    if (authStore.organizations.length > 0) {
      authStore.setCurrentOrganization(authStore.organizations[0]);
      router.push('/dashboard');
    } else {
      authStore.setCurrentOrganization(null);
      router.push('/onboarding');
    }
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete organization');
  } finally {
    isDeletingOrg.value = false;
  }
};

onMounted(() => {
  syncFormData();
  if (route.query.tab) {
    const tabQuery = route.query.tab as string;
    if (
      tabQuery === 'members' ||
      tabQuery === 'branding' ||
      tabQuery === 'info' ||
      (tabQuery === 'audit-logs' && canEdit.value)
    ) {
      activeTab.value = tabQuery as SettingsTab;
    }
  }
});
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Settings" />

      <main class="flex-1 overflow-hidden bg-background flex flex-col relative">
        <ViewGuard module="settings" class="h-full">
          <div class="max-w-7xl mx-auto w-full px-6 md:px-8 flex flex-col h-full overflow-hidden min-h-0">
            <!-- Header -->
            <div class="pt-5 pb-4 shrink-0 border-b border-border/50">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    Organization Settings
                  </h1>
                  <p class="text-xs md:text-sm text-muted-foreground mt-0.5">
                    Manage your workspace profile, tax configuration, branding assets, and team collaboration.
                  </p>
                </div>
              </div>
            </div>

            <!-- Body with sidebar navigation & content -->
            <div class="flex-1 flex flex-col md:flex-row overflow-hidden md:gap-8 pt-4 min-h-0">
              <!-- Tab Navigation -->
              <nav
                :class="[
                  'shrink-0 flex gap-1 pb-3 md:pb-0 scrollbar-hide',
                  isMobile ? 'overflow-x-auto border-b border-border/60 px-1' : 'w-48 lg:w-52 flex-col space-y-1'
                ]"
              >
                <button
                  type="button"
                  v-for="section in settingsSections"
                  :key="section.id"
                  @click="handleSelectTab(section.id as SettingsTab)"
                  :class="[
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left shrink-0 cursor-pointer',
                    activeTab === section.id
                      ? 'bg-primary/12 text-primary border border-primary/25 shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent',
                  ]"
                >
                  <component
                    :is="section.icon"
                    class="w-4 h-4 shrink-0 transition-colors"
                    :class="activeTab === section.id ? 'text-primary' : 'text-muted-foreground/70'"
                  />
                  <span :class="{ 'whitespace-nowrap': isMobile }">{{ section.label }}</span>
                  <span
                    v-if="activeTab === section.id && !isMobile"
                    class="w-1.5 h-1.5 rounded-full bg-primary shrink-0 ml-auto"
                  ></span>
                </button>
              </nav>

              <!-- Scrollable Content Area -->
              <div class="flex-1 overflow-y-auto pb-10 pr-2 -mr-2 min-h-0 custom-scrollbar">
                <div class="space-y-6 max-w-4xl">
                  <!-- General Tab (Workspace Profile) -->
                  <div
                    v-if="activeTab === 'info'"
                    class="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300"
                  >
                    <!-- Card 1: Workspace Profile -->
                    <Card class="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                      <CardHeader class="p-5 md:p-6 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between gap-4">
                        <div class="min-w-0">
                          <CardTitle class="text-sm md:text-base font-bold text-foreground">
                            Workspace Profile
                          </CardTitle>
                          <CardDescription class="text-xs text-muted-foreground mt-0.5">
                            Update your organization display name, tax registration status, and official business address.
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          @click="activeTab = 'branding'"
                          class="shrink-0 h-8 px-3 rounded-xl border-border/70 hover:bg-primary/5 hover:border-primary/30 text-muted-foreground hover:text-primary font-bold uppercase tracking-wider text-[10px] gap-1.5 transition-all"
                        >
                          <Palette class="w-3.5 h-3.5" />
                          <span>Branding Tab</span>
                          <ArrowUpRight class="w-3 h-3 opacity-60" />
                        </Button>
                      </CardHeader>

                      <CardContent class="p-5 md:p-6 space-y-6">
                        <!-- Profile Identity Banner -->
                        <div class="rounded-2xl border border-border/60 bg-muted/10 p-4 md:p-5 flex flex-col sm:flex-row gap-4 md:gap-5 items-center sm:items-start shadow-2xs">
                          <!-- Avatar with Hover Trigger -->
                          <div class="relative group shrink-0">
                            <div
                              class="w-18 h-18 md:w-20 md:h-20 rounded-2xl border border-border/70 overflow-hidden bg-background flex items-center justify-center shadow-2xs relative"
                              :class="{ 'cursor-pointer': canEdit }"
                              @click="triggerFileInput"
                            >
                              <img
                                v-if="logoPreview || currentOrganization?.small_logo_url || currentOrganization?.logo_url"
                                :src="logoPreview || currentOrganization?.small_logo_url || currentOrganization?.logo_url"
                                :alt="currentOrganization?.name || 'Organization Logo'"
                                class="w-full h-full object-cover"
                              />
                              <Building2 v-else class="w-8 h-8 text-primary/60" />

                              <!-- Hover Camera Overlay for quick change -->
                              <div
                                v-if="canEdit"
                                class="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white"
                              >
                                <Camera class="w-4 h-4 mb-0.5" />
                                <span class="text-[9px] font-bold uppercase tracking-wider">Change</span>
                              </div>
                            </div>

                            <button
                              v-if="canEdit"
                              type="button"
                              @click="triggerFileInput"
                              class="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-lg shadow-sm transition-transform hover:scale-110 active:scale-95 z-10"
                              title="Upload workspace logo"
                            >
                              <Camera class="w-3 h-3" />
                            </button>
                            <input
                              type="file"
                              ref="fileInput"
                              class="hidden"
                              accept="image/*"
                              @change="handleLogoChange"
                            />
                          </div>

                          <!-- Identity Details & Badges -->
                          <div class="flex-1 min-w-0 text-center sm:text-left">
                            <h2 class="text-lg md:text-xl font-bold tracking-tight text-foreground leading-tight truncate">
                              {{ currentOrganization?.name || 'Workspace' }}
                            </h2>

                            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2.5">
                              <!-- Role Badge -->
                              <div
                                :class="[
                                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-2xs',
                                  currentOrganization?.role === 'owner'
                                    ? 'bg-amber-500 text-white dark:bg-amber-600 dark:text-white border-transparent'
                                    : currentOrganization?.role === 'admin'
                                      ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white border-transparent'
                                      : 'bg-secondary text-secondary-foreground border-border/60'
                                ]"
                              >
                                <component
                                  :is="currentOrganization?.role === 'owner' ? Crown : currentOrganization?.role === 'admin' ? ShieldCheck : User"
                                  class="w-3 h-3"
                                />
                                {{ currentOrganization?.role || 'Member' }}
                              </div>

                              <!-- Created Date Badge -->
                              <div class="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1 text-muted-foreground shadow-2xs">
                                <Calendar class="w-3 h-3 text-primary" />
                                <span class="text-[10px] font-bold uppercase tracking-wider">
                                  {{
                                    currentOrganization?.created_at
                                      ? new Date(currentOrganization.created_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                        })
                                      : 'Recently'
                                  }}
                                </span>
                              </div>

                              <!-- GST Status Badge -->
                              <div
                                :class="[
                                  'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-2xs',
                                  currentOrganization?.is_gst_registered
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                                ]"
                              >
                                <CheckCircle2 v-if="currentOrganization?.is_gst_registered" class="w-3 h-3" />
                                <Info v-else class="w-3 h-3" />
                                {{ currentOrganization?.is_gst_registered ? 'GST Registered' : 'Unregistered' }}
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Form Grid -->
                        <div class="space-y-5">
                          <!-- Workspace Name Field -->
                          <div class="space-y-1.5">
                            <Label for="org-name" class="text-xs font-semibold text-foreground flex items-center justify-between">
                              <span>Workspace Display Name <span class="text-destructive">*</span></span>
                            </Label>
                            <div class="relative">
                              <Building2 class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                              <Input
                                id="org-name"
                                v-model="formData.name"
                                :disabled="!canEdit"
                                placeholder="e.g. Acme Corporation"
                                class="pl-10 h-10 rounded-xl border-border/70 bg-background focus:border-primary focus:ring-primary/20 transition-all text-xs font-semibold"
                                :class="{ 'border-destructive focus:border-destructive': errors.name }"
                              />
                            </div>
                            <p v-if="errors.name" class="text-[11px] text-destructive font-medium mt-1 animate-in fade-in slide-in-from-top-1">
                              {{ errors.name }}
                            </p>
                          </div>

                          <!-- GST Registration Switch Container -->
                          <div class="rounded-xl border border-border/60 bg-muted/10 p-4 flex items-center justify-between gap-4 transition-colors">
                            <div class="space-y-0.5">
                              <Label class="text-xs font-bold text-foreground cursor-pointer" for="gst-switch">
                                Registered under GST
                              </Label>
                              <p class="text-[11px] text-muted-foreground leading-normal">
                                Enable if this workspace operates as a registered tax entity under Goods and Services Tax.
                              </p>
                            </div>
                            <Switch
                              id="gst-switch"
                              v-model="formData.is_gst_registered"
                              :disabled="!canEdit"
                            />
                          </div>

                          <!-- GSTIN Input with Auto-Fetch -->
                          <div
                            v-if="formData.is_gst_registered"
                            class="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-200"
                          >
                            <div class="flex items-center justify-between">
                              <Label for="org-gstin" class="text-xs font-semibold text-foreground">
                                GSTIN (Tax Identification Number) <span class="text-destructive">*</span>
                              </Label>
                              <span class="text-[10px] text-muted-foreground font-mono">15 Characters</span>
                            </div>

                            <div class="relative group">
                              <Receipt class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                              <Input
                                id="org-gstin"
                                v-model="formData.gstin"
                                :disabled="!canEdit"
                                maxlength="15"
                                placeholder="22AAAAA0000A1Z5"
                                class="pl-10 pr-28 h-10 rounded-xl border-border/70 bg-background focus:border-primary focus:ring-primary/20 transition-all text-xs font-bold uppercase tracking-wider"
                                :class="{ 'border-destructive focus:border-destructive': errors.gstin }"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                @click="handleFetchGst"
                                :disabled="isFetchingGst || !formData.gstin || !canEdit"
                                class="absolute right-1 top-1 bottom-1 h-8 px-2.5 rounded-lg font-bold uppercase tracking-wider text-[10px] text-primary hover:bg-primary/10 active:scale-95 transition-all disabled:opacity-30"
                              >
                                <Loader2 v-if="isFetchingGst" class="mr-1 h-3 w-3 animate-spin" />
                                <Sparkles v-else class="mr-1 h-3 w-3 text-primary" />
                                {{ isFetchingGst ? 'Fetching...' : 'Fetch Details' }}
                              </Button>
                            </div>
                            <p v-if="errors.gstin" class="text-[11px] text-destructive font-medium mt-1 animate-in fade-in slide-in-from-top-1">
                              {{ errors.gstin }}
                            </p>
                            <p class="text-[10px] text-muted-foreground leading-normal">
                              Click <strong class="text-foreground">Fetch Details</strong> to automatically retrieve and populate the legal entity name and registered address.
                            </p>
                          </div>

                          <!-- Business Address Field -->
                          <div class="space-y-1.5">
                            <Label for="org-address" class="text-xs font-semibold text-foreground">
                              Registered Business Address
                            </Label>
                            <div class="relative">
                              <MapPin class="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                              <Textarea
                                id="org-address"
                                v-model="formData.address"
                                :disabled="!canEdit"
                                placeholder="Building number, Street, City, State, and Postal Code"
                                rows="3"
                                class="pl-10 min-h-[90px] rounded-xl border-border/70 bg-background focus:border-primary focus:ring-primary/20 transition-all text-xs font-medium leading-relaxed"
                                :class="{ 'border-destructive focus:border-destructive': errors.address }"
                              />
                            </div>
                            <p v-if="errors.address" class="text-[11px] text-destructive font-medium mt-1 animate-in fade-in slide-in-from-top-1">
                              {{ errors.address }}
                            </p>
                            <p class="text-[10px] text-muted-foreground leading-normal">
                              This address appears on generated tax invoices, estimates, and customer billing statements.
                            </p>
                          </div>
                        </div>
                      </CardContent>

                      <!-- Card Footer with Inline Actions -->
                      <CardFooter class="p-4 md:px-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div class="text-xs text-muted-foreground flex items-center gap-1.5 text-center sm:text-left">
                          <Info class="w-3.5 h-3.5 text-primary/80 shrink-0" />
                          <span v-if="canEdit">Changes will apply across all new invoices and workspace documents.</span>
                          <span v-else>You are viewing this workspace as a member. Contact an administrator to update settings.</span>
                        </div>

                        <div v-if="canEdit" class="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                          <Button
                            v-if="hasFormChanges"
                            type="button"
                            variant="ghost"
                            size="sm"
                            @click="handleDiscardChanges"
                            :disabled="isSavingProfile"
                            class="h-9 px-3.5 rounded-xl font-bold uppercase tracking-wider text-[11px] text-muted-foreground hover:text-foreground gap-1"
                          >
                            <RotateCcw class="w-3 h-3" />
                            Discard
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            @click="handleSaveProfile"
                            :disabled="!hasFormChanges || isSavingProfile"
                            class="h-9 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 transition-all active:scale-[0.98]"
                          >
                            <Loader2 v-if="isSavingProfile" class="w-3.5 h-3.5 animate-spin" />
                            <Check v-else class="w-3.5 h-3.5" />
                            <span>{{ isSavingProfile ? 'Saving...' : 'Save Changes' }}</span>
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>

                    <!-- Card 2: Default Workspace -->
                    <Card class="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
                      <CardHeader class="p-5 md:p-6 border-b border-border/50 bg-muted/10">
                        <CardTitle class="text-sm md:text-base font-bold text-foreground">
                          Default Workspace
                        </CardTitle>
                        <CardDescription class="text-xs text-muted-foreground mt-0.5">
                          Specify which workspace automatically loads when you sign in or launch Accountiva.
                        </CardDescription>
                      </CardHeader>

                      <CardContent class="p-5 md:p-6">
                        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-muted/10 border border-border/60">
                          <div class="flex items-center gap-3.5 min-w-0">
                            <div class="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                              <BookmarkCheck class="w-5 h-5" />
                            </div>
                            <div class="space-y-0.5 min-w-0">
                              <h4 class="font-bold text-xs text-foreground">Launch on Startup</h4>
                              <p class="text-[11px] text-muted-foreground leading-normal">
                                {{
                                  isDefaultOrg
                                    ? 'This workspace is currently configured to load automatically on sign-in.'
                                    : 'Make this workspace load automatically instead of the last active organization.'
                                }}
                              </p>
                            </div>
                          </div>

                          <div class="flex items-center gap-3 shrink-0">
                            <span
                              :class="[
                                'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-2xs',
                                isDefaultOrg
                                  ? 'bg-primary/12 text-primary border-primary/25'
                                  : 'bg-muted/40 text-muted-foreground border-border/60'
                              ]"
                            >
                              <Check v-if="isDefaultOrg" class="w-3 h-3" />
                              {{ isDefaultOrg ? 'Default' : 'Standard' }}
                            </span>
                            <Switch
                              :model-value="isDefaultOrg"
                              @update:model-value="toggleDefaultOrg"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <!-- Card 3: Danger Zone (Delete Workspace) -->
                    <div
                      v-if="isOwner"
                      class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                      <Card class="bg-card border border-destructive/25 rounded-2xl shadow-2xs overflow-hidden py-0 gap-0">
                        <CardHeader class="p-5 md:p-6 border-b border-destructive/15 bg-destructive/[0.02]">
                          <CardTitle class="text-sm md:text-base font-bold text-destructive flex items-center gap-2">
                            <AlertTriangle class="w-4 h-4" />
                            Delete Organization
                          </CardTitle>
                          <CardDescription class="text-xs text-muted-foreground mt-0.5">
                            Permanently delete this organization, including all associated invoices, transactions, customer records, and team memberships.
                          </CardDescription>
                        </CardHeader>

                        <CardContent class="p-5 md:p-6">
                          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-destructive/[0.03] border border-destructive/20">
                            <div class="space-y-0.5 text-center sm:text-left">
                              <h4 class="font-bold text-xs text-foreground">Confirm Permanent Removal</h4>
                              <p class="text-[11px] text-muted-foreground leading-normal">
                                This action requires owner privileges and cannot be reversed or undone.
                              </p>
                            </div>
                            <Button
                              variant="destructive"
                              @click="isDeleteOrgModalOpen = true"
                              class="h-9 shrink-0 gap-1.5 px-4 text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-xs"
                            >
                              <Trash2 class="w-3.5 h-3.5" />
                              Delete Workspace
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <!-- Branding Tab -->
                  <div v-if="activeTab === 'branding'">
                    <OrganizationBrandingSettings />
                  </div>

                  <!-- Members Section -->
                  <div
                    v-if="activeTab === 'members'"
                    class="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300"
                  >
                    <MemberManagement />
                  </div>

                  <!-- Custom Fields Section -->
                  <div
                    v-if="activeTab === 'custom-fields' && canEdit"
                    class="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300"
                  >
                    <CustomFieldsManagement />
                  </div>

                  <!-- Audit Logs Section -->
                  <div
                    v-if="activeTab === 'audit-logs' && canEdit"
                    class="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300"
                  >
                    <AuditLogs />
                  </div>

                  <!-- Recently Deleted Section -->
                  <div
                    v-if="activeTab === 'recently-deleted'"
                    class="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300"
                  >
                    <RecentlyDeleted :key="`${currentOrganization?.id || 'default'}-recently-deleted`" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ViewGuard>
      </main>
    </div>

    <!-- Delete Organization Confirmation Modal -->
    <Dialog :open="isDeleteOrgModalOpen" @update:open="isDeleteOrgModalOpen = $event">
      <DialogContent class="sm:max-w-[440px] p-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card">
        <div class="p-6 border-b border-border/40 bg-muted/20">
          <DialogHeader class="flex flex-col items-center text-center">
            <div class="w-11 h-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3 mx-auto border border-destructive/20 shadow-xs">
              <AlertTriangle class="w-5 h-5" />
            </div>
            <DialogTitle class="text-base md:text-lg font-bold">Delete Organization</DialogTitle>
            <DialogDescription class="text-muted-foreground font-medium text-xs mt-1">
              You are about to permanently delete
              <span class="text-foreground font-bold">"{{ currentOrganization?.name }}"</span>.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div class="p-5 space-y-4">
          <div class="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/15">
            <AlertTriangle class="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div class="text-[11px] font-medium text-destructive/90 leading-relaxed space-y-1">
              <p>
                All financial ledgers, tax invoices, customer lists, and member associations within this workspace will be permanently erased.
              </p>
              <p v-if="authStore.organizations.length <= 1" class="font-bold text-destructive">
                Since this is your only workspace, you will be redirected to onboarding to create or join a new workspace.
              </p>
            </div>
          </div>

          <div class="space-y-1.5">
            <Label class="text-xs font-semibold text-muted-foreground">
              Please type <strong class="text-foreground font-bold">"{{ currentOrganization?.name }}"</strong> to confirm:
            </Label>
            <Input
              v-model="deleteConfirmName"
              :placeholder="currentOrganization?.name"
              class="h-10 rounded-xl border-border/70 focus:border-destructive transition-all bg-background px-3 text-xs font-semibold"
            />
          </div>
        </div>

        <DialogFooter class="p-4 bg-muted/15 border-t border-border/40 flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="ghost"
            @click="isDeleteOrgModalOpen = false"
            class="flex-1 h-9 rounded-xl font-bold uppercase tracking-wider text-[11px] text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            @click="handleDeleteOrganization"
            :disabled="isDeletingOrg || deleteConfirmName !== currentOrganization?.name"
            class="flex-1 h-9 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 shadow-xs"
          >
            <Loader2 v-if="isDeletingOrg" class="w-3.5 h-3.5 animate-spin" />
            <Trash2 v-else class="w-3.5 h-3.5" />
            {{ isDeletingOrg ? 'Deleting...' : 'Delete Workspace' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--muted-foreground);
}
</style>

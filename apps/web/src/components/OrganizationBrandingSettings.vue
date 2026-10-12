<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
  Building2,
  CheckCircle2,
  ImageIcon,
  Loader2,
  ShieldCheck,
  Shield,
  Trash2,
  Undo2,
  Upload,
  FileText,
  Camera,
  Check,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';

type LogoVariant = 'small' | 'large';
type LogoRules = {
  maxBytes: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  minRatio?: number;
  maxRatio?: number;
  label: string;
};

const rules: Record<LogoVariant, LogoRules> = {
  small: {
    maxBytes: 5 * 1024 * 1024,
    minWidth: 16,
    minHeight: 16,
    maxWidth: 4096,
    maxHeight: 4096,
    label: 'Compact mark',
  },
  large: {
    maxBytes: 5 * 1024 * 1024,
    minWidth: 16,
    minHeight: 16,
    maxWidth: 4096,
    maxHeight: 4096,
    label: 'Full logo',
  },
};

const authStore = useAuthStore();
const { currentOrganization } = storeToRefs(authStore);

const smallInput = ref<HTMLInputElement | null>(null);
const largeInput = ref<HTMLInputElement | null>(null);
const smallFile = ref<File | null>(null);
const largeFile = ref<File | null>(null);
const smallPreview = ref<string | null>(null);
const largePreview = ref<string | null>(null);
const removeSmall = ref(false);
const removeLarge = ref(false);
const isSaving = ref(false);

const isDraggingSmall = ref(false);
const isDraggingLarge = ref(false);

const canEdit = computed(() => ['owner', 'admin'].includes(currentOrganization.value?.role));
const savedSmallLogo = computed(
  () => currentOrganization.value?.small_logo_url || currentOrganization.value?.logo_url || null,
);
const savedLargeLogo = computed(() => currentOrganization.value?.large_logo_url || null);

const displayedSmallLogo = computed(() =>
  smallPreview.value || (removeSmall.value ? null : savedSmallLogo.value),
);
const displayedLargeLogo = computed(() =>
  largePreview.value || (removeLarge.value ? null : savedLargeLogo.value),
);

const hasChanges = computed(() =>
  Boolean(smallFile.value || largeFile.value || removeSmall.value || removeLarge.value),
);

function revokePreview(preview: typeof smallPreview) {
  if (preview.value?.startsWith('blob:')) URL.revokeObjectURL(preview.value);
  preview.value = null;
}

function resetChanges() {
  revokePreview(smallPreview);
  revokePreview(largePreview);
  smallFile.value = null;
  largeFile.value = null;
  removeSmall.value = false;
  removeLarge.value = false;
  isDraggingSmall.value = false;
  isDraggingLarge.value = false;
  if (smallInput.value) smallInput.value.value = '';
  if (largeInput.value) largeInput.value.value = '';
}

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The selected file is not a valid image'));
    };
    image.src = url;
  });
}

async function validateFile(file: File, variant: LogoVariant) {
  const specification = rules[variant];
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error(`${specification.label} must be a PNG, JPEG, or WebP image`);
  }
  if (file.size > specification.maxBytes) {
    throw new Error(
      `${specification.label} must be ${specification.maxBytes / 1024 / 1024} MB or smaller`,
    );
  }

  const dimensions = await readDimensions(file);
  if (dimensions.width < specification.minWidth || dimensions.height < specification.minHeight) {
    throw new Error(
      `${specification.label} must be at least ${specification.minWidth}×${specification.minHeight} pixels`,
    );
  }
  if (dimensions.width > specification.maxWidth || dimensions.height > specification.maxHeight) {
    throw new Error(
      `${specification.label} must not exceed ${specification.maxWidth}×${specification.maxHeight} pixels`,
    );
  }
}

async function handleFileSelection(event: Event, variant: LogoVariant) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    await validateFile(file, variant);
    const targetFile = variant === 'small' ? smallFile : largeFile;
    const targetPreview = variant === 'small' ? smallPreview : largePreview;
    revokePreview(targetPreview);
    targetFile.value = file;
    targetPreview.value = URL.createObjectURL(file);
    if (variant === 'small') removeSmall.value = false;
    else removeLarge.value = false;
    toast.success(`${rules[variant].label} staged for upload`);
  } catch (error: any) {
    input.value = '';
    toast.error(error.message || 'Invalid logo file');
  }
}

async function handleDrop(event: DragEvent, variant: LogoVariant) {
  if (variant === 'small') isDraggingSmall.value = false;
  else isDraggingLarge.value = false;

  if (!canEdit.value) return;
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;

  try {
    await validateFile(file, variant);
    const targetFile = variant === 'small' ? smallFile : largeFile;
    const targetPreview = variant === 'small' ? smallPreview : largePreview;
    revokePreview(targetPreview);
    targetFile.value = file;
    targetPreview.value = URL.createObjectURL(file);
    if (variant === 'small') removeSmall.value = false;
    else removeLarge.value = false;
    toast.success(`${rules[variant].label} staged for upload`);
  } catch (error: any) {
    toast.error(error.message || 'Invalid logo file');
  }
}

function markForRemoval(variant: LogoVariant) {
  const targetFile = variant === 'small' ? smallFile : largeFile;
  const targetPreview = variant === 'small' ? smallPreview : largePreview;
  const targetInput = variant === 'small' ? smallInput : largeInput;
  revokePreview(targetPreview);
  targetFile.value = null;
  if (targetInput.value) targetInput.value.value = '';
  if (variant === 'small') removeSmall.value = Boolean(savedSmallLogo.value);
  else removeLarge.value = Boolean(savedLargeLogo.value);
}

function undoRemoval(variant: LogoVariant) {
  if (variant === 'small') removeSmall.value = false;
  else removeLarge.value = false;
}

async function saveBranding() {
  if (!currentOrganization.value || !hasChanges.value || !canEdit.value) return;
  const data = new FormData();
  if (smallFile.value) data.append('smallLogo', smallFile.value);
  if (largeFile.value) data.append('largeLogo', largeFile.value);
  if (removeSmall.value) data.append('removeSmallLogo', 'true');
  if (removeLarge.value) data.append('removeLargeLogo', 'true');

  isSaving.value = true;
  try {
    await authStore.updateOrganizationBranding(currentOrganization.value.id, data);
    resetChanges();
    toast.success('Organization branding updated successfully');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update organization branding');
  } finally {
    isSaving.value = false;
  }
}

watch(() => currentOrganization.value?.id, resetChanges);
onBeforeUnmount(resetChanges);
</script>

<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
    <Card class="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
      <!-- Header -->
      <CardHeader class="p-5 md:p-6 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between gap-4">
        <div class="min-w-0">
          <CardTitle class="text-sm md:text-base font-bold text-foreground">
            Workspace Branding
          </CardTitle>
          <CardDescription class="text-xs text-muted-foreground mt-0.5">
            Manage your company logos for navigation, invoices, and exported financial documents.
          </CardDescription>
        </div>
        <div class="shrink-0">
          <span
            v-if="canEdit"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary/12 text-primary border border-primary/25 shadow-2xs"
          >
            <ShieldCheck class="w-3.5 h-3.5" />
            Owners & Admins
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-muted/40 text-muted-foreground border border-border/60"
          >
            <Shield class="w-3.5 h-3.5" />
            View Only
          </span>
        </div>
      </CardHeader>

      <CardContent class="p-5 md:p-6 space-y-6">
        <!-- Two-column Logo Panels -->
        <div class="grid gap-6 lg:grid-cols-2">
          <!-- Panel 1: Compact Mark (Square) -->
          <div class="rounded-2xl border border-border/60 bg-muted/10 p-5 flex flex-col justify-between space-y-4 shadow-2xs">
            <div>
              <div class="flex items-start justify-between gap-3 mb-1">
                <div>
                  <h3 class="text-xs font-bold text-foreground">Compact Mark</h3>
                  <p class="text-[11px] text-muted-foreground mt-0.5">
                    Used in the sidebar, organization switcher, and small UI spaces.
                  </p>
                </div>
                <span class="rounded-md bg-primary/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/20 shrink-0 font-mono">
                  1:1 Recommended
                </span>
              </div>

              <!-- Interactive Dropzone / Preview -->
              <div
                class="mt-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center relative min-h-[170px]"
                :class="[
                  isDraggingSmall ? 'border-primary bg-primary/10 scale-[1.01]' : '',
                  removeSmall ? 'border-destructive/40 bg-destructive/5' : '',
                  !isDraggingSmall && !removeSmall ? 'border-border/70 hover:border-primary/50 hover:bg-background/80 bg-background/50 cursor-pointer' : '',
                ]"
                @click="canEdit && !removeSmall && smallInput?.click()"
                @dragover.prevent="canEdit && (isDraggingSmall = true)"
                @dragleave.prevent="isDraggingSmall = false"
                @drop.prevent="handleDrop($event, 'small')"
              >
                <!-- Removal Pending State -->
                <div v-if="removeSmall" class="flex flex-col items-center gap-1.5 py-3">
                  <div class="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
                    <Trash2 class="w-5 h-5" />
                  </div>
                  <p class="text-xs font-bold text-destructive">Marked for Removal</p>
                  <p class="text-[10px] text-muted-foreground">Will be permanently deleted upon saving changes</p>
                </div>

                <!-- Displayed Logo State -->
                <div v-else-if="displayedSmallLogo" class="flex flex-col items-center gap-2.5">
                  <div class="w-22 h-22 rounded-2xl border border-border/70 bg-background flex items-center justify-center overflow-hidden p-2.5 shadow-xs relative group">
                    <img
                      :src="displayedSmallLogo"
                      :alt="`${currentOrganization?.name || 'Organization'} compact logo`"
                      class="w-full h-full object-contain"
                    />
                    <div
                      v-if="canEdit"
                      class="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white rounded-2xl"
                    >
                      <Camera class="w-4 h-4 mb-0.5" />
                      <span class="text-[9px] font-bold uppercase tracking-wider">Replace</span>
                    </div>
                  </div>
                  <span
                    v-if="smallFile"
                    class="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-2xs"
                  >
                    <Sparkles class="w-2.5 h-2.5" />
                    Pending Save
                  </span>
                </div>

                <!-- Empty State -->
                <div v-else class="flex flex-col items-center gap-2 py-2">
                  <div class="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs">
                    <Upload class="w-5 h-5" />
                  </div>
                  <div>
                    <p class="text-xs font-bold text-foreground">Click to upload or drag & drop</p>
                    <p class="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                      PNG, JPEG, or WebP • Up to 5 MB • Square recommended
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Controls -->
            <div v-if="canEdit" class="pt-2 border-t border-border/40">
              <input
                ref="smallInput"
                type="file"
                class="hidden"
                accept="image/png,image/jpeg,image/webp"
                @change="handleFileSelection($event, 'small')"
              />

              <div v-if="removeSmall" class="w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-9 w-full rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 text-foreground hover:bg-muted/50 border-border/70"
                  @click="undoRemoval('small')"
                >
                  <Undo2 class="w-3.5 h-3.5" />
                  Undo Removal
                </Button>
              </div>

              <div v-else-if="displayedSmallLogo" class="flex items-center gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="flex-1 h-9 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 hover:bg-primary/5 hover:border-primary/30 text-foreground border-border/70 transition-all"
                  @click="smallInput?.click()"
                >
                  <Upload class="w-3.5 h-3.5 text-primary" />
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-9 px-3.5 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                  @click="markForRemoval('small')"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  Remove
                </Button>
              </div>

              <div v-else class="w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-9 w-full rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 hover:bg-primary/5 hover:border-primary/30 text-foreground border-border/70 transition-all"
                  @click="smallInput?.click()"
                >
                  <Upload class="w-3.5 h-3.5 text-primary" />
                  Upload Compact Mark
                </Button>
              </div>
            </div>
          </div>

          <!-- Panel 2: Full Document & Invoice Logo -->
          <div class="rounded-2xl border border-border/60 bg-muted/10 p-5 flex flex-col justify-between space-y-4 shadow-2xs">
            <div>
              <div class="flex items-start justify-between gap-3 mb-1">
                <div>
                  <h3 class="text-xs font-bold text-foreground">Document & Invoice Logo</h3>
                  <p class="text-[11px] text-muted-foreground mt-0.5">
                    Printed on official invoices, estimates, credit notes, and reports.
                  </p>
                </div>
                <span class="rounded-md bg-primary/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/20 shrink-0 font-mono">
                  Wide Recommended
                </span>
              </div>

              <!-- Interactive Dropzone / Preview -->
              <div
                class="mt-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center relative min-h-[170px]"
                :class="[
                  isDraggingLarge ? 'border-primary bg-primary/10 scale-[1.01]' : '',
                  removeLarge ? 'border-destructive/40 bg-destructive/5' : '',
                  !isDraggingLarge && !removeLarge ? 'border-border/70 hover:border-primary/50 hover:bg-background/80 bg-background/50 cursor-pointer' : '',
                ]"
                @click="canEdit && !removeLarge && largeInput?.click()"
                @dragover.prevent="canEdit && (isDraggingLarge = true)"
                @dragleave.prevent="isDraggingLarge = false"
                @drop.prevent="handleDrop($event, 'large')"
              >
                <!-- Removal Pending State -->
                <div v-if="removeLarge" class="flex flex-col items-center gap-1.5 py-3">
                  <div class="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
                    <Trash2 class="w-5 h-5" />
                  </div>
                  <p class="text-xs font-bold text-destructive">Marked for Removal</p>
                  <p class="text-[10px] text-muted-foreground">Will be permanently deleted upon saving changes</p>
                </div>

                <!-- Displayed Logo State -->
                <div v-else-if="displayedLargeLogo" class="flex flex-col items-center gap-2.5 w-full">
                  <div class="w-full max-w-sm h-22 rounded-xl border border-border/70 bg-background flex items-center justify-center overflow-hidden p-3 shadow-xs relative group">
                    <img
                      :src="displayedLargeLogo"
                      :alt="`${currentOrganization?.name || 'Organization'} full logo`"
                      class="max-w-full max-h-full object-contain"
                    />
                    <div
                      v-if="canEdit"
                      class="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white rounded-xl"
                    >
                      <Camera class="w-4 h-4 mb-0.5" />
                      <span class="text-[9px] font-bold uppercase tracking-wider">Replace</span>
                    </div>
                  </div>
                  <span
                    v-if="largeFile"
                    class="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-2xs"
                  >
                    <Sparkles class="w-2.5 h-2.5" />
                    Pending Save
                  </span>
                </div>

                <!-- Empty State -->
                <div v-else class="flex flex-col items-center gap-2 py-2">
                  <div class="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs">
                    <ImageIcon class="w-5 h-5" />
                  </div>
                  <div>
                    <p class="text-xs font-bold text-foreground">Click to upload or drag & drop</p>
                    <p class="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                      Horizontal format • Transparent PNG recommended • Up to 5 MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Controls -->
            <div v-if="canEdit" class="pt-2 border-t border-border/40">
              <input
                ref="largeInput"
                type="file"
                class="hidden"
                accept="image/png,image/jpeg,image/webp"
                @change="handleFileSelection($event, 'large')"
              />

              <div v-if="removeLarge" class="w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-9 w-full rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 text-foreground hover:bg-muted/50 border-border/70"
                  @click="undoRemoval('large')"
                >
                  <Undo2 class="w-3.5 h-3.5" />
                  Undo Removal
                </Button>
              </div>

              <div v-else-if="displayedLargeLogo" class="flex items-center gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="flex-1 h-9 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 hover:bg-primary/5 hover:border-primary/30 text-foreground border-border/70 transition-all"
                  @click="largeInput?.click()"
                >
                  <Upload class="w-3.5 h-3.5 text-primary" />
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-9 px-3.5 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                  @click="markForRemoval('large')"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  Remove
                </Button>
              </div>

              <div v-else class="w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-9 w-full rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 hover:bg-primary/5 hover:border-primary/30 text-foreground border-border/70 transition-all"
                  @click="largeInput?.click()"
                >
                  <Upload class="w-3.5 h-3.5 text-primary" />
                  Upload Document Logo
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- Live Document Header Mockup Preview Strip -->
        <div class="rounded-2xl border border-border/60 bg-muted/10 p-5 space-y-3.5 shadow-2xs">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <FileText class="w-4 h-4 text-primary" />
              <h4 class="text-xs font-bold text-foreground">Live Invoice Header Preview</h4>
            </div>
            <span class="text-[10px] text-muted-foreground font-medium hidden sm:inline">
              Simulated export output
            </span>
          </div>

          <!-- Mini Document Header Strip -->
          <div class="rounded-xl border border-border/70 bg-card p-4 md:p-5 flex items-center justify-between gap-4 shadow-xs">
            <div class="flex items-center gap-3.5 min-w-0">
              <!-- Invoice Logo simulation -->
              <div class="h-10 max-w-[140px] md:max-w-[180px] flex items-center justify-start shrink-0 overflow-hidden">
                <img
                  v-if="displayedLargeLogo"
                  :src="displayedLargeLogo"
                  alt="Invoice Header Logo"
                  class="max-h-full max-w-full object-contain"
                />
                <div v-else-if="displayedSmallLogo" class="flex items-center gap-2.5">
                  <img
                    :src="displayedSmallLogo"
                    alt="Invoice Header Logo"
                    class="w-9 h-9 rounded-lg object-contain"
                  />
                  <span class="text-sm font-bold tracking-tight text-foreground truncate">
                    {{ currentOrganization?.name || 'My Company' }}
                  </span>
                </div>
                <div v-else class="flex items-center gap-2 text-muted-foreground/60">
                  <Building2 class="w-7 h-7 text-primary/40" />
                  <span class="text-xs font-bold text-foreground truncate">
                    {{ currentOrganization?.name || 'My Company' }}
                  </span>
                </div>
              </div>

              <div class="hidden sm:block border-l border-border/60 pl-3 space-y-0.5">
                <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {{ currentOrganization?.is_gst_registered ? `GSTIN: ${currentOrganization?.gstin || '22AAAAA0000A1Z5'}` : 'Unregistered Business' }}
                </p>
                <p class="text-[10px] text-muted-foreground/80 truncate max-w-[200px]">
                  {{ currentOrganization?.address || 'Registered Office Address' }}
                </p>
              </div>
            </div>

            <div class="text-right shrink-0 space-y-0.5">
              <span class="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                Tax Invoice
              </span>
              <p class="text-[10px] font-mono text-muted-foreground mt-0.5">#INV-2025-001</p>
            </div>
          </div>
        </div>

        <!-- Read-only Notice if Member -->
        <div
          v-if="!canEdit"
          class="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 flex items-center gap-2.5 text-xs text-muted-foreground"
        >
          <Info class="w-4 h-4 text-primary shrink-0" />
          You are viewing workspace branding as a member. Only owners and administrators can upload or replace logos.
        </div>
      </CardContent>

      <!-- Action Footer -->
      <CardFooter
        v-if="canEdit"
        class="p-4 md:px-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        <div class="text-xs text-muted-foreground flex items-center gap-1.5 text-center sm:text-left">
          <CheckCircle2 class="w-3.5 h-3.5 text-primary/80 shrink-0" />
          <span>Uploaded branding assets are optimized and delivered globally via CDN.</span>
        </div>

        <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <Button
            v-if="hasChanges"
            type="button"
            variant="ghost"
            size="sm"
            class="h-9 px-3.5 rounded-xl font-bold uppercase tracking-wider text-[11px] text-muted-foreground hover:text-foreground gap-1"
            :disabled="isSaving"
            @click="resetChanges"
          >
            <RotateCcw class="w-3 h-3" />
            Discard
          </Button>

          <Button
            type="button"
            size="sm"
            class="h-9 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 transition-all active:scale-[0.98]"
            :disabled="!hasChanges || isSaving"
            @click="saveBranding"
          >
            <Loader2 v-if="isSaving" class="w-3.5 h-3.5 animate-spin" />
            <Check v-else class="w-3.5 h-3.5" />
            <span>{{ isSaving ? 'Saving...' : 'Save Branding' }}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>

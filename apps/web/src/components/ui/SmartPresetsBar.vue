<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  useFilterPresetStore,
  type FilterPreset,
} from '@/stores/filterPresetStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SavePresetDialog from './SavePresetDialog.vue';
import {
  ChevronDown,
  Check,
  Pin,
  Trash2,
  RotateCcw,
  FileText,
  AlertCircle,
  Clock,
  FileEdit,
  TrendingUp,
  CheckCircle2,
  Bookmark,
  Receipt,
  Wallet,
  Calendar,
  Filter,
  PlusCircle,
  FolderPlus,
  X,
  Tag,
  Shield,
  Layers,
  DollarSign,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';

interface Props {
  entityType: string;
  activeFilters: {
    status?: string;
    timeframe?: string;
    minAmount?: number;
    maxAmount?: number;
    bookmarkedOnly?: boolean;
    search?: string;
    [key: string]: any;
  };
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'apply-preset', preset: FilterPreset): void;
  (e: 'update-filter', key: string, value: any): void;
  (e: 'reset-filters'): void;
}>();

const presetStore = useFilterPresetStore();
const isSaveModalOpen = ref(false);
const isSaving = ref(false);

// Popover open states
const isStatusOpen = ref(false);
const isTimeframeOpen = ref(false);
const isAmountOpen = ref(false);

// Local amount draft state
const draftMinAmount = ref<number | null>(null);
const draftMaxAmount = ref<number | null>(null);

watch(
  () => props.activeFilters,
  (f) => {
    draftMinAmount.value = f?.minAmount ?? null;
    draftMaxAmount.value = f?.maxAmount ?? null;
  },
  { immediate: true, deep: true }
);

const iconMap: Record<string, any> = {
  FileText,
  AlertCircle,
  Clock,
  FileEdit,
  TrendingUp,
  CheckCircle2,
  Bookmark,
  Receipt,
  Wallet,
  Calendar,
  Filter,
  Tag,
  Shield,
  Layers,
  DollarSign,
};

const resolveIcon = (iconName?: string | null) => {
  if (!iconName) return Layers;
  return iconMap[iconName] || Layers;
};

onMounted(async () => {
  try {
    await presetStore.fetchPresets(props.entityType);
  } catch {
    // handled in store
  }
});

const systemPresets = computed(() => presetStore.getSystemPresets(props.entityType));
const customPresets = computed(() => presetStore.getCustomPresets(props.entityType));
const activePreset = computed(() => presetStore.getActivePreset(props.entityType));

// Status filter options
const statusOptions = computed(() => {
  return [
    { label: 'All Statuses', value: 'All' },
    { label: 'Draft', value: 'Draft', dotClass: 'bg-zinc-500' },
    { label: 'Outstanding', value: 'Outstanding', dotClass: 'bg-amber-500' },
    { label: 'Overdue', value: 'Overdue', dotClass: 'bg-rose-600' },
    { label: 'Paid', value: 'Paid', dotClass: 'bg-emerald-600' },
  ];
});

const getStatusBadgeClass = (status?: string | null) => {
  switch (status) {
    case 'Paid':
      return 'bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white border-transparent';
    case 'Due':
    case 'Outstanding':
      return 'bg-amber-500 text-white dark:bg-amber-600 dark:text-white border-transparent';
    case 'Overdue':
      return 'bg-rose-600 text-white dark:bg-rose-600 dark:text-white border-transparent';
    case 'Draft':
      return 'bg-zinc-600 text-white dark:bg-zinc-700 dark:text-zinc-100 border-transparent';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
};

// Timeframe filter options
const timeframeOptions = computed(() => {
  if (props.entityType === 'expenses') {
    return [
      { label: 'All Time', shortLabel: 'All Time', value: 'all' },
      { label: 'This Month', shortLabel: 'This Month', value: 'this_month' },
      { label: 'Last Month', shortLabel: 'Last Month', value: 'last_month' },
    ];
  }
  return [
    { label: 'All Time', shortLabel: 'All Time', value: 'all' },
    { label: 'Past Due (Overdue)', shortLabel: 'Overdue', value: 'overdue' },
    { label: 'Due in Next 7 Days', shortLabel: 'Next 7 Days', value: 'due_soon' },
    { label: 'This Month', shortLabel: 'This Month', value: 'this_month' },
    { label: 'Last Month', shortLabel: 'Last Month', value: 'last_month' },
  ];
});

// Formatted labels for active facet badges
const activeStatusLabel = computed(() => {
  const s = props.activeFilters?.status;
  if (!s || s === 'All') return null;
  return statusOptions.value.find((opt) => opt.value === s)?.label || s;
});

const activeTimeframeLabel = computed(() => {
  const tf = props.activeFilters?.timeframe;
  if (!tf || tf === 'all') return null;
  return timeframeOptions.value.find((opt) => opt.value === tf)?.label || tf;
});

const activeTimeframeShortLabel = computed(() => {
  const tf = props.activeFilters?.timeframe;
  if (!tf || tf === 'all') return null;
  return timeframeOptions.value.find((opt) => opt.value === tf)?.shortLabel || tf;
});

const activeAmountLabel = computed(() => {
  const min = props.activeFilters?.minAmount;
  const max = props.activeFilters?.maxAmount;
  if (min != null && max != null) {
    return `₹${Number(min).toLocaleString()} - ₹${Number(max).toLocaleString()}`;
  }
  if (min != null) {
    return `≥ ₹${Number(min).toLocaleString()}`;
  }
  if (max != null) {
    return `≤ ₹${Number(max).toLocaleString()}`;
  }
  return null;
});

// Are any non-default filters active?
const hasActiveFilters = computed(() => {
  const f = props.activeFilters || {};
  const hasStatus = f.status && f.status !== 'All';
  const hasTimeframe = f.timeframe && f.timeframe !== 'all';
  const hasMin = f.minAmount != null && f.minAmount !== '';
  const hasMax = f.maxAmount != null && f.maxAmount !== '';
  const hasBookmarked = Boolean(f.bookmarkedOnly);
  return Boolean(hasStatus || hasTimeframe || hasMin || hasMax || hasBookmarked);
});

// Check if current filter state deviates from active preset definition
const isModified = computed(() => {
  if (!activePreset.value) return false;
  const pf = activePreset.value.filters || {};
  const cf = props.activeFilters || {};

  const statusMatch = (pf.status || 'All') === (cf.status || 'All');
  const timeframeMatch = (pf.timeframe || 'all') === (cf.timeframe || 'all');
  const bookmarkedMatch = Boolean(pf.bookmarkedOnly) === Boolean(cf.bookmarkedOnly);
  const minAmountMatch = (pf.minAmount ?? null) === (cf.minAmount ?? null);
  const maxAmountMatch = (pf.maxAmount ?? null) === (cf.maxAmount ?? null);

  return !(statusMatch && timeframeMatch && bookmarkedMatch && minAmountMatch && maxAmountMatch);
});

// Auto-sync active preset if filter set matches an existing preset
watch(
  () => props.activeFilters,
  (cf) => {
    if (!cf) return;
    const allPresets = [...systemPresets.value, ...customPresets.value];
    const match = allPresets.find((p) => {
      const pf = p.filters || {};
      const statusMatch = (pf.status || 'All') === (cf.status || 'All');
      const timeframeMatch = (pf.timeframe || 'all') === (cf.timeframe || 'all');
      const bookmarkedMatch = Boolean(pf.bookmarkedOnly) === Boolean(cf.bookmarkedOnly);
      const minAmountMatch = (pf.minAmount ?? null) === (cf.minAmount ?? null);
      const maxAmountMatch = (pf.maxAmount ?? null) === (cf.maxAmount ?? null);
      return statusMatch && timeframeMatch && bookmarkedMatch && minAmountMatch && maxAmountMatch;
    });
    if (match && activePreset.value?.id !== match.id) {
      presetStore.setActivePreset(props.entityType, match);
    }
  },
  { deep: true }
);

const handleSelectPreset = (preset: FilterPreset) => {
  presetStore.setActivePreset(props.entityType, preset);
  emit('apply-preset', preset);
};

const handleResetToPreset = () => {
  if (activePreset.value) {
    emit('apply-preset', activePreset.value);
  } else {
    emit('reset-filters');
  }
};

const handleSelectStatus = (val: string) => {
  emit('update-filter', 'status', val);
  isStatusOpen.value = false;
};

const handleClearStatus = () => {
  emit('update-filter', 'status', 'All');
  isStatusOpen.value = false;
};

const handleSelectTimeframe = (val: string) => {
  emit('update-filter', 'timeframe', val);
  isTimeframeOpen.value = false;
};

const handleClearTimeframe = () => {
  emit('update-filter', 'timeframe', 'all');
  isTimeframeOpen.value = false;
};

const applyAmountFilter = () => {
  emit('update-filter', 'minAmount', draftMinAmount.value != null && !isNaN(draftMinAmount.value) ? draftMinAmount.value : null);
  emit('update-filter', 'maxAmount', draftMaxAmount.value != null && !isNaN(draftMaxAmount.value) ? draftMaxAmount.value : null);
  isAmountOpen.value = false;
};

const clearAmountFilter = () => {
  draftMinAmount.value = null;
  draftMaxAmount.value = null;
  emit('update-filter', 'minAmount', null);
  emit('update-filter', 'maxAmount', null);
  isAmountOpen.value = false;
};

const toggleBookmarked = () => {
  emit('update-filter', 'bookmarkedOnly', !props.activeFilters?.bookmarkedOnly);
};

const handleClearBookmarked = () => {
  emit('update-filter', 'bookmarkedOnly', false);
};

const isDefaultPreset = (preset?: FilterPreset | null) => {
  if (!preset) return true;
  const id = preset.id?.toLowerCase() || '';
  const name = preset.name?.toLowerCase() || '';
  return (
    id === 'all' ||
    id === 'inv_all' ||
    id === 'bill_all' ||
    id === 'exp_all' ||
    name === 'all' ||
    name === 'all invoices' ||
    name === 'all bills' ||
    name === 'all expenses'
  );
};

const isPresetApplied = computed(() => {
  if (!activePreset.value) return false;
  return !isDefaultPreset(activePreset.value);
});

const handleResetPresetView = () => {
  const allPreset = systemPresets.value.find(p => isDefaultPreset(p)) || systemPresets.value[0];
  if (allPreset) {
    handleSelectPreset(allPreset);
  } else {
    emit('reset-filters');
  }
};

const handleSaveNewPreset = async (payload: {
  name: string;
  description: string;
  icon: string;
  color: string;
  is_pinned: boolean;
  is_default: boolean;
}) => {
  isSaving.value = true;
  try {
    const created = await presetStore.createPreset({
      entity_type: props.entityType,
      name: payload.name,
      description: payload.description,
      icon: payload.icon,
      color: payload.color,
      is_pinned: payload.is_pinned,
      is_default: payload.is_default,
      filters: { ...props.activeFilters },
    });
    toast.success('Custom view saved', {
      description: `"${created.name}" is now available in your views.`,
    });
    isSaveModalOpen.value = false;
    emit('apply-preset', created);
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to save view');
  } finally {
    isSaving.value = false;
  }
};

const handleTogglePin = async (e: Event, preset: FilterPreset) => {
  e.stopPropagation();
  try {
    const res = await presetStore.togglePin(preset.id, props.entityType);
    toast.success(res.is_pinned ? 'Pinned view' : 'Unpinned view');
  } catch {
    toast.error('Failed to update view');
  }
};

const handleDeletePreset = async (e: Event, preset: FilterPreset) => {
  e.stopPropagation();
  try {
    await presetStore.deletePreset(preset.id, props.entityType);
    toast.success('Custom view deleted');
    if (activePreset.value?.id === preset.id) {
      const fallback = systemPresets.value[0];
      if (fallback) handleSelectPreset(fallback);
    }
  } catch {
    toast.error('Failed to delete view');
  }
};
</script>

<template>
  <div class="flex items-center gap-1.5 flex-nowrap shrink-0 py-1.5">
    <!-- Zoho Books Style: Primary View Switcher Dropdown -->
    <div class="relative inline-flex items-center shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="h-8 px-2.5 gap-1.5 text-xs font-medium border-border bg-background hover:bg-accent hover:text-accent-foreground shadow-2xs select-none transition-all cursor-pointer shrink-0"
          >
            <component
              :is="resolveIcon(activePreset?.icon)"
              class="size-3.5 shrink-0 text-muted-foreground"
            />
            <span class="max-w-[120px] truncate font-medium">
              {{ activePreset?.name || 'All' }}
            </span>
            <span v-if="isModified" class="text-[10px] text-muted-foreground font-normal shrink-0">(modified)</span>
            <ChevronDown class="size-3 text-muted-foreground ml-0.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" class="w-64">
          <!-- Default Views -->
          <DropdownMenuLabel class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
            Default Views
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem
              v-for="preset in systemPresets"
              :key="preset.id"
              class="flex items-center justify-between text-xs py-1.5 px-2 cursor-pointer"
              @click="handleSelectPreset(preset)"
            >
              <div class="flex items-center gap-2 truncate">
                <component
                  :is="resolveIcon(preset.icon)"
                  class="size-3.5 shrink-0 text-muted-foreground"
                />
                <span :class="{ 'font-semibold text-foreground': activePreset?.id === preset.id }">
                  {{ preset.name }}
                </span>
              </div>
              <Check v-if="activePreset?.id === preset.id" class="size-3.5 text-foreground shrink-0 ml-2" />
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <!-- Custom Views (Zoho Style) -->
          <template v-if="customPresets.length > 0">
            <DropdownMenuSeparator />
            <DropdownMenuLabel class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
              My Custom Views
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem
                v-for="preset in customPresets"
                :key="preset.id"
                class="flex items-center justify-between text-xs py-1.5 px-2 group cursor-pointer"
                @click="handleSelectPreset(preset)"
              >
                <div class="flex items-center gap-2 truncate">
                  <component
                    :is="resolveIcon(preset.icon)"
                    class="size-3.5 shrink-0 text-muted-foreground"
                  />
                  <span :class="{ 'font-semibold text-foreground': activePreset?.id === preset.id }" class="truncate">
                    {{ preset.name }}
                  </span>
                  <span
                    v-if="preset.is_default"
                    class="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground uppercase font-bold"
                  >
                    Default
                  </span>
                </div>
                <div class="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    class="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                    :title="preset.is_pinned ? 'Unpin view' : 'Pin view'"
                    @click="(e) => handleTogglePin(e, preset)"
                  >
                    <Pin
                      class="size-3"
                      :class="preset.is_pinned ? 'fill-current text-foreground rotate-45' : 'text-muted-foreground/40'"
                    />
                  </button>
                  <button
                    type="button"
                    class="p-0.5 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete custom view"
                    @click="(e) => handleDeletePreset(e, preset)"
                  >
                    <Trash2 class="size-3" />
                  </button>
                  <Check v-if="activePreset?.id === preset.id" class="size-3.5 text-foreground ml-1" />
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </template>

          <DropdownMenuSeparator />

          <template v-if="isModified">
            <DropdownMenuItem
              class="text-xs text-muted-foreground hover:text-foreground py-1.5 px-2 cursor-pointer gap-2"
              @click="handleResetToPreset"
            >
              <RotateCcw class="size-3.5" />
              <span>Reset to View Definition</span>
            </DropdownMenuItem>
          </template>

          <!-- New Custom View Action Trigger -->
          <DropdownMenuItem
            class="text-xs font-medium text-foreground py-2 px-2 cursor-pointer gap-2"
            @click="isSaveModalOpen = true"
          >
            <FolderPlus class="size-3.5 text-muted-foreground" />
            <span>Save as New View...</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- Cross to remove applied custom/preset view -->
      <button
        v-if="isPresetApplied"
        type="button"
        @click.stop="handleResetPresetView"
        class="absolute -top-1.5 -right-1.5 z-20 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        title="Reset view to All"
        aria-label="Reset view to All"
      >
        <X class="size-2.5 stroke-[2.5]" />
      </button>
    </div>

    <!-- Faceted Filter 1: Status (Only for Invoices and Bills) -->
    <div
      v-if="entityType === 'invoices' || entityType === 'bills'"
      class="relative inline-flex items-center shrink-0"
    >
      <Popover v-model:open="isStatusOpen">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs px-2.5 gap-1.5 cursor-pointer font-normal transition-all shrink-0 select-none"
            :class="[
              activeStatusLabel
                ? 'border-solid font-medium text-foreground bg-background hover:bg-accent shadow-2xs'
                : 'border-dashed text-muted-foreground hover:text-foreground'
            ]"
          >
            <PlusCircle v-if="!activeStatusLabel" class="size-3.5 text-muted-foreground" />
            <span>Status</span>
            <template v-if="activeStatusLabel">
              <span class="text-muted-foreground/60 font-normal">:</span>
              <span
                :class="getStatusBadgeClass(props.activeFilters?.status)"
                class="inline-flex items-center rounded px-1.5 py-0 text-[11px] font-semibold max-w-[90px] truncate shadow-xs"
              >
                {{ activeStatusLabel }}
              </span>
            </template>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" class="w-48 p-1 shadow-md border-border">
          <div class="space-y-0.5">
            <button
              v-for="opt in statusOptions"
              :key="opt.value"
              type="button"
              class="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left cursor-pointer"
              :class="{ 'font-semibold bg-accent text-accent-foreground': (props.activeFilters?.status || 'All') === opt.value }"
              @click="handleSelectStatus(opt.value)"
            >
              <div class="flex items-center gap-2">
                <span
                  v-if="opt.dotClass"
                  :class="opt.dotClass"
                  class="size-2 rounded-full inline-block shrink-0"
                />
                <span>{{ opt.label }}</span>
              </div>
              <Check
                v-if="(props.activeFilters?.status || 'All') === opt.value"
                class="size-3.5 text-foreground shrink-0"
              />
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <!-- Cross to remove status filter -->
      <button
        v-if="activeStatusLabel"
        type="button"
        @click.stop="handleClearStatus"
        class="absolute -top-1.5 -right-1.5 z-20 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        title="Remove status filter"
        aria-label="Remove status filter"
      >
        <X class="size-2.5 stroke-[2.5]" />
      </button>
    </div>

    <!-- Faceted Filter 2: Timeframe / Due Date -->
    <div class="relative inline-flex items-center shrink-0">
      <Popover v-model:open="isTimeframeOpen">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs px-2.5 gap-1.5 cursor-pointer font-normal transition-all shrink-0 select-none"
            :class="[
              activeTimeframeShortLabel
                ? 'border-solid font-medium text-foreground bg-background hover:bg-accent shadow-2xs'
                : 'border-dashed text-muted-foreground hover:text-foreground'
            ]"
          >
            <Calendar class="size-3.5" :class="activeTimeframeShortLabel ? 'text-foreground' : 'text-muted-foreground'" />
            <span>Time</span>
            <template v-if="activeTimeframeShortLabel">
              <span class="text-muted-foreground/60 font-normal">:</span>
              <span
                class="inline-flex items-center rounded px-1.5 py-0 text-[11px] font-semibold max-w-[100px] truncate bg-primary text-primary-foreground shadow-xs"
              >
                {{ activeTimeframeShortLabel }}
              </span>
            </template>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" class="w-52 p-1 shadow-md border-border">
          <div class="space-y-0.5">
            <button
              v-for="opt in timeframeOptions"
              :key="opt.value"
              type="button"
              class="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left cursor-pointer"
              :class="{ 'font-semibold bg-accent text-accent-foreground': (props.activeFilters?.timeframe || 'all') === opt.value }"
              @click="handleSelectTimeframe(opt.value)"
            >
              <span>{{ opt.label }}</span>
              <Check
                v-if="(props.activeFilters?.timeframe || 'all') === opt.value"
                class="size-3.5 text-foreground shrink-0"
              />
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <!-- Cross to remove timeframe filter -->
      <button
        v-if="activeTimeframeShortLabel"
        type="button"
        @click.stop="handleClearTimeframe"
        class="absolute -top-1.5 -right-1.5 z-20 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        title="Remove time filter"
        aria-label="Remove time filter"
      >
        <X class="size-2.5 stroke-[2.5]" />
      </button>
    </div>

    <!-- Faceted Filter 3: Amount Range -->
    <div class="relative inline-flex items-center shrink-0">
      <Popover v-model:open="isAmountOpen">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs px-2.5 gap-1.5 cursor-pointer font-normal transition-all shrink-0 select-none"
            :class="[
              activeAmountLabel
                ? 'border-solid font-medium text-foreground bg-background hover:bg-accent shadow-2xs'
                : 'border-dashed text-muted-foreground hover:text-foreground'
            ]"
          >
            <DollarSign class="size-3.5" :class="activeAmountLabel ? 'text-foreground' : 'text-muted-foreground'" />
            <span>Amount</span>
            <template v-if="activeAmountLabel">
              <span class="text-muted-foreground/60 font-normal">:</span>
              <span
                class="inline-flex items-center rounded px-1.5 py-0 text-[11px] font-semibold max-w-[110px] truncate bg-primary text-primary-foreground shadow-xs"
              >
                {{ activeAmountLabel }}
              </span>
            </template>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" class="w-64 p-3 shadow-md border-border space-y-3">
          <div class="space-y-1">
            <span class="text-xs font-semibold text-foreground">Filter by Amount (₹)</span>
            <p class="text-[11px] text-muted-foreground">Specify minimum or maximum values</p>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1">
              <Label class="text-[10px] text-muted-foreground font-medium uppercase">Min (₹)</Label>
              <Input
                v-model.number="draftMinAmount"
                type="number"
                placeholder="0"
                class="h-7 text-xs"
                @keydown.enter="applyAmountFilter"
              />
            </div>
            <div class="space-y-1">
              <Label class="text-[10px] text-muted-foreground font-medium uppercase">Max (₹)</Label>
              <Input
                v-model.number="draftMaxAmount"
                type="number"
                placeholder="Max"
                class="h-7 text-xs"
                @keydown.enter="applyAmountFilter"
              />
            </div>
          </div>

          <!-- Quick range suggestions -->
          <div class="flex items-center gap-1 pt-1 flex-wrap">
            <button
              type="button"
              class="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              @click="draftMinAmount = null; draftMaxAmount = 10000;"
            >
              &lt; ₹10k
            </button>
            <button
              type="button"
              class="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              @click="draftMinAmount = 10000; draftMaxAmount = 50000;"
            >
              ₹10k - ₹50k
            </button>
            <button
              type="button"
              class="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              @click="draftMinAmount = 50000; draftMaxAmount = null;"
            >
              &gt; ₹50k
            </button>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              @click="clearAmountFilter"
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              class="h-7 px-3 text-xs cursor-pointer"
              @click="applyAmountFilter"
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <!-- Cross to remove amount filter -->
      <button
        v-if="activeAmountLabel"
        type="button"
        @click.stop="clearAmountFilter"
        class="absolute -top-1.5 -right-1.5 z-20 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        title="Remove amount filter"
        aria-label="Remove amount filter"
      >
        <X class="size-2.5 stroke-[2.5]" />
      </button>
    </div>

    <!-- Faceted Filter 4: Bookmarked Toggle -->
    <div class="relative inline-flex items-center shrink-0">
      <Button
        variant="outline"
        size="sm"
        class="h-8 text-xs px-2.5 gap-1.5 cursor-pointer font-normal transition-all shrink-0 select-none"
        :class="[
          props.activeFilters?.bookmarkedOnly
            ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white border-blue-600 hover:bg-blue-700 hover:text-white font-semibold shadow-xs'
            : 'border-dashed text-muted-foreground hover:text-foreground'
        ]"
        @click="toggleBookmarked"
      >
        <Bookmark
          class="size-3.5"
          :class="props.activeFilters?.bookmarkedOnly ? 'fill-white text-white' : 'text-muted-foreground'"
        />
        <span>Bookmarked</span>
      </Button>

      <!-- Cross to remove bookmarked filter -->
      <button
        v-if="props.activeFilters?.bookmarkedOnly"
        type="button"
        @click.stop="handleClearBookmarked"
        class="absolute -top-1.5 -right-1.5 z-20 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        title="Remove bookmarked filter"
        aria-label="Remove bookmarked filter"
      >
        <X class="size-2.5 stroke-[2.5]" />
      </button>
    </div>

    <!-- Reset Filters Button (Appears when any filter is active) -->
    <Button
      v-if="hasActiveFilters"
      variant="ghost"
      size="sm"
      class="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1 shrink-0 select-none"
      title="Reset all filters"
      @click="emit('reset-filters')"
    >
      <RotateCcw class="size-3" />
      <span>Reset</span>
    </Button>

    <!-- Save Preset Dialog Modal -->
    <SavePresetDialog
      v-model:open="isSaveModalOpen"
      :entity-type="entityType"
      :active-filters="activeFilters"
      :loading="isSaving"
      @save="handleSaveNewPreset"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Filter,
  Layers,
  Clock,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Bookmark,
  Tag,
  Shield,
  Loader2,
} from 'lucide-vue-next';

interface Props {
  open: boolean;
  entityType: string;
  activeFilters: Record<string, any>;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'save', payload: {
    name: string;
    description: string;
    icon: string;
    color: string;
    is_pinned: boolean;
    is_default: boolean;
  }): void;
}>();

const name = ref('');
const description = ref('');
const selectedIcon = ref('Filter');
const selectedColor = ref('default');
const isPinned = ref(true);
const isDefault = ref(false);
const nameError = ref('');

const availableIcons = [
  { name: 'Filter', component: Filter },
  { name: 'Layers', component: Layers },
  { name: 'Clock', component: Clock },
  { name: 'AlertCircle', component: AlertCircle },
  { name: 'TrendingUp', component: TrendingUp },
  { name: 'CheckCircle2', component: CheckCircle2 },
  { name: 'Bookmark', component: Bookmark },
  { name: 'Tag', component: Tag },
  { name: 'Shield', component: Shield },
];

const availableColors = [
  { id: 'default', label: 'Default', bgClass: 'bg-muted border-border' },
  { id: 'blue', label: 'Blue', bgClass: 'bg-blue-500/20 border-blue-500/50 text-blue-500' },
  { id: 'emerald', label: 'Emerald', bgClass: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' },
  { id: 'amber', label: 'Amber', bgClass: 'bg-amber-500/20 border-amber-500/50 text-amber-500' },
  { id: 'rose', label: 'Rose', bgClass: 'bg-rose-500/20 border-rose-500/50 text-rose-500' },
  { id: 'purple', label: 'Purple', bgClass: 'bg-purple-500/20 border-purple-500/50 text-purple-500' },
];

// Generate readable tags for current filters
const filterChips = computed(() => {
  const chips: { label: string; value: string }[] = [];
  const f = props.activeFilters;
  if (!f) return chips;

  if (f.status && f.status !== 'All') {
    chips.push({ label: 'Status', value: f.status });
  }
  if (f.timeframe && f.timeframe !== 'all') {
    const formatted = f.timeframe === 'overdue' ? 'Past Due' : f.timeframe === 'due_soon' ? 'Due This Week' : f.timeframe;
    chips.push({ label: 'Timeframe', value: formatted });
  }
  if (f.minAmount) {
    chips.push({ label: 'Min Amount', value: `≥ ₹${Number(f.minAmount).toLocaleString()}` });
  }
  if (f.maxAmount) {
    chips.push({ label: 'Max Amount', value: `≤ ₹${Number(f.maxAmount).toLocaleString()}` });
  }
  if (f.search && f.search.trim()) {
    chips.push({ label: 'Search', value: `"${f.search.trim()}"` });
  }
  if (f.bookmarkedOnly) {
    chips.push({ label: 'Filter', value: 'Bookmarked only' });
  }
  return chips;
});

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      name.value = '';
      description.value = '';
      selectedIcon.value = 'Filter';
      selectedColor.value = 'default';
      isPinned.value = true;
      isDefault.value = false;
      nameError.value = '';
    }
  }
);

const handleSave = () => {
  if (!name.value.trim()) {
    nameError.value = 'Please enter a preset name';
    return;
  }
  nameError.value = '';
  emit('save', {
    name: name.value.trim(),
    description: description.value.trim(),
    icon: selectedIcon.value,
    color: selectedColor.value,
    is_pinned: isPinned.value,
    is_default: isDefault.value,
  });
};
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="text-base font-semibold flex items-center gap-2">
          <Bookmark class="size-4 text-foreground" />
          <span>Save Current View as Preset</span>
        </DialogTitle>
        <DialogDescription class="text-xs text-muted-foreground">
          Save your current active filters to quickly access or pin them on the toolbar.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <!-- Active Filter Summary -->
        <div class="p-3 bg-muted/40 rounded-lg border border-border/60 text-xs">
          <p class="font-medium text-muted-foreground mb-1.5 flex items-center justify-between">
            <span>Filter Criteria to Save</span>
            <span class="text-[11px] font-mono">{{ filterChips.length }} active</span>
          </p>
          <div v-if="filterChips.length > 0" class="flex flex-wrap gap-1.5">
            <span
              v-for="(chip, idx) in filterChips"
              :key="idx"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border text-foreground text-[11px]"
            >
              <span class="text-muted-foreground">{{ chip.label }}:</span>
              <span class="font-medium">{{ chip.value }}</span>
            </span>
          </div>
          <div v-else class="text-muted-foreground text-[11px] italic">
            Default list view (no special filters applied)
          </div>
        </div>

        <!-- Name Input -->
        <div class="space-y-1.5">
          <Label for="preset-name" class="text-xs font-medium">Preset Name *</Label>
          <Input
            id="preset-name"
            v-model="name"
            placeholder="e.g. Overdue VIP Clients, High Value Drafts"
            class="h-9 text-xs"
            :class="{ 'border-destructive': nameError }"
            @keydown.enter.prevent="handleSave"
          />
          <p v-if="nameError" class="text-[11px] text-destructive">{{ nameError }}</p>
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <Label for="preset-desc" class="text-xs font-medium">Description (Optional)</Label>
          <Input
            id="preset-desc"
            v-model="description"
            placeholder="e.g. Segment for weekly financial review"
            class="h-9 text-xs"
            @keydown.enter.prevent="handleSave"
          />
        </div>

        <!-- Icon Picker -->
        <div class="space-y-1.5">
          <Label class="text-xs font-medium">Choose an Icon</Label>
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="icon in availableIcons"
              :key="icon.name"
              type="button"
              class="p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center"
              :class="[
                selectedIcon === icon.name
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border/60 hover:bg-muted/60 text-muted-foreground'
              ]"
              :title="icon.name"
              @click="selectedIcon = icon.name"
            >
              <component :is="icon.component" class="size-3.5" />
            </button>
          </div>
        </div>

        <!-- Color Badges -->
        <div class="space-y-1.5">
          <Label class="text-xs font-medium">Color Tone</Label>
          <div class="flex items-center gap-2">
            <button
              v-for="color in availableColors"
              :key="color.id"
              type="button"
              class="size-6 rounded-full border flex items-center justify-center transition-all cursor-pointer"
              :class="[
                color.bgClass,
                selectedColor === color.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : 'opacity-70 hover:opacity-100'
              ]"
              :title="color.label"
              @click="selectedColor = color.id"
            />
          </div>
        </div>

        <!-- Options: Pin & Default -->
        <div class="pt-2 space-y-2.5 border-t border-border/50">
          <div class="flex items-center gap-2.5">
            <Checkbox
              id="is-pinned"
              :checked="isPinned"
              @update:checked="(val: boolean) => isPinned = val"
            />
            <Label for="is-pinned" class="text-xs font-normal cursor-pointer select-none">
              Pin to top quick-access toolbar
            </Label>
          </div>

          <div class="flex items-center gap-2.5">
            <Checkbox
              id="is-default"
              :checked="isDefault"
              @update:checked="(val: boolean) => isDefault = val"
            />
            <Label for="is-default" class="text-xs font-normal cursor-pointer select-none">
              Set as my default view when opening this page
            </Label>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2 sm:gap-0 mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="text-xs"
          :disabled="loading"
          @click="emit('update:open', false)"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          class="text-xs gap-1.5"
          :disabled="loading"
          @click="handleSave"
        >
          <Loader2 v-if="loading" class="size-3.5 animate-spin" />
          <span>Save Preset</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>


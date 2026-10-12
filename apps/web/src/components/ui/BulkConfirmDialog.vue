<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, Loader2 } from 'lucide-vue-next';

interface Props {
  open: boolean;
  title?: string;
  description?: string;
  itemCount: number;
  itemNames?: string[];
  actionLabel?: string;
  variant?: 'destructive' | 'default';
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirm Bulk Action',
  description: 'Are you sure you want to proceed with this bulk action?',
  itemNames: () => [],
  actionLabel: 'Confirm',
  variant: 'destructive',
  loading: false,
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
}>()

const handleCancel = () => {
  if (!props.loading) {
    emit('update:open', false);
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <div class="flex items-center gap-3">
          <div
            :class="[
              'size-10 rounded-full flex items-center justify-center shrink-0',
              variant === 'destructive'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            ]"
          >
            <AlertTriangle v-if="variant === 'destructive'" class="size-5" />
            <Info v-else class="size-5" />
          </div>
          <div>
            <DialogTitle class="text-base font-semibold">
              {{ title.endsWith('?') ? title : `${title}?` }}
            </DialogTitle>
            <DialogDescription class="text-xs text-muted-foreground mt-1">
              {{ description }}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <!-- Preview of items to be affected -->
      <div v-if="itemNames && itemNames.length > 0" class="my-2 p-3 bg-muted/50 rounded-lg border border-border/60 text-xs">
        <p class="font-medium text-muted-foreground mb-1.5">
          Selected {{ itemCount === 1 ? 'record' : 'records' }} ({{ itemCount }}):
        </p>
        <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
          <span
            v-for="(name, idx) in itemNames.slice(0, 10)"
            :key="idx"
            class="px-2 py-0.5 rounded-md bg-background border border-border text-foreground font-mono text-[11px]"
          >
            {{ name }}
          </span>
          <span v-if="itemNames.length > 10" class="text-muted-foreground text-[11px] self-center">
            +{{ itemNames.length - 10 }} more
          </span>
        </div>
      </div>

      <DialogFooter class="gap-2 sm:gap-0 mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="text-xs"
          :disabled="loading"
          @click="handleCancel"
        >
          Cancel
        </Button>
        <Button
          type="button"
          :variant="variant === 'destructive' ? 'destructive' : 'default'"
          size="sm"
          class="text-xs gap-1.5"
          :disabled="loading"
          @click="emit('confirm')"
        >
          <Loader2 v-if="loading" class="size-3.5 animate-spin" />
          <span>{{ actionLabel }} {{ itemCount > 0 ? `(${itemCount})` : '' }}</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>


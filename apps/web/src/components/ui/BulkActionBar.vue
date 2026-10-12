<script setup lang="ts">
import { computed } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { X, Trash2, Download, ChevronDown, Loader2 } from 'lucide-vue-next';

interface Props {
  count: number;
  label?: string;
  loading?: boolean;
  canDelete?: boolean;
  deleteLabel?: string;
  enableExport?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: 'items',
  loading: false,
  canDelete: true,
  deleteLabel: 'Delete',
  enableExport: true,
});

defineEmits<{
  (e: 'clear'): void;
  (e: 'delete'): void;
  (e: 'export', format: 'csv' | 'json'): void;
}>();

const isVisible = computed(() => props.count > 0);
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-6 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-6 scale-95"
    >
      <div
        v-if="isVisible"
        data-slot="bulk-action-bar"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl text-foreground text-sm max-w-[calc(100vw-2rem)] overflow-x-auto"
      >
        <!-- Selected Count Badge -->
        <div class="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" class="font-mono text-xs font-semibold px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20">
            {{ count }}
          </Badge>
          <span class="text-xs font-medium text-muted-foreground hidden sm:inline">
            {{ count === 1 ? 'item selected' : `${label} selected` }}
          </span>
        </div>

        <!-- Deselect Button -->
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
          @click="$emit('clear')"
        >
          <X class="size-3.5 mr-1" />
          Deselect
        </Button>

        <div class="h-4 w-px bg-border/80 shrink-0" />

        <!-- Custom Actions Slot (e.g., status dropdown, custom operations) -->
        <div class="flex items-center gap-2 shrink-0">
          <slot />
        </div>

        <!-- Export Menu -->
        <DropdownMenu v-if="enableExport">
          <DropdownMenuTrigger as-child>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 text-xs font-medium shrink-0 rounded-lg gap-1.5"
              :disabled="loading"
            >
              <Download class="size-3.5" />
              <span class="hidden sm:inline">Export</span>
              <ChevronDown class="size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" class="w-40">
            <DropdownMenuItem @click="$emit('export', 'csv')" class="text-xs cursor-pointer">
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem @click="$emit('export', 'json')" class="text-xs cursor-pointer">
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- Delete Action Button -->
        <Button
          v-if="canDelete"
          type="button"
          variant="destructive"
          size="sm"
          class="h-8 text-xs font-medium shrink-0 rounded-lg gap-1.5 shadow-xs"
          :disabled="loading"
          @click="$emit('delete')"
        >
          <Loader2 v-if="loading" class="size-3.5 animate-spin" />
          <Trash2 v-else class="size-3.5" />
          <span>{{ deleteLabel }}</span>
        </Button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Lock, ArrowUpRight, X, Sparkles } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    dismissible?: boolean;
    buttonText?: string;
  }>(),
  {
    title: 'Professional Plan Required',
    dismissible: true,
    buttonText: 'Upgrade to Professional',
  }
);

const emit = defineEmits<{
  (e: 'dismiss'): void;
}>();

const router = useRouter();

const handleUpgrade = () => {
  router.push('/settings?tab=Billing');
};
</script>

<template>
  <div
    class="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-r from-primary/[0.07] via-primary/[0.03] to-transparent p-4 transition-all duration-300 shadow-2xs"
  >
    <!-- Background Glow -->
    <div
      class="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
    />

    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0">
        <!-- Icon Badge -->
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/25"
        >
          <Lock class="h-4 w-4" />
        </div>

        <!-- Content -->
        <div class="min-w-0 flex-1 space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="text-xs font-bold text-foreground tracking-tight">
              {{ title }}
            </h4>
            <span
              class="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary border border-primary/20"
            >
              <Sparkles class="h-2.5 w-2.5" />
              Pro
            </span>
          </div>

          <p
            v-if="description"
            class="text-[11px] text-muted-foreground leading-relaxed"
          >
            {{ description }}
          </p>

          <div class="pt-2">
            <Button
              size="sm"
              class="h-7 rounded-lg text-[10px] font-bold uppercase tracking-wider gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
              @click="handleUpgrade"
            >
              <span>{{ buttonText }}</span>
              <ArrowUpRight class="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Dismiss Button -->
      <button
        v-if="dismissible"
        type="button"
        class="shrink-0 rounded-md p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
        @click="emit('dismiss')"
        aria-label="Dismiss"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>

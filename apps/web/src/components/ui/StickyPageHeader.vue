<script setup lang="ts">
import { ref, onMounted, onUnmounted, type Component } from 'vue';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    icon?: Component;
    scrollThreshold?: number;
    class?: string;
    containerClass?: string;
  }>(),
  {
    scrollThreshold: 40,
  }
);

const isScrolled = ref(false);
const headerRef = ref<HTMLElement | null>(null);
let scrollParent: HTMLElement | null = null;
let rafId: number | null = null;

const handleScroll = () => {
  if (rafId !== null) return;

  rafId = window.requestAnimationFrame(() => {
    rafId = null;
    const currentScroll =
      scrollParent && scrollParent !== document.documentElement
        ? scrollParent.scrollTop
        : window.scrollY || document.documentElement.scrollTop;

    const activateThreshold = props.scrollThreshold ?? 40;
    const deactivateThreshold = Math.max(8, Math.floor(activateThreshold * 0.25));

    if (!isScrolled.value && currentScroll > activateThreshold) {
      isScrolled.value = true;
    } else if (isScrolled.value && currentScroll <= deactivateThreshold) {
      isScrolled.value = false;
    }
  });
};

onMounted(() => {
  let parent = headerRef.value?.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      scrollParent = parent;
      scrollParent.addEventListener('scroll', handleScroll, { passive: true });
      const activateThreshold = props.scrollThreshold ?? 40;
      isScrolled.value = scrollParent.scrollTop > activateThreshold;
      break;
    }
    parent = parent.parentElement;
  }

  if (!scrollParent) {
    scrollParent = document.documentElement;
    window.addEventListener('scroll', handleScroll, { passive: true });
    const activateThreshold = props.scrollThreshold ?? 40;
    isScrolled.value = (window.scrollY || document.documentElement.scrollTop) > activateThreshold;
  }
});

onUnmounted(() => {
  if (scrollParent && scrollParent !== document.documentElement) {
    scrollParent.removeEventListener('scroll', handleScroll);
  } else {
    window.removeEventListener('scroll', handleScroll);
  }
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
});
</script>

<template>
  <header
    ref="headerRef"
    :class="
      cn(
        'sticky top-0 z-20 w-full transition-all duration-200 select-none',
        isScrolled
          ? 'bg-background/80 dark:bg-background/85 backdrop-blur-md border-b border-border shadow-2xs py-2.5 md:py-3'
          : 'bg-transparent border-b border-transparent py-4 md:pt-5 md:pb-4',
        props.class
      )
    "
    style="overflow-anchor: none;"
  >
    <div
      :class="
        cn(
          'max-w-7xl mx-auto px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200',
          props.containerClass
        )
      "
    >
      <!-- Left side (Icon + Title + Subtitle) -->
      <slot name="left" :isScrolled="isScrolled">
        <div class="flex items-center gap-3.5 min-w-0">
          <slot name="icon" :isScrolled="isScrolled">
            <div
              v-if="icon"
              :class="
                cn(
                  'rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 transition-all duration-200',
                  isScrolled ? 'w-8 h-8 rounded-lg' : 'w-11 h-11 shadow-2xs'
                )
              "
            >
              <component
                :is="icon"
                :class="
                  cn(
                    'transition-all duration-200',
                    isScrolled ? 'w-4 h-4' : 'w-5 h-5'
                  )
                "
              />
            </div>
          </slot>

          <div class="space-y-0.5 min-w-0">
            <div class="flex items-center gap-2.5 flex-wrap">
              <slot name="title" :isScrolled="isScrolled">
                <h1
                  :class="
                    cn(
                      'font-bold tracking-tight text-foreground transition-all duration-200 truncate',
                      isScrolled
                        ? 'text-lg md:text-xl'
                        : 'ui-page-title text-2xl md:text-3xl'
                    )
                  "
                >
                  {{ title }}
                </h1>
              </slot>

              <slot name="badges" :isScrolled="isScrolled" />
            </div>

            <div
              v-if="$slots.subtitle || subtitle"
              :class="
                cn(
                  'transition-all duration-200 overflow-hidden',
                  isScrolled
                    ? 'max-h-0 opacity-0 -translate-y-1'
                    : 'max-h-12 opacity-100 translate-y-0'
                )
              "
            >
              <slot name="subtitle" :isScrolled="isScrolled">
                <p class="ui-page-description text-xs md:text-sm text-muted-foreground truncate">
                  {{ subtitle }}
                </p>
              </slot>
            </div>
          </div>
        </div>
      </slot>

      <!-- Right side (Actions buttons) -->
      <div v-if="$slots.actions" class="flex items-center gap-2.5 shrink-0">
        <slot name="actions" :isScrolled="isScrolled" />
      </div>
    </div>
  </header>
</template>


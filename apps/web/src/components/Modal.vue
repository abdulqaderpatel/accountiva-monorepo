<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import { X } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    description?: string;
    maxWidthClass?: string;
    zIndexClass?: string;
    bodyClass?: string;
    closeOnBackdrop?: boolean;
  }>(),
  {
    title: "",
    description: "",
    maxWidthClass: "max-w-xl",
    zIndexClass: "z-50",
    bodyClass: "p-5",
    closeOnBackdrop: false,
  }
);

const emit = defineEmits(["close"]);
const dialogRef = ref<HTMLElement | null>(null);
const titleId = `modal-title-${useId()}`;
let previouslyFocused: HTMLElement | null = null;
let previousBodyOverflow = "";

const restorePageState = () => {
  document.body.style.overflow = previousBodyOverflow;
  previouslyFocused?.focus();
  previouslyFocused = null;
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.stopPropagation();
    emit("close");
    return;
  }

  if (event.key !== "Tab" || !dialogRef.value) return;
  const focusable = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden") && element.offsetParent !== null);

  if (focusable.length === 0) {
    event.preventDefault();
    dialogRef.value.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      restorePageState();
      return;
    }
    previouslyFocused = document.activeElement as HTMLElement | null;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    await nextTick();
    dialogRef.value?.focus();
  },
  { immediate: true },
);

onBeforeUnmount(restorePageState);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      :class="[
        'fixed inset-0 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs',
        zIndexClass
      ]"
      @click="closeOnBackdrop && emit('close')"
    >
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
        :aria-label="title ? undefined : 'Dialog'"
        tabindex="-1"
        :class="[
          'flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl shadow-black/50 outline-none animate-in fade-in zoom-in-95 duration-200',
          maxWidthClass
        ]"
        @click.stop
        @keydown="handleKeydown"
      >
        <!-- Header -->
        <div data-slot="modal-header" class="modal-header-slot shrink-0">
          <slot name="header">
          <div class="flex items-start justify-between gap-4 border-b border-border bg-background px-6 py-4">
            <div class="min-w-0 space-y-1">
              <h2 :id="titleId" class="text-base font-semibold leading-tight text-foreground">
                <slot name="title">{{ title }}</slot>
              </h2>
              <p
                v-if="description || $slots.description"
                class="text-xs leading-relaxed text-muted-foreground"
              >
                <slot name="description">{{ description }}</slot>
              </p>
            </div>
            <div class="-mr-1.5 -mt-1 flex items-center gap-1 shrink-0">
              <slot name="header-actions" />
              <button
                type="button"
                aria-label="Close dialog"
                @click="emit('close')"
                class="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X class="size-4" />
              </button>
            </div>
          </div>
          </slot>
        </div>

        <!-- Body -->
        <div data-slot="modal-body" :class="['min-h-0 flex-1 overflow-y-auto', bodyClass]">
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" data-slot="modal-footer" class="modal-footer flex shrink-0 justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-header-slot :deep(h2) {
  font-size: 1rem !important;
  line-height: 1.35 !important;
  font-weight: 600 !important;
  letter-spacing: -0.01em !important;
}

.modal-header-slot :deep(p) {
  font-size: 0.75rem !important;
  line-height: 1.5 !important;
  font-weight: 400 !important;
  letter-spacing: normal !important;
  text-transform: none !important;
}

.modal-footer :deep([data-slot="button"]) {
  flex: 0 0 auto !important;
  min-width: 7rem;
}

.modal-footer :deep([data-slot="button"][data-variant="ghost"]),
.modal-footer :deep([data-slot="button"][data-variant="outline"]) {
  border: 1px solid var(--border) !important;
  background-color: var(--secondary) !important;
  color: var(--secondary-foreground) !important;
}

.modal-footer :deep([data-slot="button"][data-variant="ghost"]:hover),
.modal-footer :deep([data-slot="button"][data-variant="outline"]:hover) {
  background-color: var(--accent) !important;
  color: var(--accent-foreground) !important;
  border-color: var(--border) !important;
}

@media (max-width: 639px) {
  .modal-footer {
    flex-direction: column-reverse;
  }

  .modal-footer :deep([data-slot="button"]) {
    width: 100%;
  }
}
</style>

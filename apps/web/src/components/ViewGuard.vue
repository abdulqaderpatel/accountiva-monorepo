<script setup lang="ts">
import { usePermissions, type Module } from "@/composables/usePermissions";
import AccessRestricted from "./AccessRestricted.vue";
import MockContent from "./MockContent.vue";

defineProps<{
  module: Module;
}>();

const { canView } = usePermissions();
</script>

<template>
  <div v-bind="$attrs" class="relative flex-1 flex flex-col w-full min-h-0">
    <!-- Background Content (Blurred if restricted) -->
    <div
      :class="[
        'flex-1 flex flex-col w-full transition-all duration-700 min-h-0',
        !canView(module)
          ? 'blur-[2px] grayscale-[0.5] pointer-events-none select-none scale-[1.01]'
          : '',
      ]"
    >
      <slot v-if="canView(module)" />
      <MockContent v-else :module="module" />
    </div>

    <!-- Restricted Access Overlay -->
    <transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="!canView(module)"
        class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/20 backdrop-blur-[1px]"
      >
        <div class="w-full max-w-lg animate-in zoom-in-95 duration-500">
          <AccessRestricted :module-name="module" />
        </div>
      </div>
    </transition>
  </div>
</template>

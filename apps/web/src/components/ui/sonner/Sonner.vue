<script setup lang="ts">
import { Toaster as Sonner, type ToasterProps } from 'vue-sonner'
import 'vue-sonner/style.css'

const props = defineProps<ToasterProps>()
</script>

<template>
  <Sonner
    class="toaster group"
    v-bind="props"
    :toast-options="{
      classes: {
        toast: 'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border/80 group-[.toaster]:shadow-xl group-[.toaster]:shadow-black/10',
        description: 'group-[.toast]:text-muted-foreground',
        actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-semibold',
        cancelButton: 'group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground font-medium',
      },
    }"
  />
</template>

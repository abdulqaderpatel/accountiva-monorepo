<script setup lang="ts">
import { DialogTitle, type DialogTitleProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<DialogTitleProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
</script>

<template>
  <DialogTitle
    data-slot="dialog-title"
    v-bind="delegatedProps"
    :class="
      cn('text-base font-semibold leading-tight tracking-tight', props.class)
    "
  >
    <slot />
  </DialogTitle>
</template>

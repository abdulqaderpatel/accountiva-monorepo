<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"]
    as?: string
  }>(),
  {
    as: "h3",
  },
)
</script>

<template>
  <component
    :is="as"
    data-slot="card-title"
    :class="
      cn(
        'text-base font-semibold leading-snug tracking-tight group-data-[size=sm]/card:text-sm',
        props.class,
      )
    "
  >
    <slot />
  </component>
</template>

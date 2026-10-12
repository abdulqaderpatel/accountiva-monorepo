<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"]
    colspan?: number
  }>(),
  {
    colspan: 1,
  },
)
</script>

<template>
  <tr data-slot="table-empty">
    <td
      :class="
        cn(
          'p-8 text-center align-middle text-sm text-muted-foreground',
          props.class,
        )
      "
      :colspan="props.colspan"
    >
      <slot />
    </td>
  </tr>
</template>


<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { BadgeVariants } from "."
import { cn } from "@/lib/utils"
import { badgeVariants } from "."

interface Props {
  variant?: BadgeVariants["variant"]
  size?: BadgeVariants["size"]
  shape?: BadgeVariants["shape"]
  class?: HTMLAttributes["class"]
}

const props = withDefaults(defineProps<Props>(), {
  variant: "default",
  size: "default",
  shape: "default",
})
</script>

<template>
  <div
    data-slot="badge"
    :class="cn(badgeVariants({ variant, size, shape }), props.class)"
  >
    <slot />
  </div>
</template>

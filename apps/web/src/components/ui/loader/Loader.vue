<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

interface LoaderProps {
  size?: number | string
  class?: string
}

const props = withDefaults(defineProps<LoaderProps>(), {
  size: 24
})
</script>

<template>
  <div :class="cn('flex items-center justify-center', props.class)">
    <Loader2 :size="props.size" class="animate-spin text-primary" />
  </div>
</template>

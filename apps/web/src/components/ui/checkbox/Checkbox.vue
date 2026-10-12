<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed } from "vue"
import { Check, Minus } from "lucide-vue-next"
import { cn } from "@/lib/utils"

interface Props {
  class?: HTMLAttributes["class"]
  checked?: boolean | 'indeterminate'
  modelValue?: boolean | 'indeterminate'
  disabled?: boolean
  id?: string
  name?: string
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  checked: undefined,
  modelValue: undefined,
  disabled: false,
})

const emits = defineEmits<{
  (e: 'update:modelValue', value: boolean | 'indeterminate'): void
  (e: 'update:checked', value: boolean | 'indeterminate'): void
}>()

const isChecked = computed(() => {
  if (props.modelValue !== undefined) return props.modelValue
  if (props.checked !== undefined) return props.checked
  return false
})

const state = computed<'checked' | 'unchecked' | 'indeterminate'>(() => {
  if (isChecked.value === 'indeterminate') return 'indeterminate'
  return isChecked.value ? 'checked' : 'unchecked'
})

function handleClick(e: MouseEvent) {
  if (props.disabled) return
  e.stopPropagation()
  const nextVal = isChecked.value === true ? false : true
  emits('update:modelValue', nextVal)
  emits('update:checked', nextVal)
}
</script>

<template>
  <button
    type="button"
    role="checkbox"
    data-slot="checkbox"
    :id="id"
    :name="name"
    :disabled="disabled"
    :aria-checked="state === 'indeterminate' ? 'mixed' : isChecked ? 'true' : 'false'"
    :aria-label="ariaLabel"
    :data-state="state"
    @click="handleClick"
    :class="
      cn(
        'peer size-4 shrink-0 rounded-[4px] border shadow-xs outline-none transition-all duration-150',
        'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring',
        'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex items-center justify-center',
        state === 'checked' || state === 'indeterminate'
          ? 'bg-primary border-primary text-primary-foreground'
          : 'border-input bg-card/60 hover:bg-muted/40 hover:border-muted-foreground/50 text-transparent',
        props.class
      )
    "
  >
    <Minus v-if="state === 'indeterminate'" class="size-3.5 stroke-[2.5]" />
    <Check v-else-if="state === 'checked'" class="size-3.5 stroke-[2.5]" />
  </button>
</template>


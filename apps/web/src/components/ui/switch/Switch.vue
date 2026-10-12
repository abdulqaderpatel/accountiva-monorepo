<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
 modelValue?: boolean
 disabled?: boolean
}>()

const emit = defineEmits<{
 (e: 'update:modelValue', value: boolean): void
}>()

const isChecked = computed({
 get: () => props.modelValue ?? false,
 set: (val) => emit('update:modelValue', val)
})

const toggle = () => {
 if (!props.disabled) {
 isChecked.value = !isChecked.value
 }
}
</script>

<template>
 <button
 type="button"
 role="switch"
 :aria-checked="isChecked"
 :disabled="disabled"
 class="peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-px transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
 :class="isChecked ? 'bg-primary' : 'bg-surface-interactive border-border/70'"
 @click="toggle"
 >
 <span
 aria-hidden="true"
 class="pointer-events-none block h-5 w-5 rounded-full bg-primary-foreground shadow-sm ring-0 transition-transform duration-200 ease-out"
 :class="isChecked ? 'translate-x-5' : 'translate-x-0'"
 />
 </button>
</template>

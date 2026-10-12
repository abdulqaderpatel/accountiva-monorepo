<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ChevronDown, Check } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

interface OptionObject {
  id: string | number
  name: string
  [key: string]: any
}

type Option = OptionObject | string | number

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    options: Option[]
    placeholder?: string
    class?: string
    disabled?: boolean
    error?: boolean | string
  }>(),
  {
    modelValue: '',
    placeholder: 'Select an option',
    disabled: false,
  }
)

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const activeIndex = ref(-1)
const popoverStyle = ref<Record<string, string>>({
  top: '0px',
  left: '0px',
  width: '0px',
})

const getOptionId = (option: Option) => {
  if (typeof option === 'object' && option !== null) {
    return option.id
  }
  return option
}

const getOptionName = (option: Option) => {
  if (typeof option === 'object' && option !== null) {
    return option.name
  }
  return String(option)
}

const isOptionSelected = (option: Option) => {
  if (props.modelValue === null || props.modelValue === undefined) return false
  return String(getOptionId(option)) === String(props.modelValue)
}

const updatePosition = () => {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const dropdownMaxHeight = 260
  const openUpwards = spaceBelow < dropdownMaxHeight && rect.top > dropdownMaxHeight

  const calculatedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))

  if (openUpwards) {
    popoverStyle.value = {
      position: 'fixed',
      bottom: `${window.innerHeight - rect.top + 4}px`,
      left: `${calculatedLeft}px`,
      width: `${rect.width}px`,
      maxHeight: `${Math.min(dropdownMaxHeight, rect.top - 16)}px`,
      zIndex: '9999',
    }
  } else {
    popoverStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      left: `${calculatedLeft}px`,
      width: `${rect.width}px`,
      maxHeight: `${Math.min(dropdownMaxHeight, spaceBelow - 16)}px`,
      zIndex: '9999',
    }
  }
}

const toggleDropdown = async () => {
  if (props.disabled) return
  if (!isOpen.value) {
    window.dispatchEvent(new CustomEvent('close-all-selects'))
    window.dispatchEvent(new CustomEvent('close-all-date-pickers'))
    isOpen.value = true
    updatePosition()
    const selectedIndex = props.options.findIndex(option => isOptionSelected(option))
    activeIndex.value = selectedIndex >= 0 ? selectedIndex : 0
    await nextTick()
    updatePosition()
  } else {
    isOpen.value = false
  }
}

const selectOption = (option: Option) => {
  const value = getOptionId(option)
  emit('update:modelValue', value)
  emit('change', value)
  isOpen.value = false
}

const handleKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return

  if (event.key === 'Escape') {
    isOpen.value = false
    return
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (props.options.length === 0) return
    if (!isOpen.value) {
      toggleDropdown()
      return
    }
    const direction = event.key === 'ArrowDown' ? 1 : -1
    activeIndex.value = (activeIndex.value + direction + props.options.length) % props.options.length
    return
  }

  if ((event.key === 'Enter' || event.key === ' ') && isOpen.value && props.options[activeIndex.value]) {
    event.preventDefault()
    selectOption(props.options[activeIndex.value])
  }
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (
    triggerRef.value && !triggerRef.value.contains(target) &&
    popoverRef.value && !popoverRef.value.contains(target)
  ) {
    isOpen.value = false
  }
}

const closeAll = () => {
  isOpen.value = false
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
  window.addEventListener('close-all-selects', closeAll)
  window.addEventListener('close-all-date-pickers', closeAll)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('close-all-selects', closeAll)
  window.removeEventListener('close-all-date-pickers', closeAll)
})

const selectedOptionName = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') return ''
  const option = props.options.find(opt => isOptionSelected(opt))
  return option ? getOptionName(option) : ''
})
</script>

<template>
  <div class="relative w-full">
    <button
      ref="triggerRef"
      type="button"
      :disabled="disabled"
      @click="toggleDropdown"
      @keydown="handleKeydown"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :class="cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 dark:bg-input/30',
        (!modelValue && modelValue !== 0) && 'text-muted-foreground',
        Boolean(props.error) && 'border-destructive focus-visible:ring-destructive/50',
        props.class
      )"
    >
      <span class="truncate text-left">{{ selectedOptionName || (placeholder || 'Select an option') }}</span>
      <ChevronDown :class="cn('h-4 w-4 shrink-0 text-muted-foreground opacity-50 transition-transform duration-200 ml-2', isOpen && 'rotate-180')" />
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popoverRef"
        role="listbox"
        class="fixed overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 duration-100"
        :style="popoverStyle"
        @click.stop
      >
        <div class="max-h-56 overflow-y-auto custom-scrollbar">
          <div
            v-for="(option, index) in options"
            :key="getOptionId(option)"
            @click="selectOption(option)"
            role="option"
            :aria-selected="isOptionSelected(option)"
            :class="cn(
              'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
              isOptionSelected(option) && 'font-medium',
              activeIndex === index && 'bg-accent text-accent-foreground'
            )"
          >
            <span
              v-if="isOptionSelected(option)"
              class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center text-foreground"
            >
              <Check class="h-4 w-4" />
            </span>
            <span class="block truncate text-left">{{ getOptionName(option) }}</span>
          </div>
          <div v-if="options.length === 0" class="py-4 text-center text-xs text-muted-foreground italic">
            No options available
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

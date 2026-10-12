<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    placeholder?: string
    class?: string
    error?: boolean | string
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    disabled: false,
  }
)

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const popoverRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const viewDate = ref(new Date(props.modelValue || new Date()))
const popoverStyle = ref<Record<string, string>>({ top: '0px', left: '0px' })

const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const updatePosition = () => {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const dropdownHeight = 310
  const openUpwards = spaceBelow < dropdownHeight && rect.top > dropdownHeight

  const calculatedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - 296))

  if (openUpwards) {
    popoverStyle.value = {
      position: 'fixed',
      bottom: `${window.innerHeight - rect.top + 4}px`,
      left: `${calculatedLeft}px`,
      zIndex: '9999',
    }
  } else {
    popoverStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      left: `${calculatedLeft}px`,
      zIndex: '9999',
    }
  }
}

const togglePopover = async () => {
  if (props.disabled) return
  if (!isOpen.value) {
    window.dispatchEvent(new CustomEvent('close-all-date-pickers'))
    window.dispatchEvent(new CustomEvent('close-all-selects'))
    isOpen.value = true
    if (props.modelValue) {
      viewDate.value = new Date(props.modelValue)
    }
    updatePosition()
    await nextTick()
    updatePosition()
  } else {
    isOpen.value = false
  }
}

const calendarDays = computed(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days = []

  // Padding for previous month
  const prevMonthDays = new Date(year, month, 0).getDate()
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    days.push({
      day: prevMonthDays - i,
      month: month - 1,
      year: year,
      isCurrentMonth: false
    })
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      month: month,
      year: year,
      isCurrentMonth: true
    })
  }

  // Padding for next month
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      month: month + 1,
      year: year,
      isCurrentMonth: false
    })
  }

  return days
})

const selectDate = (day: number, month: number, year: number) => {
  const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  emit('update:modelValue', formatted)
  emit('change', formatted)
  isOpen.value = false
}

const isSelected = (day: number, month: number, year: number) => {
  if (!props.modelValue) return false
  const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return formatted === props.modelValue
}

const isToday = (day: number, month: number, year: number) => {
  const today = new Date()
  return today.getDate() === day &&
    today.getMonth() === month &&
    today.getFullYear() === year
}

const prevMonth = (e: MouseEvent) => {
  e.stopPropagation()
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1)
}

const nextMonth = (e: MouseEvent) => {
  e.stopPropagation()
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1)
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (
    popoverRef.value && !popoverRef.value.contains(target) &&
    triggerRef.value && !triggerRef.value.contains(target)
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
  window.addEventListener('close-all-date-pickers', closeAll)
  window.addEventListener('close-all-selects', closeAll)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('close-all-date-pickers', closeAll)
  window.removeEventListener('close-all-selects', closeAll)
})
</script>

<template>
  <div class="relative w-full">
    <button
      type="button"
      ref="triggerRef"
      :disabled="disabled"
      @click="togglePopover"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :class="cn(
        'flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
        !modelValue && 'text-muted-foreground',
        Boolean(props.error) && 'border-destructive focus-visible:ring-destructive/50',
        props.class
      )"
    >
      <span class="truncate">{{ modelValue || placeholder || 'Pick a date' }}</span>
      <CalendarIcon class="h-4 w-4 shrink-0 text-muted-foreground opacity-50 ml-2" />
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popoverRef"
        role="dialog"
        aria-label="Choose a date"
        class="fixed overflow-hidden rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 duration-100 w-[280px]"
        :style="popoverStyle"
        @click.stop
      >
        <div class="flex items-center justify-between mb-3">
          <button
            type="button"
            @click="prevMonth"
            class="h-7 w-7 rounded-md border border-input bg-background p-0 opacity-70 hover:opacity-100 flex items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <div class="text-sm font-medium text-foreground">
            {{ months[viewDate.getMonth()] }} {{ viewDate.getFullYear() }}
          </div>
          <button
            type="button"
            @click="nextMonth"
            class="h-7 w-7 rounded-md border border-input bg-background p-0 opacity-70 hover:opacity-100 flex items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>

        <div class="grid grid-cols-7 gap-1 mb-1">
          <div
            v-for="day in daysOfWeek"
            :key="day"
            class="text-center text-[0.8rem] font-normal text-muted-foreground py-0.5"
          >
            {{ day }}
          </div>
        </div>

        <div class="grid grid-cols-7 gap-1">
          <button
            type="button"
            v-for="(date, i) in calendarDays"
            :key="i"
            @click="selectDate(date.day, date.month, date.year)"
            :class="cn(
              'h-8 w-8 rounded-md text-sm font-normal flex items-center justify-center transition-colors p-0',
              !date.isCurrentMonth && 'text-muted-foreground opacity-40',
              date.isCurrentMonth && !isSelected(date.day, date.month, date.year) && 'text-foreground hover:bg-accent hover:text-accent-foreground',
              isToday(date.day, date.month, date.year) && !isSelected(date.day, date.month, date.year) && 'bg-accent text-accent-foreground',
              isSelected(date.day, date.month, date.year) && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground'
            )"
          >
            {{ date.day }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

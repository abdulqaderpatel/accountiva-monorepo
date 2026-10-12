<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ChevronDown, Check, Search, Globe } from 'lucide-vue-next'
import { COUNTRIES, type CountryOption, getCountryByName } from '@/constants/countries'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    modelValue: 'India',
    placeholder: 'Select a country',
    disabled: false,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', country: CountryOption): void
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const triggerRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const popoverStyle = ref<Record<string, string>>({
  top: '0px',
  left: '0px',
  width: '0px',
})

const selectedCountry = computed(() => {
  return getCountryByName(props.modelValue) || COUNTRIES.find(c => c.name === 'India') || COUNTRIES[0]
})

const filteredCountries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return COUNTRIES
  return COUNTRIES.filter(
    c =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.currency.toLowerCase().includes(q)
  )
})

const updatePosition = () => {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const dropdownMaxHeight = 280
  const openUpwards = spaceBelow < dropdownMaxHeight && rect.top > dropdownMaxHeight

  const calculatedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))

  if (openUpwards) {
    popoverStyle.value = {
      position: 'fixed',
      bottom: `${window.innerHeight - rect.top + 4}px`,
      left: `${calculatedLeft}px`,
      width: `${rect.width}px`,
      maxHeight: `${Math.min(dropdownMaxHeight, rect.top - 16)}px`,
      zIndex: '99999',
    }
  } else {
    popoverStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      left: `${calculatedLeft}px`,
      width: `${rect.width}px`,
      maxHeight: `${Math.min(dropdownMaxHeight, spaceBelow - 16)}px`,
      zIndex: '99999',
    }
  }
}

const toggleDropdown = async () => {
  if (props.disabled) return
  if (!isOpen.value) {
    window.dispatchEvent(new CustomEvent('close-all-selects'))
    isOpen.value = true
    searchQuery.value = ''
    updatePosition()
    await nextTick()
    searchInputRef.value?.focus()
    updatePosition()
  } else {
    isOpen.value = false
  }
}

const selectCountry = (country: CountryOption) => {
  emit('update:modelValue', country.name)
  emit('select', country)
  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null
  if (!target) return
  if (triggerRef.value?.contains(target)) return
  const popover = document.getElementById('country-select-popover')
  if (popover?.contains(target)) return
  isOpen.value = false
}

const handleScroll = (event: Event) => {
  if (!isOpen.value) return
  const popover = document.getElementById('country-select-popover')
  if (popover && event.target instanceof Node && popover.contains(event.target)) {
    return
  }
  updatePosition()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', handleScroll, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', handleScroll, true)
})
</script>

<template>
  <div class="relative w-full">
    <button
      ref="triggerRef"
      type="button"
      @click="toggleDropdown"
      :disabled="disabled"
      :class="[
        'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 text-left cursor-pointer select-none',
        isOpen ? 'border-ring ring-[3px] ring-ring/50' : 'hover:border-input/80',
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]"
    >
      <div class="flex items-center gap-2 truncate">
        <span class="text-base shrink-0 leading-none">{{ selectedCountry.flag || '🌐' }}</span>
        <span class="text-sm font-medium text-foreground truncate">{{ selectedCountry.name }}</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0 ml-2">
        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
          {{ selectedCountry.currency }}
        </span>
        <ChevronDown class="w-4 h-4 text-muted-foreground opacity-50 transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
      </div>
    </button>

    <teleport to="body">
      <div
        v-if="isOpen"
        id="country-select-popover"
        :style="popoverStyle"
        class="bg-popover text-popover-foreground border border-border/80 rounded-xl shadow-xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
      >
        <!-- Search bar -->
        <div class="p-2 border-b border-border/60 bg-muted/20">
          <div class="relative">
            <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              placeholder="Search country or currency..."
              class="w-full h-8 pl-8 pr-3 text-xs bg-background border border-input rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
              @keydown.stop
            />
          </div>
        </div>

        <!-- Options list -->
        <div class="overflow-y-auto max-h-[220px] p-1 space-y-0.5">
          <div
            v-for="country in filteredCountries"
            :key="country.code"
            @click="selectCountry(country)"
            :class="[
              'w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors',
              selectedCountry.name === country.name
                ? 'bg-primary/10 text-primary font-semibold'
                : 'hover:bg-muted text-foreground'
            ]"
          >
            <div class="flex items-center gap-2 truncate">
              <span class="text-sm shrink-0 leading-none">{{ country.flag || '🌐' }}</span>
              <span class="truncate">{{ country.name }}</span>
            </div>
            <div class="flex items-center gap-2 shrink-0 ml-2">
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-semibold">
                {{ country.currency }}
              </span>
              <Check v-if="selectedCountry.name === country.name" class="w-3.5 h-3.5 text-primary shrink-0" />
            </div>
          </div>

          <div v-if="filteredCountries.length === 0" class="py-6 text-center text-xs text-muted-foreground">
            No countries found
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

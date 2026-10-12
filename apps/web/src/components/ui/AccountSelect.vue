<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ChevronDown, Check, Plus, Search } from 'lucide-vue-next'
import { useTransactionStore } from '@/stores/transactionStore'
import { cn } from '@/lib/utils'
import { toast } from 'vue-sonner'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    class?: string
    options?: string[]
    showAddAction?: boolean
    error?: boolean | string
    disabled?: boolean
  }>(),
  {
    showAddAction: true,
    disabled: false,
  }
)

const emit = defineEmits(['update:modelValue', 'add-account', 'change'])

const transactionStore = useTransactionStore()
const isOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const isAddingCustom = ref(false)
const newAccountName = ref('')
const searchQuery = ref('')
const popoverStyle = ref<Record<string, string>>({
  top: '0px',
  left: '0px',
  width: '0px',
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
      width: `${Math.max(rect.width, 224)}px`,
      maxHeight: `${Math.min(dropdownMaxHeight, rect.top - 16)}px`,
      zIndex: '9999',
    }
  } else {
    popoverStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      left: `${calculatedLeft}px`,
      width: `${Math.max(rect.width, 224)}px`,
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
    searchQuery.value = ''
    isAddingCustom.value = false
    updatePosition()
    await nextTick()
    updatePosition()
  } else {
    isOpen.value = false
  }
}

const selectOption = (val: string) => {
  emit('update:modelValue', val)
  emit('change', val)
  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (
    triggerRef.value && !triggerRef.value.contains(target) &&
    popoverRef.value && !popoverRef.value.contains(target)
  ) {
    isOpen.value = false
    isAddingCustom.value = false
  }
}

const closeAll = () => {
  isOpen.value = false
  isAddingCustom.value = false
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

const filteredAccounts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const sourceAccounts = props.options || transactionStore.allAccounts
  if (!query) return sourceAccounts
  return sourceAccounts.filter(acc => acc.toLowerCase().includes(query))
})

const handleAddNewAccount = () => {
  const name = newAccountName.value.trim()
  if (!name) return

  if (props.options) {
    if (props.options.includes(name)) {
      toast.error('Account name already exists')
      return
    }
    emit('add-account', name)
    newAccountName.value = ''
    isAddingCustom.value = false
    isOpen.value = false
  } else {
    const success = transactionStore.addCustomAccount(name)
    if (success) {
      toast.success(`Account "${name}" created successfully`)
      emit('update:modelValue', name)
      emit('change', name)
      newAccountName.value = ''
      isAddingCustom.value = false
      isOpen.value = false
    } else {
      toast.error('Account name already exists or is invalid')
    }
  }
}
</script>

<template>
  <div class="relative w-full">
    <button
      ref="triggerRef"
      type="button"
      :disabled="disabled"
      @click="toggleDropdown"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :class="cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent dark:bg-input/30 px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
        !modelValue && 'text-muted-foreground',
        Boolean(props.error) && 'border-destructive focus-visible:ring-destructive/50',
        props.class
      )"
    >
      <span class="truncate text-left">{{ modelValue || (placeholder || 'Select an account') }}</span>
      <ChevronDown :class="cn('h-4 w-4 shrink-0 text-muted-foreground opacity-50 transition-transform duration-200 ml-2', isOpen && 'rotate-180')" />
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popoverRef"
        role="listbox"
        class="fixed overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 duration-100 flex flex-col"
        :style="popoverStyle"
        @click.stop
      >
        <!-- Search Input -->
        <div class="p-1 border-b border-border/60 shrink-0">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground opacity-50" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search accounts..."
              class="h-8 w-full rounded-sm border border-input bg-transparent dark:bg-input/30 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <!-- Options list -->
        <div class="max-h-48 overflow-y-auto py-1 space-y-0.5 custom-scrollbar flex-1">
          <div
            v-for="acc in filteredAccounts"
            :key="acc"
            @click="selectOption(acc)"
            role="option"
            :aria-selected="modelValue === acc"
            :class="cn(
              'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
              modelValue === acc && 'font-medium'
            )"
          >
            <span
              v-if="modelValue === acc"
              class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center text-foreground"
            >
              <Check class="h-4 w-4" />
            </span>
            <span class="block truncate text-left">{{ acc }}</span>
          </div>
          <div v-if="filteredAccounts.length === 0" class="py-4 text-center text-xs text-muted-foreground italic">
            No accounts found
          </div>
        </div>

        <!-- Add New Account Action -->
        <div v-if="showAddAction" class="border-t border-border/60 p-1 shrink-0">
          <div v-if="!isAddingCustom">
            <button
              type="button"
              @click.stop="isAddingCustom = true"
              class="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-xs font-medium text-primary hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Plus class="w-3.5 h-3.5" />
              Add New Account
            </button>
          </div>
          <div v-else class="space-y-2 p-1" @click.stop>
            <div class="text-[11px] font-medium text-muted-foreground">New account name</div>
            <input
              v-model="newAccountName"
              type="text"
              placeholder="e.g. Digital Wallet"
              class="h-8 w-full rounded-sm border border-input bg-transparent dark:bg-input/30 px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              @keyup.enter="handleAddNewAccount"
            />
            <div class="flex gap-1.5 justify-end">
              <button
                type="button"
                @click="isAddingCustom = false"
                class="rounded-sm border border-input bg-transparent dark:bg-input/30 px-2 py-1 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                @click="handleAddNewAccount"
                class="rounded-sm bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ChevronDown, Check, Search } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

export interface GstTreatmentOption {
  id: string;
  name: string;
  description: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    error?: boolean | string;
    class?: string;
    disabled?: boolean;
    context?: 'vendor' | 'customer';
  }>(),
  {
    disabled: false,
    context: 'customer',
  }
);

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const searchQuery = ref('');
const triggerRef = ref<HTMLElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);
const popoverStyle = ref<Record<string, string>>({
  top: '0px',
  left: '0px',
  width: '0px',
});

const options = computed<GstTreatmentOption[]>(() => {
  const isVendor = props.context === 'vendor';
  return [
    {
      id: 'Registered',
      name: 'Registered',
      description: 'Business registered under GST with a valid GSTIN',
    },
    {
      id: 'Composition',
      name: 'Composition',
      description: 'Business registered under the GST Composition Scheme',
    },
    {
      id: isVendor ? 'Unregistered' : 'Consumer (Unregistered)',
      name: isVendor ? 'Unregistered' : 'Consumer (Unregistered)',
      description: isVendor
        ? 'Business or entity not registered under GST'
        : 'Individual consumer or business not registered under GST',
    },
  ];
});

const updatePosition = () => {
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const dropdownMaxHeight = 280;
  const openUpwards = spaceBelow < dropdownMaxHeight && rect.top > dropdownMaxHeight;

  const calculatedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8));

  if (openUpwards) {
    popoverStyle.value = {
      position: 'fixed',
      bottom: `${window.innerHeight - rect.top + 4}px`,
      left: `${calculatedLeft}px`,
      width: `${Math.max(rect.width, 240)}px`,
      maxHeight: `${Math.min(dropdownMaxHeight, rect.top - 16)}px`,
      zIndex: '9999',
    };
  } else {
    popoverStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      left: `${calculatedLeft}px`,
      width: `${Math.max(rect.width, 240)}px`,
      maxHeight: `${Math.min(dropdownMaxHeight, spaceBelow - 16)}px`,
      zIndex: '9999',
    };
  }
};

const toggleDropdown = async () => {
  if (props.disabled) return;
  if (!isOpen.value) {
    window.dispatchEvent(new CustomEvent('close-all-selects'));
    window.dispatchEvent(new CustomEvent('close-all-date-pickers'));
    isOpen.value = true;
    searchQuery.value = '';
    updatePosition();
    await nextTick();
    updatePosition();
  } else {
    isOpen.value = false;
  }
};

const selectOption = (option: GstTreatmentOption) => {
  emit('update:modelValue', option.id);
  emit('change', option.id);
  isOpen.value = false;
};

const isOptionSelected = (option: GstTreatmentOption) => {
  if (props.modelValue === option.id) return true;
  if (
    (props.modelValue === 'Consumer (Unregistered)' ||
      props.modelValue === 'Unregistered Business' ||
      props.modelValue === 'Unregistered') &&
    (option.id === 'Unregistered' || option.id === 'Consumer (Unregistered)')
  ) {
    return true;
  }
  return false;
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  if (
    triggerRef.value && !triggerRef.value.contains(target) &&
    popoverRef.value && !popoverRef.value.contains(target)
  ) {
    isOpen.value = false;
  }
};

const closeAll = () => {
  isOpen.value = false;
};

onMounted(() => {
  window.addEventListener('click', handleClickOutside);
  window.addEventListener('scroll', updatePosition, true);
  window.addEventListener('resize', updatePosition);
  window.addEventListener('close-all-selects', closeAll);
  window.addEventListener('close-all-date-pickers', closeAll);
});

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside);
  window.removeEventListener('scroll', updatePosition, true);
  window.removeEventListener('resize', updatePosition);
  window.removeEventListener('close-all-selects', closeAll);
  window.removeEventListener('close-all-date-pickers', closeAll);
});

const selectedOption = computed(() => {
  const val = props.modelValue;
  const isVendor = props.context === 'vendor';

  if (val === 'Unregistered' || val === 'Consumer (Unregistered)' || val === 'Unregistered Business') {
    return {
      id: isVendor ? 'Unregistered' : 'Consumer (Unregistered)',
      name: isVendor ? 'Unregistered' : 'Consumer (Unregistered)',
      description: isVendor
        ? 'Business or entity not registered under GST'
        : 'Individual consumer or business not registered under GST',
    };
  }

  return (
    options.value.find((opt) => opt.id === val) || {
      id: val || (isVendor ? 'Unregistered' : 'Consumer (Unregistered)'),
      name: val || (isVendor ? 'Unregistered' : 'Consumer (Unregistered)'),
      description: '',
    }
  );
});

const filteredOptions = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return options.value;
  return options.value.filter(
    (opt) =>
      opt.name.toLowerCase().includes(query) ||
      opt.description.toLowerCase().includes(query)
  );
});
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
      :class="
        cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent dark:bg-input/30 px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
          !modelValue && 'text-muted-foreground',
          Boolean(props.error) && 'border-destructive focus-visible:ring-destructive/50',
          props.class
        )
      "
    >
      <span class="truncate text-left">
        {{ selectedOption ? selectedOption.name : 'Select GST registration status' }}
      </span>
      <ChevronDown
        :class="
          cn(
            'h-4 w-4 shrink-0 text-muted-foreground opacity-50 transition-transform duration-200 ml-2',
            isOpen && 'rotate-180'
          )
        "
      />
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
              placeholder="Search status..."
              class="h-8 w-full rounded-sm border border-input bg-transparent dark:bg-input/30 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <!-- Options list -->
        <div class="max-h-56 overflow-y-auto py-1 space-y-0.5 custom-scrollbar flex-1">
          <div
            v-for="option in filteredOptions"
            :key="option.id"
            @click="selectOption(option)"
            role="option"
            :aria-selected="isOptionSelected(option)"
            :class="
              cn(
                'relative flex w-full cursor-pointer select-none flex-col gap-0.5 rounded-sm py-2 pl-8 pr-2 text-left outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
                isOptionSelected(option) && 'font-medium'
              )
            "
          >
            <span
              v-if="isOptionSelected(option)"
              class="absolute left-2 top-2.5 flex h-3.5 w-3.5 items-center justify-center text-foreground"
            >
              <Check class="h-4 w-4" />
            </span>
            <span class="text-sm leading-tight text-foreground">{{ option.name }}</span>
            <span class="text-xs text-muted-foreground leading-normal line-clamp-2">{{ option.description }}</span>
          </div>
          <div v-if="filteredOptions.length === 0" class="py-4 text-center text-xs text-muted-foreground italic">
            No options found
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}
</style>

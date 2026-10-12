<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import {
  useCustomFieldStore,
  type CustomField,
  type CustomFieldDataType,
} from '@/stores/customFieldStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Select from '@/components/ui/Select.vue';
import { Asterisk, SlidersHorizontal } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    entity: string;
    modelValue?: Record<string, any> | Array<{ customFieldId: string; value: any; id?: string }>;
    errors?: Record<string, string>;
    readonly?: boolean;
    title?: string;
    showTitle?: boolean;
  }>(),
  {
    modelValue: () => ({}),
    errors: () => ({}),
    readonly: false,
    title: 'Custom Fields',
    showTitle: true,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void;
}>();

const customFieldStore = useCustomFieldStore();

onMounted(async () => {
  await customFieldStore.fetchCustomFields();
});

const fields = computed<CustomField[]>(() => {
  return customFieldStore.getFieldsForEntity(props.entity);
});

// Normalize modelValue into a dictionary { [fieldId]: value }
const localValues = computed(() => {
  const result: Record<string, any> = {};

  if (Array.isArray(props.modelValue)) {
    for (const item of props.modelValue) {
      const key = item.customFieldId || item.id;
      if (key) {
        result[key] = item.value;
      }
    }
  } else if (props.modelValue && typeof props.modelValue === 'object') {
    Object.assign(result, props.modelValue);
  }

  return result;
});

const updateFieldValue = (fieldId: string, value: any) => {
  const next = { ...localValues.value, [fieldId]: value };
  emit('update:modelValue', next);
};

const getDropdownOptions = (field: CustomField) => {
  if (!field.options || !Array.isArray(field.options)) return [];
  return field.options.map((opt) => ({
    id: opt,
    name: opt,
  }));
};
</script>

<template>
  <div v-if="fields.length > 0" class="space-y-4 pt-2">
    <!-- Header / Divider -->
    <div v-if="showTitle" class="flex items-center gap-2 pb-1 border-b border-border">
      <div class="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-foreground">
        <SlidersHorizontal class="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <h4 class="text-xs md:text-sm font-semibold text-foreground">
        {{ title }}
      </h4>
      <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
        {{ fields.length }}
      </span>
    </div>

    <!-- Inputs Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="field in fields"
        :key="field.id"
        :class="[
          'space-y-1.5',
          field.dataType === 'checkbox' ? 'flex flex-row items-center justify-between gap-3 p-3 rounded-md border border-border bg-card' : ''
        ]"
      >
        <!-- Label for non-checkbox -->
        <Label
          v-if="field.dataType !== 'checkbox'"
          :for="`cf-${field.id}`"
          class="text-xs font-medium text-foreground flex items-center gap-1"
        >
          <span>{{ field.name }}</span>
          <Asterisk v-if="field.isRequired" class="w-3 h-3 text-destructive" />
        </Label>

        <!-- TEXT Field -->
        <Input
          v-if="field.dataType === 'text'"
          :id="`cf-${field.id}`"
          :model-value="localValues[field.id] ?? ''"
          @update:model-value="updateFieldValue(field.id, $event)"
          :placeholder="field.placeholder || `Enter ${field.name.toLowerCase()}`"
          :disabled="readonly"
          :error="errors[field.id]"
          class="h-9 text-xs"
        />

        <!-- NUMBER Field -->
        <Input
          v-else-if="field.dataType === 'number'"
          :id="`cf-${field.id}`"
          type="number"
          :model-value="localValues[field.id] ?? ''"
          @update:model-value="updateFieldValue(field.id, $event === '' ? null : Number($event))"
          :placeholder="field.placeholder || '0'"
          :disabled="readonly"
          :error="errors[field.id]"
          class="h-9 text-xs"
        />

        <!-- DATE Field -->
        <Input
          v-else-if="field.dataType === 'date'"
          :id="`cf-${field.id}`"
          type="date"
          :model-value="localValues[field.id] ?? ''"
          @update:model-value="updateFieldValue(field.id, $event)"
          :disabled="readonly"
          :error="errors[field.id]"
          class="h-9 text-xs"
        />

        <!-- DROPDOWN Field -->
        <Select
          v-else-if="field.dataType === 'dropdown'"
          :id="`cf-${field.id}`"
          :model-value="localValues[field.id] ?? ''"
          @update:model-value="updateFieldValue(field.id, $event)"
          :options="getDropdownOptions(field)"
          :placeholder="field.placeholder || `Select ${field.name.toLowerCase()}`"
          :disabled="readonly"
          class="w-full text-xs"
        />

        <!-- CHECKBOX Field -->
        <template v-else-if="field.dataType === 'checkbox'">
          <div class="space-y-0.5">
            <Label :for="`cf-${field.id}`" class="text-xs font-medium text-foreground flex items-center gap-1 cursor-pointer">
              <span>{{ field.name }}</span>
              <Asterisk v-if="field.isRequired" class="w-3 h-3 text-destructive" />
            </Label>
            <p v-if="field.placeholder" class="text-[10px] text-muted-foreground">
              {{ field.placeholder }}
            </p>
          </div>
          <Switch
            :id="`cf-${field.id}`"
            :checked="Boolean(localValues[field.id])"
            @update:checked="updateFieldValue(field.id, $event)"
            :disabled="readonly"
            class="data-[state=checked]:bg-primary cursor-pointer shrink-0"
          />
        </template>

        <!-- Error feedback -->
        <p v-if="errors[field.id]" class="text-xs text-destructive font-medium">
          {{ errors[field.id] }}
        </p>
      </div>
    </div>
  </div>
</template>


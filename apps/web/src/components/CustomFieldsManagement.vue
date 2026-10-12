<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  SlidersHorizontal,
  Plus,
  Search,
  Type,
  Hash,
  Calendar,
  ListFilter,
  CheckSquare2,
  Printer,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  FileText,
  Building2,
  Users,
  Check,
  MoreHorizontal,
  RotateCcw,
  Receipt,
  FileSpreadsheet,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'vue-sonner';
import { useAuthStore } from '@/stores/authStore';
import PlanUpgradeCard from '@/components/ui/PlanUpgradeCard.vue';
import UpgradePlanModal from '@/components/UpgradePlanModal.vue';
import {
  useCustomFieldStore,
  type CustomField,
  type CustomFieldDataType,
} from '@/stores/customFieldStore';

const authStore = useAuthStore();
const customFieldStore = useCustomFieldStore();

const searchQuery = ref('');
const selectedCategory = ref<'all' | 'sales' | 'purchases' | 'contacts'>('all');
const selectedStatusFilter = ref<'all' | 'active' | 'inactive'>('all');

watch(
  () => authStore.currentOrganization?.id,
  async (newId) => {
    if (newId) {
      await customFieldStore.fetchCustomFields(true);
    }
  },
);

onMounted(async () => {
  await customFieldStore.fetchCustomFields(true);
});

import { isFeatureEnabled, type FeatureFlags } from '@/config/features';

// Entity Options Configuration
interface EntityOption {
  id: string;
  label: string;
  category: 'sales' | 'purchases' | 'contacts';
  icon: any;
}

const entityFeatureMap: Record<string, keyof FeatureFlags> = {
  invoice: 'invoices',
  estimate: 'estimates',
  credit_note: 'creditNotes',
  bill: 'bills',
  expense: 'expenses',
  customer: 'customers',
  vendor: 'vendors',
};

const allEntityOptions: EntityOption[] = [
  { id: 'invoice', label: 'Invoices', category: 'sales', icon: FileText },
  { id: 'estimate', label: 'Estimates', category: 'sales', icon: FileSpreadsheet },
  { id: 'credit_note', label: 'Credit Notes', category: 'sales', icon: Receipt },
  { id: 'bill', label: 'Bills', category: 'purchases', icon: FileText },
  { id: 'expense', label: 'Expenses', category: 'purchases', icon: Receipt },
  { id: 'customer', label: 'Customers', category: 'contacts', icon: Users },
  { id: 'vendor', label: 'Vendors', category: 'contacts', icon: Building2 },
];

const entityOptions = computed(() => {
  return allEntityOptions.filter((opt) => {
    const feat = entityFeatureMap[opt.id];
    return !feat || isFeatureEnabled(feat);
  });
});

const allCategoryTabs = [
  { id: 'all', label: 'All Fields' },
  { id: 'sales', label: 'Sales' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'contacts', label: 'Contacts' },
] as const;

const categoryTabs = computed(() => {
  return allCategoryTabs.filter((tab) => {
    if (tab.id === 'all') return true;
    return entityOptions.value.some((e) => e.category === tab.id);
  });
});

const salesEntityIds = ['invoice', 'estimate', 'credit_note'];
const purchasesEntityIds = ['bill', 'expense'];
const contactsEntityIds = ['customer', 'vendor'];

const categoryCounts = computed(() => {
  const fields = customFieldStore.fields || [];
  const enabledSales = salesEntityIds.filter(id => !entityFeatureMap[id] || isFeatureEnabled(entityFeatureMap[id]));
  const enabledPurchases = purchasesEntityIds.filter(id => !entityFeatureMap[id] || isFeatureEnabled(entityFeatureMap[id]));
  const enabledContacts = contactsEntityIds.filter(id => !entityFeatureMap[id] || isFeatureEnabled(entityFeatureMap[id]));

  return {
    all: fields.length,
    sales: fields.filter((f) => (f.entities || []).some((e) => enabledSales.includes(e))).length,
    purchases: fields.filter((f) => (f.entities || []).some((e) => enabledPurchases.includes(e))).length,
    contacts: fields.filter((f) => (f.entities || []).some((e) => enabledContacts.includes(e))).length,
  };
});

// Data Type Definitions
const dataTypeOptions: {
  id: CustomFieldDataType;
  label: string;
  description: string;
  icon: any;
}[] = [
  { id: 'text', label: 'Text', description: 'Single line text, notes', icon: Type },
  { id: 'number', label: 'Number', description: 'Numeric values, counters', icon: Hash },
  { id: 'date', label: 'Date', description: 'Calendar date picker', icon: Calendar },
  { id: 'dropdown', label: 'Dropdown', description: 'List of options', icon: ListFilter },
  { id: 'checkbox', label: 'Checkbox', description: 'Yes / No binary toggle', icon: CheckSquare2 },
];

// Filtered Fields List
const filteredFields = computed(() => {
  const fields = customFieldStore.fields || [];
  return fields.filter((field) => {
    const q = searchQuery.value.trim().toLowerCase();
    const fieldEntities = Array.isArray(field.entities) ? field.entities : [];

    const matchesSearch =
      !q ||
      (field.name || '').toLowerCase().includes(q) ||
      (field.dataType || '').toLowerCase().includes(q) ||
      (field.placeholder && field.placeholder.toLowerCase().includes(q));

    let matchesCategory = true;
    if (selectedCategory.value === 'sales') {
      matchesCategory = fieldEntities.some((e) => salesEntityIds.includes(e));
    } else if (selectedCategory.value === 'purchases') {
      matchesCategory = fieldEntities.some((e) => purchasesEntityIds.includes(e));
    } else if (selectedCategory.value === 'contacts') {
      matchesCategory = fieldEntities.some((e) => contactsEntityIds.includes(e));
    }

    const matchesStatus =
      selectedStatusFilter.value === 'all' ||
      (selectedStatusFilter.value === 'active' && field.isActive) ||
      (selectedStatusFilter.value === 'inactive' && !field.isActive);

    return matchesSearch && matchesCategory && matchesStatus;
  });
});

const hasActiveFilters = computed(() => {
  return !!searchQuery.value || selectedCategory.value !== 'all' || selectedStatusFilter.value !== 'all';
});

const clearFilters = () => {
  searchQuery.value = '';
  selectedCategory.value = 'all';
  selectedStatusFilter.value = 'all';
};

// Modal State for Add / Edit
const isModalOpen = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const isSubmitting = ref(false);
const customFieldPlanError = ref<string | null>(null);
const isUpgradeModalOpen = ref(false);

const form = ref<{
  name: string;
  dataType: CustomFieldDataType;
  options: string[];
  newOptionInput: string;
  entities: string[];
  printOnDocument: boolean;
  isRequired: boolean;
  isActive: boolean;
  placeholder: string;
}>({
  name: '',
  dataType: 'text',
  options: [],
  newOptionInput: '',
  entities: ['invoice'],
  printOnDocument: false,
  isRequired: false,
  isActive: true,
  placeholder: '',
});

const formErrors = ref<Record<string, string>>({});

const resetForm = () => {
  form.value = {
    name: '',
    dataType: 'text',
    options: [],
    newOptionInput: '',
    entities: ['invoice'],
    printOnDocument: false,
    isRequired: false,
    isActive: true,
    placeholder: '',
  };
  formErrors.value = {};
  isEditing.value = false;
  editingId.value = null;
};

const openCreateModal = () => {
  resetForm();
  isModalOpen.value = true;
};

const openEditModal = (field: CustomField) => {
  resetForm();
  isEditing.value = true;
  editingId.value = field.id;
  form.value = {
    name: field.name,
    dataType: field.dataType,
    options: field.options ? [...field.options] : [],
    newOptionInput: '',
    entities: [...field.entities],
    printOnDocument: field.printOnDocument,
    isRequired: field.isRequired,
    isActive: field.isActive,
    placeholder: field.placeholder || '',
  };
  isModalOpen.value = true;
};

// Dropdown Option Helpers
const addOption = () => {
  const val = form.value.newOptionInput.trim();
  if (!val) return;
  if (form.value.options.includes(val)) {
    toast.error(`"${val}" already exists in options list`);
    return;
  }
  form.value.options.push(val);
  form.value.newOptionInput = '';
  if (formErrors.value.options) {
    delete formErrors.value.options;
  }
};

const removeOption = (index: number) => {
  form.value.options.splice(index, 1);
};

// Form Entities Helpers
const toggleEntity = (entityId: string) => {
  const index = form.value.entities.indexOf(entityId);
  if (index === -1) {
    form.value.entities.push(entityId);
  } else {
    if (form.value.entities.length > 1) {
      form.value.entities.splice(index, 1);
    } else {
      toast.error('Field must be assigned to at least one module');
    }
  }
  if (formErrors.value.entities) {
    delete formErrors.value.entities;
  }
};

const selectAllEntities = () => {
  if (form.value.entities.length === entityOptions.value.length) {
    form.value.entities = ['invoice'];
  } else {
    form.value.entities = entityOptions.value.map((e) => e.id);
  }
  if (formErrors.value.entities) {
    delete formErrors.value.entities;
  }
};

// Form Validation & Submit
const validateForm = () => {
  formErrors.value = {};

  if (!form.value.name.trim()) {
    formErrors.value.name = 'Field name is required';
  }

  if (form.value.dataType === 'dropdown' && form.value.options.length === 0) {
    formErrors.value.options = 'At least one dropdown option is required';
  }

  if (form.value.entities.length === 0) {
    formErrors.value.entities = 'Please select at least one applicable module';
  }

  return Object.keys(formErrors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  isSubmitting.value = true;
  try {
    const payload = {
      name: form.value.name.trim(),
      dataType: form.value.dataType,
      options: form.value.dataType === 'dropdown' ? form.value.options : null,
      entities: form.value.entities,
      printOnDocument: form.value.printOnDocument,
      isRequired: form.value.isRequired,
      isActive: form.value.isActive,
      placeholder: (form.value.placeholder || '').trim() || null,
    };

    if (isEditing.value && editingId.value) {
      await customFieldStore.updateCustomField(editingId.value, payload);
      toast.success(`Custom field "${payload.name}" updated successfully`);
    } else {
      await customFieldStore.createCustomField(payload);
      toast.success(`Custom field "${payload.name}" created successfully`);
    }

    isModalOpen.value = false;
    resetForm();
    customFieldPlanError.value = null;
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.error ||
      (isEditing.value ? 'Failed to update custom field' : 'Failed to create custom field');
    const isPlanLimit = err.response?.status === 403 && (err.response?.data?.code === 'PLAN_UPGRADE_REQUIRED' || errorMsg.toLowerCase().includes('upgrade') || errorMsg.toLowerCase().includes('plan') || errorMsg.toLowerCase().includes('professional'));

    if (isPlanLimit) {
      customFieldPlanError.value = errorMsg;
      isUpgradeModalOpen.value = true;
    } else {
      customFieldPlanError.value = null;
      toast.error(errorMsg);
    }
  } finally {
    isSubmitting.value = false;
  }
};

// Toggle active state directly from table
const handleToggleActive = async (field: CustomField) => {
  const previousState = field.isActive;
  try {
    await customFieldStore.toggleCustomField(field.id);
    toast.success(`Field "${field.name}" is now ${!previousState ? 'active' : 'inactive'}`);
  } catch (err: any) {
    field.isActive = previousState;
    toast.error('Failed to change field status');
  }
};

// Delete Confirmation
const isDeleteModalOpen = ref(false);
const fieldToDelete = ref<CustomField | null>(null);
const isDeleting = ref(false);

const confirmDelete = (field: CustomField) => {
  fieldToDelete.value = field;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!fieldToDelete.value) return;

  isDeleting.value = true;
  try {
    await customFieldStore.deleteCustomField(fieldToDelete.value.id);
    toast.success(`Custom field "${fieldToDelete.value.name}" deleted`);
    isDeleteModalOpen.value = false;
    fieldToDelete.value = null;
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to delete custom field');
  } finally {
    isDeleting.value = false;
  }
};

const getEntityLabel = (entityId: string) => {
  return allEntityOptions.find((e) => e.id === entityId)?.label || entityId;
};

const getDataTypeIcon = (dataType: CustomFieldDataType) => {
  return dataTypeOptions.find((t) => t.id === dataType)?.icon || Type;
};

const getDataTypeBadgeVariant = (dataType: CustomFieldDataType): 'default' | 'secondary' | 'outline' | 'info' | 'success' => {
  switch (dataType) {
    case 'text':
      return 'secondary';
    case 'number':
      return 'default';
    case 'date':
      return 'outline';
    case 'dropdown':
      return 'info';
    case 'checkbox':
      return 'success';
    default:
      return 'outline';
  }
};
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h3 class="text-base font-semibold text-foreground tracking-tight">Custom Fields</h3>
          <Badge variant="secondary" class="text-xs font-mono font-medium">
            {{ customFieldStore.fields.length }} {{ customFieldStore.fields.length === 1 ? 'field' : 'fields' }}
          </Badge>
        </div>
        <p class="text-xs text-muted-foreground">
          Define custom data attributes for your invoices, bills, expenses, and contacts.
        </p>
      </div>

      <Button
        type="button"
        @click="openCreateModal"
        class="gap-1.5 shadow-xs cursor-pointer shrink-0"
      >
        <Plus class="w-4 h-4" />
        <span>New Custom Field</span>
      </Button>
    </div>

    <!-- Main Card with Streamlined Toolbar & Table -->
    <Card class="border-border/60 shadow-xs overflow-hidden py-0 gap-0">
      <!-- Sleek Single-Row Toolbar -->
      <div class="p-3.5 border-b border-border/60 bg-muted/15 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <!-- Category Tabs -->
        <div class="flex items-center gap-1 bg-muted/70 p-1 rounded-lg border border-border/60 overflow-x-auto shrink-0">
          <button
            v-for="cat in categoryTabs"
            :key="cat.id"
            type="button"
            @click="selectedCategory = cat.id"
            :class="[
              'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer shrink-0',
              selectedCategory === cat.id
                ? 'bg-background text-foreground shadow-2xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            ]"
          >
            <span>{{ cat.label }}</span>
            <span
              :class="[
                'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal',
                selectedCategory === cat.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-muted text-muted-foreground'
              ]"
            >
              {{ categoryCounts[cat.id] }}
            </span>
          </button>
        </div>

        <!-- Status Filter & Search -->
        <div class="flex flex-1 flex-wrap items-center justify-start md:justify-end gap-2">
          <!-- Status Segmented Control -->
          <div class="flex items-center gap-1 bg-muted/70 p-1 rounded-lg border border-border/60 shrink-0">
            <button
              v-for="st in [
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'inactive', label: 'Inactive' },
              ]"
              :key="st.id"
              type="button"
              @click="selectedStatusFilter = st.id as any"
              :class="[
                'px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer shrink-0',
                selectedStatusFilter === st.id
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              {{ st.label }}
            </button>
          </div>

          <!-- Search Bar -->
          <div class="relative w-full sm:w-48">
            <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              v-model="searchQuery"
              placeholder="Search fields..."
              class="pl-8 pr-7 h-8 text-xs bg-background shadow-none"
            />
            <button
              v-if="searchQuery"
              type="button"
              @click="searchQuery = ''"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X class="w-3 h-3" />
            </button>
          </div>

          <!-- Reset Filter Button -->
          <Button
            v-if="hasActiveFilters"
            type="button"
            variant="ghost"
            size="sm"
            @click="clearFilters"
            class="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer shrink-0"
          >
            <RotateCcw class="w-3 h-3" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      <!-- Content Area -->
      <CardContent class="p-0">
        <!-- Loading State -->
        <div
          v-if="customFieldStore.loading && customFieldStore.fields.length === 0"
          class="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground"
        >
          <Loader2 class="w-7 h-7 animate-spin text-primary" />
          <p class="text-xs font-medium">Loading custom fields...</p>
        </div>

        <!-- Empty State: Zero Fields Configured -->
        <div
          v-else-if="customFieldStore.fields.length === 0"
          class="p-16 text-center space-y-4"
        >
          <div class="w-12 h-12 bg-primary/10 text-primary border border-primary/20 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
            <SlidersHorizontal class="w-6 h-6" />
          </div>
          <div class="space-y-1.5 max-w-sm mx-auto">
            <h4 class="text-sm font-semibold text-foreground">No Custom Fields Yet</h4>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Create custom fields to track additional attributes like purchase order numbers, project codes, salesperson references, or custom delivery dates.
            </p>
          </div>
          <Button
            type="button"
            @click="openCreateModal"
            class="gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus class="w-4 h-4" />
            <span>Create Your First Custom Field</span>
          </Button>
        </div>

        <!-- Empty State: No search/filter matches -->
        <div
          v-else-if="filteredFields.length === 0"
          class="p-12 text-center space-y-3"
        >
          <div class="w-10 h-10 bg-muted/60 border border-border/60 rounded-xl flex items-center justify-center mx-auto text-muted-foreground">
            <Search class="w-4 h-4" />
          </div>
          <div class="space-y-1">
            <h4 class="text-sm font-semibold text-foreground">No matching fields found</h4>
            <p class="text-xs text-muted-foreground">
              Try adjusting your search terms or clearing active filters.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="clearFilters"
            class="gap-1.5 cursor-pointer"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Clear Filters</span>
          </Button>
        </div>

        <!-- Data Table -->
        <div v-else class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow class="hover:bg-transparent bg-muted/20 border-b border-border/60">
                <TableHead class="w-[280px] text-xs font-semibold text-foreground">Field</TableHead>
                <TableHead class="w-[120px] text-xs font-semibold text-foreground">Type</TableHead>
                <TableHead class="text-xs font-semibold text-foreground">Applies To</TableHead>
                <TableHead class="w-[160px] text-xs font-semibold text-foreground">Properties</TableHead>
                <TableHead class="w-[120px] text-xs font-semibold text-foreground">Status</TableHead>
                <TableHead class="w-[70px] text-right text-xs font-semibold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="field in filteredFields"
                :key="field.id"
                class="hover:bg-muted/30 transition-colors group"
              >
                <!-- Field Name & Hint -->
                <TableCell class="py-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0 group-hover:text-primary group-hover:border-primary/40 transition-colors">
                      <component :is="getDataTypeIcon(field.dataType)" class="w-4 h-4" />
                    </div>
                    <div class="min-w-0 flex-1 space-y-0.5">
                      <div class="font-medium text-xs text-foreground truncate flex items-center gap-1.5">
                        <span>{{ field.name }}</span>
                        <span
                          v-if="field.isRequired"
                          class="text-destructive text-xs font-bold"
                          title="Required field"
                        >
                          *
                        </span>
                      </div>
                      <p v-if="field.placeholder" class="text-[11px] text-muted-foreground truncate">
                        Hint: "{{ field.placeholder }}"
                      </p>
                      <p v-else class="text-[11px] text-muted-foreground/60 italic">
                        No placeholder
                      </p>
                    </div>
                  </div>
                </TableCell>

                <!-- Data Type Badge -->
                <TableCell class="py-3">
                  <div class="flex items-center gap-1.5">
                    <Badge :variant="getDataTypeBadgeVariant(field.dataType)" size="sm" class="capitalize">
                      {{ field.dataType }}
                    </Badge>
                    <span
                      v-if="field.dataType === 'dropdown' && field.options?.length"
                      class="text-[11px] text-muted-foreground font-mono"
                      :title="`${field.options.length} options: ${field.options.join(', ')}`"
                    >
                      ({{ field.options.length }})
                    </span>
                  </div>
                </TableCell>

                <!-- Applies To Modules -->
                <TableCell class="py-3">
                  <div class="flex flex-wrap items-center gap-1.5 max-w-xs">
                    <Badge
                      v-for="entity in (field.entities || []).slice(0, 3)"
                      :key="entity"
                      variant="secondary"
                      size="sm"
                    >
                      {{ getEntityLabel(entity) }}
                    </Badge>
                    <Badge
                      v-if="(field.entities || []).length > 3"
                      variant="outline"
                      size="sm"
                      class="text-muted-foreground"
                      :title="(field.entities || []).slice(3).map(getEntityLabel).join(', ')"
                    >
                      +{{ (field.entities || []).length - 3 }} more
                    </Badge>
                  </div>
                </TableCell>

                <!-- Properties Badges -->
                <TableCell class="py-3">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <Badge
                      v-if="field.isRequired"
                      variant="danger"
                      size="sm"
                    >
                      Required
                    </Badge>
                    <Badge
                      v-if="field.printOnDocument"
                      variant="warning"
                      size="sm"
                      class="gap-1"
                      title="Prints on customer-facing invoice and estimate PDFs"
                    >
                      <Printer class="w-3 h-3" />
                      <span>PDF</span>
                    </Badge>
                    <span
                      v-if="!field.isRequired && !field.printOnDocument"
                      class="text-xs text-muted-foreground/60"
                    >
                      Optional
                    </span>
                  </div>
                </TableCell>

                <!-- Status Switch -->
                <TableCell class="py-3">
                  <div class="flex items-center gap-2">
                    <Switch
                      :checked="field.isActive"
                      @update:checked="handleToggleActive(field)"
                      class="cursor-pointer scale-90 data-[state=checked]:bg-primary"
                    />
                    <span
                      :class="[
                        'text-xs font-medium transition-colors',
                        field.isActive ? 'text-foreground' : 'text-muted-foreground/70'
                      ]"
                    >
                      {{ field.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                </TableCell>

                <!-- Row Actions (Cleaned up, no redundant Activate toggle) -->
                <TableCell class="py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Actions"
                      >
                        <MoreHorizontal class="w-4 h-4" />
                        <span class="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-36">
                      <DropdownMenuItem
                        @click="openEditModal(field)"
                        class="gap-2 cursor-pointer text-xs"
                      >
                        <Edit2 class="w-3.5 h-3.5" />
                        <span>Edit Field</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        @click="confirmDelete(field)"
                        class="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                        <span>Delete Field</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Create / Edit Custom Field Dialog -->
    <Dialog :open="isModalOpen" @update:open="isModalOpen = $event">
      <DialogContent class="max-w-lg p-6 gap-5">
        <DialogHeader class="space-y-1.5 text-left border-b border-border/60 pb-3">
          <DialogTitle class="text-base font-semibold text-foreground">
            {{ isEditing ? 'Edit Custom Field' : 'New Custom Field' }}
          </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            Configure field properties, choose data type, and assign to forms.
          </DialogDescription>
        </DialogHeader>

        <!-- Form Body -->
        <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
          <!-- Plan Limit Upgrade Card -->
          <PlanUpgradeCard
            v-if="customFieldPlanError"
            title="Custom Fields Require Professional"
            :description="customFieldPlanError"
            :dismissible="true"
            @dismiss="customFieldPlanError = null"
          />

          <!-- 1. Name & Placeholder Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label for="fieldName" class="text-xs font-medium text-foreground flex items-center gap-1">
                <span>Field Name</span>
                <span class="text-destructive">*</span>
              </Label>
              <Input
                id="fieldName"
                v-model="form.name"
                placeholder="e.g. Purchase Order #"
                class="h-9 text-xs"
                :class="{ 'border-destructive focus-visible:ring-destructive': formErrors.name }"
              />
              <p v-if="formErrors.name" class="text-[11px] text-destructive font-medium">
                {{ formErrors.name }}
              </p>
            </div>

            <div v-if="form.dataType !== 'checkbox'" class="space-y-1.5">
              <Label for="placeholder" class="text-xs font-medium text-muted-foreground">
                Hint / Placeholder <span class="text-[10px] font-normal">(Optional)</span>
              </Label>
              <Input
                id="placeholder"
                v-model="form.placeholder"
                placeholder="e.g. Enter PO number..."
                class="h-9 text-xs"
              />
            </div>
          </div>

          <!-- 2. Data Type Selection -->
          <div class="space-y-1.5">
            <Label class="text-xs font-medium text-foreground flex items-center gap-1">
              <span>Data Type</span>
              <span class="text-destructive">*</span>
            </Label>

            <div class="grid grid-cols-5 gap-1.5">
              <button
                v-for="opt in dataTypeOptions"
                :key="opt.id"
                type="button"
                @click="form.dataType = opt.id"
                :class="[
                  'p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 group',
                  form.dataType === opt.id
                    ? 'border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30 shadow-2xs'
                    : 'border-border/70 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                ]"
              >
                <component
                  :is="opt.icon"
                  class="w-4 h-4"
                  :class="form.dataType === opt.id ? 'text-primary' : 'text-muted-foreground'"
                />
                <span class="text-[11px] font-semibold block leading-tight">{{ opt.label }}</span>
              </button>
            </div>
          </div>

          <!-- 3. Dropdown Options Builder (If dataType === 'dropdown') -->
          <div
            v-if="form.dataType === 'dropdown'"
            class="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2.5"
          >
            <div class="flex items-center justify-between">
              <Label class="text-xs font-medium text-foreground flex items-center gap-1.5">
                <ListFilter class="w-3.5 h-3.5 text-primary" />
                <span>Dropdown Options</span>
                <span class="text-destructive">*</span>
              </Label>
              <span class="text-[10px] text-muted-foreground">Press Enter or click Add</span>
            </div>

            <div class="flex gap-2">
              <Input
                v-model="form.newOptionInput"
                @keydown.enter.prevent="addOption"
                placeholder="Type option name..."
                class="h-8 text-xs bg-background"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                @click="addOption"
                class="h-8 px-3 text-xs gap-1 shrink-0 cursor-pointer"
              >
                <Plus class="w-3 h-3" />
                <span>Add</span>
              </Button>
            </div>

            <p v-if="formErrors.options" class="text-[11px] text-destructive font-medium">
              {{ formErrors.options }}
            </p>

            <!-- Option Chips -->
            <div v-if="form.options.length > 0" class="flex flex-wrap gap-1.5 pt-0.5">
              <div
                v-for="(option, idx) in form.options"
                :key="idx"
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-background border border-border/80 text-foreground shadow-2xs"
              >
                <span>{{ option }}</span>
                <button
                  type="button"
                  @click="removeOption(idx)"
                  class="text-muted-foreground hover:text-destructive p-0.5 rounded cursor-pointer"
                  title="Remove option"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>
            <p v-else class="text-[11px] text-muted-foreground italic">
              No options added yet.
            </p>
          </div>

          <!-- 4. Applicable Modules -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <Label class="text-xs font-medium text-foreground flex items-center gap-1">
                <span>Applicable Modules</span>
                <span class="text-destructive">*</span>
              </Label>
              <button
                type="button"
                @click="selectAllEntities"
                class="text-[11px] font-medium text-primary hover:underline cursor-pointer"
              >
                {{ form.entities.length === entityOptions.length ? 'Reset Selection' : 'Select All' }}
              </button>
            </div>

            <!-- Categorized Quick Selector -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                v-for="opt in entityOptions"
                :key="opt.id"
                type="button"
                @click="toggleEntity(opt.id)"
                :class="[
                  'p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-1.5 text-left',
                  form.entities.includes(opt.id)
                    ? 'border-primary bg-primary/10 font-medium text-primary shadow-2xs ring-1 ring-primary/30'
                    : 'border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40'
                ]"
              >
                <div class="flex items-center gap-1.5 min-w-0">
                  <component :is="opt.icon" class="w-3.5 h-3.5 shrink-0" />
                  <span class="text-xs truncate">{{ opt.label }}</span>
                </div>
                <div
                  v-if="form.entities.includes(opt.id)"
                  class="size-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
                >
                  <Check class="w-2 h-2" />
                </div>
              </button>
            </div>

            <p v-if="formErrors.entities" class="text-[11px] text-destructive font-medium mt-1">
              {{ formErrors.entities }}
            </p>
          </div>

          <!-- 5. Streamlined Compact Properties Toggles -->
          <div class="rounded-lg border border-border/70 bg-muted/15 p-3 space-y-2.5">
            <div class="flex items-center justify-between gap-3">
              <div class="space-y-0.5">
                <span class="text-xs font-medium text-foreground">Mandatory Field</span>
                <p class="text-[10px] text-muted-foreground">Requires a value before saving documents</p>
              </div>
              <Switch
                v-model:checked="form.isRequired"
                class="cursor-pointer shrink-0 data-[state=checked]:bg-primary"
              />
            </div>

            <div class="border-t border-border/40 pt-2.5 flex items-center justify-between gap-3">
              <div class="space-y-0.5">
                <div class="flex items-center gap-1.5">
                  <Printer class="w-3 h-3 text-muted-foreground" />
                  <span class="text-xs font-medium text-foreground">Print on PDF</span>
                </div>
                <p class="text-[10px] text-muted-foreground">Show on invoice & estimate PDF prints</p>
              </div>
              <Switch
                v-model:checked="form.printOnDocument"
                class="cursor-pointer shrink-0 data-[state=checked]:bg-primary"
              />
            </div>

            <div class="border-t border-border/40 pt-2.5 flex items-center justify-between gap-3">
              <div class="space-y-0.5">
                <span class="text-xs font-medium text-foreground">Active Status</span>
                <p class="text-[10px] text-muted-foreground">Enable this field for immediate use</p>
              </div>
              <Switch
                v-model:checked="form.isActive"
                class="cursor-pointer shrink-0 data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </div>

        <DialogFooter class="border-t border-border/60 pt-3 flex sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            @click="isModalOpen = false"
            :disabled="isSubmitting"
            class="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            @click="handleSubmit"
            :disabled="isSubmitting"
            class="gap-1.5 cursor-pointer"
          >
            <Loader2 v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin" />
            <Check v-else class="w-3.5 h-3.5" />
            <span>{{ isEditing ? 'Update Field' : 'Save Field' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog :open="isDeleteModalOpen" @update:open="isDeleteModalOpen = $event">
      <DialogContent class="sm:max-w-md p-6 gap-4">
        <DialogHeader class="flex flex-col items-center text-center space-y-2">
          <div class="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shrink-0 mb-1">
            <AlertTriangle class="size-5" />
          </div>
          <DialogTitle class="text-base font-semibold text-foreground">
            Delete Custom Field
          </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            Are you sure you want to delete <span class="font-semibold text-foreground">"{{ fieldToDelete?.name }}"</span>?
          </DialogDescription>
        </DialogHeader>

        <div class="p-3.5 rounded-lg bg-destructive/5 border border-destructive/15 flex items-start gap-3">
          <AlertTriangle class="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p class="text-xs text-destructive/90 leading-relaxed">
            This action cannot be undone. Saved values on existing documents will no longer be visible.
          </p>
        </div>

        <DialogFooter class="flex sm:justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            @click="isDeleteModalOpen = false"
            :disabled="isDeleting"
            class="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            @click="handleDelete"
            :disabled="isDeleting"
            class="gap-1.5 cursor-pointer"
          >
            <Loader2 v-if="isDeleting" class="w-3.5 h-3.5 animate-spin" />
            <Trash2 v-else class="w-3.5 h-3.5" />
            <span>{{ isDeleting ? 'Deleting...' : 'Delete Field' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <UpgradePlanModal
      v-model:open="isUpgradeModalOpen"
      feature="custom_fields"
      title="Custom Fields Require Professional"
      :description="customFieldPlanError || 'Custom fields are exclusive to the Professional plan. Upgrade now to capture unique business data across your invoices, items, and customers.'"
    />
  </div>
</template>

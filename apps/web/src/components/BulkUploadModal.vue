<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Modal from '@/components/Modal.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'vue-sonner';
import api from '@/lib/api';
import { ENTITY_TEMPLATES, downloadSampleCsv } from '@/utils/csvTemplates';
import { parseAndValidateCsv, type CsvParseResult, type ParsedRowResult } from '@/utils/csvParser';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  FileUp,
  Info,
  Layers,
  HelpCircle
} from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    open: boolean;
    entity: string;
    title?: string;
    description?: string;
  }>(),
  {
    title: '',
    description: ''
  }
);

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'success', data: any): void;
}>();

const { t } = useI18n();

// Steps: 1 = File Upload, 2 = Preview & Validation, 3 = Completed Results
const step = ref<1 | 2 | 3>(1);
const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const parseResult = ref<CsvParseResult | null>(null);
const duplicateStrategy = ref<'skip' | 'update' | 'error'>('skip');
const isImporting = ref(false);
const importResults = ref<{
  successCount: number;
  skippedCount: number;
  errorCount: number;
  message: string;
} | null>(null);

const templateConfig = computed(() => {
  return ENTITY_TEMPLATES[props.entity] || null;
});

const modalTitle = computed(() => {
  if (props.title) return props.title;
  const name = templateConfig.value?.displayName || props.entity;
  return `Import ${name}`;
});

const modalDescription = computed(() => {
  if (props.description) return props.description;
  return `Upload a CSV file to bulk import ${templateConfig.value?.displayName.toLowerCase() || props.entity} into your organization.`;
});

// Reset state whenever modal opens/closes
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetState();
    }
  }
);

const resetState = () => {
  step.value = 1;
  selectedFile.value = null;
  parseResult.value = null;
  duplicateStrategy.value = 'skip';
  isImporting.value = false;
  importResults.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const handleClose = () => {
  emit('update:open', false);
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const onFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  await processFile(file);
};

const onFileDrop = async (event: DragEvent) => {
  isDragOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  await processFile(file);
};

const processFile = async (file: File) => {
  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    toast.error('Invalid file format', {
      description: 'Please upload a comma-separated CSV (.csv) file.'
    });
    return;
  }

  selectedFile.value = file;
  try {
    const text = await file.text();
    const result = parseAndValidateCsv(text, props.entity);

    if (result.totalRows === 0) {
      toast.error('Empty CSV file', {
        description: 'The uploaded file does not contain any data rows.'
      });
      return;
    }

    parseResult.value = result;
    step.value = 2; // Move to preview
  } catch (err: any) {
    console.error('CSV parse error:', err);
    toast.error('Failed to parse CSV', {
      description: err?.message || 'Could not parse the uploaded file.'
    });
  }
};

const handleDownloadTemplate = () => {
  downloadSampleCsv(props.entity);
};

// Preview columns to display in table (limit to first 4 relevant columns)
const previewColumns = computed(() => {
  if (!parseResult.value?.rows.length) return [];
  const firstRow = parseResult.value.rows[0]?.mappedData || {};
  const keys = Object.keys(firstRow).filter(k => k !== 'items');
  return keys.slice(0, 4);
});

// Format header key to human readable label
const formatHeaderKey = (key: string) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
};

const executeImport = async () => {
  if (!parseResult.value || parseResult.value.payload.length === 0) {
    toast.error('No valid data to import');
    return;
  }

  isImporting.value = true;
  try {
    // Standard endpoint: POST /api/{entity}/bulk-import
    const response = await api.post(`/${props.entity}/bulk-import`, {
      items: parseResult.value.payload,
      duplicateStrategy: duplicateStrategy.value
    });

    const data = response.data || {};
    const imported = data.importedCount ?? data.count ?? parseResult.value.validRows;
    const skipped = data.skippedCount ?? 0;
    const updated = data.updatedCount ?? 0;
    const errors = data.errorCount ?? 0;

    const parts = [`Successfully imported ${imported} ${templateConfig.value?.displayName || props.entity}.`];
    if (skipped > 0) parts.push(`${skipped} duplicate${skipped > 1 ? 's' : ''} skipped.`);
    if (updated > 0) parts.push(`${updated} existing record${updated > 1 ? 's' : ''} updated.`);
    if (errors > 0) parts.push(`${errors} error${errors > 1 ? 's' : ''}.`);

    importResults.value = {
      successCount: imported,
      skippedCount: skipped,
      errorCount: errors,
      message: parts.join(' ')
    };

    step.value = 3;
    emit('success', data);
    toast.success('Import completed', {
      description: importResults.value.message
    });
  } catch (err: any) {
    console.error('Bulk import error:', err);
    const serverErr = err.response?.data?.error || err.message || 'An error occurred during import.';
    toast.error('Import Failed', {
      description: serverErr
    });
  } finally {
    isImporting.value = false;
  }
};
</script>

<template>
  <Modal
    :open="open"
    :title="modalTitle"
    :description="modalDescription"
    :max-width-class="step === 2 ? 'max-w-3xl' : 'max-w-xl'"
    body-class="p-6 space-y-6"
    @close="handleClose"
  >
    <!-- STEP 1: Upload & Download Template -->
    <div v-if="step === 1" class="space-y-6">
      <!-- Drag & Drop Upload Zone -->
      <div
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onFileDrop"
        @click="triggerFileInput"
        :class="[
          'relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer group',
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border bg-muted/10 hover:bg-muted/20 hover:border-primary/40'
        ]"
      >
        <input
          type="file"
          ref="fileInput"
          class="hidden"
          accept=".csv"
          @change="onFileSelected"
        />
        <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200">
          <UploadCloud class="w-7 h-7" />
        </div>
        <div>
          <p class="text-sm font-semibold text-foreground">Click to upload or drag and drop</p>
          <p class="text-xs text-muted-foreground mt-0.5 font-medium">
            Standard CSV format (.csv) up to 10MB
          </p>
        </div>
      </div>

      <!-- Sample Template Download & Instructions Card -->
      <div class="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <FileSpreadsheet class="w-4 h-4 text-primary" />
            <span class="text-xs font-semibold text-foreground">Need the correct CSV format?</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="handleDownloadTemplate"
            class="h-8 px-3 text-xs font-medium border-border shadow-2xs hover:border-primary/50"
          >
            <Download class="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            Download Sample CSV
          </Button>
        </div>

        <div v-if="templateConfig?.instructions?.length" class="pt-2 border-t border-border/60">
          <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Guidelines</p>
          <ul class="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li v-for="(inst, i) in templateConfig.instructions" :key="i">
              {{ inst }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- STEP 2: Preview & Validation Table -->
    <div v-else-if="step === 2" class="space-y-5">
      <!-- File stats banner -->
      <div class="flex items-center justify-between p-3.5 bg-muted/20 border border-border rounded-xl">
        <div class="flex items-center gap-2.5">
          <FileSpreadsheet class="w-5 h-5 text-primary" />
          <div>
            <p class="text-xs font-semibold text-foreground truncate max-w-[280px]">
              {{ selectedFile?.name }}
            </p>
            <p class="text-[11px] text-muted-foreground">
              {{ ((selectedFile?.size || 0) / 1024).toFixed(1) }} KB
            </p>
          </div>
        </div>

        <!-- Counter Badges -->
        <div class="flex items-center gap-2 text-xs">
          <span class="px-2.5 py-1 rounded-md bg-muted text-foreground font-semibold">
            {{ parseResult?.totalRows }} Rows
          </span>
          <span class="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 class="w-3.5 h-3.5" />
            {{ parseResult?.validRows }} Valid
          </span>
          <span
            v-if="(parseResult?.invalidRows || 0) > 0"
            class="px-2.5 py-1 rounded-md bg-destructive/10 text-destructive font-semibold flex items-center gap-1"
          >
            <AlertCircle class="w-3.5 h-3.5" />
            {{ parseResult?.invalidRows }} Errors
          </span>
        </div>
      </div>

      <!-- Preview Table Container -->
      <div class="border border-border rounded-xl overflow-hidden">
        <div class="max-h-60 overflow-y-auto overflow-x-auto text-xs">
          <table class="w-full border-collapse text-left">
            <thead class="bg-muted/40 sticky top-0 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th class="py-2 px-3 w-12 text-center">#</th>
                <th class="py-2 px-3 w-24">Status</th>
                <th
                  v-for="col in previewColumns"
                  :key="col"
                  class="py-2 px-3 whitespace-nowrap"
                >
                  {{ formatHeaderKey(col) }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="row in parseResult?.rows.slice(0, 10)"
                :key="row.rowIndex"
                :class="row.isValid ? 'hover:bg-muted/10' : 'bg-destructive/5 hover:bg-destructive/10'"
              >
                <td class="py-2 px-3 text-center text-muted-foreground font-mono">
                  {{ row.rowIndex }}
                </td>
                <td class="py-2 px-3">
                  <span
                    v-if="row.isValid"
                    class="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600"
                  >
                    <CheckCircle2 class="w-3.5 h-3.5" />
                    Valid
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 text-[11px] font-medium text-destructive cursor-help"
                    :title="row.errors.join(', ')"
                  >
                    <AlertCircle class="w-3.5 h-3.5" />
                    {{ row.errors[0] || 'Error' }}
                  </span>
                </td>
                <td
                  v-for="col in previewColumns"
                  :key="col"
                  class="py-2 px-3 max-w-[180px] truncate text-foreground font-medium"
                >
                  {{ row.mappedData[col] || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="(parseResult?.rows.length || 0) > 10" class="p-2 bg-muted/20 text-center border-t border-border">
          <span class="text-[11px] text-muted-foreground">
            Showing first 10 of {{ parseResult?.rows.length }} rows
          </span>
        </div>
      </div>

      <!-- Duplicate Handling Strategy Selector -->
      <div class="p-3.5 bg-muted/20 border border-border rounded-xl space-y-2">
        <label class="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Layers class="w-3.5 h-3.5 text-primary" />
          If duplicate records are found:
        </label>
        <div class="grid grid-cols-3 gap-2">
          <label
            :class="[
              'flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all',
              duplicateStrategy === 'skip'
                ? 'border-primary bg-primary/5 text-foreground font-medium'
                : 'border-border bg-background hover:bg-muted/20 text-muted-foreground'
            ]"
          >
            <input
              type="radio"
              name="duplicateStrategy"
              value="skip"
              v-model="duplicateStrategy"
              class="text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span>Skip duplicate</span>
          </label>

          <label
            :class="[
              'flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all',
              duplicateStrategy === 'update'
                ? 'border-primary bg-primary/5 text-foreground font-medium'
                : 'border-border bg-background hover:bg-muted/20 text-muted-foreground'
            ]"
          >
            <input
              type="radio"
              name="duplicateStrategy"
              value="update"
              v-model="duplicateStrategy"
              class="text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span>Overwrite existing</span>
          </label>

          <label
            :class="[
              'flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all',
              duplicateStrategy === 'error'
                ? 'border-primary bg-primary/5 text-foreground font-medium'
                : 'border-border bg-background hover:bg-muted/20 text-muted-foreground'
            ]"
          >
            <input
              type="radio"
              name="duplicateStrategy"
              value="error"
              v-model="duplicateStrategy"
              class="text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span>Reject import</span>
          </label>
        </div>
      </div>
    </div>

    <!-- STEP 3: Results Summary Screen -->
    <div v-else-if="step === 3" class="space-y-6 text-center py-4">
      <div class="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
        <CheckCircle2 class="w-8 h-8" />
      </div>

      <div class="space-y-1">
        <h3 class="text-base font-bold text-foreground">Import Completed Successfully</h3>
        <p class="text-xs text-muted-foreground max-w-sm mx-auto">
          {{ importResults?.message }}
        </p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-3 gap-3 p-4 bg-muted/20 border border-border rounded-xl">
        <div class="p-2 bg-background border border-border/60 rounded-lg">
          <p class="text-[11px] text-muted-foreground font-medium">Created</p>
          <p class="text-lg font-bold text-emerald-600">{{ importResults?.successCount }}</p>
        </div>
        <div class="p-2 bg-background border border-border/60 rounded-lg">
          <p class="text-[11px] text-muted-foreground font-medium">Skipped</p>
          <p class="text-lg font-bold text-amber-600">{{ importResults?.skippedCount }}</p>
        </div>
        <div class="p-2 bg-background border border-border/60 rounded-lg">
          <p class="text-[11px] text-muted-foreground font-medium">Errors</p>
          <p class="text-lg font-bold text-destructive">{{ importResults?.errorCount }}</p>
        </div>
      </div>
    </div>

    <!-- Modal Footer Actions -->
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div>
          <Button
            v-if="step === 2"
            type="button"
            variant="ghost"
            size="sm"
            @click="step = 1"
            :disabled="isImporting"
            class="h-9 px-3 text-xs"
          >
            <ArrowLeft class="w-3.5 h-3.5 mr-1" />
            Back
          </Button>
        </div>

        <div class="flex items-center gap-2">
          <Button
            v-if="step !== 3"
            type="button"
            variant="outline"
            size="sm"
            @click="handleClose"
            :disabled="isImporting"
            class="h-9 px-3.5 text-xs font-medium"
          >
            Cancel
          </Button>

          <Button
            v-if="step === 2"
            type="button"
            size="sm"
            @click="executeImport"
            :disabled="isImporting || !parseResult || parseResult.validRows === 0"
            class="h-9 px-4 text-xs font-medium shadow-xs"
          >
            <Spinner v-if="isImporting" size="sm" class="mr-1.5" />
            <ArrowRight v-else class="w-3.5 h-3.5 mr-1.5" />
            {{ isImporting ? 'Importing...' : `Import ${parseResult?.validRows || 0} Records` }}
          </Button>

          <Button
            v-if="step === 3"
            type="button"
            size="sm"
            @click="handleClose"
            class="h-9 px-5 text-xs font-medium shadow-xs"
          >
            Done
          </Button>
        </div>
      </div>
    </template>
  </Modal>
</template>


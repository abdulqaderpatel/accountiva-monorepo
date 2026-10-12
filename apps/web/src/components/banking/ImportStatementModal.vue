<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-vue-next';
import Modal from '@/components/Modal.vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'vue-sonner';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useBankingStore, type BankAccount } from '@/stores/bankingStore';

const props = defineProps<{
  open: boolean;
  account: BankAccount | null;
}>();

const emit = defineEmits(['close', 'imported']);

const bankingStore = useBankingStore();
const step = ref<1 | 2>(1); // 1 = Upload, 2 = Map & Preview
const selectedFile = ref<File | null>(null);
const isPreviewing = ref(false);
const isUploading = ref(false);
const isDragging = ref(false);

// Header Mapping
const headers = ref<string[]>([]);
const sampleRows = ref<Record<string, any>[]>([]);
const mapping = ref({
  dateCol: '',
  descCol: '',
  refCol: '',
  amountMode: 'two_columns' as 'two_columns' | 'single_column',
  debitCol: '',
  creditCol: '',
  singleAmountCol: '',
  balanceCol: '',
});

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
  }
};

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      selectedFile.value = file;
    } else {
      toast.error('Please upload a valid CSV file');
    }
  }
};

const goToStep2 = async () => {
  if (!props.account || !selectedFile.value) return;

  isPreviewing.value = true;
  try {
    const res = await bankingStore.previewStatement(props.account.id, selectedFile.value);
    headers.value = res.headers || [];
    sampleRows.value = res.sampleRows || [];

    // Initialize mapping with detected columns or best matches
    mapping.value.dateCol = res.detected.dateCol || headers.value[0] || '';
    mapping.value.descCol = res.detected.descCol || headers.value[1] || '';
    mapping.value.refCol = res.detected.refCol || '';
    mapping.value.debitCol = res.detected.debitCol || '';
    mapping.value.creditCol = res.detected.creditCol || '';
    mapping.value.singleAmountCol = res.detected.amountCol || '';
    mapping.value.balanceCol = res.detected.balanceCol || '';

    if (mapping.value.debitCol && mapping.value.creditCol) {
      mapping.value.amountMode = 'two_columns';
    } else if (mapping.value.singleAmountCol) {
      mapping.value.amountMode = 'single_column';
    } else {
      mapping.value.amountMode = 'two_columns';
    }

    step.value = 2;
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to read statement columns');
  } finally {
    isPreviewing.value = false;
  }
};

// Computed Live Preview of parsed records from mapping
const mappedPreviewRows = computed(() => {
  return sampleRows.value.slice(0, 3).map((row) => {
    let debit = 0;
    let credit = 0;

    if (mapping.value.amountMode === 'two_columns') {
      debit = parseFloat(String(row[mapping.value.debitCol] || 0).replace(/[^0-9.-]/g, '')) || 0;
      credit = parseFloat(String(row[mapping.value.creditCol] || 0).replace(/[^0-9.-]/g, '')) || 0;
    } else {
      const val = parseFloat(String(row[mapping.value.singleAmountCol] || 0).replace(/[^0-9.-]/g, '')) || 0;
      if (val < 0) debit = Math.abs(val);
      else credit = val;
    }

    return {
      date: row[mapping.value.dateCol] || '—',
      desc: row[mapping.value.descCol] || '—',
      ref: mapping.value.refCol ? row[mapping.value.refCol] || '—' : '—',
      debit,
      credit,
    };
  });
});

const handleFinalImport = async () => {
  if (!props.account || !selectedFile.value) return;

  isUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    formData.append('dateCol', mapping.value.dateCol);
    formData.append('descCol', mapping.value.descCol);
    if (mapping.value.refCol) formData.append('refCol', mapping.value.refCol);

    if (mapping.value.amountMode === 'two_columns') {
      formData.append('debitCol', mapping.value.debitCol);
      formData.append('creditCol', mapping.value.creditCol);
    } else {
      formData.append('amountCol', mapping.value.singleAmountCol);
    }

    if (mapping.value.balanceCol) formData.append('balanceCol', mapping.value.balanceCol);

    const result = await bankingStore.uploadStatement(props.account.id, formData);
    toast.success(
      `Statement imported: ${result.imported} transactions added, ${result.skippedDuplicates} duplicates skipped.`
    );
    emit('imported');
    emit('close');
    resetModal();
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to import bank statement');
  } finally {
    isUploading.value = false;
  }
};

const resetModal = () => {
  step.value = 1;
  selectedFile.value = null;
  headers.value = [];
  sampleRows.value = [];
};
</script>

<template>
  <Modal
    :open="open"
    :title="step === 1 ? 'Import Bank Statement' : 'Map Statement Columns'"
    :description="
      step === 1
        ? 'Upload statement file (CSV/TXT) downloaded from your online banking portal.'
        : 'Match your file headers to Accountiva transaction fields to ensure accurate reconciliation.'
    "
    :maxWidthClass="step === 1 ? 'max-w-md' : 'max-w-2xl'"
    @close="emit('close'); resetModal();"
  >
    <!-- STEP 1: FILE SELECTION -->
    <div v-if="step === 1" class="space-y-4">
      <div v-if="account" class="p-3 rounded-lg bg-muted/30 border border-border flex items-center justify-between text-xs">
        <span class="text-muted-foreground">Target Account:</span>
        <span class="font-semibold text-foreground">{{ account.account_name }} ({{ account.currency }})</span>
      </div>

      <!-- Drag and Drop Dropzone -->
      <div
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        :class="[
          'border border-dashed rounded-xl p-6 text-center transition-colors flex flex-col items-center justify-center cursor-pointer',
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-background'
        ]"
        @click="$refs.fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".csv,.txt"
          class="hidden"
          @change="handleFileChange"
        />

        <div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground mb-2">
          <UploadCloud class="w-5 h-5" />
        </div>

        <p class="text-xs font-semibold text-foreground mb-1">
          Click to upload or drag & drop statement
        </p>
        <p class="text-[11px] text-muted-foreground">
          Supports .CSV files exported from Net Banking
        </p>
      </div>

      <!-- Selected File Preview -->
      <div v-if="selectedFile" class="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 text-xs">
        <div class="flex items-center gap-2.5 overflow-hidden">
          <FileText class="w-4 h-4 text-primary shrink-0" />
          <div class="truncate">
            <p class="font-semibold text-foreground truncate">{{ selectedFile.name }}</p>
            <p class="text-[10px] text-muted-foreground">{{ (selectedFile.size / 1024).toFixed(1) }} KB</p>
          </div>
        </div>
        <button
          type="button"
          @click.stop="selectedFile = null"
          class="p-1 rounded-md text-muted-foreground hover:text-foreground"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="pt-3 flex items-center justify-end gap-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-9 text-xs"
          @click="emit('close'); resetModal();"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          class="h-9 text-xs min-w-[120px]"
          @click="goToStep2"
          :disabled="!selectedFile || isPreviewing"
        >
          <Loader2 v-if="isPreviewing" class="w-3.5 h-3.5 animate-spin mr-1.5" />
          <span>Next: Map Columns</span>
          <ArrowRight v-if="!isPreviewing" class="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </div>

    <!-- STEP 2: ZOHO-STYLE COLUMN MAPPING & LIVE PREVIEW -->
    <div v-else class="space-y-5">
      <!-- Mapping Form Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Date Column -->
        <div class="space-y-1.5">
          <Label class="text-xs font-semibold text-foreground">
            Transaction Date <span class="text-destructive">*</span>
          </Label>
          <select
            v-model="mapping.dateCol"
            class="w-full h-9 rounded-md border border-border bg-background px-3 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
          >
            <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>

        <!-- Description / Narration Column -->
        <div class="space-y-1.5">
          <Label class="text-xs font-semibold text-foreground">
            Description / Narration <span class="text-destructive">*</span>
          </Label>
          <select
            v-model="mapping.descCol"
            class="w-full h-9 rounded-md border border-border bg-background px-3 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
          >
            <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>

        <!-- Reference / Cheque Column -->
        <div class="space-y-1.5">
          <Label class="text-xs font-semibold text-foreground">Reference / Cheque No. (Optional)</Label>
          <select
            v-model="mapping.refCol"
            class="w-full h-9 rounded-md border border-border bg-background px-3 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
          >
            <option value="">-- None / Not in file --</option>
            <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>

        <!-- Balance Column -->
        <div class="space-y-1.5">
          <Label class="text-xs font-semibold text-foreground">Closing Balance Column (Optional)</Label>
          <select
            v-model="mapping.balanceCol"
            class="w-full h-9 rounded-md border border-border bg-background px-3 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
          >
            <option value="">-- None / Not in file --</option>
            <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>
      </div>

      <!-- Amount Format Switcher -->
      <div class="pt-3 border-t border-border space-y-3">
        <div class="flex items-center justify-between">
          <Label class="text-xs font-semibold text-foreground">Amount Column Format</Label>
          <div class="flex gap-2">
            <label class="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="radio"
                value="two_columns"
                v-model="mapping.amountMode"
                class="text-primary focus:ring-primary"
              />
              <span>Separate Debit & Credit</span>
            </label>
            <label class="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="radio"
                value="single_column"
                v-model="mapping.amountMode"
                class="text-primary focus:ring-primary"
              />
              <span>Single Column (+ / -)</span>
            </label>
          </div>
        </div>

        <div v-if="mapping.amountMode === 'two_columns'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <Label class="text-xs font-semibold text-foreground">Withdrawal / Debit (Dr)</Label>
            <select
              v-model="mapping.debitCol"
              class="w-full h-9 rounded-md border border-border bg-background px-3 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            >
              <option value="">-- Select Column --</option>
              <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <Label class="text-xs font-semibold text-foreground">Deposit / Credit (Cr)</Label>
            <select
              v-model="mapping.creditCol"
              class="w-full h-9 rounded-md border border-border bg-background px-3 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            >
              <option value="">-- Select Column --</option>
              <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
            </select>
          </div>
        </div>

        <div v-else class="space-y-1.5">
          <Label class="text-xs font-semibold text-foreground">Amount Column</Label>
          <select
            v-model="mapping.singleAmountCol"
            class="w-full h-9 rounded-md border border-border bg-background px-3 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
          >
            <option value="">-- Select Column --</option>
            <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>
      </div>

      <!-- Live Preview Table (Zoho style verification) -->
      <div class="space-y-2">
        <Label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Parsed Data Preview (First 3 Rows)
        </Label>
        <div class="border border-border rounded-lg overflow-hidden bg-card text-xs">
          <table class="w-full text-left">
            <thead class="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th class="py-2 px-3">Date</th>
                <th class="py-2 px-3">Narration</th>
                <th class="py-2 px-3">Ref</th>
                <th class="py-2 px-3 text-right">Withdrawal (Dr)</th>
                <th class="py-2 px-3 text-right">Deposit (Cr)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="(row, idx) in mappedPreviewRows" :key="idx">
                <td class="py-2 px-3 font-mono text-[11px] text-muted-foreground">{{ row.date }}</td>
                <td class="py-2 px-3 truncate max-w-[180px]">{{ row.desc }}</td>
                <td class="py-2 px-3 font-mono text-[11px] text-muted-foreground">{{ row.ref }}</td>
                <td class="py-2 px-3 text-right font-mono font-medium text-rose-600 dark:text-rose-400">
                  {{ row.debit > 0 ? row.debit.toFixed(2) : '—' }}
                </td>
                <td class="py-2 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {{ row.credit > 0 ? row.credit.toFixed(2) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="pt-3 flex items-center justify-between border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-9 text-xs gap-1.5"
          @click="step = 1"
          :disabled="isUploading"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          Back
        </Button>

        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-9 text-xs"
            @click="emit('close'); resetModal();"
            :disabled="isUploading"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            class="h-9 text-xs min-w-[120px]"
            @click="handleFinalImport"
            :disabled="isUploading || !mapping.dateCol || !mapping.descCol"
          >
            <Loader2 v-if="isUploading" class="w-3.5 h-3.5 animate-spin mr-1.5" />
            <span>Confirm & Import</span>
          </Button>
        </div>
      </div>
    </div>
  </Modal>
</template>

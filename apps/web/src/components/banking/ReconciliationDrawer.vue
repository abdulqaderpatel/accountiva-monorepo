<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Layers,
  ArrowLeftRight,
  Undo2,
  Loader2,
  Search,
  Ban,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'vue-sonner';
import { formatCurrency, formatDate } from '@/utils/formatters';
import {
  useBankingStore,
  type BankAccount,
  type BankTransaction,
  type MatchSuggestion,
} from '@/stores/bankingStore';

const props = defineProps<{
  open: boolean;
  transaction: BankTransaction | null;
  account: BankAccount | null;
  allAccounts: BankAccount[];
}>();

const emit = defineEmits(['close', 'updated']);

const bankingStore = useBankingStore();
const activeTab = ref<'match' | 'categorize' | 'transfer'>('match');
const loadingSuggestions = ref(false);
const isProcessing = ref(false);
const suggestions = ref<MatchSuggestion[]>([]);
const manualSearch = ref('');

// Categorize Form
const categoryForm = ref({
  category: 'Office Supplies',
  payee: '',
  notes: '',
});

// Transfer Form
const transferForm = ref({
  toAccountId: '',
  notes: '',
});

const expenseAccounts = [
  'Advertising and Marketing',
  'Automobile Expense',
  'Bank Fees and Charges',
  'Consulting Expense',
  'Information Technology',
  'Meals and Entertainment',
  'Office Supplies',
  'Rent Expense',
  'Software & Subscriptions',
  'Telephone Expense',
  'Travel Expense',
  'Utilities',
];

const incomeAccounts = [
  'Sales',
  'Consulting Income',
  'Interest Income',
  'Other Income',
];

const availableTransferAccounts = computed(() => {
  return props.allAccounts.filter((a) => a.id !== props.account?.id);
});

const loadSuggestions = async () => {
  if (!props.transaction) return;
  loadingSuggestions.value = true;
  suggestions.value = [];
  try {
    const res = await bankingStore.getMatchSuggestions(props.transaction.id);
    suggestions.value = res.suggestions || [];
  } catch (err) {
    console.error('Failed to load suggestions', err);
  } finally {
    loadingSuggestions.value = false;
  }
};

watch(
  () => props.transaction,
  (newTxn) => {
    if (newTxn) {
      activeTab.value = 'match';
      manualSearch.value = '';
      categoryForm.value = {
        category: newTxn.type === 'withdrawal' ? 'Office Supplies' : 'Sales',
        payee: newTxn.payee || '',
        notes: newTxn.description || '',
      };
      transferForm.value = {
        toAccountId: availableTransferAccounts.value[0]?.id || '',
        notes: newTxn.description || '',
      };
      if (newTxn.status === 'unreconciled') {
        loadSuggestions();
      }
    }
  },
  { immediate: true }
);

const filteredSuggestions = computed(() => {
  if (!manualSearch.value.trim()) return suggestions.value;
  const q = manualSearch.value.toLowerCase().trim();
  return suggestions.value.filter(
    (s) => s.number.toLowerCase().includes(q) || s.contactName.toLowerCase().includes(q)
  );
});

const handleMatch = async (suggestion: MatchSuggestion) => {
  if (!props.transaction) return;
  isProcessing.value = true;
  try {
    await bankingStore.matchTransaction(
      props.transaction.id,
      suggestion.entityType,
      suggestion.id
    );
    toast.success(
      `Matched and settled with ${suggestion.entityType === 'invoice' ? 'Invoice' : 'Bill'} ${suggestion.number}`
    );
    emit('updated');
    emit('close');
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to reconcile transaction');
  } finally {
    isProcessing.value = false;
  }
};

const handleCategorize = async () => {
  if (!props.transaction) return;
  isProcessing.value = true;
  try {
    await bankingStore.categorizeTransaction(props.transaction.id, categoryForm.value);
    toast.success('Transaction categorized and ledger updated');
    emit('updated');
    emit('close');
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to categorize transaction');
  } finally {
    isProcessing.value = false;
  }
};

const handleTransfer = async () => {
  if (!props.transaction) return;
  if (!transferForm.value.toAccountId) {
    toast.error('Please select destination bank account');
    return;
  }
  isProcessing.value = true;
  try {
    await bankingStore.transferTransaction(props.transaction.id, transferForm.value);
    toast.success('Fund transfer recorded and accounts updated');
    emit('updated');
    emit('close');
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to record transfer');
  } finally {
    isProcessing.value = false;
  }
};

const handleExclude = async () => {
  if (!props.transaction) return;
  isProcessing.value = true;
  try {
    await bankingStore.excludeTransaction(props.transaction.id);
    toast.success('Transaction excluded from reconciliation');
    emit('updated');
    emit('close');
  } catch (err: any) {
    toast.error('Failed to exclude transaction');
  } finally {
    isProcessing.value = false;
  }
};

const handleUnmatch = async () => {
  if (!props.transaction) return;
  isProcessing.value = true;
  try {
    await bankingStore.unmatchTransaction(props.transaction.id);
    toast.success('Reconciliation undone. Ledger entry reverted.');
    emit('updated');
    emit('close');
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to unmatch transaction');
  } finally {
    isProcessing.value = false;
  }
};
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity flex justify-end"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-lg bg-background h-full shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right duration-150"
    >
      <!-- Header -->
      <div class="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div>
          <h2 class="text-sm font-semibold text-foreground">Transaction Details & Reconciliation</h2>
          <p class="text-[11px] text-muted-foreground">
            Match with existing invoices/bills, categorize directly, or record an inter-bank transfer.
          </p>
        </div>
        <button
          @click="emit('close')"
          class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Selected Statement Line Card -->
      <div v-if="transaction" class="p-4 border-b border-border bg-muted/20">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span
                v-if="transaction.type === 'deposit'"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              >
                <ArrowDownLeft class="w-3 h-3" />
                Deposit
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
              >
                <ArrowUpRight class="w-3 h-3" />
                Withdrawal
              </span>

              <span
                :class="[
                  'px-2 py-0.5 rounded text-[10px] font-medium border',
                  transaction.status === 'unreconciled'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                ]"
              >
                {{ transaction.status === 'unreconciled' ? 'Uncategorized' : 'Reconciled' }}
              </span>
            </div>

            <p class="text-xs font-medium text-foreground pt-1 leading-snug">
              {{ transaction.description }}
            </p>
            <p v-if="transaction.reference_number" class="text-[11px] font-mono text-muted-foreground">
              Ref: {{ transaction.reference_number }}
            </p>
          </div>

          <div class="text-right shrink-0">
            <p
              :class="[
                'text-base font-bold font-mono',
                transaction.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
              ]"
            >
              {{ transaction.type === 'deposit' ? '+' : '-' }}{{ formatCurrency(transaction.amount, account?.currency) }}
            </p>
            <p class="text-[11px] text-muted-foreground">{{ formatDate(transaction.date) }}</p>
          </div>
        </div>
      </div>

      <!-- Drawer Content -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4">
        <!-- Reconciled State Card -->
        <div
          v-if="transaction && transaction.status !== 'unreconciled' && transaction.status !== 'excluded'"
          class="p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3 text-xs"
        >
          <div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
            <CheckCircle2 class="w-4 h-4 shrink-0" />
            <span>This transaction is reconciled and posted to the General Ledger.</span>
          </div>
          <p class="text-muted-foreground leading-relaxed">
            Linked to:
            <span class="font-semibold text-foreground capitalize">{{ transaction.matched_entity_type || 'Ledger Entry' }}</span>
            <span v-if="transaction.payee"> ({{ transaction.payee }})</span>
            <span v-if="transaction.category"> under {{ transaction.category }}</span>.
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
            @click="handleUnmatch"
            :disabled="isProcessing"
          >
            <Undo2 class="w-3.5 h-3.5 mr-1.5" />
            Undo Match & Reverse Ledger
          </Button>
        </div>

        <!-- Unreconciled Workflows -->
        <div v-else-if="transaction && transaction.status === 'unreconciled'" class="space-y-4">
          <!-- Segmented Navigation Tabs -->
          <div class="flex p-1 bg-muted/40 rounded-lg border border-border">
            <button
              type="button"
              @click="activeTab = 'match'"
              :class="[
                'flex-1 py-1 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer',
                activeTab === 'match'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              Match ({{ suggestions.length }})
            </button>

            <button
              type="button"
              @click="activeTab = 'categorize'"
              :class="[
                'flex-1 py-1 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer',
                activeTab === 'categorize'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              Categorize
            </button>

            <button
              type="button"
              @click="activeTab = 'transfer'"
              :class="[
                'flex-1 py-1 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer',
                activeTab === 'transfer'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              Transfer
            </button>
          </div>

          <!-- TAB 1: MATCH WITH EXISTING INVOICE OR BILL -->
          <div v-if="activeTab === 'match'" class="space-y-3">
            <div v-if="loadingSuggestions" class="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 class="w-5 h-5 animate-spin text-primary" />
              <span class="text-xs">Finding matching invoices & bills...</span>
            </div>

            <div v-else class="space-y-3">
              <!-- Search filter if suggestions exist -->
              <div class="relative" v-if="suggestions.length > 3">
                <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  v-model="manualSearch"
                  placeholder="Filter candidate by number or name..."
                  class="h-8 pl-8 text-xs"
                />
              </div>

              <!-- Suggestions List -->
              <div v-if="filteredSuggestions.length > 0" class="space-y-2">
                <div
                  v-for="sug in filteredSuggestions"
                  :key="sug.id"
                  class="p-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors space-y-2"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-xs text-foreground">{{ sug.number }}</span>
                        <Badge
                          v-if="sug.confidence >= 70"
                          variant="secondary"
                          size="sm"
                          class="bg-primary/10 text-primary border-primary/20"
                        >
                          {{ sug.confidence }}% Match
                        </Badge>
                      </div>
                      <p class="text-xs text-muted-foreground">{{ sug.contactName }}</p>
                      <p class="text-[10px] text-muted-foreground">{{ sug.matchReason }}</p>
                    </div>

                    <div class="text-right">
                      <p class="text-xs font-mono font-bold text-foreground">
                        {{ formatCurrency(sug.amount, account?.currency) }}
                      </p>
                      <p class="text-[10px] text-muted-foreground">{{ formatDate(sug.date) }}</p>
                    </div>
                  </div>

                  <div class="flex justify-end pt-1">
                    <Button
                      size="sm"
                      class="h-7 text-xs font-semibold px-3"
                      @click="handleMatch(sug)"
                      :disabled="isProcessing"
                    >
                      <CheckCircle2 class="w-3.5 h-3.5 mr-1" />
                      Match & Settle
                    </Button>
                  </div>
                </div>
              </div>

              <!-- Empty suggestions fallback -->
              <div v-else class="p-6 text-center border border-dashed border-border rounded-xl space-y-2">
                <FileText class="w-7 h-7 text-muted-foreground mx-auto" />
                <p class="text-xs font-semibold text-foreground">No matching open documents found</p>
                <p class="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  No unpaid {{ transaction.type === 'deposit' ? 'invoices' : 'bills' }} match
                  {{ formatCurrency(transaction.amount, account?.currency) }}. You can categorize this transaction directly.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  class="text-xs mt-2"
                  @click="activeTab = 'categorize'"
                >
                  Categorize Instead
                </Button>
              </div>
            </div>
          </div>

          <!-- TAB 2: CATEGORIZE MANUALLY -->
          <div v-if="activeTab === 'categorize'" class="space-y-3.5">
            <div class="space-y-1.5">
              <Label class="text-xs font-semibold text-foreground">Category / Account</Label>
              <select
                v-model="categoryForm.category"
                class="w-full h-9 rounded-md border border-border bg-background px-3 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
              >
                <optgroup v-if="transaction.type === 'withdrawal'" label="Expense Accounts">
                  <option v-for="cat in expenseAccounts" :key="cat" :value="cat">{{ cat }}</option>
                </optgroup>
                <optgroup v-else label="Income Accounts">
                  <option v-for="cat in incomeAccounts" :key="cat" :value="cat">{{ cat }}</option>
                </optgroup>
              </select>
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs font-semibold text-foreground">
                {{ transaction.type === 'withdrawal' ? 'Vendor / Payee' : 'Customer / Payer' }}
              </Label>
              <Input
                v-model="categoryForm.payee"
                :placeholder="transaction.type === 'withdrawal' ? 'e.g. AWS, Office Depot, Landlord' : 'e.g. Client Name'"
                class="h-9 text-xs"
              />
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs font-semibold text-foreground">Notes / Description</Label>
              <Input
                v-model="categoryForm.notes"
                placeholder="Additional narration"
                class="h-9 text-xs"
              />
            </div>

            <Button
              class="w-full h-9 text-xs font-semibold mt-2"
              @click="handleCategorize"
              :disabled="isProcessing"
            >
              <Loader2 v-if="isProcessing" class="w-3.5 h-3.5 animate-spin mr-1.5" />
              Save & Post to Ledger
            </Button>
          </div>

          <!-- TAB 3: TRANSFER BETWEEN ACCOUNTS -->
          <div v-if="activeTab === 'transfer'" class="space-y-3.5">
            <div class="space-y-1.5">
              <Label class="text-xs font-semibold text-foreground">
                {{ transaction.type === 'withdrawal' ? 'Transfer To Account' : 'Transfer From Account' }}
              </Label>
              <select
                v-model="transferForm.toAccountId"
                class="w-full h-9 rounded-md border border-border bg-background px-3 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
              >
                <option v-for="acc in availableTransferAccounts" :key="acc.id" :value="acc.id">
                  {{ acc.account_name }} ({{ acc.currency }})
                </option>
              </select>
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs font-semibold text-foreground">Reference / Notes</Label>
              <Input
                v-model="transferForm.notes"
                placeholder="Inter-account transfer reference"
                class="h-9 text-xs"
              />
            </div>

            <Button
              class="w-full h-9 text-xs font-semibold mt-2"
              @click="handleTransfer"
              :disabled="isProcessing || availableTransferAccounts.length === 0"
            >
              <Loader2 v-if="isProcessing" class="w-3.5 h-3.5 animate-spin mr-1.5" />
              Record Transfer
            </Button>
          </div>

          <!-- Exclude Transaction Action -->
          <div class="pt-4 border-t border-border flex justify-end">
            <button
              type="button"
              class="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
              @click="handleExclude"
              :disabled="isProcessing"
            >
              <Ban class="w-3.5 h-3.5" />
              Exclude this transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

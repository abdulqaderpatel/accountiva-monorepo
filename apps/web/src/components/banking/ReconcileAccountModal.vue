<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { CheckCircle2, AlertCircle, Loader2, Scale } from 'lucide-vue-next';
import Modal from '@/components/Modal.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'vue-sonner';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { useBankingStore, type BankAccount, type BankTransaction } from '@/stores/bankingStore';

const props = defineProps<{
  open: boolean;
  account: BankAccount | null;
  transactions: BankTransaction[];
}>();

const emit = defineEmits(['close', 'reconciled']);

const bankingStore = useBankingStore();
const statementDate = ref(new Date().toISOString().split('T')[0]);
const statementEndingBalance = ref<number>(0);
const selectedTxnIds = ref<string[]>([]);
const isSubmitting = ref(false);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.account) {
      statementEndingBalance.value = props.account.statement_balance || props.account.current_balance;
      // Pre-select transactions that are already matched or categorized
      selectedTxnIds.value = props.transactions
        .filter((t) => t.status !== 'excluded')
        .map((t) => t.id);
    }
  },
  { immediate: true }
);

// Calculate Cleared Balance based on selected transactions
const clearedDeposits = computed(() => {
  return props.transactions
    .filter((t) => selectedTxnIds.value.includes(t.id) && t.type === 'deposit')
    .reduce((sum, t) => sum + Number(t.amount), 0);
});

const clearedWithdrawals = computed(() => {
  return props.transactions
    .filter((t) => selectedTxnIds.value.includes(t.id) && t.type === 'withdrawal')
    .reduce((sum, t) => sum + Number(t.amount), 0);
});

const clearedBalance = computed(() => {
  const op = Number(props.account?.opening_balance || 0);
  return op + clearedDeposits.value - clearedWithdrawals.value;
});

const difference = computed(() => {
  return Number(statementEndingBalance.value || 0) - clearedBalance.value;
});

const isBalanced = computed(() => {
  return Math.abs(difference.value) < 0.01;
});

const toggleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedTxnIds.value = props.transactions.filter((t) => t.status !== 'excluded').map((t) => t.id);
  } else {
    selectedTxnIds.value = [];
  }
};

const handleConfirmReconcile = async () => {
  if (!props.account) return;
  if (selectedTxnIds.value.length === 0) {
    toast.error('Select at least one transaction to reconcile');
    return;
  }

  isSubmitting.value = true;
  try {
    await bankingStore.reconcilePeriod(props.account.id, {
      statementEndingBalance: statementEndingBalance.value,
      transactionIds: selectedTxnIds.value,
    });
    toast.success('Account successfully reconciled for this period!');
    emit('reconciled');
    emit('close');
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to complete reconciliation');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Modal
    :open="open"
    title="Reconcile Account"
    description="Compare cleared transactions against your bank statement ending balance to ensure books match 100%."
    maxWidthClass="max-w-2xl"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <!-- Target Account & Opening Balance -->
      <div v-if="account" class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-border bg-muted/20 text-xs">
        <div>
          <span class="text-muted-foreground block">Account</span>
          <span class="font-semibold text-foreground">{{ account.account_name }}</span>
        </div>
        <div>
          <span class="text-muted-foreground block">Opening Balance</span>
          <span class="font-mono font-semibold text-foreground">
            {{ formatCurrency(account.opening_balance, account.currency) }}
          </span>
        </div>
        <div>
          <span class="text-muted-foreground block">Currency</span>
          <span class="font-mono font-semibold text-foreground">{{ account.currency }}</span>
        </div>
      </div>

      <!-- Statement Date & Ending Balance Inputs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <Label class="text-xs font-semibold text-foreground">Statement Date</Label>
          <Input type="date" v-model="statementDate" class="h-9 text-xs" />
        </div>

        <div class="space-y-1.5">
          <Label class="text-xs font-semibold text-foreground">
            Statement Ending Balance <span class="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            step="0.01"
            v-model.number="statementEndingBalance"
            class="h-9 text-xs font-mono font-bold"
          />
        </div>
      </div>

      <!-- Zoho-style Balance Comparison Card -->
      <div class="p-4 rounded-xl border border-border bg-card space-y-3">
        <div class="grid grid-cols-3 text-center divide-x divide-border">
          <div>
            <span class="text-[11px] text-muted-foreground block">Cleared Balance</span>
            <span class="text-sm font-bold font-mono text-foreground">
              {{ formatCurrency(clearedBalance, account?.currency) }}
            </span>
          </div>

          <div>
            <span class="text-[11px] text-muted-foreground block">Statement Ending Balance</span>
            <span class="text-sm font-bold font-mono text-foreground">
              {{ formatCurrency(statementEndingBalance, account?.currency) }}
            </span>
          </div>

          <div>
            <span class="text-[11px] text-muted-foreground block">Difference</span>
            <span
              :class="[
                'text-sm font-extrabold font-mono',
                isBalanced
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              ]"
            >
              {{ formatCurrency(difference, account?.currency) }}
            </span>
          </div>
        </div>

        <div
          v-if="isBalanced"
          class="flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-border"
        >
          <CheckCircle2 class="w-4 h-4" />
          <span>Difference is ₹0.00! Your account is ready to reconcile.</span>
        </div>
        <div
          v-else
          class="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium pt-1 border-t border-border"
        >
          <AlertCircle class="w-4 h-4" />
          <span>Select the transactions that cleared on your bank statement to reduce difference to zero.</span>
        </div>
      </div>

      <!-- Cleared Transactions Checklist -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs">
          <Label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Cleared Transactions ({{ selectedTxnIds.length }} of {{ transactions.length }} selected)
          </Label>
          <button
            type="button"
            class="text-primary hover:underline text-xs"
            @click="toggleSelectAll(selectedTxnIds.length !== transactions.length)"
          >
            {{ selectedTxnIds.length === transactions.length ? 'Deselect All' : 'Select All' }}
          </button>
        </div>

        <div class="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border bg-card text-xs">
          <div
            v-for="txn in transactions"
            :key="txn.id"
            class="p-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div class="flex items-center gap-2.5 overflow-hidden">
              <input
                type="checkbox"
                :value="txn.id"
                v-model="selectedTxnIds"
                class="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <div class="truncate">
                <span class="font-mono text-[11px] text-muted-foreground mr-2">{{ formatDate(txn.date) }}</span>
                <span class="font-medium text-foreground truncate">{{ txn.description }}</span>
              </div>
            </div>

            <span
              :class="[
                'font-mono font-semibold text-right shrink-0 ml-2',
                txn.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
              ]"
            >
              {{ txn.type === 'deposit' ? '+' : '-' }}{{ formatCurrency(txn.amount, account?.currency) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="pt-3 flex items-center justify-end gap-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-9 text-xs"
          @click="emit('close')"
          :disabled="isSubmitting"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          class="h-9 text-xs min-w-[120px]"
          @click="handleConfirmReconcile"
          :disabled="isSubmitting || selectedTxnIds.length === 0"
        >
          <Loader2 v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin mr-1.5" />
          Complete Reconciliation
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import Sidebar from '@/components/Sidebar.vue';
import TopBar from '@/components/TopBar.vue';
import ViewGuard from '@/components/ViewGuard.vue';
import StickyPageHeader from '@/components/ui/StickyPageHeader.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/utils/formatters';
import {
  Landmark,
  CreditCard,
  Wallet,
  Plus,
  UploadCloud,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Scale,
  Ban,
  RotateCcw,
  Check,
} from 'lucide-vue-next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'vue-sonner';
import { useBankingStore, type BankAccount, type BankTransaction } from '@/stores/bankingStore';
import AddAccountModal from '@/components/banking/AddAccountModal.vue';
import ImportStatementModal from '@/components/banking/ImportStatementModal.vue';
import ReconciliationDrawer from '@/components/banking/ReconciliationDrawer.vue';
import ReconcileAccountModal from '@/components/banking/ReconcileAccountModal.vue';

const { t } = useI18n();
const bankingStore = useBankingStore();
const { accounts, selectedAccount, transactions, loading, loadingTransactions, totalCount } = storeToRefs(bankingStore);

// Modals
const isAddAccountOpen = ref(false);
const editingAccount = ref<BankAccount | null>(null);
const isImportOpen = ref(false);
const isReconcileOpen = ref(false);
const isDrawerOpen = ref(false);
const activeDrawerTxn = ref<BankTransaction | null>(null);

// Filters
const searchQuery = ref('');
const activeTab = ref<'unreconciled' | 'all' | 'matched' | 'categorized' | 'reconciled' | 'excluded'>('unreconciled');

onMounted(async () => {
  await bankingStore.fetchAccounts();
  if (selectedAccount.value) {
    await fetchAccountTransactions();
  }
});

watch(
  () => selectedAccount.value?.id,
  async (newId) => {
    if (newId) {
      await fetchAccountTransactions();
    }
  }
);

watch([activeTab, searchQuery], () => {
  fetchAccountTransactions();
});

const fetchAccountTransactions = async () => {
  if (!selectedAccount.value) return;
  await bankingStore.fetchTransactions(selectedAccount.value.id, {
    search: searchQuery.value,
    status: activeTab.value,
  });
};

const handleSelectAccount = (acc: BankAccount) => {
  selectedAccount.value = acc;
};

const handleOpenAddAccount = () => {
  editingAccount.value = null;
  isAddAccountOpen.value = true;
};

const handleOpenEditAccount = (acc: BankAccount) => {
  editingAccount.value = acc;
  isAddAccountOpen.value = true;
};

const handleDeleteAccount = async (acc: BankAccount) => {
  if (confirm(`Are you sure you want to remove "${acc.account_name}"?`)) {
    try {
      await bankingStore.deleteAccount(acc.id);
      toast.success('Account removed successfully');
    } catch (err: any) {
      toast.error('Failed to remove account');
    }
  }
};

const handleOpenReconcileDrawer = (txn: BankTransaction) => {
  activeDrawerTxn.value = txn;
  isDrawerOpen.value = true;
};

const handleExclude = async (txn: BankTransaction) => {
  try {
    await bankingStore.excludeTransaction(txn.id);
    toast.success('Transaction excluded');
    await fetchAccountTransactions();
  } catch (err) {
    toast.error('Failed to exclude transaction');
  }
};

const handleRestore = async (txn: BankTransaction) => {
  try {
    await bankingStore.restoreTransaction(txn.id);
    toast.success('Transaction restored');
    await fetchAccountTransactions();
  } catch (err) {
    toast.error('Failed to restore transaction');
  }
};

const getAccountIcon = (type: string) => {
  if (type === 'credit_card') return CreditCard;
  if (type === 'cash') return Wallet;
  return Landmark;
};
</script>

<template>
  <ViewGuard module="banking" action="view">
    <div class="flex h-screen bg-background overflow-hidden">
      <Sidebar activeItem="Banking" />

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        <main class="flex-1 overflow-y-auto">
          <!-- Sticky Header -->
          <StickyPageHeader
            :title="$t('sidebar.banking')"
            subtitle="Manage accounts, upload statement feeds, and reconcile ledger entries."
            :icon="Landmark"
          >
            <template #actions>
              <Button
                variant="outline"
                size="sm"
                class="h-9 text-xs gap-1.5"
                @click="isImportOpen = true"
                :disabled="!selectedAccount"
              >
                <UploadCloud class="w-4 h-4 text-primary" />
                <span>Import Statement</span>
              </Button>

              <Button
                size="sm"
                class="h-9 text-xs gap-1.5"
                @click="handleOpenAddAccount"
              >
                <Plus class="w-4 h-4" />
                <span>Add Account</span>
              </Button>
            </template>
          </StickyPageHeader>

          <div class="p-4 md:p-6 space-y-6">
            <!-- Loading Skeletons State -->
            <div v-if="loading && accounts.length === 0" class="space-y-6">
              <!-- Bank Accounts Selector Skeleton -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Bank & Card Accounts
                  </span>
                  <Skeleton class="h-4 w-28" />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div
                    v-for="i in 3"
                    :key="i"
                    class="p-3.5 rounded-xl border border-border bg-card/60 flex flex-col justify-between space-y-3"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2.5">
                        <Skeleton class="w-8 h-8 rounded-lg" />
                        <div class="space-y-1.5">
                          <Skeleton class="h-3.5 w-28" />
                          <Skeleton class="h-2.5 w-20" />
                        </div>
                      </div>
                      <Skeleton class="w-4 h-4 rounded" />
                    </div>

                    <div class="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                      <div class="space-y-1">
                        <Skeleton class="h-2 w-14" />
                        <Skeleton class="h-4 w-20" />
                      </div>
                      <Skeleton class="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Zoho Books KPI Summary Banner Skeleton -->
              <div class="border border-border rounded-xl bg-card/60 p-4 shadow-2xs">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border flex-1">
                    <div class="space-y-1.5">
                      <Skeleton class="h-3 w-32" />
                      <Skeleton class="h-6 w-24" />
                    </div>
                    <div class="sm:pl-4 space-y-1.5 pt-2 sm:pt-0">
                      <Skeleton class="h-3 w-32" />
                      <Skeleton class="h-6 w-24" />
                    </div>
                    <div class="sm:pl-4 space-y-1.5 pt-2 sm:pt-0">
                      <Skeleton class="h-3 w-20" />
                      <Skeleton class="h-6 w-24" />
                    </div>
                    <div class="sm:pl-4 space-y-1.5 pt-2 sm:pt-0">
                      <Skeleton class="h-3 w-28" />
                      <Skeleton class="h-6 w-12" />
                    </div>
                  </div>
                  <div class="shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                    <Skeleton class="h-9 w-36 rounded-md" />
                  </div>
                </div>
              </div>

              <!-- Main Statement Transactions Workspace Skeleton -->
              <div class="border border-border rounded-xl bg-card/60 shadow-2xs overflow-hidden">
                <div class="p-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="flex items-center gap-1.5 overflow-x-auto">
                    <Skeleton class="h-7 w-24 rounded-md" />
                    <Skeleton class="h-7 w-28 rounded-md" />
                    <Skeleton class="h-7 w-20 rounded-md" />
                    <Skeleton class="h-7 w-24 rounded-md" />
                    <Skeleton class="h-7 w-20 rounded-md" />
                    <Skeleton class="h-7 w-20 rounded-md" />
                  </div>
                  <Skeleton class="h-8.5 w-full sm:w-64 rounded-md" />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow class="bg-muted/30">
                      <TableHead class="w-[100px]">Date</TableHead>
                      <TableHead>Description / Narration</TableHead>
                      <TableHead class="w-[120px]">Reference</TableHead>
                      <TableHead class="w-[130px] text-right">Withdrawals (Dr)</TableHead>
                      <TableHead class="w-[130px] text-right">Deposits (Cr)</TableHead>
                      <TableHead class="w-[110px] text-center">Status</TableHead>
                      <TableHead class="w-[140px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="i in 5" :key="i" class="border-b border-border/60">
                      <TableCell class="py-4 px-4"><Skeleton class="h-4 w-20" /></TableCell>
                      <TableCell class="py-4 px-4">
                        <Skeleton class="h-4 w-48 mb-1.5" />
                        <Skeleton class="h-3 w-28" />
                      </TableCell>
                      <TableCell class="py-4 px-4"><Skeleton class="h-4 w-16" /></TableCell>
                      <TableCell class="py-4 px-4 text-right"><Skeleton class="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell class="py-4 px-4 text-right"><Skeleton class="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell class="py-4 px-4 text-center"><Skeleton class="h-6 w-20 rounded-md mx-auto" /></TableCell>
                      <TableCell class="py-4 px-4 text-right"><Skeleton class="h-8 w-20 rounded-lg ml-auto" /></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <!-- Empty State if no accounts -->
            <div
              v-else-if="!loading && accounts.length === 0"
              class="p-10 text-center border border-dashed border-border rounded-xl bg-muted/10 space-y-3"
            >
              <div class="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mx-auto">
                <Landmark class="w-6 h-6" />
              </div>
              <h3 class="text-sm font-semibold text-foreground">No Bank Accounts Found</h3>
              <p class="text-xs text-muted-foreground max-w-sm mx-auto">
                Add your business bank account, credit card, or cash fund to begin importing statements and reconciling.
              </p>
              <Button size="sm" class="text-xs" @click="handleOpenAddAccount">
                <Plus class="w-4 h-4 mr-1.5" />
                Add Bank Account
              </Button>
            </div>

            <div v-else class="space-y-6">
              <!-- Bank Accounts Selector (Zoho Style Cards Shelf) -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Bank & Card Accounts
                  </span>
                  <button
                    type="button"
                    class="text-xs text-primary hover:underline font-medium"
                    @click="handleOpenAddAccount"
                  >
                    + Add New Account
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div
                    v-for="acc in accounts"
                    :key="acc.id"
                    @click="handleSelectAccount(acc)"
                    :class="[
                      'p-3.5 rounded-xl border transition-colors cursor-pointer relative group flex flex-col justify-between',
                      selectedAccount?.id === acc.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs'
                        : 'border-border bg-card hover:border-primary/40'
                    ]"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2.5 overflow-hidden">
                        <div
                          :class="[
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                            selectedAccount?.id === acc.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          ]"
                        >
                          <component :is="getAccountIcon(acc.account_type)" class="w-4 h-4" />
                        </div>
                        <div class="truncate">
                          <h4 class="text-xs font-semibold text-foreground truncate">
                            {{ acc.account_name }}
                          </h4>
                          <p class="text-[11px] text-muted-foreground font-mono truncate">
                            {{ acc.bank_name || 'Cash' }}
                            <span v-if="acc.account_number">({{ acc.account_number }})</span>
                          </p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger as-child @click.stop>
                          <button class="p-1 rounded-md text-muted-foreground hover:text-foreground">
                            <MoreHorizontal class="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" class="w-36">
                          <DropdownMenuItem @click="handleOpenEditAccount(acc)" class="text-xs">
                            <Edit2 class="w-3.5 h-3.5 mr-2" />
                            Edit Account
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem @click="handleDeleteAccount(acc)" class="text-xs text-destructive">
                            <Trash2 class="w-3.5 h-3.5 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div class="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                      <div>
                        <span class="text-[10px] text-muted-foreground block">In Accountiva</span>
                        <span class="font-mono font-bold text-foreground">
                          {{ formatCurrency(acc.current_balance, acc.currency) }}
                        </span>
                      </div>

                      <Badge
                        :variant="acc.unreconciled_count > 0 ? 'warning' : 'outline'"
                        size="sm"
                      >
                        {{ acc.unreconciled_count > 0 ? `${acc.unreconciled_count} to review` : 'All cleared' }}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Zoho Books KPI Summary Banner for Selected Account -->
              <div v-if="selectedAccount" class="border border-border rounded-xl bg-card p-4 shadow-2xs">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <!-- Metrics Grid -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border flex-1">
                    <div class="space-y-1">
                      <span class="text-[11px] font-medium text-muted-foreground block">Amount in Accountiva (Books)</span>
                      <span class="text-base font-bold font-mono text-foreground block">
                        {{ formatCurrency(selectedAccount.current_balance, selectedAccount.currency) }}
                      </span>
                    </div>

                    <div class="sm:pl-4 space-y-1 pt-2 sm:pt-0">
                      <span class="text-[11px] font-medium text-muted-foreground block">Amount in Bank (Statement)</span>
                      <span class="text-base font-bold font-mono text-foreground block">
                        {{ formatCurrency(selectedAccount.statement_balance, selectedAccount.currency) }}
                      </span>
                    </div>

                    <div class="sm:pl-4 space-y-1 pt-2 sm:pt-0">
                      <span class="text-[11px] font-medium text-muted-foreground block">Difference</span>
                      <span
                        :class="[
                          'text-base font-bold font-mono block',
                          Math.abs(selectedAccount.difference) < 0.01
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        ]"
                      >
                        {{ formatCurrency(selectedAccount.difference, selectedAccount.currency) }}
                      </span>
                    </div>

                    <div class="sm:pl-4 space-y-1 pt-2 sm:pt-0">
                      <span class="text-[11px] font-medium text-muted-foreground block">Uncategorized Lines</span>
                      <span class="text-base font-bold font-mono text-foreground block">
                        {{ selectedAccount.unreconciled_count }}
                      </span>
                    </div>
                  </div>

                  <!-- Quick Action Button (Reconcile Account) -->
                  <div class="shrink-0 flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-9 text-xs gap-1.5"
                      @click="isReconcileOpen = true"
                    >
                      <Scale class="w-4 h-4 text-primary" />
                      <span>Reconcile Account</span>
                    </Button>
                  </div>
                </div>
              </div>

              <!-- Main Statement Transactions Workspace -->
              <div v-if="selectedAccount" class="border border-border rounded-xl bg-card shadow-2xs overflow-hidden">
                <!-- Controls Bar (Zoho Tabs & Search) -->
                <div class="p-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <!-- Zoho Status Tabs -->
                  <div class="flex items-center gap-1 overflow-x-auto text-xs">
                    <button
                      type="button"
                      @click="activeTab = 'unreconciled'"
                      :class="[
                        'py-1.5 px-3 font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer',
                        activeTab === 'unreconciled'
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      ]"
                    >
                      <span>Uncategorized</span>
                      <Badge
                        v-if="selectedAccount.unreconciled_count > 0"
                        variant="warning"
                        size="sm"
                      >
                        {{ selectedAccount.unreconciled_count }}
                      </Badge>
                    </button>

                    <button
                      type="button"
                      @click="activeTab = 'all'"
                      :class="[
                        'py-1.5 px-3 font-semibold rounded-md transition-colors cursor-pointer',
                        activeTab === 'all'
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      ]"
                    >
                      All Transactions
                    </button>

                    <button
                      type="button"
                      @click="activeTab = 'matched'"
                      :class="[
                        'py-1.5 px-3 font-semibold rounded-md transition-colors cursor-pointer',
                        activeTab === 'matched'
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      ]"
                    >
                      Matched
                    </button>

                    <button
                      type="button"
                      @click="activeTab = 'categorized'"
                      :class="[
                        'py-1.5 px-3 font-semibold rounded-md transition-colors cursor-pointer',
                        activeTab === 'categorize' || activeTab === 'categorized'
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      ]"
                    >
                      Categorized
                    </button>

                    <button
                      type="button"
                      @click="activeTab = 'reconciled'"
                      :class="[
                        'py-1.5 px-3 font-semibold rounded-md transition-colors cursor-pointer',
                        activeTab === 'reconciled'
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      ]"
                    >
                      Reconciled
                    </button>

                    <button
                      type="button"
                      @click="activeTab = 'excluded'"
                      :class="[
                        'py-1.5 px-3 font-semibold rounded-md transition-colors cursor-pointer',
                        activeTab === 'excluded'
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      ]"
                    >
                      Excluded
                    </button>
                  </div>

                  <!-- Search Input -->
                  <div class="relative w-full sm:w-64 shrink-0">
                    <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      v-model="searchQuery"
                      placeholder="Search description, ref, or payee..."
                      class="h-8.5 pl-8 text-xs"
                    />
                  </div>
                </div>

                <!-- Strict shadcn Table -->
                <Table>
                  <TableHeader>
                    <TableRow class="bg-muted/30">
                      <TableHead class="w-[100px]">Date</TableHead>
                      <TableHead>Description / Narration</TableHead>
                      <TableHead class="w-[120px]">Reference</TableHead>
                      <TableHead class="w-[130px] text-right">Withdrawals (Dr)</TableHead>
                      <TableHead class="w-[130px] text-right">Deposits (Cr)</TableHead>
                      <TableHead class="w-[110px] text-center">Status</TableHead>
                      <TableHead class="w-[140px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    <template v-if="loadingTransactions">
                      <TableRow v-for="i in 5" :key="i" class="border-b border-border/60">
                        <TableCell class="py-4 px-4"><Skeleton class="h-4 w-20" /></TableCell>
                        <TableCell class="py-4 px-4">
                          <Skeleton class="h-4 w-48 mb-1.5" />
                          <Skeleton class="h-3 w-28" />
                        </TableCell>
                        <TableCell class="py-4 px-4"><Skeleton class="h-4 w-16" /></TableCell>
                        <TableCell class="py-4 px-4 text-right"><Skeleton class="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell class="py-4 px-4 text-right"><Skeleton class="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell class="py-4 px-4 text-center"><Skeleton class="h-6 w-20 rounded-md mx-auto" /></TableCell>
                        <TableCell class="py-4 px-4 text-right"><Skeleton class="h-8 w-20 rounded-lg ml-auto" /></TableCell>
                      </TableRow>
                    </template>

                    <TableRow v-else-if="transactions.length === 0">
                      <TableCell colspan="7" class="h-40 text-center text-muted-foreground">
                        <div class="space-y-2">
                          <FileSpreadsheet class="w-7 h-7 mx-auto text-muted-foreground/60" />
                          <p class="text-xs font-medium text-foreground">No transactions found in this view</p>
                          <p class="text-[11px] text-muted-foreground max-w-sm mx-auto">
                            {{ activeTab === 'unreconciled' ? 'Great job! All statement transactions are categorized.' : 'Import a bank statement to populate transactions.' }}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            class="text-xs mt-1"
                            @click="isImportOpen = true"
                          >
                            <UploadCloud class="w-3.5 h-3.5 mr-1.5" />
                            Import Statement
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    <TableRow
                      v-else
                      v-for="txn in transactions"
                      :key="txn.id"
                      class="hover:bg-muted/20"
                    >
                      <!-- Date -->
                      <TableCell class="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {{ formatDate(txn.date) }}
                      </TableCell>

                      <!-- Description & Payee/Category info -->
                      <TableCell class="max-w-xs">
                        <p class="text-xs font-medium text-foreground truncate">{{ txn.description }}</p>
                        <p v-if="txn.payee || txn.category" class="text-[11px] text-muted-foreground truncate">
                          <span v-if="txn.payee">{{ txn.payee }} • </span>
                          <span>{{ txn.category || txn.matched_entity_type }}</span>
                        </p>
                      </TableCell>

                      <!-- Ref -->
                      <TableCell class="font-mono text-[11px] text-muted-foreground">
                        {{ txn.reference_number || '—' }}
                      </TableCell>

                      <!-- Withdrawal -->
                      <TableCell class="text-right font-mono font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {{ txn.type === 'withdrawal' ? formatCurrency(txn.amount, selectedAccount.currency) : '—' }}
                      </TableCell>

                      <!-- Deposit -->
                      <TableCell class="text-right font-mono font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {{ txn.type === 'deposit' ? formatCurrency(txn.amount, selectedAccount.currency) : '—' }}
                      </TableCell>

                      <!-- Status Badge -->
                      <TableCell class="text-center whitespace-nowrap">
                        <Badge
                          v-if="txn.status === 'unreconciled'"
                          variant="warning"
                          size="sm"
                        >
                          Uncategorized
                        </Badge>
                        <Badge
                          v-else-if="txn.status === 'matched'"
                          variant="success"
                          size="sm"
                        >
                          Matched
                        </Badge>
                        <Badge
                          v-else-if="txn.status === 'categorized'"
                          variant="secondary"
                          size="sm"
                        >
                          Categorized
                        </Badge>
                        <Badge
                          v-else-if="txn.status === 'reconciled'"
                          variant="default"
                          size="sm"
                        >
                          Reconciled
                        </Badge>
                        <Badge
                          v-else-if="txn.status === 'excluded'"
                          variant="outline"
                          size="sm"
                          class="text-muted-foreground"
                        >
                          Excluded
                        </Badge>
                      </TableCell>

                      <!-- Actions -->
                      <TableCell class="text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                          <!-- If Uncategorized -->
                          <template v-if="txn.status === 'unreconciled'">
                            <Button
                              size="sm"
                              variant="outline"
                              class="h-7 text-xs font-semibold px-2.5"
                              @click="handleOpenReconcileDrawer(txn)"
                            >
                              Match
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger as-child>
                                <button class="p-1 rounded-md text-muted-foreground hover:text-foreground">
                                  <MoreHorizontal class="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" class="w-32">
                                <DropdownMenuItem @click="handleExclude(txn)" class="text-xs">
                                  <Ban class="w-3.5 h-3.5 mr-2" />
                                  Exclude
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </template>

                          <!-- If Excluded -->
                          <template v-else-if="txn.status === 'excluded'">
                            <Button
                              size="sm"
                              variant="outline"
                              class="h-7 text-xs px-2.5"
                              @click="handleRestore(txn)"
                            >
                              <RotateCcw class="w-3 h-3 mr-1" />
                              Restore
                            </Button>
                          </template>

                          <!-- If Matched or Categorized -->
                          <template v-else>
                            <Button
                              size="sm"
                              variant="ghost"
                              class="h-7 text-xs text-muted-foreground hover:text-foreground"
                              @click="handleOpenReconcileDrawer(txn)"
                            >
                              View
                            </Button>
                          </template>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Modals & Drawers -->
      <AddAccountModal
        :open="isAddAccountOpen"
        :account="editingAccount"
        @close="isAddAccountOpen = false"
        @saved="bankingStore.fetchAccounts"
      />

      <ImportStatementModal
        :open="isImportOpen"
        :account="selectedAccount"
        @close="isImportOpen = false"
        @imported="fetchAccountTransactions"
      />

      <ReconcileAccountModal
        :open="isReconcileOpen"
        :account="selectedAccount"
        :transactions="transactions"
        @close="isReconcileOpen = false"
        @reconciled="bankingStore.fetchAccounts(); fetchAccountTransactions();"
      />

      <ReconciliationDrawer
        :open="isDrawerOpen"
        :transaction="activeDrawerTxn"
        :account="selectedAccount"
        :allAccounts="accounts"
        @close="isDrawerOpen = false"
        @updated="fetchAccountTransactions"
      />
    </div>
  </ViewGuard>
</template>

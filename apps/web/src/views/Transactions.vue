<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from 'vue-i18n';
import { toast } from "vue-sonner";
import Sidebar from "@/components/Sidebar.vue";
import TopBar from '@/components/TopBar.vue';
import { useTransactionStore } from "@/stores/transactionStore";
import { formatDate } from "@/utils/formatters";
import { exportToCsv, exportToJson } from "@/lib/exportUtils";
import { useBulkSelection } from "@/composables/useBulkSelection";
import BulkActionBar from "@/components/ui/BulkActionBar.vue";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ChevronDown,
  RotateCcw,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  BookOpen,
  X,
  FileSpreadsheet,
  FileText,
  Check,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { storeToRefs } from "pinia";
import ViewGuard from "@/components/ViewGuard.vue";

const transactionStore = useTransactionStore();
const { transactions, loading } = storeToRefs(transactionStore);
const { t } = useI18n();

const searchQuery = ref("");
const selectedType = ref<'All' | 'Debit' | 'Credit'>('All');

const filteredTransactions = computed(() => {
  return transactionStore.transactions.filter((tx) => {
    const matchesSearch =
      !searchQuery.value ||
      tx.account.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesType =
      selectedType.value === 'All' || tx.type === selectedType.value;

    return matchesSearch && matchesType;
  });
});

const {
  selectedIds,
  selectedCount,
  selectedItems,
  isSelected,
  toggleSelect,
  isAllSelected,
  isIndeterminate,
  toggleSelectAll,
  clearSelection,
} = useBulkSelection(filteredTransactions);

const resetFilters = () => {
  searchQuery.value = "";
  selectedType.value = "All";
  clearSelection();
};

const formatTxDate = (dateVal: any) => {
  if (!dateVal) return '';
  const str = String(dateVal);
  if (str.includes('T')) return str.split('T')[0];
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? str : d.toISOString().split('T')[0];
};

const handleBulkExport = (format: 'csv' | 'json', target: 'selected' | 'all' = 'selected') => {
  const itemsToExport =
    target === 'selected' && selectedItems.value.length > 0
      ? selectedItems.value
      : filteredTransactions.value;

  if (itemsToExport.length === 0) {
    toast.error('No transactions available to export');
    return;
  }

  const exportData = itemsToExport.map((tx) => ({
    Date: formatTxDate(tx.date),
    Account: tx.account,
    Description: tx.description,
    Type: tx.type,
    Amount: tx.amount,
  }));

  if (format === 'csv') {
    exportToCsv(exportData, 'transactions');
  } else {
    exportToJson(exportData, 'transactions');
  }

  toast.success(
    `Exported ${exportData.length} transaction(s) as ${format.toUpperCase()}`
  );
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

onMounted(() => {
  transactionStore.fetchTransactions();
});
</script>


<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Transactions" />

    <main class="flex-1 overflow-y-auto bg-background flex flex-col">
      <ViewGuard module="banking">
        <div class="px-8 pt-4 md:pt-5 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">
          <!-- Header -->
          <div
            class="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                <ArrowLeftRight class="w-6 h-6" />
              </div>
              <div class="space-y-0.5">
                <h1 class="ui-page-title text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {{ $t('modules.transactions.title') }}
                </h1>
                <p class="ui-page-description text-xs md:text-sm text-muted-foreground">
                  {{ $t('modules.transactions.subtitle') }}
                </p>
              </div>
            </div>

            <!-- Bulk Download / Export Dropdown -->
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="outline"
                  class="h-10 px-4 rounded-xl font-bold uppercase tracking-wider text-[11px] border-border/70 hover:bg-muted/50 transition-all gap-2 cursor-pointer shadow-2xs"
                >
                  <Download class="w-3.5 h-3.5" />
                  <span v-if="selectedCount > 0">Download Selected ({{ selectedCount }})</span>
                  <span v-else>Bulk Download</span>
                  <ChevronDown class="w-3.5 h-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-56">
                <template v-if="selectedCount > 0">
                  <DropdownMenuItem @click="handleBulkExport('csv', 'selected')" class="text-xs cursor-pointer gap-2">
                    <FileSpreadsheet class="w-3.5 h-3.5 text-emerald-600" />
                    Download Selected as CSV ({{ selectedCount }})
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="handleBulkExport('json', 'selected')" class="text-xs cursor-pointer gap-2">
                    <FileText class="w-3.5 h-3.5 text-blue-600" />
                    Download Selected as JSON ({{ selectedCount }})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem @click="handleBulkExport('csv', 'all')" class="text-xs cursor-pointer gap-2 text-muted-foreground">
                    <FileSpreadsheet class="w-3.5 h-3.5 text-muted-foreground" />
                    Download All as CSV ({{ filteredTransactions.length }})
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="handleBulkExport('json', 'all')" class="text-xs cursor-pointer gap-2 text-muted-foreground">
                    <FileText class="w-3.5 h-3.5 text-muted-foreground" />
                    Download All as JSON ({{ filteredTransactions.length }})
                  </DropdownMenuItem>
                </template>
                <template v-else>
                  <DropdownMenuItem @click="handleBulkExport('csv', 'all')" class="text-xs cursor-pointer gap-2">
                    <FileSpreadsheet class="w-3.5 h-3.5 text-emerald-600" />
                    Download All as CSV ({{ filteredTransactions.length }})
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="handleBulkExport('json', 'all')" class="text-xs cursor-pointer gap-2">
                    <FileText class="w-3.5 h-3.5 text-blue-600" />
                    Download All as JSON ({{ filteredTransactions.length }})
                  </DropdownMenuItem>
                </template>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <!-- Ledger Explanation -->
          <div class="p-4.5 bg-card/50 border border-border/60 rounded-2xl shadow-2xs backdrop-blur-xs">
            <h3
              class="text-primary font-bold text-[10px] uppercase tracking-widest mb-1"
            >
              What is a Ledger?
            </h3>
            <p class="text-muted-foreground text-xs leading-relaxed">
              In double-entry bookkeeping, every transaction affects at least two
              accounts. The
              <span class="text-foreground font-semibold">General Ledger</span> maintains the
              complete record. Expenses are
              <span class="text-emerald-700 dark:text-emerald-400 font-bold">Debited</span> (increased) and
              Bank/Cash accounts are
              <span class="text-rose-700 dark:text-rose-400 font-bold">Credited</span>
              (decreased).
            </p>
          </div>

          <!-- Filter & Table -->
          <div class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs">
            <div class="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border/60 bg-muted/25">
              <div class="relative w-full sm:w-80 md:w-96 group">
                <Search
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-150"
                />
                <Input
                  v-model="searchQuery"
                  placeholder="Search by account or description..."
                  class="h-9 w-full pl-9 pr-8 bg-background/50 hover:bg-background/80 focus:bg-background/90 border-border/70 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 rounded-lg text-xs font-medium placeholder:text-muted-foreground/60 shadow-none transition-colors"
                />
                <button
                  v-if="searchQuery"
                  type="button"
                  @click="searchQuery = ''"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
                  title="Clear search"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
              <div class="flex items-center gap-2 shrink-0 py-1.5 -my-1.5">
                <div class="relative inline-flex items-center shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button
                        variant="outline"
                        class="h-9 rounded-lg bg-background/50 border-border/70 px-3.5 flex items-center gap-2 font-semibold text-xs text-muted-foreground hover:text-foreground hover:bg-background/80 shadow-2xs transition-all cursor-pointer"
                      >
                        <Filter class="w-3.5 h-3.5" />
                        <span>{{ selectedType === 'All' ? 'Type' : selectedType }}</span>
                        <ChevronDown class="w-3.5 h-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-36">
                      <DropdownMenuItem @click="selectedType = 'All'" class="text-xs cursor-pointer justify-between">
                        All Types
                        <Check v-if="selectedType === 'All'" class="w-3.5 h-3.5 text-primary" />
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="selectedType = 'Debit'" class="text-xs cursor-pointer justify-between">
                        Debit
                        <Check v-if="selectedType === 'Debit'" class="w-3.5 h-3.5 text-info" />
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="selectedType = 'Credit'" class="text-xs cursor-pointer justify-between">
                        Credit
                        <Check v-if="selectedType === 'Credit'" class="w-3.5 h-3.5 text-amber-600" />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <!-- Cross to remove type filter -->
                  <button
                    v-if="selectedType !== 'All'"
                    type="button"
                    @click.stop="selectedType = 'All'"
                    class="absolute -top-1.5 -right-1.5 z-20 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    title="Remove type filter"
                    aria-label="Remove type filter"
                  >
                    <X class="size-2.5 stroke-[2.5]" />
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-9 w-9 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 transition-colors cursor-pointer"
                  title="Reset filters"
                  @click="resetFilters"
                >
                  <RotateCcw class="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/80 border-b border-border/70 bg-primary/[0.03]">
                    <th class="py-4 px-4 w-[48px] text-center">
                      <div class="flex items-center justify-center">
                        <Checkbox
                          :checked="isAllSelected ? true : isIndeterminate ? 'indeterminate' : false"
                          @update:checked="toggleSelectAll"
                          aria-label="Select all transactions"
                        />
                      </div>
                    </th>
                    <th class="py-4 px-6">Date</th>
                    <th class="py-4 px-6">Account</th>
                    <th class="py-4 px-6">Description</th>
                    <th class="py-4 px-6">Type</th>
                    <th class="py-4 px-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <template v-if="loading">
                    <tr v-for="i in 10" :key="i">
                      <td class="py-4.5 px-4 text-center"><Skeleton class="h-4 w-4 mx-auto rounded" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-20" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-32" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-48" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-5 w-24 rounded-lg" /></td>
                      <td class="py-4.5 px-6 text-right"><Skeleton class="h-4 w-20 ml-auto" /></td>
                    </tr>
                  </template>
                  <template v-else>
                    <tr
                      v-for="tx in filteredTransactions"
                      :key="tx.id"
                      class="hover:bg-muted/50 group cursor-pointer transition-colors duration-150"
                      :class="{ 'bg-primary/[0.04]': isSelected(tx.id) }"
                      @click="toggleSelect(tx.id)"
                    >
                      <td class="py-4.5 px-4 text-center w-[48px]" @click.stop="toggleSelect(tx.id)">
                        <div
                          :class="[
                            'transition-opacity duration-150 flex items-center justify-center',
                            selectedCount > 0 || isSelected(tx.id)
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          ]"
                        >
                          <Checkbox
                            :checked="isSelected(tx.id)"
                            @update:checked="toggleSelect(tx.id)"
                            :aria-label="`Select transaction ${tx.description}`"
                          />
                        </div>
                      </td>
                      <td
                        class="py-4.5 px-6 text-muted-foreground font-semibold text-xs tracking-wide whitespace-nowrap"
                      >
                        {{ formatDate(tx.date) }}
                      </td>
                      <td class="py-4.5 px-6">
                        <span
                          class="text-foreground font-bold tracking-tight text-sm group-hover:text-primary transition-colors"
                          >{{ tx.account }}</span
                        >
                      </td>
                      <td class="py-4.5 px-6 text-muted-foreground text-xs italic">
                        {{ tx.description }}
                      </td>
                      <td class="py-4.5 px-6">
                        <div class="flex items-center gap-1.5">
                          <component
                            :is="tx.type === 'Debit' ? ArrowUpRight : ArrowDownLeft"
                            :class="[
                              'w-3.5 h-3.5',
                              tx.type === 'Debit' ? 'text-info' : 'text-amber-600 dark:text-amber-400',
                            ]"
                          />
                          <span
                            :class="[
                              'text-[10px] font-bold uppercase tracking-wider',
                              tx.type === 'Debit' ? 'text-info' : 'text-amber-700 dark:text-amber-400',
                            ]"
                          >
                            {{ tx.type }}
                          </span>
                        </div>
                      </td>
                      <td class="py-4.5 px-6 text-right">
                        <span
                          :class="[
                            'font-mono font-bold text-sm tracking-tight',
                            tx.type === 'Debit'
                              ? 'text-foreground'
                              : 'text-muted-foreground opacity-75',
                          ]"
                        >
                          {{ formatCurrency(tx.amount) }}
                        </span>
                      </td>
                    </tr>
                    <tr v-if="filteredTransactions.length === 0">
                      <td colspan="6" class="py-32 text-center">
                        <div class="flex flex-col items-center justify-center max-w-xs mx-auto space-y-4">
                          <div class="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center">
                            <BookOpen class="w-8 h-8 text-muted-foreground/40" />
                          </div>
                          <div class="space-y-1">
                            <h3 class="ui-section-title">No ledger transactions yet</h3>
                            <p class="text-[11px] text-muted-foreground font-medium">
                              Ledger entries will automatically populate as transactions occur.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Account Summaries -->
          <div class="space-y-3">
            <h3
              class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]"
            >
              Account Balances
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <template v-if="loading">
                <div v-for="i in 4" :key="i" class="p-5 bg-card/50 border border-border/60 rounded-2xl shadow-2xs">
                  <Skeleton class="h-2.5 w-20 mb-2" />
                  <Skeleton class="h-6 w-32" />
                </div>
              </template>
              <template v-else>
                <div
                  v-for="acc in transactionStore.uniqueAccounts"
                  :key="acc"
                  class="p-5 bg-card/50 border border-border/60 hover:border-primary/40 rounded-2xl shadow-2xs hover:shadow-xs transition-all backdrop-blur-xs relative overflow-hidden group"
                >
                  <div class="h-[2px] w-full bg-primary/20 group-hover:bg-primary/50 transition-colors absolute top-0 left-0 right-0"></div>
                  <p
                    class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1"
                  >
                    {{ acc }}
                  </p>
                  <p class="text-xl font-mono font-bold text-foreground">
                    {{ formatCurrency(transactionStore.getAccountBalance(acc)) }}
                  </p>
                </div>
              </template>
            </div>
          </div>

          <!-- Bulk Action Bar -->
          <BulkActionBar
            :count="selectedCount"
            label="transactions"
            :can-delete="false"
            :enable-export="true"
            @clear="clearSelection"
            @export="(format) => handleBulkExport(format, 'selected')"
          />
        </div>
      </ViewGuard>
    </main>
    </div>
  </div>
</template>


<style scoped>
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background: var(--muted);
  border-radius: 10px;
}
</style>

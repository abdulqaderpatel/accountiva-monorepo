<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Sidebar from '@/components/Sidebar.vue';
import TopBar from '@/components/TopBar.vue';
import { useReportStore } from '@/stores/reportStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { formatCurrency, formatDate } from '@/utils/formatters';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  BookText,
  Filter,
  Lock,
  Percent,
  FileSpreadsheet,
  FileText,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ViewGuard from '@/components/ViewGuard.vue';
import { toast } from 'vue-sonner';
import Select from '@/components/ui/Select.vue';
import { exportToCsv, exportToJson } from '@/lib/exportUtils';

const reportStore = useReportStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const { currentOrganization } = storeToRefs(authStore);
const { t } = useI18n();
const activeTab = ref('dashboard');

const syncTabFromRoute = () => {
  const tab = route.query.tab as string;
  if (tab === 'pnl' || tab === 'dashboard') activeTab.value = 'dashboard';
  else if (tab === 'ledger') activeTab.value = 'ledger';
  else if (tab === 'gst' || tab === 'tax') activeTab.value = 'gst';
};

watch(() => route.query.tab, syncTabFromRoute, { immediate: true });

onMounted(() => {
  reportStore.fetchReports();
});

const totalRevenue = computed(() => reportStore.profitLoss.reduce((sum, item) => sum + item.revenue, 0));

const totalExpenses = computed(() => reportStore.profitLoss.reduce((sum, item) => sum + item.expenses, 0));

const netProfit = computed(() => totalRevenue.value - totalExpenses.value);

const maxVal = computed(() => {
  const values = reportStore.profitLoss.flatMap((d) => [d.revenue, d.expenses]);
  return Math.max(...values, 1000);
});

const getBarHeight = (value: number) => {
  return (value / maxVal.value) * 100;
};

// Ledger sorting/filtering
const ledgerEntries = computed(() => reportStore.generalLedger);

// GST / Tax Report Calculations
const gstPayableGroup = computed(() => {
  return reportStore.generalLedger.find((g) => g.account === 'GST Payable');
});

const totalOutputGst = computed(() => {
  return gstPayableGroup.value?.closingBalance || 0;
});

const outputCgst = computed(() => totalOutputGst.value / 2);
const outputSgst = computed(() => totalOutputGst.value / 2);

const totalInputGst = computed(() => {
  // Compute standard 18% input credit from total operating expenses
  return totalExpenses.value * 0.18;
});

const inputCgst = computed(() => totalInputGst.value / 2);
const inputSgst = computed(() => totalInputGst.value / 2);

const netGstPayable = computed(() => totalOutputGst.value - totalInputGst.value);

const selectedTaxPeriod = ref('Q1 FY26-27');

const handleExportGst = () => {
  toast.success('GST Report Exported', {
    description: `GSTR-1 summary for ${selectedTaxPeriod.value} has been downloaded.`,
  });
  
  // Simulate a file download
  const csvContent = "data:text/csv;charset=utf-8," 
    + "Section,Taxable Value,CGST,SGST,IGST,Total Tax\n"
    + `B2B Sales Invoices,${totalRevenue.value - totalOutputGst.value},${outputCgst.value},${outputSgst.value},0,${totalOutputGst.value}\n`
    + `B2C Local Supplies,0,0,0,0,0\n`
    + `Inward Eligible ITC,${totalExpenses.value},${inputCgst.value},${inputSgst.value},0,${totalInputGst.value}\n`
    + `Net GST Payable/Refundable,0,0,0,0,${netGstPayable.value}\n`;
    
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `gst_report_${selectedTaxPeriod.value.replace(' ', '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const taxPeriodOptions = [
  { id: 'Q1 FY26-27', name: 'Q1 FY26-27 (Apr - Jun)' },
  { id: 'Q2 FY26-27', name: 'Q2 FY26-27 (Jul - Sep)' },
  { id: 'May 2026', name: 'May 2026' },
  { id: 'June 2026', name: 'June 2026' }
];

const handleExportReport = (format: 'csv' | 'json' = 'csv') => {
  if (activeTab.value === 'gst') {
    handleExportGst();
    return;
  }

  if (activeTab.value === 'ledger') {
    const transactions: any[] = [];
    reportStore.generalLedger.forEach((group) => {
      if (group.transactions && group.transactions.length > 0) {
        group.transactions.forEach((tx) => {
          transactions.push({
            Account: group.account,
            Category: group.category,
            Date: tx.date ? formatDate(tx.date) : '',
            Type: tx.type || '',
            Description: tx.description || '',
            Reference: tx.referenceId || '',
            Debit: tx.debit || 0,
            Credit: tx.credit || 0,
          });
        });
      } else {
        transactions.push({
          Account: group.account,
          Category: group.category,
          Date: '',
          Type: 'Opening Balance',
          Description: 'Balance Forward',
          Reference: '',
          Debit: group.totalDebit || 0,
          Credit: group.totalCredit || 0,
        });
      }
    });

    if (transactions.length === 0) {
      toast.error('No ledger data available to export');
      return;
    }

    if (format === 'csv') {
      exportToCsv(transactions, 'general-ledger-report');
    } else {
      exportToJson(transactions, 'general-ledger-report');
    }
    toast.success(`General Ledger exported as ${format.toUpperCase()}`);
    return;
  }

  // Dashboard / Profit & Loss
  const pnlData = reportStore.profitLoss.map((p) => ({
    Period: p.name,
    Revenue: p.revenue,
    Expenses: p.expenses,
    'Net Profit': p.revenue - p.expenses,
    Margin: p.revenue > 0 ? `${Math.round(((p.revenue - p.expenses) / p.revenue) * 100)}%` : '0%',
  }));

  if (pnlData.length === 0) {
    toast.error('No report data available to export');
    return;
  }

  if (format === 'csv') {
    exportToCsv(pnlData, 'profit-and-loss-report');
  } else {
    exportToJson(pnlData, 'profit-and-loss-report');
  }
  toast.success(`Profit & Loss report exported as ${format.toUpperCase()}`);
};
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Reports" />

    <main class="flex-1 overflow-y-auto bg-background flex flex-col">
      <ViewGuard module="reports">
        <div class="px-8 pt-4 md:pt-5 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">
          <!-- Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                <BarChart3 class="w-6 h-6" />
              </div>
              <div>
                <h1 class="ui-page-title text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {{ $t('modules.reports.title') }}
                </h1>
                <p class="ui-page-description text-xs md:text-sm text-muted-foreground">{{ $t('modules.reports.subtitle') }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <!-- Tab Switcher -->
              <div class="bg-muted/50 p-1 rounded-xl border border-border/60 flex items-center gap-1 shadow-2xs">
                <button type="button"
                  @click="activeTab = 'dashboard'"
                  :class="[
                    'px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all',
                    activeTab === 'dashboard'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/50',
                  ]"
                >
                  Dashboard
                </button>
                <button type="button"
                  @click="activeTab = 'ledger'"
                  :class="[
                    'px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all',
                    activeTab === 'ledger'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/50',
                  ]"
                >
                  General Ledger
                </button>
                <button type="button"
                  @click="activeTab = 'gst'"
                  :class="[
                    'px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all',
                    activeTab === 'gst'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/50',
                  ]"
                >
                  GST / Tax Report
                </button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button
                    variant="outline"
                    class="h-10 px-4 rounded-xl font-bold uppercase tracking-wider text-[11px] border-border/70 hover:bg-muted/50 transition-all gap-2 cursor-pointer shadow-2xs"
                  >
                    <Download class="w-3.5 h-3.5" />
                    {{ $t('modules.reports.export') }}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-48">
                  <DropdownMenuItem @click="handleExportReport('csv')" class="text-xs cursor-pointer gap-2">
                    <FileSpreadsheet class="w-3.5 h-3.5 text-emerald-600" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="handleExportReport('json')" class="text-xs cursor-pointer gap-2">
                    <FileText class="w-3.5 h-3.5 text-blue-600" />
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div class="space-y-8">
          <!-- Dashboard Tab Content -->
          <div
            v-if="activeTab === 'dashboard'"
            class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <!-- P&L Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-emerald-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
                <div class="h-[2.5px] w-full bg-emerald-500/50"></div>
                <CardContent class="p-6">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]"
                      >Total Revenue</span
                    >
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <TrendingUp class="w-4 h-4" />
                    </div>
                  </div>
                  <div class="text-2xl font-bold text-foreground font-mono tracking-tight">
                    {{ formatCurrency(totalRevenue) }}
                  </div>
                  <p class="text-[10px] text-muted-foreground font-semibold mt-1 uppercase tracking-wider">
                    Gross income tracked
                  </p>
                </CardContent>
              </Card>

              <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-rose-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
                <div class="h-[2.5px] w-full bg-rose-500/50"></div>
                <CardContent class="p-6">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]"
                      >Total Expenses</span
                    >
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/15 text-rose-700 dark:text-rose-400 group-hover:scale-105 transition-transform">
                      <TrendingDown class="w-4 h-4" />
                    </div>
                  </div>
                  <div class="text-2xl font-bold text-foreground font-mono tracking-tight">
                    {{ formatCurrency(totalExpenses) }}
                  </div>
                  <p class="text-[10px] text-muted-foreground font-semibold mt-1 uppercase tracking-wider">
                    Operating costs
                  </p>
                </CardContent>
              </Card>

              <Card
                class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-amber-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs"
              >
                <div :class="['h-[2.5px] w-full', netProfit >= 0 ? 'bg-emerald-500/50' : 'bg-rose-500/50']"></div>
                <CardContent class="p-6">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]"
                      >Net Profit</span
                    >
                    <div
                      :class="[
                        'w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105',
                        netProfit >= 0 ? 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 border border-rose-500/15 text-rose-700 dark:text-rose-400',
                      ]"
                    >
                      <TrendingUp v-if="netProfit >= 0" class="w-4 h-4" />
                      <TrendingDown v-else class="w-4 h-4" />
                    </div>
                  </div>
                  <div
                    :class="[
                      'text-2xl font-bold font-mono tracking-tight',
                      netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400',
                    ]"
                  >
                    {{ formatCurrency(netProfit) }}
                  </div>
                  <p class="text-[10px] text-muted-foreground font-semibold mt-1 uppercase tracking-wider">
                    Bottom line performance
                  </p>
                </CardContent>
              </Card>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <!-- Profit & Loss Chart -->
              <Card class="bg-card/60 border border-border/60 p-6 md:p-8 rounded-2xl shadow-2xs">
                <div class="flex items-center justify-between mb-8">
                  <h3 class="font-bold text-foreground flex items-center gap-2 text-sm md:text-base">
                    <Calendar class="w-4 h-4 text-primary" />
                    Profit & Loss (6 Months)
                  </h3>
                  <div class="flex gap-4">
                    <div class="flex items-center gap-1.5">
                      <div class="w-2 h-2 rounded-full bg-primary"></div>
                      <span class="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Revenue</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <div class="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span class="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Expenses</span>
                    </div>
                  </div>
                </div>

                <div class="h-64 flex items-end justify-between gap-2 px-4 border-b border-border/60 pb-4 relative">
                  <div
                    v-for="month in reportStore.profitLoss"
                    :key="month.name"
                    class="flex-1 flex flex-col items-center gap-4 group"
                  >
                    <div class="w-full flex items-end gap-1.5 justify-center h-48">
                      <div
                        class="w-3 bg-primary/40 group-hover:bg-primary rounded-t-sm transition-all duration-300"
                        :style="{ height: `${getBarHeight(month.revenue)}%` }"
                        :title="`Revenue: ${formatCurrency(month.revenue)}`"
                      ></div>
                      <div
                        class="w-3 bg-amber-500/40 group-hover:bg-amber-500 rounded-t-sm transition-all duration-300"
                        :style="{ height: `${getBarHeight(month.expenses)}%` }"
                        :title="`Expenses: ${formatCurrency(month.expenses)}`"
                      ></div>
                    </div>
                    <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{{
                      month.name
                    }}</span>
                  </div>
                </div>
              </Card>

              <!-- Expense Breakdown -->
              <Card class="bg-card/60 border border-border/60 p-6 md:p-8 rounded-2xl shadow-2xs">
                <h3 class="font-bold text-foreground flex items-center gap-2 mb-8 text-sm md:text-base">
                  <PieChart class="w-4 h-4 text-primary" />
                  Expense Breakdown
                </h3>

                <div class="space-y-6">
                  <div v-for="cat in reportStore.expenseBreakdown" :key="cat.name" class="space-y-2">
                    <div class="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                      <span class="text-muted-foreground">{{ cat.name }}</span>
                      <span class="text-foreground font-mono">{{ formatCurrency(cat.value) }}</span>
                    </div>
                    <div class="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-primary/70 rounded-full transition-all duration-1000"
                        :style="{
                          width: `${(cat.value / totalExpenses) * 100}%`,
                        }"
                      ></div>
                    </div>
                  </div>
                  <div
                    v-if="reportStore.expenseBreakdown.length === 0"
                    class="py-12 text-center text-muted-foreground italic text-sm"
                  >
                    No expense data recorded.
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <!-- GST Summary Tab Content -->
          <div
            v-else-if="activeTab === 'gst'"
            class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <!-- Period selector & actions -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-6 bg-card/60 border border-border/60 rounded-2xl shadow-2xs gap-4">
              <div class="space-y-1">
                <h3 class="font-bold text-foreground text-sm md:text-base">Tax Reporting Period</h3>
                <p class="text-xs text-muted-foreground">Select period to compute CGST/SGST/IGST tax values.</p>
              </div>
              <div class="flex items-center gap-3">
                <Select
                  v-model="selectedTaxPeriod"
                  :options="taxPeriodOptions"
                  class="h-10 text-xs font-bold rounded-xl border-border/70 bg-field/90 px-4 py-2 w-[220px] shadow-2xs focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <Button @click="handleExportGst" class="h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all gap-2">
                  <Download class="w-3.5 h-3.5" /> Export GST returns
                </Button>
              </div>
            </div>

            <!-- GST Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Output GST Card -->
              <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-primary/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
                <div class="h-[2.5px] w-full bg-primary/50"></div>
                <CardContent class="p-6">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Output GST (Sales)</span>
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/15 text-primary group-hover:scale-105 transition-transform">
                      <ArrowUpRight class="w-4 h-4" />
                    </div>
                  </div>
                  <div class="text-2xl font-bold font-mono tracking-tight text-foreground">
                    {{ formatCurrency(totalOutputGst) }}
                  </div>
                  <div class="flex justify-between items-center mt-3 pt-3 border-t border-border/60 text-[10px] text-muted-foreground font-semibold">
                    <span>CGST (9%): {{ formatCurrency(outputCgst) }}</span>
                    <span>SGST (9%): {{ formatCurrency(outputSgst) }}</span>
                  </div>
                </CardContent>
              </Card>

              <!-- Input GST Card -->
              <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-emerald-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
                <div class="h-[2.5px] w-full bg-emerald-500/50"></div>
                <CardContent class="p-6">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Input Tax Credit (ITC)</span>
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <ArrowDownRight class="w-4 h-4" />
                    </div>
                  </div>
                  <div class="text-2xl font-bold font-mono tracking-tight text-foreground">
                    {{ formatCurrency(totalInputGst) }}
                  </div>
                  <div class="flex justify-between items-center mt-3 pt-3 border-t border-border/60 text-[10px] text-muted-foreground font-semibold">
                    <span>CGST (9%): {{ formatCurrency(inputCgst) }}</span>
                    <span>SGST (9%): {{ formatCurrency(inputSgst) }}</span>
                  </div>
                </CardContent>
              </Card>

              <!-- Net Payable Card -->
              <Card
                class="border-border/60 shadow-2xs overflow-hidden relative group hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs"
              >
                <div :class="['h-[2.5px] w-full', netGstPayable >= 0 ? 'bg-amber-500/50' : 'bg-emerald-500/50']"></div>
                <CardContent class="p-6">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Net GST Payable</span>
                    <div
                      :class="[
                        'w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105',
                        netGstPayable >= 0 ? 'bg-amber-500/10 border border-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                      ]"
                    >
                      <Percent class="w-4 h-4" />
                    </div>
                  </div>
                  <div
                    :class="[
                      'text-2xl font-bold font-mono tracking-tight',
                      netGstPayable >= 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400',
                    ]"
                  >
                    {{ formatCurrency(netGstPayable) }}
                  </div>
                  <p class="text-[10px] text-muted-foreground font-semibold mt-1 uppercase tracking-wider">
                    {{ netGstPayable >= 0 ? 'Due to tax department' : 'Input Credit carry forward' }}
                  </p>
                </CardContent>
              </Card>
            </div>

            <!-- Tax Rate Summary Table -->
            <Card class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs">
              <div class="p-5 md:p-6 border-b border-border/60 bg-card/30">
                <h3 class="font-bold text-foreground flex items-center gap-2 text-sm md:text-base">
                  <FileSpreadsheet class="w-4 h-4 text-primary" />
                  GSTR-1 Tax Rate & Base Value Breakdowns
                </h3>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left">
                  <thead>
                    <tr class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/80 border-b border-border/70 bg-primary/[0.03]">
                      <th class="py-4 px-6">Tax Rate</th>
                      <th class="py-4 px-6 text-right">Taxable Value (₹)</th>
                      <th class="py-4 px-6 text-right">Output CGST (₹)</th>
                      <th class="py-4 px-6 text-right">Output SGST (₹)</th>
                      <th class="py-4 px-6 text-right">Total Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60 text-xs font-semibold">
                    <tr class="hover:bg-muted/50 transition-colors">
                      <td class="py-4.5 px-6 font-bold text-foreground">Standard Rate (18% GST)</td>
                      <td class="py-4.5 px-6 text-right font-mono text-muted-foreground">{{ (totalRevenue - totalOutputGst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                      <td class="py-4.5 px-6 text-right font-mono text-muted-foreground">{{ outputCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                      <td class="py-4.5 px-6 text-right font-mono text-muted-foreground">{{ outputSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                      <td class="py-4.5 px-6 text-right font-mono font-bold text-foreground">{{ totalOutputGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                    </tr>
                    <tr class="hover:bg-muted/50 transition-colors text-muted-foreground/60">
                      <td class="py-4.5 px-6 font-bold">Medium Rate (12% GST)</td>
                      <td class="py-4.5 px-6 text-right font-mono">—</td>
                      <td class="py-4.5 px-6 text-right font-mono">—</td>
                      <td class="py-4.5 px-6 text-right font-mono">—</td>
                      <td class="py-4.5 px-6 text-right font-mono font-bold">—</td>
                    </tr>
                    <tr class="hover:bg-muted/50 transition-colors text-muted-foreground/60">
                      <td class="py-4.5 px-6 font-bold">Concessional Rate (5% GST)</td>
                      <td class="py-4.5 px-6 text-right font-mono">—</td>
                      <td class="py-4.5 px-6 text-right font-mono">—</td>
                      <td class="py-4.5 px-6 text-right font-mono">—</td>
                      <td class="py-4.5 px-6 text-right font-mono font-bold">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            <!-- GSTR-2B Input Tax Credit Breakdown -->
            <Card class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs">
              <div class="p-5 md:p-6 border-b border-border/60 bg-card/30">
                <h3 class="font-bold text-foreground flex items-center gap-2 text-sm md:text-base">
                  <FileSpreadsheet class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Eligible ITC Summary (GSTR-2B)
                </h3>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left">
                  <thead>
                    <tr class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/80 border-b border-border/70 bg-primary/[0.03]">
                      <th class="py-4 px-6">ITC Source</th>
                      <th class="py-4 px-6 text-right">Taxable Expenses (₹)</th>
                      <th class="py-4 px-6 text-right">Input CGST (₹)</th>
                      <th class="py-4 px-6 text-right">Input SGST (₹)</th>
                      <th class="py-4 px-6 text-right">Total Eligible ITC (₹)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60 text-xs font-semibold">
                    <tr class="hover:bg-muted/50 transition-colors">
                      <td class="py-4.5 px-6 font-bold text-foreground">Inward supplies from registered vendors</td>
                      <td class="py-4.5 px-6 text-right font-mono text-muted-foreground">{{ totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                      <td class="py-4.5 px-6 text-right font-mono text-muted-foreground">{{ inputCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                      <td class="py-4.5 px-6 text-right font-mono text-muted-foreground">{{ inputSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                      <td class="py-4.5 px-6 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">{{ totalInputGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <!-- General Ledger Tab Content -->
          <div v-else class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <!-- Ledger Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
              <!-- Total Assets -->
              <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-emerald-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
                <div class="h-[2.5px] w-full bg-emerald-500/50"></div>
                <CardContent class="p-5">
                  <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] mb-2">
                    Total Assets
                  </div>
                  <div class="text-xl font-bold font-mono text-foreground tracking-tight">
                    {{
                      formatCurrency(
                        reportStore.generalLedger
                          .filter((g) => g.category === 'Asset')
                          .reduce((s, g) => s + g.closingBalance, 0),
                      )
                    }}
                  </div>
                  <p class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-2 uppercase tracking-wider">
                    Current + Accrued
                  </p>
                </CardContent>
              </Card>

              <!-- Total Liabilities -->
              <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-amber-500/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
                <div class="h-[2.5px] w-full bg-amber-500/50"></div>
                <CardContent class="p-5">
                  <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] mb-2">
                    Total Liabilities
                  </div>
                  <div class="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 tracking-tight">
                    {{
                      formatCurrency(
                        reportStore.generalLedger
                          .filter((g) => g.category === 'Liability')
                          .reduce((s, g) => s + g.closingBalance, 0),
                      )
                    }}
                  </div>
                  <p class="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-2 uppercase tracking-wider">
                    Tax + Payables
                  </p>
                </CardContent>
              </Card>

              <!-- Unbilled Revenue -->
              <Card class="border-border/60 shadow-2xs overflow-hidden relative group hover:border-primary/40 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs">
                <div class="h-[2.5px] w-full bg-primary/50"></div>
                <CardContent class="p-5">
                  <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] mb-2">
                    Unbilled Revenue
                  </div>
                  <div class="text-xl font-bold font-mono text-primary tracking-tight">
                    {{
                      formatCurrency(
                        reportStore.generalLedger.find((g) => g.account === 'Unbilled Revenue')?.closingBalance || 0,
                      )
                    }}
                  </div>
                  <p class="text-[10px] text-primary font-semibold mt-2 uppercase tracking-wider">
                    Work in Progress
                  </p>
                </CardContent>
              </Card>

              <!-- Net Worth -->
              <Card class="border-primary/30 shadow-2xs overflow-hidden relative group hover:border-primary/50 hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-primary/[0.04] backdrop-blur-xs">
                <div class="h-[2.5px] w-full bg-primary"></div>
                <CardContent class="p-5">
                  <div class="text-[10px] font-bold text-primary uppercase tracking-[0.18em] mb-2">Business Net Worth</div>
                  <div class="text-xl font-bold font-mono text-foreground tracking-tight">
                    {{
                      formatCurrency(
                        reportStore.generalLedger
                          .filter((g) => g.category === 'Asset')
                          .reduce((s, g) => s + g.closingBalance, 0) -
                          reportStore.generalLedger
                            .filter((g) => g.category === 'Liability')
                            .reduce((s, g) => s + g.closingBalance, 0),
                      )
                    }}
                  </div>
                  <p class="text-[10px] text-primary font-bold mt-2 uppercase tracking-wider">
                    Equity Calculation
                  </p>
                </CardContent>
              </Card>
            </div>

            <div class="grid grid-cols-1 gap-6">
              <div v-for="group in reportStore.generalLedger" :key="group.account" class="space-y-4">
                <Card
                  class="bg-card/60 border border-border/60 overflow-hidden rounded-2xl shadow-2xs hover:border-primary/30 transition-all"
                >
                  <!-- Account Header Summary -->
                  <div class="p-5 md:p-6 bg-card/30 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div class="flex items-center gap-4">
                      <div class="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                        <BookText class="w-5 h-5" />
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <h3 class="text-base font-bold text-foreground">{{ group.account }}</h3>
                          <span
                            class="px-2 py-0.5 rounded-md bg-muted/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border/60"
                          >
                            {{ group.category }}
                          </span>
                        </div>
                        <p class="text-[11px] text-muted-foreground font-medium mt-0.5">
                          Closing Balance:
                          <span class="text-foreground font-mono font-bold">{{ formatCurrency(group.closingBalance) }}</span>
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center gap-6">
                      <div class="text-right">
                        <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                          Total Debit
                        </div>
                        <div class="text-sm font-bold font-mono text-foreground">{{ formatCurrency(group.totalDebit) }}</div>
                      </div>
                      <div class="text-right">
                        <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                          Total Credit
                        </div>
                        <div class="text-sm font-bold font-mono text-amber-700 dark:text-amber-400">
                          {{ formatCurrency(group.totalCredit) }}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        class="rounded-xl h-9 px-4 text-[11px] font-bold uppercase tracking-wider border-border/70 hover:bg-muted/50 transition-all"
                        @click="group.isExpanded = !group.isExpanded"
                      >
                        {{ group.isExpanded ? 'Hide Details' : 'View Details' }}
                      </Button>
                    </div>
                  </div>

                  <!-- Expanded Transaction Details -->
                  <div
                    v-if="group.isExpanded"
                    class="animate-in slide-in-from-top-2 duration-300"
                  >
                    <div class="overflow-x-auto">
                      <table class="w-full text-left border-collapse">
                        <thead>
                          <tr class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/80 border-b border-border/70 bg-primary/[0.03]">
                            <th class="px-6 py-3.5">
                              Date
                            </th>
                            <th class="px-6 py-3.5">
                              Transaction Details
                            </th>
                            <th
                              class="px-6 py-3.5 text-right"
                            >
                              Debit
                            </th>
                            <th
                              class="px-6 py-3.5 text-right"
                            >
                              Credit
                            </th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-border/60">
                          <!-- Opening Balance Row -->
                          <tr class="bg-muted/20 italic">
                            <td class="px-6 py-3 text-xs text-muted-foreground">Period Start</td>
                            <td class="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              Opening Balance
                            </td>
                            <td colspan="2" class="px-6 py-3 text-right text-xs font-mono font-bold text-foreground">
                              {{ formatCurrency(group.openingBalance) }}
                            </td>
                          </tr>

                          <!-- Transaction Rows -->
                          <tr
                            v-for="(tx, txIdx) in group.transactions"
                            :key="txIdx"
                            class="hover:bg-muted/50 transition-colors"
                          >
                            <td class="px-6 py-4 text-xs font-medium text-muted-foreground">
                              {{ formatDate(tx.date) }}
                            </td>
                            <td class="px-6 py-4">
                              <div class="flex items-center gap-2 mb-0.5">
                                <span
                                  class="text-[9px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase border border-primary/15"
                                >
                                  {{ tx.type }}
                                </span>
                                <span class="text-xs font-bold text-foreground">{{ tx.description }}</span>
                              </div>
                            </td>
                            <td
                              class="px-6 py-4 text-right text-xs font-mono font-bold"
                              :class="tx.debit > 0 ? 'text-foreground' : 'text-muted-foreground/30'"
                            >
                              {{ tx.debit > 0 ? formatCurrency(tx.debit) : '—' }}
                            </td>
                            <td
                              class="px-6 py-4 text-right text-xs font-mono font-bold"
                              :class="tx.credit > 0 ? 'text-foreground' : 'text-muted-foreground/30'"
                            >
                              {{ tx.credit > 0 ? formatCurrency(tx.credit) : '—' }}
                            </td>
                          </tr>

                          <!-- Closing Balance Row -->
                          <tr class="bg-primary/[0.04] border-t border-border/70">
                            <td class="px-6 py-3.5 text-xs font-bold text-primary uppercase">Period End</td>
                            <td
                              class="px-6 py-3.5 text-xs font-bold text-primary uppercase tracking-wider text-right"
                            >
                              Closing Balance
                            </td>
                            <td colspan="2" class="px-6 py-3.5 text-right text-sm font-mono font-bold text-primary">
                              {{ formatCurrency(group.closingBalance) }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              </div>

              <!-- Empty State -->
              <div v-if="reportStore.generalLedger.length === 0" class="py-20 text-center space-y-4">
                <div class="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                  <BookText class="w-8 h-8 text-muted-foreground/50" />
                </div>
                <div>
                  <h3 class="text-lg font-bold text-foreground">No ledger data found</h3>
                  <p class="text-sm text-muted-foreground">Start recording transactions to see your ledger reports.</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </ViewGuard>
    </main>
    </div>
  </div>
</template>

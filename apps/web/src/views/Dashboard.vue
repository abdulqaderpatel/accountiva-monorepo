<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/authStore';
import { useQuickCreateStore } from '@/stores/quickCreateStore';
import { useEstimateStore } from '@/stores/estimateStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useInvoiceStore } from '@/stores/invoiceStore';
import { isFeatureEnabled } from '@/config/features';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Sidebar from '@/components/Sidebar.vue';
import TopBar from '@/components/TopBar.vue';
import ViewGuard from '@/components/ViewGuard.vue';
import { formatCurrency } from '@/utils/formatters';
import api from '@/lib/api';
import {
  Plus,
  Wallet,
  Building2,
  CreditCard,
  TrendingUp,
  Receipt,
  FileText,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Clock,
  ArrowRight,
  Briefcase,
  Users as UsersIcon,
  CircleDot,
} from 'lucide-vue-next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const authStore = useAuthStore();
const { profile, profileLoading } = storeToRefs(authStore);
const { t, locale } = useI18n();
const router = useRouter();
const quickCreateStore = useQuickCreateStore();
const invoiceStore = useInvoiceStore();
const estimateStore = useEstimateStore();
const transactionStore = useTransactionStore();

const handleCreateInvoice = () => {
  quickCreateStore.trigger('invoice');
  if (router.currentRoute.value.path !== '/invoices') {
    router.push('/invoices');
  }
};

interface DashboardMetrics {
  receivables: number;
  payables: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  cashFlow: Array<{ date: string; income: number; expense: number }>;
}
const dashboardMetrics = ref<DashboardMetrics | null>(null);
const dashboardLoading = ref(false);

const loading = computed(
  () => dashboardLoading.value || estimateStore.loading || transactionStore.loading || invoiceStore.loading,
);

// Financial Metrics
const totalReceivables = computed(() => {
  return dashboardMetrics.value?.receivables ?? 0;
});

const totalPayables = computed(() => {
  return dashboardMetrics.value?.payables ?? 0;
});

const netProfit = computed(() => dashboardMetrics.value?.netProfit ?? 0);

const summaryStats = computed(() => {
  const stats = [
    {
      title: t('dashboard.receivables'),
      amount: formatCurrency(totalReceivables.value),
      description: t('dashboard.outstanding'),
      icon: FileText,
      color: 'text-primary',
      accent: 'bg-primary/50',
      tone: 'hover:border-primary/40',
      iconBg: 'bg-primary/10 border border-primary/15 text-primary',
    },
  ];

  if (isFeatureEnabled('bills') || isFeatureEnabled('expenses')) {
    stats.push({
      title: t('dashboard.payables'),
      amount: formatCurrency(totalPayables.value),
      description: t('dashboard.unpaid'),
      icon: Receipt,
      color: 'text-amber-700 dark:text-amber-400',
      accent: 'bg-amber-500/50',
      tone: 'hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 border border-amber-500/15 text-amber-700 dark:text-amber-400',
    });
  } else {
    stats.push({
      title: 'Total Revenue',
      amount: formatCurrency(dashboardMetrics.value?.revenue ?? 0),
      description: 'Total Invoiced to Date',
      icon: TrendingUp,
      color: 'text-emerald-700 dark:text-emerald-400',
      accent: 'bg-emerald-500/50',
      tone: 'hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    });
  }

  if (isFeatureEnabled('banking')) {
    stats.push({
      title: t('dashboard.bankBalance'),
      amount: formatCurrency(
        transactionStore.uniqueAccounts.reduce((sum, name) => sum + transactionStore.getAccountBalance(name), 0),
      ),
      description: t('dashboard.cashDesc'),
      icon: Wallet,
      color: 'text-primary',
      accent: 'bg-primary/50',
      tone: 'hover:border-primary/40',
      iconBg: 'bg-primary/10 border border-primary/15 text-primary',
    });
  } else if (isFeatureEnabled('estimates')) {
    const activeEstimatesValue = estimateStore.estimates
      .filter((e) => e.status === 'Sent' || e.status === 'Accepted')
      .reduce((s, e) => s + e.amount, 0);

    stats.push({
      title: 'Active Estimates',
      amount: formatCurrency(activeEstimatesValue),
      description: `${estimateStore.estimates.filter((e) => e.status === 'Sent' || e.status === 'Accepted').length} Quotes in Pipeline`,
      icon: Calculator,
      color: 'text-sky-700 dark:text-sky-400',
      accent: 'bg-sky-500/50',
      tone: 'hover:border-sky-500/40',
      iconBg: 'bg-sky-500/10 border border-sky-500/15 text-sky-700 dark:text-sky-400',
    });
  }

  stats.push({
    title: t('dashboard.netProfit'),
    amount: formatCurrency(netProfit.value),
    description: t('dashboard.profitDesc'),
    icon: TrendingUp,
    color: 'text-emerald-700 dark:text-emerald-400',
    accent: 'bg-emerald-500/50',
    tone: 'hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  });

  return stats;
});

const recentActivity = computed(() => {
  if (isFeatureEnabled('transactions')) {
    return [...transactionStore.transactions].slice(0, 5).map((t) => ({
      id: t.id,
      date: new Date(t.date).toLocaleDateString(locale.value === 'hi' ? 'hi-IN' : 'en-US', { month: 'short', day: 'numeric' }),
      description: t.description,
      type: t.type,
      amount: formatCurrency(t.amount),
      amountClass: t.type === 'Debit' ? 'text-emerald-500' : 'text-foreground',
    }));
  }

  return [...invoiceStore.invoices].slice(0, 5).map((inv: any) => ({
    id: inv.id,
    date: new Date(inv.date || inv.issueDate || inv.createdAt).toLocaleDateString(locale.value === 'hi' ? 'hi-IN' : 'en-US', { month: 'short', day: 'numeric' }),
    description: `${inv.invoiceNumber || 'INV'} • ${inv.customers?.name || inv.customerName || 'Customer'}`,
    type: inv.status || 'Invoice',
    amount: formatCurrency(inv.amount),
    amountClass: inv.status === 'Paid' ? 'text-emerald-500' : 'text-foreground',
  }));
});

const cashFlowData = computed(() => {
  return (dashboardMetrics.value?.cashFlow ?? []).map((entry, id) => ({ id, ...entry }));
});

const maxCashFlow = computed(() => {
  const allValues = cashFlowData.value.flatMap((d) => [d.income, d.expense]);
  return Math.max(...allValues, 1);
});

const accountBalances = computed(() => {
  return transactionStore.uniqueAccounts.map((name) => {
    const balance = transactionStore.getAccountBalance(name);
    return {
      name,
      balance: formatCurrency(Math.abs(balance)),
      isNegative: balance < 0,
      icon: name.toLowerCase().includes('bank') ? Building2 : name.toLowerCase().includes('card') ? CreditCard : Wallet,
    };
  });
});

onMounted(() => {
  dashboardLoading.value = true;
  api.get('/reports/dashboard')
    .then(({ data }) => {
      dashboardMetrics.value = data;
    })
    .catch(() => {
      dashboardMetrics.value = null;
    })
    .finally(() => {
      dashboardLoading.value = false;
    });

  if (isFeatureEnabled('estimates')) {
    estimateStore.fetchEstimates();
  }
  if (isFeatureEnabled('banking') || isFeatureEnabled('transactions')) {
    transactionStore.fetchTransactions();
  }
  if (!isFeatureEnabled('transactions') && isFeatureEnabled('invoices')) {
    invoiceStore.fetchInvoices(1, 10, '', 'All', false);
  }
});
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Dashboard" />

    <main class="flex-1 overflow-y-auto bg-background custom-scrollbar">
      <!-- <ViewGuard module="dashboard" class="h-full"> -->
      <div class="px-8 pt-4 md:pt-5 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full flex flex-col">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Briefcase class="w-6 h-6" />
            </div>
            <div>
              <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {{ $t('dashboard.hello', { name: profile?.full_name?.split(' ')[0] || 'Member' }) }}
              </h1>
              <p class="text-xs md:text-sm text-muted-foreground mt-0.5">{{ $t('dashboard.subtitle') }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Button
              @click="handleCreateInvoice"
              class="h-10 px-5 rounded-xl group font-bold uppercase tracking-wider text-[11px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all"
            >
              <Plus class="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
              {{ $t('topbar.createInvoice') }}
            </Button>
          </div>
        </div>

        <!-- Body Content -->
        <div class="flex-1 space-y-8 min-h-0">
          <!-- Summary Stats -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              v-for="stat in summaryStats"
              :key="stat.title"
              :class="['border-border/60 shadow-2xs overflow-hidden relative group hover:shadow-xs transition-all duration-300 py-0 gap-0 bg-card/50 backdrop-blur-xs', stat.tone]"
            >
              <div :class="['h-[2.5px] w-full', stat.accent]"></div>
              <CardContent class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{{
                    stat.title
                  }}</span>
                  <div :class="['w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105', stat.iconBg]">
                    <component :is="stat.icon" class="w-4 h-4" />
                  </div>
                </div>
                <div class="space-y-1">
                  <h3 class="text-2xl font-bold font-mono text-foreground tracking-tight">{{ stat.amount }}</h3>
                  <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {{ stat.description }}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <!-- Left: Cash Flow & Activity -->
            <div class="lg:col-span-8 space-y-8">
              <Card class="bg-card/60 border border-border/60 shadow-2xs rounded-2xl overflow-hidden">
                <CardHeader class="flex flex-row items-center justify-between border-b border-border/60 bg-card/30 p-5 md:p-6">
                  <div class="space-y-1">
                    <CardTitle class="text-sm md:text-base font-bold text-foreground">{{ $t('dashboard.cashFlow') }}</CardTitle>
                    <CardDescription class="text-xs text-muted-foreground">{{ $t('dashboard.cashFlowDesc') }}</CardDescription>
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                      <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{{ $t('dashboard.income') }}</span>
                    </div>
                    <div v-if="isFeatureEnabled('expenses')" class="flex items-center gap-2">
                      <div class="w-2.5 h-2.5 rounded-full bg-primary"></div>
                      <span class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{{ $t('dashboard.expenses') }}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent class="p-6 md:p-8">
                  <div class="h-64 flex items-end gap-2 md:gap-3 relative px-2">
                    <div class="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none opacity-10">
                      <div v-for="i in 5" :key="i" class="w-full h-px bg-foreground"></div>
                    </div>
                    <div
                      v-for="bar in cashFlowData"
                      :key="bar.id"
                      class="flex-1 flex items-end gap-1 h-full group relative"
                    >
                      <div
                        class="flex-1 bg-emerald-500/40 group-hover:bg-emerald-500 transition-all rounded-t-sm"
                        :style="{ height: `${(bar.income / maxCashFlow) * 100}%` }"
                      ></div>
                      <div
                        v-if="isFeatureEnabled('expenses')"
                        class="flex-1 bg-primary/40 group-hover:bg-primary transition-all rounded-t-sm"
                        :style="{ height: `${(bar.expense / maxCashFlow) * 100}%` }"
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card class="bg-card/60 border border-border/60 shadow-2xs rounded-2xl overflow-hidden">
                <CardHeader class="flex flex-row items-center justify-between border-b border-border/60 bg-card/30 p-5 md:p-6">
                  <div class="space-y-1">
                    <CardTitle class="text-sm md:text-base font-bold text-foreground">
                      {{ isFeatureEnabled('transactions') ? $t('dashboard.recentActivity') : 'Recent Invoices' }}
                    </CardTitle>
                    <CardDescription class="text-xs text-muted-foreground">
                      {{ isFeatureEnabled('transactions') ? $t('dashboard.recentActivityDesc') : 'Latest generated invoices' }}
                    </CardDescription>
                  </div>
                  <router-link :to="isFeatureEnabled('transactions') ? '/transactions' : '/invoices'">
                    <Button variant="ghost" size="sm" class="text-[11px] font-bold uppercase tracking-wider text-primary hover:text-primary/85 hover:bg-primary/8 gap-1 rounded-xl h-8 px-3">
                      {{ $t('dashboard.viewAll') }} <ChevronRight class="w-3.5 h-3.5" />
                    </Button>
                  </router-link>
                </CardHeader>
                <CardContent class="p-0">
                  <div class="overflow-x-auto">
                    <table class="w-full text-left">
                      <tbody class="divide-y divide-border/60">
                        <tr v-for="tx in recentActivity" :key="tx.id" class="hover:bg-muted/50 transition-colors group cursor-pointer">
                          <td class="py-4.5 px-6">
                            <div class="flex flex-col">
                              <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{{
                                tx.date
                              }}</span>
                              <span class="text-xs font-semibold text-foreground group-hover:text-primary transition-colors mt-0.5">{{ tx.description }}</span>
                            </div>
                          </td>
                          <td class="py-4.5 px-6">
                            <span
                              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
                            >
                              {{ tx.type }}
                            </span>
                          </td>
                          <td class="py-4.5 px-6 text-right font-mono text-xs font-bold" :class="tx.amountClass">
                            {{ tx.type === 'Debit' ? '+' : '-' }}{{ tx.amount }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <!-- Right: Accounts & Pipeline -->
            <div class="lg:col-span-4 space-y-8">
              <Card v-if="isFeatureEnabled('banking')" class="bg-card/60 border border-border/60 shadow-2xs rounded-2xl overflow-hidden">
                <CardHeader class="border-b border-border/60 bg-card/30 p-5 md:p-6">
                  <CardTitle class="text-sm md:text-base font-bold text-foreground">{{ $t('dashboard.accountsOverview') }}</CardTitle>
                </CardHeader>
                <CardContent class="p-0">
                  <div class="divide-y divide-border/60">
                    <div
                      v-for="acc in accountBalances"
                      :key="acc.name"
                      class="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer group"
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary group-hover:scale-105 transition-transform"
                        >
                          <component :is="acc.icon" class="w-4 h-4" />
                        </div>
                        <span class="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{{ acc.name }}</span>
                      </div>
                      <span
                        :class="[
                           'text-xs font-bold font-mono',
                          acc.isNegative ? 'text-destructive' : 'text-foreground',
                        ]"
                        >{{ acc.balance }}</span
                      >
                    </div>
                  </div>
                </CardContent>
              </Card>

              <!-- Sales Pipeline -->
              <Card class="bg-card/60 border border-border/60 shadow-2xs rounded-2xl overflow-hidden">
                <CardHeader class="border-b border-border/60 bg-card/30 p-5 md:p-6">
                  <CardTitle class="text-sm md:text-base font-bold text-foreground">{{ $t('dashboard.salesPipeline') }}</CardTitle>
                </CardHeader>
                <CardContent class="p-5 md:p-6 space-y-5">
                  <div v-for="status in ['Sent', 'Accepted']" :key="status" class="space-y-2">
                    <div
                      class="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      <span>{{ status === 'Sent' ? $t('dashboard.sentEstimates') : $t('dashboard.acceptedEstimates') }}</span>
                      <span class="font-mono font-bold text-foreground">{{ estimateStore.estimates.filter((e) => e.status === status).length }}</span>
                    </div>
                    <div class="bg-muted/40 rounded-full overflow-hidden h-2">
                      <div
                        class="h-full bg-primary rounded-full transition-all duration-1000"
                        :style="{
                          width: `${(estimateStore.estimates.filter((e) => e.status === status).length / (estimateStore.estimates.length || 1)) * 100}%`,
                        }"
                      ></div>
                    </div>
                  </div>
                  <div class="pt-3 border-t border-border/60">
                    <p class="text-[10px] text-muted-foreground font-medium italic">
                      {{ $t('dashboard.potential') }}:
                      <span class="font-mono font-bold text-foreground not-italic">
                        {{
                          formatCurrency(
                            estimateStore.estimates
                              .filter((e) => e.status === 'Sent' || e.status === 'Accepted')
                              .reduce((s, e) => s + e.amount, 0),
                          )
                        }}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <!-- </ViewGuard> -->
    </main>
    </div>
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
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: var(--muted-foreground);
}
</style>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Sidebar from '@/components/Sidebar.vue';
import TopBar from '@/components/TopBar.vue';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  Receipt,
  FileText,
  Calculator,
  Briefcase,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronRight,
  Plus,
  ArrowRight,
  IndianRupee,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'vue-sonner';
import { formatCurrency, formatDate } from '@/utils/formatters';
import ViewGuard from '@/components/ViewGuard.vue';
import { useCustomerStore } from '@/stores/customerStore';
import { exportToCsv } from '@/lib/exportUtils';

const route = useRoute();
const router = useRouter();
const customerId = route.params.id as string;
const customerStore = useCustomerStore();

const customer = ref<any>(null);
const loading = ref(true);
const activeTab = ref('Transactions');
const isEditingCustomer = ref(false);

import AddCustomerModal from '@/components/AddCustomerModal.vue';

const tabs = ['Transactions', 'Statements', 'Details'];

const fetchCustomerDetails = async () => {
  try {
    loading.value = true;
    customer.value = await customerStore.fetchCustomerDetails(customerId);
  } catch (err) {
    console.error('Failed to fetch customer details:', err);
    toast.error('Failed to load customer profile');
    router.push('/customers');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchCustomerDetails);

const stats = computed(() => {
  if (!customer.value) return [];
  const s = customer.value.summary;
  return [
    {
      title: 'Outstanding Balance',
      amount: formatCurrency(s.outstandingBalance),
      icon: TrendingUp,
      color: 'text-rose-700 dark:text-rose-400',
      bgColor: 'bg-rose-500/10 border border-rose-500/15',
      accentBar: 'bg-rose-500/50',
      containerClass: 'hover:border-rose-500/40',
    },
    {
      title: 'Total Revenue',
      amount: formatCurrency(s.totalPaid),
      icon: TrendingDown,
      color: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 border border-emerald-500/15',
      accentBar: 'bg-emerald-500/50',
      containerClass: 'hover:border-emerald-500/40',
    },
    {
      title: 'Estimated Profit',
      amount: formatCurrency(s.estimatedProfit),
      icon: TrendingUp,
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 border border-amber-500/15',
      accentBar: 'bg-amber-500/50',
      containerClass: 'hover:border-amber-500/40',
    },
  ];
});

const sortedTransactions = computed(() => {
  if (!customer.value) return [];
  const invoices = customer.value.invoices.map((inv: any) => ({
    ...inv,
    type: 'Invoice',
    date: inv.date,
    amount: inv.amount,
  }));
  const estimates = customer.value.estimates.map((est: any) => ({
    ...est,
    type: 'Estimate',
    date: est.date,
    amount: est.amount,
  }));

  const expenses = customer.value.expenses.map((exp: any) => ({
    ...exp,
    type: 'Expense',
    date: exp.date,
    amount: exp.amount,
  }));

  return [...invoices, ...estimates, ...expenses].sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
});

const statements = computed(() => {
  // Simple statement logic: chronologically combine invoices and estimates
  return sortedTransactions.value;
});

const handleExportStatement = () => {
  if (!statements.value || statements.value.length === 0) {
    toast.error('No statement records to export');
    return;
  }
  const exportData = statements.value.map((s: any) => ({
    Date: s.date ? formatDate(s.date) : '',
    Type: s.type,
    Reference: s.invoiceNumber || s.estimateNumber || s.reference || s.id,
    Amount: s.amount || 0,
    Status: s.status || '',
  }));
  const filename = customer.value?.name ? `statement-${customer.value.name.toLowerCase().replace(/\s+/g, '-')}` : 'customer-statement';
  exportToCsv(exportData, filename);
  toast.success('Account statement exported as CSV');
};
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Customers" />

      <main class="flex-1 overflow-y-auto bg-background flex flex-col">
        <ViewGuard module="customers">
          <div class="px-8 pt-4 md:pt-5 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">
            <!-- Header -->
            <div class="flex flex-col gap-6">
              <button type="button"
                @click="router.push('/customers')"
                class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group w-fit"
              >
                <ArrowLeft class="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span class="text-xs font-bold uppercase tracking-widest">Back to Customers</span>
              </button>

              <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div class="flex items-center gap-6">
                  <div
                    class="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-3xl font-black shadow-inner"
                  >
                    {{ customer?.name?.charAt(0) || 'C' }}
                  </div>
                  <div class="space-y-1">
                    <div class="flex items-center gap-3">
                      <h1 class="ui-page-title">
                        {{ customer?.name || 'Loading...' }}
                      </h1>
                      <div
                        v-if="customer?.gst_number"
                        class="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground border border-border uppercase tracking-widest"
                      >
                        GSTIN: {{ customer.gst_number }}
                      </div>
                      <div
                        v-if="customer?.pan"
                        class="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground border border-border uppercase tracking-widest font-mono"
                      >
                        PAN: {{ customer.pan }}
                      </div>
                    </div>
                    <p class="text-muted-foreground font-medium flex items-center gap-2">
                      <Building2 class="w-4 h-4" />
                      {{ customer?.company || 'Individual Customer' }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <Button
                    @click="isEditingCustomer = true"
                    variant="outline"
                    class="h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] border-border/70 hover:bg-muted/50 transition-all"
                  >
                    Edit Profile
                  </Button>
                  <Button class="h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all gap-2">
                    <Plus class="w-3.5 h-3.5" />
                    New Invoice
                  </Button>
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <template v-if="loading">
                <Card v-for="i in 3" :key="i" class="bg-card/50 border-border/60 shadow-2xs">
                  <CardContent class="p-6">
                    <Skeleton class="h-3 w-24 mb-2" />
                    <Skeleton class="h-8 w-32 mb-2" />
                    <Skeleton class="h-3 w-40" />
                  </CardContent>
                </Card>
              </template>
              <template v-else>
                <Card
                  v-for="stat in stats"
                  :key="stat.title"
                  :class="[
                    'border-border/60 shadow-2xs overflow-hidden relative group hover:border-primary/40 hover:shadow-xs transition-all duration-300 py-0 gap-0',
                    'bg-card/50 backdrop-blur-xs',
                    stat.containerClass,
                  ]"
                >
                  <div :class="['h-[2.5px] w-full', stat.accentBar]"></div>
                  <CardContent class="p-6">
                    <div class="flex items-center justify-between mb-4">
                      <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
                        {{ stat.title }}
                      </span>
                      <div :class="['w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105', stat.bgColor, stat.color]">
                        <component :is="stat.icon" class="w-4 h-4" />
                      </div>
                    </div>
                    <div class="text-2xl font-bold text-foreground mb-1 tracking-tight font-mono">
                      {{ stat.amount }}
                    </div>
                    <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Total Lifetime Value
                    </p>
                  </CardContent>
                </Card>
              </template>
            </div>

            <!-- Main Content Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <!-- Left Column: Details & Contact -->
              <div class="space-y-6">
                <Card class="bg-card/60 border-border/60 shadow-2xs overflow-hidden rounded-2xl">
                  <CardHeader class="border-b border-border/60 bg-card/40 py-3.5 px-6">
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent class="p-6 space-y-6">
                    <div class="space-y-4">
                      <div class="flex items-center gap-4">
                        <div
                          class="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shadow-2xs"
                        >
                          <Mail class="w-4 h-4" />
                        </div>
                        <div>
                          <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                            Email
                          </p>
                          <p class="text-sm font-bold text-foreground">
                            {{ customer?.email || 'No email provided' }}
                          </p>
                        </div>
                      </div>
                      <div class="flex items-center gap-4">
                        <div
                          class="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shadow-2xs"
                        >
                          <Phone class="w-4 h-4" />
                        </div>
                        <div>
                          <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                            Phone
                          </p>
                          <p class="text-sm font-bold text-foreground">
                            {{ customer?.phone || 'No phone provided' }}
                          </p>
                        </div>
                      </div>
                      <div class="flex items-start gap-4">
                        <div
                          class="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs"
                        >
                          <MapPin class="w-4 h-4" />
                        </div>
                        <div>
                          <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                            Billing Address
                          </p>
                          <p class="text-sm font-bold text-foreground leading-relaxed whitespace-pre-line">
                            {{ customer?.address || 'No address provided' }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card class="bg-card/60 border-border/60 shadow-2xs overflow-hidden rounded-2xl">
                  <CardHeader class="border-b border-border/60 bg-card/40 py-3.5 px-6">
                    <CardTitle>Relationship Stats</CardTitle>
                  </CardHeader>
                  <CardContent class="p-6">
                    <div class="space-y-4">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-medium text-muted-foreground">Customer Since</span>
                        <span class="text-xs font-bold text-foreground">{{ formatDate(customer?.created_at) }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-medium text-muted-foreground">Estimated Profit</span>
                        <span class="text-xs font-bold text-primary font-mono">{{
                          formatCurrency(customer?.summary?.estimatedProfit)
                        }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-medium text-muted-foreground">Outstanding Quotes</span>
                        <span class="text-xs font-bold text-foreground">{{ customer?.summary?.estimateCount || 0 }}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <!-- Right Column: Tabs Content -->
              <div class="lg:col-span-2 space-y-6">
                <div class="bg-muted/50 p-1 rounded-xl border border-border/60 flex gap-1 shadow-2xs">
                  <button type="button"
                    v-for="tab in tabs"
                    :key="tab"
                    @click="activeTab = tab"
                    :class="[
                      'flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all',
                      activeTab === tab
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/50',
                    ]"
                  >
                    {{ tab }}
                  </button>
                </div>

                <!-- Transactions Tab -->
                <div
                  v-if="activeTab === 'Transactions'"
                  class="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <div v-if="loading" class="space-y-3">
                    <Skeleton v-for="i in 5" :key="i" class="h-16 w-full rounded-2xl" />
                  </div>
                  <div v-else-if="sortedTransactions.length > 0" class="space-y-3">
                    <div
                      v-for="item in sortedTransactions"
                      :key="item.id"
                      class="p-4 rounded-2xl bg-card/60 border border-border/60 hover:border-primary/40 hover:bg-muted/50 shadow-2xs transition-all flex items-center justify-between group"
                    >
                      <div class="flex items-center gap-4">
                        <div
                          :class="[
                            'w-10 h-10 rounded-xl flex items-center justify-center shadow-2xs',
                            item.type === 'Invoice' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
                          ]"
                        >
                          <component
                            :is="
                              item.type === 'Invoice' ? FileText : item.type === 'Estimate' ? Calculator : TrendingDown
                            "
                            class="w-4 h-4"
                          />
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <p class="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                              {{ item.invoice_number || item.estimate_number }}
                            </p>
                            <span
                              class="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border shadow-2xs"
                              :class="[
                                item.status === 'Paid' || item.status === 'Accepted'
                                  ? 'border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white'
                                  : 'border-transparent bg-secondary text-secondary-foreground',
                              ]"
                            >
                              {{ item.status }}
                            </span>
                          </div>
                          <p class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                            {{ item.type }} • {{ formatDate(item.date) }} •
                            {{
                              item.type === 'Expense'
                                ? item.expense_account
                                : item.invoice_number || item.estimate_number
                            }}
                          </p>
                        </div>
                      </div>
                      <div class="text-right flex items-center gap-4">
                        <div>
                          <p class="text-sm font-bold text-foreground font-mono">
                            {{ formatCurrency(item.amount) }}
                          </p>
                          <p class="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Amount</p>
                        </div>
                        <ChevronRight
                          class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border">
                    <FileText class="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p class="text-sm font-bold text-muted-foreground">No transactions found</p>
                    <p class="text-xs text-muted-foreground/60 mt-1">Start by creating an invoice for this customer.</p>
                  </div>
                </div>

                <!-- Statements Tab -->
                <div
                  v-if="activeTab === 'Statements'"
                  class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <Card class="bg-card border-border/50 overflow-hidden">
                    <CardHeader class="border-b border-border/50 bg-muted/20 py-4">
                      <div class="flex items-center justify-between">
                        <CardTitle>Account Statement</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="h-8 text-[10px] font-bold uppercase tracking-widest gap-2 cursor-pointer hover:bg-muted"
                          @click="handleExportStatement"
                        >
                          <FileText class="w-3 h-3" /> Export Statement
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent class="p-0">
                      <table class="w-full text-left">
                        <thead>
                          <tr class="bg-muted/30 border-b border-border/50">
                            <th
                              class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                            >
                              Date
                            </th>
                            <th
                              class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                            >
                              Reference
                            </th>
                            <th
                              class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right"
                            >
                              Amount
                            </th>
                            <th
                              class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right"
                            >
                              Balance
                            </th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-border/30">
                          <tr
                            v-for="(item, index) in statements"
                            :key="item.id"
                            class="hover:bg-muted/20 transition-colors"
                          >
                            <td class="px-6 py-4 text-xs font-bold">{{ formatDate(item.date) }}</td>
                            <td class="px-6 py-4">
                              <p class="text-xs font-bold">{{ item.invoice_number || item.estimate_number }}</p>
                              <p class="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                {{ item.type }}
                              </p>
                            </td>
                            <td class="px-6 py-4 text-xs font-black text-right">{{ formatCurrency(item.amount) }}</td>
                            <td class="px-6 py-4 text-xs font-black text-right text-primary">
                              {{
                                formatCurrency(statements.slice(index).reduce((sum, s) => sum + Number(s.amount), 0))
                              }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>



                <!-- Details Tab -->
                <div
                  v-if="activeTab === 'Details'"
                  class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <Card class="bg-card border-border/50 overflow-hidden">
                    <CardHeader class="border-b border-border/50 bg-muted/20 py-4">
                      <CardTitle>Full Business Details</CardTitle>
                    </CardHeader>
                    <CardContent class="p-6">
                      <div class="grid sm:grid-cols-2 gap-8">
                        <div class="space-y-6">
                          <div>
                            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                              Legal Name
                            </p>
                            <p class="text-sm font-bold">{{ customer?.name }}</p>
                          </div>
                          <div>
                            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                              Company / Trade Name
                            </p>
                            <p class="text-sm font-bold">{{ customer?.company || 'N/A' }}</p>
                          </div>
                          <div>
                            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                              GST Treatment
                            </p>
                            <p class="text-sm font-bold">
                              {{ customer?.gstTreatment || customer?.gst_treatment || 'N/A' }}
                            </p>
                          </div>
                          <div v-if="customer?.gstNumber || customer?.gst_number">
                            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                              GST Identification Number
                            </p>
                            <p class="text-sm font-mono font-bold text-primary">
                              {{ customer?.gstNumber || customer?.gst_number }}
                            </p>
                          </div>
                          <div>
                            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                              Payment Terms
                            </p>
                            <p class="text-sm font-bold">{{ customer?.paymentTerms || 'N/A' }}</p>
                          </div>
                          <div>
                            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                              Currency
                            </p>
                            <p class="text-sm font-bold">{{ customer?.currency || 'N/A' }}</p>
                          </div>
                          <div>
                            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                              Website
                            </p>
                            <p class="text-sm font-bold">{{ customer?.website || 'N/A' }}</p>
                          </div>
                        </div>
                        <div class="space-y-6">
                          <div>
                            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                              General Address
                            </p>
                            <p class="text-sm font-bold leading-relaxed">{{ customer?.address || 'N/A' }}</p>
                          </div>
                          <div>
                            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                              Billing Address
                            </p>
                            <p class="text-sm font-bold leading-relaxed whitespace-pre-line">
                              {{ customer?.billingAddress || 'N/A' }}
                            </p>
                          </div>
                          <div>
                            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                              Shipping Address
                            </p>
                            <p class="text-sm font-bold leading-relaxed whitespace-pre-line">
                              {{ customer?.shippingAddress || 'N/A' }}
                            </p>
                          </div>
                          <div>
                            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                              Internal Notes
                            </p>
                            <p
                              class="text-xs text-muted-foreground leading-relaxed whitespace-pre-line"
                              :class="{ 'italic text-muted-foreground/60': !customer?.notes }"
                            >
                              {{ customer?.notes || 'No internal notes added for this customer.' }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </ViewGuard>
      </main>
    </div>

    <AddCustomerModal
      :open="isEditingCustomer"
      :customer="customer"
      @close="isEditingCustomer = false"
      @success="fetchCustomerDetails"
    />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}
</style>

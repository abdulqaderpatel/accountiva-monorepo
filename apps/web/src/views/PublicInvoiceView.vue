<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import { 
  Printer, 
  Copy, 
  Check, 
  FileText, 
  AlertCircle, 
  Building2, 
  Calendar, 
  CreditCard, 
  ExternalLink,
  ShieldCheck,
  Download
} from 'lucide-vue-next';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import InvoiceTemplate from '@/components/InvoiceTemplate.vue';
import { formatCurrency, formatDate, getInvoiceStatusInfo } from '@/utils/formatters';

const route = useRoute();

const loading = ref(true);
const error = ref<string | null>(null);
const invoice = ref<any | null>(null);
const organization = ref<any | null>(null);
const copied = ref(false);
const selectedTemplate = ref<'standard' | 'modern' | 'minimal' | 'premium'>('standard');

const settings = ref({
  showLogo: true,
  showOrgName: true,
  showOrgAddress: true,
  showGSTIN: true,
  showInvoiceNumber: true,
  showDate: true,
  showDueDate: true,
  showClientCompany: true,
  showClientAddress: true,
  showItemDescription: true,
  showQuantity: true,
  showRate: true,
  showTax: true,
  showSubtotal: true,
  showFooter: true,
});

const templates = [
  { id: 'standard', name: 'Standard' },
  { id: 'modern', name: 'Modern' },
  { id: 'minimal', name: 'Minimal' },
  { id: 'premium', name: 'Premium' },
] as const;

const fetchPublicInvoice = async () => {
  const invoiceId = route.params.id as string;
  if (!invoiceId) {
    error.value = 'Invalid or missing invoice reference.';
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const { data } = await api.get(`/invoices/public/${invoiceId}`);
    if (data?.invoice) {
      invoice.value = data.invoice;
      organization.value = data.organization || {};
      
      // Set document title
      document.title = `Invoice #${data.invoice.invoiceNumber} | ${data.organization?.name || 'Accountiva'}`;
    } else {
      error.value = 'Invoice details could not be found.';
    }
  } catch (err: any) {
    console.error('Error loading public invoice:', err);
    if (err.response?.status === 404) {
      error.value = 'This invoice does not exist or the link may have expired.';
    } else {
      error.value = 'Unable to load invoice details. Please try again later.';
    }
  } finally {
    loading.value = false;
  }
};

const handlePrint = () => {
  window.print();
};

const handleCopyLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copied.value = true;
    toast.success('Invoice link copied to clipboard');
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    toast.error('Failed to copy link');
  }
};

const statusInfo = computed(() => {
  if (!invoice.value) return { label: 'Invoice', variant: 'default' as const };
  const rawStatus = invoice.value.status;
  const dueDate = invoice.value.dueDate;
  const isOverdue = dueDate && new Date(dueDate) < new Date() && rawStatus !== 'Paid';
  
  if (rawStatus === 'Paid') return { label: 'Paid', variant: 'success' as const };
  if (isOverdue) return { label: 'Overdue', variant: 'danger' as const };
  if (rawStatus === 'Draft') return { label: 'Draft', variant: 'draft' as const };
  return { label: 'Outstanding', variant: 'warning' as const };
});

onMounted(() => {
  fetchPublicInvoice();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50/80 dark:bg-slate-950 text-foreground flex flex-col antialiased">
    <!-- Top Bar / Action Header (Hidden in Print) -->
    <header class="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border print:hidden shadow-xs">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <!-- Brand / Identity -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <FileText class="size-4 text-primary" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-sm truncate">{{ organization?.name || 'Accountiva Invoice' }}</span>
              <Badge v-if="invoice" :variant="statusInfo.variant" size="sm" shape="pill">
                {{ statusInfo.label }}
              </Badge>
            </div>
            <p v-if="invoice?.invoiceNumber" class="text-xs text-muted-foreground truncate">
              Invoice #{{ invoice.invoiceNumber }}
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 shrink-0">
          <!-- Template Selector (Desktop) -->
          <div class="hidden sm:flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
            <button
              v-for="tmpl in templates"
              :key="tmpl.id"
              type="button"
              class="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
              :class="selectedTemplate === tmpl.id ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'"
              @click="selectedTemplate = tmpl.id"
            >
              {{ tmpl.name }}
            </button>
          </div>

          <!-- Copy Link -->
          <Button
            variant="outline"
            size="sm"
            class="h-9 gap-1.5"
            @click="handleCopyLink"
          >
            <Check v-if="copied" class="size-3.5 text-emerald-600" />
            <Copy v-else class="size-3.5" />
            <span class="hidden sm:inline">{{ copied ? 'Copied' : 'Copy Link' }}</span>
          </Button>

          <!-- Print / Download PDF -->
          <Button
            variant="default"
            size="sm"
            class="h-9 gap-1.5 shadow-xs"
            @click="handlePrint"
          >
            <Printer class="size-3.5" />
            <span>Print / PDF</span>
          </Button>
        </div>
      </div>
    </header>

    <!-- Content Area -->
    <main class="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start">
      <!-- Loading State -->
      <div v-if="loading" class="flex-1 flex flex-col items-center justify-center py-24 text-center">
        <Spinner size="lg" class="mb-4 text-primary" />
        <p class="text-sm font-medium text-muted-foreground animate-pulse">Loading online invoice details...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex-1 flex items-center justify-center py-16">
        <div class="max-w-md w-full bg-card p-8 rounded-xl border border-border shadow-sm text-center">
          <div class="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
            <AlertCircle class="size-6" />
          </div>
          <h2 class="text-lg font-bold mb-2">Invoice Not Accessible</h2>
          <p class="text-sm text-muted-foreground mb-6 leading-relaxed">
            {{ error }}
          </p>
          <div class="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50">
            If you believe this is an error, please reach out directly to the sender who issued this invoice.
          </div>
        </div>
      </div>

      <!-- Invoice Content -->
      <div v-else-if="invoice" class="space-y-6">
        <!-- Document Wrapper -->
        <div class="invoice-paper bg-white rounded-xl shadow-md border border-slate-200/80 overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
          <InvoiceTemplate
            :invoice="invoice"
            :organization="organization"
            :template-id="selectedTemplate"
            :settings="settings"
          />
        </div>

        <!-- Optional Organization Contact / Payment Note Footer (Screen Only) -->
        <div class="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground print:hidden">
          <div class="flex items-center gap-3">
            <div class="size-8 rounded-md bg-muted flex items-center justify-center text-foreground shrink-0">
              <ShieldCheck class="size-4" />
            </div>
            <div>
              <p class="font-medium text-foreground">Verified Accountiva Document</p>
              <p class="text-muted-foreground text-[11px]">Issued securely on behalf of {{ organization?.name }}</p>
            </div>
          </div>

          <div v-if="invoice.status !== 'Paid'" class="flex items-center gap-2 text-[11px]">
            <span>Amount Due:</span>
            <span class="font-bold text-sm text-foreground">{{ formatCurrency(invoice.amount) }}</span>
          </div>
        </div>
      </div>
    </main>

    <!-- Public View Footer (Hidden on Print) -->
    <footer class="py-6 border-t border-border bg-background/50 text-center text-xs text-muted-foreground print:hidden">
      <div class="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>&copy; {{ new Date().getFullYear() }} {{ organization?.name || 'Accountiva' }}. All rights reserved.</p>
        <p class="flex items-center gap-1">
          Powered by <span class="font-semibold text-foreground">Accountiva™</span>
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@media print {
  /* Hide unnecessary elements during print */
  :deep(header),
  :deep(footer),
  .print\:hidden {
    display: none !important;
  }

  /* Reset main background and layout for printer paper */
  body,
  .min-h-screen,
  main {
    background: #ffffff !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .invoice-paper {
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
  }
}
</style>


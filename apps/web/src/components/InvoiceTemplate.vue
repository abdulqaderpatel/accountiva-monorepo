<script setup lang="ts">
import { computed } from 'vue';
import { formatCurrency, formatDate, getInvoiceStatusInfo } from '@/utils/formatters';

interface InvoiceItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  status: string;
  items?: InvoiceItem[];
  customers?: {
    name: string;
    email?: string;
    address?: string;
    company?: string;
  };
  taxPercent?: number;
  taxAmount?: number;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  customFields?: Array<{
    name: string;
    value: any;
    printOnDocument?: boolean;
    dataType?: string;
  }> | Record<string, any>;
}

interface Organization {
  name: string;
  logo_url?: string;
  large_logo_url?: string;
  address?: string;
  gstin?: string;
}

interface TemplateSettings {
  showLogo: boolean;
  showOrgName: boolean;
  showOrgAddress: boolean;
  showGSTIN: boolean;
  showInvoiceNumber: boolean;
  showDate: boolean;
  showDueDate: boolean;
  showClientCompany: boolean;
  showClientAddress: boolean;
  showItemDescription: boolean;
  showQuantity: boolean;
  showRate: boolean;
  showTax: boolean;
  showSubtotal: boolean;
  showFooter: boolean;
}

import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();

const props = defineProps<{
  invoice: Invoice;
  organization: Organization;
  templateId: 'standard' | 'modern' | 'minimal' | 'premium';
  settings: TemplateSettings;
  showWatermark?: boolean;
}>();

const shouldShowWatermark = computed(() => {
  if (typeof props.showWatermark === 'boolean') {
    return props.showWatermark;
  }
  return authStore.currentOrganization?.plan !== 'pro';
});

const invoiceItems = computed(() => {
  if (props.invoice.items && props.invoice.items.length > 0) {
    return props.invoice.items;
  }
  // Fallback/Mock item if none provided
  return [
    {
      id: '1',
      name: 'Services Rendered',
      description: 'Project consultancy and development',
      quantity: 1,
      rate: props.invoice.amount,
      amount: props.invoice.amount,
    },
  ];
});

const subtotal = computed(() => {
  return invoiceItems.value.reduce((acc, item) => acc + Number(item.amount), 0);
});

const tax = computed(() => {
  if (props.invoice.taxAmount !== undefined && props.invoice.taxAmount !== null && Number(props.invoice.taxAmount) > 0) {
    return Number(props.invoice.taxAmount);
  }
  if (props.invoice.taxPercent !== undefined && props.invoice.taxPercent !== null && Number(props.invoice.taxPercent) > 0) {
    return (subtotal.value * Number(props.invoice.taxPercent)) / 100;
  }
  if (props.invoice.amount !== undefined && Number(props.invoice.amount) > subtotal.value) {
    return Number(props.invoice.amount) - subtotal.value;
  }
  return 0;
});

const discount = computed(() => {
  if (props.invoice.discountAmount !== undefined && props.invoice.discountAmount !== null && Number(props.invoice.discountAmount) > 0) {
    return Number(props.invoice.discountAmount);
  }
  if (props.invoice.discountType === 'percentage' && props.invoice.discountValue !== undefined && Number(props.invoice.discountValue) > 0) {
    return (subtotal.value * Number(props.invoice.discountValue)) / 100;
  }
  if (props.invoice.discountType === 'fixed' && props.invoice.discountValue !== undefined && Number(props.invoice.discountValue) > 0) {
    return Number(props.invoice.discountValue);
  }
  return 0;
});

const total = computed(() => {
  if (props.invoice.amount !== undefined && props.invoice.amount !== null && Number(props.invoice.amount) > 0) {
    return Number(props.invoice.amount);
  }
  return subtotal.value + tax.value;
});
const documentLogoUrl = computed(() =>
  props.organization?.large_logo_url || props.organization?.logo_url,
);

const printableCustomFields = computed(() => {
  if (!props.invoice.customFields) return [];
  if (Array.isArray(props.invoice.customFields)) {
    return props.invoice.customFields.filter(
      (f: any) =>
        f.printOnDocument !== false &&
        f.value !== null &&
        f.value !== undefined &&
        f.value !== ''
    );
  }
  return [];
});

</script>

<template>
  <div class="invoice-container" :class="[`template-${templateId}`]">
    <!-- Standard Template -->
    <div v-if="templateId === 'standard'" class="p-8 bg-white text-slate-800 font-sans shadow-sm rounded-lg border border-slate-100">
      <div class="flex justify-between items-start mb-12">
        <div>
          <img v-if="documentLogoUrl && settings.showLogo" :src="documentLogoUrl" alt="Logo" class="h-12 mb-4 object-contain" />
          <h1 v-if="settings.showOrgName" class="text-2xl font-bold text-slate-900 uppercase tracking-tighter">{{ organization?.name }}</h1>
          <p v-if="settings.showOrgAddress" class="text-xs text-slate-500 whitespace-pre-line max-w-[250px]">{{ organization?.address }}</p>
          <p v-if="organization?.gstin && settings.showGSTIN" class="text-[10px] font-bold text-slate-400 mt-1 uppercase">GSTIN: {{ organization?.gstin }}</p>
        </div>
        <div class="text-right">
          <h2 class="text-4xl font-light text-slate-300 uppercase tracking-widest mb-4">Invoice</h2>
          <p v-if="settings.showInvoiceNumber" class="text-sm font-bold text-slate-700">#{{ invoice.invoiceNumber }}</p>
          <p v-if="settings.showDate" class="text-xs text-slate-500">Date: {{ formatDate(invoice.date) }}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-12 mb-12 border-y border-slate-50 py-8">
        <div>
          <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Bill To:</h3>
          <p class="text-sm font-bold text-slate-800">{{ invoice.customers?.name }}</p>
          <p v-if="invoice.customers?.company && settings.showClientCompany" class="text-xs text-slate-600">{{ invoice.customers?.company }}</p>
          <p v-if="settings.showClientAddress" class="text-xs text-slate-500 whitespace-pre-line mt-1">{{ invoice.customers?.address }}</p>
        </div>
        <div class="text-right">
          <h3 v-if="settings.showDueDate" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Due Date:</h3>
          <p v-if="settings.showDueDate" class="text-sm font-bold text-slate-800">{{ formatDate(invoice.dueDate) }}</p>
          <div
            class="mt-4 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border shadow-xs"
            :class="getInvoiceStatusInfo(invoice.status, invoice.dueDate).colorClass"
          >
            Status: {{ getInvoiceStatusInfo(invoice.status, invoice.dueDate).label }}
          </div>
          <div v-if="printableCustomFields.length > 0" class="mt-4 pt-3 border-t border-slate-100 space-y-1">
            <div v-for="cf in printableCustomFields" :key="cf.name" class="text-xs">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1.5">{{ cf.name }}:</span>
              <span class="font-bold text-slate-700">{{ typeof cf.value === 'boolean' ? (cf.value ? 'Yes' : 'No') : cf.value }}</span>
            </div>
          </div>
        </div>
      </div>

      <table class="w-full mb-12">
        <thead>
          <tr class="border-b-2 border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <th class="py-4 text-left">Description</th>
            <th v-if="settings.showQuantity" class="py-4 text-right w-12">Qty</th>
            <th v-if="settings.showRate" class="py-4 text-right w-28 pr-6">Rate</th>
            <th class="py-4 text-right w-28">Amount</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="item in invoiceItems" :key="item.id">
            <td class="py-4">
              <p class="text-sm font-bold text-slate-800">{{ item.name || item.itemName }}</p>
              <p v-if="settings.showItemDescription" class="text-xs text-slate-400 mt-0.5">{{ item.description }}</p>
            </td>
            <td v-if="settings.showQuantity" class="py-4 text-right text-sm text-slate-600 w-12">{{ item.quantity }}</td>
            <td v-if="settings.showRate" class="py-4 text-right text-sm text-slate-600 w-28 pr-6">{{ formatCurrency(item.rate) }}</td>
            <td class="py-4 text-right text-sm font-bold text-slate-800 w-28">{{ formatCurrency(item.amount) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="flex justify-end">
        <div class="w-64 space-y-3">
          <div v-if="settings.showSubtotal" class="flex justify-between text-xs">
            <span class="text-slate-400 font-bold uppercase tracking-wider">Subtotal</span>
            <span class="text-slate-700 font-bold">{{ formatCurrency(subtotal) }}</span>
          </div>
          <div v-if="discount > 0" class="flex justify-between text-xs">
            <span class="text-slate-400 font-bold uppercase tracking-wider">
              Discount<template v-if="invoice.discountType === 'percentage' && invoice.discountValue"> ({{ invoice.discountValue }}%)</template>
            </span>
            <span class="text-slate-700 font-bold">- {{ formatCurrency(discount) }}</span>
          </div>
          <div v-if="settings.showTax" class="flex justify-between text-xs">
            <span class="text-slate-400 font-bold uppercase tracking-wider">GST (18%)</span>
            <span class="text-slate-700 font-bold">{{ formatCurrency(tax) }}</span>
          </div>
          <div class="h-px bg-slate-100 my-2"></div>
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</span>
            <span class="text-xl font-black text-slate-900">{{ formatCurrency(total) }}</span>
          </div>
        </div>
      </div>

      <div v-if="settings.showFooter" class="mt-24 pt-8 border-t border-slate-100">
        <p class="text-[10px] text-slate-400 font-medium leading-relaxed italic text-center">
          Thank you for your business. Please make payment by the due date to avoid any late fees.
        </p>
      </div>
    </div>

    <!-- Modern Template -->
    <div v-else-if="templateId === 'modern'" class="bg-white min-h-[600px] shadow-lg rounded-2xl overflow-hidden font-sans border border-slate-100">
      <div class="bg-slate-900 p-10 text-white flex justify-between items-end">
        <div>
          <div v-if="settings.showLogo || settings.showOrgName" class="bg-white/10 p-4 rounded-xl backdrop-blur-md inline-block mb-6">
              <img v-if="documentLogoUrl && settings.showLogo" :src="documentLogoUrl" alt="Logo" class="h-10 filter invert brightness-0" />
              <span v-else-if="settings.showOrgName" class="text-xl font-black tracking-tighter">{{ organization?.name }}</span>
          </div>
          <h1 class="text-5xl font-black uppercase tracking-tight opacity-20 mb-2 leading-none">Invoice</h1>
          <div class="flex gap-6 text-[10px] font-bold uppercase tracking-widest opacity-60">
            <span v-if="settings.showInvoiceNumber">#{{ invoice.invoiceNumber }}</span>
            <span v-if="settings.showDate">Issued: {{ formatDate(invoice.date) }}</span>
          </div>
        </div>
        <div class="text-right">
          <div class="text-4xl font-black mb-1">{{ formatCurrency(total) }}</div>
          <div class="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">Total Due</div>
        </div>
      </div>

      <div class="p-10 grid grid-cols-3 gap-10">
        <div class="col-span-2">
           <div class="bg-slate-50 p-6 rounded-2xl h-full border border-slate-100">
              <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Recipient</h3>
              <p class="text-lg font-bold text-slate-900">{{ invoice.customers?.name }}</p>
              <p v-if="settings.showClientAddress" class="text-sm text-slate-500 mt-1 leading-relaxed">{{ invoice.customers?.address || 'No address provided' }}</p>
           </div>
        </div>
        <div class="flex flex-col justify-between py-2">
           <div v-if="settings.showDueDate">
              <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Date</h3>
              <p class="text-sm font-bold text-slate-900">{{ formatDate(invoice.dueDate) }}</p>
           </div>
           <div v-if="printableCustomFields.length > 0" class="pt-3 mt-3 border-t border-slate-100 space-y-1.5">
              <div v-for="cf in printableCustomFields" :key="cf.name">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{{ cf.name }}</span>
                <span class="text-xs font-bold text-slate-800">{{ typeof cf.value === 'boolean' ? (cf.value ? 'Yes' : 'No') : cf.value }}</span>
              </div>
           </div>
           <div v-if="settings.showOrgAddress" class="pt-4 mt-4 border-t border-slate-100">
              <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company</h3>
              <p class="text-xs font-bold text-slate-700 leading-tight">{{ organization?.name }}</p>
              <p class="text-[10px] text-slate-400 mt-1">{{ organization?.address }}</p>
           </div>
        </div>
      </div>

      <div class="px-10 mb-10">
        <div class="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <table class="w-full text-left">
            <thead class="bg-slate-50 border-b border-slate-100">
              <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th class="py-4 px-6">Item Description</th>
                <th v-if="settings.showQuantity" class="py-4 px-6 text-center">Qty</th>
                <th v-if="settings.showRate" class="py-4 px-6 text-right">Price</th>
                <th class="py-4 px-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in invoiceItems" :key="item.id" class="text-sm hover:bg-slate-50/50 transition-colors">
                <td class="py-5 px-6">
                  <p class="font-bold text-slate-800">{{ item.name || item.itemName }}</p>
                  <p v-if="settings.showItemDescription" class="text-[10px] text-slate-400 mt-0.5">{{ item.description }}</p>
                </td>
                <td v-if="settings.showQuantity" class="py-5 px-6 text-center text-slate-600 font-medium">{{ item.quantity }}</td>
                <td v-if="settings.showRate" class="py-5 px-6 text-right text-slate-600">{{ formatCurrency(item.rate) }}</td>
                <td class="py-5 px-6 text-right font-bold text-slate-900">{{ formatCurrency(item.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="p-10 bg-slate-50 flex justify-between items-center border-t border-slate-100">
        <div v-if="settings.showFooter" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic max-w-[300px]">
          Please remit payment within 30 days. Payments can be made via bank transfer or online portal.
        </div>
        <div class="text-right space-y-1">
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grand Total</div>
          <div class="text-3xl font-black text-slate-900">{{ formatCurrency(total) }}</div>
        </div>
      </div>
    </div>

    <!-- Minimal Template -->
    <div v-else-if="templateId === 'minimal'" class="p-12 bg-white text-gray-900 font-mono text-xs max-w-2xl mx-auto shadow-sm border border-gray-100">
      <div class="border-b border-gray-100 pb-8 mb-8 flex justify-between items-start">
        <div>
          <h1 v-if="settings.showOrgName" class="text-lg font-bold">{{ organization?.name }}</h1>
          <p v-if="settings.showOrgAddress" class="mt-1 opacity-60 max-w-[200px]">{{ organization?.address }}</p>
        </div>
        <div class="text-right">
          <p v-if="settings.showInvoiceNumber" class="font-bold">INVOICE #{{ invoice.invoiceNumber }}</p>
          <p v-if="settings.showDate" class="mt-1 opacity-60">{{ formatDate(invoice.date) }}</p>
        </div>
      </div>

      <div class="mb-12 flex justify-between items-start">
        <div>
          <p class="text-[10px] font-bold uppercase mb-2 opacity-30">Customer</p>
          <p class="font-bold">{{ invoice.customers?.name }}</p>
          <p v-if="settings.showClientAddress" class="mt-1 opacity-60">{{ invoice.customers?.address }}</p>
        </div>
        <div v-if="printableCustomFields.length > 0" class="text-right space-y-1">
          <div v-for="cf in printableCustomFields" :key="cf.name">
            <span class="text-[9px] uppercase opacity-40 font-bold block">{{ cf.name }}</span>
            <span class="font-bold">{{ typeof cf.value === 'boolean' ? (cf.value ? 'Yes' : 'No') : cf.value }}</span>
          </div>
        </div>
      </div>

      <div class="space-y-4 mb-12">
        <div class="border-b border-gray-50 pb-2 text-[10px] font-bold uppercase opacity-30 flex justify-between">
          <span>Description</span>
          <div class="flex gap-12">
             <span v-if="settings.showQuantity" class="w-16 text-right">Qty</span>
             <span class="w-24 text-right">Total</span>
          </div>
        </div>
        <div v-for="item in invoiceItems" :key="item.id" class="flex justify-between items-start">
          <div class="flex-1 pr-8 text-[11px]">
            <p class="font-bold">{{ item.name || item.itemName }}</p>
            <p v-if="settings.showItemDescription" class="mt-1 opacity-50 leading-relaxed">{{ item.description }}</p>
          </div>
          <div class="flex gap-12">
            <span v-if="settings.showQuantity" class="w-16 text-right opacity-60">{{ item.quantity }}</span>
            <span class="w-24 text-right font-bold">{{ formatCurrency(item.amount) }}</span>
          </div>
        </div>
      </div>

      <div class="border-t border-gray-100 pt-8 flex justify-end">
        <div class="w-48 space-y-2">
           <div v-if="settings.showSubtotal" class="flex justify-between opacity-50">
             <span>Subtotal</span>
             <span>{{ formatCurrency(subtotal) }}</span>
           </div>
           <div v-if="discount > 0" class="flex justify-between opacity-50">
             <span>Discount<template v-if="invoice.discountType === 'percentage' && invoice.discountValue"> ({{ invoice.discountValue }}%)</template></span>
             <span>- {{ formatCurrency(discount) }}</span>
           </div>
           <div v-if="settings.showTax" class="flex justify-between opacity-50">
             <span>Tax</span>
             <span>{{ formatCurrency(tax) }}</span>
           </div>
           <div class="flex justify-between font-bold text-sm pt-2 border-t border-gray-50 mt-2">
             <span>Total</span>
             <span>{{ formatCurrency(total) }}</span>
           </div>
        </div>
      </div>

      <div v-if="settings.showFooter" class="mt-20 pt-8 border-t border-gray-50 opacity-30 text-[9px] uppercase tracking-widest text-center">
        Thank you for your support. Accountiva / {{ new Date().getFullYear() }}
      </div>
    </div>

    <!-- Premium Template -->
    <div v-else-if="templateId === 'premium'" class="bg-slate-50 p-1 rounded-lg shadow-2xl overflow-hidden border border-slate-200">
      <div class="bg-white border-[12px] border-slate-900 p-12 min-h-[700px] flex flex-col font-serif">
        <div class="flex justify-between items-start mb-20">
          <div>
            <div class="mb-8">
               <img v-if="documentLogoUrl && settings.showLogo" :src="documentLogoUrl" alt="Logo" class="h-16 object-contain" />
               <h1 v-else-if="settings.showOrgName" class="text-3xl font-black italic tracking-tighter text-slate-900">{{ organization?.name }}</h1>
            </div>
            <div v-if="settings.showOrgAddress" class="text-sm italic text-slate-500 max-w-xs leading-relaxed">
              {{ organization?.address }}
            </div>
          </div>
          <div class="text-right">
             <h2 class="text-6xl font-black text-slate-100 uppercase -mt-2 mb-4 leading-none select-none">Invoice</h2>
             <div class="space-y-1 mt-[-20px]">
                <p v-if="settings.showInvoiceNumber" class="text-sm font-bold text-slate-900">Reference: {{ invoice.invoiceNumber }}</p>
                <p v-if="settings.showDate" class="text-sm text-slate-500">Date: {{ formatDate(invoice.date) }}</p>
                <p v-if="settings.showDueDate" class="text-sm text-slate-500">Due: {{ formatDate(invoice.dueDate) }}</p>
             </div>
          </div>
        </div>

        <div class="mb-16 flex justify-between items-start border-l-4 border-slate-900 pl-8">
           <div>
             <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-4">Prepared For</h3>
             <p class="text-2xl font-bold text-slate-900">{{ invoice.customers?.name }}</p>
             <p v-if="invoice.customers?.company && settings.showClientCompany" class="text-sm text-slate-600 mt-2 font-medium">{{ invoice.customers?.company }}</p>
             <p v-if="settings.showClientAddress" class="text-sm text-slate-500 mt-1 max-w-sm leading-relaxed">{{ invoice.customers?.address }}</p>
           </div>
           <div v-if="printableCustomFields.length > 0" class="text-right space-y-2">
              <div v-for="cf in printableCustomFields" :key="cf.name">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] block">{{ cf.name }}</span>
                <span class="text-sm font-bold text-slate-800">{{ typeof cf.value === 'boolean' ? (cf.value ? 'Yes' : 'No') : cf.value }}</span>
              </div>
           </div>
        </div>

        <div class="flex-1">
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-900/10 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                <th class="py-4 text-left">Description</th>
                <th v-if="settings.showRate" class="py-4 text-right">Price</th>
                <th class="py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in invoiceItems" :key="item.id">
                <td class="py-8">
                  <p class="text-lg font-bold text-slate-800">{{ item.name || item.itemName }}</p>
                  <p v-if="settings.showItemDescription" class="text-sm italic text-slate-400 mt-1">{{ item.description }}</p>
                </td>
                <td v-if="settings.showRate" class="py-8 text-right text-sm text-slate-600">{{ formatCurrency(item.rate) }} <span v-if="settings.showQuantity">x {{ item.quantity }}</span></td>
                <td class="py-8 text-right text-lg font-bold text-slate-900">{{ formatCurrency(item.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-12 flex justify-between items-end border-t-2 border-slate-900 pt-8">
           <div class="text-[10px] font-bold text-slate-300 uppercase tracking-[0.5em] rotate-180 [writing-mode:vertical-lr] hidden sm:block">
              Accountiva Premium
           </div>
           <div class="w-full sm:w-72 space-y-4">
              <div v-if="settings.showSubtotal" class="flex justify-between text-sm italic text-slate-500">
                <span>Subtotal</span>
                <span>{{ formatCurrency(subtotal) }}</span>
              </div>
              <div v-if="discount > 0" class="flex justify-between text-sm italic text-slate-500">
                <span>Discount<template v-if="invoice.discountType === 'percentage' && invoice.discountValue"> ({{ invoice.discountValue }}%)</template></span>
                <span>- {{ formatCurrency(discount) }}</span>
              </div>
              <div v-if="settings.showTax" class="flex justify-between text-sm italic text-slate-500 pb-4 border-b border-slate-100">
                <span>Tax (GST 18%)</span>
                <span>{{ formatCurrency(tax) }}</span>
              </div>
              <div class="flex justify-between items-center pt-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grand Total</span>
                <span class="text-4xl font-black text-slate-900">{{ formatCurrency(total) }}</span>
              </div>
           </div>
        </div>
      </div>
    </div>

    <!-- Free Tier Watermark -->
    <div
      v-if="shouldShowWatermark"
      class="mt-10 pt-4 border-t border-slate-100/80 text-center text-xs text-slate-400 font-medium select-none flex items-center justify-center gap-1.5"
    >
      <span>Powered by</span>
      <span class="font-bold tracking-tight text-slate-700">Accountiva</span>
    </div>
  </div>
</template>

<style scoped>
.invoice-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

/* Ensure font-serif uses a premium font if available, fallback to system serif */
.template-premium {
  font-family: 'Playfair Display', Georgia, serif;
}

@media print {
  .invoice-container {
    box-shadow: none !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: none !important;
    border: none !important;
  }
}
</style>

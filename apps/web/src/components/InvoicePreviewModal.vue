<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { 
  X, 
  Printer, 
  Mail, 
  Layout, 
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings2,
  Bookmark as BookmarkIcon,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import InvoiceTemplate from './InvoiceTemplate.vue';
import { useAuthStore } from '@/stores/authStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  open: boolean;
  invoice: any;
}>();

const emit = defineEmits(['close']);

const authStore = useAuthStore();
const { t } = useI18n();
const activeTab = ref<'templates' | 'properties'>('templates');
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
  { id: 'standard', name: 'Template 1', description: 'Traditional & Professional' },
  { id: 'modern', name: 'Template 2', description: 'Sleek & Bold' },
  { id: 'minimal', name: 'Template 3', description: 'Clean & Simple' },
  { id: 'premium', name: 'Template 4', description: 'Elegant & Sophisticated' },
] as const;

const bookmarkStore = useBookmarkStore();

const isBookmarked = computed(() => {
  if (!props.invoice?.id) return false;
  return bookmarkStore.isBookmarked('invoice', props.invoice.id);
});

const toggleBookmark = () => {
  if (!props.invoice?.id) return;
  const customerName = props.invoice.customers?.name || props.invoice.customerName || '';
  bookmarkStore.toggleBookmark({
    entity_type: 'invoice',
    entity_id: props.invoice.id,
    title: props.invoice.invoiceNumber || 'Invoice',
    subtitle: customerName,
    route: '/invoices',
    metadata: {
      amount: props.invoice.amount,
      status: props.invoice.status,
      date: props.invoice.dueDate,
      customerName,
    },
  });
};

const close = () => {
  emit('close');
};

const handlePrint = () => {
  window.print();
};

</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl animate-in fade-in duration-300">
    <div class="w-full h-full flex flex-col md:flex-row overflow-hidden">
      
      <!-- Sidebar / Template Selector -->
      <div class="w-full md:w-80 bg-card border-b md:border-b-0 md:border-r border-border flex flex-col shadow-2xl z-10">
        <div class="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold leading-tight tracking-tight text-foreground">{{ t('modals.preview.title') }}</h2>
            <p class="ui-section-description mt-1">{{ t('modals.preview.subtitle') }}</p>
          </div>
          <div class="flex items-center gap-1 md:hidden">
            <button
              type="button"
              @click="toggleBookmark"
              :class="[
                'p-2 rounded-full transition-colors',
                isBookmarked ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10' : 'text-muted-foreground hover:bg-muted'
              ]"
              :title="isBookmarked ? 'Remove bookmark' : 'Bookmark invoice'"
            >
              <BookmarkIcon :class="['w-5 h-5', isBookmarked ? 'fill-blue-500 text-blue-500' : '']" />
            </button>
            <button type="button" @click="close" class="p-2 hover:bg-muted rounded-full transition-colors">
              <X class="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <!-- Tab Selector -->
        <div class="px-6 py-2 border-b border-border bg-muted/30 flex gap-2">
           <button type="button"
             @click="activeTab = 'templates'"
             :class="['flex-1 rounded-lg py-2 text-xs font-semibold transition-all', activeTab === 'templates' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground']"
           >
             {{ t('modals.preview.tabs.layouts') }}
           </button>
           <button type="button"
             @click="activeTab = 'properties'"
             :class="['flex-1 rounded-lg py-2 text-xs font-semibold transition-all', activeTab === 'properties' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground']"
           >
             {{ t('modals.preview.tabs.properties') }}
           </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <div v-if="activeTab === 'templates'" class="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1 block mb-2">{{ t('modals.preview.chooseLayout') }}</label>
            <div class="grid grid-cols-1 gap-3">
              <button type="button"
                v-for="template in templates" 
                :key="template.id"
                @click="selectedTemplate = template.id"
                :class="[
                  'w-full text-left p-4 rounded-2xl border-2 transition-all group relative overflow-hidden',
                  selectedTemplate === template.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/30'
                ]"
              >
                <div class="flex items-center justify-between relative z-10">
                  <div>
                    <p class="text-xs font-bold" :class="selectedTemplate === template.id ? 'text-primary' : 'text-foreground'">{{ t(`modals.preview.layouts.${template.id}.name`) }}</p>
                    <p class="text-[10px] text-muted-foreground mt-0.5">{{ t(`modals.preview.layouts.${template.id}.description`) }}</p>
                  </div>
                  <div v-if="selectedTemplate === template.id" class="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check class="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Properties Tab -->
          <div v-else-if="activeTab === 'properties'" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div class="space-y-4">
               <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{{ t('modals.preview.headers.headerOrg') }}</label>
               <div class="space-y-3">
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showLogo">{{ t('modals.preview.properties.showLogo') }}</Label>
                    <Switch id="showLogo" v-model="settings.showLogo" />
                  </div>
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showOrgName">{{ t('modals.preview.properties.showOrgName') }}</Label>
                    <Switch id="showOrgName" v-model="settings.showOrgName" />
                  </div>
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showOrgAddress">{{ t('modals.preview.properties.showOrgAddress') }}</Label>
                    <Switch id="showOrgAddress" v-model="settings.showOrgAddress" />
                  </div>
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showGSTIN">{{ t('modals.preview.properties.showGSTIN') }}</Label>
                    <Switch id="showGSTIN" v-model="settings.showGSTIN" />
                  </div>
               </div>
            </div>

            <div class="space-y-4">
               <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{{ t('modals.preview.headers.invoiceDetails') }}</label>
               <div class="space-y-3">
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showInvoiceNumber">{{ t('modals.preview.properties.invoiceNumber') }}</Label>
                    <Switch id="showInvoiceNumber" v-model="settings.showInvoiceNumber" />
                  </div>
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showDate">{{ t('modals.preview.properties.issuedDate') }}</Label>
                    <Switch id="showDate" v-model="settings.showDate" />
                  </div>
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showDueDate">{{ t('modals.preview.properties.dueDate') }}</Label>
                    <Switch id="showDueDate" v-model="settings.showDueDate" />
                  </div>
               </div>
            </div>

            <div class="space-y-4">
               <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{{ t('modals.preview.headers.clientDetails') }}</label>
               <div class="space-y-3">
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showClientCompany">{{ t('modals.preview.properties.clientCompany') }}</Label>
                    <Switch id="showClientCompany" v-model="settings.showClientCompany" />
                  </div>
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showClientAddress">{{ t('modals.preview.properties.clientAddress') }}</Label>
                    <Switch id="showClientAddress" v-model="settings.showClientAddress" />
                  </div>
               </div>
            </div>

            <div class="space-y-4">
               <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{{ t('modals.preview.headers.tableSummary') }}</label>
               <div class="space-y-3">
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showItemDescription">{{ t('modals.preview.properties.itemDescription') }}</Label>
                    <Switch id="showItemDescription" v-model="settings.showItemDescription" />
                  </div>
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showQuantity">{{ t('modals.preview.properties.quantity') }}</Label>
                    <Switch id="showQuantity" v-model="settings.showQuantity" />
                  </div>
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showRate">{{ t('modals.preview.properties.rate') }}</Label>
                    <Switch id="showRate" v-model="settings.showRate" />
                  </div>
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showTax">{{ t('modals.preview.properties.tax') }}</Label>
                    <Switch id="showTax" v-model="settings.showTax" />
                  </div>
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showSubtotal">{{ t('modals.preview.properties.subtotal') }}</Label>
                    <Switch id="showSubtotal" v-model="settings.showSubtotal" />
                  </div>
               </div>
            </div>

            <div class="space-y-4">
               <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{{ t('modals.preview.headers.footer') }}</label>
               <div class="space-y-3">
                  <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/20 border border-border/50">
                    <Label class="text-xs font-medium cursor-pointer" for="showFooter">{{ t('modals.preview.properties.footerNotes') }}</Label>
                    <Switch id="showFooter" v-model="settings.showFooter" />
                  </div>
               </div>
            </div>
          </div>

          <div class="space-y-4 pt-6 border-t border-border">
            <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1 block mb-2">{{ t('modals.preview.quickActions') }}</label>
            <div class="space-y-2">
               <Button @click="handlePrint" variant="outline" class="w-full justify-start h-11 rounded-xl gap-3 border-border font-bold text-xs">
                 <Printer class="w-4 h-4 text-muted-foreground" />
                 {{ t('modals.preview.print') }}
               </Button>
               <Button variant="outline" class="w-full justify-start h-11 rounded-xl gap-3 border-border font-bold text-xs opacity-50 cursor-not-allowed">
                 <Mail class="w-4 h-4 text-muted-foreground" />
                 {{ t('modals.preview.sendEmail') }}
               </Button>
            </div>
          </div>
        </div>

        <div class="p-6 border-t border-border mt-auto">
          <Button @click="close" class="w-full h-11 rounded-xl font-bold uppercase tracking-widest text-[10px]">
            {{ t('modals.preview.backToDashboard') }}
          </Button>
        </div>
      </div>

      <!-- Preview Area -->
      <div class="flex-1 bg-muted/30 overflow-y-auto p-4 md:p-12 lg:p-20 relative">
        <div class="absolute top-6 right-8 hidden md:flex items-center gap-1.5 bg-background/80 backdrop-blur-md border border-border/60 shadow-sm rounded-full p-1 z-20">
          <Button
            @click="toggleBookmark"
            variant="ghost"
            size="icon"
            :class="[
              'rounded-full size-9 transition-all',
              isBookmarked
                ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            ]"
            :title="isBookmarked ? 'Remove bookmark' : 'Bookmark invoice'"
          >
            <BookmarkIcon :class="['size-4 transition-transform active:scale-125', isBookmarked ? 'fill-blue-500 text-blue-500' : '']" />
          </Button>
          <Button
            @click="handlePrint"
            variant="ghost"
            size="icon"
            class="rounded-full size-9 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            title="Print invoice"
          >
            <Printer class="size-4" />
          </Button>
          <div class="w-px h-4 bg-border/60 mx-0.5" />
          <Button
            @click="close"
            variant="ghost"
            size="icon"
            class="rounded-full size-9 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            title="Close"
          >
            <X class="size-4" />
          </Button>
        </div>

        <div class="max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-500">
           <!-- Template Rendering -->
           <InvoiceTemplate 
             :invoice="invoice" 
             :organization="authStore.currentOrganization" 
             :template-id="selectedTemplate" 
             :settings="settings"
           />
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@media print {
  .fixed {
    position: relative !important;
    background: white !important;
  }
  .md\:w-80, .md\:hidden, .absolute {
    display: none !important;
  }
  .flex-1 {
    padding: 0 !important;
    background: white !important;
  }
}
</style>

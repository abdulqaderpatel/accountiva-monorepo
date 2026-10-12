<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ChevronDown,
  Loader2,
  Receipt,
  FileText,
  TrendingUp,
  HelpCircle,
  AlertTriangle,
  Box,
  Briefcase,
  FileCheck,
  PieChart,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowUpRight,
  Users,
  Paperclip,
  UploadCloud,
  ImageIcon,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { useInvoiceStore } from '@/stores/invoiceStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useCustomerStore } from '@/stores/customerStore';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'vue-sonner';
import { useAccountivaLogo } from '@/composables/useAccountivaLogo';
import aiMascotSrc from '@/assets/ai-mascot.png';
import api from '@/lib/api';

const { accountivaLogoSrc } = useAccountivaLogo();
const router = useRouter();
const invoiceStore = useInvoiceStore();
const expenseStore = useExpenseStore();
const customerStore = useCustomerStore();

interface AttachmentFile {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  mimeType: string;
  size: number;
  previewUrl: string;
  base64Data: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any[];
  dataType?: string;
  attachments?: { name: string; type: 'image' | 'pdf'; previewUrl: string }[];
}

const isOpen = ref(false);
const message = ref('');
const messages = ref<ChatMessage[]>([]);
const isLoading = ref(false);
const chatContainer = ref<HTMLElement | null>(null);

// Multi-modal upload state
const attachments = ref<AttachmentFile[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const authStore = useAuthStore();
const route = useRoute();

const showChatbot = computed(() => {
  return (
    authStore.isAuthenticated &&
    route.path !== '/onboarding' &&
    route.name !== 'PublicInvoiceView'
  );
});

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const fetchHistory = async () => {
  const currentOrgId = authStore.currentOrganization?.id;
  if (!currentOrgId) return;

  try {
    const response = await api.get(`/chat/history/${currentOrgId}`);
    const historyMessages = response.data.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      data: Array.isArray(msg.data) ? msg.data : (msg.data ? [msg.data] : undefined),
      dataType: msg.data_type,
      timestamp: new Date(msg.created_at),
    }));

    messages.value = [
      {
        role: 'assistant',
        content:
          "Hi! I'm your Accountiva Assistant. How can I help you today? You can ask me questions or upload receipts & invoices (Images or PDFs) for me to analyze.",
        timestamp: new Date(),
        dataType: 'none',
      },
      ...historyMessages,
    ];
    await scrollToBottom();
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
  }
};

onMounted(() => {
  fetchHistory();
});

watch(
  () => authStore.currentOrganization?.id,
  () => {
    fetchHistory();
  },
);

// Truncate file name for display (e.g. "Receipt_102...pdf")
const truncateFileName = (fileName: string, maxLength = 14) => {
  if (fileName.length <= maxLength) return fileName;
  const extIndex = fileName.lastIndexOf('.');
  if (extIndex !== -1 && fileName.length - extIndex <= 5) {
    const ext = fileName.substring(extIndex);
    const base = fileName.substring(0, maxLength - ext.length - 3);
    return `${base}...${ext}`;
  }
  return `${fileName.substring(0, maxLength - 3)}...`;
};

// File validation and base64 conversion
const processFile = (file: File) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    toast.error('Invalid file format', {
      description: 'Please upload images (.png, .jpg, .jpeg) or documents (.pdf).',
    });
    return;
  }

  const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSizeInBytes) {
    toast.error('File size limit exceeded', {
      description: `File "${file.name}" exceeds the 10MB limit.`,
    });
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const base64Data = reader.result as string;
    const isPdf = file.type.toLowerCase() === 'application/pdf';
    attachments.value.push({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      type: isPdf ? 'pdf' : 'image',
      mimeType: file.type,
      size: file.size,
      previewUrl: isPdf ? '' : base64Data,
      base64Data,
    });
  };
  reader.readAsDataURL(file);
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    Array.from(target.files).forEach((file) => processFile(file));
    target.value = '';
  }
};

const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

const removeAttachment = (id: string) => {
  attachments.value = attachments.value.filter((att) => att.id !== id);
};

// Drag & Drop handlers
let dragCounter = 0;
const handleDragEnter = (e: DragEvent) => {
  e.preventDefault();
  dragCounter++;
  if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
    isDragging.value = true;
  }
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0) {
    isDragging.value = false;
  }
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
  dragCounter = 0;

  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    Array.from(e.dataTransfer.files).forEach((file) => processFile(file));
  }
};

const handleSend = async () => {
  const hasText = message.value.trim().length > 0;
  const hasAttachments = attachments.value.length > 0;

  if ((!hasText && !hasAttachments) || isLoading.value) return;

  const userMessage = message.value.trim();
  const currentAttachments = [...attachments.value];

  // Push user message to UI state
  messages.value.push({
    role: 'user',
    content: userMessage || `[Uploaded ${currentAttachments.length} file(s)]`,
    attachments: currentAttachments.map((a) => ({
      name: a.name,
      type: a.type,
      previewUrl: a.previewUrl,
    })),
    timestamp: new Date(),
  });

  const currentOrgId = authStore.currentOrganization?.id;

  if (!currentOrgId) {
    messages.value.push({
      role: 'assistant',
      content: 'Please select an organization first to use the assistant.',
      timestamp: new Date(),
    });
    message.value = '';
    attachments.value = [];
    return;
  }

  // Get chat history BEFORE the new message
  const chatHistory = messages.value.slice(-7, -1).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  message.value = '';
  attachments.value = [];
  await scrollToBottom();

  isLoading.value = true;
  try {
    const payloadAttachments = currentAttachments.map((att) => ({
      name: att.name,
      mimeType: att.mimeType,
      data: att.base64Data,
    }));

    const response = await api.post('/chat', {
      message: userMessage,
      organizationId: currentOrgId,
      history: chatHistory,
      attachments: payloadAttachments,
    });

    if (response.data.actionExecuted) {
      const dt = (response.data.dataType || '').toLowerCase();
      if (dt.includes('invoice')) {
        invoiceStore.fetchInvoices(1, 10, '', 'All', true);
        customerStore.fetchCustomers(true);
        toast.success('Invoices Created', {
          description: 'Accountiva AI created the invoices and refreshed your table.',
        });
      } else if (dt.includes('expense')) {
        expenseStore.fetchExpenses(1, 10, '', true);
        toast.success('Expense Recorded', {
          description: 'Accountiva AI logged the expense and refreshed your records.',
        });
      } else if (dt.includes('customer')) {
        customerStore.fetchCustomers(true);
        toast.success('Customer Added', {
          description: 'Accountiva AI saved the customer profile.',
        });
      } else {
        toast.success('Action Executed', {
          description: 'Accountiva AI performed the requested database action.',
        });
      }
    }

    const normalizedData = Array.isArray(response.data.data)
      ? response.data.data
      : (response.data.data ? [response.data.data] : undefined);

    messages.value.push({
      role: 'assistant',
      content: response.data.message,
      data: normalizedData,
      dataType: response.data.dataType,
      timestamp: new Date(),
    });
  } catch (error: any) {
    messages.value.push({
      role: 'assistant',
      content: error.response?.data?.error || "I'm sorry, I'm having trouble connecting to my brain right now.",
      timestamp: new Date(),
    });
  } finally {
    isLoading.value = false;
    await scrollToBottom();
  }
};

const navigateToInvoices = () => {
  isOpen.value = false;
  router.push('/invoices');
};

const suggestions = [
  { label: 'Financial Summary', icon: PieChart },
  { label: 'Overdue Invoices', icon: AlertTriangle },
  { label: 'Top Customers', icon: Users },
  { label: 'Unpaid Balance', icon: Wallet },
  { label: 'Recent Estimates', icon: FileCheck },
];

const toggleChat = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    scrollToBottom();
  }
};

const handleSuggestion = (label: string) => {
  message.value = label;
  handleSend();
};
</script>

<template>
  <div
    v-if="showChatbot"
    class="fixed bottom-24 lg:bottom-6 right-6 z-[100] flex flex-col items-end gap-4 print:hidden"
  >
    <!-- Chat Window -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="translate-y-4 opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="relative w-[420px] max-w-[calc(100vw-3rem)] h-[620px] max-h-[calc(100vh-10rem)] bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col mb-2"
        @dragenter="handleDragEnter"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <!-- Drag Overlay -->
        <div
          v-if="isDragging"
          class="absolute inset-0 z-50 bg-card/95 border-2 border-dashed border-primary rounded-3xl backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in fade-in zoom-in duration-150"
        >
          <div class="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-lg shadow-primary/10">
            <UploadCloud class="w-8 h-8 animate-bounce" />
          </div>
          <div>
            <h4 class="text-sm font-black uppercase tracking-wider text-foreground">Drop Document / Receipt</h4>
            <p class="text-xs text-muted-foreground mt-1">Upload images (.png, .jpg) or PDFs up to 10MB</p>
          </div>
        </div>

        <!-- Header -->
        <div class="p-5 bg-primary/5 border-b border-border flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-card flex items-center justify-center overflow-hidden border border-border/80 shadow-xs relative"
            >
              <img :src="aiMascotSrc" alt="Accountiva AI Mascot" class="w-8 h-8 object-contain" />
              <span class="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-card"></span>
            </div>
            <div>
              <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                Accountiva AI
                <span
                  class="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-black border border-primary/20"
                  >BETA</span
                >
              </h3>
              <p class="text-[10px] text-muted-foreground font-bold">Your accounting & receipt assistant</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            @click="isOpen = false"
            class="rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X class="w-4 h-4" />
          </Button>
        </div>

        <!-- Chat Area -->
        <div ref="chatContainer" class="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar scroll-smooth">
          <!-- Welcome Hero Banner if only 1 message -->
          <div
            v-if="messages.length <= 1"
            class="text-center py-4 px-3 rounded-2xl bg-primary/[0.03] border border-primary/10 flex flex-col items-center space-y-2 mb-2"
          >
            <div class="w-16 h-16 rounded-full bg-card p-1 border border-border shadow-md flex items-center justify-center relative">
              <img :src="aiMascotSrc" alt="Accountiva AI Mascot" class="w-14 h-14 object-contain" />
              <span class="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-card"></span>
              </span>
            </div>
            <div>
              <h4 class="text-xs font-black uppercase tracking-wider text-foreground">Meet Your AI Assistant</h4>
              <p class="text-[11px] text-muted-foreground max-w-xs mt-0.5">
                Ask questions about your finances, generate invoices, or drag & drop receipts to parse automatically.
              </p>
            </div>
          </div>

          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '']"
          >
            <div
              :class="[
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden',
                msg.role === 'assistant'
                  ? 'bg-card border-border/80 p-0.5 shadow-2xs'
                  : 'bg-muted border-border text-muted-foreground',
              ]"
            >
              <img v-if="msg.role === 'assistant'" :src="aiMascotSrc" alt="Accountiva AI" class="w-full h-full object-contain" />
              <User v-else class="w-4 h-4" />
            </div>

            <div :class="['space-y-2 max-w-[80%]', msg.role === 'user' ? 'text-right' : '']">
              <!-- Render User Message Attachments if present -->
              <div
                v-if="msg.attachments && msg.attachments.length > 0"
                class="flex flex-wrap gap-2 justify-end mb-1"
              >
                <div
                  v-for="(att, aIdx) in msg.attachments"
                  :key="aIdx"
                  class="flex items-center gap-2 p-1.5 rounded-xl bg-card border border-border/80 text-xs shadow-xs"
                >
                  <img
                    v-if="att.type === 'image' && att.previewUrl"
                    :src="att.previewUrl"
                    class="w-8 h-8 rounded-lg object-cover border border-border/50"
                  />
                  <div v-else class="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                    <FileText class="w-4 h-4" />
                  </div>
                  <span class="text-[11px] font-bold text-foreground truncate max-w-[100px]">{{ truncateFileName(att.name) }}</span>
                </div>
              </div>

              <!-- Message Content -->
              <div
                :class="[
                  'p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-xs whitespace-pre-wrap',
                  msg.role === 'assistant'
                    ? 'bg-muted/50 border border-border text-foreground rounded-tl-none'
                    : 'bg-primary text-primary-foreground rounded-tr-none font-semibold',
                ]"
              >
                {{ msg.content }}
              </div>

              <!-- Structured Data Queries Rendering -->
              <div v-if="msg.data && msg.data.length > 0" class="mt-3 space-y-2 text-left">
                <!-- Financial Summary Widget -->
                <div v-if="msg.dataType === 'financial_summary'" class="grid grid-cols-1 gap-2">
                  <div
                    v-for="item in msg.data"
                    :key="item.id"
                    class="p-3 rounded-xl bg-card border border-border/60 flex items-center justify-between"
                  >
                    <span class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{{ item.name }}</span>
                    <span
                      :class="[
                        'text-xs font-black',
                        item.id === 'profit'
                          ? (item.amount >= 0 ? 'text-emerald-500' : 'text-rose-500')
                          : (item.id === 'revenue' ? 'text-emerald-500' : 'text-rose-500'),
                      ]"
                    >
                      {{ formatCurrency(item.amount) }}
                    </span>
                  </div>
                </div>

                <!-- Generic Record Cards List -->
                <div v-else class="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  <div
                    v-for="(item, dIdx) in msg.data"
                    :key="dIdx"
                    class="p-3 rounded-xl bg-card border border-border/60 hover:border-primary/50 transition-colors text-xs space-y-1.5 shadow-2xs group"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5 truncate max-w-[200px]">
                        <FileText v-if="msg.dataType === 'invoice' || item.invoiceNumber || item.invoice_number" class="w-3.5 h-3.5 text-primary shrink-0" />
                        <span class="font-bold text-foreground truncate">
                          {{ item.invoiceNumber || item.invoice_number || item.name || item.estimate_number || item.description || 'Record' }}
                        </span>
                      </div>
                      <span v-if="item.amount !== undefined || item.total !== undefined" class="font-black text-primary shrink-0 font-mono">
                        {{ formatCurrency(item.amount ?? item.total) }}
                      </span>
                    </div>

                    <div class="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span class="truncate max-w-[170px] font-medium">{{ item.customerName || item.customers?.name || item.company || item.category || '' }}</span>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <span v-if="item.status" class="px-1.5 py-0.5 rounded-full bg-muted font-bold text-foreground">
                          {{ item.status }}
                        </span>
                        <button
                          v-if="msg.dataType === 'invoice' || item.invoiceNumber || item.invoice_number"
                          type="button"
                          @click="navigateToInvoices"
                          class="p-1 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors inline-flex items-center"
                          title="Open Invoices"
                        >
                          <ArrowUpRight class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p class="text-[9px] text-muted-foreground font-bold uppercase tracking-widest px-1">
                {{ msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
              </p>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading" class="flex gap-3">
            <div
              class="w-8 h-8 rounded-xl bg-card border border-border/80 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs"
            >
              <img :src="aiMascotSrc" alt="Accountiva AI" class="w-full h-full object-contain animate-pulse" />
            </div>
            <div class="p-4 rounded-2xl bg-muted/50 border border-border rounded-tl-none flex items-center gap-2">
              <div class="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
              <div class="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div class="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              <span class="text-xs font-bold text-muted-foreground ml-1">Analyzing...</span>
            </div>
          </div>
        </div>

        <!-- Footer / Input Area -->
        <div class="p-4 bg-muted/30 border-t border-border space-y-3 shrink-0">
          <!-- Suggestions -->
          <div v-if="messages.length < 4" class="flex flex-wrap gap-1.5">
            <button
              type="button"
              v-for="sug in suggestions"
              :key="sug.label"
              @click="handleSuggestion(sug.label)"
              class="px-2.5 py-1 rounded-lg bg-card border border-border text-[10px] font-black uppercase tracking-wider hover:border-primary hover:text-primary transition-all flex items-center gap-1.5 active:scale-95"
            >
              <component :is="sug.icon" class="w-3 h-3" />
              {{ sug.label }}
            </button>
          </div>

          <!-- ATTACHMENT PREVIEW AREA -->
          <div v-if="attachments.length > 0" class="flex flex-wrap gap-2 pt-1">
            <div
              v-for="att in attachments"
              :key="att.id"
              class="flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-card border border-border text-xs shadow-xs group"
            >
              <!-- Thumbnail for Images -->
              <img
                v-if="att.type === 'image' && att.previewUrl"
                :src="att.previewUrl"
                class="w-7 h-7 rounded-lg object-cover border border-border/50"
              />
              <!-- Document Icon for PDFs -->
              <div v-else class="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                <FileText class="w-3.5 h-3.5" />
              </div>

              <!-- Truncated File Name -->
              <span class="text-[11px] font-bold text-foreground truncate max-w-[110px]">
                {{ truncateFileName(att.name) }}
              </span>

              <!-- Dismiss Button -->
              <button
                type="button"
                @click="removeAttachment(att.id)"
                class="w-4 h-4 rounded-full bg-muted hover:bg-destructive/20 hover:text-destructive text-muted-foreground flex items-center justify-center transition-colors ml-1"
              >
                <X class="w-3 h-3" />
              </button>
            </div>
          </div>

          <!-- Hidden File Input -->
          <input
            type="file"
            ref="fileInput"
            accept=".png,.jpg,.jpeg,.pdf"
            multiple
            class="hidden"
            @change="handleFileSelect"
          />

          <!-- Form Input Bar -->
          <form @submit.prevent="handleSend" class="relative flex items-center gap-2">
            <!-- Paperclip Upload Button -->
            <Button
              type="button"
              variant="outline"
              size="icon"
              :disabled="isLoading"
              @click="triggerFileInput"
              title="Attach Image or PDF receipt"
              class="h-11 w-11 rounded-2xl border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-primary transition-all shrink-0"
            >
              <Paperclip class="w-4 h-4" />
            </Button>

            <!-- Text Input -->
            <Input
              v-model="message"
              placeholder="Ask anything or attach a receipt..."
              :disabled="isLoading"
              class="pr-12 h-11 rounded-2xl border-border/50 bg-card focus:ring-primary/20 focus:border-primary transition-all text-xs font-medium flex-1"
            />

            <!-- Send Button -->
            <Button
              type="submit"
              size="icon"
              :disabled="(!message.trim() && attachments.length === 0) || isLoading"
              class="absolute right-1 top-1 h-9 w-9 rounded-xl hover:scale-[1.05] active:scale-[0.95] transition-all bg-primary text-primary-foreground shadow-sm"
            >
              <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
              <Send v-else class="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Toggle Button -->
    <Button
      @click="toggleChat"
      class="w-14 h-14 rounded-2xl flex items-center justify-center p-0 hover:scale-[1.06] active:scale-[0.95] transition-all group bg-card border border-border/80 shadow-xl relative overflow-hidden"
      aria-label="Toggle Accountiva AI Assistant"
    >
      <Transition mode="out-in">
        <div v-if="!isOpen" class="w-full h-full flex items-center justify-center relative">
          <img
            :src="aiMascotSrc"
            alt="Accountiva AI Mascot"
            class="w-10 h-10 object-contain rounded-full relative z-10 drop-shadow-xs group-hover:scale-110 transition-transform duration-200"
          />
          <span class="absolute top-2 right-2 flex h-2.5 w-2.5 z-20">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-card"></span>
          </span>
        </div>
        <ChevronDown v-else class="w-6 h-6 relative z-10 text-foreground" />
      </Transition>
    </Button>
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
  background: hsl(var(--muted-foreground) / 0.1);
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.2);
}
</style>

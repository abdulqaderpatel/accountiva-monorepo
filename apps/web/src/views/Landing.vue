<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from '@/composables/useTheme';
import { useAuthStore } from '@/stores/authStore';
import { useAccountivaLogo } from '@/composables/useAccountivaLogo';
import aiMascotSrc from '@/assets/ai-mascot.png';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
  FileText,
  TrendingUp,
  Building2,
  Users,
  ShieldCheck,
  Scale,
  FileSpreadsheet,
  UploadCloud,
  Bot,
  Send,
  PieChart,
  HelpCircle,
  CheckCircle2,
  Wallet,
  CreditCard,
  ArrowUpRight,
  Lock,
  Layers,
  FileCheck,
  RefreshCw,
  Clock,
  Briefcase,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Calendar,
  Eye,
  RotateCcw
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const router = useRouter();
const { theme, setTheme } = useTheme();
const { accountivaLogoSrc } = useAccountivaLogo();
const authStore = useAuthStore();

// Mobile navigation menu state
const isMenuOpen = ref(false);

// FAQ Accordion state
const activeFaq = ref<number | null>(0);
const toggleFaq = (index: number) => {
  activeFaq.value = activeFaq.value === index ? null : index;
};

// Navigation helper
const navigateToAuth = (path: '/login' | '/signup') => {
  if (authStore.session) {
    router.push('/dashboard');
  } else {
    router.push(path);
  }
};

// Core Modules Interactive Tabs
type ModuleTab = 'invoices' | 'creditNotes' | 'ledger' | 'reports';
const activeModuleTab = ref<ModuleTab>('invoices');

// Interactive AI Assistant Simulator State
interface AiScenario {
  id: string;
  userPrompt: string;
  responseHeadline: string;
  responseBody: string;
  actionType: 'overdue' | 'draftInvoice' | 'pnl';
}

const aiScenarios: AiScenario[] = [
  {
    id: 'overdue',
    userPrompt: 'Which client invoices are overdue right now?',
    responseHeadline: 'Found 2 overdue invoices',
    responseBody: 'Here are the invoices that have passed their due date. Total overdue amount is ₹42,700.',
    actionType: 'overdue',
  },
  {
    id: 'draftInvoice',
    userPrompt: 'Create a draft invoice for Acme Corp for 5 licenses at ₹12,000 each',
    responseHeadline: 'Draft Invoice Prepared',
    responseBody: 'Prepared invoice #INV-2026-044 for Acme Corporation with 18% GST. Ready to review and issue.',
    actionType: 'draftInvoice',
  },
  {
    id: 'pnl',
    userPrompt: "What is our total invoiced revenue and receivables this month?",
    responseHeadline: 'Monthly Revenue Summary',
    responseBody: 'Your business billed ₹3,85,000 across 14 clients, with ₹3,42,800 already collected.',
    actionType: 'pnl',
  },
];

type SimulationStage = 'typing' | 'thinking' | 'answered';

const selectedScenarioIndex = ref(0);
const simulationStage = ref<SimulationStage>('answered');
const currentInputText = ref('');
const displayedUserPrompt = ref(aiScenarios[0].userPrompt);
const displayedScenario = ref<AiScenario>(aiScenarios[0]);

let typingInterval: ReturnType<typeof setInterval> | null = null;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;
let thinkingTimeout: ReturnType<typeof setTimeout> | null = null;

const cancelActiveSimulation = () => {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }
  if (thinkingTimeout) {
    clearTimeout(thinkingTimeout);
    thinkingTimeout = null;
  }
};

onUnmounted(() => {
  cancelActiveSimulation();
});

const selectScenario = (index: number) => {
  cancelActiveSimulation();

  selectedScenarioIndex.value = index;
  const targetScenario = aiScenarios[index];

  // Stage 1: Clear chat and actively type into the bottom input box
  simulationStage.value = 'typing';
  currentInputText.value = '';
  displayedUserPrompt.value = '';
  displayedScenario.value = targetScenario;

  const fullPrompt = targetScenario.userPrompt;
  let charIndex = 0;

  // Character-by-character typing simulation (~22ms per keystroke)
  typingInterval = setInterval(() => {
    if (charIndex < fullPrompt.length) {
      currentInputText.value += fullPrompt.charAt(charIndex);
      charIndex++;
    } else {
      if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
      }

      // Stage 2: Brief pause after typing completes, then "send" into the chat
      typingTimeout = setTimeout(() => {
        currentInputText.value = '';
        displayedUserPrompt.value = fullPrompt;
        simulationStage.value = 'thinking';

        // Stage 3: Think for 2 seconds (2000ms) then reveal AI response & rich card
        thinkingTimeout = setTimeout(() => {
          simulationStage.value = 'answered';
        }, 2000);
      }, 350);
    }
  }, 36);
};

// FAQs content in clear, jargon-free language
const faqs = [
  {
    question: 'Do I need an accounting degree or bookkeeping experience?',
    answer:
      'Not at all. Accountiva is specifically built for founders, freelancers, and growing businesses. When you create an invoice or issue a credit note, Accountiva automatically handles the bookkeeping balances and GST records in the background.',
  },
  {
    question: 'How does the Accountiva AI Assistant work?',
    answer:
      'The AI assistant is built right into your workspace. It can answer natural questions about your billing (like "Who owes me money?", "What is my total billed revenue this month?"), and draft invoices with line items and taxes directly upon your review.',
  },
  {
    question: 'Is my financial data safe and private?',
    answer:
      'Yes, absolutely. Your financial data is encrypted in transit and at rest. Your private records are strictly isolated to your organization and are never used to train public AI models. Only invited members with authorized roles can access your workspace.',
  },
  {
    question: 'Can I invite my team members or accountant?',
    answer:
      'Yes. You can invite team members with specific roles (Owner, Admin, Member). For example, you can give members permission to create draft invoices and estimates while restricting critical billing settings.',
  },
  {
    question: 'Can I customize invoice branding and tax settings?',
    answer:
      'Yes. You can upload your company logo, set your primary currency, configure GSTIN, choose custom invoice color accents, and define payment instructions and notes for your clients.',
  },
  {
    question: 'Can I export my records anytime?',
    answer:
      'Yes. You own your data 100%. All invoices, credit notes, estimates, customer lists, and product catalogs can be exported with a single click to CSV or JSON formats.',
  },
  {
    question: 'Can I try Accountiva for free?',
    answer:
      'Yes. You can create a free account with full access to all core features—including invoicing, estimates, credit notes, and the AI assistant. No credit card is required to get started.',
  },
];
</script>

<template>
  <div class="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans antialiased relative overflow-x-hidden">
    <!-- Subtle Background Grid Pattern -->
    <div
      class="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none -z-10"
    ></div>

    <!-- NAVIGATION HEADER -->
    <header class="sticky top-0 w-full z-50 border-b border-border/80 bg-background/90 backdrop-blur-md transition-colors">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        <!-- Logo -->
        <button
          type="button"
          class="flex items-center gap-2.5 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          @click="router.push('/')"
          aria-label="Accountiva Home"
        >
          <div class="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-sm border border-border/60 bg-card">
            <img
              :src="accountivaLogoSrc"
              alt="Accountiva Logo"
              class="w-full h-full object-contain p-1"
            />
          </div>
          <span class="text-lg font-bold tracking-tight text-foreground">
            Accountiva<span class="text-primary text-xs ml-0.5 align-super">™</span>
          </span>
        </button>

        <!-- Desktop Navigation Links -->
        <nav class="hidden md:flex items-center gap-7" aria-label="Main Navigation">
          <a href="#features" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#ai-assistant" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            AI Assistant
          </a>
          <a href="#modules" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Core Modules</a>
          <a href="#workflow" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#faqs" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQs</a>
        </nav>

        <!-- Right Action Utilities -->
        <div class="hidden md:flex items-center gap-3">
          <!-- Theme Selector -->
          <div class="flex items-center gap-0.5 bg-muted/60 p-1 rounded-lg border border-border/80">
            <button
              type="button"
              v-for="t in (['light', 'dark', 'system'] as const)"
              :key="t"
              @click="setTheme(t)"
              :class="[
                'p-1.5 rounded-md transition-all text-xs',
                theme === t
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
              :title="`Switch to ${t} theme`"
              :aria-label="`Switch to ${t} theme`"
            >
              <Sun v-if="t === 'light'" class="w-3.5 h-3.5" />
              <Moon v-else-if="t === 'dark'" class="w-3.5 h-3.5" />
              <Monitor v-else class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Auth Buttons -->
          <Button
            variant="ghost"
            size="sm"
            @click="navigateToAuth('/login')"
            class="text-sm font-medium hover:text-foreground"
          >
            Sign In
          </Button>
          <Button
            size="sm"
            @click="navigateToAuth('/signup')"
            class="h-9 px-4 rounded-lg font-semibold text-sm shadow-xs"
          >
            Get Started Free
          </Button>
        </div>

        <!-- Mobile Menu Toggle -->
        <button
          type="button"
          @click="isMenuOpen = !isMenuOpen"
          :aria-label="isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'"
          :aria-expanded="isMenuOpen"
          class="md:hidden p-2 rounded-lg text-foreground hover:bg-muted focus:outline-none"
        >
          <Menu v-if="!isMenuOpen" class="w-5 h-5" />
          <X v-else class="w-5 h-5" />
        </button>
      </div>

      <!-- Mobile Dropdown Navigation -->
      <div
        v-if="isMenuOpen"
        class="md:hidden border-b border-border bg-background px-5 py-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 shadow-lg"
      >
        <div class="flex flex-col space-y-3 font-medium text-sm">
          <a href="#features" @click="isMenuOpen = false" class="py-1 text-foreground/80 hover:text-foreground">Features</a>
          <a href="#ai-assistant" @click="isMenuOpen = false" class="py-1 text-foreground/80 hover:text-foreground">
            AI Assistant
          </a>
          <a href="#modules" @click="isMenuOpen = false" class="py-1 text-foreground/80 hover:text-foreground">Core Modules</a>
          <a href="#workflow" @click="isMenuOpen = false" class="py-1 text-foreground/80 hover:text-foreground">How It Works</a>
          <a href="#faqs" @click="isMenuOpen = false" class="py-1 text-foreground/80 hover:text-foreground">FAQs</a>
        </div>

        <div class="pt-3 border-t border-border flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Theme</span>
          <div class="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
            <button
              type="button"
              v-for="t in (['light', 'dark', 'system'] as const)"
              :key="t"
              @click="setTheme(t)"
              :class="[
                'px-2.5 py-1 text-xs capitalize rounded-md transition-all',
                theme === t ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground'
              ]"
            >
              {{ t }}
            </button>
          </div>
        </div>

        <div class="pt-2 flex flex-col gap-2">
          <Button variant="outline" class="w-full justify-center" @click="navigateToAuth('/login'); isMenuOpen = false">
            Sign In
          </Button>
          <Button class="w-full justify-center" @click="navigateToAuth('/signup'); isMenuOpen = false">
            Get Started Free
          </Button>
        </div>
      </div>
    </header>

    <!-- HERO SECTION -->
    <section class="relative pt-12 md:pt-20 pb-16 md:pb-24 overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <!-- Reassuring Badge -->
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary text-secondary-foreground border border-border text-xs font-semibold mb-6 animate-in fade-in duration-500 shadow-xs">
          <span>Accounting & Invoicing for Growing Businesses</span>
        </div>

        <!-- Main Headline -->
        <h1 class="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.15] text-balance">
          Invoicing and accounting that actually feels clear.
        </h1>

        <!-- Plain English Subtitle -->
        <p class="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-normal leading-relaxed text-balance">
          Create client invoices, convert estimates, issue credit notes, and manage customer catalogs with automated GST compliance. Plus, an AI assistant to answer questions about your sales and receivables.
        </p>

        <!-- CTA Action Buttons -->
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Button
            size="lg"
            @click="navigateToAuth('/signup')"
            class="w-full sm:w-auto h-12 px-7 text-sm font-semibold rounded-xl gap-2 shadow-sm"
          >
            Create Free Account
            <ArrowRight class="w-4 h-4" />
          </Button>
          <a href="#ai-assistant" class="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              class="w-full sm:w-auto h-12 px-6 text-sm font-medium rounded-xl border-border bg-card/60 hover:bg-muted/80"
            >
              See AI Assistant in Action
            </Button>
          </a>
        </div>

        <!-- Trust Badges -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground font-medium">
          <span class="flex items-center gap-1.5">
            <Check class="w-3.5 h-3.5 text-emerald-500" />
            Free to get started
          </span>
          <span class="flex items-center gap-1.5">
            <Check class="w-3.5 h-3.5 text-emerald-500" />
            No credit card required
          </span>
          <span class="flex items-center gap-1.5">
            <Check class="w-3.5 h-3.5 text-emerald-500" />
            Export your data anytime
          </span>
        </div>

        <!-- REALISTIC SHADCN PRODUCT HERO MOCKUP -->
        <div class="mt-14 max-w-5xl mx-auto">
          <div class="rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden transition-all text-left">
            <!-- App Window Top Chrome Bar -->
            <div class="border-b border-border bg-muted/40 px-4 py-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1.5">
                  <div class="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div class="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div class="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <div class="h-4 w-px bg-border mx-2"></div>
                <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Building2 class="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Apex Technologies Ltd.</span>
                  <span class="text-[11px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-md">Invoicing Active</span>
                </div>
              </div>

              <div class="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Workspace</span>
              </div>
            </div>

            <!-- App Workspace Inside Body -->
            <div class="p-5 sm:p-6 space-y-6">
              <!-- KPI Metric Strip -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-1">
                  <div class="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Total Receivables</span>
                    <ArrowUpRight class="w-4 h-4 text-emerald-500" />
                  </div>
                  <div class="text-2xl font-bold text-foreground tracking-tight">₹3,42,800</div>
                  <div class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    +14.2% collected this month
                  </div>
                </div>

                <div class="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-1">
                  <div class="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Outstanding Invoices</span>
                    <Clock class="w-4 h-4 text-amber-500" />
                  </div>
                  <div class="text-2xl font-bold text-foreground tracking-tight">₹48,250</div>
                  <div class="text-xs text-muted-foreground font-medium">
                    2 client invoices due next week
                  </div>
                </div>

                <div class="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-1">
                  <div class="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Net Profit Margin</span>
                    <TrendingUp class="w-4 h-4 text-primary" />
                  </div>
                  <div class="text-2xl font-bold text-foreground tracking-tight">64.8%</div>
                  <div class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Healthy financial balance
                  </div>
                </div>
              </div>

              <!-- Main Split: Invoices Table + AI Assistant Live Card -->
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <!-- Left: Recent Invoices Table (7 cols) -->
                <div class="lg:col-span-7 rounded-xl border border-border/70 bg-card overflow-hidden">
                  <div class="p-3.5 border-b border-border/70 flex items-center justify-between bg-muted/20">
                    <div class="flex items-center gap-2">
                      <FileText class="w-4 h-4 text-primary" />
                      <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Invoices</span>
                    </div>
                    <span class="text-xs font-medium text-muted-foreground">Sales Ledger</span>
                  </div>

                  <div class="divide-y divide-border/60 text-xs">
                    <!-- Invoice Row 1 -->
                    <div class="p-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                          AC
                        </div>
                        <div>
                          <div class="font-semibold text-foreground">Acme Innovations Inc</div>
                          <div class="text-[11px] text-muted-foreground font-mono">INV-2026-042 • GST 18%</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-bold text-foreground">₹85,000</div>
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Paid
                        </span>
                      </div>
                    </div>

                    <!-- Invoice Row 2 -->
                    <div class="p-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                          BL
                        </div>
                        <div>
                          <div class="font-semibold text-foreground">Blue Horizon Labs</div>
                          <div class="text-[11px] text-muted-foreground font-mono">INV-2026-043 • Due in 4 days</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-bold text-foreground">₹42,500</div>
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Pending
                        </span>
                      </div>
                    </div>

                    <!-- Invoice Row 3 -->
                    <div class="p-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs">
                          NV
                        </div>
                        <div>
                          <div class="font-semibold text-foreground">Nova Ventures</div>
                          <div class="text-[11px] text-muted-foreground font-mono">EST-2026-019 • Converted to Invoice</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-bold text-foreground">₹1,15,000</div>
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                          Draft
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Right: Accountiva Assistant Preview (5 cols) -->
                <div class="lg:col-span-5 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 relative">
                  <div class="flex items-center justify-between pb-2 border-b border-primary/20">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-card border border-border">
                        <img :src="aiMascotSrc" alt="AI Mascot" class="w-full h-full object-cover" />
                      </div>
                      <span class="text-xs font-bold text-foreground">Accountiva AI Assistant</span>
                    </div>
                    <Badge variant="secondary" class="text-[10px] font-semibold">Ready</Badge>
                  </div>

                  <!-- Prompt Bubble -->
                  <div class="flex justify-end">
                    <div class="bg-primary text-primary-foreground text-xs rounded-2xl rounded-tr-xs px-3.5 py-2 max-w-[85%] shadow-xs">
                      Who still owes us money this month?
                    </div>
                  </div>

                  <!-- Response Bubble -->
                  <div class="flex justify-start">
                    <div class="bg-card border border-border text-foreground text-xs rounded-2xl rounded-tl-xs p-3 max-w-[92%] space-y-2 shadow-xs">
                      <p class="leading-relaxed">
                        You have <strong>1 pending invoice</strong> totaling <strong>₹42,500</strong> from <strong>Blue Horizon Labs</strong> due on March 25th.
                      </p>
                      <div class="pt-1 flex items-center gap-2">
                        <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                          <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500" />
                          Books Balanced
                        </span>
                        <span class="text-muted-foreground text-[10px]">•</span>
                        <span class="text-[11px] text-muted-foreground">General Ledger posted</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4 CORE VALUE PILLARS -->
    <section id="features" class="py-16 md:py-24 border-t border-border/80 bg-muted/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" class="mb-3 text-xs font-semibold px-3 py-1">
            Built For Real Work
          </Badge>
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Everything your business needs to stay financially organized.
          </h2>
          <p class="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            No bloated accounting clutter. Accountiva focuses on the workflows you touch every day.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Pillar 1 -->
          <div class="rounded-xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div class="space-y-3">
              <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileText class="w-5 h-5" />
              </div>
              <h3 class="text-base font-bold text-foreground">Client Invoicing & Estimates</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Create clean, branded invoices in seconds. Convert accepted quotes directly into invoices, track payment status, and share public links with clients.
              </p>
            </div>
            <div class="pt-4 mt-4 border-t border-border/50 text-xs font-medium text-primary flex items-center gap-1">
              <span>Custom GST & Taxes</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </div>
          </div>

          <!-- Pillar 2 -->
          <div class="rounded-xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div class="space-y-3">
              <div class="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <RotateCcw class="w-5 h-5" />
              </div>
              <h3 class="text-base font-bold text-foreground">Credit Notes & Adjustments</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Manage sales returns, invoice revisions, and customer refunds easily. Keep your client balances accurate without messy manual bookkeeping corrections.
              </p>
            </div>
            <div class="pt-4 mt-4 border-t border-border/50 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>Linked invoice refunds</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </div>
          </div>

          <!-- Pillar 3 -->
          <div class="rounded-xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div class="space-y-3">
              <div class="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Scale class="w-5 h-5" />
              </div>
              <h3 class="text-base font-bold text-foreground">Customer & Product Catalog</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Save recurring items, prices, HSN/SAC codes, and customer tax profiles. Auto-populate invoice lines and calculate GST in one click.
              </p>
            </div>
            <div class="pt-4 mt-4 border-t border-border/50 text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>HSN/SAC & Tax profiles</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </div>
          </div>

          <!-- Pillar 4 -->
          <div class="rounded-xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div class="space-y-3">
              <div class="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BarChart3 class="w-5 h-5" />
              </div>
              <h3 class="text-base font-bold text-foreground">Instant Reports & GST</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Generate real-time Profit & Loss statements, Tax/GST summaries (input tax credit vs output liability), and export raw data to CSV or JSON with one click.
              </p>
            </div>
            <div class="pt-4 mt-4 border-t border-border/50 text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <span>One-click CSV & JSON export</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- INTERACTIVE AI ASSISTANT SPOTLIGHT -->
    <section id="ai-assistant" class="py-16 md:py-24 border-t border-border/80">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <!-- Left Column: Plain English explanation -->
          <div class="lg:col-span-5 space-y-6">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
              Accountiva AI Assistant
            </div>

            <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
              An AI assistant that actually knows your business numbers.
            </h2>

            <p class="text-base text-muted-foreground leading-relaxed">
              Most accounting software makes you hunt through multiple nested menus just to find an overdue invoice or customer balance summary.
            </p>

            <p class="text-base text-muted-foreground leading-relaxed">
              With Accountiva, you simply ask in plain English. The assistant reads your live sales data, finds answers, or drafts invoices for you.
            </p>

            <!-- 3 Key Features of Chatbot -->
            <div class="space-y-4 pt-2">
              <div class="flex items-start gap-3">
                <div class="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check class="w-4 h-4" />
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-foreground">Answers Financial Questions</h4>
                  <p class="text-xs text-muted-foreground">Ask about overdue invoices, monthly sales totals, top customers, or tax liabilities.</p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <div class="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check class="w-4 h-4" />
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-foreground">Drafts Invoices & Estimates</h4>
                  <p class="text-xs text-muted-foreground">Describe your sale in a sentence. The AI prepares line items, rates, and GST calculations for instant approval.</p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <div class="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check class="w-4 h-4" />
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-foreground">Takes Action With Your Approval</h4>
                  <p class="text-xs text-muted-foreground">Creates invoices or customer records directly in your workspace with a single confirmation click.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Interactive Chat Simulator -->
          <div class="lg:col-span-7">
            <div class="rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col">
              <!-- Chat Header -->
              <div class="border-b border-border bg-muted/40 p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center overflow-hidden shadow-xs">
                    <img :src="aiMascotSrc" alt="AI Mascot" class="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-foreground">Accountiva Financial Copilot</h3>
                    <p class="text-xs text-muted-foreground">Interactive Simulator • Click a prompt below</p>
                  </div>
                </div>

                <Badge variant="outline" class="text-[11px] font-medium bg-background">
                  Gemini-Powered
                </Badge>
              </div>

              <!-- Interactive Prompt Selector Chips -->
              <div class="p-3.5 bg-muted/20 border-b border-border/70 flex flex-wrap gap-2">
                <button
                  type="button"
                  v-for="(scenario, idx) in aiScenarios"
                  :key="scenario.id"
                  @click="selectScenario(idx)"
                  :class="[
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                    selectedScenarioIndex === idx
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background hover:bg-muted text-foreground/80 border-border'
                  ]"
                >
                  "{{ scenario.userPrompt }}"
                </button>
              </div>

              <!-- Chat Conversation Window -->
              <div class="p-5 space-y-4 min-h-[360px] bg-background/50 flex flex-col justify-center transition-all">
                <!-- When typing in the input: clean transitional state -->
                <div v-if="simulationStage === 'typing'" class="flex flex-col items-center justify-center py-16 text-center space-y-2.5 animate-in fade-in duration-200">
                  <div class="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center overflow-hidden shadow-xs">
                    <img :src="aiMascotSrc" alt="AI Mascot" class="w-full h-full object-cover" />
                  </div>
                  <span class="text-xs font-medium text-muted-foreground">Typing your question into the assistant...</span>
                </div>

                <!-- When sent (thinking or answered) -->
                <template v-else>
                  <!-- User Message -->
                  <div v-if="displayedUserPrompt" class="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div class="bg-primary text-primary-foreground text-xs sm:text-sm rounded-2xl rounded-tr-xs px-4 py-2.5 max-w-[85%] shadow-xs font-medium">
                      {{ displayedUserPrompt }}
                    </div>
                  </div>

                  <!-- Simulating Thinking State -->
                  <div v-if="simulationStage === 'thinking'" class="flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div class="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-border bg-card mt-0.5 shadow-xs">
                      <img :src="aiMascotSrc" alt="AI Mascot" class="w-full h-full object-cover" />
                    </div>

                    <div class="bg-card border border-border rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-3">
                      <div class="flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                        <span class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                        <span class="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                      </div>
                      <span class="text-xs text-muted-foreground font-medium">Accountiva AI is analyzing records...</span>
                    </div>
                  </div>

                  <!-- AI Response Message & Rich Card -->
                  <div v-else-if="simulationStage === 'answered'" class="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
                    <div class="flex items-start gap-2.5">
                      <div class="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-border bg-card mt-0.5 shadow-xs">
                        <img :src="aiMascotSrc" alt="AI Mascot" class="w-full h-full object-cover" />
                      </div>

                      <div class="space-y-3 flex-1">
                        <div class="bg-card border border-border rounded-2xl rounded-tl-xs p-4 text-xs sm:text-sm text-foreground shadow-xs space-y-2">
                          <div class="font-bold text-foreground flex items-center gap-1.5">
                            <CheckCircle2 class="w-4 h-4 text-emerald-500" />
                            {{ displayedScenario.responseHeadline }}
                          </div>
                          <p class="text-muted-foreground text-xs leading-relaxed">
                            {{ displayedScenario.responseBody }}
                          </p>
                        </div>

                        <!-- Dynamic Rich Interactive Card matching the selected scenario -->
                        <!-- Scenario: Overdue Invoices -->
                        <div v-if="displayedScenario.actionType === 'overdue'" class="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2.5">
                          <div class="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <span>Overdue Invoices</span>
                            <span class="text-rose-500 font-bold">2 Records</span>
                          </div>
                          <div class="space-y-2">
                            <div class="p-2.5 rounded-lg bg-card border border-border/80 flex items-center justify-between text-xs">
                              <div>
                                <div class="font-semibold text-foreground">Stark Enterprises</div>
                                <div class="text-[11px] text-muted-foreground">INV-2026-039 • Due 5 days ago</div>
                              </div>
                              <div class="text-right">
                                <span class="font-bold text-foreground">₹24,500</span>
                                <span class="block text-[10px] text-rose-500 font-medium">Overdue</span>
                              </div>
                            </div>

                            <div class="p-2.5 rounded-lg bg-card border border-border/80 flex items-center justify-between text-xs">
                              <div>
                                <div class="font-semibold text-foreground">Pixel Craft Studio</div>
                                <div class="text-[11px] text-muted-foreground">INV-2026-041 • Due 2 days ago</div>
                              </div>
                              <div class="text-right">
                                <span class="font-bold text-foreground">₹18,200</span>
                                <span class="block text-[10px] text-rose-500 font-medium">Overdue</span>
                              </div>
                            </div>
                          </div>
                          <div class="pt-1 flex items-center justify-between">
                            <span class="text-xs text-muted-foreground font-medium">Total: ₹42,700</span>
                            <Button size="sm" variant="outline" class="h-7 text-xs gap-1.5 cursor-default">
                              <FileText class="w-3 h-3" /> View In Invoices
                            </Button>
                          </div>
                        </div>

                        <!-- Scenario: Draft Invoice Creation -->
                        <div v-else-if="displayedScenario.actionType === 'draftInvoice'" class="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
                          <div class="flex items-center justify-between text-xs">
                            <span class="font-bold text-muted-foreground uppercase tracking-wider">Prepared Draft Invoice</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Ready to Review</span>
                          </div>

                          <div class="grid grid-cols-2 gap-2 text-xs p-3 bg-card rounded-lg border border-border">
                            <div>
                              <span class="text-muted-foreground block text-[10px] uppercase">Customer</span>
                              <span class="font-bold text-foreground">Acme Corporation</span>
                            </div>
                            <div>
                              <span class="text-muted-foreground block text-[10px] uppercase">Tax Treatment</span>
                              <span class="font-mono font-semibold text-foreground">GST (18%)</span>
                            </div>
                            <div class="mt-2">
                              <span class="text-muted-foreground block text-[10px] uppercase">Item Details</span>
                              <span class="font-semibold text-foreground">5x Cloud License @ ₹12,000</span>
                            </div>
                            <div class="mt-2">
                              <span class="text-muted-foreground block text-[10px] uppercase">Total Invoiced</span>
                              <span class="font-extrabold text-foreground text-sm">₹70,800.00</span>
                            </div>
                          </div>

                          <div class="flex items-center justify-between pt-1">
                            <span class="text-xs text-muted-foreground">Status: Ready to create invoice</span>
                            <Button size="sm" class="h-8 text-xs gap-1.5 cursor-default">
                              <Check class="w-3.5 h-3.5" /> Confirm & Create Invoice
                            </Button>
                          </div>
                        </div>

                        <!-- Scenario: Monthly Revenue -->
                        <div v-else class="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
                          <div class="flex items-center justify-between text-xs">
                            <span class="font-bold text-muted-foreground uppercase tracking-wider">Current Month Sales</span>
                            <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">89% Collected</span>
                          </div>

                          <div class="grid grid-cols-3 gap-2 text-xs text-center">
                            <div class="p-2.5 rounded-lg bg-card border border-border">
                              <div class="text-[10px] text-muted-foreground uppercase font-semibold">Total Invoiced</div>
                              <div class="font-bold text-foreground mt-1">₹3,85,000</div>
                            </div>
                            <div class="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                              <div class="text-[10px] uppercase font-bold">Collected</div>
                              <div class="font-black text-foreground mt-1">₹3,42,800</div>
                            </div>
                            <div class="p-2.5 rounded-lg bg-card border border-border">
                              <div class="text-[10px] text-muted-foreground uppercase font-semibold">Pending</div>
                              <div class="font-bold text-foreground mt-1">₹42,200</div>
                            </div>
                          </div>

                          <div class="pt-1 flex items-center justify-between">
                            <span class="text-xs text-muted-foreground">14 customer accounts active</span>
                            <Button size="sm" variant="outline" class="h-7 text-xs gap-1.5 cursor-default">
                              <FileText class="w-3 h-3" /> View Invoices
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <!-- Chat Input Bar (Interactive Mockup) -->
              <div class="border-t border-border bg-muted/30 p-3 flex items-center gap-2">
                <div
                  class="flex-1 bg-background border rounded-lg px-3.5 py-2 text-xs flex items-center justify-between transition-all"
                  :class="simulationStage === 'typing' ? 'border-primary ring-2 ring-primary/20 text-foreground font-semibold' : 'border-border text-muted-foreground'"
                >
                  <div class="flex items-center gap-1.5 overflow-hidden">
                    <span v-if="currentInputText" class="animate-in fade-in duration-150 truncate text-foreground font-medium">
                      {{ currentInputText }}
                    </span>
                    <span v-else class="truncate text-muted-foreground">
                      Ask about overdue invoices or request a new draft...
                    </span>
                    <span v-if="simulationStage === 'typing'" class="w-1 h-3.5 bg-primary animate-pulse inline-block"></span>
                  </div>
                  <UploadCloud class="w-4 h-4 text-muted-foreground/70 shrink-0 ml-2" />
                </div>
                <Button
                  size="sm"
                  class="h-9 px-3 gap-1 rounded-lg transition-all"
                  :variant="simulationStage === 'typing' ? 'default' : 'secondary'"
                  :class="{ 'scale-105 shadow-sm bg-primary text-primary-foreground': simulationStage === 'typing' }"
                >
                  <Send class="w-3.5 h-3.5" :class="{ 'animate-pulse': simulationStage === 'typing' }" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CORE MODULES EXPLORER (TABBED SHADCN UI) -->
    <section id="modules" class="py-16 md:py-24 border-t border-border/80 bg-muted/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" class="mb-3 text-xs font-semibold px-3 py-1">
            Complete Toolkit
          </Badge>
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Explore Accountiva’s core modules
          </h2>
          <p class="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Every feature is designed to be straightforward and practical for your business operations.
          </p>
        </div>

        <!-- Module Tabs Navigation -->
        <div class="flex justify-center mb-8">
          <div class="inline-flex p-1 rounded-xl bg-card border border-border shadow-xs gap-1">
            <button
              type="button"
              @click="activeModuleTab = 'invoices'"
              :class="[
                'px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2',
                activeModuleTab === 'invoices'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              <FileText class="w-4 h-4" />
              <span>Invoices & Estimates</span>
            </button>

            <button
              type="button"
              @click="activeModuleTab = 'creditNotes'"
              :class="[
                'px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2',
                activeModuleTab === 'creditNotes'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              <RotateCcw class="w-4 h-4" />
              <span>Credit Notes & Refunds</span>
            </button>

            <button
              type="button"
              @click="activeModuleTab = 'ledger'"
              :class="[
                'px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2',
                activeModuleTab === 'ledger'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              <Scale class="w-4 h-4" />
              <span>General Ledger</span>
            </button>

            <button
              type="button"
              @click="activeModuleTab = 'reports'"
              :class="[
                'px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2',
                activeModuleTab === 'reports'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              <BarChart3 class="w-4 h-4" />
              <span>Reports & Tax</span>
            </button>
          </div>
        </div>

        <!-- Tab 1: Invoicing & Sales -->
        <div v-if="activeModuleTab === 'invoices'" class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-300">
          <div class="lg:col-span-5 space-y-4">
            <h3 class="text-xl sm:text-2xl font-bold text-foreground">
              Professional Invoicing, Estimates, and Credit Notes
            </h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              Never get confused about who paid and who hasn't. Accountiva gives you complete control over your sales pipeline from initial quote to final settlement.
            </p>
            <ul class="space-y-3 pt-2 text-sm">
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>1-Click Estimate Conversion:</strong> Turn accepted quotes into full invoices with one click.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>Custom GST Treatment:</strong> Support for Inter-state (IGST), Intra-state (CGST+SGST), reverse charge, and tax exemptions.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>Public Shareable Links:</strong> Send clients direct web links to view their invoices and download clean PDFs.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>Credit Notes:</strong> Handle refunds, invoice adjustments, and customer credit balance easily.</span>
              </li>
            </ul>
          </div>

          <div class="lg:col-span-7 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
            <div class="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Invoice #INV-2026-088</span>
                <h4 class="text-base font-bold text-foreground">Acme Corporation</h4>
              </div>
              <Badge variant="secondary" class="font-semibold text-xs">Payment Pending</Badge>
            </div>

            <div class="space-y-2 text-xs">
              <div class="grid grid-cols-12 font-bold text-muted-foreground border-b border-border/60 pb-2">
                <span class="col-span-6">Description</span>
                <span class="col-span-2 text-center">Qty</span>
                <span class="col-span-2 text-right">Rate</span>
                <span class="col-span-2 text-right">Amount</span>
              </div>
              <div class="grid grid-cols-12 py-1.5 border-b border-border/40 text-foreground">
                <span class="col-span-6 font-medium">Enterprise Cloud Infrastructure Setup</span>
                <span class="col-span-2 text-center font-mono">1</span>
                <span class="col-span-2 text-right font-mono">₹65,000</span>
                <span class="col-span-2 text-right font-mono font-bold">₹65,000</span>
              </div>
              <div class="grid grid-cols-12 py-1.5 border-b border-border/40 text-foreground">
                <span class="col-span-6 font-medium">Monthly Maintenance & SLA Support</span>
                <span class="col-span-2 text-center font-mono">3</span>
                <span class="col-span-2 text-right font-mono">₹10,000</span>
                <span class="col-span-2 text-right font-mono font-bold">₹30,000</span>
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <div class="w-64 space-y-1.5 text-xs">
                <div class="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span class="font-mono font-medium">₹95,000.00</span>
                </div>
                <div class="flex justify-between text-muted-foreground">
                  <span>GST (18%):</span>
                  <span class="font-mono font-medium">₹17,100.00</span>
                </div>
                <div class="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border">
                  <span>Total Amount:</span>
                  <span class="font-mono font-black">₹1,12,100.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Credit Notes & Refunds -->
        <div v-else-if="activeModuleTab === 'creditNotes'" class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-300">
          <div class="lg:col-span-5 space-y-4">
            <h3 class="text-xl sm:text-2xl font-bold text-foreground">
              Handle Refunds, Adjustments, and Credit Notes
            </h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              Keep customer balances accurate and maintain clean audit records whenever invoice amounts change or refunds occur.
            </p>
            <ul class="space-y-3 pt-2 text-sm">
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>Linked Invoices:</strong> Issue credit notes directly against original invoices to reduce receivables accurately.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>Full Tax Adjustment:</strong> Recalculates CGST, SGST, and IGST portions to ensure tax filings stay accurate.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>Branded PDF Memos:</strong> Download or share clean credit notes with your clients with one click.</span>
              </li>
            </ul>
          </div>

          <div class="lg:col-span-7 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
            <div class="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Credit Note #CRN-2026-012</span>
                <h4 class="text-sm font-bold text-foreground">Acme Innovations Inc</h4>
              </div>
              <Badge variant="outline" class="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Applied</Badge>
            </div>

            <div class="space-y-3">
              <div class="p-3 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    AC
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-foreground">Refund on Cloud Setup</div>
                    <div class="text-[11px] text-muted-foreground">Linked to #INV-2026-042 • Scope reduction</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-bold text-foreground">- ₹15,000.00</div>
                  <span class="text-[10px] text-muted-foreground font-semibold">Credited to Account</span>
                </div>
              </div>

              <div class="p-3 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    GST
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-foreground">GST Tax Adjustment (18%)</div>
                    <div class="text-[11px] text-muted-foreground">IGST Reversed</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-bold text-foreground">- ₹2,700.00</div>
                  <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Tax Adjusted</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3: General Ledger -->
        <div v-else-if="activeModuleTab === 'ledger'" class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-300">
          <div class="lg:col-span-5 space-y-4">
            <h3 class="text-xl sm:text-2xl font-bold text-foreground">
              Automated Double-Entry General Ledger
            </h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              Real accounting requires debits to equal credits. Accountiva enforces this rigorously behind the scenes without getting in your way.
            </p>
            <ul class="space-y-3 pt-2 text-sm">
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>Automatic Ledger Posting:</strong> Invoices post to Accounts Receivable and Sales Income automatically.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>Manual Journal Entries:</strong> Authorized accountants can post custom balanced adjustment journals.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>Real-time Balance Check:</strong> Strict validation prevents out-of-balance entries from ever being saved.</span>
              </li>
            </ul>
          </div>

          <div class="lg:col-span-7 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
            <div class="flex items-center justify-between border-b border-border pb-3">
              <div class="flex items-center gap-2">
                <Scale class="w-4 h-4 text-primary" />
                <span class="text-sm font-bold text-foreground">Manual Journal Entry #JRN-104</span>
              </div>
              <Badge variant="outline" class="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Balanced</Badge>
            </div>

            <div class="space-y-2 text-xs">
              <div class="grid grid-cols-12 font-bold text-muted-foreground border-b border-border/60 pb-2">
                <span class="col-span-6">Account Name</span>
                <span class="col-span-3 text-right">Debit (Dr)</span>
                <span class="col-span-3 text-right">Credit (Cr)</span>
              </div>
              <div class="grid grid-cols-12 py-1.5 border-b border-border/40 text-foreground">
                <span class="col-span-6 font-medium">Bank Account (Operating)</span>
                <span class="col-span-3 text-right font-mono font-bold text-foreground">₹50,000.00</span>
                <span class="col-span-3 text-right font-mono text-muted-foreground">—</span>
              </div>
              <div class="grid grid-cols-12 py-1.5 border-b border-border/40 text-foreground">
                <span class="col-span-6 font-medium">Accounts Receivable</span>
                <span class="col-span-3 text-right font-mono text-muted-foreground">—</span>
                <span class="col-span-3 text-right font-mono font-bold text-foreground">₹50,000.00</span>
              </div>
            </div>

            <div class="flex justify-between items-center pt-3 border-t border-border text-xs">
              <span class="text-muted-foreground">Total Debits = Total Credits</span>
              <span class="font-mono font-black text-foreground">₹50,000.00</span>
            </div>
          </div>
        </div>

        <!-- Tab 4: Reports & Tax -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-300">
          <div class="lg:col-span-5 space-y-4">
            <h3 class="text-xl sm:text-2xl font-bold text-foreground">
              Sales Performance and Tax/GST Reports
            </h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              At tax time or month-end, get instant summaries of all your sales and tax liabilities without messy spreadsheets.
            </p>
            <ul class="space-y-3 pt-2 text-sm">
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>Sales & Receivables:</strong> Track total invoiced amounts, collected payments, and pending balances across any date range.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>Tax & GST Breakdown:</strong> View CGST, SGST, and IGST collected across all invoices for accurate tax filing.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span class="text-foreground"><strong>CSV & JSON Exports:</strong> Download spreadsheet-ready data files in one click.</span>
              </li>
            </ul>
          </div>

          <div class="lg:col-span-7 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
            <div class="flex items-center justify-between border-b border-border pb-3">
              <div class="flex items-center gap-2">
                <BarChart3 class="w-4 h-4 text-primary" />
                <span class="text-sm font-bold text-foreground">Sales & Tax Summary (Year-To-Date)</span>
              </div>
              <span class="text-xs text-muted-foreground">Updated Live</span>
            </div>

            <div class="space-y-2 text-xs">
              <div class="flex justify-between py-1.5 border-b border-border/40 font-medium">
                <span class="text-foreground">Total Invoiced Sales</span>
                <span class="font-mono font-bold text-foreground">₹14,50,000.00</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-border/40 font-medium text-muted-foreground">
                <span>GST Collected (IGST + CGST/SGST)</span>
                <span class="font-mono text-foreground">+ ₹2,61,000.00</span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-border/40 font-medium text-muted-foreground">
                <span>Credit Note Adjustments</span>
                <span class="font-mono text-foreground">- ₹45,000.00</span>
              </div>
              <div class="flex justify-between py-2 border-t-2 border-border text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <span>Total Net Collected</span>
                <span class="font-mono font-black">₹16,66,000.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS (3 SIMPLE STEPS) -->
    <section id="workflow" class="py-16 md:py-24 border-t border-border/80">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="outline" class="mb-3 text-xs font-semibold px-3 py-1">
            Simple Workflow
          </Badge>
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Get up and running in 3 easy steps
          </h2>
          <p class="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            No complex installations or weeks of training required.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <!-- Step 1 -->
          <div class="rounded-xl border border-border bg-card p-6 shadow-xs relative space-y-3">
            <div class="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
              1
            </div>
            <h3 class="text-base font-bold text-foreground">Set Up Your Workspace</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              Add your organization name, logo, currency, and tax details. Customize invoice colors to match your brand identity.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="rounded-xl border border-border bg-card p-6 shadow-xs relative space-y-3">
            <div class="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
              2
            </div>
            <h3 class="text-base font-bold text-foreground">Create & Send Invoices</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              Send clean invoices to clients, convert accepted estimates, or ask the AI assistant to draft new billings instantly.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="rounded-xl border border-border bg-card p-6 shadow-xs relative space-y-3">
            <div class="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
              3
            </div>
            <h3 class="text-base font-bold text-foreground">Stay Balanced & Tax-Ready</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              Monitor real-time cashflow, check Profit & Loss, invite your accountant, or export data anytime for painless tax filing.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- COLLABORATION & SAFETY HIGHLIGHTS -->
    <section class="py-16 md:py-20 border-t border-border/80 bg-muted/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="p-6 rounded-xl border border-border bg-card shadow-xs space-y-2.5">
            <div class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users class="w-5 h-5" />
            </div>
            <h4 class="text-base font-bold text-foreground">Role-Based Team Permissions</h4>
            <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Assign roles like Owner, Admin, or Member. Control who can issue invoices, manage client contacts, or customize organization settings.
            </p>
          </div>

          <div class="p-6 rounded-xl border border-border bg-card shadow-xs space-y-2.5">
            <div class="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck class="w-5 h-5" />
            </div>
            <h4 class="text-base font-bold text-foreground">Complete Audit Logs</h4>
            <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Every invoice created, payment recorded, and journal entry posted is timestamped with user details for full traceability.
            </p>
          </div>

          <div class="p-6 rounded-xl border border-border bg-card shadow-xs space-y-2.5">
            <div class="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Lock class="w-5 h-5" />
            </div>
            <h4 class="text-base font-bold text-foreground">Soft-Delete Recovery (Trash)</h4>
            <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Accidentally deleted a customer or invoice? The built-in Trash center allows instant restoration so you never lose valuable records.
            </p>
          </div>
        </div>
      </div>
    </section>


    <!-- FREQUENTLY ASKED QUESTIONS -->
    <section id="faqs" class="py-16 md:py-24 border-t border-border/80 bg-muted/20">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center space-y-3 mb-12">
          <Badge variant="outline" class="text-xs font-semibold px-3 py-1">
            Got Questions?
          </Badge>
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p class="text-sm sm:text-base text-muted-foreground">
            Everything you need to know about Accountiva in normal, straightforward language.
          </p>
        </div>

        <div class="space-y-3">
          <div
            v-for="(faq, index) in faqs"
            :key="index"
            class="rounded-xl border border-border bg-card overflow-hidden shadow-xs transition-colors"
            :class="{ 'border-primary/50': activeFaq === index }"
          >
            <button
              type="button"
              @click="toggleFaq(index)"
              class="w-full flex items-center justify-between p-5 text-left font-semibold text-sm sm:text-base text-foreground focus:outline-none cursor-pointer"
            >
              <span>{{ faq.question }}</span>
              <ChevronDown
                class="w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-4"
                :class="{ 'rotate-180 text-primary': activeFaq === index }"
              />
            </button>
            <div
              v-show="activeFaq === index"
              class="px-5 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed animate-in fade-in duration-200"
            >
              {{ faq.answer }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FINAL CALL TO ACTION BANNER -->
    <section class="py-16 md:py-24 border-t border-border/80 text-center">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <h2 class="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Ready for clean invoicing and calm accounting?
        </h2>
        <p class="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Create an account in under two minutes and experience how modern accounting should feel.
        </p>
        <div class="pt-2">
          <Button
            size="lg"
            @click="navigateToAuth('/signup')"
            class="h-12 px-8 text-sm font-semibold rounded-xl gap-2 shadow-sm"
          >
            Create Your Free Account
            <ArrowRight class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="border-t border-border bg-muted/40 py-12 text-xs text-muted-foreground">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- Col 1: Branding -->
        <div class="space-y-3 md:col-span-2">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center border border-border bg-card">
              <img :src="accountivaLogoSrc" alt="Accountiva Logo" class="w-full h-full object-contain p-0.5" />
            </div>
            <span class="text-base font-bold text-foreground">
              Accountiva™
            </span>
          </div>
          <p class="max-w-sm text-muted-foreground leading-relaxed">
            Straightforward invoicing and double-entry accounting software with an intelligent AI copilot for growing businesses.
          </p>
          <div class="text-[11px] pt-2">
            © 2026 Accountiva. All rights reserved.
          </div>
        </div>

        <!-- Col 2: Navigation -->
        <div class="space-y-2.5">
          <h4 class="font-bold text-foreground uppercase tracking-wider text-[11px]">Product</h4>
          <ul class="space-y-1.5">
            <li><a href="#features" class="hover:text-foreground transition-colors">Features</a></li>
            <li><a href="#ai-assistant" class="hover:text-foreground transition-colors">AI Assistant</a></li>
            <li><a href="#modules" class="hover:text-foreground transition-colors">Core Modules</a></li>
            <li><a href="#workflow" class="hover:text-foreground transition-colors">How It Works</a></li>
          </ul>
        </div>

        <!-- Col 3: Resources -->
        <div class="space-y-2.5">
          <h4 class="font-bold text-foreground uppercase tracking-wider text-[11px]">Access</h4>
          <ul class="space-y-1.5">
            <li><a href="#faqs" class="hover:text-foreground transition-colors">FAQs</a></li>
            <li><button type="button" @click="navigateToAuth('/login')" class="hover:text-foreground transition-colors text-left">Sign In</button></li>
            <li><button type="button" @click="navigateToAuth('/signup')" class="hover:text-foreground transition-colors text-left">Create Account</button></li>
          </ul>
        </div>
      </div>
    </footer>
  </div>
</template>

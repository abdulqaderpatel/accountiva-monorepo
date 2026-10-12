<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useI18n } from 'vue-i18n';
import Sidebar from "@/components/Sidebar.vue";
import TopBar from '@/components/TopBar.vue';
import Modal from "@/components/Modal.vue";
import { useJournalStore, type JournalItem } from "@/stores/journalStore";
import { formatCurrency } from "@/utils/formatters";
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  X
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import DatePicker from "@/components/ui/DatePicker.vue";
import AccountSelect from "@/components/ui/AccountSelect.vue";
import { toast } from "vue-sonner";
import { storeToRefs } from "pinia";
import ViewGuard from "@/components/ViewGuard.vue";
import { usePermissions } from "@/composables/usePermissions";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useFormValidation } from "@/composables/useFormValidation";
import { journalSchema } from "@/utils/validationSchemas";

const journalStore = useJournalStore();
const authStore = useAuthStore();
const router = useRouter();
const { journals, pagination, loading } = storeToRefs(journalStore);
const { currentOrganization } = storeToRefs(authStore);
const { canManage } = usePermissions();
const { t } = useI18n();

const isAddingJournal = ref(false);
const editingJournalId = ref<string | null>(null);
const isViewingJournal = ref(false);
const activeJournal = ref<any>(null);
const searchQuery = ref("");
const openMenuId = ref<string | null>(null);
const menuPosition = ref({ top: 0, left: 0 });

// Form state
const newJournal = ref({
  date: new Date().toISOString().split("T")[0],
  notes: "",
  items: [
    { account: "", debits: 0, credits: 0 },
    { account: "", debits: 0, credits: 0 }
  ] as JournalItem[]
});

const {
  errors,
  validate,
  clearErrors,
} = useFormValidation(journalSchema, newJournal);

watch(isAddingJournal, (val) => {
  if (!val) {
    clearErrors();
    editingJournalId.value = null;
  }
});

const totalDebits = computed(() => newJournal.value.items.reduce((sum, item) => sum + (Number(item.debits) || 0), 0));
const totalCredits = computed(() => newJournal.value.items.reduce((sum, item) => sum + (Number(item.credits) || 0), 0));
const isBalanced = computed(() => {
  const debits = totalDebits.value;
  const credits = totalCredits.value;
  return debits > 0 && Math.abs(debits - credits) < 0.01;
});

const onDebitChange = (item: JournalItem, val: any) => {
  item.debits = val;
  if (Number(val) > 0) item.credits = 0;
};

const onCreditChange = (item: JournalItem, val: any) => {
  item.credits = val;
  if (Number(val) > 0) item.debits = 0;
};

const handlePageChange = (newPage: number) => {
  if (newPage < 1 || newPage > pagination.value.totalPages) return;
  journalStore.fetchJournals(newPage, pagination.value.limit, searchQuery.value);
  document.querySelector('main')?.scrollTo({ top: 0, behavior: "smooth" });
};

let timeout: any = null;
watch(searchQuery, (newSearch) => {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    journalStore.fetchJournals(1, pagination.value.limit, newSearch, true);
  }, 300);
});

const addRow = () => {
  newJournal.value.items.push({ account: "", debits: 0, credits: 0 });
};

const removeRow = (index: number) => {
  if (newJournal.value.items.length <= 2) return;
  newJournal.value.items.splice(index, 1);
};

const handleOpenNewModal = () => {
  editingJournalId.value = null;
  newJournal.value = {
    date: new Date().toISOString().split("T")[0],
    notes: "",
    items: [
      { account: "", debits: 0, credits: 0 },
      { account: "", debits: 0, credits: 0 }
    ]
  };
  isAddingJournal.value = true;
};

const editJournal = async (id: string) => {
  try {
    const journalDetails = await journalStore.getJournalById(id);
    editingJournalId.value = id;
    newJournal.value = {
      date: journalDetails.date || new Date().toISOString().split("T")[0],
      notes: journalDetails.notes || "",
      items: journalDetails.items && journalDetails.items.length >= 2
        ? journalDetails.items.map((item: any) => ({
            account: item.account || "",
            debits: Number(item.debits) || 0,
            credits: Number(item.credits) || 0,
            description: item.description || "",
            contactId: item.contactId || null,
          }))
        : [
            { account: "", debits: 0, credits: 0 },
            { account: "", debits: 0, credits: 0 }
          ]
    };
    isAddingJournal.value = true;
  } catch (err) {
    toast.error("Failed to load journal details for editing");
  }
};

const handleAddJournal = async () => {
  if (!validate()) {
    toast.error(editingJournalId.value ? "Journal entry update failed" : "Journal entry creation failed", {
      description: "Please correct the highlighted errors in the journal entry.",
    });
    return;
  }

  try {
    if (editingJournalId.value) {
      await journalStore.updateJournal(editingJournalId.value, { ...newJournal.value });
      toast.success("Journal Entry updated successfully");
    } else {
      await journalStore.addJournal({ ...newJournal.value });
      toast.success("Journal Entry created successfully");
    }
    isAddingJournal.value = false;
    editingJournalId.value = null;
    newJournal.value = {
      date: new Date().toISOString().split("T")[0],
      notes: "",
      items: [
        { account: "", debits: 0, credits: 0 },
        { account: "", debits: 0, credits: 0 }
      ]
    };
    clearErrors();
  } catch (err: any) {
    toast.error(err.response?.data?.error || `Failed to ${editingJournalId.value ? 'update' : 'create'} journal entry`);
  }
};

const viewJournal = async (id: string) => {
  try {
    activeJournal.value = await journalStore.getJournalById(id);
    isViewingJournal.value = true;
  } catch (err) {
    toast.error("Failed to load journal details");
  }
};

const toggleMenu = (id: string, event: MouseEvent) => {
  event.stopPropagation();
  if (openMenuId.value === id) {
    openMenuId.value = null;
    return;
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  menuPosition.value = {
    top: rect.top + rect.height + 5,
    left: rect.left - 150,
  };
  openMenuId.value = id;
};

const closeMenus = () => {
  openMenuId.value = null;
};

const deleteJournal = async (id: string) => {
  try {
    await journalStore.deleteJournal(id);
    toast.success("Journal deleted successfully");
  } catch (err) {
    toast.error("Failed to delete journal");
  }
};

onMounted(() => {
  journalStore.fetchJournals(1, 10);
  window.addEventListener("click", closeMenus);
});
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Journal Entries" />

    <main class="flex-1 overflow-y-auto bg-background flex flex-col">
      <ViewGuard module="journals">
        <div class="px-8 pt-4 md:pt-5 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">
          <!-- Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                <BookOpen class="w-6 h-6" />
              </div>
              <div class="space-y-0.5">
                <h1 class="ui-page-title text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {{ $t('modules.journals.title') }}
                </h1>
                <p class="ui-page-description text-xs md:text-sm text-muted-foreground">
                  {{ $t('modules.journals.subtitle') }}
                </p>
              </div>
            </div>
            <div v-if="canManage('journals')" class="flex gap-3">
              <Button
                @click="handleOpenNewModal"
                class="h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-[11px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.99] transition-all"
              >
                <Plus class="w-3.5 h-3.5 mr-2 group-hover:rotate-90 transition-transform" />
                {{ $t('modules.journals.new') }}
              </Button>
            </div>
          </div>

          <!-- Filter & Table -->
          <div class="bg-card/60 border border-border/60 rounded-2xl overflow-hidden shadow-2xs">
            <div class="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border/60 bg-muted/25">
              <div class="inline-flex h-9 items-center gap-1 bg-muted/45 p-1 rounded-lg border border-border/60 shadow-2xs">
                <button type="button" class="px-3 py-1 rounded-md text-xs font-bold transition-all bg-primary/15 text-primary border border-primary/25 shadow-xs flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                  All Entries
                </button>
              </div>
              <div class="relative w-full sm:w-72 md:w-80 group">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-150" />
                <Input
                  v-model="searchQuery"
                  placeholder="Search journal entries..."
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
            </div>

            <!-- List View -->
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/80 border-b border-border/70 bg-primary/[0.03]">
                    <th class="py-4 px-6">Date</th>
                    <th class="py-4 px-6">Journal#</th>
                    <th class="py-4 px-6">Notes</th>
                    <th class="py-4 px-6 text-right">Amount</th>
                    <th class="py-4 px-6 text-right"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <template v-if="loading">
                    <tr v-for="i in 5" :key="i">
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-20" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-24" /></td>
                      <td class="py-4.5 px-6"><Skeleton class="h-4 w-40" /></td>
                      <td class="py-4.5 px-6 text-right"><Skeleton class="h-4 w-24 ml-auto" /></td>
                      <td class="py-4.5 px-6 text-right"><Skeleton class="h-8 w-8 rounded-lg ml-auto" /></td>
                    </tr>
                  </template>
                  <template v-else>
                    <tr
                      v-for="j in journals"
                      :key="j.id"
                      class="hover:bg-muted/50 group cursor-pointer transition-colors duration-150"
                      @click="viewJournal(j.id)"
                    >
                      <td class="py-4.5 px-6 text-xs text-muted-foreground font-semibold tracking-wide">
                        {{ j.date }}
                      </td>
                      <td class="py-4.5 px-6 text-sm font-bold text-foreground group-hover:text-primary tracking-tight transition-colors font-mono">
                        {{ j.journalNumber }}
                      </td>
                      <td class="py-4.5 px-6 text-sm text-foreground/80 group-hover:text-foreground font-medium max-w-xs truncate transition-colors">
                        {{ j.notes || '—' }}
                      </td>
                      <td class="py-4.5 px-6 text-sm font-bold text-foreground font-mono text-right tracking-tight">
                        {{ formatCurrency(j.amount) }}
                      </td>
                      <td class="py-4.5 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 transition-colors opacity-70 group-hover:opacity-100"
                          @click.stop="(e) => toggleMenu(j.id, e)"
                        >
                          <MoreHorizontal class="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                    <tr v-if="journals.length === 0">
                      <td colspan="5" class="py-32 text-center">
                        <div class="flex flex-col items-center justify-center max-w-xs mx-auto space-y-4">
                          <div class="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center">
                            <BookOpen class="w-8 h-8 text-muted-foreground/40" />
                          </div>
                          <div class="space-y-1">
                            <h3 class="ui-section-title">No journal entries found</h3>
                            <p class="text-[11px] text-muted-foreground font-medium">
                              Create manual debit/credit entries for adjusting books.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div v-if="!loading && journals.length > 0 && pagination.totalPages > 1" class="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/20">
              <div class="flex items-center gap-2">
                 <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                   Showing {{ ((pagination.page - 1) * pagination.limit) + 1 }} to {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of {{ pagination.total }} Entries
                 </p>
              </div>
              <div class="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  :disabled="pagination.page === 1"
                  @click="handlePageChange(pagination.page - 1)"
                  class="h-8 w-8 rounded-lg border-border/50 hover:bg-muted"
                >
                  <ChevronLeft class="w-4 h-4" />
                </Button>
                
                <div class="flex items-center gap-1">
                   <Button 
                     v-for="p in pagination.totalPages" 
                     :key="p"
                     variant="ghost"
                     size="sm"
                     @click="handlePageChange(p)"
                     :class="[
                       'h-8 w-8 rounded-lg font-bold text-xs',
                       pagination.page === p
                         ? 'bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90'
                         : 'text-muted-foreground hover:bg-muted',
                     ]"
                   >
                     {{ p }}
                   </Button>
                </div>

                <Button 
                  variant="outline" 
                  size="icon" 
                  :disabled="pagination.page === pagination.totalPages"
                  @click="handlePageChange(pagination.page + 1)"
                  class="h-8 w-8 rounded-lg border-border/50 hover:bg-muted"
                >
                  <ChevronRight class="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ViewGuard>
    </main>
    </div>

    <!-- Context Menu -->
    <div
      v-if="openMenuId"
      class="fixed z-50 w-44 bg-card rounded-xl border border-border shadow-2xl py-1 overflow-hidden"
      :style="{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }"
    >
      <button type="button"
        v-if="canManage('journals')"
        @click="editJournal(openMenuId); closeMenus()"
        class="w-full text-left px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted flex items-center gap-2 border-b border-border/50 transition-colors"
      >
        <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
        Edit Journal
      </button>
      <button type="button"
        v-if="canManage('journals')"
        @click="deleteJournal(openMenuId); closeMenus()"
        class="w-full text-left px-4 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
      >
        <Trash2 class="w-3.5 h-3.5" />
        Delete Journal
      </button>
    </div>

    <!-- Create / Edit Journal Modal -->
    <Modal
      :open="isAddingJournal"
      :title="editingJournalId ? 'Edit Journal Entry' : 'New Journal Entry'"
      description="Double-Entry Transaction"
      max-width-class="max-w-4xl"
      body-class="p-6 space-y-8 max-h-[70vh] overflow-y-auto"
      @close="isAddingJournal = false"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Date <span class="text-destructive ml-0.5">*</span></label>
          <DatePicker v-model="newJournal.date" />
          <p v-if="errors.date" class="text-[10px] text-destructive font-semibold mt-1 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
            {{ errors.date }}
          </p>
        </div>
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Notes</label>
          <Input v-model="newJournal.notes" placeholder="Journal description" class="rounded-xl h-11 bg-muted/20" :class="{ 'border-destructive focus:border-destructive': errors.notes }" />
          <p v-if="errors.notes" class="text-[10px] text-destructive font-semibold mt-1 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
            {{ errors.notes }}
          </p>
        </div>
      </div>

      <div class="space-y-4">
        <div class="border border-border/50 rounded-xl bg-card" :class="{ 'border-destructive': errors.items }">
          <table class="w-full">
            <thead class="bg-muted/10 border-b border-border/50">
              <tr class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <th class="py-3 px-4 text-left">Account</th>
                <th class="py-3 px-4 text-right w-32">Debits</th>
                <th class="py-3 px-4 text-right w-32">Credits</th>
                <th class="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/20">
              <tr v-for="(item, index) in newJournal.items" :key="index">
                <td class="p-2">
                  <AccountSelect v-model="item.account" class="h-9 rounded-lg" placeholder="Select Account" />
                </td>
                <td class="p-2">
                  <Input type="number" :model-value="item.debits" @update:model-value="(val) => onDebitChange(item, val)" class="h-9 text-sm rounded-lg text-right" />
                </td>
                <td class="p-2">
                  <Input type="number" :model-value="item.credits" @update:model-value="(val) => onCreditChange(item, val)" class="h-9 text-sm rounded-lg text-right" />
                </td>
                <td class="p-2 text-center">
                  <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-destructive" @click="removeRow(index)" :disabled="newJournal.items.length <= 2">
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="p-2 border-t border-border/50 bg-muted/5">
            <Button variant="ghost" size="sm" @click="addRow" class="text-xs font-bold text-primary gap-1">
              <Plus class="w-3.5 h-3.5" /> Add Row
            </Button>
          </div>
        </div>

        <!-- Totals -->
        <div class="flex justify-end pt-4">
          <div class="w-64 space-y-2">
            <div v-if="errors.items" class="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 p-2 rounded-lg mb-2 animate-in fade-in duration-200">
              <AlertTriangle class="w-4 h-4 animate-bounce" />
              {{ errors.items }}
            </div>
            <div class="flex justify-between text-sm font-bold">
              <span class="text-muted-foreground">Total Debits</span>
              <span>{{ formatCurrency(totalDebits) }}</span>
            </div>
            <div class="flex justify-between text-sm font-bold">
              <span class="text-muted-foreground">Total Credits</span>
              <span>{{ formatCurrency(totalCredits) }}</span>
            </div>
            <div v-if="!isBalanced" class="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 p-2 rounded-lg mt-2">
              <AlertTriangle class="w-4 h-4" />
              Difference: {{ formatCurrency(Math.abs(totalDebits - totalCredits)) }}
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button @click="isAddingJournal = false" variant="ghost" class="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancel</Button>
        <Button @click="handleAddJournal" :disabled="loading" class="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2">
          <Spinner v-if="loading" size="sm" class="text-primary-foreground" />
          {{ editingJournalId ? (loading ? "Saving..." : "Save Changes") : (loading ? "Publishing..." : "Publish Journal") }}
        </Button>
      </template>
    </Modal>

    <!-- View Journal Modal -->
    <Modal
      :open="isViewingJournal && !!activeJournal"
      max-width-class="max-w-3xl"
      body-class="p-6 bg-muted/5 max-h-[70vh] overflow-y-auto"
      @close="isViewingJournal = false"
    >
      <template #header>
        <div class="p-6 border-b border-border flex items-center justify-between">
          <div class="space-y-1">
            <h2 class="text-xl font-bold text-foreground">Journal Entry {{ activeJournal?.journalNumber }}</h2>
            <p class="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Calendar class="w-3.5 h-3.5" /> {{ activeJournal?.date }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button
              v-if="canManage('journals')"
              variant="outline"
              size="sm"
              @click="isViewingJournal = false; editJournal(activeJournal.id)"
              class="h-8 px-3 rounded-lg font-bold text-xs gap-1.5"
            >
              <Pencil class="w-3.5 h-3.5" /> Edit
            </Button>
            <button type="button"
              aria-label="Close dialog"
              @click="isViewingJournal = false"
              class="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X class="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </template>

      <div class="border border-border/50 rounded-xl overflow-hidden bg-card">
        <table class="w-full text-left">
          <thead class="bg-muted/10 border-b border-border/50">
            <tr class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <th class="py-3 px-4">Account</th>
              <th class="py-3 px-4 text-right">Debits</th>
              <th class="py-3 px-4 text-right">Credits</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/20">
            <tr v-for="item in activeJournal?.items" :key="item.id">
              <td class="py-3 px-4 text-sm font-bold text-foreground">{{ item.account }}</td>
              <td class="py-3 px-4 text-sm font-medium text-right">{{ item.debits ? formatCurrency(item.debits) : '' }}</td>
              <td class="py-3 px-4 text-sm font-medium text-right">{{ item.credits ? formatCurrency(item.credits) : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="activeJournal?.notes" class="mt-6 p-4 bg-muted/20 rounded-xl border border-border/50">
        <span class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Notes</span>
        <p class="text-sm font-medium">{{ activeJournal.notes }}</p>
      </div>
    </Modal>

  </div>
</template>

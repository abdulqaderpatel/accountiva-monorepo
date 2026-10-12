<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Sidebar from '@/components/Sidebar.vue';
import TopBar from '@/components/TopBar.vue';
import { useCustomerStore, type Customer } from '@/stores/customerStore';
import { formatCurrency } from '@/utils/formatters';
import {
  Plus,
  Search,
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  MapPin,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  X,
  Users,
  FileUp,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'vue-sonner';
import { storeToRefs } from 'pinia';
import ViewGuard from '@/components/ViewGuard.vue';
import { usePermissions } from '@/composables/usePermissions';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import UpgradePlanModal from '@/components/UpgradePlanModal.vue';
import AddCustomerModal from '@/components/AddCustomerModal.vue';
import BulkUploadModal from '@/components/BulkUploadModal.vue';
import StickyPageHeader from '@/components/ui/StickyPageHeader.vue';
import BulkActionBar from '@/components/ui/BulkActionBar.vue';
import BulkConfirmDialog from '@/components/ui/BulkConfirmDialog.vue';
import { useBulkSelection } from '@/composables/useBulkSelection';
import { exportToCsv, exportToJson } from '@/lib/exportUtils';
import { Pencil } from 'lucide-vue-next';

import { useQuickCreateStore } from '@/stores/quickCreateStore';
import { useTrashStore } from '@/stores/trashStore';

const customerStore = useCustomerStore();
const trashStore = useTrashStore();
const authStore = useAuthStore();
const { customers, pagination, loading: fetchingCustomers } = storeToRefs(customerStore);
const { currentOrganization } = storeToRefs(authStore);
const loading = ref(false);

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
} = useBulkSelection(customers);

const isBulkDeleting = ref(false);
const showBulkDeleteConfirm = ref(false);

const handleBulkDeleteConfirm = async () => {
  if (selectedIds.value.size === 0) return;
  isBulkDeleting.value = true;
  const idsToDelete = Array.from(selectedIds.value);
  try {
    const res = await customerStore.bulkDeleteCustomers(idsToDelete);
    if (res?.skipped && res.skipped.length > 0) {
      toast.warning('Bulk delete finished with notices', {
        description: res.message,
      });
    } else {
      toast.success('Customers deleted', {
        description: res?.message || `Successfully deleted ${idsToDelete.length} customer(s).`,
      });
    }
    clearSelection();
    showBulkDeleteConfirm.value = false;
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to delete customers');
  } finally {
    isBulkDeleting.value = false;
  }
};

const handleBulkExport = (format: 'csv' | 'json') => {
  if (selectedItems.value.length === 0) return;
  const exportData = selectedItems.value.map((c) => ({
    'Code': c.customerCode || '',
    'Name': c.name,
    'Company': c.company || '',
    'Email': c.email || '',
    'Phone': c.phone || '',
    'GSTIN': c.gstNumber || '',
    'Outstanding Balance': c.outstandingBalance || 0,
  }));

  if (format === 'csv') {
    exportToCsv(exportData, 'customers');
  } else {
    exportToJson(exportData, 'customers');
  }
  toast.success(`Exported ${exportData.length} customer(s) as ${format.toUpperCase()}`);
};

const { canManage } = usePermissions();
const { t } = useI18n();

const isAddingCustomer = ref(false);
const isUpgradeModalOpen = ref(false);
const editingCustomer = ref<any | null>(null);

const checkCustomerLimitAndCreate = () => {
  editingCustomer.value = null;
  isAddingCustomer.value = true;
};

const searchQuery = ref('');
const openMenuId = ref<string | null>(null);

const router = useRouter();
const quickCreateStore = useQuickCreateStore();

// Reactively listen to quick create triggers from TopBar or other components
watch(
  () => [quickCreateStore.pendingAction, quickCreateStore.actionToken],
  ([action]) => {
    if (action === 'customer') {
      quickCreateStore.consume('customer');
      checkCustomerLimitAndCreate();
    }
  },
  { immediate: true }
);

onMounted(() => {
  customerStore.fetchCustomers(1, 12);
});

const handlePageChange = (newPage: number) => {
  if (newPage < 1 || newPage > pagination.value.totalPages) return;
  customerStore.fetchCustomers(newPage, pagination.value.limit, searchQuery.value);
  // Scroll to top of list
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
};

// Search with debounce
let searchTimeout: any = null;
watch(searchQuery, (newQuery) => {
  clearSelection();
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    customerStore.fetchCustomers(1, pagination.value.limit, newQuery, true);
  }, 300);
});

watch(() => pagination.value.page, () => {
  clearSelection();
});

const handleEdit = (customer: any, event: MouseEvent) => {
  event.stopPropagation();
  editingCustomer.value = customer;
  isAddingCustomer.value = true;
  openMenuId.value = null;
};

const handleModalSuccess = () => {
  customerStore.fetchCustomers(pagination.value.page, pagination.value.limit, searchQuery.value, true);
};

const toggleMenu = (id: string, event: MouseEvent) => {
  event.stopPropagation();
  openMenuId.value = openMenuId.value === id ? null : id;
};

const handleDelete = async (id: string) => {
  try {
    await customerStore.deleteCustomer(id);
    openMenuId.value = null;
    toast.success('Customer moved to Trash', {
      description: 'You can restore them anytime from the Trash Bin.',
      action: {
        label: 'Undo',
        onClick: async () => {
          await trashStore.restoreItem('customer', id);
          await customerStore.fetchCustomers(customerStore.pagination.page, customerStore.pagination.limit, '', true);
        },
      },
    });
  } catch (err) {
    console.error('Failed to delete customer:', err);
  }
};

const isBulkUploadOpen = ref(false);
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Customers" />

    <main class="flex-1 overflow-y-auto bg-background flex flex-col">
      <ViewGuard module="customers">
        <!-- Sticky Transitional Header -->
        <StickyPageHeader
          :title="$t('modules.customers.title')"
          :subtitle="$t('modules.customers.subtitle')"
          :icon="Users"
        >
          <template #actions>
            <div v-if="canManage('customers')" class="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                @click="isBulkUploadOpen = true"
                class="h-9 px-3.5 text-xs font-medium border-border shadow-2xs"
              >
                <FileUp class="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                {{ $t('modules.customers.import') }}
              </Button>
              <Button
                @click="checkCustomerLimitAndCreate"
                size="sm"
                class="h-9 px-4 text-xs font-medium shadow-xs"
              >
                <Plus class="w-3.5 h-3.5 mr-1.5" />
                {{ $t('modules.customers.new') }}
              </Button>
            </div>
          </template>
        </StickyPageHeader>

        <div class="px-8 pt-2 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full">

          <!-- Search & Select All Toolbar -->
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <div class="relative max-w-md w-full group">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-150" />
              <Input
                v-model="searchQuery"
                placeholder="Search by code, name, email or company..."
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

            <div v-if="customers.length > 0 && selectedCount > 0" class="flex items-center gap-2 px-1 animate-in fade-in duration-150">
              <Checkbox
                :checked="isAllSelected ? true : isIndeterminate ? 'indeterminate' : false"
                @update:checked="toggleSelectAll"
                id="select-all-customers"
              />
              <label for="select-all-customers" class="text-xs font-medium text-muted-foreground cursor-pointer select-none">
                Select all ({{ customers.length }})
              </label>
            </div>
          </div>

          <!-- Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <template v-if="fetchingCustomers">
              <Card
                v-for="i in 6"
                :key="i"
                class="bg-card/50 border-border/60 shadow-2xs rounded-2xl transition-all duration-300 group relative overflow-hidden py-0 gap-0"
              >
                <CardContent class="p-6">
                  <div class="flex items-start justify-between mb-4">
                    <Skeleton class="w-12 h-12 rounded-2xl" />
                    <Skeleton class="w-8 h-8 rounded-lg" />
                  </div>
                  <div class="space-y-3">
                    <div class="space-y-2">
                      <Skeleton class="h-5 w-3/4" />
                      <Skeleton class="h-3 w-1/2" />
                    </div>
                    <div class="space-y-1.5 pt-2 border-t border-border/50">
                      <Skeleton class="h-3 w-2/3" />
                      <Skeleton class="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </template>

            <template v-else>
              <Card
                v-for="customer in customers"
                :key="customer.id"
                @click="router.push('/customers/' + customer.id)"
                :class="[
                  'bg-card/50 border-border/60 hover:border-primary/40 shadow-2xs hover:shadow-xs transition-all duration-300 group relative overflow-hidden cursor-pointer rounded-2xl backdrop-blur-xs py-0 gap-0',
                  isSelected(customer.id) ? 'ring-2 ring-primary border-primary bg-primary/10 dark:bg-primary/15' : ''
                ]"
              >
                <div class="h-[2.5px] w-full bg-primary/20 group-hover:bg-primary/50 transition-colors"></div>
                <CardContent class="p-6">
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <div
                        @click.stop="toggleSelect(customer.id)"
                        :class="[
                          'py-1 transition-opacity duration-150 cursor-pointer',
                          selectedCount > 0 || isSelected(customer.id)
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        ]"
                      >
                        <Checkbox
                          :checked="isSelected(customer.id)"
                          @update:checked="toggleSelect(customer.id)"
                          :aria-label="`Select customer ${customer.name}`"
                        />
                      </div>
                      <div
                        class="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl transition-transform duration-200 group-hover:scale-105 shadow-2xs"
                      >
                        {{ customer.name ? customer.name[0] : '?' }}
                      </div>
                    </div>
                    <div class="relative" v-if="canManage('customers')">
                      <Button
                        variant="ghost"
                        size="icon"
                        @click="toggleMenu(customer.id, $event)"
                        class="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 opacity-70 group-hover:opacity-100 transition-colors"
                      >
                        <MoreHorizontal class="w-4 h-4" />
                      </Button>
                      <div
                        v-if="openMenuId === customer.id"
                        class="absolute right-0 top-10 w-40 bg-card border border-border/70 rounded-xl shadow-xl py-1 z-10 flex flex-col"
                      >
                        <button type="button"
                          @click="handleEdit(customer, $event)"
                          class="w-full px-4 py-2 text-left text-xs font-semibold text-foreground hover:bg-primary/10 flex items-center gap-2 border-b border-border/50 transition-colors"
                        >
                          <Pencil class="w-3.5 h-3.5 text-muted-foreground" /> Edit
                        </button>
                        <button type="button"
                          @click="handleDelete(customer.id)"
                          class="w-full px-4 py-2 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 class="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                    <div class="relative" v-else title="View Only Access">
                      <Lock class="w-3.5 h-3.5 text-muted-foreground/30" />
                    </div>
                  </div>

                  <div class="space-y-3">
                    <div>
                      <div class="flex justify-between items-start gap-2">
                        <h3 class="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{{ customer.name }}</h3>
                        <div 
                          v-if="customer.outstandingBalance && customer.outstandingBalance > 0" 
                          class="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-rose-400 border border-destructive/25 text-xs font-medium whitespace-nowrap font-mono"
                        >
                          {{ formatCurrency(customer.outstandingBalance) }} Due
                        </div>
                      </div>
	                      <p
	                        v-if="customer.customerCode"
	                        class="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-wider mt-1"
	                      >
	                        {{ customer.customerCode }}
	                      </p>
	                      <p
	                        v-if="customer.company"
	                        class="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1"
                      >
                        <Building2 class="w-3 h-3" /> {{ customer.company }}
                      </p>
                    </div>

                    <div class="space-y-1.5 pt-2 border-t border-border/50">
                      <div
                        v-if="customer.email"
                        class="flex items-center gap-2 text-[11px] text-muted-foreground font-medium"
                      >
                        <Mail class="w-3.5 h-3.5" /> {{ customer.email }}
                      </div>
                      <div
                        v-if="customer.phone"
                        class="flex items-center gap-2 text-[11px] text-muted-foreground font-medium"
                      >
                        <Phone class="w-3.5 h-3.5" /> {{ customer.phone }}
                      </div>
                      <div
                        v-if="customer.address"
                        class="flex items-start gap-2 text-[11px] text-muted-foreground font-medium"
                      >
                        <MapPin class="w-3.5 h-3.5 mt-0.5 shrink-0" /> {{ customer.address }}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div v-if="customers.length === 0" class="col-span-full py-32 text-center">
                <div class="flex flex-col items-center justify-center max-w-xs mx-auto space-y-4">
                  <div class="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center">
                    <Users class="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <div class="space-y-1">
                    <h3 class="ui-section-title">No customers found</h3>
                    <p class="text-[11px] text-muted-foreground font-medium">
                      {{
                        searchQuery
                          ? 'Try adjusting your search to find what you are looking for.'
                          : 'Get started by adding your first customer to your client list.'
                      }}
                    </p>
                  </div>
                  <Button
                    v-if="!searchQuery && canManage('customers')"
                    @click="checkCustomerLimitAndCreate"
                    variant="outline"
                    size="sm"
                    class="rounded-xl font-bold uppercase tracking-widest text-[10px]"
                  >
                    Add Customer
                  </Button>
                </div>
              </div>
            </template>
          </div>

          <!-- Pagination -->
          <div v-if="!fetchingCustomers && customers.length > 0 && pagination.totalPages > 1" class="flex items-center justify-between py-6 border-t border-border/50">
            <div class="flex items-center gap-2">
               <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                 Showing {{ ((pagination.page - 1) * pagination.limit) + 1 }} to {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of {{ pagination.total }} Customers
               </p>
            </div>
            <div class="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                :disabled="pagination.page === 1"
                @click="handlePageChange(pagination.page - 1)"
                class="h-10 w-10 rounded-xl border-border/50 hover:bg-muted"
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
                     'h-10 w-10 rounded-xl font-bold text-xs',
                     pagination.page === p ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:bg-muted'
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
                class="h-10 w-10 rounded-xl border-border/50 hover:bg-muted"
              >
                <ChevronRight class="w-4 h-4" />
              </Button>
            </div>
          </div>

          <!-- Floating Bulk Action Bar -->
          <BulkActionBar
            :count="selectedCount"
            label="customers"
            :loading="isBulkDeleting"
            :can-delete="canManage('customers')"
            @clear="clearSelection"
            @delete="showBulkDeleteConfirm = true"
            @export="handleBulkExport"
          />

          <!-- Bulk Delete Confirmation Dialog -->
          <BulkConfirmDialog
            v-model:open="showBulkDeleteConfirm"
            :title="selectedCount > 1 ? `Move ${selectedCount} Customers to Trash` : 'Move Customer to Trash'"
            :description="selectedCount > 1
              ? `Move ${selectedCount} customers to the Trash Bin? You can restore them anytime within 30 days.`
              : `Are you sure you want to move customer ${selectedItems[0]?.name || ''} to Trash? You can restore them anytime.`"
            :item-count="selectedCount"
            :item-names="selectedItems.map((c) => c.name)"
            action-label="Move to Trash"
            variant="destructive"
            :loading="isBulkDeleting"
            @confirm="handleBulkDeleteConfirm"
          />
        </div>
      </ViewGuard>
    </main>
    </div>

    <!-- Add/Edit Customer Modal -->
    <AddCustomerModal
      :open="isAddingCustomer"
      :customer="editingCustomer"
      @close="isAddingCustomer = false; editingCustomer = null"
      @success="handleModalSuccess"
    />

    <UpgradePlanModal
      v-model:open="isUpgradeModalOpen"
      feature="customer"
    />

    <BulkUploadModal
      v-model:open="isBulkUploadOpen"
      entity="customers"
      @success="customerStore.fetchCustomers(pagination.page, pagination.limit, searchQuery, statusFilter, true)"
    />
  </div>
</template>

<style scoped>
/* Custom scrollbar for main content */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--muted);
  border-radius: 10px;
}
</style>

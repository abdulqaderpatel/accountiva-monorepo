<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Sidebar from '@/components/Sidebar.vue';
import TopBar from '@/components/TopBar.vue';
import { useVendorStore, type Vendor } from '@/stores/vendorStore';
import { formatCurrency } from '@/utils/formatters';
import {
  Plus,
  Search,
  Mail,
  Phone,
  Building2,
  MapPin,
  MoreHorizontal,
  Trash2,
  X,
  Users,
  FileUp,
  Lock,
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
import AddVendorModal from '@/components/AddVendorModal.vue';
import BulkUploadModal from '@/components/BulkUploadModal.vue';
import StickyPageHeader from '@/components/ui/StickyPageHeader.vue';
import BulkActionBar from '@/components/ui/BulkActionBar.vue';
import BulkConfirmDialog from '@/components/ui/BulkConfirmDialog.vue';
import { useBulkSelection } from '@/composables/useBulkSelection';
import { exportToCsv, exportToJson } from '@/lib/exportUtils';
import { Pencil } from 'lucide-vue-next';

const vendorStore = useVendorStore();
const { vendors, loading: fetchingVendors } = storeToRefs(vendorStore);
const loading = ref(false);

const { canManage } = usePermissions();
const { t } = useI18n();

const isAddingVendor = ref(false);
const isBulkUploadOpen = ref(false);
const searchQuery = ref('');
const openMenuId = ref<string | null>(null);
const editingVendor = ref<any | null>(null);

const router = useRouter();

onMounted(() => {
  vendorStore.fetchVendors();
});

const filteredVendors = computed(() => {
  if (!searchQuery.value) return vendors.value;
  const query = searchQuery.value.toLowerCase();
  return vendors.value.filter(v => 
    v.name.toLowerCase().includes(query) ||
    v.company?.toLowerCase().includes(query) ||
    v.email?.toLowerCase().includes(query) ||
    v.vendor_code?.toLowerCase().includes(query)
  );
});

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
} = useBulkSelection(filteredVendors);

const isBulkDeleting = ref(false);
const showBulkDeleteConfirm = ref(false);

const handleBulkDeleteConfirm = async () => {
  if (selectedIds.value.size === 0) return;
  isBulkDeleting.value = true;
  const idsToDelete = Array.from(selectedIds.value);
  try {
    const res = await vendorStore.bulkDeleteVendors(idsToDelete);
    if (res?.skipped && res.skipped.length > 0) {
      toast.warning('Bulk delete finished with notices', {
        description: res.message,
      });
    } else {
      toast.success('Vendors deleted', {
        description: res?.message || `Successfully deleted ${idsToDelete.length} vendor(s).`,
      });
    }
    clearSelection();
    showBulkDeleteConfirm.value = false;
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to delete vendors');
  } finally {
    isBulkDeleting.value = false;
  }
};

const handleBulkExport = (format: 'csv' | 'json') => {
  if (selectedItems.value.length === 0) return;
  const exportData = selectedItems.value.map((v) => ({
    'Code': v.vendorCode || '',
    'Name': v.name,
    'Company': v.company || '',
    'Email': v.email || '',
    'Phone': v.phone || '',
    'GSTIN': v.gst_number || '',
    'Outstanding Balance': v.outstandingBalance || 0,
  }));

  if (format === 'csv') {
    exportToCsv(exportData, `vendors-export-${Date.now()}`);
  } else {
    exportToJson(exportData, `vendors-export-${Date.now()}`);
  }
  toast.success(`Exported ${exportData.length} vendor(s) as ${format.toUpperCase()}`);
};

const handleEdit = (vendor: any, event: MouseEvent) => {
  event.stopPropagation();
  editingVendor.value = vendor;
  isAddingVendor.value = true;
  openMenuId.value = null;
};

const handleModalSuccess = () => {
  vendorStore.fetchVendors();
};

const toggleMenu = (id: string, event: MouseEvent) => {
  event.stopPropagation();
  openMenuId.value = openMenuId.value === id ? null : id;
};

const handleDelete = async (id: string) => {
  try {
    await vendorStore.deleteVendor(id);
    openMenuId.value = null;
    toast.success('Vendor deleted');
  } catch (err) {
    console.error('Failed to delete vendor:', err);
  }
};
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="Vendors" />

    <main class="flex-1 overflow-y-auto bg-background flex flex-col">
      <ViewGuard module="expenses">
        <!-- Sticky Transitional Header -->
        <StickyPageHeader
          :title="$t('modules.vendors.title')"
          :subtitle="$t('modules.vendors.subtitle')"
          :icon="Building2"
        >
          <template #actions>
            <div v-if="canManage('expenses')" class="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                @click="isBulkUploadOpen = true"
                class="h-9 px-3.5 text-xs font-medium border-border shadow-2xs"
              >
                <FileUp class="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                Import CSV
              </Button>
              <Button
                @click="isAddingVendor = true"
                size="sm"
                class="h-9 px-4 text-xs font-medium shadow-xs"
              >
                <Plus class="w-3.5 h-3.5 mr-1.5" />
                {{ $t('modules.vendors.new') }}
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

            <div v-if="filteredVendors.length > 0 && selectedCount > 0" class="flex items-center gap-2 px-1 animate-in fade-in duration-150">
              <Checkbox
                :checked="isAllSelected ? true : isIndeterminate ? 'indeterminate' : false"
                @update:checked="toggleSelectAll"
                id="select-all-vendors"
              />
              <label for="select-all-vendors" class="text-xs font-medium text-muted-foreground cursor-pointer select-none">
                Select all ({{ filteredVendors.length }})
              </label>
            </div>
          </div>

          <!-- Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <template v-if="fetchingVendors">
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
                  </div>
                </CardContent>
              </Card>
            </template>

            <template v-else>
              <Card
                v-for="vendor in filteredVendors"
                :key="vendor.id"
                :class="[
                  'bg-card/50 border-border/60 hover:border-primary/40 shadow-2xs hover:shadow-xs transition-all duration-300 group relative overflow-hidden rounded-2xl backdrop-blur-xs py-0 gap-0',
                  isSelected(vendor.id) ? 'ring-2 ring-primary border-primary bg-primary/10 dark:bg-primary/15' : ''
                ]"
              >
                <div class="h-[2.5px] w-full bg-primary/20 group-hover:bg-primary/50 transition-colors"></div>
                <CardContent class="p-6">
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <div
                        @click.stop="toggleSelect(vendor.id)"
                        :class="[
                          'py-1 transition-opacity duration-150 cursor-pointer',
                          selectedCount > 0 || isSelected(vendor.id)
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        ]"
                      >
                        <Checkbox
                          :checked="isSelected(vendor.id)"
                          @update:checked="toggleSelect(vendor.id)"
                          :aria-label="`Select vendor ${vendor.name}`"
                        />
                      </div>
                      <div
                        class="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl transition-transform duration-200 group-hover:scale-105 shadow-2xs"
                      >
                        {{ vendor.name[0] }}
                      </div>
                    </div>
                    <div class="relative" v-if="canManage('expenses')">
                      <Button
                        variant="ghost"
                        size="icon"
                        @click="toggleMenu(vendor.id, $event)"
                        class="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 opacity-70 group-hover:opacity-100 transition-colors"
                      >
                        <MoreHorizontal class="w-4 h-4" />
                      </Button>
                      <div
                        v-if="openMenuId === vendor.id"
                        class="absolute right-0 top-10 w-40 bg-card border border-border/70 rounded-xl shadow-xl py-1 z-10 flex flex-col"
                      >
                        <button type="button"
                          @click="handleEdit(vendor, $event)"
                          class="w-full px-4 py-2 text-left text-xs font-semibold text-foreground hover:bg-primary/10 flex items-center gap-2 border-b border-border/50 transition-colors"
                        >
                          <Pencil class="w-3.5 h-3.5 text-muted-foreground" /> Edit
                        </button>
                        <button type="button"
                          @click="handleDelete(vendor.id)"
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
                        <h3 class="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{{ vendor.name }}</h3>
                        <div 
                          v-if="vendor.outstandingBalance && vendor.outstandingBalance > 0" 
                          class="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-rose-400 border border-destructive/25 text-xs font-medium whitespace-nowrap font-mono"
                        >
                          {{ formatCurrency(vendor.outstandingBalance) }} Due
                        </div>
                      </div>
	                      <p
	                        v-if="vendor.vendorCode"
	                        class="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-wider mt-1"
	                      >
	                        {{ vendor.vendorCode }}
	                      </p>
	                      <p
	                        v-if="vendor.company"
	                        class="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1"
                      >
                        <Building2 class="w-3 h-3" /> {{ vendor.company }}
                      </p>
                    </div>

                    <div class="space-y-1.5 pt-2 border-t border-border/50">
                      <div
                        v-if="vendor.email"
                        class="flex items-center gap-2 text-[11px] text-muted-foreground font-medium"
                      >
                        <Mail class="w-3.5 h-3.5" /> {{ vendor.email }}
                      </div>
                      <div
                        v-if="vendor.phone"
                        class="flex items-center gap-2 text-[11px] text-muted-foreground font-medium"
                      >
                        <Phone class="w-3.5 h-3.5" /> {{ vendor.phone }}
                      </div>
                      <div
                        v-if="vendor.address"
                        class="flex items-start gap-2 text-[11px] text-muted-foreground font-medium"
                      >
                        <MapPin class="w-3.5 h-3.5 mt-0.5 shrink-0" /> {{ vendor.address }}
                      </div>
                      <div
                        v-if="vendor.gst_number || vendor.pan"
                        class="flex items-center gap-2 pt-1 flex-wrap"
                      >
                        <span v-if="vendor.gst_number" class="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground border border-border uppercase tracking-widest">
                          GSTIN: {{ vendor.gst_number }}
                        </span>
                        <span v-if="vendor.pan" class="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground border border-border uppercase tracking-widest font-mono">
                          PAN: {{ vendor.pan }}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div v-if="filteredVendors.length === 0" class="col-span-full py-32 text-center">
                <div class="flex flex-col items-center justify-center max-w-xs mx-auto space-y-4">
                  <div class="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center">
                    <Users class="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <div class="space-y-1">
                    <h3 class="ui-section-title">No vendors found</h3>
                    <p class="text-[11px] text-muted-foreground font-medium">
                      {{
                        searchQuery
                          ? 'Try adjusting your search to find what you are looking for.'
                          : 'Get started by adding your first vendor to your list.'
                      }}
                    </p>
                  </div>
                  <Button
                    v-if="!searchQuery && canManage('expenses')"
                    @click="isAddingVendor = true"
                    variant="outline"
                    size="sm"
                    class="rounded-xl font-bold uppercase tracking-widest text-[10px]"
                  >
                    Add Vendor
                  </Button>
                </div>
              </div>
            </template>
          </div>

          <!-- Floating Bulk Action Bar -->
          <BulkActionBar
            :count="selectedCount"
            label="vendors"
            :loading="isBulkDeleting"
            :can-delete="canManage('expenses')"
            @clear="clearSelection"
            @delete="showBulkDeleteConfirm = true"
            @export="handleBulkExport"
          />

          <!-- Bulk Delete Confirmation Dialog -->
          <BulkConfirmDialog
            v-model:open="showBulkDeleteConfirm"
            :title="selectedCount > 1 ? `Delete ${selectedCount} Vendors` : 'Delete Vendor'"
            :description="selectedCount > 1 ? `Are you sure you want to delete ${selectedCount} vendors? Note: Vendors associated with existing bills or expenses will be protected.` : 'Are you sure you want to delete this vendor? Note: Vendors associated with existing bills or expenses will be protected.'"
            :item-count="selectedCount"
            :item-names="selectedItems.map((v) => v.name)"
            :loading="isBulkDeleting"
            @confirm="handleBulkDeleteConfirm"
          />
        </div>
      </ViewGuard>
    </main>
    </div>

    <!-- Add/Edit Vendor Modal -->
    <AddVendorModal
      :open="isAddingVendor"
      :vendor="editingVendor"
      @close="isAddingVendor = false; editingVendor = null"
      @success="handleModalSuccess"
    />

    <BulkUploadModal
      v-model:open="isBulkUploadOpen"
      entity="vendors"
      @success="vendorStore.fetchVendors()"
    />
  </div>
</template>

<style scoped>
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

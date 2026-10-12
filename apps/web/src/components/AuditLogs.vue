<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import {
  Search,
  Calendar,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Terminal,
  Activity,
  User,
  Globe,
  Monitor,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-vue-next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Select from '@/components/ui/Select.vue';
import { useAuthStore } from '@/stores/authStore';
import { useAuditLogStore } from '@/stores/auditLogStore';

const authStore = useAuthStore();
const auditLogStore = useAuditLogStore();

const {
  logs,
  totalLogs,
  totalPages,
  currentPage,
  limit,
  loading,
  search,
  actionFilter,
  entityTypeFilter,
  userFilter,
  startDate,
  endDate,
  filterOptions,
} = storeToRefs(auditLogStore);

// Expanded Log ID (keep local to the current view session)
const expandedLogId = ref<string | null>(null);

const fetchFilterOptions = async (force = false) => {
  if (!authStore.currentOrganization?.id) return;
  await auditLogStore.fetchFilterOptions(authStore.currentOrganization.id, force);
};

const fetchLogs = async (force = false) => {
  if (!authStore.currentOrganization?.id) return;
  try {
    await auditLogStore.fetchLogs(authStore.currentOrganization.id, force);
  } catch (err: any) {
    toast.error('Could not load audit logs. Please try again.');
  }
};

// Reset Filters
const resetFilters = () => {
  auditLogStore.reset();
  fetchLogs(true);
};

const toggleExpand = (logId: string) => {
  if (expandedLogId.value === logId) {
    expandedLogId.value = null;
  } else {
    expandedLogId.value = logId;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const getActionBadgeColor = (action: string) => {
  const colors: Record<string, string> = {
    CREATE: 'bg-success/10 text-success border-success/20',
    UPDATE: 'bg-warning/10 text-warning border-warning/20',
    DELETE: 'bg-destructive/10 text-destructive border-destructive/20',
    STATUS_CHANGE: 'bg-info/10 text-info border-info/20',
    SEND_EMAIL: 'bg-primary/10 text-primary border-primary/20',
    SEND_INVITATION: 'bg-primary/10 text-primary border-primary/20',
    ACCEPT_INVITATION: 'bg-primary/10 text-primary border-primary/20',
    UPDATE_MEMBER: 'bg-primary/10 text-primary border-primary/20',
    REMOVE_MEMBER: 'bg-destructive/10 text-destructive border-destructive/20',
    UPDATE_SETTINGS: 'bg-primary/10 text-primary border-primary/20',
  };
  return colors[action] || 'bg-muted text-muted-foreground border-border';
};

const getEntityBadgeColor = (entity: string) => {
  const colors: Record<string, string> = {
    invoice: 'bg-primary/10 text-primary border-primary/20',
    customer: 'bg-info/10 text-info border-info/20',
    estimate: 'bg-warning/10 text-warning border-warning/20',
    organization_member: 'bg-accent text-accent-foreground border-border',
    organization: 'bg-primary/10 text-primary border-primary/20',
  };
  return colors[entity] || 'bg-muted text-muted-foreground border-border';
};

const getInitials = (name: string) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchLogs(false);
};

// Fetch data when organization ID is available or changes
watch(
  () => authStore.currentOrganization?.id,
  (newId) => {
    if (newId) {
      // Only fetch if logs haven't been fetched yet
      if (!auditLogStore.fetched) {
        currentPage.value = 1;
        fetchFilterOptions();
        fetchLogs();
      }
    }
  },
  { immediate: true }
);

// Watch parameters to refetch
watch([actionFilter, entityTypeFilter, userFilter, startDate, endDate], () => {
  if (!authStore.currentOrganization?.id) return;
  currentPage.value = 1;
  fetchLogs(false);
});
</script>

<template>
  <div class="space-y-5">
    <Card class="bg-card border-border/40 shadow-none overflow-hidden relative group py-0 gap-0">
      <div
        class="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none"
      ></div>

      <CardHeader class="p-4 px-5 border-b border-border/30 bg-muted/10 flex flex-row items-center justify-between relative z-10">
        <div class="space-y-0.5">
          <CardTitle class="text-sm font-semibold">Audit Trail</CardTitle>
          <CardDescription class="text-xs">A secure, read-only record of all critical events and operations in this workspace.</CardDescription>
        </div>
        <Button
          @click="fetchLogs(true)"
          :disabled="loading"
          variant="outline"
          class="h-8 px-3 rounded-lg font-medium text-xs gap-1.5 transition-all shadow-none"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          Refresh Logs
        </Button>
      </CardHeader>

      <!-- Filters Section -->
      <CardContent class="p-5 border-b border-border/40 bg-muted/20 relative z-10">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Search Keyword -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-foreground">Search details</label>
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                v-model="search"
                @keyup.enter="fetchLogs"
                placeholder="Type keyword and press Enter..."
                class="w-full pl-9 pr-3 h-9 text-xs rounded-md border border-input bg-transparent dark:bg-input/30 text-foreground placeholder:text-muted-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
              />
            </div>
          </div>

          <!-- Filter by User -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-foreground">User or actor</label>
            <Select
              v-model="userFilter"
              :options="[{ id: '', name: 'All Users' }, ...filterOptions.users.map(u => ({ id: u.id, name: u.full_name || u.email }))]"
              placeholder="All Users"
            />
          </div>

          <!-- Filter by Action -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-foreground">Action type</label>
            <Select
              v-model="actionFilter"
              :options="[{ id: '', name: 'All Actions' }, ...filterOptions.actions.map(a => ({ id: a, name: a }))]"
              placeholder="All Actions"
            />
          </div>

          <!-- Filter by Resource -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-foreground">Resource or entity</label>
            <Select
              v-model="entityTypeFilter"
              :options="[{ id: '', name: 'All Resources' }, ...filterOptions.entityTypes.map(e => ({ id: e, name: e }))]"
              placeholder="All Resources"
            />
          </div>

          <!-- Start Date -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-foreground">From date</label>
            <input
              type="date"
              v-model="startDate"
              class="w-full px-3 h-9 text-xs rounded-md border border-input bg-transparent dark:bg-input/30 text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
            />
          </div>

          <!-- End Date -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-foreground">To date</label>
            <input
              type="date"
              v-model="endDate"
              class="w-full px-3 h-9 text-xs rounded-md border border-input bg-transparent dark:bg-input/30 text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <Button
            @click="resetFilters"
            variant="ghost"
            class="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <X class="w-3.5 h-3.5" />
            Reset Filters
          </Button>
        </div>
      </CardContent>

      <!-- Logs Table -->
      <CardContent class="p-0 relative z-10">
        <div v-if="loading" class="p-12 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 class="w-8 h-8 animate-spin text-primary" />
          <p class="text-xs font-medium">Loading audit logs...</p>
        </div>

        <div
          v-else-if="logs.length === 0"
          class="p-12 text-center space-y-4"
        >
          <div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Activity class="w-6 h-6 text-muted-foreground/50" />
          </div>
          <div class="space-y-1">
            <h3 class="text-sm font-semibold text-foreground">No logs found</h3>
            <p class="text-xs text-muted-foreground">No audit records matched your filter criteria.</p>
          </div>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="text-xs font-medium text-muted-foreground border-b bg-muted/30">
                <th class="py-3 px-5">User</th>
                <th class="py-3 px-5">Action</th>
                <th class="py-3 px-5">Resource</th>
                <th class="py-3 px-5">Client Details</th>
                <th class="py-3 px-5">Timestamp</th>
                <th class="py-3 px-5 text-right"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/20">
              <template v-for="log in logs" :key="log.id">
                <tr class="hover:bg-muted/10 group transition-colors">
                  <!-- User Profile -->
                  <td class="py-3.5 px-5">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full border border-border/50 overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                        <img
                          v-if="log.user?.profile_picture"
                          :src="log.user.profile_picture"
                          class="w-full h-full object-cover"
                        />
                        <div
                          v-else
                          class="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xs"
                        >
                          {{ getInitials(log.user?.full_name || log.user?.email || '') }}
                        </div>
                      </div>
                      <div class="flex flex-col">
                        <span class="text-xs font-semibold text-foreground">
                          {{ log.user?.full_name || 'System / Auto' }}
                        </span>
                        <span class="text-[10px] text-muted-foreground">
                          {{ log.user?.email || '' }}
                        </span>
                      </div>
                    </div>
                  </td>

                  <!-- Action Badge -->
                  <td class="py-3.5 px-5">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-sm"
                      :class="getActionBadgeColor(log.action)"
                    >
                      {{ log.action }}
                    </span>
                  </td>

                  <!-- Resource Badge -->
                  <td class="py-3.5 px-5">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-medium border uppercase tracking-wider"
                      :class="getEntityBadgeColor(log.entityType)"
                    >
                      {{ log.entityType }}
                    </span>
                  </td>

                  <!-- Client IP and Agent -->
                  <td class="py-3.5 px-5">
                    <div class="flex flex-col">
                      <div class="flex items-center gap-1.5 text-[10px] text-foreground font-mono">
                        <Globe class="w-3 h-3 text-muted-foreground/60" />
                        {{ log.ipAddress || 'Internal' }}
                      </div>
                      <div
                        class="flex items-center gap-1.5 text-[9px] text-muted-foreground max-w-[200px] truncate"
                        :title="log.userAgent || 'N/A'"
                      >
                        <Monitor class="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
                        {{ log.userAgent || 'N/A' }}
                      </div>
                    </div>
                  </td>

                  <!-- Timestamp -->
                  <td class="py-3.5 px-5 text-xs text-muted-foreground">
                    {{ formatDate(log.createdAt) }}
                  </td>

                  <!-- Toggle JSON Details -->
                  <td class="py-3.5 px-5 text-right">
                    <Button
                      @click="toggleExpand(log.id)"
                      variant="ghost"
                      class="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 transition-all text-muted-foreground hover:text-foreground shrink-0 shadow-none"
                    >
                      <component :is="expandedLogId === log.id ? EyeOff : Eye" class="w-3.5 h-3.5" />
                      {{ expandedLogId === log.id ? 'Hide' : 'Inspect' }}
                    </Button>
                  </td>
                </tr>

                <!-- Details Panel -->
                <tr v-if="expandedLogId === log.id">
                  <td colspan="6" class="bg-muted/10 px-5 py-4 border-t border-b border-border/20">
                    <div class="bg-card border border-border/30 rounded-xl p-4 font-mono text-xs text-foreground shadow-inner">
                      <div class="flex items-center gap-2 text-primary font-semibold mb-2.5 text-xs">
                        <Terminal class="w-4 h-4" />
                        Payload Inspection
                      </div>
                      <pre class="overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96 text-left">{{ JSON.stringify(log.details || {}, null, 2) }}</pre>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="logs.length > 0 && totalPages > 1"
          class="flex items-center justify-between px-5 py-4 border-t border-border/30 bg-muted/5 text-xs"
        >
          <div class="flex items-center gap-2">
            <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Showing {{ (currentPage - 1) * limit + 1 }} to
              {{ Math.min(currentPage * limit, totalLogs) }} of
              {{ totalLogs }} Records
            </p>
          </div>

          <div class="flex items-center gap-1">
            <Button
              @click="changePage(currentPage - 1)"
              :disabled="currentPage === 1 || loading"
              variant="ghost"
              class="h-8 w-8 p-0 rounded-lg hover:bg-muted/50 disabled:opacity-40"
            >
              <ChevronLeft class="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button
              @click="changePage(currentPage + 1)"
              :disabled="currentPage === totalPages || loading"
              variant="ghost"
              class="h-8 w-8 p-0 rounded-lg hover:bg-muted/50 disabled:opacity-40"
            >
              <ChevronRight class="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

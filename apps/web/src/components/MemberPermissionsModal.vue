<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  Shield,
  FileText,
  Users,
  Box,
  Briefcase,
  PieChart,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  Settings,
  CircleSlash,
  BookOpen,
  Loader2,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogScrollContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'vue-sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  member: any;
  organizationId: string;
}>();

const emit = defineEmits(['close', 'updated']);

const authStore = useAuthStore();
const { t } = useI18n();
const loading = ref(false);

import { computed } from 'vue';
import { isFeatureEnabled, type FeatureFlags } from '@/config/features';

const moduleFeatureMap: Record<string, keyof FeatureFlags> = {
  invoices: 'invoices',
  estimates: 'estimates',
  customers: 'customers',
  items: 'items',
  expenses: 'expenses',
  reports: 'reports',
  journals: 'journals',
  banking: 'banking',
};

// Module definitions
const allModules = [
  { id: 'invoices', name: 'Invoices', icon: FileText, description: 'Manage billing and payments' },
  { id: 'estimates', name: 'Estimates', icon: Receipt, description: 'Quotes and proposals' },
  { id: 'customers', name: 'Customers', icon: Users, description: 'Client directory and details' },
  { id: 'items', name: 'Items & Services', icon: Box, description: 'Product and service catalog' },
  { id: 'expenses', name: 'Expenses', icon: CreditCard, description: 'Track business spending' },
  { id: 'reports', name: 'Reports', icon: PieChart, description: 'Financial analytics and exports' },
  { id: 'journals', name: 'Journal Entries', icon: BookOpen, description: 'Double-entry accounting records' },
  { id: 'banking', name: 'Banking', icon: CheckCircle2, description: 'Bank sync and reconciliation' },
];

const modules = computed(() => {
  return allModules.filter((m) => {
    const feat = moduleFeatureMap[m.id];
    return !feat || isFeatureEnabled(feat);
  });
});

const selectedPermissions = ref<Record<string, string[]>>({});

// Initialize permissions from prop
watch(
  () => props.member,
  (newMember) => {
    if (newMember) {
      selectedPermissions.value = JSON.parse(JSON.stringify(newMember.permissions || {}));
      // Ensure all modules exist in the object
      allModules.forEach((m) => {
        if (!selectedPermissions.value[m.id]) {
          selectedPermissions.value[m.id] = [];
        }
      });
    }
  },
  { immediate: true },
);

const getPermissionLevel = (moduleId: string) => {
  const perms = selectedPermissions.value[moduleId] || [];
  if (perms.includes("create") || perms.includes("edit") || perms.includes("delete"))
    return "Manage";
  if (perms.includes("view")) return "View";
  return "None";
};

const setPermissionLevel = (moduleId: string, level: string) => {
  if (level === "None") {
    selectedPermissions.value[moduleId] = [];
  } else if (level === "View") {
    selectedPermissions.value[moduleId] = ["view"];
  } else if (level === "Manage") {
    selectedPermissions.value[moduleId] = ["view", "create", "edit", "delete"];
  }
};

const setAllPermissions = (level: 'None' | 'View' | 'Manage') => {
  modules.value.forEach((m) => {
    setPermissionLevel(m.id, level);
  });
};

const handleSave = async () => {
  loading.value = true;
  try {
    await api.patch(`/organizations/${props.organizationId}/members/${props.member.id}`, {
      permissions: selectedPermissions.value,
    });
    toast.success('Permissions updated successfully');
    emit('updated');
    emit('close');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update permissions');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Dialog :open="true" @update:open="emit('close')">
    <DialogScrollContent class="max-w-2xl p-6 gap-6">
      <DialogHeader class="space-y-1.5 text-left border-b border-border/60 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <Shield class="w-5 h-5 text-primary" />
          </div>
          <div>
            <DialogTitle class="text-base font-semibold text-foreground">
              {{ t('modals.permissions.title') }}
            </DialogTitle>
            <DialogDescription class="text-xs text-muted-foreground">
              {{ t('modals.permissions.subtitle', { name: member.profiles?.full_name || member.email }) }}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div
        v-if="member.role !== 'staff'"
        class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-center text-xs text-amber-700 dark:text-amber-400 font-medium"
      >
        <AlertCircle class="w-4 h-4 text-amber-500 shrink-0" />
        <p>
          {{ t('modals.permissions.warning', { role: member.role }) }}
        </p>
      </div>

      <!-- Quick Presets Toolbar -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60">
        <span class="text-xs font-medium text-muted-foreground pl-1">Quick Presets:</span>
        <div class="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="setAllPermissions('Manage')"
            class="h-7 px-2.5 text-xs gap-1 cursor-pointer bg-background"
          >
            <Settings class="w-3 h-3 text-primary" />
            <span>Full Access</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="setAllPermissions('View')"
            class="h-7 px-2.5 text-xs gap-1 cursor-pointer bg-background"
          >
            <Eye class="w-3 h-3 text-sky-600 dark:text-sky-400" />
            <span>View Only</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            @click="setAllPermissions('None')"
            class="h-7 px-2.5 text-xs gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <CircleSlash class="w-3 h-3" />
            <span>Revoke All</span>
          </Button>
        </div>
      </div>

      <!-- Modules List -->
      <div class="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
        <div
          v-for="module in modules"
          :key="module.id"
          class="p-3 rounded-xl border border-border/60 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-border hover:bg-muted/20 transition-all"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-colors shrink-0">
              <component :is="module.icon" class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <h4 class="text-xs font-semibold text-foreground truncate">
                {{ t(`modals.permissions.modules.${module.id}.name`) }}
              </h4>
              <p class="text-[11px] text-muted-foreground truncate">
                {{ t(`modals.permissions.modules.${module.id}.description`) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1 bg-muted/70 p-1 rounded-lg border border-border/60 shrink-0 self-end sm:self-center">
            <button
              v-for="level in ['None', 'View', 'Manage']"
              :key="level"
              type="button"
              @click="setPermissionLevel(module.id, level)"
              :class="[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
                getPermissionLevel(module.id) === level
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              <component
                :is="level === 'None' ? CircleSlash : level === 'View' ? Eye : Settings"
                class="w-3 h-3"
                :class="getPermissionLevel(module.id) === level ? 'text-primary' : 'text-muted-foreground'"
              />
              <span>{{ level === 'None' ? t('modals.permissions.none') : level === 'View' ? t('modals.permissions.view') : t('modals.permissions.manage') }}</span>
            </button>
          </div>
        </div>
      </div>

      <DialogFooter class="border-t border-border/60 pt-4 flex sm:justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          @click="emit('close')"
          class="cursor-pointer"
        >
          {{ t('common.cancel') }}
        </Button>
        <Button
          type="button"
          @click="handleSave"
          :disabled="loading"
          class="gap-1.5 cursor-pointer"
        >
          <Loader2 v-if="loading" class="w-3.5 h-3.5 mr-1 animate-spin" />
          <span>{{ t('modals.permissions.save') }}</span>
        </Button>
      </DialogFooter>
    </DialogScrollContent>
  </Dialog>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}
</style>

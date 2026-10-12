<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";
import {
  Building2,
  ChevronsUpDown,
  Plus,
  Check,
  Settings as SettingsIcon,
} from "lucide-vue-next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import CreateOrganizationModal from "./CreateOrganizationModal.vue";
import UpgradePlanModal from "./UpgradePlanModal.vue";

defineProps<{
  isCollapsed?: boolean;
}>();

const authStore = useAuthStore();
const { organizations, currentOrganization, orgsLoading } =
  storeToRefs(authStore);
const { setCurrentOrganization } = authStore;
const router = useRouter();

const isCreateModalOpen = ref(false);
const isUpgradeModalOpen = ref(false);

const handleCreateClick = () => {
  if (authStore.ownedOrganizationsCount >= 1) {
    isUpgradeModalOpen.value = true;
  } else {
    isCreateModalOpen.value = true;
  }
};

const handleSelect = (org: any) => {
  setCurrentOrganization(org);
};

const handleOpenSettings = (org: any) => {
  if (currentOrganization.value?.id !== org.id) {
    setCurrentOrganization(org);
  }
  router.push("/organization-settings");
};
</script>

<template>
  <div class="w-full">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          :class="[
            'w-full flex items-center rounded-lg transition-all duration-300 group border select-none h-9',
            isCollapsed 
              ? 'justify-center px-0 py-0 gap-0 border-transparent hover:bg-muted/80' 
              : 'gap-2 px-2 py-1 bg-surface-subtle border-border/60 hover:bg-surface-interactive hover:border-border/80'
          ]"
          :title="isCollapsed ? 'Switch Organization' : 'Click to switch organization'"
        >
          <div
            :class="[
              'shrink-0 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 group-hover:scale-95 transition-all duration-300',
              isCollapsed ? 'w-7 h-7' : 'w-6 h-6'
            ]"
          >
            <template v-if="currentOrganization?.small_logo_url || currentOrganization?.logo_url">
              <img
                :src="currentOrganization?.small_logo_url || currentOrganization?.logo_url"
                :alt="`${currentOrganization?.name || 'Organization'} logo`"
                class="w-full h-full object-contain rounded-md"
              />
            </template>
            <Building2 v-else :class="isCollapsed ? 'w-4 h-4 text-primary' : 'w-3.5 h-3.5 text-primary'" />
          </div>

          <div v-show="!isCollapsed" class="flex flex-col items-start min-w-0 flex-1">
            <span class="text-[11px] font-bold leading-tight truncate w-full text-left text-foreground">
              {{ currentOrganization?.name || "Select Org" }}
            </span>
            <span
              class="text-[8px] text-muted-foreground font-black uppercase tracking-wider leading-none mt-0.5"
            >
              {{ currentOrganization?.role || "Organization" }}
            </span>
          </div>

          <ChevronsUpDown
            v-show="!isCollapsed"
            class="w-3 h-3 text-muted-foreground/60 group-hover:text-foreground/90 group-hover:scale-y-110 transition-all duration-200 shrink-0"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        class="w-60 rounded-lg p-1.5 shadow-lg border-border/40"
      >
        <DropdownMenuLabel
          class="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80"
        >
          My Organizations
        </DropdownMenuLabel>

        <div
          class="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1"
        >
          <DropdownMenuItem
            v-for="org in organizations"
            :key="org.id"
            @click="handleSelect(org)"
            :class="[
              'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors outline-none',
              currentOrganization?.id === org.id
                ? 'bg-primary/5 text-primary font-semibold'
                : 'hover:bg-muted/80 text-foreground/80 hover:text-foreground',
            ]"
          >
            <div
              class="shrink-0 w-7 h-7 rounded-md bg-surface-muted flex items-center justify-center overflow-hidden border border-border/50"
            >
              <template v-if="org.small_logo_url || org.logo_url">
                <img
                  :src="org.small_logo_url || org.logo_url"
                  :alt="`${org.name} logo`"
                  class="w-full h-full object-contain"
                />
              </template>
              <Building2 v-else class="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-xs font-semibold truncate leading-normal">{{ org.name }}</span>
              <span class="text-[9px] opacity-60 capitalize leading-none mt-0.5">{{ org.role }}</span>
            </div>
            
            <div class="flex items-center gap-1 shrink-0">
              <Check v-if="currentOrganization?.id === org.id" class="w-3.5 h-3.5 text-primary" />
              <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6 rounded hover:bg-muted-foreground/15 text-muted-foreground hover:text-foreground transition-colors"
                @click.stop.prevent="handleOpenSettings(org)"
              >
                <SettingsIcon class="w-3 h-3" />
              </Button>
            </div>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator class="my-1" />

        <DropdownMenuItem
          @click="handleCreateClick"
          class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors font-semibold text-xs outline-none"
        >
          <div
            class="shrink-0 w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-primary"
          >
            <Plus class="w-3.5 h-3.5" />
          </div>
          <span>Create New Organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <CreateOrganizationModal
      v-if="isCreateModalOpen"
      @close="isCreateModalOpen = false"
    />

    <UpgradePlanModal
      :open="isUpgradeModalOpen"
      @update:open="isUpgradeModalOpen = $event"
      title="Organization Limit Reached"
      description="Free plan users can only create 1 organization. Please upgrade to the Professional plan to create additional organizations."
    />
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
  background: var(--border);
  border-radius: 10px;
}
</style>

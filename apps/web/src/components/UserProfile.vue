<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";
import { LogOut, MoreVertical } from "lucide-vue-next";
import { Skeleton } from "@/components/ui/skeleton";

const props = withDefaults(
  defineProps<{
    collapsed?: boolean;
    variant?: "sidebar" | "topbar";
  }>(),
  {
    collapsed: false,
    variant: "sidebar",
  }
);

const authStore = useAuthStore();
const { profile, profileLoading } = storeToRefs(authStore);
const { signOut } = authStore;
const router = useRouter();

const isUserMenuOpen = ref(false);

const handleLogout = async () => {
  authStore.loading = true;
  await signOut();
  router.push("/login");
};

const navigate = (route: string) => {
  isUserMenuOpen.value = false;
  router.push(route);
};
</script>

<template>
  <div
    :class="[
      variant === 'sidebar' ? 'mt-auto border-t border-border px-2 py-4' : 'px-1 py-1.5',
      'transition-all duration-300',
    ]"
  >
    <!-- User Profile Dropdown -->
    <div id="user-profile" class="relative">
      <div
        @click="isUserMenuOpen = !isUserMenuOpen"
        :class="[
          'flex items-center cursor-pointer transition-all duration-300 group',
          variant === 'topbar' 
            ? 'p-0.5 rounded-full border border-border/40 hover:border-primary/50 hover:bg-muted/50 bg-background/50' 
            : (collapsed ? 'justify-center px-0 py-2.5 rounded-xl hover:bg-muted' : 'gap-3 pl-0 pr-2 py-1 rounded-xl hover:bg-muted'),
          isUserMenuOpen && variant !== 'topbar' ? 'bg-muted shadow-sm' : '',
        ]"
      >
        <div
          :class="[
            'rounded-full overflow-hidden bg-muted flex-shrink-0 transition-colors',
            variant === 'topbar' ? 'w-8 h-8' : 'w-8 h-8 border-2 border-border group-hover:border-primary/50'
          ]"
        >
          <Skeleton v-if="profileLoading" class="w-full h-full" />
          <template v-else>
            <img
              v-if="profile?.profile_picture"
              :src="profile.profile_picture"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm"
            >
              {{ profile?.full_name?.[0] || "U" }}
            </div>
          </template>
        </div>
        
        <!-- Sidebar layout metadata -->
        <template v-if="variant === 'sidebar'">
          <div
            v-if="!collapsed"
            class="flex flex-col min-w-0 flex-1 animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <Skeleton v-if="profileLoading" class="h-3 w-20 mb-1 bg-muted/50" />
            <span v-else class="text-xs font-bold truncate text-foreground">{{
              profile?.full_name || "User"
            }}</span>

            <Skeleton v-if="profileLoading" class="h-2 w-24 bg-muted/50" />
            <span v-else class="text-[10px] text-muted-foreground truncate">{{
              authStore.user?.email
            }}</span>
          </div>
          <div
            v-if="!collapsed && !profileLoading"
            class="p-1 rounded-md hover:bg-muted-foreground/10 transition-colors"
          >
            <MoreVertical
              class="w-4 h-4 text-muted-foreground group-hover:text-foreground"
            />
          </div>
        </template>
      </div>

      <!-- Dropdown Menu -->
      <transition name="fade-slide">
        <div
          v-if="isUserMenuOpen"
          @click.stop
          class="absolute bg-card border border-border rounded-2xl shadow-2xl py-2 z-50 overflow-hidden w-64 animate-in fade-in slide-in-from-top-2 duration-200"
          :class="[
            variant === 'topbar' ? 'top-full right-0 mt-2.5' : 'bottom-full left-0 mb-2',
          ]"
        >
          <!-- Expanded profile card in dropdown for top bar -->
          <div v-if="variant === 'topbar'" class="px-4 py-3.5 border-b border-border/50 mb-1.5 flex items-center gap-3 bg-muted/20">
            <div class="w-10 h-10 rounded-full border border-border overflow-hidden bg-muted flex-shrink-0 shadow-inner">
              <img v-if="profile?.profile_picture" :src="profile.profile_picture" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm">
                {{ profile?.full_name?.[0] || "U" }}
              </div>
            </div>
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-xs font-bold text-foreground truncate">{{ profile?.full_name || "User" }}</span>
              <span class="text-[10px] text-muted-foreground truncate">{{ authStore.user?.email }}</span>
            </div>
          </div>

          <div v-else class="px-4 py-2 border-b border-border/50 mb-1">
            <p
              class="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
            >
              Account Actions
            </p>
          </div>
          <button type="button"
            @click.stop="handleLogout"
            class="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-left"
          >
            <LogOut class="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </transition>
    </div>
  </div>

  <!-- Dropdown Click-outside Overlay -->
  <div
    v-if="isUserMenuOpen"
    @click="isUserMenuOpen = false"
    class="fixed inset-0 z-40 bg-transparent"
  ></div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

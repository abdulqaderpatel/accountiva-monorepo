<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Sidebar from "@/components/Sidebar.vue";
import TopBar from "@/components/TopBar.vue";
import { useNotificationStore, type NotificationItem } from "@/stores/notificationStore";
import {
  Bell,
  Receipt,
  FileText,
  Building2,
  Trash2,
  ArrowRight,
  Info,
  Check,
  Loader2,
  Users,
  Store,
  Package,
  UserPlus,
  Settings,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { toast } from "vue-sonner";
import { getCurrencySymbol } from "@/utils/formatters";

const router = useRouter();
const notificationStore = useNotificationStore();
const activeFilter = ref("all");

onMounted(async () => {
  await notificationStore.fetchNotifications(true);
});

const filteredNotifications = computed(() => {
  if (activeFilter.value === "all") return notificationStore.notifications;
  if (activeFilter.value === "actions") {
    return notificationStore.notifications.filter(n => n.category !== "invitation");
  }
  if (activeFilter.value === "invitations") {
    return notificationStore.notifications.filter(n => n.category === "invitation");
  }
  return notificationStore.notifications;
});

const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatCurrencyInText = (text: string) => {
  if (!text) return "";
  return text.replace(/\$/g, getCurrencySymbol());
};

const handleAction = async (notif: NotificationItem) => {
  try {
    await notificationStore.markAsRead(notif.id, true);
    if (notif.toast_message) {
      toast.success(notif.toast_message);
    }
    if (notif.action_route) {
      router.push(notif.action_route);
    }
  } catch (err) {
    toast.error("Failed to perform action");
  }
};

const markAllRead = async () => {
  try {
    await notificationStore.markAllAsRead();
    toast.success("All notifications marked as read");
  } catch (err) {
    toast.error("Failed to mark all as read");
  }
};

const deleteNotif = async (id: string) => {
  try {
    await notificationStore.deleteNotification(id);
    toast.success("Notification cleared");
  } catch (err) {
    toast.error("Failed to clear notification");
  }
};

const toggleRead = async (notif: NotificationItem) => {
  try {
    await notificationStore.markAsRead(notif.id, !notif.is_read);
    toast.success(!notif.is_read ? "Marked as unread" : "Marked as read");
  } catch (err) {
    toast.error("Failed to update status");
  }
};
</script>

<template>
  <div class="h-screen bg-background text-foreground flex flex-col overflow-hidden">
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar active-item="" />
      
      <main class="flex-1 overflow-y-auto bg-background custom-scrollbar">
        <div class="px-8 pt-4 md:pt-5 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full flex flex-col">
          <!-- Page Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 pb-4">
            <div class="space-y-1">
              <h1 class="ui-page-title">Notification Center</h1>
              <p class="ui-page-description">
                {{ notificationStore.unreadCount }} unread &middot; {{ notificationStore.notifications.length }} total
              </p>
            </div>
            <div class="flex items-center gap-2">
              <Button
                v-if="notificationStore.unreadCount > 0"
                variant="outline"
                @click="markAllRead"
                class="h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 border-border/50 hover:bg-muted"
              >
                <Check class="w-4 h-4" />
                Mark all as read
              </Button>
              <Button
                variant="outline"
                size="icon"
                @click="router.push('/settings/notifications')"
                class="h-11 w-11 rounded-xl border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Notification Settings"
              >
                <Settings class="w-4 h-4" />
              </Button>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="notificationStore.loading && !notificationStore.fetched" class="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 class="w-8 h-8 text-primary animate-spin" />
            <p class="text-xs text-muted-foreground font-medium">Loading notifications...</p>
          </div>

          <template v-else>
            <!-- Tabs / Filters -->
            <div class="flex items-center gap-8 border-b border-border pb-px overflow-x-auto scrollbar-hide shrink-0">
              <button type="button"
                v-for="filter in [
                  { id: 'all', label: 'All', count: notificationStore.notifications.length },
                  { id: 'actions', label: 'Activity', count: notificationStore.notifications.filter(n => n.category !== 'invitation').length },
                  { id: 'invitations', label: 'Invitations', count: notificationStore.notifications.filter(n => n.category === 'invitation').length }
                ]"
                :key="filter.id"
                @click="activeFilter = filter.id"
                :class="[
                  'pb-3.5 text-[10px] font-black uppercase tracking-widest transition-all relative shrink-0 flex items-center gap-1.5 select-none',
                  activeFilter === filter.id
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                ]"
              >
                <span>{{ filter.label }}</span>
                <span 
                  :class="[
                    'text-[9px] px-1.5 py-0.5 rounded-full font-bold transition-all',
                    activeFilter === filter.id
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground/80'
                  ]"
                >
                  {{ filter.count }}
                </span>
                <div
                  v-if="activeFilter === filter.id"
                  class="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full animate-in fade-in zoom-in-95 duration-150"
                ></div>
              </button>
            </div>

            <!-- Notifications List -->
            <div class="flex-1">
              <template v-if="filteredNotifications.length > 0">
                <div class="border border-border/40 overflow-hidden divide-y divide-border bg-card rounded-2xl shadow-xs">
                  <button
                    type="button"
                    v-for="notif in filteredNotifications"
                    :key="notif.id"
                    @click="handleAction(notif)"
                    :class="[
                      'flex w-full items-center gap-4 px-6 py-3 text-left transition duration-200 outline-none',
                      !notif.is_read ? 'bg-primary/[0.025] hover:bg-muted/50' : 'hover:bg-muted/40'
                    ]"
                  >
                    <!-- Icon Container -->
                    <span
                      :class="[
                        'grid shrink-0 place-items-center rounded-full h-8 w-8 border',
                        notif.severity === 'error' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                        notif.severity === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                        notif.severity === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                        'bg-primary/10 text-primary border-primary/20'
                      ]"
                    >
                      <FileText v-if="notif.category === 'invoice'" class="w-4 h-4" />
                      <Building2 v-else-if="notif.category === 'bill'" class="w-4 h-4" />
                      <Users v-else-if="notif.category === 'customer'" class="w-4 h-4" />
                      <Store v-else-if="notif.category === 'vendor'" class="w-4 h-4" />
                      <Package v-else-if="notif.category === 'item'" class="w-4 h-4" />
                      <UserPlus v-else-if="notif.category === 'invitation'" class="w-4 h-4" />
                      <Info v-else class="w-4 h-4" />
                    </span>

                    <!-- Content block -->
                    <div class="min-w-0 flex-1">
                      <span :class="['text-xs font-semibold block', !notif.is_read ? 'text-foreground' : 'text-muted-foreground']">
                        {{ formatCurrencyInText(notif.title) }}
                      </span>
                      <p class="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                        {{ formatCurrencyInText(notif.message) }}
                      </p>
                    </div>

                    <!-- Right-side column (time, actions, unread dot) -->
                    <div class="flex flex-col items-end shrink-0 gap-1.5 min-w-[120px]">
                      <!-- Top line: Time -->
                      <span class="text-[10px] text-muted-foreground/60 leading-none mr-1">{{ timeAgo(notif.created_at) }}</span>
                      
                      <!-- Bottom line: Actions and Unread Dot -->
                      <div class="flex items-center gap-2 mt-1">
                        <!-- Primary CTA if exists, always says "View" -->
                        <Button
                          v-if="notif.action_route || notif.action_label"
                          size="xs"
                          variant="outline"
                          @click.stop="handleAction(notif)"
                          class="h-6 rounded-md px-2.5 text-[10px] font-medium text-foreground hover:bg-muted border-border/50 transition-colors gap-1 shadow-none group/btn"
                        >
                          View
                          <ArrowRight class="w-3 h-3 text-muted-foreground transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                        </Button>

                        <!-- Mark Read (only shown if unread, disappears once clicked) -->
                        <button type="button"
                          v-if="!notif.is_read"
                          @click.stop="toggleRead(notif)"
                          class="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-1.5"
                        >
                          Mark as read
                        </button>

                        <!-- Unread Dot -->
                        <span v-if="!notif.is_read" class="h-1.5 w-1.5 rounded-full bg-primary animate-pulse ml-0.5"></span>
                      </div>
                    </div>
                  </button>
                </div>
              </template>

              <!-- Empty State -->
              <div v-else class="py-16 text-center space-y-4 max-w-sm mx-auto">
                <div class="w-16 h-16 rounded-full bg-muted/30 border border-border flex items-center justify-center mx-auto text-muted-foreground">
                  <Bell class="w-6 h-6" />
                </div>
                <div class="space-y-1">
                  <h3 class="ui-section-title">All caught up!</h3>
                  <p class="text-xs text-muted-foreground leading-relaxed">
                    No new notifications.
                  </p>
                </div>
              </div>
            </div>
          </template>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
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

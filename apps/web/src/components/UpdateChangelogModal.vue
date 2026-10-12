<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { Sparkles, Rocket, Zap, ArrowRight, Building2, User as UserIcon, X } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { storeToRefs } from "pinia";
import Modal from "@/components/Modal.vue";
import { useI18n } from "vue-i18n";

const emit = defineEmits(["close"]);

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
const { t } = useI18n();

// The current update ID - change this whenever you want the modal to reappear for everyone
const CURRENT_UPDATE_ID = "v1.2-org-branding";

const isOpen = ref(false);

const checkUpdate = () => {
  if (!user.value) return;

  const lastSeenUpdate = localStorage.getItem("last_seen_update");
  if (lastSeenUpdate !== CURRENT_UPDATE_ID) {
    // Delay slightly for a better entrance
    setTimeout(() => {
      isOpen.value = true;
    }, 1500); // Slightly longer delay to let the dashboard load
  }
};

onMounted(() => {
  checkUpdate();
});

watch(user, (newUser) => {
  if (newUser) {
    checkUpdate();
  } else {
    isOpen.value = false;
  }
});

const handleClose = () => {
  localStorage.setItem("last_seen_update", CURRENT_UPDATE_ID);
  isOpen.value = false;
  emit("close");
};

const updates = [
  {
    id: "branding",
    icon: Building2,
    color: "text-primary",
    bg: "bg-primary/10"
  },
  {
    id: "team",
    icon: UserIcon,
    color: "text-primary",
    bg: "bg-primary/10"
  },
  {
    id: "ui",
    icon: Sparkles,
    color: "text-primary",
    bg: "bg-primary/10"
  }
];
</script>

<template>
  <Modal
    :open="isOpen"
    z-index-class="z-[200]"
    max-width-class="max-w-lg"
    body-class="px-8 pb-8 pt-6 space-y-6"
    @close="handleClose"
  >
    <template #header>
      <!-- Header Image/Banner Area -->
      <div class="h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent relative overflow-hidden">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(var(--primary-rgb),0.15),transparent)]"></div>
        <div class="absolute inset-0 flex items-center justify-center opacity-10">
          <Rocket class="w-48 h-48 rotate-12 text-primary" />
        </div>
        
        <button type="button"
          @click="handleClose"
          aria-label="Close dialog"
          class="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X class="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </template>

    <div class="space-y-1">
      <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/20 mb-2">
        <Zap class="w-2.5 h-2.5 fill-current" />
        {{ t('modals.changelog.tag') }}
      </div>
      <h2 class="text-3xl font-black tracking-tight text-foreground">
        {{ t('modals.changelog.title', { version: 'v1.2' }) }}
      </h2>
      <p class="text-sm text-muted-foreground font-medium">
        {{ t('modals.changelog.subtitle') }}
      </p>
    </div>

    <!-- Updates List -->
    <div class="space-y-4">
      <div 
        v-for="(update, index) in updates" 
        :key="index"
        class="flex items-start gap-4 p-4 rounded-2xl border border-border/50 bg-muted/5 group hover:bg-muted/10 transition-colors"
      >
        <div :class="['w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-primary/20 shadow-sm', update.bg, update.color]">
          <component :is="update.icon" class="w-5 h-5" />
        </div>
        <div class="space-y-0.5">
          <h3 class="font-bold text-sm text-foreground">{{ t(`modals.changelog.updates.${update.id}.title`) }}</h3>
          <p class="text-[12px] text-muted-foreground leading-relaxed font-medium">
            {{ t(`modals.changelog.updates.${update.id}.description`) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Action -->
    <div class="pt-2">
      <Button 
        @click="handleClose"
        class="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-primary/10 group"
      >
        {{ t('modals.changelog.button') }}
        <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </Button>
      <p class="text-center text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-4 opacity-50">
        {{ t('modals.changelog.edition') }}
      </p>
    </div>
  </Modal>
</template>

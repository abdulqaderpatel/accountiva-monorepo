<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/composables/useTheme";
import { Toaster } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/spinner";
import ProductTour from "@/components/ProductTour.vue";
import ChatBot from "@/components/ChatBot.vue";



const authStore = useAuthStore();
const { loading } = storeToRefs(authStore);
const { theme } = useTheme(); // Initialize theme


onMounted(async () => {
  await authStore.init();
});


</script>

<template>
  <Toaster :theme="theme" position="bottom-right" />
  <div
    v-if="loading"
    class="min-h-screen bg-background flex items-center justify-center"
  >
    <Spinner size="xl" />
  </div>
  <template v-else>
    <router-view />
    <!-- Global Components -->
    <ProductTour />
    <ChatBot />
  </template>
</template>

<style></style>

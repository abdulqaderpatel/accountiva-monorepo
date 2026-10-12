<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Mail, ArrowRight, ArrowLeft } from "lucide-vue-next";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "vue-sonner";
import { useAccountivaLogo } from '@/composables/useAccountivaLogo';
import { useAuthStore } from "@/stores/authStore";

const email = ref("");
const loading = ref(false);
const submitted = ref(false);
const authStore = useAuthStore();
const router = useRouter();
const { accountivaLogoSrc } = useAccountivaLogo();

const handleSubmit = async () => {
  loading.value = true;
  try {
    await authStore.forgotPassword(email.value);
    submitted.value = true;
    toast.success("Reset link sent!", {
      description: "Check your email for instructions to reset your password.",
    });
  } catch (error: any) {
    const message = error.response?.data?.error || error.message || "Failed to send reset link";
    toast.error("Error", {
      description: message,
    });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-8">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--color-primary-foreground),var(--background))] opacity-20 -z-10"></div>

    <!-- Branding -->
    <div class="mb-10 flex items-center gap-3 group cursor-default">
      <div class="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110">
        <img :src="accountivaLogoSrc" alt="Accountiva Logo" />
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">
        Accountiva
      </h1>
    </div>

    <Card class="w-full max-w-md shrink-0 border-border/60 bg-card/70 text-foreground shadow-none backdrop-blur-xl">
      <CardHeader class="space-y-1">
        <CardTitle class="text-2xl font-bold tracking-tight text-center">Forgot password?</CardTitle>
        <CardDescription class="text-sm text-muted-foreground text-center">
          {{ submitted ? "Check your inbox for the reset link" : "Enter your email to receive a password reset link" }}
        </CardDescription>
      </CardHeader>

      <CardContent class="grid gap-6">
        <div v-if="!submitted">
          <form @submit.prevent="handleSubmit" class="grid gap-4">
            <div class="grid gap-2">
              <Label for="email" class="text-muted-foreground">Email address</Label>
              <div class="relative">
                <Mail class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  v-model="email"
                  required
                  class="pl-9 bg-background/50 border-border focus:border-primary/50"
                />
              </div>
            </div>

            <Button
              type="submit"
              :disabled="loading"
              class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl mt-2 group flex items-center justify-center relative overflow-hidden uppercase tracking-widest text-[10px]"
            >
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 flex items-center justify-center">
                  <Spinner v-if="loading" size="sm" />
                </div>
                <span>{{ loading ? 'Sending...' : 'Send Reset Link' }}</span>
                <div class="w-5 h-5 flex items-center justify-center">
                  <ArrowRight
                    v-if="!loading"
                    class="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                  />
                </div>
              </div>
            </Button>
          </form>
        </div>
        <div v-else class="text-center space-y-4">
          <div class="p-4 rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto">
            <Mail class="h-8 w-8 text-primary" />
          </div>
          <p class="text-sm text-muted-foreground">
            We've sent an email to <strong>{{ email }}</strong> with a link to reset your password.
          </p>
          <Button variant="outline" class="w-full" @click="submitted = false">
            Didn't receive it? Try again
          </Button>
        </div>
      </CardContent>

      <CardFooter>
        <router-link
          to="/login"
          class="text-sm text-muted-foreground hover:text-primary flex items-center justify-center w-full"
        >
          <ArrowLeft class="mr-2 h-4 w-4" /> Back to login
        </router-link>
      </CardFooter>
    </Card>
  </div>
</template>

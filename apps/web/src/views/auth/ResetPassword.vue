<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
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
import { Lock, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-vue-next";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "vue-sonner";
import { useAccountivaLogo } from '@/composables/useAccountivaLogo';
import { useAuthStore } from "@/stores/authStore";

const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const success = ref(false);
const token = ref("");
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const { accountivaLogoSrc } = useAccountivaLogo();

onMounted(() => {
  // Better Auth sends the token in the query parameter
  const queryToken = (route.query.token as string) || "";
  
  if (queryToken) {
    token.value = queryToken;
  } else {
    // Better Auth uses query params for the token
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      token.value = params.get("access_token") || "";
    }
  }

  if (!token.value) {
    toast.error("Invalid link", {
      description: "This password reset link is invalid or has expired.",
    });
    router.push("/login");
  }
});

const handleReset = async () => {
  if (password.value !== confirmPassword.value) {
    toast.error("Passwords do not match");
    return;
  }

  if (password.value.length < 6) {
    toast.error("Password too short", {
      description: "Password must be at least 6 characters long.",
    });
    return;
  }

  loading.value = true;
  try {
    // Pass the token to resetPassword
    await authStore.resetPassword(password.value, token.value);
    success.value = true;
    toast.success("Password updated!", {
      description: "Your password has been successfully reset.",
    });
    setTimeout(() => {
      router.push("/login");
    }, 3000);
  } catch (error: any) {
    const message = error.response?.data?.error || error.message || "Failed to reset password";
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
        <CardTitle class="text-2xl font-bold tracking-tight text-center">Set new password</CardTitle>
        <CardDescription class="text-sm text-muted-foreground text-center">
          {{ success ? "Your password has been changed" : "Enter a secure new password for your account" }}
        </CardDescription>
      </CardHeader>

      <CardContent class="grid gap-6">
        <div v-if="!success">
          <form @submit.prevent="handleReset" class="grid gap-4">
            <div class="grid gap-2">
              <Label for="password" class="text-muted-foreground">New Password</Label>
              <div class="relative">
                <Lock class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  v-model="password"
                  required
                  class="pl-9 pr-10 bg-background/50 border-border focus:border-primary/50"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  class="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye v-if="!showPassword" class="h-4 w-4" />
                  <EyeOff v-else class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div class="grid gap-2">
              <Label for="confirmPassword" class="text-muted-foreground">Confirm New Password</Label>
              <div class="relative">
                <Lock class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  v-model="confirmPassword"
                  required
                  class="pl-9 pr-10 bg-background/50 border-border focus:border-primary/50"
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  :aria-label="showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'"
                  class="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye v-if="!showConfirmPassword" class="h-4 w-4" />
                  <EyeOff v-else class="h-4 w-4" />
                </button>
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
                <span>{{ loading ? 'Updating...' : 'Reset Password' }}</span>
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
          <div class="p-4 rounded-full bg-success/10 w-16 h-16 flex items-center justify-center mx-auto">
            <CheckCircle2 class="h-8 w-8 text-success" />
          </div>
          <p class="text-sm text-muted-foreground">
            Password updated successfully. Redirecting you to login...
          </p>
          <Button class="w-full" @click="router.push('/login')">
            Go to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

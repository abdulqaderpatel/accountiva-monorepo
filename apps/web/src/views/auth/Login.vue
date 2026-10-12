<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-vue-next';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'vue-sonner';
import { useAccountivaLogo } from '@/composables/useAccountivaLogo';
import { useAuthStore } from '@/stores/authStore';
import { authClient } from '@/lib/auth-client';
const { accountivaLogoSrc } = useAccountivaLogo();

const router = useRouter();
const route = useRoute();
const email = ref((route.query.email as string) || '');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');
const authStore = useAuthStore();
const socialLoading = ref<string | null>(null);
const showPassword = ref(false);
const resendLoading = ref(false);

onMounted(() => {
  if (route.query.error) {
    const rawErr = String(route.query.error);
    const friendlyMsg = rawErr === 'please_restart_the_process'
      ? 'Authentication session expired or restarted. Please sign in again.'
      : 'Sign in failed. Please try again.';
    toast.error('Authentication Notice', { description: friendlyMsg });
  }
});

const handleResendVerification = async () => {
  if (!email.value) {
    toast.error('Email required', { description: 'Please enter your email address first.' });
    return;
  }

  resendLoading.value = true;
  try {
    const { error } = await authClient.sendVerificationEmail({
      email: email.value,
      callbackURL: window.location.origin + '/verify-email',
    });

    if (error) throw error;

    toast.success('Verification email sent!', {
      description: 'Please check your inbox (and spam folder) for the link.',
    });
  } catch (error: any) {
    toast.error('Failed to send email', { description: error.message });
  } finally {
    resendLoading.value = false;
  }
};

const handleLogin = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const res = await authStore.signIn(email.value, password.value);
    
    // Check if unverified (from our interceptor)
    if (res && (res as any).error === 'EMAIL_NOT_VERIFIED') {
      toast.info('Verification required', {
        description: 'A new verification link has been sent to your email.',
      });
      router.push({ 
        path: '/verify-email', 
        query: { email: email.value, sent: 'true' } 
      });
      return;
    }

    toast.success('Welcome back!', {
      description: 'You have successfully signed in to your account.',
    });

    const redirectPath = (route.query.redirect as string) || '/';
    router.push(redirectPath);
  } catch (error: any) {
    const message = error.response?.data?.error || error.message || 'Failed to sign in';
    
    // Better Auth might also return this directly if interceptor is bypassed
    if (message === 'EMAIL_NOT_VERIFIED' || error.code === 'EMAIL_NOT_VERIFIED') {
      toast.info('Verification required', {
        description: 'Please verify your email to continue.',
      });
      router.push({ 
        path: '/verify-email', 
        query: { email: email.value } 
      });
      return;
    }

    errorMessage.value = message;
    toast.error('Sign in failed', {
      description: message,
    });
  } finally {
    loading.value = false;
  }
};

const handleSocialLogin = async (provider: 'github' | 'google') => {
  try {
    socialLoading.value = provider;
    errorMessage.value = '';
    await authStore.signInWithSocial(provider);
  } catch (error: any) {
    console.error(`Error signing in with ${provider}:`, error.message);
    errorMessage.value = error.message;
    toast.error('Connection failed', {
      description: error.message,
    });
    socialLoading.value = null;
  }
};
</script>

<template>
  <div class="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-8">
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--color-primary-foreground),var(--background))] opacity-20 -z-10"
    ></div>

    <!-- Branding -->
    <div class="relative mb-4 flex items-center gap-2 cursor-default group sm:mb-5">
      <div
        class="relative z-10 flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
      >
        <img
          :src="accountivaLogoSrc"
          alt="Accountiva Logo"
          class="w-full h-full object-contain"
        />
      </div>

      <h1 class="relative z-10 text-2xl font-bold tracking-tight text-foreground">Accountiva™</h1>
    </div>

    <Card class="w-full max-w-md shrink-0 gap-4 border-border/60 bg-card/70 py-5 text-foreground shadow-none backdrop-blur-xl">
      <CardHeader class="space-y-1">
        <CardTitle class="text-center text-2xl font-bold tracking-tight">Welcome back</CardTitle>
        <CardDescription class="text-sm text-muted-foreground text-center">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>

      <CardContent class="grid gap-4">
        <div class="grid grid-cols-1 gap-4">
          <Button
            variant="outline"
            class="border-border hover:bg-muted hover:text-foreground group flex items-center justify-center gap-2"
            @click="handleSocialLogin('google')"
            :disabled="!!socialLoading"
          >
            <Spinner v-if="socialLoading === 'google'" size="sm" />
            <svg
              v-if="socialLoading !== 'google'"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>{{ socialLoading === 'google' ? 'Connecting...' : 'Google' }}</span>
          </Button>
        </div>

        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <span class="w-full border-t border-border"></span>
          </div>
          <div class="relative flex justify-center text-xs">
            <span class="bg-card px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        <form @submit.prevent="handleLogin" class="grid gap-4">
          <div class="grid gap-2">
            <Label for="email" class="text-muted-foreground">Email</Label>
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

          <div class="grid gap-2">
            <div class="flex items-center justify-between">
              <Label for="password" class="text-muted-foreground">Password</Label>
              <router-link to="/forgot-password" class="text-sm text-muted-foreground hover:text-primary"
                >Forgot password?</router-link
              >
            </div>
            <div class="relative">
              <Lock class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                :type="showPassword ? 'text' : 'password'"
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

          <div v-if="errorMessage" class="space-y-3">
            <p class="text-sm text-destructive text-center font-medium">
              {{ errorMessage }}
            </p>
            <div
              v-if="
                errorMessage.toLowerCase().includes('verify') || errorMessage.toLowerCase().includes('verification')
              "
              class="flex justify-center"
            >
              <Button
                type="button"
                variant="link"
                class="text-xs text-primary h-auto p-0"
                @click="handleResendVerification"
                :disabled="resendLoading"
              >
                <Spinner v-if="resendLoading" size="xs" class="mr-1" />
                {{ resendLoading ? 'Sending...' : 'Resend verification email' }}
              </Button>
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
              <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
              <div class="w-5 h-5 flex items-center justify-center">
                <ArrowRight
                  v-if="!loading"
                  class="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                />
              </div>
            </div>
          </Button>
        </form>
      </CardContent>

      <CardFooter class="flex flex-col gap-4">
        <div class="text-sm text-muted-foreground text-center">
          Don't have an account?
          <router-link
            :to="{ path: '/signup', query: { email: email || route.query.email, redirect: route.query.redirect } }"
            class="text-primary hover:text-primary/80 font-medium ml-1"
            >Sign up</router-link
          >
        </div>
      </CardFooter>
    </Card>
  </div>
</template>

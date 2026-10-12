<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Mail, Lock, User, Building2, Receipt, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-vue-next';
import { useAccountivaLogo } from '@/composables/useAccountivaLogo';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'vue-sonner';
const { accountivaLogoSrc } = useAccountivaLogo();

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const loading = ref(false);
const errorMessage = ref('');
const fullName = ref('');
const email = ref((route.query.email as string) || '');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const handleSignup = async () => {
  if (!fullName.value || !email.value || !password.value || !confirmPassword.value) return;

  if (password.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters long';
    toast.error('Invalid password', { description: errorMessage.value });
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match';
    toast.error('Sign up failed', { description: errorMessage.value });
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const data = await authStore.signUp({
      email: email.value,
      password: password.value,
      name: fullName.value,
      redirect: route.query.redirect,
    });

    toast.success('Account created!', {
      description: 'Please check your email to verify your account.',
    });
    router.push({
      path: '/check-email',
      query: {
        email: email.value,
        redirect: route.query.redirect,
      },
    });
  } catch (error: any) {
    const message = error.response?.data?.error || error.message;
    errorMessage.value = message;
    toast.error('Registration failed', {
      description: message,
    });
    loading.value = false;
  }
};

const socialLoading = ref<string | null>(null);

const handleSocialLogin = async (provider: 'github' | 'google') => {
  try {
    socialLoading.value = provider;
    errorMessage.value = '';
    await authStore.signInWithSocial(provider);
    toast.success('Success', {
      description: `Signed in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}.`,
    });
  } catch (error: any) {
    console.error(`Error signing in with ${provider}:`, error.message);
    errorMessage.value = error.message;
    toast.error('Authentication failed', {
      description: error.message,
    });
    socialLoading.value = null;
  }
};
</script>

<template>
  <div class="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-8">
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,var(--color-primary-foreground),var(--background))] opacity-20 -z-10"
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

    <Card class="w-full max-w-md shrink-0 gap-4 overflow-hidden border-border/60 bg-card/70 py-5 text-foreground shadow-none backdrop-blur-xl">
      <CardHeader class="space-y-1">
        <CardTitle class="text-center text-2xl font-bold tracking-tight">Create account</CardTitle>
        <CardDescription class="text-sm text-muted-foreground text-center">
          Join us today to start your journey
        </CardDescription>
      </CardHeader>

      <CardContent class="grid gap-4">
        <div class="space-y-4">
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
            <span class="bg-card px-2 text-muted-foreground">Or sign up with email</span>
            </div>
          </div>

          <form @submit.prevent="handleSignup" class="grid gap-4">
            <div class="grid gap-2">
              <Label for="fullName" class="text-muted-foreground">Full Name</Label>
              <div class="relative">
                <User class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  v-model="fullName"
                  required
                  class="pl-9 bg-background/50 border-border focus:border-primary/50"
                />
              </div>
            </div>

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
              <Label for="password" class="text-muted-foreground">Password</Label>
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

            <div class="grid gap-2">
              <Label for="confirmPassword" class="text-muted-foreground">Confirm Password</Label>
              <div class="relative">
                <Lock class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
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
                <span>{{ loading ? 'Processing...' : 'Continue' }}</span>
                <div class="w-5 h-5 flex items-center justify-center">
                  <ArrowRight
                    v-if="!loading"
                    class="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                  />
                </div>
              </div>
            </Button>

            <p v-if="errorMessage" class="text-sm text-destructive text-center font-medium mt-2">
              {{ errorMessage }}
            </p>
          </form>
        </div>
      </CardContent>

      <CardFooter class="flex flex-col gap-4">
        <div class="text-sm text-muted-foreground text-center">
          Already have an account?
          <router-link
            :to="{ path: '/login', query: { redirect: route.query.redirect } }"
            class="text-primary hover:text-primary/80 font-medium ml-1"
            >Log in</router-link
          >
        </div>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "vue-sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { UserPlus, Building2, Shield, ArrowRight, LogIn, UserCircle } from "lucide-vue-next";
import { useAccountivaLogo } from '@/composables/useAccountivaLogo';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { accountivaLogoSrc } = useAccountivaLogo();

const token = route.params.token as string;
const invitation = ref<any>(null);
const loading = ref(true);
const accepting = ref(false);
const error = ref<string | null>(null);

const authQuery = computed(() => ({
  email: invitation.value?.email,
  redirect: route.fullPath,
}));

const fetchInvitation = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.get(`/organizations/invitations/${token}`);
    invitation.value = response.data;
  } catch (err: any) {
    error.value = err.response?.data?.error || "Invalid or expired invitation";
  } finally {
    loading.value = false;
  }
};

const handleAccept = async () => {
  if (!authStore.session) {
    router.push({ path: '/signup', query: authQuery.value });
    return;
  }

  if (authStore.user?.email?.toLowerCase() !== invitation.value.email?.toLowerCase()) {
    toast.error("Account mismatch", {
      description: `This invitation was sent to ${invitation.value.email}. Please switch accounts to accept.`
    });
    return;
  }

  accepting.value = true;
  try {
    await api.post(`/organizations/invitations/${token}/accept`);
    toast.success("Invitation accepted!", {
      description: `You are now a member of ${invitation.value.organizations.name}.`
    });

    // Refresh organizations list to include the newly joined one
    await authStore.fetchOrganizations();

    // Switch active workspace context to the target organization
    const targetOrg = authStore.organizations.find(
      (o: any) => o.id === invitation.value.organization_id
    );
    if (targetOrg) {
      authStore.setCurrentOrganization(targetOrg);
    }

    router.push("/dashboard");
  } catch (err: any) {
    toast.error("Failed to accept invitation", {
      description: err.response?.data?.error || "Please try again later."
    });
  } finally {
    accepting.value = false;
  }
};

onMounted(async () => {
  await fetchInvitation();
});

const isWrongAccount = computed(() => {
  return (
    authStore.session &&
    invitation.value &&
    authStore.user?.email?.toLowerCase() !== invitation.value.email?.toLowerCase()
  );
});
</script>

<template>
  <div class="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-8">
    <!-- Background Gradient -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--color-primary-foreground),var(--background))] opacity-20 -z-10"></div>

    <!-- Branding -->
    <div class="mb-10 flex items-center gap-3 group cursor-default">
      <div class="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110">
        <img :src="accountivaLogoSrc" alt="Accountiva Logo" />
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">Accountiva™</h1>
    </div>

    <Card class="w-full max-w-md shrink-0 overflow-hidden border-border/60 bg-card/70 text-foreground shadow-none backdrop-blur-xl">
      <!-- Loading State -->
      <div v-if="loading" class="p-12 flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p class="text-sm text-muted-foreground animate-pulse font-medium">Validating invitation...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-8 text-center space-y-6">
        <div class="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <UserPlus class="w-8 h-8 text-destructive" />
        </div>
        <div class="space-y-2">
          <CardTitle class="text-2xl font-bold">Invitation Error</CardTitle>
          <CardDescription class="text-base">{{ error }}</CardDescription>
        </div>
        <Button @click="router.push('/login')" variant="outline" class="w-full h-11 rounded-xl">
          Back to Login
        </Button>
      </div>

      <!-- Success State -->
      <template v-else-if="invitation">
        <CardHeader class="pb-2 text-center bg-muted/30 border-b border-border/50">
          <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Building2 class="w-8 h-8 text-primary" />
          </div>
          <CardTitle class="text-2xl font-bold tracking-tight">Organization Invitation</CardTitle>
          <CardDescription class="text-sm">
            You've been invited to join <span class="text-foreground font-bold">{{ invitation.organizations.name }}</span>
          </CardDescription>
        </CardHeader>

        <CardContent class="pt-8 space-y-6">
          <div class="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-4">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-card border border-border">
                <Shield class="w-4 h-4 text-primary" />
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assigned Role</span>
                <span class="text-sm font-bold capitalize">{{ invitation.role }}</span>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-card border border-border">
                <LogIn class="w-4 h-4 text-primary" />
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Invited Email</span>
                <span class="text-sm font-bold">{{ invitation.email }}</span>
              </div>
            </div>
          </div>

          <!-- Account Mismatch Warning -->
          <div v-if="isWrongAccount" class="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2">
            <p class="text-xs text-destructive font-bold flex items-center gap-2 uppercase tracking-tight">
              <UserCircle class="w-3.5 h-3.5" />
              Account Mismatch
            </p>
            <p class="text-[11px] text-destructive/80 leading-relaxed">
              You are currently logged in as <span class="font-bold">{{ authStore.user?.email }}</span>.
              Please switch to <span class="font-bold underline">{{ invitation.email }}</span> to accept this invitation.
            </p>
          </div>
        </CardContent>

        <CardFooter class="flex flex-col gap-4 pb-8">
          <Button
            v-if="authStore.session"
            @click="handleAccept"
            :disabled="accepting || (isWrongAccount)"
            class="w-full h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] group relative overflow-hidden"
          >
            <Spinner v-if="accepting" size="sm" class="mr-2" />
            <span v-else>{{ authStore.session ? 'Accept & Join Organization' : 'Continue to Accept' }}</span>
            <ArrowRight v-if="!accepting" class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>

          <template v-else>
            <Button
              @click="router.push({ path: '/signup', query: authQuery })"
              class="w-full h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] group relative overflow-hidden"
            >
              <UserPlus class="w-4 h-4 mr-2" />
              Create Account & Accept
              <ArrowRight class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button
              variant="outline"
              @click="router.push({ path: '/login', query: authQuery })"
              class="w-full h-11 rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              <LogIn class="w-4 h-4 mr-2" />
              Sign In Instead
            </Button>
          </template>

          <div v-if="isWrongAccount" class="w-full">
            <Button
              variant="outline"
              @click="authStore.signOut().then(() => router.push({ path: '/login', query: authQuery }))"
              class="w-full h-11 rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              Sign out & Switch Account
            </Button>
          </div>

          <p v-if="!authStore.session" class="text-[11px] text-muted-foreground text-center">
            Use the invited email above so we can match your account to this invitation.
          </p>
        </CardFooter>
      </template>
    </Card>
  </div>
</template>

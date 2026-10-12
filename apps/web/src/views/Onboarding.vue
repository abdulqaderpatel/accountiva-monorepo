<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "vue-sonner";
import {
  Building2,
  ArrowRight,
  Loader2,
  LogOut,
  UserPlus,
  ChevronLeft
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useAccountivaLogo } from '@/composables/useAccountivaLogo';
import OrganizationFormFields, { type OrganizationFormData } from "@/components/OrganizationFormFields.vue";

const authStore = useAuthStore();
const router = useRouter();
const { accountivaLogoSrc } = useAccountivaLogo();
const loading = ref(false);
const step = ref<"choice" | "create" | "join">("choice");

const formData = ref<OrganizationFormData>({
  name: "",
  country: "India",
  region: "India",
  currency: "INR",
  is_gst_registered: false,
  gstin: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  state_code: "",
  postal_code: "",
  address: "",
  industry_type: "",
  business_nature: "",
});

const inviteTokenInput = ref("");
const previewUrl = ref<string | null>(null);
const selectedFile = ref<File | null>(null);

const handleSelectFile = (file: File) => {
  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
};

const handleSubmit = async () => {
  if (!formData.value.name.trim()) {
    toast.error("Organization name is required");
    return;
  }

  if (formData.value.region === "India" && formData.value.postal_code && formData.value.postal_code.length !== 6) {
    toast.error("PIN code must be exactly 6 digits");
    return;
  }

  try {
    loading.value = true;
    
    const data = new FormData();
    data.append("name", formData.value.name.trim());
    data.append("region", formData.value.region);
    data.append("country", formData.value.country || (formData.value.region === "India" ? "India" : "Other"));
    data.append("currency", formData.value.currency);
    data.append("is_gst_registered", String(formData.value.is_gst_registered));
    data.append("gstin", formData.value.gstin || "");
    data.append("address_line1", formData.value.address_line1 || "");
    data.append("address_line2", formData.value.address_line2 || "");
    data.append("city", formData.value.city || "");
    data.append("state", formData.value.state || "");
    data.append("state_code", formData.value.state_code || "");
    data.append("postal_code", formData.value.postal_code || "");
    data.append("industry_type", formData.value.industry_type || "");
    data.append("business_nature", formData.value.business_nature || "");
    
    if (selectedFile.value) {
      data.append("logo", selectedFile.value);
    }

    await authStore.createOrganization(data);
    toast.success("Welcome to Accountiva!");
    router.push("/dashboard");
  } catch (err: any) {
    toast.error(err.response?.data?.error || "Failed to create organization");
  } finally {
    loading.value = false;
  }
};

const handleJoinInvite = () => {
  const rawInput = inviteTokenInput.value.trim();
  if (!rawInput) {
    toast.error("Please enter an invitation token or link");
    return;
  }

  // Extract token if they pasted a link
  const token = rawInput.split("/").pop();
  if (!token) {
    toast.error("Could not parse invitation token. Please check your link/token.");
    return;
  }

  toast.success("Redirecting to invitation check...");
  router.push(`/invite/${token}`);
};

const handleLogout = async () => {
  await authStore.signOut();
  router.push("/login");
};
</script>

<template>
  <div class="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-8">
    <!-- Decorative background elements -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,var(--color-primary-foreground),var(--background))] opacity-20 -z-10"></div>

    <!-- Branding -->
    <div class="mb-8 flex items-center gap-3 group cursor-default">
      <div class="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
        <img :src="accountivaLogoSrc" alt="Accountiva Logo" />
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">
        Accountiva
      </h1>
    </div>

    <!-- Card Wrapper -->
    <Card class="w-full max-w-xl shrink-0 overflow-hidden border-border bg-card text-card-foreground shadow-sm">
      <!-- HEADER: CHOICE STEP -->
      <div v-if="step === 'choice'" class="px-6 py-5 border-b border-border flex items-center gap-3.5">
        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
          <Building2 class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground leading-snug">Set up your workspace</h2>
          <p class="text-xs text-muted-foreground mt-0.5">
            Choose how you want to get started with Accountiva
          </p>
        </div>
      </div>

      <!-- HEADER: CREATE STEP -->
      <div v-else-if="step === 'create'" class="px-6 py-4 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0" @click="step = 'choice'">
          <ChevronLeft class="w-4 h-4" />
        </Button>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
            <Building2 class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-foreground leading-snug">Create an Organization</h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              Configure a fresh accounting workspace for your business
            </p>
          </div>
        </div>
      </div>

      <!-- HEADER: JOIN STEP -->
      <div v-else-if="step === 'join'" class="px-6 py-4 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0" @click="step = 'choice'">
          <ChevronLeft class="w-4 h-4" />
        </Button>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
            <UserPlus class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-foreground leading-snug">Join an Organization</h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              Enter an invite token or link to access an existing workspace
            </p>
          </div>
        </div>
      </div>

      <!-- CONTENT -->
      <CardContent class="p-6">
        <!-- 1. STEP: CHOICE -->
        <div v-if="step === 'choice'" class="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <!-- Option A: Create -->
          <div
            @click="step = 'create'"
            class="group flex flex-col justify-between p-5 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer text-left space-y-4 shadow-xs"
          >
            <div class="space-y-3">
              <div class="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Building2 class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Create Organization</h3>
                <p class="text-xs text-muted-foreground leading-relaxed mt-1">
                  Configure a fresh workspace, set local region, currency, tax registers, and invite your team.
                </p>
              </div>
            </div>
            <div class="flex items-center text-xs font-medium text-primary pt-1 select-none">
              <span>Get started</span>
              <ArrowRight class="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          <!-- Option B: Join -->
          <div
            @click="step = 'join'"
            class="group flex flex-col justify-between p-5 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer text-left space-y-4 shadow-xs"
          >
            <div class="space-y-3">
              <div class="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <UserPlus class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Join Existing</h3>
                <p class="text-xs text-muted-foreground leading-relaxed mt-1">
                  Have an invitation link or token? Paste it here to access your company workspace.
                </p>
              </div>
            </div>
            <div class="flex items-center text-xs font-medium text-primary pt-1 select-none">
              <span>Accept invite</span>
              <ArrowRight class="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>

        <!-- 2. STEP: CREATE -->
        <form v-else-if="step === 'create'" @submit.prevent="handleSubmit" id="create-org-form">
          <OrganizationFormFields
            v-model="formData"
            :previewUrl="previewUrl"
            @select-file="handleSelectFile"
          />
        </form>

        <!-- 3. STEP: JOIN -->
        <div v-else-if="step === 'join'" class="space-y-4 py-2">
          <div class="space-y-1.5 text-left">
            <Label for="invite-token-input" class="text-xs font-medium text-foreground">
              Invitation Link or Token
            </Label>
            <Input
              id="invite-token-input"
              v-model="inviteTokenInput"
              placeholder="e.g. inv_82f1... or https://app.accountiva.com/invite/inv_82f1..."
              class="h-9 text-xs"
            />
          </div>
          <Button
            type="button"
            @click="handleJoinInvite"
            class="w-full gap-2"
          >
            <span>Proceed to Workspace</span>
            <ArrowRight class="w-4 h-4" />
          </Button>
        </div>
      </CardContent>

      <!-- FOOTER FOR CREATE STEP -->
      <CardFooter v-if="step === 'create'" class="px-6 py-4 border-t border-border bg-muted/20 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          class="flex-1"
          @click="step = 'choice'"
        >
          Back
        </Button>
        <Button
          type="submit"
          form="create-org-form"
          class="flex-1 gap-2"
          :disabled="loading"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <span v-else>Create Workspace</span>
        </Button>
      </CardFooter>
    </Card>

    <!-- Sign out option -->
    <button
      @click="handleLogout"
      class="mt-6 flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
    >
      <LogOut class="w-3.5 h-3.5" />
      <span>Sign out of account</span>
    </button>
  </div>
</template>

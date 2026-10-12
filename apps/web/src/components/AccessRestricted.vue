<script setup lang="ts">
import { ShieldAlert, Lock, ArrowLeft, Mail } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { useRouter } from "vue-router";
import { computed } from "vue";

const props = defineProps<{
  moduleName?: string;
}>();

const router = useRouter();

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/dashboard");
  }
};

const moduleTitles: Record<string, string> = {
  invoices: "Invoices",
  expenses: "Expenses",
  customers: "Customers",
  reports: "Reports",
  settings: "Settings",
  banking: "Transactions",
  estimates: "Estimates",
  items: "Items",
};

const displayModuleName = computed(() => {
  if (!props.moduleName) return "this module";
  return moduleTitles[props.moduleName.toLowerCase()] || props.moduleName;
});
</script>

<template>
  <div class="w-full animate-in fade-in duration-500">
    <div class="w-full max-w-lg space-y-8">
      <!-- Icon -->
      <div class="flex flex-col items-center">
        <div class="relative">
          <div
            class="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center border border-border/50 shadow-sm"
          >
            <ShieldAlert class="w-10 h-10 text-muted-foreground/40" />
          </div>
          <div
            class="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-destructive flex items-center justify-center shadow-lg border-2 border-background"
          >
            <Lock class="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      <!-- Header Content -->
      <div class="text-center space-y-2">
        <h1 class="ui-page-title">
          Access Restricted
        </h1>
        <p class="ui-page-description mx-auto">
          You don't have the necessary permissions to view
          {{ displayModuleName }}.
        </p>
      </div>

      <!-- Information Card -->
      <div
        class="bg-card border border-border/50 rounded-2xl p-8 shadow-sm space-y-6 text-left"
      >
        <p class="text-sm text-foreground font-medium leading-relaxed">
          Your current role does not include permission to view this area.
        </p>

        <div class="pt-6 border-t border-border/50">
          <p
            class="text-[11px] text-muted-foreground font-medium leading-relaxed"
          >
            If you require access to this feature, please contact your
            organization
            <span class="text-foreground font-bold">Owner</span> or an
            administrator to update your staff permissions.
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div
        class="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2"
      >
        <Button
          @click="goBack"
          variant="outline"
          class="h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 border-border/50 hover:bg-muted min-w-[140px]"
        >
          <ArrowLeft class="w-4 h-4" />
          Go Back
        </Button>
        <Button
          variant="default"
          class="h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 min-w-[140px]"
        >
          <Mail class="w-4 h-4" />
          Contact Admin
        </Button>
      </div>
    </div>
  </div>
</template>

import { computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import {
  formatCurrency as formatCurrencyUtil,
  getCurrencySymbol as getCurrencySymbolUtil,
} from "@/utils/formatters";

export function useCurrency() {
  const authStore = useAuthStore();

  const currencyCode = computed(() => {
    return authStore.currentOrganization?.currency || "INR";
  });

  const currencySymbol = computed(() => {
    return getCurrencySymbolUtil(currencyCode.value);
  });

  const formatAmount = (amount: number, options?: Intl.NumberFormatOptions) => {
    return formatCurrencyUtil(amount, currencyCode.value, options);
  };

  return {
    currencyCode,
    currencySymbol,
    formatAmount,
  };
}

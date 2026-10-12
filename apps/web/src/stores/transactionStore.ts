import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/lib/api';

export interface Transaction {
  id: string;
  date: string;
  account: string;
  description: string;
  amount: number;
  type: 'Debit' | 'Credit';
  created_at?: string;
}

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref<Transaction[]>([]);
  const loading = ref(false);
  const fetched = ref(false);
  const error = ref<string | null>(null);
  const organizationId = ref<string | null>(null);
  const customAccounts = ref<string[]>([]);

  const storageKey = (orgId: string) => `accountiva_custom_accounts:${orgId}`;

  const setOrganization = (orgId: string | null) => {
    organizationId.value = orgId;
    customAccounts.value = [];
    localStorage.removeItem('accountiva_custom_accounts');
    if (!orgId) return;

    const saved = localStorage.getItem(storageKey(orgId));
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      customAccounts.value = Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === 'string')
        : [];
    } catch {
      customAccounts.value = [];
    }
  };

  const allAccounts = computed(() => {
    return ['Petty Cash', 'Cash in Hand', 'Bank', ...customAccounts.value];
  });

  const addCustomAccount = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (['Petty Cash', 'Cash in Hand', 'Bank'].includes(trimmed) || customAccounts.value.includes(trimmed)) {
      return false;
    }
    if (!organizationId.value || trimmed.length > 100) return false;
    customAccounts.value.push(trimmed);
    localStorage.setItem(storageKey(organizationId.value), JSON.stringify(customAccounts.value));
    return true;
  };

  const fetchTransactions = async (force = false) => {
    if (fetched.value && !force) return;

    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/transactions');
      transactions.value = response.data;
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch transactions';
    } finally {
      loading.value = false;
    }
  };

  const uniqueAccounts = computed(() => {
    return [...new Set(transactions.value.map((t) => t.account))];
  });

  const getAccountBalance = (accountName: string) => {
    return transactions.value
      .filter((t) => t.account === accountName)
      .reduce(
        (sum, t) => (t.type === 'Debit' ? sum + t.amount : sum - t.amount),
        0,
      );
  };

  const reset = () => {
    transactions.value = [];
    fetched.value = false;
    error.value = null;
  };

  return {
    transactions,
    loading,
    error,
    customAccounts,
    allAccounts,
    addCustomAccount,
    setOrganization,
    uniqueAccounts,
    getAccountBalance,
    fetchTransactions,
    reset,
  };
});

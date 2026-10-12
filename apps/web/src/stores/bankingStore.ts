import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/lib/api';

export interface BankAccount {
  id: string;
  account_name: string;
  account_code: string | null;
  account_type: 'bank' | 'credit_card' | 'cash';
  account_number: string | null;
  bank_name: string | null;
  ifsc_code: string | null;
  currency: string;
  description: string | null;
  opening_balance: number;
  current_balance: number; // Book Balance (Accountiva)
  statement_balance: number; // Statement Balance (Bank)
  difference: number;
  unreconciled_count: number;
  is_active: boolean;
  created_at: string;
}

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  date: string;
  description: string;
  reference_number: string | null;
  type: 'deposit' | 'withdrawal';
  amount: number;
  balance_after: number | null;
  status: 'unreconciled' | 'matched' | 'categorized' | 'excluded' | 'reconciled';
  matched_entity_type: string | null;
  matched_entity_id: string | null;
  category: string | null;
  payee: string | null;
  notes: string | null;
  reconciled_at: string | null;
  created_at?: string;
}

export interface MatchSuggestion {
  entityType: 'invoice' | 'bill';
  id: string;
  number: string;
  date: string;
  contactName: string;
  amount: number;
  status: string;
  confidence: number;
  matchReason: string;
}

export interface StatementPreviewData {
  headers: string[];
  sampleRows: Record<string, any>[];
  detected: {
    dateCol: string;
    descCol: string;
    refCol: string;
    debitCol: string;
    creditCol: string;
    amountCol: string;
    balanceCol: string;
  };
}

export const useBankingStore = defineStore('banking', () => {
  const accounts = ref<BankAccount[]>([]);
  const selectedAccount = ref<BankAccount | null>(null);
  const transactions = ref<BankTransaction[]>([]);
  const loading = ref(false);
  const loadingTransactions = ref(false);
  const totalCount = ref(0);
  const error = ref<string | null>(null);

  // Fetch all bank accounts
  const fetchAccounts = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get('/banking/accounts');
      accounts.value = res.data;
      if (accounts.value.length > 0) {
        if (!selectedAccount.value) {
          selectedAccount.value = accounts.value[0];
        } else {
          const updated = accounts.value.find((a) => a.id === selectedAccount.value?.id);
          selectedAccount.value = updated || accounts.value[0];
        }
      } else {
        selectedAccount.value = null;
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to load bank accounts';
    } finally {
      loading.value = false;
    }
  };

  // Create account
  const createAccount = async (payload: {
    account_name: string;
    account_code?: string;
    account_type: string;
    account_number?: string;
    bank_name?: string;
    ifsc_code?: string;
    opening_balance?: number;
    currency?: string;
    description?: string;
  }) => {
    const res = await api.post('/banking/accounts', payload);
    await fetchAccounts();
    return res.data;
  };

  // Update account
  const updateAccount = async (
    id: string,
    payload: {
      account_name?: string;
      account_code?: string;
      account_type?: string;
      account_number?: string;
      bank_name?: string;
      ifsc_code?: string;
      opening_balance?: number;
      description?: string;
    }
  ) => {
    const res = await api.put(`/banking/accounts/${id}`, payload);
    await fetchAccounts();
    return res.data;
  };

  // Delete account
  const deleteAccount = async (id: string) => {
    await api.delete(`/banking/accounts/${id}`);
    if (selectedAccount.value?.id === id) {
      selectedAccount.value = null;
    }
    await fetchAccounts();
  };

  // Fetch transactions for account
  const fetchTransactions = async (
    accountId: string,
    params?: { page?: number; limit?: number; search?: string; status?: string }
  ) => {
    loadingTransactions.value = true;
    try {
      const res = await api.get(`/banking/accounts/${accountId}/transactions`, { params });
      transactions.value = res.data.data;
      totalCount.value = res.data.pagination.total;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch transactions';
    } finally {
      loadingTransactions.value = false;
    }
  };

  // Preview statement columns & sample rows
  const previewStatement = async (accountId: string, file: File): Promise<StatementPreviewData> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/banking/accounts/${accountId}/preview-statement`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  };

  // Upload statement (file with column mapping or mapped payload)
  const uploadStatement = async (accountId: string, formData: FormData | { transactions: any[] }) => {
    const isFormData = formData instanceof FormData;
    const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
    const res = await api.post(`/banking/accounts/${accountId}/upload-statement`, formData, config);
    await fetchAccounts();
    return res.data;
  };

  // Get match suggestions for a transaction
  const getMatchSuggestions = async (txnId: string) => {
    const res = await api.get(`/banking/transactions/${txnId}/match-suggestions`);
    return res.data as { transaction: BankTransaction; suggestions: MatchSuggestion[] };
  };

  // Match transaction with Invoice or Bill
  const matchTransaction = async (txnId: string, entityType: 'invoice' | 'bill', entityId: string) => {
    const res = await api.post(`/banking/transactions/${txnId}/match`, { entityType, entityId });
    const index = transactions.value.findIndex((t) => t.id === txnId);
    if (index !== -1) {
      transactions.value[index] = res.data.transaction;
    }
    await fetchAccounts();
    return res.data;
  };

  // Categorize transaction
  const categorizeTransaction = async (
    txnId: string,
    payload: { category: string; payee?: string; notes?: string }
  ) => {
    const res = await api.post(`/banking/transactions/${txnId}/categorize`, payload);
    const index = transactions.value.findIndex((t) => t.id === txnId);
    if (index !== -1) {
      transactions.value[index] = res.data.transaction;
    }
    await fetchAccounts();
    return res.data;
  };

  // Transfer between accounts
  const transferTransaction = async (
    txnId: string,
    payload: { toAccountId: string; notes?: string }
  ) => {
    const res = await api.post(`/banking/transactions/${txnId}/transfer`, payload);
    const index = transactions.value.findIndex((t) => t.id === txnId);
    if (index !== -1) {
      transactions.value[index] = res.data.transaction;
    }
    await fetchAccounts();
    return res.data;
  };

  // Exclude transaction
  const excludeTransaction = async (txnId: string) => {
    const res = await api.post(`/banking/transactions/${txnId}/exclude`);
    const index = transactions.value.findIndex((t) => t.id === txnId);
    if (index !== -1) {
      transactions.value[index] = res.data.transaction;
    }
    await fetchAccounts();
    return res.data;
  };

  // Restore excluded transaction
  const restoreTransaction = async (txnId: string) => {
    const res = await api.post(`/banking/transactions/${txnId}/restore`);
    const index = transactions.value.findIndex((t) => t.id === txnId);
    if (index !== -1) {
      transactions.value[index] = res.data.transaction;
    }
    await fetchAccounts();
    return res.data;
  };

  // Reconcile period session
  const reconcilePeriod = async (
    accountId: string,
    payload: { statementEndingBalance: number; transactionIds: string[] }
  ) => {
    const res = await api.post(`/banking/accounts/${accountId}/reconcile-period`, payload);
    await fetchAccounts();
    return res.data;
  };

  // Unmatch / Revert transaction
  const unmatchTransaction = async (txnId: string) => {
    const res = await api.post(`/banking/transactions/${txnId}/unmatch`);
    const index = transactions.value.findIndex((t) => t.id === txnId);
    if (index !== -1) {
      transactions.value[index] = res.data.transaction;
    }
    await fetchAccounts();
    return res.data;
  };

  return {
    accounts,
    selectedAccount,
    transactions,
    loading,
    loadingTransactions,
    totalCount,
    error,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchTransactions,
    previewStatement,
    uploadStatement,
    getMatchSuggestions,
    matchTransaction,
    categorizeTransaction,
    transferTransaction,
    excludeTransaction,
    restoreTransaction,
    reconcilePeriod,
    unmatchTransaction,
  };
});

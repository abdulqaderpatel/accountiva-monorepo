import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/lib/api';

export interface ProfitLossData {
  name: string;
  revenue: number;
  expenses: number;
}

export interface ExpenseBreakdownData {
  name: string;
  value: number;
}

export interface LedgerTransaction {
  date: string;
  type: string;
  account: string;
  description: string;
  referenceId: string;
  debit: number;
  credit: number;
}

export interface LedgerAccountGroup {
  account: string;
  category: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  transactions: LedgerTransaction[];
}

export const useReportStore = defineStore('report', () => {
  const profitLoss = ref<ProfitLossData[]>([]);
  const expenseBreakdown = ref<ExpenseBreakdownData[]>([]);
  const generalLedger = ref<LedgerAccountGroup[]>([]);
  const loading = ref(false);
  const fetched = ref(false);
  const error = ref<string | null>(null);

  const fetchReports = async (force = false) => {
    if (fetched.value && !force) return;

    loading.value = true;
    error.value = null;
    try {
      const [plRes, ebRes, glRes] = await Promise.all([
        api.get('/reports/profit-loss'),
        api.get('/reports/expense-breakdown'),
        api.get('/reports/general-ledger')
      ]);
      profitLoss.value = plRes.data;
      expenseBreakdown.value = ebRes.data;
      generalLedger.value = glRes.data;
      fetched.value = true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch reports';
    } finally {
      loading.value = false;
    }
  };

  const fetchGeneralLedger = async (startDate?: string, endDate?: string) => {
    loading.value = true;
    try {
      const { data } = await api.get('/reports/general-ledger', {
        params: { startDate, endDate }
      });
      generalLedger.value = data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch ledger';
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    profitLoss.value = [];
    expenseBreakdown.value = [];
    generalLedger.value = [];
    fetched.value = false;
    error.value = null;
  };

  return {
    profitLoss,
    expenseBreakdown,
    generalLedger,
    loading,
    error,
    fetchReports,
    fetchGeneralLedger,
    reset,
  };
});

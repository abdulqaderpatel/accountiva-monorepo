import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface DashboardMetrics {
  receivables: number;
  payables: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  cashFlow: Array<{ date: string; income: number; expense: number }>;
}

export const reportsKeys = {
  all: ['reports'] as const,
  dashboard: () => [...reportsKeys.all, 'dashboard'] as const,
  profitLoss: () => [...reportsKeys.all, 'profit-loss'] as const,
  expenseBreakdown: () => [...reportsKeys.all, 'expense-breakdown'] as const,
};

export function useDashboardMetrics() {
  return useQuery({
    queryKey: reportsKeys.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<DashboardMetrics>('/reports/dashboard');
      return data;
    },
    staleTime: 60 * 1000,
  });
}


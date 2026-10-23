import { useQuery } from '@tanstack/react-query';
import { api, getActiveOrganizationId } from '../client';

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
  dashboard: (orgId?: string | null) => [...reportsKeys.all, orgId, 'dashboard'] as const,
  profitLoss: (orgId?: string | null) => [...reportsKeys.all, orgId, 'profit-loss'] as const,
  expenseBreakdown: (orgId?: string | null) => [...reportsKeys.all, orgId, 'expense-breakdown'] as const,
};

export function useDashboardMetrics() {
  const activeOrgId = getActiveOrganizationId();
  return useQuery({
    queryKey: reportsKeys.dashboard(activeOrgId),
    queryFn: async () => {
      const { data } = await api.get<DashboardMetrics>('/reports/dashboard');
      return data;
    },
    staleTime: 60 * 1000,
  });
}


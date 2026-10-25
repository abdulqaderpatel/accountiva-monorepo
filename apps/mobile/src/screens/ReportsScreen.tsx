import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
} from 'react-native';
import {
  TrendingUp,
  Share2,
  PieChart,
  BookOpen,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileText,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SkeletonReports } from '../components/ui/Skeleton';
import { formatCurrency } from '@accountiva/shared';
import { fonts } from '../theme/typography';
import { ScreenType } from '../components/BottomNav';
import api from '@accountiva/api';

interface ReportsScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export type ReportTab = 'profit_loss' | 'expense_breakdown' | 'gst_summary' | 'ledger';

export function ReportsScreen({ onNavigate }: ReportsScreenProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';
  const currentOrgId = currentOrg?.id;

  const [activeTab, setActiveTab] = useState<ReportTab>('profit_loss');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [profitLoss, setProfitLoss] = useState<any[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<any[]>([]);
  const [generalLedger, setGeneralLedger] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const fetchReports = useCallback(async (isRefresh = false) => {
    if (!currentOrgId) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [plRes, ebRes, glRes, invRes, expRes] = await Promise.allSettled([
        api.get('/reports/profit-loss'),
        api.get('/reports/expense-breakdown'),
        api.get('/reports/general-ledger'),
        api.get('/invoices'),
        api.get('/expenses'),
      ]);

      if (plRes.status === 'fulfilled') {
        const d = plRes.value.data;
        setProfitLoss(Array.isArray(d) ? d : d?.data || []);
      }
      if (ebRes.status === 'fulfilled') {
        const d = ebRes.value.data;
        setExpenseBreakdown(Array.isArray(d) ? d : d?.data || []);
      }
      if (glRes.status === 'fulfilled') {
        const d = glRes.value.data;
        setGeneralLedger(Array.isArray(d) ? d : d?.data || []);
      }
      if (invRes.status === 'fulfilled') {
        const d = invRes.value.data;
        setInvoices(Array.isArray(d) ? d : d?.data || []);
      }
      if (expRes.status === 'fulfilled') {
        const d = expRes.value.data;
        setExpenses(Array.isArray(d) ? d : d?.data || []);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Calculations for P&L
  const totalRevenue = useMemo(() => {
    if (profitLoss.length > 0) {
      return profitLoss.reduce((sum, p) => sum + (Number(p.revenue) || 0), 0);
    }
    return invoices
      .filter((i) => String(i.status).toLowerCase() === 'paid')
      .reduce((sum, i) => sum + (Number(i.amount) || Number(i.total) || 0), 0);
  }, [profitLoss, invoices]);

  const totalExpenses = useMemo(() => {
    if (profitLoss.length > 0) {
      return profitLoss.reduce((sum, p) => sum + (Number(p.expenses) || 0), 0);
    }
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [profitLoss, expenses]);

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Calculations for GST Summary
  const outputGst = useMemo(() => {
    return invoices.reduce((sum, i) => sum + (Number(i.taxAmount) || Number(i.tax_amount) || 0), 0);
  }, [invoices]);

  const inputGst = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.taxAmount) || Number(e.tax_amount) || 0), 0);
  }, [expenses]);

  const netGstPayable = Math.max(0, outputGst - inputGst);

  const handleShareReport = async () => {
    try {
      const msg = [
        `ACCOUNTIVA FINANCIAL REPORT`,
        `Organization: ${currentOrg?.name || 'Workspace'}`,
        `Generated: ${new Date().toLocaleDateString()}`,
        `----------------------------------------`,
        `PROFIT & LOSS OVERVIEW:`,
        `• Gross Revenue: ${formatCurrency(totalRevenue, currency)}`,
        `• Total Operating Expenses: ${formatCurrency(totalExpenses, currency)}`,
        `• Net Profit: ${formatCurrency(netProfit, currency)} (Margin: ${profitMargin}%)`,
        `----------------------------------------`,
        `TAX / GST POSITION:`,
        `• Output GST Liability (Sales): ${formatCurrency(outputGst, currency)}`,
        `• Input Tax Credit (Purchases): ${formatCurrency(inputGst, currency)}`,
        `• Net Tax Payable: ${formatCurrency(netGstPayable, currency)}`,
      ].join('\n');

      await Share.share({
        message: msg,
        title: `Financial Report - ${currentOrg?.name}`,
      });
    } catch (err: any) {
      console.log('Error sharing report:', err.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Financial Reports</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Real-time books & tax summary
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleShareReport}
          style={[styles.shareBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Share2 size={16} color={colors.foreground} />
          <Text style={[styles.shareBtnText, { color: colors.foreground }]}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { id: 'profit_loss', label: 'Profit & Loss', icon: TrendingUp },
            { id: 'expense_breakdown', label: 'Expenses', icon: PieChart },
            { id: 'gst_summary', label: 'GST Summary', icon: Receipt },
            { id: 'ledger', label: 'General Ledger', icon: BookOpen },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as ReportTab)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Icon
                  size={14}
                  color={isSelected ? colors.primaryForeground : colors.mutedForeground}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    {
                      color: isSelected ? colors.primaryForeground : colors.mutedForeground,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchReports(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <SkeletonReports />
        ) : (
          <>
            {/* 1. PROFIT & LOSS TAB */}
        {activeTab === 'profit_loss' && (
          <View style={{ gap: 14 }}>
            {/* Net Profit Hero */}
            <Card style={styles.heroCard}>
              <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Net Profit</Text>
              <Text
                style={[
                  styles.heroAmount,
                  { color: netProfit >= 0 ? colors.foreground : colors.destructive },
                ]}
              >
                {formatCurrency(netProfit, currency)}
              </Text>
              <View style={styles.heroMetaRow}>
                <View style={styles.metaBadge}>
                  {netProfit >= 0 ? (
                    <ArrowUpRight size={14} color={colors.success} />
                  ) : (
                    <ArrowDownRight size={14} color={colors.destructive} />
                  )}
                  <Text style={[styles.metaBadgeText, { color: netProfit >= 0 ? colors.success : colors.destructive }]}>
                    {profitMargin}% margin
                  </Text>
                </View>
                <Text style={[styles.metaSub, { color: colors.mutedForeground }]}>Fiscal period to date</Text>
              </View>
            </Card>

            {/* Income vs Expenses Cards */}
            <View style={styles.twoColRow}>
              <Card style={[styles.statBox, { flex: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <ArrowUpRight size={14} color={colors.success} />
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Income</Text>
                </View>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {formatCurrency(totalRevenue, currency)}
                </Text>
                <Text style={[styles.statSub, { color: colors.mutedForeground }]}>Revenue recognized</Text>
              </Card>

              <Card style={[styles.statBox, { flex: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <ArrowDownRight size={14} color={colors.destructive} />
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Expenses</Text>
                </View>
                <Text style={[styles.statValue, { color: colors.destructive }]}>
                  {formatCurrency(totalExpenses, currency)}
                </Text>
                <Text style={[styles.statSub, { color: colors.mutedForeground }]}>Operating costs</Text>
              </Card>
            </View>

            {/* Monthly Trend List */}
            {profitLoss.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Monthly Breakdown</Text>
                <Card style={{ padding: 12, gap: 10 }}>
                  {profitLoss.map((row, idx) => (
                    <View key={row.name || idx}>
                      <View style={styles.breakdownRow}>
                        <Text style={[styles.breakdownTitle, { color: colors.foreground }]}>{row.name}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>
                            {formatCurrency(Number(row.revenue || 0) - Number(row.expenses || 0), currency)}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                            Rev {formatCurrency(Number(row.revenue || 0), currency)} • Exp {formatCurrency(Number(row.expenses || 0), currency)}
                          </Text>
                        </View>
                      </View>
                      {idx < profitLoss.length - 1 ? (
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      ) : null}
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
          </View>
        )}

        {/* 2. EXPENSE BREAKDOWN TAB */}
        {activeTab === 'expense_breakdown' && (
          <View style={{ gap: 14 }}>
            <Card style={styles.heroCard}>
              <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Operating Expenses</Text>
              <Text style={[styles.heroAmount, { color: colors.foreground }]}>
                {formatCurrency(totalExpenses, currency)}
              </Text>
              <Text style={[styles.metaSub, { color: colors.mutedForeground, marginTop: 4 }]}>
                Categorized spending breakdown
              </Text>
            </Card>

            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Expense Categories</Text>
            {expenseBreakdown.length === 0 ? (
              <Card style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  No categorized expenses recorded yet.
                </Text>
              </Card>
            ) : (
              <Card style={{ padding: 12, gap: 12 }}>
                {expenseBreakdown.map((cat, idx) => {
                  const val = Number(cat.value) || 0;
                  const pct = totalExpenses > 0 ? ((val / totalExpenses) * 100).toFixed(1) : '0';
                  return (
                    <View key={cat.name || idx}>
                      <View style={styles.breakdownRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.breakdownTitle, { color: colors.foreground }]}>{cat.name}</Text>
                          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>{pct}% of total</Text>
                        </View>
                        <Text style={[styles.statValue, { color: colors.foreground }]}>
                          {formatCurrency(val, currency)}
                        </Text>
                      </View>
                      {/* Visual progress bar */}
                      <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceSubtle }]}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              backgroundColor: colors.primary,
                              width: `${Math.min(100, Math.max(4, parseFloat(pct)))}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}
          </View>
        )}

        {/* 3. GST SUMMARY TAB */}
        {activeTab === 'gst_summary' && (
          <View style={{ gap: 14 }}>
            <Card style={styles.heroCard}>
              <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Net Tax Liability</Text>
              <Text style={[styles.heroAmount, { color: colors.foreground }]}>
                {formatCurrency(netGstPayable, currency)}
              </Text>
              <Text style={[styles.metaSub, { color: colors.mutedForeground, marginTop: 4 }]}>
                Output Tax (Sales) minus Input Tax Credit (Purchases)
              </Text>
            </Card>

            <View style={styles.twoColRow}>
              <Card style={[styles.statBox, { flex: 1 }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Output GST</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {formatCurrency(outputGst, currency)}
                </Text>
                <Text style={[styles.statSub, { color: colors.mutedForeground }]}>Collected on sales</Text>
              </Card>

              <Card style={[styles.statBox, { flex: 1 }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Input Tax Credit</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {formatCurrency(inputGst, currency)}
                </Text>
                <Text style={[styles.statSub, { color: colors.mutedForeground }]}>Claimable on costs</Text>
              </Card>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Tax Components</Text>
            <Card style={{ padding: 14, gap: 10 }}>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownTitle, { color: colors.foreground }]}>CGST (Central)</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {formatCurrency(netGstPayable / 2, currency)}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownTitle, { color: colors.foreground }]}>SGST / UTGST (State)</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {formatCurrency(netGstPayable / 2, currency)}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* 4. GENERAL LEDGER TAB */}
        {activeTab === 'ledger' && (
          <View style={{ gap: 14 }}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Chart of Accounts Ledger</Text>
            {generalLedger.length === 0 ? (
              <Card style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  No ledger journal accounts initialized yet.
                </Text>
              </Card>
            ) : (
              generalLedger.map((grp, idx) => (
                <Card key={grp.account || idx} style={{ padding: 14, gap: 8 }}>
                  <View style={styles.breakdownRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.breakdownTitle, { color: colors.foreground }]}>{grp.account}</Text>
                      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{grp.category || 'General'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.statValue, { color: colors.foreground }]}>
                        {formatCurrency(Number(grp.closingBalance) || 0, currency)}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase' }}>
                        Closing Balance
                      </Text>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  tabWrapper: {
    paddingVertical: 10,
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  heroCard: {
    padding: 16,
    gap: 4,
  },
  heroLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  metaSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    padding: 12,
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  statSub: {
    fontSize: 10,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});


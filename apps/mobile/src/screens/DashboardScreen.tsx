import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Bell, ArrowUpRight, Plus, FileText, UserPlus, Share2 } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, isFeatureEnabled } from '@accountiva/shared';
import { useInvoices } from '@accountiva/api';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export function DashboardScreen({ onNavigate }: DashboardScreenProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();

  const { data: apiInvoices, isLoading, refetch, isRefetching } = useInvoices();

  const rawInvoices: any[] = useMemo(() => {
    if (Array.isArray(apiInvoices) && apiInvoices.length > 0) return apiInvoices;
    if (Array.isArray(apiInvoices?.data) && apiInvoices.data.length > 0) return apiInvoices.data;
    return [];
  }, [apiInvoices]);

  // Compute live KPIs
  const { totalReceivables, paidThisMonth, overdueTotal, recentInvoices } = useMemo(() => {
    let receivables = 0;
    let paid = 0;
    let overdue = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    rawInvoices.forEach((inv) => {
      const amount = Number(inv.amount) || 0;
      const status = (inv.status || 'Draft').toUpperCase();

      if (status === 'PAID') {
        const invDate = new Date(inv.date || inv.issueDate || inv.createdAt);
        if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
          paid += amount;
        }
      } else if (status === 'OVERDUE') {
        overdue += amount;
        receivables += amount;
      } else if (status !== 'DRAFT') {
        receivables += amount;
      }
    });

    const recent = rawInvoices.slice(0, 5).map((inv) => ({
      id: inv.id,
      customer: inv.customer || inv.customerName || inv.customers?.name || 'Customer',
      number: inv.number || inv.invoiceNumber || 'INV-000',
      date: inv.date || inv.dueDate || 'Recent',
      amount: Number(inv.amount) || 0,
      status: (inv.status || 'Draft').toUpperCase(),
    }));

    return {
      totalReceivables: receivables,
      paidThisMonth: paid,
      overdueTotal: overdue,
      recentInvoices: recent,
    };
  }, [rawInvoices]);

  const currency = currentOrg?.currency || 'INR';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <View style={styles.orgHeader}>
          <View style={[styles.orgAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.orgAvatarText, { color: colors.primaryForeground }]}>
              {currentOrg?.name ? currentOrg.name[0]?.toUpperCase() : 'A'}
            </Text>
          </View>
          <View>
            <Text style={[styles.orgSubtitle, { color: colors.mutedForeground }]}>
              {currentOrg?.name || 'Primary Workspace'}
            </Text>
            <Text style={[styles.orgTitle, { color: colors.foreground }]}>Dashboard ▾</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}
          activeOpacity={0.7}
        >
          <Bell size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Total Receivables Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>
                Total Receivables
              </Text>
              <Text style={[styles.kpiValue, { color: colors.foreground }]}>
                {formatCurrency(totalReceivables, currency)}
              </Text>
            </View>
            <Badge variant="success">Active</Badge>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

          <View style={styles.cardFooterGrid}>
            <View>
              <Text style={[styles.subKpiLabel, { color: colors.mutedForeground }]}>
                Paid This Month
              </Text>
              <Text style={[styles.subKpiValue, { color: colors.foreground }]}>
                {formatCurrency(paidThisMonth, currency)}
              </Text>
            </View>
            <View>
              <Text style={[styles.subKpiLabel, { color: colors.mutedForeground }]}>
                Overdue
              </Text>
              <Text style={[styles.subKpiValue, { color: colors.destructive }]}>
                {formatCurrency(overdueTotal, currency)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Action Buttons */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            Quick Actions
          </Text>
        </View>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onNavigate('create_invoice')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
              <Plus size={18} color={colors.foreground} />
            </View>
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>+ Invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onNavigate('customers')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
              <UserPlus size={18} color={colors.foreground} />
            </View>
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>+ Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onNavigate('items')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
              <FileText size={18} color={colors.foreground} />
            </View>
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Catalog</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Invoices */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            Recent Invoices
          </Text>
          <TouchableOpacity onPress={() => onNavigate('invoices')} activeOpacity={0.7}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.invoicesList}>
          {recentInvoices.length === 0 ? (
            <View style={styles.emptyRecent}>
              <FileText size={24} color={colors.mutedForeground} style={{ marginBottom: 6 }} />
              <Text style={[styles.emptyRecentText, { color: colors.mutedForeground }]}>
                No recent invoices found. Tap "+ Invoice" to create one.
              </Text>
            </View>
          ) : (
            recentInvoices.map((inv) => {
              const isPaid = inv.status === 'PAID';
              const isOverdue = inv.status === 'OVERDUE';
              const variant = isPaid ? 'success' : isOverdue ? 'destructive' : 'warning';

              return (
                <TouchableOpacity
                  key={inv.id}
                  style={[styles.invoiceItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => onNavigate('invoices')}
                  activeOpacity={0.7}
                >
                  <View style={styles.invoiceLeft}>
                    <View style={[styles.invoiceAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                      <FileText size={16} color={colors.foreground} />
                    </View>
                    <View>
                      <Text style={[styles.customerName, { color: colors.foreground }]}>
                        {inv.customer}
                      </Text>
                      <Text style={[styles.invoiceMeta, { color: colors.mutedForeground }]}>
                        {inv.number} • {inv.date}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.invoiceRight}>
                    <Text
                      style={[
                        styles.invoiceAmount,
                        { color: isOverdue ? colors.destructive : colors.foreground },
                      ]}
                    >
                      {formatCurrency(inv.amount, currency)}
                    </Text>
                    <Badge variant={variant}>{inv.status}</Badge>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orgAvatar: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  orgSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  orgTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: fonts.extraBold,
    marginTop: 4,
  },
  cardDivider: {
    height: 1,
    marginVertical: 14,
  },
  cardFooterGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subKpiLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  subKpiValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  invoicesList: {
    gap: 8,
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  invoiceAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  invoiceMeta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  emptyRecent: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyRecentText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});


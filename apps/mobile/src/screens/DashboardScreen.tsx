import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import {
  Bell,
  ArrowUpRight,
  Plus,
  FileText,
  Users,
  Package,
  Calculator,
  FileMinus,
  TrendingUp,
  Receipt,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, isFeatureEnabled } from '@accountiva/shared';
import { useInvoices, useEstimates, useNotifications } from '@accountiva/api';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';
import { OrganizationSwitcherModal } from '../components/OrganizationSwitcherModal';
import { OrganizationSettingsModal } from '../components/OrganizationSettingsModal';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export function DashboardScreen({ onNavigate }: DashboardScreenProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [orgSettingsOpen, setOrgSettingsOpen] = useState(false);

  const { data: apiInvoices, isLoading, refetch, isRefetching } = useInvoices();
  const { data: apiEstimates } = useEstimates();
  const { data: apiNotifications } = useNotifications();

  const unreadNotificationsCount = useMemo(() => {
    if (!Array.isArray(apiNotifications)) return 0;
    return apiNotifications.filter((n: any) => !n.is_read).length;
  }, [apiNotifications]);

  const rawInvoices: any[] = useMemo(() => {
    if (Array.isArray(apiInvoices) && apiInvoices.length > 0) return apiInvoices;
    if (Array.isArray(apiInvoices?.data) && apiInvoices.data.length > 0) return apiInvoices.data;
    return [];
  }, [apiInvoices]);

  const rawEstimates: any[] = useMemo(() => {
    if (Array.isArray(apiEstimates) && apiEstimates.length > 0) return apiEstimates;
    if (Array.isArray(apiEstimates?.data) && apiEstimates.data.length > 0) return apiEstimates.data;
    return [];
  }, [apiEstimates]);

  const { sentEstimatesCount, acceptedEstimatesCount } = useMemo(() => {
    let sent = 0;
    let accepted = 0;
    rawEstimates.forEach((e) => {
      const st = (e.status || '').toLowerCase();
      if (st === 'sent') sent++;
      if (st === 'accepted') accepted++;
    });
    return { sentEstimatesCount: sent, acceptedEstimatesCount: accepted };
  }, [rawEstimates]);

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
        <TouchableOpacity
          style={styles.orgHeader}
          onPress={() => setOrgModalOpen(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.orgAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.orgAvatarText, { color: colors.primaryForeground }]}>
              {currentOrg?.name ? currentOrg.name[0]?.toUpperCase() : 'A'}
            </Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.orgTitle, { color: colors.foreground }]} numberOfLines={1}>
                {currentOrg?.name || 'My Organization'}
              </Text>
              <ChevronDown size={14} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.orgSubtitle, { color: colors.mutedForeground }]}>
              Tap to switch workspace
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}
          onPress={() => onNavigate('notifications')}
          activeOpacity={0.7}
        >
          <Bell size={18} color={colors.foreground} />
          {unreadNotificationsCount > 0 && (
            <View style={[styles.badgeDot, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </Text>
            </View>
          )}
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
          {isLoading && rawInvoices.length === 0 ? (
            <View style={{ gap: 12 }}>
              <View style={styles.cardHeaderRow}>
                <View style={{ gap: 6 }}>
                  <View style={[styles.skeletonBlock, { width: 120, height: 12, backgroundColor: colors.surfaceSubtle }]} />
                  <View style={[styles.skeletonBlock, { width: 180, height: 26, backgroundColor: colors.surfaceSubtle }]} />
                </View>
                <View style={[styles.trendIconContainer, { backgroundColor: colors.surfaceSubtle }]} />
              </View>

              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

              <View style={styles.cardFooterGrid}>
                <View style={{ gap: 5 }}>
                  <View style={[styles.skeletonBlock, { width: 90, height: 10, backgroundColor: colors.surfaceSubtle }]} />
                  <View style={[styles.skeletonBlock, { width: 110, height: 16, backgroundColor: colors.surfaceSubtle }]} />
                </View>
                <View style={{ gap: 5 }}>
                  <View style={[styles.skeletonBlock, { width: 60, height: 10, backgroundColor: colors.surfaceSubtle }]} />
                  <View style={[styles.skeletonBlock, { width: 85, height: 16, backgroundColor: colors.surfaceSubtle }]} />
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>
                    Total Receivables
                  </Text>
                  <Text style={[styles.kpiValue, { color: colors.foreground }]}>
                    {formatCurrency(totalReceivables, currency)}
                  </Text>
                </View>
                <View style={[styles.trendIconContainer, { backgroundColor: colors.successBg }]}>
                  <TrendingUp size={16} color={colors.success} />
                </View>
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
            </>
          )}
        </Card>

        {/* Quick Action Buttons */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            Quick Actions
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickActionsContainer}
          contentContainerStyle={styles.quickActionsScroll}
        >
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

          {isFeatureEnabled('estimates') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => onNavigate('estimates')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                <Calculator size={18} color={colors.foreground} />
              </View>
              <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Quotes</Text>
            </TouchableOpacity>
          )}

          {isFeatureEnabled('creditNotes') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => onNavigate('credit_notes')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                <FileMinus size={18} color={colors.foreground} />
              </View>
              <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Credit Notes</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onNavigate('customers')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
              <Users size={18} color={colors.foreground} />
            </View>
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>+ Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onNavigate('items')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
              <Package size={18} color={colors.foreground} />
            </View>
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Catalog</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sales Pipeline */}
        {isFeatureEnabled('estimates') && (
          <Card style={styles.pipelineCard}>
            <View style={styles.pipelineHeader}>
              <Text style={[styles.pipelineTitle, { color: colors.foreground }]}>Sales Pipeline</Text>
              <TouchableOpacity onPress={() => onNavigate('estimates')} activeOpacity={0.7}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>Quotes →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pipelineGrid}>
              <View style={[styles.pipelineBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.pipelineLabel, { color: colors.mutedForeground }]}>Sent Quotes</Text>
                <Text style={[styles.pipelineValue, { color: colors.foreground }]}>{sentEstimatesCount}</Text>
              </View>
              <View style={[styles.pipelineBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.pipelineLabel, { color: colors.mutedForeground }]}>Accepted Quotes</Text>
                <Text style={[styles.pipelineValue, { color: colors.success }]}>{acceptedEstimatesCount}</Text>
              </View>
            </View>
          </Card>
        )}

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
          {isLoading && rawInvoices.length === 0 ? (
            <View style={{ gap: 8 }}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.invoiceItem,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.7 },
                  ]}
                >
                  <View style={styles.invoiceLeft}>
                    <View style={[styles.invoiceAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]} />
                    <View style={{ gap: 6 }}>
                      <View style={[styles.skeletonBlock, { width: 130, height: 14, backgroundColor: colors.surfaceSubtle }]} />
                      <View style={[styles.skeletonBlock, { width: 90, height: 11, backgroundColor: colors.surfaceSubtle }]} />
                    </View>
                  </View>
                  <View style={[styles.invoiceRight, { gap: 6, alignItems: 'flex-end' }]}>
                    <View style={[styles.skeletonBlock, { width: 70, height: 14, backgroundColor: colors.surfaceSubtle }]} />
                    <View style={[styles.skeletonBlock, { width: 50, height: 18, borderRadius: 6, backgroundColor: colors.surfaceSubtle }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : recentInvoices.length === 0 ? (
            <Card style={styles.emptyRecentCard}>
              <EmptyState
                icon={FileText}
                title="No recent activity"
                description="Invoices, quotes, and client payments will appear here once created."
                actionLabel="Create Invoice"
                actionIcon={Plus}
                onAction={() => onNavigate('create_invoice')}
                secondaryActionLabel="Add Customer"
                onSecondaryAction={() => onNavigate('customers')}
                style={{ paddingVertical: 24 }}
              />
            </Card>
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

      <OrganizationSwitcherModal
        visible={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        onOpenOrgSettings={() => {
          setOrgModalOpen(false);
          setOrgSettingsOpen(true);
        }}
      />

      <OrganizationSettingsModal
        visible={orgSettingsOpen}
        onClose={() => setOrgSettingsOpen(false)}
      />
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
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: fonts.bold,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trendIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  quickActionsContainer: {
    marginHorizontal: -16,
    marginBottom: 22,
  },
  quickActionsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  actionBtn: {
    width: 90,
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
  emptyRecentCard: {
    padding: 0,
    overflow: 'hidden',
  },
  pipelineCard: {
    padding: 16,
    marginBottom: 20,
  },
  pipelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pipelineTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  pipelineGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  pipelineBox: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  pipelineLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginBottom: 4,
  },
  pipelineValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  skeletonBlock: {
    borderRadius: 6,
  },
});


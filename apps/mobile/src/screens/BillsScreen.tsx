import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Search, Plus, FileText, Building2, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/Skeleton';
import { formatCurrency } from '@accountiva/shared';
import { fonts } from '../theme/typography';
import { ScreenType } from '../components/BottomNav';
import { CreateBillModal } from '../components/CreateBillModal';
import { BillDetailModal } from '../components/BillDetailModal';
import api from '@accountiva/api';

interface BillsScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export function BillsScreen({ onNavigate }: BillsScreenProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';
  const currentOrgId = currentOrg?.id;

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [editingBill, setEditingBill] = useState<any | null>(null);

  const fetchBills = useCallback(async (isRefresh = false) => {
    if (!currentOrgId) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data } = await api.get('/bills');
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.bills)
        ? data.bills
        : [];
      setBills(list);
    } catch {
      setBills([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    setSelectedBill(null);
    setEditingBill(null);
    setIsCreateModalOpen(false);
    setSearch('');
    fetchBills();
  }, [currentOrgId, fetchBills]);

  const counts = useMemo(() => ({
    all: bills.length,
    outstanding: bills.filter((b) => String(b.status).toLowerCase() === 'outstanding').length,
    draft: bills.filter((b) => String(b.status).toLowerCase() === 'draft').length,
    paid: bills.filter((b) => String(b.status).toLowerCase() === 'paid').length,
    overdue: bills.filter((b) => String(b.status).toLowerCase() === 'overdue').length,
  }), [bills]);

  const totalPayables = useMemo(() => {
    return bills
      .filter((b) => String(b.status).toLowerCase() !== 'paid')
      .reduce((sum, b) => sum + (Number(b.amount) || Number(b.total) || 0), 0);
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const status = String(b.status || 'draft').toLowerCase();
      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const num = (b.billNumber || b.number || '').toLowerCase();
        const vendor = (b.vendor?.name || b.vendorName || '').toLowerCase();
        const ref = (b.referenceNumber || '').toLowerCase();
        if (!num.includes(q) && !vendor.includes(q) && !ref.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [bills, statusFilter, search]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Bills & Payables</Text>
        <TouchableOpacity
          onPress={() => setIsCreateModalOpen(true)}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.primaryForeground} strokeWidth={2.5} />
          <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>+ Bill</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Overview Banner */}
      <View style={styles.kpiWrapper}>
        <Card style={styles.kpiCard}>
          <View style={styles.kpiLeft}>
            <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>Open Payables</Text>
            <Text style={[styles.kpiAmount, { color: colors.foreground }]}>
              {formatCurrency(totalPayables, currency)}
            </Text>
          </View>
          <View style={[styles.kpiBadge, { backgroundColor: colors.surfaceSubtle }]}>
            <FileText size={16} color={colors.foreground} />
            <Text style={[styles.kpiBadgeText, { color: colors.foreground }]}>
              {counts.outstanding + counts.overdue} Unpaid
            </Text>
          </View>
        </Card>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search bill number, vendor..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>
      </View>

      {/* Status Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'outstanding', label: `Outstanding (${counts.outstanding})` },
            { id: 'draft', label: `Draft (${counts.draft})` },
            { id: 'paid', label: `Paid (${counts.paid})` },
            { id: 'overdue', label: `Overdue (${counts.overdue})` },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setStatusFilter(tab.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
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

      {/* Bills List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchBills(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <SkeletonList count={5} />
        ) : filteredBills.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search ? 'No bills match search' : 'No bills recorded'}
            description={
              search
                ? 'Try a different keyword or check other status filters.'
                : 'Track procurement invoices and manage due dates by recording vendor bills.'
            }
            actionLabel={search ? 'Clear search' : 'Record Bill'}
            actionIcon={search ? undefined : Plus}
            onAction={() => {
              if (search) setSearch('');
              else setIsCreateModalOpen(true);
            }}
          />
        ) : (
          filteredBills.map((bill) => {
            const raw = Number(bill.amount) || Number(bill.total) || 0;
            const status = String(bill.status || 'Draft').toUpperCase();
            const isPaid = status === 'PAID';
            const isOverdue = status === 'OVERDUE';
            const badgeVariant = isPaid ? 'success' : isOverdue ? 'destructive' : status === 'DRAFT' ? 'outline' : 'warning';
            const vendorName = bill.vendor?.name || bill.vendorName || 'Supplier';

            return (
              <TouchableOpacity
                key={bill.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setSelectedBill(bill)}
                activeOpacity={0.7}
              >
                <View style={styles.topRow}>
                  <View style={styles.billIconWrap}>
                    <View style={[styles.avatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                      <FileText size={16} color={colors.foreground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.billNumber, { color: colors.foreground }]} numberOfLines={1}>
                        {bill.billNumber || bill.number || 'BILL-000'}
                      </Text>
                      <Text style={[styles.vendorSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {vendorName} • Due {bill.dueDate || 'Upon receipt'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[styles.billAmount, { color: colors.foreground }]}>
                      {formatCurrency(raw, currency)}
                    </Text>
                    <Badge variant={badgeVariant}>{status}</Badge>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Create / Edit Bill Modal */}
      <CreateBillModal
        visible={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingBill(null);
        }}
        onSuccess={() => fetchBills()}
        initialBill={editingBill}
      />

      {/* Bill Detail Modal */}
      <BillDetailModal
        visible={!!selectedBill}
        bill={selectedBill}
        onClose={() => setSelectedBill(null)}
        onRefresh={() => fetchBills()}
        onEdit={(b) => {
          setSelectedBill(null);
          setEditingBill(b);
          setIsCreateModalOpen(true);
        }}
      />
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
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  newBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  kpiWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  kpiCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  kpiLeft: {
    gap: 2,
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    textTransform: 'uppercase',
  },
  kpiAmount: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  kpiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  kpiBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterWrapper: {
    paddingBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billNumber: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  vendorSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  billAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: fonts.bold,
  },
});


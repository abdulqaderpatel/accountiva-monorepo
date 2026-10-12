import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Search, Plus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import { useInvoices } from '@accountiva/api';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';

interface InvoicesScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

interface InvoiceRecord {
  id: string;
  customer: string;
  number: string;
  date: string;
  amount: number;
  status: string;
  variant: 'success' | 'warning' | 'destructive' | 'outline' | 'default';
}

const FALLBACK_INVOICES: InvoiceRecord[] = [
  {
    id: '1',
    customer: 'Delta Retail Corp',
    number: 'INV-2026-042',
    date: '12 Oct 2026',
    amount: 35400,
    status: 'PAID',
    variant: 'success',
  },
  {
    id: '2',
    customer: 'Zephyr Logistics Pvt Ltd',
    number: 'INV-2026-041',
    date: 'Due 15 Oct 2026',
    amount: 78250,
    status: 'SENT',
    variant: 'warning',
  },
  {
    id: '3',
    customer: 'Horizon Software Systems',
    number: 'INV-2026-039',
    date: 'Overdue 5d',
    amount: 42800,
    status: 'OVERDUE',
    variant: 'destructive',
  },
  {
    id: '4',
    customer: 'Sterling Media Group',
    number: 'INV-2026-038',
    date: '28 Sep 2026',
    amount: 18000,
    status: 'DRAFT',
    variant: 'outline',
  },
];

export function InvoicesScreen({ onNavigate }: InvoicesScreenProps) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid' | 'overdue'>('all');
  const [search, setSearch] = useState('');

  const { data: apiInvoices, isLoading, refetch, isRefetching } = useInvoices({
    search: search || undefined,
    status: filter === 'all' ? undefined : filter.toUpperCase(),
  });

  const getStatusVariant = (status: string): InvoiceRecord['variant'] => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return 'success';
      case 'SENT':
      case 'OUTSTANDING':
      case 'PENDING':
        return 'warning';
      case 'OVERDUE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const rawList = Array.isArray(apiInvoices) && apiInvoices.length > 0
    ? apiInvoices
    : (Array.isArray(apiInvoices?.data) && apiInvoices.data.length > 0
        ? apiInvoices.data
        : FALLBACK_INVOICES);

  const invoices: InvoiceRecord[] = rawList.map((item: any) => ({
    id: item.id,
    customer: item.customer || item.customerName || item.customers?.name || 'Customer',
    number: item.number || item.invoiceNumber || 'INV-000',
    date: item.date || item.dueDate || 'Recent',
    amount: Number(item.amount) || 0,
    status: (item.status || 'Draft').toUpperCase(),
    variant: getStatusVariant(item.status || 'Draft'),
  }));

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.customer.toLowerCase().includes(search.toLowerCase()) ||
      inv.number.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'paid' && inv.status === 'PAID') ||
      (filter === 'overdue' && inv.status === 'OVERDUE') ||
      (filter === 'unpaid' && (inv.status === 'SENT' || inv.status === 'OUTSTANDING' || inv.status === 'PENDING'));

    return matchesSearch && matchesFilter;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Invoices</Text>
        <TouchableOpacity
          onPress={() => onNavigate('create_invoice')}
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.primaryForeground} />
          <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by customer or invoice #..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'unpaid', 'paid', 'overdue'] as const).map((key) => {
            const isSelected = filter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setFilter(key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? colors.primaryForeground : colors.foreground,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Invoice Cards List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
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
        {isLoading && !isRefetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading invoices...</Text>
          </View>
        ) : filteredInvoices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No invoices found.</Text>
          </View>
        ) : (
          filteredInvoices.map((inv) => (
            <TouchableOpacity
              key={inv.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={styles.cardTopRow}>
                <View>
                  <Text style={[styles.customerName, { color: colors.foreground }]}>{inv.customer}</Text>
                  <Text style={[styles.invoiceMeta, { color: colors.mutedForeground }]}>
                    {inv.number} • {inv.date}
                  </Text>
                </View>
                <Badge variant={inv.variant}>{inv.status}</Badge>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.cardBottomRow}>
                <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Amount</Text>
                <Text
                  style={[
                    styles.totalAmount,
                    { color: inv.status === 'OVERDUE' ? colors.destructive : colors.foreground },
                  ]}
                >
                  {formatCurrency(inv.amount, 'INR')}
                </Text>
              </View>
            </TouchableOpacity>
          ))
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    paddingVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    fontFamily: fonts.display,
  },
  invoiceMeta: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
});

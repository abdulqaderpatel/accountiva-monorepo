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
  Modal,
} from 'react-native';
import { Search, Plus, FileText } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency } from '@accountiva/shared';
import { useInvoices } from '@accountiva/api';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';
import { CreateInvoiceScreen } from './CreateInvoiceScreen';
import { useAuth } from '../context/AuthContext';

interface InvoicesScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

interface InvoiceRecord {
  id: string;
  customer: string;
  number: string;
  date: string;
  dueDate?: string;
  amount: number;
  status: string;
  variant: 'success' | 'warning' | 'destructive' | 'outline' | 'default';
  items?: any[];
  subtotal?: number;
  taxAmount?: number;
  customerId?: string;
  [key: string]: any;
}

export function InvoicesScreen({ onNavigate }: InvoicesScreenProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';
  const [filter, setFilter] = useState<'all' | 'draft' | 'outstanding' | 'paid'>('all');
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);

  const { data: apiInvoices, isLoading, refetch, isRefetching } = useInvoices({
    search: search || undefined,
    status: filter === 'all'
      ? undefined
      : filter === 'draft'
        ? 'Draft'
        : filter === 'outstanding'
          ? 'Outstanding'
          : 'Paid',
  });

  const getStatusVariant = (status: string): InvoiceRecord['variant'] => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return 'success';
      case 'OUTSTANDING':
        return 'warning';
      default:
        return 'outline';
    }
  };

  const rawList: any[] = Array.isArray(apiInvoices)
    ? apiInvoices
    : Array.isArray(apiInvoices?.data)
    ? apiInvoices.data
    : [];

  const invoices: InvoiceRecord[] = rawList.map((item: any) => ({
    ...item,
    id: item.id,
    customer:
      typeof item.customer === 'string'
        ? item.customer
        : item.customer?.name || item.customerName || item.customers?.name || 'Customer',
    number: item.number || item.invoiceNumber || 'INV-000',
    date: item.date || item.dueDate || 'Recent',
    dueDate: item.dueDate || item.date || 'Upon Receipt',
    amount: Number(item.amount) || 0,
    subtotal:
      item.subtotal === null || item.subtotal === undefined
        ? undefined
        : Number(item.subtotal),
    taxAmount: Number(item.taxAmount) || Number(item.tax_amount) || 0,
    status: (item.status || 'Draft').toUpperCase(),
    variant: getStatusVariant(item.status || 'Draft'),
    items: item.items || [],
  }));

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.customer.toLowerCase().includes(search.toLowerCase()) ||
      inv.number.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'paid' && inv.status === 'PAID') ||
      (filter === 'draft' && inv.status === 'DRAFT') ||
      (filter === 'outstanding' && inv.status === 'OUTSTANDING');

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
          {(['all', 'draft', 'outstanding', 'paid'] as const).map((key) => {
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
          <EmptyState
            icon={FileText}
            title={search || filter !== 'all' ? 'No invoices found' : 'No invoices yet'}
            description={
              search || filter !== 'all'
                ? 'Try adjusting your search query or status filter to find what you need.'
                : 'Get started by creating your first invoice for a customer.'
            }
            actionLabel={search || filter !== 'all' ? 'Reset filters' : 'Create Invoice'}
            actionIcon={search || filter !== 'all' ? undefined : Plus}
            onAction={() => {
              if (search || filter !== 'all') {
                setSearch('');
                setFilter('all');
              } else {
                onNavigate('create_invoice');
              }
            }}
          />
        ) : (
          filteredInvoices.map((inv) => (
            <TouchableOpacity
              key={inv.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setSelectedInvoice(inv)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.invoiceAvatarRow}>
                  <View style={[styles.invoiceAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <FileText size={16} color={colors.foreground} />
                  </View>
                  <View>
                    <Text style={[styles.customerName, { color: colors.foreground }]}>{inv.customer}</Text>
                    <Text style={[styles.invoiceMeta, { color: colors.mutedForeground }]}>
                      {inv.number} • {inv.date}
                    </Text>
                  </View>
                </View>
                <Badge variant={inv.variant}>{inv.status}</Badge>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.cardBottomRow}>
                <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Amount</Text>
                <Text
                  style={[
                    styles.totalAmount,
                    { color: colors.foreground },
                  ]}
                >
                  {formatCurrency(inv.amount, currency)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Invoice Detail / Preview Bottom Sheet */}
      <InvoiceDetailModal
        visible={Boolean(selectedInvoice)}
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onRefresh={() => refetch()}
        onEdit={(inv) => setEditingInvoice(inv)}
      />

      {/* Invoice Edit Modal */}
      {editingInvoice && (
        <Modal visible={Boolean(editingInvoice)} animationType="slide">
          <CreateInvoiceScreen
            onNavigate={onNavigate}
            initialInvoice={editingInvoice}
            onDone={() => {
              setEditingInvoice(null);
              refetch();
            }}
          />
        </Modal>
      )}
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
  invoiceAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  invoiceAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

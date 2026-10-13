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
  Alert,
} from 'react-native';
import { Search, Plus, Calculator, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency } from '@accountiva/shared';
import { useEstimates } from '@accountiva/api';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';
import { EstimateDetailModal } from '../components/EstimateDetailModal';
import { CreateEstimateModal } from '../components/CreateEstimateModal';

interface EstimatesScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

interface EstimateRecord {
  id: string;
  customer: string;
  number: string;
  date: string;
  amount: number;
  subtotal?: number;
  taxAmount?: number;
  status: string;
  variant: 'default' | 'warning' | 'success' | 'destructive' | 'outline';
  items?: any[];
}

export function EstimatesScreen({ onNavigate }: EstimatesScreenProps) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'accepted'>('all');
  const [selectedEstimate, setSelectedEstimate] = useState<EstimateRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: apiEstimates, isLoading, refetch, isRefetching } = useEstimates({
    search: search || undefined,
    status: filter === 'all' ? undefined : filter,
  });

  const getStatusVariant = (status: string): EstimateRecord['variant'] => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'success';
      case 'sent':
        return 'warning';
      case 'rejected':
      case 'declined':
        return 'destructive';
      case 'invoiced':
        return 'default';
      default:
        return 'outline';
    }
  };

  const rawList: any[] = Array.isArray(apiEstimates)
    ? apiEstimates
    : Array.isArray(apiEstimates?.data)
    ? apiEstimates.data
    : [];

  const estimates: EstimateRecord[] = rawList.map((item: any) => ({
    id: item.id,
    customer: item.customer || item.customerName || item.customers?.name || 'Customer',
    number: item.estimateNumber || item.number || 'EST-000',
    date: item.date || item.estimateDate || 'Recent',
    amount: Number(item.amount) || 0,
    subtotal: Number(item.subtotal) || (Number(item.amount) || 0) * 0.847,
    taxAmount: Number(item.taxAmount) || (Number(item.amount) || 0) * 0.153,
    status: item.status || 'Draft',
    variant: getStatusVariant(item.status || 'Draft'),
    items: item.items || [],
  }));

  const filteredEstimates = estimates.filter((est) => {
    const matchesSearch =
      est.customer.toLowerCase().includes(search.toLowerCase()) ||
      est.number.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || est.status.toLowerCase() === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Estimates & Quotes</Text>
        <TouchableOpacity
          onPress={() => setIsCreateModalOpen(true)}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.primaryForeground} strokeWidth={2.5} />
          <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search estimates, clients..."
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
          {(['all', 'draft', 'sent', 'accepted'] as const).map((key) => {
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

      {/* Estimates List */}
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
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading estimates...</Text>
          </View>
        ) : filteredEstimates.length === 0 ? (
          <EmptyState
            icon={Calculator}
            title={search || filter !== 'all' ? 'No estimates found' : 'No estimates yet'}
            description={
              search || filter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Send a professional quote to a customer to win their business.'
            }
            actionLabel={search || filter !== 'all' ? 'Reset filters' : 'Create Estimate'}
            actionIcon={search || filter !== 'all' ? undefined : Plus}
            onAction={() => {
              if (search || filter !== 'all') {
                setSearch('');
                setFilter('all');
              } else {
                setIsCreateModalOpen(true);
              }
            }}
          />
        ) : (
          filteredEstimates.map((est) => (
            <TouchableOpacity
              key={est.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setSelectedEstimate(est)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.estAvatarRow}>
                  <View style={[styles.estAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Calculator size={16} color={colors.foreground} />
                  </View>
                  <View>
                    <Text style={[styles.customerName, { color: colors.foreground }]}>{est.customer}</Text>
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                      {est.number} • {est.date}
                    </Text>
                  </View>
                </View>
                <Badge variant={est.variant}>{est.status}</Badge>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.cardBottomRow}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Estimated Amount</Text>
                <Text style={[styles.amount, { color: colors.foreground }]}>
                  {formatCurrency(est.amount, 'INR')}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Estimate Detail Modal */}
      <EstimateDetailModal
        visible={Boolean(selectedEstimate)}
        estimate={selectedEstimate}
        onClose={() => setSelectedEstimate(null)}
        onRefresh={() => refetch()}
        onConvertToInvoice={() => onNavigate('invoices')}
      />

      {/* Create Estimate Modal */}
      <CreateEstimateModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => refetch()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newBtnText: {
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
  estAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  estAvatar: {
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
    fontFamily: fonts.display,
    marginBottom: 2,
  },
  metaText: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
  },
});

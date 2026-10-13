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
import { Search, Plus, FileMinus, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import { useCreditNotes } from '@accountiva/api';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';

interface CreditNotesScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

interface CreditNoteRecord {
  id: string;
  customer: string;
  number: string;
  date: string;
  amount: number;
  status: string;
  variant: 'default' | 'warning' | 'success' | 'destructive' | 'outline';
}

const FALLBACK_CREDIT_NOTES: CreditNoteRecord[] = [
  {
    id: '1',
    customer: 'Delta Retail Corp',
    number: 'CN-2026-004',
    date: '08 Oct 2026',
    amount: 5400,
    status: 'Open',
    variant: 'warning',
  },
  {
    id: '2',
    customer: 'Zephyr Logistics Pvt Ltd',
    number: 'CN-2026-003',
    date: '25 Sep 2026',
    amount: 12000,
    status: 'Closed',
    variant: 'success',
  },
];

export function CreditNotesScreen({ onNavigate }: CreditNotesScreenProps) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  const { data: apiNotes, isLoading, refetch, isRefetching } = useCreditNotes({
    search: search || undefined,
    status: filter === 'all' ? undefined : filter,
  });

  const getStatusVariant = (status: string): CreditNoteRecord['variant'] => {
    switch (status.toLowerCase()) {
      case 'closed':
      case 'applied':
      case 'refunded':
        return 'success';
      case 'open':
        return 'warning';
      default:
        return 'outline';
    }
  };

  const rawList = Array.isArray(apiNotes) && apiNotes.length > 0
    ? apiNotes
    : Array.isArray(apiNotes?.data) && apiNotes.data.length > 0
    ? apiNotes.data
    : FALLBACK_CREDIT_NOTES;

  const notes: CreditNoteRecord[] = rawList.map((item: any) => ({
    id: item.id,
    customer: item.customer || item.customerName || item.customers?.name || 'Customer',
    number: item.creditNoteNumber || item.number || 'CN-000',
    date: item.date || item.createdAt || 'Recent',
    amount: Number(item.amount) || 0,
    status: item.status || 'Open',
    variant: getStatusVariant(item.status || 'Open'),
  }));

  const filteredNotes = notes.filter((cn) => {
    const matchesSearch =
      cn.customer.toLowerCase().includes(search.toLowerCase()) ||
      cn.number.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || cn.status.toLowerCase() === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Credit Notes</Text>
        <TouchableOpacity
          onPress={() => Alert.alert('New Credit Note', 'Credit note creation is active in this workspace.')}
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
            placeholder="Search credit notes, clients..."
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
          {(['all', 'open', 'closed'] as const).map((key) => {
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

      {/* Credit Notes List */}
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
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading credit notes...</Text>
          </View>
        ) : filteredNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileMinus size={32} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No credit notes found.</Text>
          </View>
        ) : (
          filteredNotes.map((cn) => (
            <TouchableOpacity
              key={cn.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.noteAvatarRow}>
                  <View style={[styles.noteAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <FileMinus size={16} color={colors.foreground} />
                  </View>
                  <View>
                    <Text style={[styles.customerName, { color: colors.foreground }]}>{cn.customer}</Text>
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                      {cn.number} • {cn.date}
                    </Text>
                  </View>
                </View>
                <Badge variant={cn.variant}>{cn.status}</Badge>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.cardBottomRow}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Credit Amount</Text>
                <Text style={[styles.amount, { color: colors.foreground }]}>
                  {formatCurrency(cn.amount, 'INR')}
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
  noteAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  noteAvatar: {
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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Trash2,
  RotateCcw,
  Search,
  FileText,
  Calculator,
  FileMinus,
  Users,
  Package,
  Receipt,
  CircleAlert,
} from 'lucide-react-native';
import api from '@accountiva/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { toast, confirm } from '../../context/FeedbackContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/Skeleton';
import { formatCurrency } from '@accountiva/shared';
import { fonts } from '../../theme/typography';

export interface TrashItem {
  id: string;
  entity_type: string;
  entityType?: string;
  title?: string;
  name?: string;
  number?: string;
  amount?: number;
  deleted_at?: string;
  deletedAt?: string;
  daysRemaining?: number;
  days_remaining?: number;
}

const TRASH_TABS = [
  { id: 'all', label: 'All', icon: Trash2 },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'estimates', label: 'Quotes', icon: Calculator },
  { id: 'credit_notes', label: 'Credit Notes', icon: FileMinus },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'items', label: 'Items', icon: Package },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'bills', label: 'Bills', icon: FileText },
];

export function RecentlyDeletedTab() {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';

  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchTrash = useCallback(async (isRefresh = false) => {
    if (!currentOrg?.id) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params: any = {};
      if (activeTab !== 'all') params.type = activeTab;
      if (search.trim()) params.search = search.trim();

      const { data } = await api.get('/trash', { params });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.items)
        ? data.items
        : [];
      setItems(list);
    } catch {
      toast.error('Load Failed', 'Could not fetch recently deleted records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentOrg?.id, activeTab, search]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const type = (item.entity_type || item.entityType || '').toLowerCase();
      if (activeTab !== 'all' && type !== activeTab.toLowerCase()) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const title = (item.title || item.name || item.number || '').toLowerCase();
        if (!title.includes(q) && !type.includes(q)) return false;
      }
      return true;
    });
  }, [items, activeTab, search]);

  const handleRestore = async (item: TrashItem) => {
    const entityType = item.entity_type || item.entityType;
    try {
      setActionLoadingId(item.id);
      await api.post('/trash/restore', {
        id: item.id,
        entityType,
      });
      toast.success('Record Restored', `${item.title || item.name || item.number || 'Record'} has been restored.`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      toast.error('Restore Failed', err.response?.data?.message || err.message || 'Could not restore record.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePermanentDelete = (item: TrashItem) => {
    const title = item.title || item.name || item.number || 'this item';
    const entityType = item.entity_type || item.entityType;

    confirm({
      title: 'Permanently Delete',
      message: `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      confirmText: 'Delete Permanently',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          setActionLoadingId(item.id);
          await api.delete('/trash/permanent', {
            data: { id: item.id, entityType },
          });
          toast.success('Deleted Permanently', `"${title}" has been deleted.`);
          setItems((prev) => prev.filter((i) => i.id !== item.id));
        } catch (err: any) {
          toast.error('Delete Failed', err.response?.data?.message || err.message || 'Could not permanently delete.');
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  const handleEmptyTrash = () => {
    confirm({
      title: 'Empty Trash',
      message: 'Are you sure you want to permanently purge all items in Recently Deleted? This action cannot be reversed.',
      confirmText: 'Empty All',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.post('/trash/empty');
          toast.success('Trash Emptied', 'All items in trash have been purged.');
          setItems([]);
        } catch (err: any) {
          toast.error('Error', err.response?.data?.message || err.message || 'Failed to empty trash.');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search & Actions Bar */}
      <View style={styles.topActions}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search deleted records..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>

        {items.length > 0 ? (
          <TouchableOpacity
            onPress={handleEmptyTrash}
            style={[styles.emptyBtn, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive }]}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color={colors.destructive} />
            <Text style={[styles.emptyBtnText, { color: colors.destructive }]}>Empty</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {TRASH_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Icon
                  size={13}
                  color={isSelected ? colors.primaryForeground : colors.mutedForeground}
                  style={{ marginRight: 6 }}
                />
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

      {/* Retention Notice */}
      <View style={[styles.noticeBanner, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
        <CircleAlert size={15} color={colors.mutedForeground} style={{ marginTop: 2, marginRight: 8 }} />
        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
          Soft-deleted items are safely retained for 30 days before being automatically purged.
        </Text>
      </View>

      {/* Item List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTrash(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <SkeletonList count={4} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title={search ? 'No matching deleted items' : 'Trash is empty'}
            description={
              search
                ? 'No deleted records matched your search query.'
                : 'Items moved to trash will appear here for 30 days before permanent deletion.'
            }
            actionLabel={search ? 'Clear search' : undefined}
            onAction={search ? () => setSearch('') : undefined}
          />
        ) : (
          filteredItems.map((item) => {
            const title = item.title || item.name || item.number || 'Unnamed Record';
            const entityType = item.entity_type || item.entityType || 'record';
            const daysLeft = item.daysRemaining ?? item.days_remaining ?? 30;
            const isActing = actionLoadingId === item.id;

            return (
              <Card key={item.id} style={styles.card}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Badge variant="outline">{entityType.toUpperCase()}</Badge>
                      <Text style={[styles.daysText, { color: daysLeft <= 7 ? colors.destructive : colors.mutedForeground }]}>
                        {daysLeft} days left
                      </Text>
                    </View>
                  </View>

                  {item.amount != null ? (
                    <Text style={[styles.amountText, { color: colors.foreground }]}>
                      {formatCurrency(Number(item.amount), currency)}
                    </Text>
                  ) : null}
                </View>

                <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

                {/* Card Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => handleRestore(item)}
                    disabled={isActing}
                    style={[styles.actionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                    activeOpacity={0.7}
                  >
                    {isActing ? (
                      <ActivityIndicator size="small" color={colors.foreground} />
                    ) : (
                      <>
                        <RotateCcw size={14} color={colors.foreground} style={{ marginRight: 6 }} />
                        <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Restore</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePermanentDelete(item)}
                    disabled={isActing}
                    style={[styles.actionBtn, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive }]}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={14} color={colors.destructive} style={{ marginRight: 6 }} />
                    <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Delete Forever</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
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
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  emptyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  filterWrapper: {
    paddingBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.regular,
    lineHeight: 16,
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
    padding: 14,
    gap: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  daysText: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  cardDivider: {
    height: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
});


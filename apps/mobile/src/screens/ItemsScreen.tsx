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
import { Search, Plus, Package, Wrench, Boxes } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import { useItems } from '@accountiva/api';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';
import { AddItemModal } from '../components/AddItemModal';

interface ItemsScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

interface ItemRecord {
  id: string;
  name: string;
  type: 'Product' | 'Service';
  sku?: string;
  sellingPrice: number;
  stockOnHand?: number;
  description?: string;
}

const FALLBACK_ITEMS: ItemRecord[] = [
  {
    id: '1',
    name: 'Cloud Hosting Support',
    type: 'Service',
    sku: 'SRV-CLOUD-01',
    sellingPrice: 25000,
    description: '24/7 Enterprise SLA infrastructure support.',
  },
  {
    id: '2',
    name: 'Standard Ergonomic Chair',
    type: 'Product',
    sku: 'PRD-CHR-01',
    sellingPrice: 14500,
    stockOnHand: 42,
  },
  {
    id: '3',
    name: 'Mechanical Keyboard Pro',
    type: 'Product',
    sku: 'PRD-KBD-09',
    sellingPrice: 6200,
    stockOnHand: 18,
  },
];

export function ItemsScreen({ onNavigate }: ItemsScreenProps) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'Product' | 'Service'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: apiItems, isLoading, refetch, isRefetching } = useItems({
    search: search || undefined,
    type: filterType === 'ALL' ? undefined : filterType,
  });

  const rawList = Array.isArray(apiItems) && apiItems.length > 0
    ? apiItems
    : (Array.isArray(apiItems?.data) && apiItems.data.length > 0
        ? apiItems.data
        : FALLBACK_ITEMS);

  const items: ItemRecord[] = rawList.map((i: any) => ({
    id: i.id,
    name: i.name || 'Unnamed Item',
    type: i.type || 'Product',
    sku: i.sku || '',
    sellingPrice: Number(i.sellingPrice) || Number(i.unitPrice) || 0,
    stockOnHand: i.stockOnHand ?? i.openingStock ?? null,
    description: i.description || '',
  }));

  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      (item.sku && item.sku.toLowerCase().includes(q));

    const matchesType = filterType === 'ALL' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Products & Services</Text>
        <TouchableOpacity
          onPress={() => setIsAddModalOpen(true)}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.primaryForeground} strokeWidth={2.5} />
          <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search items, SKU..."
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
          {(['ALL', 'Product', 'Service'] as const).map((key) => {
            const isSelected = filterType === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setFilterType(key)}
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
                  {key === 'ALL' ? 'All Items' : key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Items List */}
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
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading catalog...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Boxes size={32} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No items found in catalog.</Text>
          </View>
        ) : (
          filteredItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={styles.topRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  {item.sku ? (
                    <Text style={[styles.skuText, { color: colors.mutedForeground }]}>SKU: {item.sku}</Text>
                  ) : null}
                  {item.description ? (
                    <Text style={[styles.descText, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge variant={item.type === 'Product' ? 'default' : 'outline'}>
                    {item.type}
                  </Badge>
                  {item.stockOnHand !== null && item.stockOnHand !== undefined ? (
                    <Text style={[styles.stockText, { color: colors.mutedForeground }]}>
                      {item.stockOnHand} in stock
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.bottomRow}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Unit Price</Text>
                <Text style={[styles.price, { color: colors.foreground }]}>
                  {formatCurrency(item.sellingPrice, 'INR')}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <AddItemModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
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
    paddingVertical: 12,
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    fontFamily: fonts.display,
  },
  skuText: {
    fontSize: 11,
    fontFamily: fonts.mono,
  },
  descText: {
    fontSize: 11,
    marginTop: 2,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { toast, confirm } from '../context/FeedbackContext';
import { X, Package, Wrench, Tag, Layers, FileText, Trash, Pencil } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import { useDeleteItem } from '@accountiva/api';
import { fonts } from '../theme/typography';

interface ItemDetailModalProps {
  visible: boolean;
  item: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onEdit?: (item: any) => void;
}

export function ItemDetailModal({ visible, item, onClose, onRefresh, onEdit }: ItemDetailModalProps) {
  const { colors } = useTheme();
  const deleteItemMutation = useDeleteItem();

  if (!visible || !item) return null;

  const itemName = String(item.name || 'Unnamed Item');
  const isProduct = item.type !== 'Service';
  const price = Number(item.sellingPrice) || Number(item.rate) || Number(item.price) || 0;
  const stock = item.openingStock ?? item.stock ?? item.stockOnHand ?? null;

  const handleDelete = () => {
    confirm({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${itemName}" from your catalog?`,
      confirmText: 'Delete',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          await deleteItemMutation.mutateAsync(item.id);
          toast.success('Item Deleted', `"${itemName}" has been removed.`);
          if (onRefresh) onRefresh();
          onClose();
        } catch (err: any) {
          toast.error('Error', err?.message || 'Failed to delete item');
        }
      },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>Catalog Item Details</Text>
            <View style={styles.headerRight}>
              {onEdit && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onEdit(item);
                  }}
                  style={styles.iconBtn}
                  activeOpacity={0.7}
                >
                  <Pencil size={18} color={colors.foreground} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7}>
                <Trash size={18} color={colors.destructive} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Hero Item Card */}
            <Card style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                  ]}
                >
                  {isProduct ? (
                    <Package size={24} color={colors.foreground} />
                  ) : (
                    <Wrench size={24} color={colors.foreground} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{itemName}</Text>
                  {item.sku ? (
                    <Text style={[styles.skuText, { color: colors.mutedForeground }]}>
                      SKU: {item.sku}
                    </Text>
                  ) : null}
                  <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                    <Badge variant={isProduct ? 'default' : 'outline'}>
                      {item.type || 'Product'}
                    </Badge>
                  </View>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.priceRow}>
                <View>
                  <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>
                    Selling Price
                  </Text>
                  <Text style={[styles.priceValue, { color: colors.foreground }]}>
                    {formatCurrency(price, 'INR')}
                  </Text>
                </View>

                {isProduct && stock !== null ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>
                      Stock Quantity
                    </Text>
                    <Text style={[styles.stockValue, { color: colors.foreground }]}>
                      {stock} units
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>

            {/* Description Card */}
            {item.description ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  Description & Specifications
                </Text>
                <Card style={styles.descCard}>
                  <Text style={[styles.descText, { color: colors.foreground }]}>
                    {item.description}
                  </Text>
                </Card>
              </>
            ) : null}

            {/* Attributes & Tax Details */}
            {(item.uom || item.unit || item.hsnSacCode || item.hsnCode || item.category || item.costPrice || item.salesTaxRate) ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  Attributes & Tax Details
                </Text>
                <Card style={{ padding: 14, gap: 10 }}>
                  {item.category ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.mutedForeground }}>Category</Text>
                      <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.foreground }}>{item.category}</Text>
                    </View>
                  ) : null}
                  {(item.uom || item.unit) ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.mutedForeground }}>Unit (UOM)</Text>
                      <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.foreground }}>{item.uom || item.unit}</Text>
                    </View>
                  ) : null}
                  {(item.hsnSacCode || item.hsnCode) ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.mutedForeground }}>HSN / SAC Code</Text>
                      <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.foreground }}>{item.hsnSacCode || item.hsnCode}</Text>
                    </View>
                  ) : null}
                  {item.taxPreference ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.mutedForeground }}>Tax Preference</Text>
                      <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.foreground }}>{item.taxPreference}</Text>
                    </View>
                  ) : null}
                  {item.salesTaxRate !== undefined && item.salesTaxRate !== null ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.mutedForeground }}>GST Rate</Text>
                      <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.foreground }}>{item.salesTaxRate}%</Text>
                    </View>
                  ) : null}
                  {item.costPrice ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.mutedForeground }}>Cost Price</Text>
                      <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.foreground }}>{formatCurrency(Number(item.costPrice), 'INR')}</Text>
                    </View>
                  ) : null}
                </Card>
              </>
            ) : null}

            {/* Custom Fields */}
            {item.customFields && typeof item.customFields === 'object' && Object.keys(item.customFields).length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Custom Fields</Text>
                <Card style={{ padding: 12, gap: 8 }}>
                  {Object.entries(item.customFields).map(([k, v], idx, arr) => (
                    <View key={k}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                        <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.mutedForeground }}>{k}</Text>
                        <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.foreground }}>{String(v)}</Text>
                      </View>
                      {idx < arr.length - 1 ? (
                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
                      ) : null}
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '85%',
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
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    padding: 4,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 36,
  },
  heroCard: {
    padding: 16,
    gap: 12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  skuText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  descCard: {
    padding: 14,
  },
  descText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fonts.regular,
  },
});

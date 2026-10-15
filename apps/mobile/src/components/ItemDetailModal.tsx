import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
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

  if (!item) return null;

  const isProduct = item.type !== 'Service';
  const price = Number(item.sellingPrice) || Number(item.rate) || Number(item.price) || 0;
  const stock = item.openingStock ?? item.stock ?? item.stockOnHand ?? null;

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}" from your catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItemMutation.mutateAsync(item.id);
              Alert.alert('Deleted', 'Item deleted successfully');
              if (onRefresh) onRefresh();
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete item');
            }
          },
        },
      ]
    );
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
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
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

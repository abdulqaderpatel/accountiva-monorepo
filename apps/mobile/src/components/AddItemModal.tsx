import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Check, Package, Wrench, CircleAlert } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useCreateItem, useUpdateItem } from '@accountiva/api';
import { itemSchema } from '@accountiva/shared';
import { fonts } from '../theme/typography';

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItem?: any;
}

export function AddItemModal({ visible, onClose, onSuccess, initialItem }: AddItemModalProps) {
  const { colors } = useTheme();
  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();

  const [name, setName] = useState('');
  const [type, setType] = useState<'Product' | 'Service'>('Product');
  const [sku, setSku] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [description, setDescription] = useState('');
  const [openingStock, setOpeningStock] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialItem) {
      setName(initialItem.name || '');
      setType(initialItem.type === 'Service' ? 'Service' : 'Product');
      setSku(initialItem.sku || '');
      setSellingPrice(initialItem.sellingPrice != null ? String(initialItem.sellingPrice) : '');
      setDescription(initialItem.description || '');
      setOpeningStock(initialItem.stockOnHand != null ? String(initialItem.stockOnHand) : initialItem.openingStock != null ? String(initialItem.openingStock) : '');
    } else {
      setName('');
      setType('Product');
      setSku('');
      setSellingPrice('');
      setDescription('');
      setOpeningStock('');
    }
    setErrors({});
  }, [initialItem, visible]);

  const resetForm = () => {
    setName('');
    setType('Product');
    setSku('');
    setSellingPrice('');
    setDescription('');
    setOpeningStock('');
    setErrors({});
    setApiError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    setErrors({});
    setApiError(null);

    const formData = {
      name: name.trim(),
      type,
      sku: sku.trim(),
      sellingPrice: sellingPrice ? parseFloat(sellingPrice) : 0,
      description: description.trim(),
      openingStock: type === 'Product' && openingStock ? parseInt(openingStock, 10) : undefined,
    };

    const result = itemSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path[0] as string;
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      if (initialItem?.id) {
        await updateItemMutation.mutateAsync({
          id: initialItem.id,
          payload: formData,
        });
      } else {
        await createItemMutation.mutateAsync(formData);
      }
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      setApiError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save item. Please check all fields.'
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {initialItem ? 'Edit Item' : 'New Item'}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
            {/* API Error Banner */}
            {apiError ? (
              <View style={[styles.apiErrorBanner, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive }]}>
                <CircleAlert size={16} color={colors.destructive} style={{ marginTop: 2 }} />
                <Text style={[styles.apiErrorText, { color: colors.destructive }]}>{apiError}</Text>
              </View>
            ) : null}
            {/* Item Type Switcher */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Item Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: type === 'Product' ? colors.primary : colors.card,
                      borderColor: type === 'Product' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setType('Product')}
                  activeOpacity={0.7}
                >
                  <Package
                    size={16}
                    color={type === 'Product' ? colors.primaryForeground : colors.foreground}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      {
                        color: type === 'Product' ? colors.primaryForeground : colors.foreground,
                        fontWeight: type === 'Product' ? '700' : '500',
                      },
                    ]}
                  >
                    Product / Good
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: type === 'Service' ? colors.primary : colors.card,
                      borderColor: type === 'Service' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setType('Service')}
                  activeOpacity={0.7}
                >
                  <Wrench
                    size={16}
                    color={type === 'Service' ? colors.primaryForeground : colors.foreground}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      {
                        color: type === 'Service' ? colors.primaryForeground : colors.foreground,
                        fontWeight: type === 'Service' ? '700' : '500',
                      },
                    ]}
                  >
                    Service
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Item Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.card, borderColor: errors.name ? colors.destructive : colors.border, color: colors.foreground },
                ]}
                placeholder="e.g. Mechanical Keyboard Pro"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
              />
              {errors.name && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.name}</Text>}
            </View>

            {/* SKU */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>SKU / Code</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. PRD-KBD-09"
                placeholderTextColor={colors.mutedForeground}
                value={sku}
                onChangeText={setSku}
              />
            </View>

            {/* Selling Price */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Selling Price (₹) *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.card, borderColor: errors.sellingPrice ? colors.destructive : colors.border, color: colors.foreground },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                value={sellingPrice}
                onChangeText={setSellingPrice}
                keyboardType="numeric"
              />
              {errors.sellingPrice && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.sellingPrice}</Text>}
            </View>

            {/* Opening Stock (Product Only) */}
            {type === 'Product' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Opening Stock Qty</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  value={openingStock}
                  onChangeText={setOpeningStock}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="Item specification or service scope details..."
                placeholderTextColor={colors.mutedForeground}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Footer CTA */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={createItemMutation.isPending}
            >
              <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={createItemMutation.isPending}
              activeOpacity={0.8}
            >
              {createItemMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Check size={16} color={colors.primaryForeground} strokeWidth={2.5} />
                  <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Item</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  formContent: {
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeBtnText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  errorText: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  apiErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  apiErrorText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    flex: 1,
    lineHeight: 18,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { X, Plus, Trash2, Users, Package, Wrench, Search, Check, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card } from './ui/Card';
import { formatCurrency } from '@accountiva/shared';
import { useCreateEstimate, useCustomers, useItems } from '@accountiva/api';
import { fonts } from '../theme/typography';

interface CreateEstimateModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
}

export function CreateEstimateModal({ visible, onClose, onSuccess }: CreateEstimateModalProps) {
  const { colors } = useTheme();
  const createEstimateMutation = useCreateEstimate();

  const { data: apiCustomers } = useCustomers();
  const { data: apiItems } = useItems();

  const rawCustomers: any[] = Array.isArray(apiCustomers)
    ? apiCustomers
    : Array.isArray(apiCustomers?.data)
    ? apiCustomers.data
    : [];

  const rawItems: any[] = Array.isArray(apiItems)
    ? apiItems
    : Array.isArray(apiItems?.data)
    ? apiItems.data
    : [];

  const [customer, setCustomer] = useState('Delta Retail Corp');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  const [estimateNumber, setEstimateNumber] = useState(
    `EST-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [expiryDate, setExpiryDate] = useState('30 Days');
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', name: 'Software Consulting Services', quantity: 1, rate: 20000 },
  ]);

  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.rate, 0);
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;

  const addItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      name: 'Custom Service Item',
      quantity: 1,
      rate: 5000,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      Alert.alert('Required', 'A quote requires at least 1 line item.');
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, qty) } : item))
    );
  };

  const handleSave = async () => {
    try {
      await createEstimateMutation.mutateAsync({
        estimateNumber,
        customerName: customer,
        expiryDate,
        amount: grandTotal,
        subtotal,
        taxAmount: tax,
        status: 'Draft',
        items: items.map((i) => ({
          itemName: i.name,
          quantity: i.quantity,
          rate: i.rate,
          amount: i.quantity * i.rate,
        })),
      });

      Alert.alert('Quote Created', `Quote ${estimateNumber} created for ${customer}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save quote');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Estimate / Quote</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={createEstimateMutation.isPending}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              {createEstimateMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Customer Picker */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Customer *</Text>
              <TouchableOpacity
                onPress={() => setCustomerModalOpen(true)}
                style={[styles.selectBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.selectIconWrap, { backgroundColor: colors.surfaceSubtle }]}>
                    <Users size={16} color={colors.foreground} />
                  </View>
                  <Text style={[styles.selectText, { color: colors.foreground }]}>{customer}</Text>
                </View>
                <ChevronDown size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Quote Number & Expiry */}
            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Quote #</Text>
                <TextInput
                  value={estimateNumber}
                  onChangeText={setEstimateNumber}
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Validity</Text>
                <TextInput
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                />
              </View>
            </View>

            {/* Line Items Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Line Items ({items.length})
              </Text>
              <TouchableOpacity onPress={() => setItemModalOpen(true)} activeOpacity={0.7}>
                <Text style={[styles.addItemText, { color: colors.primary }]}>+ Add Item</Text>
              </TouchableOpacity>
            </View>

            {/* Line Items List */}
            <View style={styles.itemsList}>
              {items.map((item) => (
                <Card key={item.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                      <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>Taxable Supply</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeItem(item.id)} activeOpacity={0.7}>
                      <Trash2 size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

                  <View style={styles.itemMathGrid}>
                    <View style={styles.mathCol}>
                      <Text style={[styles.mathLabel, { color: colors.mutedForeground }]}>Qty</Text>
                      <View style={[styles.qtyControl, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                        <TouchableOpacity
                          onPress={() => updateQuantity(item.id, item.quantity - 1)}
                          style={styles.qtyBtn}
                        >
                          <Text style={[styles.qtyBtnText, { color: colors.foreground }]}>-</Text>
                        </TouchableOpacity>
                        <Text style={[styles.qtyNumber, { color: colors.foreground }]}>{item.quantity}</Text>
                        <TouchableOpacity
                          onPress={() => updateQuantity(item.id, item.quantity + 1)}
                          style={styles.qtyBtn}
                        >
                          <Text style={[styles.qtyBtnText, { color: colors.foreground }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.mathCol}>
                      <Text style={[styles.mathLabel, { color: colors.mutedForeground }]}>Rate (₹)</Text>
                      <Text style={[styles.mathValue, { color: colors.foreground }]}>
                        {formatCurrency(item.rate, 'INR')}
                      </Text>
                    </View>

                    <View style={[styles.mathCol, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.mathLabel, { color: colors.mutedForeground }]}>Amount</Text>
                      <Text style={[styles.mathValueBold, { color: colors.foreground }]}>
                        {formatCurrency(item.quantity * item.rate, 'INR')}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>

            {/* Calculations Summary Card */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(subtotal, 'INR')}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>GST (18%)</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(tax, 'INR')}
                </Text>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryRow}>
                <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Estimated Total</Text>
                <Text style={[styles.grandTotalValue, { color: colors.foreground }]}>
                  {formatCurrency(grandTotal, 'INR')}
                </Text>
              </View>
            </Card>
          </ScrollView>

          {/* Customer Selection Modal */}
          <Modal visible={customerModalOpen} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Customer</Text>
                  <TouchableOpacity onPress={() => setCustomerModalOpen(false)}>
                    <X size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.modalSearchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search customers..."
                    placeholderTextColor={colors.mutedForeground}
                    value={customerSearch}
                    onChangeText={setCustomerSearch}
                    style={[styles.modalSearchInput, { color: colors.foreground }]}
                  />
                </View>

                <FlatList
                  data={rawCustomers.filter((c: any) =>
                    (c.name || '').toLowerCase().includes(customerSearch.toLowerCase())
                  )}
                  keyExtractor={(item) => item.id || item.name}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setCustomer(item.name);
                        setCustomerModalOpen(false);
                      }}
                      style={[styles.modalItemRow, { borderBottomColor: colors.border }]}
                    >
                      <View style={styles.modalItemLeft}>
                        <Users size={16} color={colors.foreground} style={{ marginRight: 10 }} />
                        <View>
                          <Text style={[styles.modalItemText, { color: colors.foreground }]}>
                            {item.name}
                          </Text>
                        </View>
                      </View>
                      {customer === item.name ? <Check size={18} color={colors.primary} /> : null}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* Line Item Catalog Modal */}
          <Modal visible={itemModalOpen} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Catalog Item</Text>
                  <TouchableOpacity onPress={() => setItemModalOpen(false)}>
                    <X size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.modalSearchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search products & services..."
                    placeholderTextColor={colors.mutedForeground}
                    value={itemSearch}
                    onChangeText={setItemSearch}
                    style={[styles.modalSearchInput, { color: colors.foreground }]}
                  />
                </View>

                <FlatList
                  data={rawItems.filter((i: any) =>
                    (i.name || '').toLowerCase().includes(itemSearch.toLowerCase())
                  )}
                  keyExtractor={(item) => item.id || item.name}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                  renderItem={({ item }) => {
                    const itemRate = Number(item.sellingPrice) || Number(item.unitPrice) || 0;
                    return (
                      <TouchableOpacity
                        onPress={() => {
                          setItems([
                            ...items,
                            {
                              id: Date.now().toString(),
                              name: item.name || 'Catalog Item',
                              quantity: 1,
                              rate: itemRate,
                            },
                          ]);
                          setItemModalOpen(false);
                        }}
                        style={[styles.modalItemRow, { borderBottomColor: colors.border }]}
                      >
                        <View style={styles.modalItemLeft}>
                          {item.type === 'Service' ? (
                            <Wrench size={16} color={colors.foreground} style={{ marginRight: 10 }} />
                          ) : (
                            <Package size={16} color={colors.foreground} style={{ marginRight: 10 }} />
                          )}
                          <View>
                            <Text style={[styles.modalItemText, { color: colors.foreground }]}>
                              {item.name}
                            </Text>
                            <Text style={[styles.modalItemSub, { color: colors.mutedForeground }]}>
                              {item.type || 'Product'} • {formatCurrency(itemRate, 'INR')}
                            </Text>
                          </View>
                        </View>
                        <Plus size={16} color={colors.primary} />
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </View>
          </Modal>
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
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  selectIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: fonts.medium,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  halfField: {
    flex: 1,
    gap: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addItemText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    padding: 12,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  itemSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  itemDivider: {
    height: 1,
    marginVertical: 10,
  },
  itemMathGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mathCol: {
    gap: 4,
  },
  mathLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: fonts.medium,
    textTransform: 'uppercase',
  },
  mathValue: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  mathValueBold: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    height: 28,
  },
  qtyBtn: {
    width: 26,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  qtyNumber: {
    paddingHorizontal: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    padding: 14,
    gap: 6,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 6,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  grandTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: fonts.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 10,
    height: 38,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalItemText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  modalItemSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
});

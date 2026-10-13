import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, FlatList } from 'react-native';
import { X, Trash2, Plus, Check, Search, Users, Package, Wrench, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import { useCreateInvoice, useCustomers, useItems } from '@accountiva/api';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
}

interface CreateInvoiceScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export function CreateInvoiceScreen({ onNavigate }: CreateInvoiceScreenProps) {
  const { colors } = useTheme();
  const createInvoiceMutation = useCreateInvoice();

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

  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [dueDate, setDueDate] = useState('26 Oct 2026');
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', name: 'Cloud Hosting Support', quantity: 1, rate: 25000 },
  ]);

  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.rate, 0);
  const tax = subtotal * 0.18; // 18% GST
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
      Alert.alert('Required', 'An invoice requires at least 1 line item.');
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
      await createInvoiceMutation.mutateAsync({
        invoiceNumber,
        customerName: customer,
        dueDate,
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

      Alert.alert('Success', `Invoice ${invoiceNumber} created for ${customer}!`, [
        { text: 'OK', onPress: () => onNavigate('invoices') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save invoice');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => onNavigate('invoices')}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <X size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Create Invoice</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        {/* Customer Select Field */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Customer *</Text>
          <TouchableOpacity
            onPress={() => setCustomerModalOpen(true)}
            style={[styles.customerSelectBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.selectIconWrap, { backgroundColor: colors.surfaceSubtle }]}>
                <Users size={16} color={colors.foreground} />
              </View>
              <Text style={[styles.customerSelectText, { color: colors.foreground }]}>{customer}</Text>
            </View>
            <ChevronDown size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Invoice Number & Due Date Row */}
        <View style={styles.rowFields}>
          <View style={styles.halfField}>
            <Input
              label="Invoice #"
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
            />
          </View>
          <View style={styles.halfField}>
            <Input
              label="Due Date"
              value={dueDate}
              onChangeText={setDueDate}
            />
          </View>
        </View>

        {/* Line Items Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
            Line Items ({items.length})
          </Text>
          <TouchableOpacity onPress={() => setItemModalOpen(true)} activeOpacity={0.7}>
            <Text style={[styles.addItemText, { color: colors.primary }]}>+ Add Item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.itemsList}>
          {items.map((item) => (
            <Card key={item.id} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <View>
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

        {/* Calculation Summary Box */}
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
            <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Total Payable</Text>
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
                      {item.email ? (
                        <Text style={[styles.modalItemSub, { color: colors.mutedForeground }]}>
                          {item.email}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {customer === item.name ? <Check size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                  <Users size={28} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 13, fontFamily: fonts.semiBold, color: colors.foreground }}>
                    {customerSearch ? 'No matching customers found' : 'No customers found'}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: fonts.regular, color: colors.mutedForeground, marginTop: 4, textAlign: 'center' }}>
                    {customerSearch ? 'Try a different search keyword' : 'Add clients from the Customers tab to select here'}
                  </Text>
                </View>
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
                (i.name || '').toLowerCase().includes(itemSearch.toLowerCase()) ||
                (i.sku || '').toLowerCase().includes(itemSearch.toLowerCase())
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
              ListEmptyComponent={() => (
                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                  <Package size={28} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 13, fontFamily: fonts.semiBold, color: colors.foreground }}>
                    {itemSearch ? 'No matching items found' : 'Catalog is empty'}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: fonts.regular, color: colors.mutedForeground, marginTop: 4, textAlign: 'center' }}>
                    {itemSearch ? 'Try a different search keyword' : 'Add products & services in Catalog to select here'}
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
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
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
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
  formContent: {
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
  customerSelectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  customerSelectText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: fonts.medium,
  },
  selectIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  halfField: {
    flex: 1,
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
    fontFamily: fonts.bold,
  },
  itemSub: {
    fontSize: 10,
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
    fontFamily: fonts.regular,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  qtyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  qtyNumber: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
    paddingHorizontal: 4,
  },
  mathValue: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  mathValueBold: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  summaryCard: {
    padding: 14,
    gap: 8,
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
    marginVertical: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: fonts.bold,
  },
  grandTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: fonts.extraBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '75%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
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


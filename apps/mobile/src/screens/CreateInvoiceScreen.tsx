import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Trash2,
  Plus,
  Check,
  Search,
  Users,
  Package,
  Wrench,
  ChevronDown,
  AlertCircle,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { formatCurrency } from '@accountiva/shared';
import { useCreateInvoice, useUpdateInvoice, useCustomers, useItems } from '@accountiva/api';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';
import { AddCustomerModal } from '../components/AddCustomerModal';

export interface LineItem {
  id: string;
  itemId?: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
}

interface CreateInvoiceScreenProps {
  onNavigate: (screen: ScreenType) => void;
  initialInvoice?: any;
  onDone?: () => void;
}

const formatDateToISO = (d: Date): string => {
  return d.toISOString().split('T')[0];
};

export function CreateInvoiceScreen({ onNavigate, initialInvoice, onDone }: CreateInvoiceScreenProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';

  const createInvoiceMutation = useCreateInvoice();
  const updateInvoiceMutation = useUpdateInvoice();

  const { data: apiCustomers, refetch: refetchCustomers } = useCustomers();
  const { data: apiItems } = useItems();

  const rawCustomers: any[] = useMemo(() => {
    if (Array.isArray(apiCustomers)) return apiCustomers;
    if (Array.isArray(apiCustomers?.data)) return apiCustomers.data;
    return [];
  }, [apiCustomers]);

  const rawItems: any[] = useMemo(() => {
    if (Array.isArray(apiItems)) return apiItems;
    if (Array.isArray(apiItems?.data)) return apiItems.data;
    return [];
  }, [apiItems]);

  // Form State
  const [customer, setCustomer] = useState(
    initialInvoice?.customer || initialInvoice?.customerName || initialInvoice?.customers?.name || ''
  );
  const [customerId, setCustomerId] = useState(
    initialInvoice?.customerId || initialInvoice?.customer_id || ''
  );
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [createCustomerModalOpen, setCreateCustomerModalOpen] = useState(false);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  const [invoiceNumber, setInvoiceNumber] = useState(
    initialInvoice?.number ||
      initialInvoice?.invoiceNumber ||
      `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );

  const [date, setDate] = useState(() => {
    if (initialInvoice?.date) {
      try {
        return formatDateToISO(new Date(initialInvoice.date));
      } catch {
        // fallback
      }
    }
    return formatDateToISO(new Date());
  });

  const [dueDate, setDueDate] = useState(() => {
    if (initialInvoice?.dueDate || initialInvoice?.due_date) {
      try {
        return formatDateToISO(new Date(initialInvoice.dueDate || initialInvoice.due_date));
      } catch {
        // fallback
      }
    }
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return formatDateToISO(d);
  });

  const [items, setItems] = useState<LineItem[]>(() => {
    if (Array.isArray(initialInvoice?.items) && initialInvoice.items.length > 0) {
      return initialInvoice.items.map((i: any, idx: number) => ({
        id: String(i.id || `init-${idx}`),
        itemId: i.itemId || i.item_id || undefined,
        name: i.name || i.itemName || i.description || 'Item',
        description: i.description || '',
        quantity: Number(i.quantity) || 1,
        rate: Number(i.rate) || 0,
      }));
    }
    return [];
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  }, [items]);

  const tax = subtotal * 0.18; // 18% GST standard
  const grandTotal = subtotal + tax;

  // Helper date preset updater
  const applyDueDays = (days: number) => {
    const d = new Date(date || new Date());
    d.setDate(d.getDate() + days);
    setDueDate(formatDateToISO(d));
    if (errors.dueDate) {
      setErrors((prev) => ({ ...prev, dueDate: '' }));
    }
  };

  const addItemFromCatalog = (catalogItem: any) => {
    const rate = Number(catalogItem.sellingPrice) || Number(catalogItem.unitPrice) || 0;
    const existingIndex = items.findIndex((i) => i.itemId === catalogItem.id);

    if (existingIndex > -1) {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex ? { ...it, quantity: it.quantity + 1 } : it
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random()}`,
          itemId: catalogItem.id,
          name: catalogItem.name || 'Catalog Item',
          description: catalogItem.description || '',
          quantity: 1,
          rate,
        },
      ]);
    }

    if (errors.items) {
      setErrors((prev) => ({ ...prev, items: '' }));
    }
    setItemModalOpen(false);
  };

  const addCustomItem = () => {
    const newItem: LineItem = {
      id: `custom-${Date.now()}`,
      name: '',
      quantity: 1,
      rate: 0,
    };
    setItems((prev) => [...prev, newItem]);
    if (errors.items) {
      setErrors((prev) => ({ ...prev, items: '' }));
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, qty) } : item))
    );
  };

  const updateRate = (id: string, newRate: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, rate: Math.max(0, newRate) } : item))
    );
  };

  const updateName = (id: string, name: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item))
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customer.trim() || !customerId) {
      newErrors.customer = 'Please select a customer';
    }

    if (!invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Invoice number is required';
    }

    if (!date.trim() || isNaN(new Date(date).getTime())) {
      newErrors.date = 'Valid issue date required (YYYY-MM-DD)';
    }

    if (!dueDate.trim() || isNaN(new Date(dueDate).getTime())) {
      newErrors.dueDate = 'Valid due date required (YYYY-MM-DD)';
    } else if (new Date(dueDate) < new Date(date)) {
      newErrors.dueDate = 'Due date cannot be before invoice date';
    }

    if (items.length === 0) {
      newErrors.items = 'Please add at least one line item';
    } else {
      const hasEmpty = items.some((i) => !i.name.trim() || i.rate < 0 || i.quantity <= 0);
      if (hasEmpty) {
        newErrors.items = 'Each item must have a name, positive quantity, and non-negative rate';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    setApiError(null);
    if (!validateForm()) return;

    const payload = {
      invoiceNumber: invoiceNumber.trim(),
      customerId,
      customerName: customer,
      date,
      dueDate,
      amount: grandTotal,
      subtotal,
      taxAmount: tax,
      taxPercent: 18,
      status: initialInvoice?.status || 'Draft',
      items: items.map((i) => ({
        itemId: i.itemId || undefined,
        itemName: i.name.trim(),
        description: i.description || undefined,
        quantity: Number(i.quantity) || 1,
        rate: Number(i.rate) || 0,
        amount: (Number(i.quantity) || 1) * (Number(i.rate) || 0),
      })),
    };

    try {
      if (initialInvoice?.id) {
        await updateInvoiceMutation.mutateAsync({
          id: initialInvoice.id,
          payload,
        });
      } else {
        await createInvoiceMutation.mutateAsync(payload);
      }
      handleClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save invoice. Please check all fields.';
      setApiError(msg);
    }
  };

  const handleClose = () => {
    if (onDone) {
      onDone();
    } else {
      onNavigate('invoices');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
          <X size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {initialInvoice ? 'Edit Invoice' : 'Create Invoice'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          {createInvoiceMutation.isPending || updateInvoiceMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* API Error Banner */}
        {apiError ? (
          <View style={[styles.apiErrorBanner, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive }]}>
            <AlertCircle size={16} color={colors.destructive} style={{ marginTop: 2 }} />
            <Text style={[styles.apiErrorText, { color: colors.destructive }]}>{apiError}</Text>
          </View>
        ) : null}

        {/* Customer Select Field */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Customer *</Text>
          <TouchableOpacity
            onPress={() => {
              setCustomerModalOpen(true);
              setErrors((prev) => ({ ...prev, customer: '' }));
            }}
            style={[
              styles.customerSelectBox,
              {
                backgroundColor: colors.card,
                borderColor: errors.customer ? colors.destructive : colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={[styles.selectIconWrap, { backgroundColor: colors.surfaceSubtle }]}>
                <Users size={16} color={colors.foreground} />
              </View>
              <Text
                style={[
                  styles.customerSelectText,
                  { color: customer ? colors.foreground : colors.mutedForeground },
                ]}
                numberOfLines={1}
              >
                {customer || 'Select a customer...'}
              </Text>
            </View>
            <ChevronDown size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          {errors.customer ? (
            <Text style={[styles.inlineError, { color: colors.destructive }]}>{errors.customer}</Text>
          ) : null}
        </View>

        {/* Invoice Number & Date Row */}
        <View style={styles.rowFields}>
          <View style={styles.halfField}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Invoice # *</Text>
            <TextInput
              value={invoiceNumber}
              onChangeText={(val) => {
                setInvoiceNumber(val);
                if (errors.invoiceNumber) setErrors((prev) => ({ ...prev, invoiceNumber: '' }));
              }}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.card,
                  borderColor: errors.invoiceNumber ? colors.destructive : colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="INV-0001"
              placeholderTextColor={colors.mutedForeground}
            />
            {errors.invoiceNumber ? (
              <Text style={[styles.inlineError, { color: colors.destructive }]}>{errors.invoiceNumber}</Text>
            ) : null}
          </View>

          <View style={styles.halfField}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Date (YYYY-MM-DD) *</Text>
            <TextInput
              value={date}
              onChangeText={(val) => {
                setDate(val);
                if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
              }}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.card,
                  borderColor: errors.date ? colors.destructive : colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
            />
            {errors.date ? (
              <Text style={[styles.inlineError, { color: colors.destructive }]}>{errors.date}</Text>
            ) : null}
          </View>
        </View>

        {/* Due Date & Presets */}
        <View style={styles.fieldGroup}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Due Date (YYYY-MM-DD) *</Text>
            {/* Quick Presets */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[
                { label: 'Today', days: 0 },
                { label: '+15d', days: 15 },
                { label: '+30d', days: 30 },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.label}
                  onPress={() => applyDueDays(chip.days)}
                  style={[styles.presetChip, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}
                >
                  <Text style={[styles.presetChipText, { color: colors.foreground }]}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput
            value={dueDate}
            onChangeText={(val) => {
              setDueDate(val);
              if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: '' }));
            }}
            style={[
              styles.textInput,
              {
                backgroundColor: colors.card,
                borderColor: errors.dueDate ? colors.destructive : colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.mutedForeground}
          />
          {errors.dueDate ? (
            <Text style={[styles.inlineError, { color: colors.destructive }]}>{errors.dueDate}</Text>
          ) : null}
        </View>

        {/* Line Items Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Line Items ({items.length}) *
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setItemModalOpen(true)}
              style={[styles.itemActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Package size={13} color={colors.primary} />
              <Text style={[styles.itemActionBtnText, { color: colors.primary }]}>From Catalog</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={addCustomItem}
              style={[styles.itemActionBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <Plus size={13} color={colors.primaryForeground} />
              <Text style={[styles.itemActionBtnText, { color: colors.primaryForeground }]}>Custom</Text>
            </TouchableOpacity>
          </View>
        </View>

        {errors.items ? (
          <Text style={[styles.inlineError, { color: colors.destructive }]}>{errors.items}</Text>
        ) : null}

        {/* Line Items List */}
        {items.length === 0 ? (
          <View style={[styles.emptyItemsContainer, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}>
            <Package size={32} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyItemsTitle, { color: colors.foreground }]}>No items added yet</Text>
            <Text style={[styles.emptyItemsSub, { color: colors.mutedForeground }]}>
              Select products from your catalog or enter custom line items.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => setItemModalOpen(true)}
                style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.emptyAddBtnText, { color: colors.primaryForeground }]}>+ Add From Catalog</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={addCustomItem}
                style={[styles.emptyAddBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={[styles.emptyAddBtnText, { color: colors.foreground }]}>+ Custom Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {items.map((item) => (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    {item.itemId ? (
                      <View>
                        <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                        <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>Catalog Product</Text>
                      </View>
                    ) : (
                      <TextInput
                        value={item.name}
                        onChangeText={(val) => updateName(item.id, val)}
                        placeholder="Item or service name..."
                        placeholderTextColor={colors.mutedForeground}
                        style={[
                          styles.itemNameInput,
                          {
                            backgroundColor: colors.surfaceSubtle,
                            borderColor: colors.border,
                            color: colors.foreground,
                          },
                        ]}
                      />
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeItem(item.id)} activeOpacity={0.7} style={styles.deleteBtn}>
                    <Trash2 size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

                <View style={styles.itemMathGrid}>
                  <View style={styles.mathCol}>
                    <Text style={[styles.mathLabel, { color: colors.mutedForeground }]}>Quantity</Text>
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
                    <Text style={[styles.mathLabel, { color: colors.mutedForeground }]}>Rate ({currency})</Text>
                    <TextInput
                      value={String(item.rate || '')}
                      onChangeText={(val) => updateRate(item.id, parseFloat(val) || 0)}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.mutedForeground}
                      style={[
                        styles.rateInput,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.border,
                          color: colors.foreground,
                        },
                      ]}
                    />
                  </View>

                  <View style={[styles.mathCol, { alignItems: 'flex-end' }]}>
                    <Text style={[styles.mathLabel, { color: colors.mutedForeground }]}>Amount</Text>
                    <Text style={[styles.mathValueBold, { color: colors.foreground }]}>
                      {formatCurrency(item.quantity * item.rate, currency)}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Calculation Summary Box */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {formatCurrency(subtotal, currency)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>GST (18%)</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {formatCurrency(tax, currency)}
            </Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Total Payable</Text>
            <Text style={[styles.grandTotalValue, { color: colors.foreground }]}>
              {formatCurrency(grandTotal, currency)}
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Customer Selection Modal */}
      <Modal visible={customerModalOpen} animationType="slide" transparent onRequestClose={() => setCustomerModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Customer</Text>
              <TouchableOpacity onPress={() => setCustomerModalOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Search Box & Quick Create Button */}
            <View style={styles.customerModalTopRow}>
              <View style={[styles.modalSearchBox, { backgroundColor: colors.background, borderColor: colors.border, flex: 1 }]}>
                <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Search customers..."
                  placeholderTextColor={colors.mutedForeground}
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  style={[styles.modalSearchInput, { color: colors.foreground }]}
                />
              </View>
              <TouchableOpacity
                onPress={() => setCreateCustomerModalOpen(true)}
                style={[styles.modalAddCustomerBtn, { backgroundColor: colors.primary }]}
              >
                <Plus size={16} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={rawCustomers.filter((c: any) =>
                (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
                (c.email || '').toLowerCase().includes(customerSearch.toLowerCase())
              )}
              keyExtractor={(item) => item.id || item.name}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setCustomer(item.name);
                    setCustomerId(item.id);
                    setCustomerModalOpen(false);
                    if (errors.customer) setErrors((prev) => ({ ...prev, customer: '' }));
                  }}
                  style={[styles.modalItemRow, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.modalItemLeft}>
                    <Users size={16} color={colors.foreground} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
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
                  {customerId === item.id ? <Check size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                  <Users size={28} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 13, fontFamily: fonts.semiBold, color: colors.foreground }}>
                    {customerSearch ? 'No matching customers found' : 'No customers yet'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCreateCustomerModalOpen(true)}
                    style={{ marginTop: 10 }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: colors.primary }}>
                      + Add New Customer
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Catalog Item Modal */}
      <Modal visible={itemModalOpen} animationType="slide" transparent onRequestClose={() => setItemModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Catalog Item</Text>
              <TouchableOpacity onPress={() => setItemModalOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalSearchBox, { backgroundColor: colors.background, borderColor: colors.border, marginHorizontal: 16, marginVertical: 12 }]}>
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
                    onPress={() => addItemFromCatalog(item)}
                    style={[styles.modalItemRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={styles.modalItemLeft}>
                      {item.type === 'Service' ? (
                        <Wrench size={16} color={colors.foreground} style={{ marginRight: 10 }} />
                      ) : (
                        <Package size={16} color={colors.foreground} style={{ marginRight: 10 }} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modalItemText, { color: colors.foreground }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.modalItemSub, { color: colors.mutedForeground }]}>
                          {item.type || 'Product'} • {formatCurrency(itemRate, currency)}
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
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Embedded Add Customer Modal */}
      <AddCustomerModal
        visible={createCustomerModalOpen}
        onClose={() => setCreateCustomerModalOpen(false)}
        onSuccess={() => {
          refetchCustomers();
          setCreateCustomerModalOpen(false);
        }}
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
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  formContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  apiErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  apiErrorText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    flex: 1,
    lineHeight: 18,
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
    gap: 6,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  itemActionBtnText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  emptyItemsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyItemsTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  emptyItemsSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  emptyAddBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    fontSize: 12,
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
    alignItems: 'center',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  itemNameInput: {
    fontSize: 13,
    fontFamily: fonts.medium,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  itemSub: {
    fontSize: 10,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
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
    paddingVertical: 4,
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
  rateInput: {
    height: 32,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    fontFamily: fonts.medium,
    minWidth: 80,
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
  customerModalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
  },
  modalAddCustomerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  inlineError: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
});

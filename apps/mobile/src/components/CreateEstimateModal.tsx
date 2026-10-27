import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Plus,
  Trash,
  Users,
  Package,
  Wrench,
  Search,
  Check,
  ChevronDown,
  CircleAlert,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card } from './ui/Card';
import {
  calculateDocumentTotals,
  formatCurrency,
  isDuplicateDocumentNumberError,
  type EstimateStatus,
} from '@accountiva/shared';
import {
  fetchNextEstimateNumber,
  useCreateEstimate,
  useUpdateEstimate,
  useCustomers,
  useItems,
} from '@accountiva/api';
import { fonts } from '../theme/typography';
import { AddCustomerModal } from './AddCustomerModal';
import { CustomFieldRenderer } from './ui/CustomFieldRenderer';
import { buildMobileEstimatePayload } from '../documents/payloads';

export interface EstimateLineItem {
  id: string;
  itemId?: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
}

interface CreateEstimateModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialEstimate?: any;
}

const formatDateToISO = (d: Date): string => {
  return d.toISOString().split('T')[0];
};

export function CreateEstimateModal({
  visible,
  onClose,
  onSuccess,
  initialEstimate,
}: CreateEstimateModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';

  const createEstimateMutation = useCreateEstimate();
  const updateEstimateMutation = useUpdateEstimate();

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

  const [customer, setCustomer] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [createCustomerModalOpen, setCreateCustomerModalOpen] = useState(false);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  const [estimateNumber, setEstimateNumber] = useState('');
  const [isNumberLoading, setIsNumberLoading] = useState(false);
  const [numberError, setNumberError] = useState<string | null>(null);
  const numberRequestRef = useRef(0);
  const [date, setDate] = useState(() => formatDateToISO(new Date()));
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatDateToISO(d);
  });

  const [items, setItems] = useState<EstimateLineItem[]>([]);
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [taxPercent, setTaxPercent] = useState('18');
  const [shippingCharges, setShippingCharges] = useState('');
  const [packagingCharges, setPackagingCharges] = useState('');
  const [adjustment, setAdjustment] = useState('');
  const [autoRoundOff, setAutoRoundOff] = useState(false);
  const [notes, setNotes] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const loadNextEstimateNumber = useCallback(async () => {
    const requestId = ++numberRequestRef.current;
    setIsNumberLoading(true);
    setNumberError(null);
    try {
      const nextNumber = await fetchNextEstimateNumber();
      if (numberRequestRef.current === requestId) {
        setEstimateNumber(nextNumber);
      }
      return nextNumber;
    } catch (error: any) {
      if (numberRequestRef.current === requestId) {
        setEstimateNumber('');
        setNumberError(
          error.response?.data?.error ||
            error.message ||
            'Could not load the next estimate number.',
        );
      }
      return null;
    } finally {
      if (numberRequestRef.current === requestId) {
        setIsNumberLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      numberRequestRef.current += 1;
      return;
    }

    if (initialEstimate) {
      numberRequestRef.current += 1;
      setIsNumberLoading(false);
      setNumberError(null);
      setCustomer(initialEstimate.customer || initialEstimate.customerName || initialEstimate.customers?.name || '');
      setCustomerId(initialEstimate.customerId || initialEstimate.customer_id || '');
      setEstimateNumber(initialEstimate.number || initialEstimate.estimateNumber || '');
      setDiscountValue(initialEstimate.discountValue != null ? String(initialEstimate.discountValue) : '');
      setDiscountType(initialEstimate.discountType === 'fixed' ? 'fixed' : 'percentage');
      setTaxPercent(initialEstimate.taxPercent != null ? String(initialEstimate.taxPercent) : '18');
      setShippingCharges(initialEstimate.shippingCharges != null ? String(initialEstimate.shippingCharges) : '');
      setPackagingCharges(initialEstimate.packagingCharges != null ? String(initialEstimate.packagingCharges) : '');
      setAdjustment(initialEstimate.adjustment != null ? String(initialEstimate.adjustment) : '');
      setNotes(initialEstimate.notes || '');
      setTermsConditions(initialEstimate.termsConditions || initialEstimate.terms || '');
      setCustomFields(initialEstimate.customFields || initialEstimate.custom_fields || {});

      if (initialEstimate.date) {
        try {
          setDate(formatDateToISO(new Date(initialEstimate.date)));
        } catch {
          setDate(formatDateToISO(new Date()));
        }
      } else {
        setDate(formatDateToISO(new Date()));
      }

      if (initialEstimate.expiryDate || initialEstimate.expiry_date) {
        try {
          setExpiryDate(formatDateToISO(new Date(initialEstimate.expiryDate || initialEstimate.expiry_date)));
        } catch {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          setExpiryDate(formatDateToISO(d));
        }
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        setExpiryDate(formatDateToISO(d));
      }

      if (Array.isArray(initialEstimate.items) && initialEstimate.items.length > 0) {
        setItems(
          initialEstimate.items.map((i: any, idx: number) => ({
            id: String(i.id || `init-${idx}`),
            itemId: i.itemId || i.item_id || undefined,
            name: i.name || i.itemName || i.description || 'Item',
            description: i.description || '',
            quantity: Number(i.quantity) || 1,
            rate: Number(i.rate) || 0,
          }))
        );
      } else {
        setItems([]);
      }
    } else {
      setCustomer('');
      setCustomerId('');
      setEstimateNumber('');
      setNumberError(null);
      setDate(formatDateToISO(new Date()));
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setExpiryDate(formatDateToISO(d));
      setDiscountValue('');
      setDiscountType('percentage');
      setTaxPercent('18');
      setShippingCharges('');
      setAdjustment('');
      setNotes('');
      setTermsConditions('');
      setCustomFields({});
      setItems([]);
      void loadNextEstimateNumber();
    }

    setErrors({});
    setApiError(null);
    return () => {
      numberRequestRef.current += 1;
    };
  }, [initialEstimate, visible, loadNextEstimateNumber]);

  // Calculations
  const totals = useMemo(() => {
    return calculateDocumentTotals({
      items,
      discountType,
      discountValue,
      taxPercent,
      shippingCharges,
      packagingCharges,
      adjustment,
      autoRoundOff,
    });
  }, [items, discountType, discountValue, taxPercent, shippingCharges, packagingCharges, adjustment, autoRoundOff]);

  const applyValidityDays = (days: number) => {
    const d = new Date(date || new Date());
    d.setDate(d.getDate() + days);
    setExpiryDate(formatDateToISO(d));
    if (errors.expiryDate) {
      setErrors((prev) => ({ ...prev, expiryDate: '' }));
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
    const newItem: EstimateLineItem = {
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

  const updateDescription = (id: string, description: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description } : item))
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customer.trim() || !customerId) {
      newErrors.customer = 'Please select a customer';
    }

    if (!estimateNumber.trim()) {
      newErrors.estimateNumber = 'Quote number is required';
    }

    if (!date.trim() || isNaN(new Date(date).getTime())) {
      newErrors.date = 'Valid date required (YYYY-MM-DD)';
    }

    if (!expiryDate.trim() || isNaN(new Date(expiryDate).getTime())) {
      newErrors.expiryDate = 'Valid expiry date required (YYYY-MM-DD)';
    } else if (new Date(expiryDate) < new Date(date)) {
      newErrors.expiryDate = 'Expiry date cannot be before estimate date';
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

    const rawStatus = String(initialEstimate?.status || 'Draft').toLowerCase();
    const status: EstimateStatus = rawStatus === 'sent'
      ? 'Sent'
      : rawStatus === 'accepted'
        ? 'Accepted'
        : rawStatus === 'declined'
          ? 'Declined'
          : rawStatus === 'invoiced'
            ? 'Invoiced'
            : 'Draft';

    let payload;
    try {
      payload = buildMobileEstimatePayload({
        estimateNumber,
        customerId,
        date,
        expiryDate,
        status,
        items,
        referenceNumber: initialEstimate?.referenceNumber,
        billingAddress: initialEstimate?.billingAddress,
        shippingAddress: initialEstimate?.shippingAddress,
        terms: initialEstimate?.terms,
        discountType,
        discountValue,
        shippingCharges,
        packagingCharges,
        adjustment,
        roundOff: totals.roundOff,
        autoRoundOff,
        taxPercent,
        notes,
        termsConditions,
        customFields,
      });
    } catch (error: any) {
      setApiError(error.message || 'Please correct the estimate details.');
      return;
    }

    try {
      if (initialEstimate?.id) {
        await updateEstimateMutation.mutateAsync({
          id: initialEstimate.id,
          payload,
        });
      } else {
        await createEstimateMutation.mutateAsync(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save quote. Please check all fields.';
      if (!initialEstimate?.id && isDuplicateDocumentNumberError(err)) {
        setApiError(`${msg} Your entries were kept while a fresh number is loaded.`);
        await loadNextEstimateNumber();
        return;
      }
      setApiError(msg);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {initialEstimate ? 'Edit Estimate' : 'New Estimate'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={
              createEstimateMutation.isPending ||
              updateEstimateMutation.isPending ||
              (!initialEstimate?.id && (isNumberLoading || !estimateNumber.trim()))
            }
            style={[
              styles.saveBtn,
              { backgroundColor: colors.primary },
              !initialEstimate?.id && (isNumberLoading || !estimateNumber.trim()) ? styles.disabledBtn : null,
            ]}
            activeOpacity={0.8}
          >
            {createEstimateMutation.isPending || updateEstimateMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* API Error Banner */}
          {apiError ? (
            <View style={[styles.apiErrorBanner, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive }]}>
              <CircleAlert size={16} color={colors.destructive} style={{ marginTop: 2 }} />
              <Text style={[styles.apiErrorText, { color: colors.destructive }]}>{apiError}</Text>
            </View>
          ) : null}

          {/* Customer Selection */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Customer *</Text>
            <TouchableOpacity
              onPress={() => {
                setCustomerModalOpen(true);
                setErrors((prev) => ({ ...prev, customer: '' }));
              }}
              style={[
                styles.selectBox,
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
                    styles.selectText,
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

          {/* Quote # & Date */}
          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Estimate # *</Text>
              <TextInput
                value={estimateNumber}
                onChangeText={(val) => {
                  setEstimateNumber(val);
                  if (errors.estimateNumber) setErrors((prev) => ({ ...prev, estimateNumber: '' }));
                }}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: errors.estimateNumber ? colors.destructive : colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="EST-0001"
                placeholderTextColor={colors.mutedForeground}
              />
              {errors.estimateNumber ? (
                <Text style={[styles.inlineError, { color: colors.destructive }]}>{errors.estimateNumber}</Text>
              ) : null}
              {!initialEstimate?.id && isNumberLoading ? (
                <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>Loading next number...</Text>
              ) : null}
              {!initialEstimate?.id && numberError ? (
                <View style={styles.numberErrorRow}>
                  <Text style={[styles.inlineError, { color: colors.destructive, flex: 1 }]}>{numberError}</Text>
                  <TouchableOpacity onPress={() => void loadNextEstimateNumber()} activeOpacity={0.7}>
                    <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
                  </TouchableOpacity>
                </View>
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
                  styles.input,
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

          {/* Validity / Expiry Date */}
          <View style={styles.fieldGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Expiry Date (YYYY-MM-DD) *</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[
                  { label: '15 Days', days: 15 },
                  { label: '30 Days', days: 30 },
                  { label: '60 Days', days: 60 },
                ].map((chip) => (
                  <TouchableOpacity
                    key={chip.label}
                    onPress={() => applyValidityDays(chip.days)}
                    style={[styles.presetChip, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}
                  >
                    <Text style={[styles.presetChipText, { color: colors.foreground }]}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TextInput
              value={expiryDate}
              onChangeText={(val) => {
                setExpiryDate(val);
                if (errors.expiryDate) setErrors((prev) => ({ ...prev, expiryDate: '' }));
              }}
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: errors.expiryDate ? colors.destructive : colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
            />
            {errors.expiryDate ? (
              <Text style={[styles.inlineError, { color: colors.destructive }]}>{errors.expiryDate}</Text>
            ) : null}
          </View>

          {/* Line Items Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Line Items ({items.length}) *
            </Text>
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
              <Text style={[styles.emptyItemsTitle, { color: colors.foreground }]}>No items in estimate</Text>
              <Text style={[styles.emptyItemsSub, { color: colors.mutedForeground }]}>
                Add catalog items or create custom quote rows.
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
                      <Trash size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    value={item.description || ''}
                    onChangeText={(value) => updateDescription(item.id, value)}
                    placeholder="Line-item description..."
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    style={[
                      styles.itemDescriptionInput,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                  />

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
                        numberOfLines={1}
                        multiline={false}
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

          {/* Calculations Summary */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {formatCurrency(totals.subtotal, currency)}
              </Text>
            </View>

            {/* Discount Row */}
            <View style={styles.summaryInputRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Discount</Text>
                <View style={[styles.discountToggle, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => setDiscountType('percentage')}
                    style={[
                      styles.discountToggleBtn,
                      discountType === 'percentage' && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.discountToggleText,
                        { color: discountType === 'percentage' ? colors.primaryForeground : colors.mutedForeground },
                      ]}
                    >
                      %
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDiscountType('fixed')}
                    style={[
                      styles.discountToggleBtn,
                      discountType === 'fixed' && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.discountToggleText,
                        { color: discountType === 'fixed' ? colors.primaryForeground : colors.mutedForeground },
                      ]}
                    >
                      ₹
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.summarySmallInput,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.foreground },
                  ]}
                />
                {totals.discountAmount > 0 ? (
                  <Text style={[styles.summaryDiscountSub, { color: colors.success }]}>
                    -{formatCurrency(totals.discountAmount, currency)}
                  </Text>
                ) : null}
              </View>
            </View>

            {totals.discountAmount > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Taxable Amount</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(totals.taxableAmount, currency)}
                </Text>
              </View>
            ) : null}

            {/* GST / Tax Row */}
            <View style={styles.summaryInputRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                GST ({totals.taxPercent}%)
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput
                  value={taxPercent}
                  onChangeText={setTaxPercent}
                  keyboardType="decimal-pad"
                  placeholder="18"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.summarySmallInput,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.foreground, width: 55 },
                  ]}
                />
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(totals.taxAmount, currency)}
                </Text>
              </View>
            </View>

            {/* Shipping Charges */}
            <View style={styles.summaryInputRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Shipping Charges</Text>
              <TextInput
                value={shippingCharges}
                onChangeText={setShippingCharges}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                numberOfLines={1}
                multiline={false}
                style={[
                  styles.summarySmallInput,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.foreground },
                ]}
              />
            </View>

            {/* Packaging / Packing Charges */}
            <View style={styles.summaryInputRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Packaging / Packing</Text>
              <TextInput
                value={packagingCharges}
                onChangeText={setPackagingCharges}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                numberOfLines={1}
                multiline={false}
                style={[
                  styles.summarySmallInput,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.foreground },
                ]}
              />
            </View>

            {/* Round Off / Adjustment */}
            <View style={styles.summaryInputRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Round Off</Text>
                <TouchableOpacity
                  onPress={() => setAutoRoundOff(!autoRoundOff)}
                  style={[
                    styles.autoRoundChip,
                    {
                      backgroundColor: autoRoundOff ? colors.primary : colors.surfaceSubtle,
                      borderColor: autoRoundOff ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.autoRoundChipText,
                      { color: autoRoundOff ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    Auto
                  </Text>
                </TouchableOpacity>
              </View>

              {autoRoundOff ? (
                <Text
                  style={[
                    styles.summaryValue,
                    { color: totals.roundOff < 0 ? colors.destructive : colors.foreground, fontFamily: fonts.medium },
                  ]}
                >
                  {totals.roundOff >= 0 ? `+${formatCurrency(totals.roundOff, currency)}` : `-${formatCurrency(Math.abs(totals.roundOff), currency)}`}
                </Text>
              ) : (
                <TextInput
                  value={adjustment}
                  onChangeText={setAdjustment}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  numberOfLines={1}
                  multiline={false}
                  style={[
                    styles.summarySmallInput,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.foreground },
                  ]}
                />
              )}
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

            <View style={styles.summaryRow}>
              <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Estimated Total</Text>
              <Text style={[styles.grandTotalValue, { color: colors.foreground }]}>
                {formatCurrency(totals.total, currency)}
              </Text>
            </View>
          </Card>

          {/* Notes & Terms */}
          <Card style={styles.notesCard}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notes / Remarks</Text>
              <TextInput
                placeholder="Estimate remarks or special instructions..."
                placeholderTextColor={colors.mutedForeground}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
                style={[
                  styles.textArea,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.foreground },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Terms & Conditions</Text>
              <TextInput
                placeholder="Estimate valid for 30 days..."
                placeholderTextColor={colors.mutedForeground}
                value={termsConditions}
                onChangeText={setTermsConditions}
                multiline
                numberOfLines={2}
                style={[
                  styles.textArea,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.foreground },
                ]}
              />
            </View>
          </Card>

          {/* Custom Fields */}
          <CustomFieldRenderer
            entity="estimate"
            values={customFields}
            onChange={setCustomFields}
          />
        </ScrollView>

        {/* Customer Modal */}
        <Modal visible={customerModalOpen} animationType="slide" transparent onRequestClose={() => setCustomerModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Customer</Text>
                <TouchableOpacity onPress={() => setCustomerModalOpen(false)}>
                  <X size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

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
      </SafeAreaView>
    </Modal>
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
  disabledBtn: {
    opacity: 0.55,
  },
  content: {
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
  fieldHint: {
    fontSize: 10,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  numberErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryText: {
    fontSize: 11,
    fontFamily: fonts.bold,
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
  selectText: {
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
  input: {
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
  itemDescriptionInput: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
    fontSize: 11,
    fontFamily: fonts.regular,
    textAlignVertical: 'top',
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
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 0,
    fontSize: 12,
    fontFamily: fonts.medium,
    minWidth: 80,
    textAlignVertical: 'center',
    includeFontPadding: false,
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
  summaryInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  discountToggle: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  discountToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountToggleText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  summarySmallInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 0,
    fontSize: 12,
    fontFamily: fonts.medium,
    minWidth: 70,
    textAlign: 'right',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  autoRoundChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  autoRoundChipText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
  },
  summaryDiscountSub: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  notesCard: {
    padding: 14,
    gap: 12,
    marginTop: 12,
  },
  textArea: {
    height: 64,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontFamily: fonts.regular,
    textAlignVertical: 'top',
  },
});

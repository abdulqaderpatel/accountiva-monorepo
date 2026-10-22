import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check,
  ChevronDown,
  FileText,
  Package,
  Plus,
  Search,
  Trash,
  Users,
  Wrench,
  X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  formatCurrency,
  isDuplicateDocumentNumberError,
  type CreditNoteStatus,
} from '@accountiva/shared';
import {
  fetchNextCreditNoteNumber,
  useCreateCreditNote,
  useCustomers,
  useInvoices,
  useItems,
  useUpdateCreditNote,
} from '@accountiva/api';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/FeedbackContext';
import { fonts } from '../theme/typography';
import { Card } from './ui/Card';
import { CustomFieldRenderer } from './ui/CustomFieldRenderer';
import { buildMobileCreditNotePayload } from '../documents/payloads';

interface CreditNoteLineItem {
  id: string;
  itemId?: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
}

interface CreateCreditNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCreditNote?: any;
}

const today = () => new Date().toISOString().split('T')[0];

export function CreateCreditNoteModal({
  visible,
  onClose,
  onSuccess,
  initialCreditNote,
}: CreateCreditNoteModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';
  const createMutation = useCreateCreditNote();
  const updateMutation = useUpdateCreditNote();
  const { data: apiCustomers } = useCustomers();
  const { data: apiItems } = useItems();
  const { data: apiInvoices } = useInvoices({ limit: 100 });

  const customers: any[] = useMemo(() => {
    if (Array.isArray(apiCustomers)) return apiCustomers;
    if (Array.isArray(apiCustomers?.data)) return apiCustomers.data;
    return [];
  }, [apiCustomers]);

  const catalogItems: any[] = useMemo(() => {
    if (Array.isArray(apiItems)) return apiItems;
    if (Array.isArray(apiItems?.data)) return apiItems.data;
    return [];
  }, [apiItems]);

  const invoices: any[] = useMemo(() => {
    if (Array.isArray(apiInvoices)) return apiInvoices;
    if (Array.isArray(apiInvoices?.data)) return apiInvoices.data;
    if (Array.isArray(apiInvoices?.invoices)) return apiInvoices.invoices;
    return [];
  }, [apiInvoices]);

  const [customer, setCustomer] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const [creditNoteNumber, setCreditNoteNumber] = useState('');
  const [isNumberLoading, setIsNumberLoading] = useState(false);
  const [numberError, setNumberError] = useState<string | null>(null);
  const numberRequestRef = useRef(0);
  const localItemSequence = useRef(0);
  const [date, setDate] = useState(today());
  const [referenceNumber, setReferenceNumber] = useState('');
  const [referenceInvoiceId, setReferenceInvoiceId] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [items, setItems] = useState<CreditNoteLineItem[]>([]);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [taxPercent, setTaxPercent] = useState('');
  const [adjustment, setAdjustment] = useState('');
  const [notes, setNotes] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const nextLocalItemId = useCallback(() => {
    localItemSequence.current += 1;
    return `credit-line-${localItemSequence.current}`;
  }, []);

  const loadNextNumber = useCallback(async () => {
    const requestId = ++numberRequestRef.current;
    setIsNumberLoading(true);
    setNumberError(null);
    try {
      const nextNumber = await fetchNextCreditNoteNumber();
      if (numberRequestRef.current === requestId) setCreditNoteNumber(nextNumber);
      return nextNumber;
    } catch (error: any) {
      if (numberRequestRef.current === requestId) {
        setCreditNoteNumber('');
        setNumberError(
          error.response?.data?.error ||
            error.message ||
            'Could not load the next credit note number.',
        );
      }
      return null;
    } finally {
      if (numberRequestRef.current === requestId) setIsNumberLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      numberRequestRef.current += 1;
      return;
    }

    if (initialCreditNote) {
      numberRequestRef.current += 1;
      setIsNumberLoading(false);
      setNumberError(null);
      setCustomer(
        initialCreditNote.customer ||
          initialCreditNote.customerName ||
          initialCreditNote.customers?.name ||
          '',
      );
      setCustomerId(initialCreditNote.customerId || initialCreditNote.customer_id || '');
      setCreditNoteNumber(initialCreditNote.creditNoteNumber || initialCreditNote.number || '');
      setDate(initialCreditNote.date || today());
      setReferenceNumber(initialCreditNote.referenceNumber || '');
      setReferenceInvoiceId(initialCreditNote.referenceInvoiceId || '');
      setBillingAddress(initialCreditNote.billingAddress || '');
      setShippingAddress(initialCreditNote.shippingAddress || '');
      setDiscountType(initialCreditNote.discountType === 'fixed' ? 'fixed' : 'percentage');
      setDiscountValue(initialCreditNote.discountValue != null ? String(initialCreditNote.discountValue) : '');
      setTaxPercent(initialCreditNote.taxPercent != null ? String(initialCreditNote.taxPercent) : '');
      setAdjustment(initialCreditNote.adjustment != null ? String(initialCreditNote.adjustment) : '');
      setNotes(initialCreditNote.notes || initialCreditNote.reason || '');
      setTermsConditions(initialCreditNote.termsConditions || '');
      setCustomFields(initialCreditNote.customFields || initialCreditNote.custom_fields || {});
      setItems(
        Array.isArray(initialCreditNote.items)
          ? initialCreditNote.items.map((item: any) => ({
              id: String(item.id || nextLocalItemId()),
              itemId: item.itemId || item.item_id || undefined,
              name: item.name || item.itemName || '',
              description: item.description || '',
              quantity: Number(item.quantity) || 1,
              rate: Number(item.rate) || 0,
            }))
          : [],
      );
    } else {
      localItemSequence.current = 0;
      setCustomer('');
      setCustomerId('');
      setCreditNoteNumber('');
      setNumberError(null);
      setDate(today());
      setReferenceNumber('');
      setReferenceInvoiceId('');
      setBillingAddress('');
      setShippingAddress('');
      setItems([]);
      setDiscountType('percentage');
      setDiscountValue('');
      setTaxPercent('');
      setAdjustment('');
      setNotes('');
      setTermsConditions('');
      setCustomFields({});
      void loadNextNumber();
    }

    setCustomerSearch('');
    setItemSearch('');
    setErrors({});
    setApiError(null);
    return () => {
      numberRequestRef.current += 1;
    };
  }, [initialCreditNote, loadNextNumber, nextLocalItemId, visible]);

  const customerInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.customerId === customerId),
    [customerId, invoices],
  );
  const selectedInvoice = customerInvoices.find((invoice) => invoice.id === referenceInvoiceId);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.rate, 0),
    [items],
  );
  const numericDiscount = Math.max(0, Number(discountValue) || 0);
  const discountAmount = discountType === 'percentage'
    ? subtotal * (numericDiscount / 100)
    : Math.min(numericDiscount, subtotal);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableAmount * (Math.max(0, Number(taxPercent) || 0) / 100);
  const total = Math.max(0, taxableAmount + taxAmount + (Number(adjustment) || 0));

  const selectCustomer = (selected: any) => {
    setCustomer(selected.name || 'Customer');
    setCustomerId(selected.id || '');
    setBillingAddress(selected.billingAddress || selected.address || '');
    setReferenceInvoiceId('');
    setCustomerModalOpen(false);
    setErrors((previous) => ({ ...previous, customer: '' }));
  };

  const addCatalogItem = (catalogItem: any) => {
    const rate = Number(catalogItem.sellingPrice) || Number(catalogItem.unitPrice) || 0;
    setItems((previous) => [
      ...previous,
      {
        id: nextLocalItemId(),
        itemId: catalogItem.id,
        name: catalogItem.name || 'Catalog Item',
        description: catalogItem.description || '',
        quantity: 1,
        rate,
      },
    ]);
    setErrors((previous) => ({ ...previous, items: '' }));
    setItemModalOpen(false);
  };

  const addCustomItem = () => {
    setItems((previous) => [
      ...previous,
      { id: nextLocalItemId(), name: '', description: '', quantity: 1, rate: 0 },
    ]);
    setErrors((previous) => ({ ...previous, items: '' }));
  };

  const updateItem = (id: string, itemPatch: Partial<CreditNoteLineItem>) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...itemPatch } : item)),
    );
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!customerId) nextErrors.customer = 'Please select a customer';
    if (!creditNoteNumber.trim()) nextErrors.creditNoteNumber = 'Credit note number is required';
    if (!date.trim() || Number.isNaN(Date.parse(date))) nextErrors.date = 'Enter a valid date (YYYY-MM-DD)';
    if (items.length === 0) nextErrors.items = 'Add at least one line item';
    if (items.some((item) => !item.name.trim() || item.quantity <= 0 || item.rate < 0)) {
      nextErrors.items = 'Each item needs a name, positive quantity, and non-negative rate';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async (nextStatus: Extract<CreditNoteStatus, 'Draft' | 'Open'>) => {
    setApiError(null);
    if (!validateForm()) return;

    let payload;
    try {
      payload = buildMobileCreditNotePayload({
        creditNoteNumber,
        customerId,
        date,
        status: nextStatus,
        items,
        referenceNumber,
        referenceInvoiceId,
        billingAddress,
        shippingAddress,
        discountType,
        discountValue,
        adjustment,
        taxPercent,
        notes,
        termsConditions,
        customFields,
      });
    } catch (error: any) {
      setApiError(error.message || 'Please correct the credit note details.');
      return;
    }

    try {
      if (initialCreditNote?.id) {
        await updateMutation.mutateAsync({ id: initialCreditNote.id, payload });
        toast.success('Credit Note Updated', `${creditNoteNumber} was updated successfully.`);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(
          nextStatus === 'Open' ? 'Credit Note Opened' : 'Draft Saved',
          `${creditNoteNumber} was saved successfully.`,
        );
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to save credit note.';
      if (!initialCreditNote?.id && isDuplicateDocumentNumberError(error)) {
        setApiError(`${message} Your entries were kept while a fresh number is loaded.`);
        await loadNextNumber();
        return;
      }
      setApiError(message);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isNumberUnresolved = !initialCreditNote?.id && (isNumberLoading || !creditNoteNumber.trim());

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton} activeOpacity={0.7}>
            <X size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {initialCreditNote?.id ? 'Edit Credit Note' : 'New Credit Note'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {apiError ? (
            <View style={[styles.errorBanner, { borderColor: colors.destructive, backgroundColor: colors.card }]}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>{apiError}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Customer *</Text>
            <TouchableOpacity
              onPress={() => setCustomerModalOpen(true)}
              style={[styles.selectBox, { backgroundColor: colors.card, borderColor: errors.customer ? colors.destructive : colors.border }]}
              activeOpacity={0.7}
            >
              <View style={styles.selectContent}>
                <View style={[styles.selectIcon, { backgroundColor: colors.surfaceSubtle }]}>
                  <Users size={16} color={colors.foreground} />
                </View>
                <Text style={[styles.selectText, { color: customer ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                  {customer || 'Select a customer...'}
                </Text>
              </View>
              <ChevronDown size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            {errors.customer ? <Text style={[styles.inlineError, { color: colors.destructive }]}>{errors.customer}</Text> : null}
          </View>

          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Credit Note # *</Text>
              <TextInput
                value={creditNoteNumber}
                onChangeText={setCreditNoteNumber}
                placeholder="CN-0001"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.card, borderColor: errors.creditNoteNumber ? colors.destructive : colors.border, color: colors.foreground }]}
              />
              {!initialCreditNote?.id && isNumberLoading ? <Text style={[styles.hint, { color: colors.mutedForeground }]}>Loading next number...</Text> : null}
              {!initialCreditNote?.id && numberError ? (
                <View style={styles.retryRow}>
                  <Text style={[styles.inlineError, { color: colors.destructive, flex: 1 }]}>{numberError}</Text>
                  <TouchableOpacity onPress={() => void loadNextNumber()}>
                    <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Date (YYYY-MM-DD) *</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.card, borderColor: errors.date ? colors.destructive : colors.border, color: colors.foreground }]}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Reference Number</Text>
            <TextInput
              value={referenceNumber}
              onChangeText={setReferenceNumber}
              placeholder="Optional return or authorization reference"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Reference Invoice</Text>
            <TouchableOpacity
              onPress={() => customerId && setInvoiceModalOpen(true)}
              disabled={!customerId}
              style={[styles.selectBox, { backgroundColor: colors.card, borderColor: colors.border, opacity: customerId ? 1 : 0.55 }]}
            >
              <View style={styles.selectContent}>
                <FileText size={16} color={colors.foreground} />
                <Text style={[styles.selectText, { color: selectedInvoice ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                  {selectedInvoice?.invoiceNumber || (customerId ? 'Select an invoice (optional)' : 'Select a customer first')}
                </Text>
              </View>
              <ChevronDown size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Line Items ({items.length}) *</Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity onPress={() => setItemModalOpen(true)} style={[styles.smallButton, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Package size={13} color={colors.primary} />
                <Text style={[styles.smallButtonText, { color: colors.primary }]}>Catalog</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addCustomItem} style={[styles.smallButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <Plus size={13} color={colors.primaryForeground} />
                <Text style={[styles.smallButtonText, { color: colors.primaryForeground }]}>Custom</Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.items ? <Text style={[styles.inlineError, { color: colors.destructive }]}>{errors.items}</Text> : null}

          {items.length === 0 ? (
            <View style={[styles.emptyItems, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Package size={30} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No credit items yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Add returned products, services, or a custom adjustment line.</Text>
            </View>
          ) : (
            <View style={styles.itemList}>
              {items.map((item) => (
                <Card key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      {item.itemId ? (
                        <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                      ) : (
                        <TextInput
                          value={item.name}
                          onChangeText={(name) => updateItem(item.id, { name })}
                          placeholder="Item or service name..."
                          placeholderTextColor={colors.mutedForeground}
                          style={[styles.itemNameInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.foreground }]}
                        />
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setItems((previous) => previous.filter((candidate) => candidate.id !== item.id))}>
                      <Trash size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    value={item.description || ''}
                    onChangeText={(description) => updateItem(item.id, { description })}
                    placeholder="Line-item description..."
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    style={[styles.descriptionInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.foreground }]}
                  />
                  <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.itemMathRow}>
                    <View style={styles.mathColumn}>
                      <Text style={[styles.mathLabel, { color: colors.mutedForeground }]}>Quantity</Text>
                      <View style={[styles.quantityControl, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}>
                        <TouchableOpacity onPress={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })} style={styles.quantityButton}>
                          <Text style={[styles.quantityText, { color: colors.foreground }]}>−</Text>
                        </TouchableOpacity>
                        <Text style={[styles.quantityValue, { color: colors.foreground }]}>{item.quantity}</Text>
                        <TouchableOpacity onPress={() => updateItem(item.id, { quantity: item.quantity + 1 })} style={styles.quantityButton}>
                          <Text style={[styles.quantityText, { color: colors.foreground }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.mathColumn}>
                      <Text style={[styles.mathLabel, { color: colors.mutedForeground }]}>Rate</Text>
                      <TextInput
                        value={item.rate ? String(item.rate) : ''}
                        onChangeText={(value) => updateItem(item.id, { rate: Math.max(0, Number(value) || 0) })}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={colors.mutedForeground}
                        style={[styles.rateInput, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle, color: colors.foreground }]}
                      />
                    </View>
                    <View style={[styles.mathColumn, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.mathLabel, { color: colors.mutedForeground }]}>Amount</Text>
                      <Text style={[styles.itemAmount, { color: colors.foreground }]}>{formatCurrency(item.quantity * item.rate, currency)}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatCurrency(subtotal, currency)}</Text>
            </View>
            <View style={styles.summaryInputRow}>
              <View style={styles.discountLabelRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Discount</Text>
                <View style={[styles.toggle, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}>
                  {(['percentage', 'fixed'] as const).map((type) => (
                    <TouchableOpacity key={type} onPress={() => setDiscountType(type)} style={[styles.toggleButton, discountType === type ? { backgroundColor: colors.primary } : null]}>
                      <Text style={[styles.toggleText, { color: discountType === type ? colors.primaryForeground : colors.mutedForeground }]}>{type === 'percentage' ? '%' : currency}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TextInput value={discountValue} onChangeText={setDiscountValue} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.mutedForeground} style={[styles.smallInput, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle, color: colors.foreground }]} />
            </View>
            <View style={styles.summaryInputRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Tax %</Text>
              <TextInput value={taxPercent} onChangeText={setTaxPercent} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.mutedForeground} style={[styles.smallInput, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle, color: colors.foreground }]} />
            </View>
            <View style={styles.summaryInputRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Adjustment</Text>
              <TextInput value={adjustment} onChangeText={setAdjustment} keyboardType="numbers-and-punctuation" placeholder="0" placeholderTextColor={colors.mutedForeground} style={[styles.smallInput, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle, color: colors.foreground }]} />
            </View>
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>Credit Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(total, currency)}</Text>
            </View>
          </Card>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Reason / Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Reason for the credit or returned goods..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            />
          </View>

          <CustomFieldRenderer entity="credit_note" values={customFields} onChange={setCustomFields} />

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => void handleSave('Draft')}
              disabled={isSaving || isNumberUnresolved}
              style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.card }, isSaving || isNumberUnresolved ? styles.disabled : null]}
            >
              <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Save Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleSave('Open')}
              disabled={isSaving || isNumberUnresolved}
              style={[styles.primaryAction, { backgroundColor: colors.primary }, isSaving || isNumberUnresolved ? styles.disabled : null]}
            >
              {isSaving ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>{initialCreditNote?.id ? 'Update & Open' : 'Save & Open'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal visible={customerModalOpen} animationType="slide" transparent onRequestClose={() => setCustomerModalOpen(false)}>
          <PickerSheet title="Select Customer" onClose={() => setCustomerModalOpen(false)} colors={colors} search={customerSearch} onSearch={setCustomerSearch}>
            <FlatList
              data={customers.filter((candidate) => (candidate.name || '').toLowerCase().includes(customerSearch.toLowerCase()))}
              keyExtractor={(item) => item.id || item.name}
              contentContainerStyle={styles.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => selectCustomer(item)} style={[styles.pickerRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.selectContent}><Users size={16} color={colors.foreground} /><Text style={[styles.pickerText, { color: colors.foreground }]}>{item.name}</Text></View>
                  {customerId === item.id ? <Check size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              )}
            />
          </PickerSheet>
        </Modal>

        <Modal visible={itemModalOpen} animationType="slide" transparent onRequestClose={() => setItemModalOpen(false)}>
          <PickerSheet title="Add Catalog Item" onClose={() => setItemModalOpen(false)} colors={colors} search={itemSearch} onSearch={setItemSearch}>
            <FlatList
              data={catalogItems.filter((candidate) => (candidate.name || '').toLowerCase().includes(itemSearch.toLowerCase()) || (candidate.sku || '').toLowerCase().includes(itemSearch.toLowerCase()))}
              keyExtractor={(item) => item.id || item.name}
              contentContainerStyle={styles.pickerList}
              renderItem={({ item }) => {
                const rate = Number(item.sellingPrice) || Number(item.unitPrice) || 0;
                return (
                  <TouchableOpacity onPress={() => addCatalogItem(item)} style={[styles.pickerRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.selectContent}>
                      {item.type === 'Service' ? <Wrench size={16} color={colors.foreground} /> : <Package size={16} color={colors.foreground} />}
                      <View><Text style={[styles.pickerText, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.pickerSubtext, { color: colors.mutedForeground }]}>{formatCurrency(rate, currency)}</Text></View>
                    </View>
                    <Plus size={16} color={colors.primary} />
                  </TouchableOpacity>
                );
              }}
            />
          </PickerSheet>
        </Modal>

        <Modal visible={invoiceModalOpen} animationType="slide" transparent onRequestClose={() => setInvoiceModalOpen(false)}>
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}><Text style={[styles.pickerTitle, { color: colors.foreground }]}>Reference Invoice</Text><TouchableOpacity onPress={() => setInvoiceModalOpen(false)}><X size={20} color={colors.mutedForeground} /></TouchableOpacity></View>
              <FlatList
                data={customerInvoices}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.pickerList}
                ListHeaderComponent={referenceInvoiceId ? <TouchableOpacity onPress={() => { setReferenceInvoiceId(''); setInvoiceModalOpen(false); }} style={[styles.pickerRow, { borderBottomColor: colors.border }]}><Text style={[styles.pickerText, { color: colors.mutedForeground }]}>Clear reference</Text></TouchableOpacity> : null}
                ListEmptyComponent={<View style={styles.emptyPicker}><Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>No invoices found for this customer.</Text></View>}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => { setReferenceInvoiceId(item.id); setInvoiceModalOpen(false); }} style={[styles.pickerRow, { borderBottomColor: colors.border }]}>
                    <View><Text style={[styles.pickerText, { color: colors.foreground }]}>{item.invoiceNumber || 'Invoice'}</Text><Text style={[styles.pickerSubtext, { color: colors.mutedForeground }]}>{formatCurrency(Number(item.amount) || 0, currency)}</Text></View>
                    {referenceInvoiceId === item.id ? <Check size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

function PickerSheet({ title, onClose, colors, search, onSearch, children }: { title: string; onClose: () => void; colors: any; search: string; onSearch: (value: string) => void; children: React.ReactNode }) {
  return (
    <View style={styles.pickerOverlay}>
      <View style={[styles.pickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}><Text style={[styles.pickerTitle, { color: colors.foreground }]}>{title}</Text><TouchableOpacity onPress={onClose}><X size={20} color={colors.mutedForeground} /></TouchableOpacity></View>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}><Search size={16} color={colors.mutedForeground} /><TextInput value={search} onChangeText={onSearch} placeholder="Search..." placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} /></View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  iconButton: { padding: 6 },
  headerTitle: { fontSize: 15, fontFamily: fonts.display, fontWeight: '700' },
  headerSpacer: { width: 32 },
  content: { padding: 16, paddingBottom: 42, gap: 14 },
  errorBanner: { borderWidth: 1, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, fontFamily: fonts.medium },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 11, fontFamily: fonts.semiBold, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  selectContent: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  selectIcon: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  selectText: { flex: 1, fontSize: 13, fontFamily: fonts.medium },
  rowFields: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1, gap: 6 },
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 13, fontFamily: fonts.regular },
  hint: { fontSize: 10, fontFamily: fonts.regular },
  inlineError: { fontSize: 10, fontFamily: fonts.medium },
  retryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  retryText: { fontSize: 11, fontFamily: fonts.bold },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionActions: { flexDirection: 'row', gap: 8 },
  smallButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  smallButtonText: { fontSize: 11, fontFamily: fonts.semiBold },
  emptyItems: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 24, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 13, fontFamily: fonts.semiBold },
  emptySubtitle: { fontSize: 11, fontFamily: fonts.regular, textAlign: 'center' },
  itemList: { gap: 10 },
  itemCard: { padding: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 13, fontFamily: fonts.semiBold },
  itemNameInput: { height: 38, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: 12, fontFamily: fonts.medium },
  descriptionInput: { minHeight: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10, fontSize: 11, fontFamily: fonts.regular, textAlignVertical: 'top' },
  itemDivider: { height: 1, marginVertical: 10 },
  itemMathRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  mathColumn: { flex: 1, gap: 5 },
  mathLabel: { fontSize: 10, fontFamily: fonts.semiBold, textTransform: 'uppercase' },
  quantityControl: { height: 36, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quantityButton: { paddingHorizontal: 10, height: '100%', justifyContent: 'center' },
  quantityText: { fontSize: 16, fontFamily: fonts.semiBold },
  quantityValue: { fontSize: 12, fontFamily: fonts.semiBold },
  rateInput: { height: 36, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, fontSize: 12, fontFamily: fonts.medium },
  itemAmount: { fontSize: 12, fontFamily: fonts.bold, minHeight: 36, textAlignVertical: 'center' },
  summaryCard: { padding: 14, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryInputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, fontFamily: fonts.regular },
  summaryValue: { fontSize: 12, fontFamily: fonts.semiBold },
  discountLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggle: { flexDirection: 'row', borderWidth: 1, borderRadius: 7, overflow: 'hidden' },
  toggleButton: { minWidth: 28, height: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  toggleText: { fontSize: 10, fontFamily: fonts.bold },
  smallInput: { width: 92, height: 34, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, textAlign: 'right', fontSize: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10 },
  totalLabel: { fontSize: 14, fontFamily: fonts.bold },
  totalValue: { fontSize: 17, fontFamily: fonts.bold },
  textArea: { minHeight: 86, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: fonts.regular, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondaryAction: { flex: 1, height: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { fontSize: 12, fontFamily: fonts.semiBold },
  primaryAction: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { fontSize: 12, fontFamily: fonts.bold },
  disabled: { opacity: 0.55 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  pickerSheet: { maxHeight: '78%', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, paddingBottom: 24 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  pickerTitle: { fontSize: 15, fontFamily: fonts.bold },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, margin: 16, height: 38, paddingHorizontal: 10 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: fonts.regular },
  pickerList: { paddingHorizontal: 16, paddingBottom: 24 },
  pickerRow: { minHeight: 50, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
  pickerText: { fontSize: 13, fontFamily: fonts.semiBold },
  pickerSubtext: { fontSize: 10, fontFamily: fonts.regular, marginTop: 2 },
  emptyPicker: { padding: 28, alignItems: 'center' },
});

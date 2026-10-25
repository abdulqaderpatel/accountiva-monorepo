import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  FileText,
  Plus,
  Trash2,
  Building2,
  ChevronDown,
  CircleAlert,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/FeedbackContext';
import { fonts } from '../theme/typography';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import api from '@accountiva/api';

interface BillLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
}

interface CreateBillModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBill?: any;
  preselectedVendor?: any;
}

const today = () => new Date().toISOString().split('T')[0];
const in30Days = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

export function CreateBillModal({
  visible,
  onClose,
  onSuccess,
  initialBill,
  preselectedVendor,
}: CreateBillModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';

  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);

  const [billNumber, setBillNumber] = useState('BILL-001');
  const [date, setDate] = useState(today());
  const [dueDate, setDueDate] = useState(in30Days());
  const [referenceNumber, setReferenceNumber] = useState('');
  const [taxPercent, setTaxPercent] = useState('18');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<BillLineItem[]>([
    { id: '1', name: '', quantity: 1, rate: 0 },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch vendors and next bill number
  useEffect(() => {
    if (visible) {
      api.get('/vendors').then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setVendors(list);

        if (preselectedVendor) {
          setSelectedVendor(preselectedVendor);
        }
      }).catch(() => {});

      if (!initialBill) {
        api.get(`/bills/next-number?t=${Date.now()}`).then((res) => {
          if (res.data?.nextNumber) setBillNumber(res.data.nextNumber);
        }).catch(() => {});
      }
    }
  }, [visible, preselectedVendor, initialBill]);

  useEffect(() => {
    if (initialBill) {
      setBillNumber(initialBill.billNumber || initialBill.number || 'BILL-001');
      setDate(initialBill.date || today());
      setDueDate(initialBill.dueDate || in30Days());
      setReferenceNumber(initialBill.referenceNumber || '');
      setTaxPercent(initialBill.taxPercent != null ? String(initialBill.taxPercent) : '18');
      setNotes(initialBill.notes || '');

      if (initialBill.vendor) {
        setSelectedVendor(initialBill.vendor);
      }

      if (Array.isArray(initialBill.items) && initialBill.items.length > 0) {
        setItems(
          initialBill.items.map((it: any, idx: number) => ({
            id: String(it.id || idx),
            name: it.name || it.itemName || '',
            description: it.description || '',
            quantity: Number(it.quantity) || 1,
            rate: Number(it.rate) || 0,
          }))
        );
      }
    } else {
      if (!preselectedVendor) setSelectedVendor(null);
      setDate(today());
      setDueDate(in30Days());
      setReferenceNumber('');
      setTaxPercent('18');
      setNotes('');
      setItems([{ id: '1', name: '', quantity: 1, rate: 0 }]);
    }
    setApiError(null);
  }, [initialBill, visible, preselectedVendor]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || 0), 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    const rate = parseFloat(taxPercent) || 0;
    return (subtotal * rate) / 100;
  }, [subtotal, taxPercent]);

  const total = subtotal + taxAmount;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: String(Date.now()), name: '', quantity: 1, rate: 0 },
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof BillLineItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    if (!selectedVendor?.id) {
      setApiError('Please select a vendor for this bill.');
      return;
    }

    if (!billNumber.trim()) {
      setApiError('Bill number is required.');
      return;
    }

    const validItems = items.filter((i) => i.name.trim());
    if (validItems.length === 0) {
      setApiError('Please add at least one line item with a description.');
      return;
    }

    try {
      setIsSaving(true);
      setApiError(null);

      const payload = {
        vendorId: selectedVendor.id,
        billNumber: billNumber.trim(),
        date: date.trim() || today(),
        dueDate: dueDate.trim() || in30Days(),
        referenceNumber: referenceNumber.trim() || undefined,
        items: validItems.map((it) => ({
          name: it.name.trim(),
          description: it.description?.trim() || undefined,
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0,
          amount: (Number(it.quantity) || 1) * (Number(it.rate) || 0),
        })),
        subtotal,
        taxPercent: parseFloat(taxPercent) || 0,
        taxAmount,
        amount: total,
        notes: notes.trim() || undefined,
      };

      if (initialBill?.id) {
        await api.patch(`/bills/${initialBill.id}`, payload);
        toast.success('Bill Updated', `Bill ${billNumber} has been updated.`);
      } else {
        await api.post('/bills', payload);
        toast.success('Bill Recorded', `Bill ${billNumber} has been recorded.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setApiError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to record bill.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color={colors.primary} />
              <Text style={[styles.title, { color: colors.foreground }]}>
                {initialBill ? 'Edit Bill' : 'Record Vendor Bill'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {apiError ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive }]}>
                <CircleAlert size={16} color={colors.destructive} style={{ marginTop: 2 }} />
                <Text style={[styles.errorBannerText, { color: colors.destructive }]}>{apiError}</Text>
              </View>
            ) : null}

            {/* Vendor Picker */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Vendor / Supplier *</Text>
              <TouchableOpacity
                onPress={() => setVendorPickerOpen(true)}
                style={[styles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Building2 size={16} color={selectedVendor ? colors.primary : colors.mutedForeground} />
                  <Text
                    style={[
                      styles.pickerText,
                      { color: selectedVendor ? colors.foreground : colors.mutedForeground },
                    ]}
                  >
                    {selectedVendor ? selectedVendor.name : 'Select a vendor...'}
                  </Text>
                </View>
                <ChevronDown size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Bill # & Ref # */}
            <View style={styles.twoColRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Bill Number *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="BILL-001"
                  placeholderTextColor={colors.mutedForeground}
                  value={billNumber}
                  onChangeText={setBillNumber}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Vendor Ref / Inv #</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="e.g. INV-8821"
                  placeholderTextColor={colors.mutedForeground}
                  value={referenceNumber}
                  onChangeText={setReferenceNumber}
                />
              </View>
            </View>

            {/* Dates */}
            <View style={styles.twoColRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Bill Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  value={date}
                  onChangeText={setDate}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Due Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>
            </View>

            {/* Line Items */}
            <View style={{ marginTop: 6 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Line Items</Text>
                <TouchableOpacity onPress={handleAddItem} activeOpacity={0.7}>
                  <Text style={[styles.addItemLink, { color: colors.primary }]}>+ Add Line</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 10 }}>
                {items.map((item, idx) => (
                  <Card key={item.id} style={styles.itemCard}>
                    <View style={styles.itemCardHeader}>
                      <Text style={[styles.itemIdx, { color: colors.mutedForeground }]}>#{idx + 1}</Text>
                      {items.length > 1 ? (
                        <TouchableOpacity onPress={() => handleRemoveItem(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Trash2 size={15} color={colors.destructive} />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="Item name / Product or Service description *"
                      placeholderTextColor={colors.mutedForeground}
                      value={item.name}
                      onChangeText={(val) => handleUpdateItem(item.id, 'name', val)}
                    />

                    <View style={styles.twoColRow}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Qty</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.foreground }]}
                          placeholder="1"
                          placeholderTextColor={colors.mutedForeground}
                          value={String(item.quantity)}
                          onChangeText={(val) => handleUpdateItem(item.id, 'quantity', parseFloat(val) || 0)}
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Rate ({currency})</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.foreground }]}
                          placeholder="0.00"
                          placeholderTextColor={colors.mutedForeground}
                          value={String(item.rate)}
                          onChangeText={(val) => handleUpdateItem(item.id, 'rate', parseFloat(val) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            </View>

            {/* Financial Summary */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(subtotal, currency)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  GST Rate ({taxPercent}%)
                </Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(taxAmount, currency)}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryRow}>
                <Text style={[styles.grandLabel, { color: colors.foreground }]}>Total Payables</Text>
                <Text style={[styles.grandValue, { color: colors.foreground }]}>
                  {formatCurrency(total, currency)}
                </Text>
              </View>
            </Card>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Notes</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="Payment instructions or internal notes..."
                placeholderTextColor={colors.mutedForeground}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                  {initialBill ? 'Update Bill' : 'Record Bill'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Vendor Picker Modal */}
      <Modal visible={vendorPickerOpen} animationType="slide" transparent onRequestClose={() => setVendorPickerOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.foreground }]}>Select Vendor</Text>
              <TouchableOpacity onPress={() => setVendorPickerOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
              {vendors.length === 0 ? (
                <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginVertical: 20 }}>
                  No vendors found. Please add a vendor first.
                </Text>
              ) : (
                vendors.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => {
                      setSelectedVendor(v);
                      setVendorPickerOpen(false);
                    }}
                    style={[
                      styles.vendorItem,
                      {
                        backgroundColor: selectedVendor?.id === v.id ? colors.primary + '18' : colors.card,
                        borderColor: selectedVendor?.id === v.id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Building2 size={16} color={selectedVendor?.id === v.id ? colors.primary : colors.foreground} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.vendorItemName, { color: colors.foreground }]}>{v.name}</Text>
                      {v.company ? <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{v.company}</Text> : null}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    maxHeight: '90%',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '60%',
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
  content: {
    padding: 16,
    gap: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorBannerText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    flex: 1,
    lineHeight: 18,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  miniLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  pickerText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
  },
  addItemLink: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  itemCard: {
    padding: 12,
    gap: 8,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemIdx: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  summaryCard: {
    padding: 14,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  grandLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  grandValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: fonts.extraBold,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  footer: {
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
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  vendorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  vendorItemName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});


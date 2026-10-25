import React, { useState, useEffect } from 'react';
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
import { X, Receipt, CircleAlert, Calendar, CreditCard, Tag } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/FeedbackContext';
import { fonts } from '../theme/typography';
import api from '@accountiva/api';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialExpense?: any;
}

const EXPENSE_CATEGORIES = [
  'Advertising & Marketing',
  'Office Supplies',
  'Rent & Facilities',
  'Travel & Entertainment',
  'Utilities & Bills',
  'Software & Subscriptions',
  'Salaries & Wages',
  'Professional Fees',
  'General & Administrative',
];

const PAYMENT_METHODS = [
  'Cash',
  'Bank Account',
  'Credit Card',
  'UPI / Digital',
  'Petty Cash',
];

const today = () => new Date().toISOString().split('T')[0];

export function AddExpenseModal({
  visible,
  onClose,
  onSuccess,
  initialExpense,
}: AddExpenseModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [expenseAccount, setExpenseAccount] = useState('Office Supplies');
  const [paidThrough, setPaidThrough] = useState('Bank Account');
  const [payee, setPayee] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [taxRate, setTaxRate] = useState('18');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (initialExpense) {
      setAmount(initialExpense.amount != null ? String(initialExpense.amount) : '');
      setDate(initialExpense.date || today());
      setExpenseAccount(initialExpense.expenseAccount || initialExpense.category || 'Office Supplies');
      setPaidThrough(initialExpense.paidThrough || initialExpense.paymentMethod || 'Bank Account');
      setPayee(initialExpense.payee || initialExpense.merchant || initialExpense.vendorName || '');
      setReferenceNumber(initialExpense.referenceNumber || initialExpense.reference || '');
      setTaxRate(initialExpense.taxRate != null ? String(initialExpense.taxRate) : '18');
      setNotes(initialExpense.notes || initialExpense.description || '');
    } else {
      setAmount('');
      setDate(today());
      setExpenseAccount('Office Supplies');
      setPaidThrough('Bank Account');
      setPayee('');
      setReferenceNumber('');
      setTaxRate('18');
      setNotes('');
    }
    setApiError(null);
  }, [initialExpense, visible]);

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setApiError('Please enter a valid expense amount.');
      return;
    }

    try {
      setIsSaving(true);
      setApiError(null);

      const parsedTaxRate = taxRate ? parseFloat(taxRate) : 0;
      const taxAmount = (parsedAmount * parsedTaxRate) / (100 + parsedTaxRate);

      const payload = {
        amount: parsedAmount,
        date: date.trim() || today(),
        expenseAccount: expenseAccount.trim(),
        paidThrough: paidThrough.trim(),
        payee: payee.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        taxRate: parsedTaxRate,
        taxAmount: Number(taxAmount.toFixed(2)),
        notes: notes.trim() || undefined,
      };

      if (initialExpense?.id) {
        await api.put(`/expenses/${initialExpense.id}`, payload);
        toast.success('Expense Updated', 'Expense record was updated.');
      } else {
        await api.post('/expenses', payload);
        toast.success('Expense Recorded', 'Expense was added to your ledger.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setApiError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to save expense.'
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
              <Receipt size={18} color={colors.primary} />
              <Text style={[styles.title, { color: colors.foreground }]}>
                {initialExpense ? 'Edit Expense' : 'Record Expense'}
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

            {/* Amount (₹) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Amount ({currency}) *</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.amountInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                autoFocus
              />
            </View>

            {/* Date & Reference */}
            <View style={styles.twoColRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Expense Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  value={date}
                  onChangeText={setDate}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Reference / Bill #</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="e.g. REC-941"
                  placeholderTextColor={colors.mutedForeground}
                  value={referenceNumber}
                  onChangeText={setReferenceNumber}
                />
              </View>
            </View>

            {/* Payee / Merchant */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Payee / Vendor / Merchant</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Amazon Web Services, Staples, Uber"
                placeholderTextColor={colors.mutedForeground}
                value={payee}
                onChangeText={setPayee}
              />
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Expense Category</Text>
              <View style={styles.chipRow}>
                {EXPENSE_CATEGORIES.map((cat) => {
                  const isSelected = expenseAccount === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setExpenseAccount(cat)}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipBtnText,
                          {
                            color: isSelected ? colors.primaryForeground : colors.foreground,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Paid Through */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Paid Through (Payment Method)</Text>
              <View style={styles.chipRow}>
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paidThrough === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      onPress={() => setPaidThrough(method)}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipBtnText,
                          {
                            color: isSelected ? colors.primaryForeground : colors.foreground,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {method}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* GST Rate */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Tax Rate (%)</Text>
              <View style={styles.chipRow}>
                {['0', '5', '12', '18', '28'].map((r) => {
                  const isSelected = taxRate === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setTaxRate(r)}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipBtnText,
                          {
                            color: isSelected ? colors.primaryForeground : colors.foreground,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {r}%
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Notes & Purpose</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="Business justification or itemized details..."
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
                  {initialExpense ? 'Update Expense' : 'Save Expense'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
    maxHeight: '90%',
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipBtnText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
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
});


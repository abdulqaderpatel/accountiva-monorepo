import React, { useState } from 'react';
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
import { toast } from '../context/FeedbackContext';
import { X, Users, Search, Check, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card } from './ui/Card';
import { useCreateCreditNote, useCustomers } from '@accountiva/api';
import { fonts } from '../theme/typography';

interface CreateCreditNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCreditNoteModal({ visible, onClose, onSuccess }: CreateCreditNoteModalProps) {
  const { colors } = useTheme();
  const createCreditNoteMutation = useCreateCreditNote();
  const { data: apiCustomers } = useCustomers();

  const rawCustomers: any[] = Array.isArray(apiCustomers)
    ? apiCustomers
    : Array.isArray(apiCustomers?.data)
    ? apiCustomers.data
    : [];

  const [customer, setCustomer] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const [creditNoteNumber, setCreditNoteNumber] = useState(
    `CN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Goods returned / pricing adjustment');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    setErrors({});
    if (!customer.trim()) {
      setErrors({ customer: 'Please select a customer' });
      toast.error('Required', 'Please select a customer for this credit note.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setErrors({ amount: 'Please enter a valid credit amount' });
      return;
    }

    try {
      await createCreditNoteMutation.mutateAsync({
        creditNoteNumber,
        customerName: customer,
        amount: numAmount,
        reason: reason.trim(),
        status: 'Open',
      });

      toast.success('Credit Note Created', `Credit Note ${creditNoteNumber} issued to ${customer}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Error', err?.message || 'Failed to save credit note');
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
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Credit Note</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={createCreditNoteMutation.isPending}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              {createCreditNoteMutation.isPending ? (
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
                  <Text
                    style={[
                      styles.selectText,
                      { color: customer ? colors.foreground : colors.mutedForeground },
                    ]}
                  >
                    {customer || 'Select a customer...'}
                  </Text>
                </View>
                <ChevronDown size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Credit Note Number */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Credit Note #</Text>
              <TextInput
                value={creditNoteNumber}
                onChangeText={setCreditNoteNumber}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              />
            </View>

            {/* Credit Amount */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Credit Amount (₹) *</Text>
              <TextInput
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: errors.amount ? colors.destructive : colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
              {errors.amount && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.amount}</Text>
              )}
            </View>

            {/* Reason */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Reason / Notes</Text>
              <TextInput
                placeholder="Reason for issuance or return..."
                placeholderTextColor={colors.mutedForeground}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
              />
            </View>
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
    maxHeight: '80%',
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
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  textArea: {
    height: 70,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 11,
    fontWeight: '500',
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
});


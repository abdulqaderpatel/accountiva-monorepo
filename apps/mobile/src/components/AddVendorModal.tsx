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
import { X, Building2, CircleAlert } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { toast } from '../context/FeedbackContext';
import { fonts } from '../theme/typography';
import api from '@accountiva/api';

interface AddVendorModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialVendor?: any;
}

export function AddVendorModal({
  visible,
  onClose,
  onSuccess,
  initialVendor,
}: AddVendorModalProps) {
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [pan, setPan] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (initialVendor) {
      setName(initialVendor.name || '');
      setCompany(initialVendor.company || '');
      setEmail(initialVendor.email || '');
      setPhone(initialVendor.phone || '');
      setGstNumber(initialVendor.gst_number || initialVendor.gstNumber || initialVendor.gstin || '');
      setPan(initialVendor.pan || '');
      setAddress(initialVendor.address || '');
      setPaymentTerms(initialVendor.payment_terms || initialVendor.paymentTerms || 'Net 30');
    } else {
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setGstNumber('');
      setPan('');
      setAddress('');
      setPaymentTerms('Net 30');
    }
    setApiError(null);
  }, [initialVendor, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      setApiError('Vendor name is required.');
      return;
    }

    try {
      setIsSaving(true);
      setApiError(null);

      const payload = {
        name: name.trim(),
        company: company.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        gst_number: gstNumber.trim() || undefined,
        pan: pan.trim() || undefined,
        address: address.trim() || undefined,
        payment_terms: paymentTerms.trim() || undefined,
      };

      if (initialVendor?.id) {
        await api.put(`/vendors/${initialVendor.id}`, payload);
        toast.success('Vendor Updated', `${name} details updated.`);
      } else {
        await api.post('/vendors', payload);
        toast.success('Vendor Created', `${name} added to your vendors directory.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setApiError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to save vendor.'
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
              <Building2 size={18} color={colors.primary} />
              <Text style={[styles.title, { color: colors.foreground }]}>
                {initialVendor ? 'Edit Vendor' : 'New Vendor'}
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

            {/* Vendor Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Vendor / Supplier Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            {/* Company */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Business / Brand Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Acme Cloud"
                placeholderTextColor={colors.mutedForeground}
                value={company}
                onChangeText={setCompany}
              />
            </View>

            {/* Email & Phone */}
            <View style={styles.twoColRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="billing@vendor.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.mutedForeground}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* GSTIN & PAN */}
            <View style={styles.twoColRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>GSTIN</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="22AAAAA0000A1Z5"
                  placeholderTextColor={colors.mutedForeground}
                  value={gstNumber}
                  onChangeText={setGstNumber}
                  autoCapitalize="characters"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>PAN</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="AAAAA0000A"
                  placeholderTextColor={colors.mutedForeground}
                  value={pan}
                  onChangeText={setPan}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Payment Terms */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Payment Terms</Text>
              <View style={styles.chipRow}>
                {['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'].map((term) => {
                  const isSelected = paymentTerms === term;
                  return (
                    <TouchableOpacity
                      key={term}
                      onPress={() => setPaymentTerms(term)}
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
                        {term}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Supplier Address</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="Street address, city, state, postal code..."
                placeholderTextColor={colors.mutedForeground}
                value={address}
                onChangeText={setAddress}
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
                  {initialVendor ? 'Update Vendor' : 'Save Vendor'}
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


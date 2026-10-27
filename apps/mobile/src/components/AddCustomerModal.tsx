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
} from 'react-native';
import { X, Sparkles, CircleAlert } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import api, { useCreateCustomer, useUpdateCustomer } from '@accountiva/api';
import { customerSchema } from '@accountiva/shared';
import { fonts } from '../theme/typography';
import { CustomFieldRenderer } from './ui/CustomFieldRenderer';
import { formatAddress } from './CustomerDetailModal';

interface AddCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomer?: any;
}

export function AddCustomerModal({ visible, onClose, onSuccess, initialCustomer }: AddCustomerModalProps) {
  const { colors } = useTheme();
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();

  const [name, setName] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [gstTreatment, setGstTreatment] = useState('Consumer');
  const [gstNumber, setGstNumber] = useState('');
  const [pan, setPan] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [gstNotice, setGstNotice] = useState<string | null>(null);
  const [fetchingGst, setFetchingGst] = useState(false);

  React.useEffect(() => {
    if (initialCustomer) {
      setName(initialCustomer.name || '');
      setCustomerCode(initialCustomer.customerCode || initialCustomer.code || '');
      setEmail(initialCustomer.email || '');
      setPhone(initialCustomer.phone || '');
      setCompany(initialCustomer.company || '');
      setWebsite(initialCustomer.website || '');
      setGstTreatment(initialCustomer.gstTreatment || 'Consumer');
      setGstNumber(initialCustomer.gstNumber || initialCustomer.gstin || '');
      setPan(initialCustomer.pan || '');
      setBillingAddress(formatAddress(initialCustomer.billingAddress || initialCustomer.address));
      setShippingAddress(formatAddress(initialCustomer.shippingAddress));
      setNotes(initialCustomer.notes || '');
      setOpeningBalance(
        initialCustomer.opening_balance != null
          ? String(initialCustomer.opening_balance)
          : initialCustomer.openingBalance != null
          ? String(initialCustomer.openingBalance)
          : ''
      );
      setCustomFields(initialCustomer.customFields || initialCustomer.custom_fields || {});
    } else {
      setName('');
      setCustomerCode('');
      setEmail('');
      setPhone('');
      setCompany('');
      setWebsite('');
      setGstTreatment('Consumer');
      setGstNumber('');
      setPan('');
      setBillingAddress('');
      setShippingAddress('');
      setNotes('');
      setOpeningBalance('');
      setCustomFields({});
    }
    setErrors({});
    setApiError(null);
    setGstNotice(null);
  }, [initialCustomer, visible]);

  const handleGstChange = (val: string) => {
    const uppercase = val.toUpperCase().trim();
    setGstNumber(uppercase);
    if (uppercase.length >= 12 && !pan) {
      setPan(uppercase.substring(2, 12));
    }
    if (errors.gstNumber) setErrors((prev) => ({ ...prev, gstNumber: '' }));
  };

  const handleFetchGstin = async () => {
    const cleanGst = gstNumber.trim().toUpperCase();
    if (cleanGst.length !== 15) {
      setErrors((prev) => ({ ...prev, gstNumber: 'Please enter a full 15-character GSTIN first' }));
      return;
    }

    setFetchingGst(true);
    setGstNotice(null);
    try {
      const res = await api.get(`/customers/gstin/${cleanGst}`);
      const data = res.data;
      if (data) {
        if (data.company) setCompany(data.company);
        if (data.name && !name) setName(data.name);
        else if (data.company && !name) setName(data.company);
        if (data.pan) setPan(data.pan);
        if (data.address) {
          const fullAddr = [data.address, data.city, data.state, data.pincode].filter(Boolean).join(', ');
          setBillingAddress(fullAddr || data.address);
        }
        setGstTreatment('Registered Business - Regular');
        setGstNotice(`Details auto-filled for ${data.company || data.name || cleanGst}`);
      }
    } catch (err: any) {
      setGstNotice(
        err.response?.data?.error || err.message || 'Could not fetch GSTIN details. Please enter manually.'
      );
    } finally {
      setFetchingGst(false);
    }
  };

  const handleSave = async () => {
    setErrors({});
    setApiError(null);

    const formData = {
      name: name.trim(),
      customerCode: customerCode.trim() || undefined,
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim(),
      website: website.trim() || undefined,
      gstTreatment,
      gstNumber: gstNumber.trim(),
      pan: pan.trim().toUpperCase(),
      billingAddress: billingAddress.trim(),
      shippingAddress: shippingAddress.trim() || undefined,
      notes: notes.trim() || undefined,
      opening_balance: openingBalance.trim() ? parseFloat(openingBalance.trim()) : undefined,
    };

    const parsed = customerSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const payload = {
      ...formData,
      customFields,
    };

    try {
      if (initialCustomer?.id) {
        await updateCustomerMutation.mutateAsync({
          id: initialCustomer.id,
          payload,
        });
      } else {
        await createCustomerMutation.mutateAsync(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save customer. Please check all fields.';
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
          <Text style={[styles.title, { color: colors.foreground }]}>
            {initialCustomer ? 'Edit Customer' : 'New Customer'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            {createCustomerMutation.isPending || updateCustomerMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* API Error Banner */}
          {apiError ? (
            <View style={[styles.apiErrorBanner, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive }]}>
              <CircleAlert size={16} color={colors.destructive} style={{ marginTop: 2 }} />
              <Text style={[styles.apiErrorText, { color: colors.destructive }]}>{apiError}</Text>
            </View>
          ) : null}

          {/* Display Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Display Name *</Text>
            <TextInput
              placeholder="e.g. John Doe or Acme Corp"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              style={[
                styles.input,
                {
                  borderColor: errors.name ? colors.destructive : colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.card,
                },
              ]}
            />
            {errors.name ? <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.name}</Text> : null}
          </View>

          {/* Company Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Company Name</Text>
            <TextInput
              placeholder="e.g. Acme Industries Ltd"
              placeholderTextColor={colors.mutedForeground}
              value={company}
              onChangeText={setCompany}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
            />
          </View>

          {/* Customer Code & Website */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Customer Code</Text>
              <TextInput
                placeholder="e.g. CUST-001"
                placeholderTextColor={colors.mutedForeground}
                value={customerCode}
                onChangeText={setCustomerCode}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Website</Text>
              <TextInput
                placeholder="https://..."
                placeholderTextColor={colors.mutedForeground}
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
                keyboardType="url"
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Email Address</Text>
            <TextInput
              placeholder="contact@company.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  borderColor: errors.email ? colors.destructive : colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.card,
                },
              ]}
            />
            {errors.email ? <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.email}</Text> : null}
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Phone Number</Text>
            <TextInput
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
            />
          </View>

          {/* GST Section */}
          <View style={[styles.sectionDivider, { borderColor: colors.border }]} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>GST & Tax Details</Text>

          {gstNotice ? (
            <View style={[styles.noticeBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Text style={[styles.noticeText, { color: colors.foreground }]}>{gstNotice}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>GSTIN (15 Digits)</Text>
            <View style={styles.gstinRow}>
              <TextInput
                placeholder="22AAAAA0000A1Z5"
                placeholderTextColor={colors.mutedForeground}
                value={gstNumber}
                onChangeText={handleGstChange}
                autoCapitalize="characters"
                maxLength={15}
                style={[
                  styles.gstinInput,
                  {
                    borderColor: errors.gstNumber ? colors.destructive : colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.card,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={handleFetchGstin}
                disabled={fetchingGst || gstNumber.length < 15}
                style={[
                  styles.fetchGstBtn,
                  {
                    backgroundColor: gstNumber.length === 15 ? colors.primary : colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                {fetchingGst ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <>
                    <Sparkles
                      size={14}
                      color={gstNumber.length === 15 ? colors.primaryForeground : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.fetchGstBtnText,
                        {
                          color: gstNumber.length === 15 ? colors.primaryForeground : colors.mutedForeground,
                        },
                      ]}
                    >
                      Auto-fill
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {errors.gstNumber ? <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.gstNumber}</Text> : null}
          </View>

          {/* PAN */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>PAN (10 Digits)</Text>
            <TextInput
              placeholder="AAAAA0000A"
              placeholderTextColor={colors.mutedForeground}
              value={pan}
              onChangeText={(val) => {
                setPan(val.toUpperCase());
                if (errors.pan) setErrors((prev) => ({ ...prev, pan: '' }));
              }}
              autoCapitalize="characters"
              maxLength={10}
              style={[
                styles.input,
                {
                  borderColor: errors.pan ? colors.destructive : colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.card,
                },
              ]}
            />
            {errors.pan ? <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.pan}</Text> : null}
          </View>

          {/* Address */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Billing Address</Text>
            <TextInput
              placeholder="Street, City, State, PIN"
              placeholderTextColor={colors.mutedForeground}
              value={billingAddress}
              onChangeText={setBillingAddress}
              multiline
              numberOfLines={3}
              style={[styles.textArea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
            />
          </View>

          {/* Shipping Address */}
          <View style={styles.fieldGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Shipping Address</Text>
              {billingAddress.trim() ? (
                <TouchableOpacity
                  onPress={() => setShippingAddress(billingAddress)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>
                    Same as Billing
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TextInput
              placeholder="Delivery destination address"
              placeholderTextColor={colors.mutedForeground}
              value={shippingAddress}
              onChangeText={setShippingAddress}
              multiline
              numberOfLines={3}
              style={[styles.textArea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
            />
          </View>

          {/* Opening Balance */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Opening Balance (₹)</Text>
            <TextInput
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              value={openingBalance}
              onChangeText={setOpeningBalance}
              keyboardType="numeric"
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
            />
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes / Remarks</Text>
            <TextInput
              placeholder="Internal customer notes or special payment instructions"
              placeholderTextColor={colors.mutedForeground}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
              style={[styles.textArea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
            />
          </View>

          {/* Custom Fields */}
          <CustomFieldRenderer
            entity="customer"
            values={customFields}
            onChange={setCustomFields}
          />
        </ScrollView>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  closeBtn: {
    padding: 6,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
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
  noticeBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  noticeText: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  textArea: {
    height: 72,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  sectionDivider: {
    borderBottomWidth: 1,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  gstinRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gstinInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  fetchGstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
  },
  fetchGstBtnText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
});

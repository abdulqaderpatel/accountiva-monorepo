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
  Alert,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useCreateCustomer } from '@accountiva/api';
import { customerSchema } from '@accountiva/shared';
import { fonts } from '../theme/typography';

interface AddCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCustomerModal({ visible, onClose, onSuccess }: AddCustomerModalProps) {
  const { colors } = useTheme();
  const createCustomerMutation = useCreateCustomer();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [gstTreatment, setGstTreatment] = useState('Consumer');
  const [gstNumber, setGstNumber] = useState('');
  const [pan, setPan] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGstChange = (val: string) => {
    const uppercase = val.toUpperCase().trim();
    setGstNumber(uppercase);
    if (uppercase.length >= 12 && !pan) {
      setPan(uppercase.substring(2, 12));
    }
  };

  const handleSave = async () => {
    setErrors({});

    const formData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim(),
      gstTreatment,
      gstNumber: gstNumber.trim(),
      pan: pan.trim().toUpperCase(),
      billingAddress: billingAddress.trim(),
    };

    const parsed = customerSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      Alert.alert('Validation Error', 'Please check the highlighted fields.');
      return;
    }

    try {
      await createCustomerMutation.mutateAsync(formData);
      Alert.alert('Customer Added', `${name} has been added to your client list.`);
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setGstNumber('');
      setPan('');
      setBillingAddress('');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save customer');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>New Customer</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={createCustomerMutation.isPending}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          >
            {createCustomerMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Display Name *</Text>
          <TextInput
            placeholder="e.g. John Doe or Acme Corp"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            style={[styles.input, { borderColor: errors.name ? colors.destructive : colors.border, color: colors.foreground, backgroundColor: colors.card }]}
          />
          {errors.name && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.name}</Text>}

          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>Company Name</Text>
          <TextInput
            placeholder="e.g. Acme Industries Ltd"
            placeholderTextColor={colors.mutedForeground}
            value={company}
            onChangeText={setCompany}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
          />

          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>Email Address</Text>
          <TextInput
            placeholder="contact@company.com"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { borderColor: errors.email ? colors.destructive : colors.border, color: colors.foreground, backgroundColor: colors.card }]}
          />
          {errors.email && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.email}</Text>}

          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>Phone Number</Text>
          <TextInput
            placeholder="+91 98765 43210"
            placeholderTextColor={colors.mutedForeground}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
          />

          {/* GST Details */}
          <View style={[styles.sectionDivider, { borderColor: colors.border }]} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>GST & Tax Details</Text>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>GSTIN (15 Digits)</Text>
          <TextInput
            placeholder="22AAAAA0000A1Z5"
            placeholderTextColor={colors.mutedForeground}
            value={gstNumber}
            onChangeText={handleGstChange}
            autoCapitalize="characters"
            maxLength={15}
            style={[styles.input, { borderColor: errors.gstNumber ? colors.destructive : colors.border, color: colors.foreground, backgroundColor: colors.card }]}
          />
          {errors.gstNumber && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.gstNumber}</Text>}

          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>PAN (10 Digits)</Text>
          <TextInput
            placeholder="AAAAA0000A"
            placeholderTextColor={colors.mutedForeground}
            value={pan}
            onChangeText={(val) => setPan(val.toUpperCase())}
            autoCapitalize="characters"
            maxLength={10}
            style={[styles.input, { borderColor: errors.pan ? colors.destructive : colors.border, color: colors.foreground, backgroundColor: colors.card }]}
          />
          {errors.pan && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.pan}</Text>}

          {/* Address */}
          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>Billing Address</Text>
          <TextInput
            placeholder="Street, City, State, PIN"
            placeholderTextColor={colors.mutedForeground}
            value={billingAddress}
            onChangeText={setBillingAddress}
            multiline
            numberOfLines={3}
            style={[styles.textArea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
          />
        </ScrollView>
      </View>
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
    padding: 4,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  textArea: {
    height: 72,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  sectionDivider: {
    borderTopWidth: 1,
    marginTop: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    fontFamily: fonts.display,
  },
});

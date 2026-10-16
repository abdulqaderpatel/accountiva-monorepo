import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Building2, Save, Trash2, Globe, Check, ChevronDown, CircleAlert } from 'lucide-react-native';
import api from '@accountiva/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { toast, confirm } from '../../context/FeedbackContext';
import { Card } from '../ui/Card';
import { fonts } from '../../theme/typography';

const CURRENCIES = [
  { code: 'INR', label: 'INR - Indian Rupee (₹)' },
  { code: 'USD', label: 'USD - United States Dollar ($)' },
  { code: 'EUR', label: 'EUR - Euro (€)' },
  { code: 'GBP', label: 'GBP - British Pound (£)' },
  { code: 'AED', label: 'AED - UAE Dirham (د.إ)' },
  { code: 'CAD', label: 'CAD - Canadian Dollar ($)' },
  { code: 'AUD', label: 'AUD - Australian Dollar ($)' },
  { code: 'SGD', label: 'SGD - Singapore Dollar ($)' },
];

export function OrganizationProfileTab() {
  const { colors } = useTheme();
  const { currentOrg, refreshOrganizations, deleteOrganization } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [name, setName] = useState(currentOrg?.name || '');
  const [currency, setCurrency] = useState(currentOrg?.currency || 'INR');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

  useEffect(() => {
    if (!currentOrg?.id) return;

    let isMounted = true;
    setLoading(true);

    api
      .get(`/organizations/${currentOrg.id}`)
      .then(({ data }) => {
        if (!isMounted || !data) return;
        setName(data.name || currentOrg.name || '');
        setCurrency(data.currency || currentOrg.currency || 'INR');
        setGstin(data.gstin || '');
        setPan(data.pan || '');
        setAddress(data.address_line1 || data.address || '');
        setCity(data.city || '');
        setState(data.state || '');
        setPostalCode(data.postal_code || '');
        setPhone(data.phone || '');
        setWebsite(data.website || '');
      })
      .catch(() => {
        // Silently keep default fields
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentOrg?.id]);

  const handleGstChange = (val: string) => {
    const uppercase = val.toUpperCase().trim();
    setGstin(uppercase);
    if (uppercase.length >= 12 && !pan) {
      setPan(uppercase.substring(2, 12));
    }
    if (errors.gstin) setErrors((prev) => ({ ...prev, gstin: '' }));
  };

  const handleSave = async () => {
    if (!currentOrg?.id) return;
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Organization name is required';
    }

    if (gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.trim())) {
      newErrors.gstin = 'Enter a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5)';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setSaving(true);
      await api.put(`/organizations/${currentOrg.id}`, {
        name: name.trim(),
        currency: currency.trim(),
        gstin: gstin.trim(),
        pan: pan.trim().toUpperCase(),
        address_line1: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
        phone: phone.trim(),
        website: website.trim(),
        is_gst_registered: Boolean(gstin.trim()),
      });

      await refreshOrganizations();
      toast.success('Organization Updated', 'Changes have been saved successfully.');
    } catch (err: any) {
      toast.error(
        'Update Failed',
        err.response?.data?.error || err.response?.data?.message || err.message || 'Could not update organization'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!currentOrg) return;
    confirm({
      title: 'Delete Organization',
      message: `Are you sure you want to permanently delete "${currentOrg.name}"? All associated data, invoices, and customers will be removed forever.`,
      confirmText: 'Delete Workspace',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          setDeleting(true);
          await deleteOrganization(currentOrg.id);
          toast.success('Organization Deleted', `${currentOrg.name} has been removed.`);
        } catch (err: any) {
          toast.error(
            'Delete Failed',
            err.response?.data?.error || err.response?.data?.message || err.message || 'Could not delete organization.'
          );
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Loading organization details...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Building2 size={18} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Company Identity</Text>
        </View>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Organization Name *</Text>
          <TextInput
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="e.g. Acme Corp"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: errors.name ? colors.destructive : colors.border,
                color: colors.foreground,
              },
            ]}
          />
          {errors.name ? <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.name}</Text> : null}
        </View>

        {/* Currency */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Base Currency</Text>
          <TouchableOpacity
            style={[styles.selectBox, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setIsCurrencyModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Globe size={16} color={colors.mutedForeground} />
              <Text style={[styles.selectText, { color: colors.foreground }]}>
                {CURRENCIES.find((c) => c.code === currency)?.label || `${currency} (Base)`}
              </Text>
            </View>
            <ChevronDown size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Tax Identifiers */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>GSTIN (15 Digits)</Text>
            <TextInput
              value={gstin}
              onChangeText={handleGstChange}
              placeholder="22AAAAA0000A1Z5"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              maxLength={15}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: errors.gstin ? colors.destructive : colors.border,
                  color: colors.foreground,
                },
              ]}
            />
            {errors.gstin ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.gstin}</Text>
            ) : null}
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>PAN (10 Digits)</Text>
            <TextInput
              value={pan}
              onChangeText={(t) => setPan(t.toUpperCase().trim())}
              placeholder="AAAAA0000A"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              maxLength={10}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />
          </View>
        </View>

        {/* Address */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Office Address</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Street address, building, suite"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
          />
        </View>

        {/* City & State */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Mumbai"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>State / Province</Text>
            <TextInput
              value={state}
              onChangeText={setState}
              placeholder="e.g. Maharashtra"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />
          </View>
        </View>

        {/* Postal Code & Phone */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Postal / PIN Code</Text>
            <TextInput
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder="e.g. 400001"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />
          </View>
        </View>

        {/* Website */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Website</Text>
          <TextInput
            value={website}
            onChangeText={setWebsite}
            placeholder="https://company.com"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="url"
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Save size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </Card>

      {/* Danger Zone: Delete Organization */}
      <Card style={[styles.card, { borderColor: colors.destructive + '40', marginTop: 12 }]}>
        <View style={styles.sectionHeader}>
          <Trash2 size={18} color={colors.destructive} />
          <Text style={[styles.sectionTitle, { color: colors.destructive }]}>Danger Zone</Text>
        </View>
        <Text style={[styles.dangerSub, { color: colors.mutedForeground }]}>
          Permanently delete this organization workspace, along with all invoices, customers, items, and tax data.
        </Text>
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: colors.destructive }]}
          onPress={handleDelete}
          disabled={deleting}
          activeOpacity={0.7}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.destructive} />
          ) : (
            <>
              <Trash2 size={16} color={colors.destructive} style={{ marginRight: 6 }} />
              <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Delete Organization</Text>
            </>
          )}
        </TouchableOpacity>
      </Card>

      {/* Currency Selection Modal */}
      <Modal
        visible={isCurrencyModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCurrencyModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Base Currency</Text>
              <TouchableOpacity onPress={() => setIsCurrencyModalOpen(false)}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              renderItem={({ item }) => {
                const isSelected = currency === item.code;
                return (
                  <TouchableOpacity
                    style={[
                      styles.currencyItem,
                      {
                        backgroundColor: isSelected ? colors.surfaceSubtle : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setCurrency(item.code);
                      setIsCurrencyModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.currencyItemText,
                        { color: colors.foreground, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected ? <Check size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  card: {
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  fieldGroup: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  selectBox: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  errorText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  saveBtn: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  dangerSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
  deleteBtn: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '60%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  currencyItemText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
});

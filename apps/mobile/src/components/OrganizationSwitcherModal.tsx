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
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Building, Plus, ChevronRight, Settings as SettingsIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth, MobileOrganization } from '../context/AuthContext';
import { fonts } from '../theme/typography';

interface OrganizationSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenOrgSettings?: (org: MobileOrganization) => void;
}

export function OrganizationSwitcherModal({ visible, onClose, onOpenOrgSettings }: OrganizationSwitcherModalProps) {
  const { colors } = useTheme();
  const { currentOrg, organizations, setCurrentOrg, createOrganization } = useAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCurrency, setNewOrgCurrency] = useState('INR');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectOrg = async (org: MobileOrganization) => {
    await setCurrentOrg(org);
    onClose();
  };

  const handleCreate = async () => {
    if (!newOrgName.trim()) {
      setError('Organization name is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createOrganization(newOrgName.trim(), newOrgCurrency);
      setNewOrgName('');
      setIsCreating(false);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsCreating(false);
    setNewOrgName('');
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]} edges={['bottom']}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconCircle, { backgroundColor: colors.primary + '18' }]}>
                <Building size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>Switch Workspace</Text>
                <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
                  {organizations.length} {organizations.length === 1 ? 'organization' : 'organizations'} available
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
            {/* Organizations List */}
            <View style={styles.orgList}>
              {organizations.map((org) => {
                const isSelected = currentOrg?.id === org.id;
                return (
                  <TouchableOpacity
                    key={org.id}
                    style={[
                      styles.orgItem,
                      {
                        backgroundColor: isSelected ? colors.primary + '12' : colors.card,
                        borderColor: isSelected ? colors.primary + '40' : colors.border,
                      },
                    ]}
                    onPress={() => handleSelectOrg(org)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.orgItemLeft}>
                      <View
                        style={[
                          styles.orgAvatar,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.orgAvatarText,
                            {
                              color: isSelected ? colors.primaryForeground : colors.foreground,
                            },
                          ]}
                        >
                          {org.name ? org.name[0]?.toUpperCase() : 'O'}
                        </Text>
                      </View>
                      <View style={styles.orgInfo}>
                        <Text style={[styles.orgName, { color: colors.foreground }]}>{org.name}</Text>
                        <Text style={[styles.orgCurrency, { color: colors.mutedForeground }]}>
                          Currency: {org.currency || 'INR'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {isSelected && (
                        <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                          <Check size={14} color={colors.primaryForeground} strokeWidth={3} />
                        </View>
                      )}

                      {onOpenOrgSettings && (
                        <TouchableOpacity
                          style={[styles.settingsBtn, { backgroundColor: colors.surfaceSubtle }]}
                          onPress={async () => {
                            if (!isSelected) {
                              await setCurrentOrg(org);
                            }
                            onClose();
                            onOpenOrgSettings(org);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <SettingsIcon size={14} color={colors.foreground} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Create New Org Section */}
            {!isCreating ? (
              <TouchableOpacity
                style={[styles.createToggleBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => {
                  setError(null);
                  setIsCreating(true);
                }}
                activeOpacity={0.7}
              >
                <Plus size={18} color={colors.primary} />
                <Text style={[styles.createToggleText, { color: colors.primary }]}>+ Create New Organization</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.createCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.createCardTitle, { color: colors.foreground }]}>Create New Workspace</Text>
                
                {error && (
                  <View style={[styles.errorBanner, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '30' }]}>
                    <Text style={[styles.errorBannerText, { color: colors.destructive }]}>{error}</Text>
                  </View>
                )}

                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Organization Name *</Text>
                <TextInput
                  placeholder="e.g. Acme Corp or Global Ventures"
                  placeholderTextColor={colors.mutedForeground}
                  value={newOrgName}
                  onChangeText={(val) => {
                    setNewOrgName(val);
                    if (error) setError(null);
                  }}
                  style={[styles.input, { borderColor: error ? colors.destructive : colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                  autoFocus
                />

                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>Base Currency</Text>
                <View style={styles.currencyRow}>
                  {['INR', 'USD', 'EUR', 'GBP'].map((curr) => {
                    const isSelected = newOrgCurrency === curr;
                    return (
                      <TouchableOpacity
                        key={curr}
                        onPress={() => setNewOrgCurrency(curr)}
                        style={[
                          styles.currencyChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.background,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.currencyText, { color: isSelected ? colors.primaryForeground : colors.foreground }]}>
                          {curr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.createActionsRow}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => {
                      setIsCreating(false);
                      setNewOrgName('');
                      setError(null);
                    }}
                    disabled={submitting}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                    onPress={handleCreate}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Create & Switch</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollList: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  orgList: {
    gap: 10,
  },
  orgItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  orgItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  orgAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgAvatarText: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  orgCurrency: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  createToggleText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  createCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  createCardTitle: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  currencyText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  createActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  submitBtn: {
    flex: 2,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  errorBanner: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  settingsBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


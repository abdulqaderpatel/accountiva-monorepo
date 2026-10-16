import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  Sun,
  Moon,
  Building,
  Building2,
  Users,
  SlidersHorizontal,
  Palette,
  User,
  Plus,
  Trash2,
  LogOut,
  ChevronRight,
  Check,
  X,
  Bell,
  Shield,
  Briefcase,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth, MobileOrganization } from '../context/AuthContext';
import { toast, confirm } from '../context/FeedbackContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { fonts } from '../theme/typography';
import { OrganizationSwitcherModal } from '../components/OrganizationSwitcherModal';
import { OrganizationSettingsModal, OrgSettingsTab } from '../components/OrganizationSettingsModal';

export function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const {
    user,
    currentOrg,
    organizations,
    setCurrentOrg,
    refreshOrganizations,
    createOrganization,
    logout,
  } = useAuth();

  const [isOrgSwitcherOpen, setIsOrgSwitcherOpen] = useState(false);
  const [isOrgSettingsOpen, setIsOrgSettingsOpen] = useState(false);
  const [orgSettingsTab, setOrgSettingsTab] = useState<OrgSettingsTab>('profile');

  // Create Workspace Modal
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCurrency, setNewOrgCurrency] = useState('INR');
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Notifications State
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  const handleOpenOrgSettings = (tab: OrgSettingsTab = 'profile') => {
    setOrgSettingsTab(tab);
    setIsOrgSettingsOpen(true);
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      toast.error('Validation Error', 'Organization name is required');
      return;
    }

    try {
      setCreatingOrg(true);
      await createOrganization(newOrgName.trim(), newOrgCurrency.trim());
      toast.success('Workspace Created', `${newOrgName.trim()} is ready!`);
      setNewOrgName('');
      setIsCreateOrgModalOpen(false);
    } catch (err: any) {
      toast.error(
        'Creation Failed',
        err.response?.data?.error || err.response?.data?.message || err.message || 'Could not create workspace'
      );
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleLogout = () => {
    confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your Accountiva account?',
      confirmText: 'Sign Out',
      destructive: true,
      icon: 'logout',
      onConfirm: async () => {
        await logout();
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Settings & Account</Text>
          <Text style={[styles.subTitle, { color: colors.mutedForeground }]}>
            General preferences and workspace management
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Organization Card */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Active Workspace</Text>
        <Card style={styles.card}>
          <View style={styles.orgRow}>
            <View style={[styles.orgAvatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.orgAvatarText, { color: colors.primaryForeground }]}>
                {currentOrg?.name ? currentOrg.name[0]?.toUpperCase() : 'O'}
              </Text>
            </View>

            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.orgName, { color: colors.foreground }]} numberOfLines={1}>
                  {currentOrg?.name || 'Default Workspace'}
                </Text>
                <Badge variant="outline">{currentOrg?.role || 'Member'}</Badge>
              </View>
              <Text style={[styles.orgCurrency, { color: colors.mutedForeground }]}>
                Base Currency: {currentOrg?.currency || 'INR'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Quick Action Grid */}
          <View style={styles.orgActionsRow}>
            <TouchableOpacity
              style={[styles.orgActionBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleOpenOrgSettings('profile')}
              activeOpacity={0.8}
            >
              <Building2 size={15} color={colors.primaryForeground} style={{ marginRight: 6 }} />
              <Text style={[styles.orgActionBtnText, { color: colors.primaryForeground }]}>
                Organization Settings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.orgActionBtnSecondary, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}
              onPress={() => setIsOrgSwitcherOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.orgActionBtnTextSecondary, { color: colors.foreground }]}>
                Switch Workspace
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sub-navigation shortcuts to Org Settings */}
          <View style={[styles.shortcutsGrid, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={styles.shortcutItem}
              onPress={() => handleOpenOrgSettings('members')}
              activeOpacity={0.7}
            >
              <Users size={14} color={colors.primary} />
              <Text style={[styles.shortcutText, { color: colors.foreground }]}>Team Members</Text>
            </TouchableOpacity>

            <View style={[styles.shortcutDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.shortcutItem}
              onPress={() => handleOpenOrgSettings('custom-fields')}
              activeOpacity={0.7}
            >
              <SlidersHorizontal size={14} color={colors.primary} />
              <Text style={[styles.shortcutText, { color: colors.foreground }]}>Custom Fields</Text>
            </TouchableOpacity>

            <View style={[styles.shortcutDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.shortcutItem}
              onPress={() => handleOpenOrgSettings('branding')}
              activeOpacity={0.7}
            >
              <Palette size={14} color={colors.primary} />
              <Text style={[styles.shortcutText, { color: colors.foreground }]}>Branding</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* User Account Profile */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Your Profile</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16 }}>
                  {user?.name ? user.name[0]?.toUpperCase() : 'U'}
                </Text>
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                  {user?.name || 'Account User'}
                </Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  {user?.email}
                </Text>
              </View>
            </View>
            <Badge variant="outline">Active</Badge>
          </View>
        </Card>

        {/* Appearance & Interface */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Appearance & Theme</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              {isDark ? (
                <Moon size={18} color={colors.foreground} />
              ) : (
                <Sun size={18} color={colors.foreground} />
              )}
              <View>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Dark Mode</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  {isDark ? 'Dark theme active' : 'Light theme active'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? colors.primaryForeground : '#f4f3f4'}
            />
          </View>
        </Card>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Notifications</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Bell size={18} color={colors.foreground} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Push Notifications</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  Invoice payment receipts and updates
                </Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={pushEnabled ? colors.primaryForeground : '#f4f3f4'}
            />
          </View>
        </Card>

        {/* Workspaces & Team Switcher */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Workspaces</Text>
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setIsOrgSwitcherOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Building size={18} color={colors.foreground} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Switch Workspace</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  {organizations.length} {organizations.length === 1 ? 'organization' : 'organizations'} connected
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setIsCreateOrgModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Plus size={18} color={colors.primary} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.primary }]}>Create New Workspace</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  Add another business entity or branch
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </Card>

        {/* Sign Out Action */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.destructive + '40', backgroundColor: colors.destructive + '10' }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={16} color={colors.destructive} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.appVersion, { color: colors.mutedForeground }]}>
          Accountiva Mobile • Version 1.0.0
        </Text>
      </ScrollView>

      {/* Organization Switcher Modal */}
      <OrganizationSwitcherModal
        visible={isOrgSwitcherOpen}
        onClose={() => setIsOrgSwitcherOpen(false)}
        onOpenOrgSettings={(org) => {
          setIsOrgSwitcherOpen(false);
          setIsOrgSettingsOpen(true);
        }}
      />

      {/* Dedicated Organization Settings Modal */}
      <OrganizationSettingsModal
        visible={isOrgSettingsOpen}
        onClose={() => setIsOrgSettingsOpen(false)}
        initialTab={orgSettingsTab}
      />

      {/* Create Organization Modal */}
      <Modal
        visible={isCreateOrgModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCreateOrgModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Create Workspace</Text>
              <TouchableOpacity onPress={() => setIsCreateOrgModalOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Workspace Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="e.g. Acme Studio LLC"
                  placeholderTextColor={colors.mutedForeground}
                  value={newOrgName}
                  onChangeText={setNewOrgName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Base Currency</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['INR', 'USD', 'EUR', 'GBP'].map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setNewOrgCurrency(c)}
                      style={[
                        styles.currencyChip,
                        {
                          backgroundColor: newOrgCurrency === c ? colors.primary : colors.card,
                          borderColor: newOrgCurrency === c ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: newOrgCurrency === c ? colors.primaryForeground : colors.foreground,
                          fontSize: 12,
                          fontWeight: newOrgCurrency === c ? '700' : '500',
                        }}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateOrg}
                disabled={creatingOrg}
                activeOpacity={0.8}
              >
                {creatingOrg ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <>
                    <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                    <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                      Create Workspace
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  subTitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  card: {
    padding: 14,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orgAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: fonts.bold,
  },
  orgName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  orgCurrency: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  orgActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  orgActionBtn: {
    flex: 1.3,
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  orgActionBtnSecondary: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgActionBtnTextSecondary: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  shortcutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  shortcutText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  shortcutDivider: {
    width: 1,
    height: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  rowSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 46,
    borderWidth: 1,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  appVersion: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
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
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  modalBody: {
    padding: 16,
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
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  currencyChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitBtn: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});

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
  Globe,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth, MobileOrganization } from '../context/AuthContext';
import { toast, confirm } from '../context/FeedbackContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { fonts } from '../theme/typography';
import { OrganizationProfileTab } from '../components/settings/OrganizationProfileTab';
import { TeamMembersTab } from '../components/settings/TeamMembersTab';
import { CustomFieldsTab } from '../components/settings/CustomFieldsTab';
import { BrandingTab } from '../components/settings/BrandingTab';

type SettingsTab = 'organization' | 'members' | 'custom-fields' | 'branding' | 'account';

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string; icon: any }> = [
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'members', label: 'Team', icon: Users },
  { id: 'custom-fields', label: 'Custom Fields', icon: SlidersHorizontal },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'account', label: 'Account', icon: User },
];

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

  const [activeTab, setActiveTab] = useState<SettingsTab>('organization');
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Create Workspace Modal
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCurrency, setNewOrgCurrency] = useState('INR');
  const [creatingOrg, setCreatingOrg] = useState(false);

  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  const handleSelectOrg = async (org: MobileOrganization) => {
    try {
      setSwitching(true);
      await setCurrentOrg(org);
      setIsOrgModalOpen(false);
      toast.success('Switched Workspace', `Now active in ${org.name}`);
    } catch {
      toast.error('Error', 'Failed to switch organization');
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      toast.error('Validation Error', 'Organization name is required');
      return;
    }

    try {
      setCreatingOrg(true);
      const created = await createOrganization(newOrgName.trim(), newOrgCurrency.trim());
      toast.success('Workspace Created', `${newOrgName.trim()} is ready!`);
      setNewOrgName('');
      setIsCreateOrgModalOpen(false);
      setIsOrgModalOpen(false);
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
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Settings & Administration</Text>
          <Text style={[styles.subTitle, { color: colors.mutedForeground }]}>
            Workspace: {currentOrg?.name || 'Default'}
          </Text>
        </View>
      </View>

      {/* Horizontal Tab Navigation */}
      <View style={[styles.tabsWrap, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {SETTINGS_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabItem,
                  {
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Icon size={14} color={isSelected ? colors.primaryForeground : colors.mutedForeground} />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isSelected ? colors.primaryForeground : colors.foreground,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Tab View */}
      <View style={styles.tabContent}>
        {activeTab === 'organization' && <OrganizationProfileTab />}
        {activeTab === 'members' && <TeamMembersTab />}
        {activeTab === 'custom-fields' && <CustomFieldsTab />}
        {activeTab === 'branding' && <BrandingTab />}

        {activeTab === 'account' && (
          <ScrollView contentContainerStyle={styles.accountContent} showsVerticalScrollIndicator={false}>
            {/* User Profile */}
            {user ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Your Profile</Text>
                <Card style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                        <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 16 }}>
                          {user.name ? user.name[0]?.toUpperCase() : 'U'}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                          {user.name || 'User'}
                        </Text>
                        <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                          {user.email}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </>
            ) : null}

            {/* Appearance */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Appearance</Text>
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
                  trackColor={{ false: isDark ? '#3f3f46' : '#e4e4e7', true: '#2563eb' }}
                  thumbColor="#ffffff"
                />
              </View>
            </Card>

            {/* Workspaces Management */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Workspaces</Text>
            <Card style={styles.card}>
              <TouchableOpacity
                style={styles.row}
                onPress={() => setIsOrgModalOpen(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.rowLeft, { flex: 1, marginRight: 12 }]}>
                  <Building size={18} color={colors.foreground} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: colors.foreground }]} numberOfLines={1}>
                      {currentOrg?.name || 'Primary Organization'}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {organizations.length} workspaces available • Tap to switch
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <Badge variant="outline">Switch</Badge>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                style={styles.row}
                onPress={() => setIsCreateOrgModalOpen(true)}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <Plus size={18} color={colors.primary} />
                  <View>
                    <Text style={[styles.rowLabel, { color: colors.primary }]}>
                      Create New Workspace
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                      Add an additional legal business entity
                    </Text>
                  </View>
                </View>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </Card>

            {/* Logout */}
            <TouchableOpacity
              style={[styles.logoutBtn, { borderColor: colors.destructive }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LogOut size={16} color={colors.destructive} />
              <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Organization Switcher Modal */}
      <Modal
        visible={isOrgModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOrgModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Switch Workspace</Text>
                <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
                  Select workspace to load data, invoices, and customers
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsOrgModalOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.orgList}>
              {organizations.map((org) => {
                const isSelected = currentOrg?.id === org.id;
                return (
                  <TouchableOpacity
                    key={org.id}
                    style={[
                      styles.orgItem,
                      {
                        backgroundColor: isSelected ? colors.surfaceSubtle : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleSelectOrg(org)}
                    disabled={switching}
                    activeOpacity={0.7}
                  >
                    <View style={styles.orgItemLeft}>
                      <View
                        style={[
                          styles.orgIcon,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          },
                        ]}
                      >
                        <Building
                          size={18}
                          color={isSelected ? colors.primaryForeground : colors.foreground}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.orgItemTitle,
                            { color: colors.foreground, fontWeight: isSelected ? '700' : '600' },
                          ]}
                        >
                          {org.name}
                        </Text>
                        <Text style={[styles.orgItemMeta, { color: colors.mutedForeground }]}>
                          Currency: {org.currency || 'INR'}
                        </Text>
                      </View>
                    </View>
                    {isSelected ? (
                      <Check size={18} color={colors.primary} strokeWidth={2.5} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              {/* Add New Workspace CTA inside list */}
              <TouchableOpacity
                style={[styles.addOrgBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => {
                  setIsOrgModalOpen(false);
                  setIsCreateOrgModalOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Plus size={16} color={colors.primary} />
                <Text style={[styles.addOrgBtnText, { color: colors.primary }]}>
                  Create Another Workspace
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Workspace Modal */}
      <Modal
        visible={isCreateOrgModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCreateOrgModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Organization</Text>
                <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
                  Set up a brand new company workspace
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsCreateOrgModalOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  Company Legal Name *
                </Text>
                <TextInput
                  value={newOrgName}
                  onChangeText={setNewOrgName}
                  placeholder="e.g. Acme Technologies"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  Base Currency
                </Text>
                <TextInput
                  value={newOrgCurrency}
                  onChangeText={(t) => setNewOrgCurrency(t.toUpperCase().trim())}
                  placeholder="INR"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  maxLength={5}
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                />
              </View>

              <TouchableOpacity
                style={[styles.createSubmitBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateOrg}
                disabled={creatingOrg}
                activeOpacity={0.8}
              >
                {creatingOrg ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.createSubmitBtnText, { color: colors.primaryForeground }]}>
                    Create Workspace
                  </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  subTitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  tabsWrap: {
    borderBottomWidth: 1,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  tabContent: {
    flex: 1,
  },
  accountContent: {
    padding: 16,
    gap: 8,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  card: {
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  divider: {
    height: 1,
    marginVertical: 4,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 24,
  },
  logoutText: {
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
    maxHeight: '80%',
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
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  modalSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  orgList: {
    padding: 16,
    gap: 10,
  },
  orgItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  orgItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orgIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgItemTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  orgItemMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  addOrgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
  },
  addOrgBtnText: {
    fontSize: 13,
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
  createSubmitBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  createSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});

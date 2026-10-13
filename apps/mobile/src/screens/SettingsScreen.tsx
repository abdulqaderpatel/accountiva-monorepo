import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, ActivityIndicator } from 'react-native';
import { Sun, Moon, Building2, Globe, ShieldCheck, LogOut, User, ChevronRight, Check, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth, MobileOrganization } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { fonts } from '../theme/typography';

export function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, currentOrg, organizations, setCurrentOrg, refreshOrganizations, logout } = useAuth();
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  const handleSelectOrg = async (org: MobileOrganization) => {
    try {
      setSwitching(true);
      await setCurrentOrg(org);
      setIsOrgModalOpen(false);
    } catch {
      Alert.alert('Error', 'Failed to switch organization');
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Account Section */}
        {user ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Account</Text>
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>
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

        {/* Appearance Section */}
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
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? colors.primaryForeground : '#ffffff'}
            />
          </View>
        </Card>

        {/* Organization Section */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Active Organization</Text>
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setIsOrgModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Building2 size={18} color={colors.foreground} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                  {currentOrg?.name || 'Primary Organization'}
                </Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  ID: {currentOrg?.id || 'org-active'} • Tap to switch
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Badge variant="outline">Switch</Badge>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Globe size={18} color={colors.foreground} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Base Currency</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  {currentOrg?.currency ? `${currentOrg.currency} (₹)` : 'Indian Rupee (INR - ₹)'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Feature Release Guard (Invoice-Only MVP) */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          System Architecture
        </Text>
        <Card style={styles.card}>
          <View style={styles.featureRow}>
            <View style={styles.rowLeft}>
              <ShieldCheck size={18} color={colors.success} />
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Invoicing Platform</Text>
            </View>
            <Badge variant="success">Active (MVP)</Badge>
          </View>

          <View style={styles.featureRow}>
            <Text style={[styles.featureSub, { color: colors.mutedForeground }]}>
              Banking & Expenses
            </Text>
            <Badge variant="outline">Staged</Badge>
          </View>
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
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Switch Organization</Text>
                <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
                  Select workspace to load data and invoices
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsOrgModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.orgList}>
              {organizations.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                    No other organizations available
                  </Text>
                </View>
              ) : (
                organizations.map((org) => {
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
                          <Building2
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
                })
              )}
            </ScrollView>
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
  content: {
    padding: 16,
    gap: 8,
    paddingBottom: 32,
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
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  featureSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    marginTop: 20,
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
});


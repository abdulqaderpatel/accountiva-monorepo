import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Building2,
  Users,
  SlidersHorizontal,
  Palette,
  X,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fonts } from '../theme/typography';
import { OrganizationProfileTab } from './settings/OrganizationProfileTab';
import { TeamMembersTab } from './settings/TeamMembersTab';
import { CustomFieldsTab } from './settings/CustomFieldsTab';
import { BrandingTab } from './settings/BrandingTab';

export type OrgSettingsTab = 'profile' | 'members' | 'custom-fields' | 'branding';

interface OrganizationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: OrgSettingsTab;
}

const TABS: Array<{ id: OrgSettingsTab; label: string; icon: any }> = [
  { id: 'profile', label: 'Profile', icon: Building2 },
  { id: 'members', label: 'Team', icon: Users },
  { id: 'custom-fields', label: 'Custom Fields', icon: SlidersHorizontal },
  { id: 'branding', label: 'Branding', icon: Palette },
];

export function OrganizationSettingsModal({
  visible,
  onClose,
  initialTab = 'profile',
}: OrganizationSettingsModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const [activeTab, setActiveTab] = useState<OrgSettingsTab>(initialTab);

  React.useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView
          style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}
          edges={['top', 'bottom']}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.headerAvatarText, { color: colors.primaryForeground }]}>
                  {currentOrg?.name ? currentOrg.name[0]?.toUpperCase() : 'O'}
                </Text>
              </View>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
                  {currentOrg?.name || 'Organization'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  Workspace Administration
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tab Navigation */}
          <View style={[styles.tabsWrap, { borderBottomColor: colors.border }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScroll}
            >
              {TABS.map((tab) => {
                const isSelected = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    style={[
                      styles.tabItem,
                      {
                        backgroundColor: isSelected ? colors.primary + '16' : 'transparent',
                        borderColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Icon
                      size={15}
                      color={isSelected ? colors.primary : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        {
                          color: isSelected ? colors.primary : colors.mutedForeground,
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

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'profile' && <OrganizationProfileTab />}
            {activeTab === 'members' && <TeamMembersTab />}
            {activeTab === 'custom-fields' && <CustomFieldsTab />}
            {activeTab === 'branding' && <BrandingTab />}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: fonts.bold,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsWrap: {
    borderBottomWidth: 1,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  tabContent: {
    flex: 1,
  },
});


import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Sun, Moon, Building2, Globe, ShieldCheck, LogOut } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { isFeatureEnabled } from '@accountiva/shared';

export function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Building2 size={18} color={colors.foreground} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Acme Technologies</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>Owner • GST Registered</Text>
              </View>
            </View>
            <Badge variant="outline">Default</Badge>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Globe size={18} color={colors.foreground} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Base Currency</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>Indian Rupee (INR - ₹)</Text>
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
          activeOpacity={0.7}
        >
          <LogOut size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  content: {
    padding: 16,
    gap: 8,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
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
  },
  rowSub: {
    fontSize: 11,
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
  },
});

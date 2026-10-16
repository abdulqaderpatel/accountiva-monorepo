import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Palette, Sparkles, FileText, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { fonts } from '../../theme/typography';

export function BrandingTab() {
  const { colors, isDark } = useTheme();
  const { currentOrg } = useAuth();

  const orgName = currentOrg?.name || 'Workspace';
  const initial = orgName.charAt(0).toUpperCase();

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Primary Logo Card */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Palette size={18} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Brand Identity</Text>
        </View>

        <View style={[styles.logoPreviewBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.orgName, { color: colors.foreground }]}>{orgName}</Text>
            <Text style={[styles.orgSub, { color: colors.mutedForeground }]}>
              Base Currency: {currentOrg?.currency || 'INR'}
            </Text>
            <Badge variant="outline" style={{ marginTop: 6, alignSelf: 'flex-start' }}>
              Active Workspace
            </Badge>
          </View>
        </View>

        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Your organization initials and workspace colors are automatically rendered on printed PDF invoices, estimates, and customer share links.
        </Text>
      </Card>

      {/* Invoice Document Theme */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <FileText size={18} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Document Palette</Text>
        </View>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.foreground }]}>
              Clean layout optimized for mobile sharing & thermal printers
            </Text>
          </View>
          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.foreground }]}>
              Compliance with Indian GST rules and international invoices
            </Text>
          </View>
          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.foreground }]}>
              Custom fields printed directly on document body
            </Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  logoPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  orgSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  infoText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
  featuresList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    flex: 1,
  },
});


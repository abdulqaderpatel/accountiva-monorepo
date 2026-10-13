import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { X, Users, Mail, Phone, MapPin, FileText, Building2, CreditCard } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import { fonts } from '../theme/typography';

interface CustomerDetailModalProps {
  visible: boolean;
  customer: any | null;
  onClose: () => void;
  onCreateInvoice?: (customerName: string) => void;
}

export function CustomerDetailModal({
  visible,
  customer,
  onClose,
  onCreateInvoice,
}: CustomerDetailModalProps) {
  const { colors } = useTheme();

  if (!customer) return null;

  const handleCall = () => {
    if (customer.phone) {
      Linking.openURL(`tel:${customer.phone}`).catch(() => {
        Alert.alert('Error', 'Unable to initiate phone call on this device.');
      });
    }
  };

  const handleEmail = () => {
    if (customer.email) {
      Linking.openURL(`mailto:${customer.email}`).catch(() => {
        Alert.alert('Error', 'Unable to open mail client on this device.');
      });
    }
  };

  const handleCreateInvoice = () => {
    onClose();
    if (onCreateInvoice) {
      onCreateInvoice(customer.name);
    }
  };

  const outstanding = Number(customer.outstanding) || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>Customer Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Hero Profile Card */}
            <Card style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                  ]}
                >
                  <Users size={24} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.customerName, { color: colors.foreground }]}>
                    {customer.name}
                  </Text>
                  {customer.company ? (
                    <Text style={[styles.companyName, { color: colors.mutedForeground }]}>
                      {customer.company}
                    </Text>
                  ) : null}
                  <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                    <Badge variant={customer.status === 'Active' ? 'success' : 'outline'}>
                      {customer.status || 'Active'}
                    </Badge>
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.actionRow}>
                {customer.phone ? (
                  <TouchableOpacity
                    style={[styles.quickActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                    onPress={handleCall}
                    activeOpacity={0.7}
                  >
                    <Phone size={15} color={colors.foreground} />
                    <Text style={[styles.quickActionText, { color: colors.foreground }]}>Call</Text>
                  </TouchableOpacity>
                ) : null}

                {customer.email ? (
                  <TouchableOpacity
                    style={[styles.quickActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                    onPress={handleEmail}
                    activeOpacity={0.7}
                  >
                    <Mail size={15} color={colors.foreground} />
                    <Text style={[styles.quickActionText, { color: colors.foreground }]}>Email</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.quickActionBtnPrimary, { backgroundColor: colors.primary }]}
                  onPress={handleCreateInvoice}
                  activeOpacity={0.8}
                >
                  <FileText size={15} color={colors.primaryForeground} />
                  <Text style={[styles.quickActionTextPrimary, { color: colors.primaryForeground }]}>
                    + Invoice
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Financial Overview */}
            <Card style={styles.detailCard}>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>
                  Outstanding Receivables
                </Text>
                <Text
                  style={[
                    styles.balanceValue,
                    { color: outstanding > 0 ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  {formatCurrency(outstanding, 'INR')}
                </Text>
              </View>
            </Card>

            {/* Tax & Legal Info */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Tax & Compliance</Text>
            <Card style={styles.detailCard}>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>GSTIN</Text>
                <Text style={[styles.dataValue, { color: colors.foreground, fontFamily: fonts.semiBold }]}>
                  {customer.gstNumber || customer.gstin || 'Unregistered'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>PAN</Text>
                <Text style={[styles.dataValue, { color: colors.foreground }]}>
                  {customer.pan || 'N/A'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>GST Treatment</Text>
                <Text style={[styles.dataValue, { color: colors.foreground }]}>
                  {customer.gstTreatment || 'Consumer / B2C'}
                </Text>
              </View>
            </Card>

            {/* Address */}
            {customer.billingAddress || customer.address ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  Billing Address
                </Text>
                <Card style={styles.detailCard}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <MapPin size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                    <Text style={[styles.addressText, { color: colors.foreground }]}>
                      {customer.billingAddress || customer.address}
                    </Text>
                  </View>
                </Card>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 36,
  },
  profileCard: {
    padding: 16,
    gap: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  companyName: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  quickActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
  },
  quickActionTextPrimary: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  detailCard: {
    padding: 14,
    gap: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  dataLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontFamily: fonts.regular,
  },
});

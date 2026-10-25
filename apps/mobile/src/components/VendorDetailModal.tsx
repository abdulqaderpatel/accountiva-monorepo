import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import {
  X,
  Building2,
  Trash,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Clock,
  FileText,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { toast, confirm } from '../context/FeedbackContext';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { fonts } from '../theme/typography';
import api from '@accountiva/api';

interface VendorDetailModalProps {
  visible: boolean;
  vendor: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onEdit?: (vendor: any) => void;
  onCreateBill?: (vendor: any) => void;
}

export function VendorDetailModal({
  visible,
  vendor,
  onClose,
  onRefresh,
  onEdit,
  onCreateBill,
}: VendorDetailModalProps) {
  const { colors } = useTheme();

  if (!visible || !vendor) return null;

  const safeName = vendor.name || 'Unnamed Vendor';
  const safeCompany = vendor.company || '';
  const safeEmail = vendor.email || '';
  const safePhone = vendor.phone || '';
  const safeGst = vendor.gst_number || vendor.gstNumber || vendor.gstin || '';
  const safePan = vendor.pan || '';
  const safeAddress = vendor.address || '';
  const safeTerms = vendor.payment_terms || vendor.paymentTerms || 'Net 30';

  const handleCall = () => {
    if (safePhone) {
      Linking.openURL(`tel:${safePhone}`).catch(() => {
        toast.error('Call Failed', 'Unable to initiate phone call on this device.');
      });
    }
  };

  const handleEmail = () => {
    if (safeEmail) {
      Linking.openURL(`mailto:${safeEmail}`).catch(() => {
        toast.error('Email Failed', 'Unable to open mail client on this device.');
      });
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete Vendor',
      message: `Are you sure you want to delete ${safeName}? This will remove them from your vendor list.`,
      confirmText: 'Delete',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          await api.delete(`/vendors/${vendor.id}`);
          toast.success('Vendor Deleted', `${safeName} has been removed.`);
          if (onRefresh) onRefresh();
          onClose();
        } catch (err: any) {
          toast.error('Delete Failed', err.response?.data?.message || err.message || 'Could not delete vendor.');
        }
      },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>Vendor Profile</Text>
            <View style={styles.headerRight}>
              {onEdit && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onEdit(vendor);
                  }}
                  style={styles.iconBtn}
                  activeOpacity={0.7}
                >
                  <Pencil size={18} color={colors.foreground} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7}>
                <Trash size={18} color={colors.destructive} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Hero Profile Card */}
            <Card style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={[styles.avatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Building2 size={24} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.vendorName, { color: colors.foreground }]}>{safeName}</Text>
                  {safeCompany ? (
                    <Text style={[styles.companyName, { color: colors.mutedForeground }]}>
                      {safeCompany}
                    </Text>
                  ) : null}
                  <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                    <Badge variant={safeGst ? 'warning' : 'outline'}>
                      {safeGst ? 'GST Registered' : 'Regular Vendor'}
                    </Badge>
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.actionRow}>
                {safePhone ? (
                  <TouchableOpacity
                    style={[styles.quickActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                    onPress={handleCall}
                    activeOpacity={0.7}
                  >
                    <Phone size={15} color={colors.foreground} />
                    <Text style={[styles.quickActionText, { color: colors.foreground }]}>Call</Text>
                  </TouchableOpacity>
                ) : null}

                {safeEmail ? (
                  <TouchableOpacity
                    style={[styles.quickActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                    onPress={handleEmail}
                    activeOpacity={0.7}
                  >
                    <Mail size={15} color={colors.foreground} />
                    <Text style={[styles.quickActionText, { color: colors.foreground }]}>Email</Text>
                  </TouchableOpacity>
                ) : null}

                {onCreateBill ? (
                  <TouchableOpacity
                    style={[styles.quickActionBtnPrimary, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      onClose();
                      onCreateBill(vendor);
                    }}
                    activeOpacity={0.8}
                  >
                    <FileText size={15} color={colors.primaryForeground} />
                    <Text style={[styles.quickActionTextPrimary, { color: colors.primaryForeground }]}>
                      + Bill
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Card>

            {/* Tax & Compliance */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Tax & Compliance</Text>
            <Card style={styles.detailCard}>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>GSTIN</Text>
                <Text style={[styles.dataValue, { color: colors.foreground, fontFamily: fonts.semiBold }]}>
                  {safeGst || 'Unregistered'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>PAN</Text>
                <Text style={[styles.dataValue, { color: colors.foreground }]}>
                  {safePan || 'N/A'}
                </Text>
              </View>
            </Card>

            {/* Terms */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Payment Terms</Text>
            <Card style={styles.detailCard}>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>Standard Terms</Text>
                <Text style={[styles.dataValue, { color: colors.foreground }]}>{safeTerms}</Text>
              </View>
            </Card>

            {/* Address */}
            {safeAddress ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Supplier Address</Text>
                <Card style={styles.detailCard}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <MapPin size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                    <Text style={[styles.addressText, { color: colors.foreground }]}>{safeAddress}</Text>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
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
  vendorName: {
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
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
  quickActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
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
    marginTop: 4,
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


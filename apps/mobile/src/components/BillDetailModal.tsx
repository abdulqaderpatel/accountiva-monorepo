import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import {
  X,
  FileText,
  Trash,
  Pencil,
  Share2,
  CircleCheck,
  Send,
  Building2,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { toast, confirm } from '../context/FeedbackContext';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import { fonts } from '../theme/typography';
import api from '@accountiva/api';

interface BillDetailModalProps {
  visible: boolean;
  bill: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onEdit?: (bill: any) => void;
}

export function BillDetailModal({
  visible,
  bill,
  onClose,
  onRefresh,
  onEdit,
}: BillDetailModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';

  if (!visible || !bill) return null;

  const rawAmount = Number(bill.amount) || Number(bill.total) || 0;
  const status = String(bill.status || 'Draft').toUpperCase();
  const billNumber = bill.billNumber || bill.number || 'BILL-000';
  const billDate = bill.date || 'Recent';
  const dueDate = bill.dueDate || 'Upon Receipt';
  const vendorName = bill.vendor?.name || bill.vendorName || 'Supplier Entity';
  const vendorEmail = bill.vendor?.email || bill.vendorEmail || '';
  const lineItems: any[] = Array.isArray(bill.items) ? bill.items : [];
  const subtotal = Number(bill.subtotal) || rawAmount;
  const taxPercent = Number(bill.taxPercent) || 0;
  const taxAmount = Number(bill.taxAmount) || 0;

  const isPaid = status === 'PAID';
  const isDraft = status === 'DRAFT';
  const isOverdue = status === 'OVERDUE';
  const badgeVariant = isPaid ? 'success' : isOverdue ? 'destructive' : isDraft ? 'outline' : 'warning';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Accountiva Bill ${billNumber} from ${vendorName} - Total: ${formatCurrency(rawAmount, currency)} (Status: ${status})`,
        title: `Bill ${billNumber}`,
      });
    } catch (err: any) {
      console.log('Error sharing bill:', err.message);
    }
  };

  const handleStatusChange = async (newStatus: 'Outstanding' | 'Paid') => {
    try {
      await api.patch(`/bills/${bill.id}/status`, { status: newStatus });
      toast.success('Status Updated', `Bill marked as ${newStatus}!`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      toast.error('Update Failed', err.response?.data?.message || err.message || 'Could not update status');
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete Bill',
      message: `Are you sure you want to delete bill ${billNumber}? This action cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          await api.delete(`/bills/${bill.id}`);
          toast.success('Bill Deleted', 'Bill was removed.');
          if (onRefresh) onRefresh();
          onClose();
        } catch (err: any) {
          toast.error('Delete Failed', err.response?.data?.message || err.message || 'Could not delete bill');
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
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>{billNumber}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Billed on {billDate}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {isDraft && onEdit && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onEdit(bill);
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
              <TouchableOpacity onPress={handleShare} style={styles.iconBtn} activeOpacity={0.7}>
                <Share2 size={18} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Status & Amount Hero */}
            <Card style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Total Payables</Text>
                  <Text style={[styles.heroAmount, { color: colors.foreground }]}>
                    {formatCurrency(rawAmount, currency)}
                  </Text>
                </View>
                <Badge variant={badgeVariant}>{status}</Badge>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.heroMetaRow}>
                <View>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Due Date</Text>
                  <Text style={[styles.metaValue, { color: colors.foreground }]}>{dueDate}</Text>
                </View>
                {bill.referenceNumber ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Ref Number</Text>
                    <Text style={[styles.metaValue, { color: colors.foreground }]}>
                      {bill.referenceNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>

            {/* Vendor Details */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Vendor / Supplier</Text>
            <Card style={styles.vendorCard}>
              <View style={styles.vendorRow}>
                <View style={[styles.vendorAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Building2 size={16} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.vendorName, { color: colors.foreground }]}>{vendorName}</Text>
                  {vendorEmail ? (
                    <Text style={[styles.vendorSub, { color: colors.mutedForeground }]}>{vendorEmail}</Text>
                  ) : null}
                </View>
              </View>
            </Card>

            {/* Line Items */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Line Items</Text>
            <Card style={styles.itemsCard}>
              {lineItems.length === 0 ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>No items recorded.</Text>
              ) : (
                lineItems.map((item, idx) => (
                  <View key={item.id || idx}>
                    <View style={styles.itemRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.itemName, { color: colors.foreground }]}>
                          {item.name || item.itemName}
                        </Text>
                        <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>
                          {item.quantity || 1} × {formatCurrency(Number(item.rate) || 0, currency)}
                        </Text>
                      </View>
                      <Text style={[styles.itemTotal, { color: colors.foreground }]}>
                        {formatCurrency((item.quantity || 1) * (Number(item.rate) || 0), currency)}
                      </Text>
                    </View>
                    {idx < lineItems.length - 1 ? (
                      <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
                    ) : null}
                  </View>
                ))
              )}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(subtotal, currency)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  GST ({taxPercent}%)
                </Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(taxAmount, currency)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.grandLabel, { color: colors.foreground }]}>Total</Text>
                <Text style={[styles.grandValue, { color: colors.foreground }]}>
                  {formatCurrency(rawAmount, currency)}
                </Text>
              </View>
            </Card>

            {/* Status Quick Actions */}
            <View style={styles.actionRow}>
              {status === 'OUTSTANDING' || status === 'OVERDUE' ? (
                <TouchableOpacity
                  onPress={() => handleStatusChange('Paid')}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.success }]}
                  activeOpacity={0.8}
                >
                  <CircleCheck size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Mark as Paid</Text>
                </TouchableOpacity>
              ) : null}

              {isDraft ? (
                <TouchableOpacity
                  onPress={() => handleStatusChange('Outstanding')}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                >
                  <Send size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                    Finalize Bill
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Notes */}
            {bill.notes ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Notes</Text>
                <Card style={{ padding: 12 }}>
                  <Text style={{ fontSize: 12, fontFamily: fonts.regular, color: colors.foreground, lineHeight: 18 }}>
                    {bill.notes}
                  </Text>
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
  subtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 1,
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
  heroCard: {
    padding: 16,
    gap: 12,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: fonts.display,
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  heroMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: fonts.regular,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  vendorCard: {
    padding: 12,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vendorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  vendorSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  itemsCard: {
    padding: 14,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  itemSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemDivider: {
    height: 1,
    marginVertical: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: 11,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  grandLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  grandValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: fonts.extraBold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 44,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});


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
  Receipt,
  Trash,
  Pencil,
  Share2,
  Calendar,
  CreditCard,
  Building2,
  Tag,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { toast, confirm } from '../context/FeedbackContext';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import { fonts } from '../theme/typography';
import api from '@accountiva/api';

interface ExpenseDetailModalProps {
  visible: boolean;
  expense: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onEdit?: (expense: any) => void;
}

export function ExpenseDetailModal({
  visible,
  expense,
  onClose,
  onRefresh,
  onEdit,
}: ExpenseDetailModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';

  if (!visible || !expense) return null;

  const rawAmount = Number(expense.amount) || 0;
  const expenseDate = expense.date || 'Recent';
  const category = expense.expenseAccount || expense.category || 'General';
  const paidThrough = expense.paidThrough || expense.paymentMethod || 'Bank Account';
  const payee = expense.payee || expense.merchant || expense.vendorName || '';
  const refNum = expense.referenceNumber || expense.reference || '';
  const taxRate = expense.taxRate != null ? Number(expense.taxRate) : 0;
  const taxAmount = expense.taxAmount != null ? Number(expense.taxAmount) : 0;

  const handleShare = async () => {
    try {
      const msg = [
        `EXPENSE RECORD: ${formatCurrency(rawAmount, currency)}`,
        `Date: ${expenseDate}`,
        `Category: ${category}`,
        `Paid Through: ${paidThrough}`,
        payee ? `Payee: ${payee}` : '',
        refNum ? `Reference: ${refNum}` : '',
        taxRate > 0 ? `GST Tax: ${taxRate}% (${formatCurrency(taxAmount, currency)})` : '',
        expense.notes ? `Notes: ${expense.notes}` : '',
      ].filter(Boolean).join('\n');

      await Share.share({
        message: msg,
        title: `Expense - ${category}`,
      });
    } catch (err: any) {
      console.log('Error sharing expense:', err.message);
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete Expense',
      message: `Are you sure you want to delete this expense of ${formatCurrency(rawAmount, currency)}?`,
      confirmText: 'Delete',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          await api.delete(`/expenses/${expense.id}`);
          toast.success('Expense Deleted', 'Expense record was removed.');
          if (onRefresh) onRefresh();
          onClose();
        } catch (err: any) {
          toast.error('Delete Failed', err.response?.data?.message || err.message || 'Could not delete expense.');
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
            <Text style={[styles.title, { color: colors.foreground }]}>Expense Details</Text>
            <View style={styles.headerRight}>
              {onEdit && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onEdit(expense);
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
            {/* Amount Hero Card */}
            <Card style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={[styles.avatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Receipt size={24} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Expense Amount</Text>
                  <Text style={[styles.amountValue, { color: colors.foreground }]}>
                    {formatCurrency(rawAmount, currency)}
                  </Text>
                </View>
                <Badge variant="outline">{category}</Badge>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.metaRow}>
                <View>
                  <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>Expense Date</Text>
                  <Text style={[styles.dataValue, { color: colors.foreground }]}>{expenseDate}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>Paid Through</Text>
                  <Text style={[styles.dataValue, { color: colors.foreground }]}>{paidThrough}</Text>
                </View>
              </View>
            </Card>

            {/* Payee / Vendor */}
            {payee ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Payee / Merchant</Text>
                <Card style={styles.detailCard}>
                  <View style={styles.row}>
                    <Building2 size={16} color={colors.mutedForeground} />
                    <Text style={[styles.detailText, { color: colors.foreground, fontFamily: fonts.semiBold }]}>
                      {payee}
                    </Text>
                  </View>
                </Card>
              </>
            ) : null}

            {/* Tax & Financial Details */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Tax & Details</Text>
            <Card style={styles.detailCard}>
              {refNum ? (
                <>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>Reference / Bill #</Text>
                    <Text style={[styles.dataValue, { color: colors.foreground }]}>{refNum}</Text>
                  </View>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </>
              ) : null}

              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>GST Tax Rate</Text>
                <Text style={[styles.dataValue, { color: colors.foreground }]}>{taxRate}%</Text>
              </View>

              {taxAmount > 0 ? (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>Tax Portion</Text>
                    <Text style={[styles.dataValue, { color: colors.foreground }]}>
                      {formatCurrency(taxAmount, currency)}
                    </Text>
                  </View>
                </>
              ) : null}
            </Card>

            {/* Notes */}
            {expense.notes ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Notes & Purpose</Text>
                <Card style={styles.detailCard}>
                  <Text style={[styles.notesText, { color: colors.foreground }]}>
                    {expense.notes}
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
    gap: 14,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: fonts.display,
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 13,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  notesText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
});


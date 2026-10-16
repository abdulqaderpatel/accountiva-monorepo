import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  ActivityIndicator,
} from 'react-native';
import { toast, confirm } from '../context/FeedbackContext';
import { X, Share2, Users, FileMinus, FileText, Trash, CircleCheck } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { formatCurrency } from '@accountiva/shared';
import { useUpdateCreditNote, useDeleteCreditNote } from '@accountiva/api';
import { fonts } from '../theme/typography';

interface CreditNoteDetailModalProps {
  visible: boolean;
  creditNote: any | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export function CreditNoteDetailModal({
  visible,
  creditNote,
  onClose,
  onRefresh,
}: CreditNoteDetailModalProps) {
  const { colors } = useTheme();
  const updateCreditNoteMutation = useUpdateCreditNote();
  const deleteCreditNoteMutation = useDeleteCreditNote();

  if (!visible || !creditNote) return null;

  const rawAmount = Number(creditNote.amount) || 0;
  const status = String(creditNote.status || 'Open').toUpperCase();

  const clientName = typeof creditNote.customer === 'string'
    ? creditNote.customer
    : typeof creditNote.customer?.name === 'string'
    ? creditNote.customer.name
    : typeof creditNote.customerName === 'string'
    ? creditNote.customerName
    : typeof creditNote.customers?.name === 'string'
    ? creditNote.customers.name
    : 'Client Entity';

  const noteNum = String(creditNote.number || creditNote.creditNoteNumber || 'CN-000');
  const noteDate = String(creditNote.date || 'Recent');

  const isClosed = status === 'CLOSED' || status === 'APPLIED';
  const variant = isClosed ? 'success' : 'warning';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Accountiva Credit Note ${creditNote.number || creditNote.creditNoteNumber} for ${creditNote.customer || creditNote.customerName} - Credit Amount: ${formatCurrency(rawAmount, 'INR')}`,
        title: `Credit Note ${creditNote.number || creditNote.creditNoteNumber}`,
      });
    } catch (err: any) {
      console.log('Error sharing credit note:', err.message);
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete Credit Note',
      message: `Delete credit note ${creditNote.number || creditNote.creditNoteNumber}?`,
      confirmText: 'Delete',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          await deleteCreditNoteMutation.mutateAsync(creditNote.id);
          toast.success('Credit Note Deleted', 'Credit note removed successfully.');
          if (onRefresh) onRefresh();
          onClose();
        } catch (err: any) {
          toast.error('Error', err?.message || 'Failed to delete credit note');
        }
      },
    });
  };

  const handleCloseCredit = async () => {
    try {
      await updateCreditNoteMutation.mutateAsync({
        id: creditNote.id,
        payload: { status: 'Closed' },
      });
      toast.success('Success', 'Credit note marked as settled / closed');
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      toast.error('Error', err?.message || 'Failed to update credit note');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {noteNum}
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Issued on {noteDate}
              </Text>
            </View>
            <View style={styles.headerRight}>
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
            {/* Hero Card */}
            <Card style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Credit Amount</Text>
                  <Text style={[styles.heroAmount, { color: colors.foreground }]}>
                    {formatCurrency(rawAmount, 'INR')}
                  </Text>
                </View>
                <Badge variant={variant}>{status}</Badge>
              </View>
            </Card>

            {/* Customer Details */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Credited To</Text>
            <Card style={styles.clientCard}>
              <View style={styles.clientRow}>
                <View style={[styles.clientAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Users size={16} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clientName, { color: colors.foreground }]}>
                    {clientName}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Note & Reason Details */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Adjustment Details</Text>
            <Card style={styles.detailCard}>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>Adjustment Type</Text>
                <Text style={[styles.dataValue, { color: colors.foreground }]}>
                  Invoice Adjustment / Refund Credit
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>Reason</Text>
                <Text style={[styles.dataValue, { color: colors.foreground }]}>
                  {creditNote.reason || 'Goods returned / pricing adjustment'}
                </Text>
              </View>
            </Card>

            {/* Custom Fields */}
            {creditNote.customFields && typeof creditNote.customFields === 'object' && Object.keys(creditNote.customFields).length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Custom Fields</Text>
                <Card style={{ padding: 12, gap: 8 }}>
                  {Object.entries(creditNote.customFields).map(([k, v], idx, arr) => (
                    <View key={k}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                        <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.mutedForeground }}>{k}</Text>
                        <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.foreground }}>{String(v)}</Text>
                      </View>
                      {idx < arr.length - 1 ? (
                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
                      ) : null}
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            {!isClosed && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={handleCloseCredit}
                  disabled={updateCreditNoteMutation.isPending}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.success }]}
                  activeOpacity={0.8}
                >
                  <CircleCheck size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                    Mark as Settled / Closed
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
    maxHeight: '80%',
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
    marginTop: 2,
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
    padding: 14,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: fonts.display,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  clientCard: {
    padding: 12,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
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
  actionRow: {
    marginTop: 8,
  },
  primaryActionBtn: {
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


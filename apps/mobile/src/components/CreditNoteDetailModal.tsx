import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Share2, Users, FileMinus, FileText, Trash2, CheckCircle2 } from 'lucide-react-native';
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

  if (!creditNote) return null;

  const rawAmount = Number(creditNote.amount) || 0;
  const status = (creditNote.status || 'Open').toUpperCase();
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
    Alert.alert(
      'Delete Credit Note',
      `Delete credit note ${creditNote.number || creditNote.creditNoteNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCreditNoteMutation.mutateAsync(creditNote.id);
              Alert.alert('Deleted', 'Credit note removed');
              if (onRefresh) onRefresh();
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete credit note');
            }
          },
        },
      ]
    );
  };

  const handleCloseCredit = async () => {
    try {
      await updateCreditNoteMutation.mutateAsync({
        id: creditNote.id,
        payload: { status: 'Closed' },
      });
      Alert.alert('Success', 'Credit note marked as settled / closed');
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update credit note');
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
                {creditNote.number || creditNote.creditNoteNumber || 'CN-000'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Issued on {creditNote.date || 'Recent'}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7}>
                <Trash2 size={18} color={colors.destructive} />
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
                    {creditNote.customer || creditNote.customerName || 'Client Entity'}
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

            {!isClosed && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={handleCloseCredit}
                  disabled={updateCreditNoteMutation.isPending}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.success }]}
                  activeOpacity={0.8}
                >
                  <CheckCircle2 size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
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


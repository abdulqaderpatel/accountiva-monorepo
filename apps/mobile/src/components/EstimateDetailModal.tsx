import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { X, Share2, CheckCircle2, XCircle, Users, Calculator, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { formatCurrency } from '@accountiva/shared';
import { useUpdateEstimate, useCreateInvoice } from '@accountiva/api';
import { fonts } from '../theme/typography';

interface EstimateDetailModalProps {
  visible: boolean;
  estimate: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onConvertToInvoice?: () => void;
}

export function EstimateDetailModal({
  visible,
  estimate,
  onClose,
  onRefresh,
  onConvertToInvoice,
}: EstimateDetailModalProps) {
  const { colors } = useTheme();
  const updateEstimateMutation = useUpdateEstimate();
  const createInvoiceMutation = useCreateInvoice();

  if (!estimate) return null;

  const rawAmount = Number(estimate.amount) || 0;
  const rawSubtotal = Number(estimate.subtotal) || rawAmount * 0.847;
  const rawTax = Number(estimate.taxAmount) || rawAmount - rawSubtotal;
  const status = (estimate.status || 'Draft').toUpperCase();

  const isAccepted = status === 'ACCEPTED';
  const isDeclined = status === 'DECLINED';
  const variant = isAccepted ? 'success' : isDeclined ? 'destructive' : 'warning';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Accountiva Quote ${estimate.number || estimate.estimateNumber} for ${estimate.customer || estimate.customerName} - Total: ${formatCurrency(rawAmount, 'INR')}`,
        title: `Quote ${estimate.number || estimate.estimateNumber}`,
      });
    } catch (err: any) {
      console.log('Error sharing quote:', err.message);
    }
  };

  const handleStatusChange = async (newStatus: 'Accepted' | 'Declined') => {
    try {
      await updateEstimateMutation.mutateAsync({
        id: estimate.id,
        payload: { status: newStatus },
      });
      Alert.alert('Status Updated', `Quote marked as ${newStatus}!`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update quote status');
    }
  };

  const handleConvert = async () => {
    try {
      await createInvoiceMutation.mutateAsync({
        customerName: estimate.customer || estimate.customerName,
        dueDate: 'Upon Receipt',
        amount: rawAmount,
        subtotal: rawSubtotal,
        taxAmount: rawTax,
        status: 'Draft',
        items: Array.isArray(estimate.items) && estimate.items.length > 0
          ? estimate.items.map((i: any) => ({
              itemName: i.name || i.itemName,
              quantity: i.quantity || 1,
              rate: Number(i.rate) || 0,
              amount: (i.quantity || 1) * (Number(i.rate) || 0),
            }))
          : [
              {
                itemName: `Converted from Quote ${estimate.number || ''}`,
                quantity: 1,
                rate: rawSubtotal,
                amount: rawSubtotal,
              },
            ],
      });

      // Update estimate to Accepted
      try {
        await updateEstimateMutation.mutateAsync({
          id: estimate.id,
          payload: { status: 'Accepted' },
        });
      } catch {}

      Alert.alert('Invoice Created', 'Quote successfully converted to Invoice Draft!', [
        {
          text: 'OK',
          onPress: () => {
            if (onRefresh) onRefresh();
            onClose();
            if (onConvertToInvoice) onConvertToInvoice();
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('Conversion Failed', err?.message || 'Failed to convert quote to invoice');
    }
  };

  const lineItems: any[] = Array.isArray(estimate.items) && estimate.items.length > 0
    ? estimate.items
    : [
        {
          id: '1',
          name: estimate.description || 'Estimated Supply & Services',
          quantity: 1,
          rate: rawSubtotal,
        },
      ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {estimate.number || estimate.estimateNumber || 'EST-000'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Quote Date: {estimate.date || 'Recent'}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={handleShare} style={styles.iconBtn} activeOpacity={0.7}>
                <Share2 size={18} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Hero Quote Card */}
            <Card style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Estimated Total</Text>
                  <Text style={[styles.heroAmount, { color: colors.foreground }]}>
                    {formatCurrency(rawAmount, 'INR')}
                  </Text>
                </View>
                <Badge variant={variant}>{status}</Badge>
              </View>
            </Card>

            {/* Customer Details */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Prepared For</Text>
            <Card style={styles.clientCard}>
              <View style={styles.clientRow}>
                <View style={[styles.clientAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Users size={16} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clientName, { color: colors.foreground }]}>
                    {estimate.customer || estimate.customerName || 'Client Entity'}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Line Items */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Line Items Breakdown</Text>
            <Card style={styles.itemsCard}>
              {lineItems.map((item, idx) => (
                <View key={item.id || idx}>
                  <View style={styles.itemRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.itemName, { color: colors.foreground }]}>
                        {item.name || item.itemName}
                      </Text>
                      <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>
                        {item.quantity || 1} × {formatCurrency(Number(item.rate) || 0, 'INR')}
                      </Text>
                    </View>
                    <Text style={[styles.itemTotal, { color: colors.foreground }]}>
                      {formatCurrency((item.quantity || 1) * (Number(item.rate) || 0), 'INR')}
                    </Text>
                  </View>
                  {idx < lineItems.length - 1 ? (
                    <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
                  ) : null}
                </View>
              ))}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(rawSubtotal, 'INR')}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>GST (18%)</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(rawTax, 'INR')}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.grandLabel, { color: colors.foreground }]}>Total</Text>
                <Text style={[styles.grandValue, { color: colors.foreground }]}>
                  {formatCurrency(rawAmount, 'INR')}
                </Text>
              </View>
            </Card>

            {/* Quick Actions Row */}
            <View style={styles.actionRow}>
              {!isAccepted && (
                <TouchableOpacity
                  onPress={() => handleStatusChange('Accepted')}
                  disabled={updateEstimateMutation.isPending}
                  style={[styles.actionBtn, { backgroundColor: colors.success }]}
                  activeOpacity={0.8}
                >
                  <CheckCircle2 size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Accept</Text>
                </TouchableOpacity>
              )}

              {!isDeclined && (
                <TouchableOpacity
                  onPress={() => handleStatusChange('Declined')}
                  disabled={updateEstimateMutation.isPending}
                  style={[styles.actionBtn, { backgroundColor: colors.destructive }]}
                  activeOpacity={0.8}
                >
                  <XCircle size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Decline</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleConvert}
                disabled={createInvoiceMutation.isPending}
                style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                  Convert to Invoice
                </Text>
                <ArrowRight size={15} color={colors.primaryForeground} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
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
  divider: {
    height: 1,
    marginVertical: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  grandLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  grandValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: fonts.bold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
});


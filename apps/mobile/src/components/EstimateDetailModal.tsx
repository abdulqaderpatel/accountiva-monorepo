import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import { toast, confirm } from '../context/FeedbackContext';
import { X, Share2, CircleCheck, CircleX, Users, Calculator, ArrowRight, Trash, Pencil } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { formatCurrency } from '@accountiva/shared';
import {
  convertEstimateToInvoice,
  useUpdateEstimateStatus,
  useDeleteEstimate,
} from '@accountiva/api';
import { fonts } from '../theme/typography';
import { useAuth } from '../context/AuthContext';

interface EstimateDetailModalProps {
  visible: boolean;
  estimate: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onEdit?: (estimate: any) => void;
  onConvertToInvoice?: () => void;
}

export function EstimateDetailModal({
  visible,
  estimate,
  onClose,
  onRefresh,
  onEdit,
  onConvertToInvoice,
}: EstimateDetailModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';
  const updateEstimateStatusMutation = useUpdateEstimateStatus();
  const deleteEstimateMutation = useDeleteEstimate();
  const [isConverting, setIsConverting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'Accepted' | 'Declined' | null>(null);

  if (!estimate) return null;

  const rawAmount = Number(estimate.amount) || 0;
  const lineItems: any[] = Array.isArray(estimate.items) ? estimate.items : [];
  const calculatedSubtotal = lineItems.reduce((sum, item) => {
    const lineAmount = Number(item.amount ?? (Number(item.quantity) * Number(item.rate)));
    return sum + (Number.isFinite(lineAmount) ? lineAmount : 0);
  }, 0);
  const rawSubtotal = Number(estimate.subtotal) || calculatedSubtotal;
  const rawTax = Number(estimate.taxAmount) || 0;
  const status = String(estimate.status || 'Draft').toUpperCase();

  const clientName = typeof estimate.customer === 'string'
    ? estimate.customer
    : typeof estimate.customer?.name === 'string'
    ? estimate.customer.name
    : typeof estimate.customerName === 'string'
    ? estimate.customerName
    : typeof estimate.customers?.name === 'string'
    ? estimate.customers.name
    : 'Client Entity';

  const estimateNum = String(estimate.number || estimate.estimateNumber || 'EST-000');
  const estimateDate = String(estimate.date || 'Recent');

  const isAccepted = status === 'ACCEPTED';
  const isDeclined = status === 'DECLINED';
  const isInvoiced = status === 'INVOICED';
  const variant = isAccepted || isInvoiced ? 'success' : isDeclined ? 'destructive' : 'warning';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Accountiva Quote ${estimateNum} for ${clientName} - Total: ${formatCurrency(rawAmount, currency)}`,
        title: `Quote ${estimate.number || estimate.estimateNumber}`,
      });
    } catch (err: any) {
      console.log('Error sharing quote:', err.message);
    }
  };

  const handleStatusChange = async (newStatus: 'Accepted' | 'Declined') => {
    setPendingStatus(newStatus);
    try {
      await updateEstimateStatusMutation.mutateAsync({
        id: estimate.id,
        status: newStatus,
      });
      toast.success('Status Updated', `Quote marked as ${newStatus}!`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(
        'Update Failed',
        err.response?.data?.error || err.response?.data?.message || err?.message || 'Could not update quote status',
      );
    } finally {
      setPendingStatus(null);
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete Quote',
      message: `Delete quote ${estimate.number || estimate.estimateNumber}?`,
      confirmText: 'Delete',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          await deleteEstimateMutation.mutateAsync(estimate.id);
          toast.success('Quote Deleted', 'Quote removed successfully.');
          if (onRefresh) onRefresh();
          onClose();
        } catch (err: any) {
          toast.error('Error', err?.message || 'Failed to delete quote');
        }
      },
    });
  };

  const handleConvert = () => {
    confirm({
      title: 'Convert to Invoice',
      message: `Convert quote ${estimate.number || estimate.estimateNumber} into an Invoice Draft?`,
      confirmText: 'Convert',
      icon: 'check',
      onConfirm: async () => {
        setIsConverting(true);
        try {
          const invoiceDate = new Date().toISOString().split('T')[0];
          const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
          const result = await convertEstimateToInvoice({
            estimateId: estimate.id,
            estimate,
            invoiceDate,
            dueDate,
          });

          if (onRefresh) onRefresh();
          if (result.status === 'complete') {
            toast.success(
              'Invoice Created',
              `Invoice ${result.invoiceNumber} was created and the estimate was marked Invoiced.`,
            );
            onClose();
            if (onConvertToInvoice) onConvertToInvoice();
          } else {
            const statusError = result.error as any;
            const reason =
              statusError?.response?.data?.error ||
              statusError?.response?.data?.message ||
              statusError?.message ||
              'The estimate status could not be updated.';
            toast.warning(
              `Invoice ${result.invoiceNumber} Created`,
              `${reason} The estimate still needs status recovery.`,
            );
          }
        } catch (err: any) {
          toast.error(
            'Conversion Failed',
            err.response?.data?.error || err.response?.data?.message || err?.message || 'Failed to convert quote to invoice',
          );
        } finally {
          setIsConverting(false);
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
              <Text style={[styles.title, { color: colors.foreground }]}>
                {estimateNum}
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Quote Date: {estimateDate}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {status === 'DRAFT' && onEdit && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onEdit(estimate);
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
            {/* Hero Quote Card */}
            <Card style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Estimated Total</Text>
                  <Text style={[styles.heroAmount, { color: colors.foreground }]}>
                    {formatCurrency(rawAmount, currency)}
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
                    {clientName}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Line Items */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Line Items Breakdown</Text>
            <Card style={styles.itemsCard}>
              {lineItems.length === 0 ? (
                <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>No line items recorded.</Text>
              ) : lineItems.map((item, idx) => (
                <View key={item.id || idx}>
                  <View style={styles.itemRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.itemName, { color: colors.foreground }]}>
                        {item.name || item.itemName}
                      </Text>
                      {item.description ? (
                        <Text style={[styles.itemDescription, { color: colors.mutedForeground }]}>
                          {item.description}
                        </Text>
                      ) : null}
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
              ))}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(rawSubtotal, currency)}
                </Text>
              </View>

              {estimate.discountAmount || estimate.discountValue ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    -{formatCurrency(Number(estimate.discountAmount || estimate.discountValue) || 0, currency)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>GST (18%)</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(rawTax, currency)}
                </Text>
              </View>

              {estimate.shippingCharges ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Shipping</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    {formatCurrency(Number(estimate.shippingCharges) || 0, currency)}
                  </Text>
                </View>
              ) : null}

              {estimate.adjustment ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Adjustment</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    {formatCurrency(Number(estimate.adjustment) || 0, currency)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.summaryRow}>
                <Text style={[styles.grandLabel, { color: colors.foreground }]}>Total</Text>
                <Text style={[styles.grandValue, { color: colors.foreground }]}>
                  {formatCurrency(rawAmount, currency)}
                </Text>
              </View>
            </Card>

            {/* Quick Actions Row */}
            <View style={styles.actionRow}>
              {!isAccepted && !isInvoiced && (
                <TouchableOpacity
                  onPress={() => handleStatusChange('Accepted')}
                  disabled={pendingStatus === 'Accepted'}
                  style={[styles.actionBtn, { backgroundColor: colors.success }]}
                  activeOpacity={0.8}
                >
                  <CircleCheck size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Accept</Text>
                </TouchableOpacity>
              )}

              {!isDeclined && !isInvoiced && (
                <TouchableOpacity
                  onPress={() => handleStatusChange('Declined')}
                  disabled={pendingStatus === 'Declined'}
                  style={[styles.actionBtn, { backgroundColor: colors.destructive }]}
                  activeOpacity={0.8}
                >
                  <CircleX size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Decline</Text>
                </TouchableOpacity>
              )}

              {isAccepted ? (
                <TouchableOpacity
                  onPress={handleConvert}
                  disabled={isConverting}
                  style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                    {isConverting ? 'Converting...' : 'Convert to Invoice'}
                  </Text>
                  <ArrowRight size={15} color={colors.primaryForeground} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Notes & Terms */}
            {estimate.notes ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Notes</Text>
                <Card style={{ padding: 12 }}>
                  <Text style={{ fontSize: 12, fontFamily: fonts.regular, color: colors.foreground, lineHeight: 18 }}>
                    {estimate.notes}
                  </Text>
                </Card>
              </>
            ) : null}

            {estimate.termsConditions || estimate.terms ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Terms & Conditions</Text>
                <Card style={{ padding: 12 }}>
                  <Text style={{ fontSize: 12, fontFamily: fonts.regular, color: colors.foreground, lineHeight: 18 }}>
                    {estimate.termsConditions || estimate.terms}
                  </Text>
                </Card>
              </>
            ) : null}

            {/* Custom Fields */}
            {estimate.customFields && typeof estimate.customFields === 'object' && Object.keys(estimate.customFields).length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Custom Fields</Text>
                <Card style={{ padding: 12, gap: 8 }}>
                  {Object.entries(estimate.customFields).map(([k, v], idx, arr) => (
                    <View key={k}>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{k}</Text>
                        <Text style={[styles.summaryValue, { color: colors.foreground }]}>{String(v)}</Text>
                      </View>
                      {idx < arr.length - 1 ? (
                        <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
                      ) : null}
                    </View>
                  ))}
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
  itemDescription: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
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

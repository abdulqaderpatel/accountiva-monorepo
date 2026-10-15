import React from 'react';
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
import { X, Share2, CircleCheck, Users, FileText, Send, Trash, Pencil, Ban } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { formatCurrency, formatDate } from '@accountiva/shared';
import { useUpdateInvoice, useDeleteInvoice } from '@accountiva/api';
import { fonts } from '../theme/typography';

interface InvoiceDetailModalProps {
  visible: boolean;
  invoice: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onEdit?: (invoice: any) => void;
}

export function InvoiceDetailModal({ visible, invoice, onClose, onRefresh, onEdit }: InvoiceDetailModalProps) {
  const { colors } = useTheme();
  const updateInvoiceMutation = useUpdateInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();

  if (!invoice) return null;

  const rawAmount = Number(invoice.amount) || 0;
  const rawSubtotal = Number(invoice.subtotal) || rawAmount * 0.847;
  const rawTax = Number(invoice.taxAmount) || Number(invoice.tax_amount) || rawAmount - rawSubtotal;
  const status = (invoice.status || 'Draft').toUpperCase();

  const isPaid = status === 'PAID';
  const isOverdue = status === 'OVERDUE';
  const isVoid = status === 'VOID';
  const isDraft = status === 'DRAFT';
  const variant = isPaid ? 'success' : isOverdue ? 'destructive' : isVoid ? 'default' : 'warning';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Accountiva Invoice ${invoice.number || invoice.invoiceNumber} for ${invoice.customer || invoice.customerName} - Total: ${formatCurrency(rawAmount, 'INR')}`,
        title: `Invoice ${invoice.number || invoice.invoiceNumber}`,
      });
    } catch (err: any) {
      console.log('Error sharing invoice:', err.message);
    }
  };

  const handleStatusChange = async (newStatus: 'Paid' | 'Sent' | 'Void') => {
    try {
      await updateInvoiceMutation.mutateAsync({
        id: invoice.id,
        payload: { status: newStatus },
      });
      toast.success('Status Updated', `Invoice marked as ${newStatus}!`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update status');
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete Invoice',
      message: `Are you sure you want to delete invoice ${invoice.number || invoice.invoiceNumber}? This action cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          await deleteInvoiceMutation.mutateAsync(invoice.id);
          toast.success('Invoice Deleted', 'Invoice was deleted successfully.');
          if (onRefresh) onRefresh();
          onClose();
        } catch (err: any) {
          toast.error('Delete Failed', err.message || 'Could not delete invoice');
        }
      },
    });
  };

  const handleVoid = () => {
    confirm({
      title: 'Void Invoice',
      message: `Are you sure you want to mark invoice ${invoice.number || invoice.invoiceNumber} as void?`,
      confirmText: 'Void Invoice',
      destructive: true,
      icon: 'alert',
      onConfirm: () => handleStatusChange('Void'),
    });
  };

  const lineItems: any[] = Array.isArray(invoice.items) && invoice.items.length > 0
    ? invoice.items
    : [
        {
          id: '1',
          name: invoice.description || 'Standard Professional Services',
          quantity: 1,
          rate: rawSubtotal,
          amount: rawSubtotal,
        },
      ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {invoice.number || invoice.invoiceNumber || 'INV-000'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Created on {invoice.date || 'Recent'}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {isDraft && onEdit && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onEdit(invoice);
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
                  <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Total Payable</Text>
                  <Text style={[styles.heroAmount, { color: colors.foreground }]}>
                    {formatCurrency(rawAmount, 'INR')}
                  </Text>
                </View>
                <Badge variant={variant}>{status}</Badge>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.heroMetaRow}>
                <View>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Due Date</Text>
                  <Text style={[styles.metaValue, { color: colors.foreground }]}>
                    {invoice.dueDate || 'Upon Receipt'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Payment Terms</Text>
                  <Text style={[styles.metaValue, { color: colors.foreground }]}>Net 15 Days</Text>
                </View>
              </View>
            </Card>

            {/* Customer Details */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Billed To</Text>
            <Card style={styles.clientCard}>
              <View style={styles.clientRow}>
                <View style={[styles.clientAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Users size={16} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clientName, { color: colors.foreground }]}>
                    {invoice.customer || invoice.customerName || 'Client Entity'}
                  </Text>
                  <Text style={[styles.clientSub, { color: colors.mutedForeground }]}>
                    {invoice.email || 'accounts@client.in'}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Line Items Breakdown */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Line Items</Text>
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

            {/* Status Quick Actions */}
            <View style={styles.actionRow}>
              {!isPaid ? (
                <TouchableOpacity
                  onPress={() => handleStatusChange('Paid')}
                  disabled={updateInvoiceMutation.isPending}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.success }]}
                  activeOpacity={0.8}
                >
                  <CircleCheck size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Mark as Paid</Text>
                </TouchableOpacity>
              ) : null}

              {status === 'DRAFT' ? (
                <TouchableOpacity
                  onPress={() => handleStatusChange('Sent')}
                  disabled={updateInvoiceMutation.isPending}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                >
                  <Send size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                    Mark as Sent
                  </Text>
                </TouchableOpacity>
              ) : null}

              {!isPaid && !isVoid ? (
                <TouchableOpacity
                  onPress={handleVoid}
                  disabled={updateInvoiceMutation.isPending}
                  style={[styles.secondaryActionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                  activeOpacity={0.7}
                >
                  <Ban size={15} color={colors.destructive} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryActionText, { color: colors.destructive }]}>
                    Void
                  </Text>
                </TouchableOpacity>
              ) : null}
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
    paddingBottom: 32,
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
  divider: {
    height: 1,
    marginVertical: 12,
  },
  heroMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: fonts.regular,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
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
  clientSub: {
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
    marginVertical: 8,
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
    marginTop: 8,
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
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 16,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

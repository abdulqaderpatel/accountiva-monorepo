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
import { X, Share2, CircleCheck, Users, Send, Trash, Pencil, Eye, FileMinus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { calculateFinancialDocumentSubtotal, formatCurrency, isFeatureEnabled } from '@accountiva/shared';
import { useUpdateInvoiceStatus, useDeleteInvoice } from '@accountiva/api';
import { fonts } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { CreateCreditNoteModal } from './CreateCreditNoteModal';

interface InvoiceDetailModalProps {
  visible: boolean;
  invoice: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onEdit?: (invoice: any) => void;
}

export function InvoiceDetailModal({ visible, invoice, onClose, onRefresh, onEdit }: InvoiceDetailModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';
  const updateInvoiceStatusMutation = useUpdateInvoiceStatus();
  const deleteInvoiceMutation = useDeleteInvoice();

  const [previewVisible, setPreviewVisible] = useState(false);
  const [creditNoteVisible, setCreditNoteVisible] = useState(false);

  if (!invoice) return null;

  const rawAmount = Number(invoice.amount) || 0;
  const lineItems: any[] = Array.isArray(invoice.items) ? invoice.items : [];
  const calculatedSubtotal = calculateFinancialDocumentSubtotal(lineItems);
  const explicitSubtotal = Number(invoice.subtotal);
  const rawSubtotal =
    invoice.subtotal !== null &&
    invoice.subtotal !== undefined &&
    Number.isFinite(explicitSubtotal)
      ? explicitSubtotal
      : calculatedSubtotal;
  const rawTax = Number(invoice.taxAmount) || Number(invoice.tax_amount) || 0;
  const taxPercent = Number(invoice.taxPercent) || 0;
  const status = String(invoice.status || 'Draft').toUpperCase();

  const clientName = typeof invoice.customer === 'string'
    ? invoice.customer
    : typeof invoice.customer?.name === 'string'
    ? invoice.customer.name
    : typeof invoice.customerName === 'string'
    ? invoice.customerName
    : typeof invoice.customers?.name === 'string'
    ? invoice.customers.name
    : 'Client Entity';

  const invoiceNum = String(invoice.number || invoice.invoiceNumber || 'INV-000');
  const invoiceDate = String(invoice.date || 'Recent');
  const invoiceDueDate = String(invoice.dueDate || 'Upon Receipt');
  const paymentTerms =
    typeof invoice.terms === 'string' && invoice.terms.trim()
      ? invoice.terms.trim()
      : 'Not specified';
  const clientEmail = [invoice.email, invoice.customer?.email, invoice.customers?.email]
    .find((value) => typeof value === 'string' && value.trim());

  const isPaid = status === 'PAID';
  const isDraft = status === 'DRAFT';
  const isOutstanding = status === 'OUTSTANDING';
  const variant = isPaid ? 'success' : isOutstanding ? 'warning' : 'outline';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Accountiva Invoice ${invoice.number || invoice.invoiceNumber} for ${clientName} - Total: ${formatCurrency(rawAmount, currency)}`,
        title: `Invoice ${invoice.number || invoice.invoiceNumber}`,
      });
    } catch (err: any) {
      console.log('Error sharing invoice:', err.message);
    }
  };

  const handleStatusChange = async (newStatus: 'Outstanding' | 'Paid') => {
    try {
      await updateInvoiceStatusMutation.mutateAsync({
        id: invoice.id,
        status: newStatus,
      });
      toast.success('Status Updated', `Invoice marked as ${newStatus}!`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(
        'Update Failed',
        err.response?.data?.error || err.response?.data?.message || err.message || 'Could not update status',
      );
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

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {invoiceNum}
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Created on {invoiceDate}
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
              <TouchableOpacity
                onPress={() => setPreviewVisible(true)}
                style={styles.iconBtn}
                activeOpacity={0.7}
                accessibilityLabel="Preview Invoice"
              >
                <Eye size={18} color={colors.foreground} />
              </TouchableOpacity>
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
                    {formatCurrency(rawAmount, currency)}
                  </Text>
                </View>
                <Badge variant={variant}>{status}</Badge>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.heroMetaRow}>
                <View>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Due Date</Text>
                  <Text style={[styles.metaValue, { color: colors.foreground }]}>
                    {invoiceDueDate}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Payment Terms</Text>
                  <Text style={[styles.metaValue, { color: colors.foreground }]}>{paymentTerms}</Text>
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
                    {clientName}
                  </Text>
                  <Text style={[styles.clientSub, { color: colors.mutedForeground }]}>
                    {clientEmail || 'No email provided'}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Line Items Breakdown */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Line Items</Text>
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
                      {formatCurrency(
                        Number.isFinite(Number(item.amount))
                          ? Number(item.amount)
                          : (item.quantity || 1) * (Number(item.rate) || 0),
                        currency,
                      )}
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

              {invoice.discountAmount || invoice.discountValue ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    -{formatCurrency(Number(invoice.discountAmount || invoice.discountValue) || 0, currency)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  GST ({taxPercent}%)
                </Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatCurrency(rawTax, currency)}
                </Text>
              </View>

              {invoice.shippingCharges ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Shipping</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    {formatCurrency(Number(invoice.shippingCharges) || 0, currency)}
                  </Text>
                </View>
              ) : null}

              {invoice.adjustment ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Adjustment</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    {formatCurrency(Number(invoice.adjustment) || 0, currency)}
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

            {/* Status Quick Actions */}
            <View style={styles.actionRow}>
              {isOutstanding ? (
                <TouchableOpacity
                  onPress={() => handleStatusChange('Paid')}
                  disabled={updateInvoiceStatusMutation.isPending}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.success }]}
                  activeOpacity={0.8}
                >
                  <CircleCheck size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Mark as Paid</Text>
                </TouchableOpacity>
              ) : null}

              {status === 'DRAFT' ? (
                <TouchableOpacity
                  onPress={() => handleStatusChange('Outstanding')}
                  disabled={updateInvoiceStatusMutation.isPending}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                >
                  <Send size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                    Finalize Invoice
                  </Text>
                </TouchableOpacity>
              ) : null}

              {isFeatureEnabled('creditNotes') && !isDraft ? (
                <TouchableOpacity
                  onPress={() => setCreditNoteVisible(true)}
                  style={[styles.secondaryActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <FileMinus size={15} color={colors.foreground} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>
                    Issue Credit Note
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Notes & Terms */}
            {invoice.notes ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Notes</Text>
                <Card style={{ padding: 12 }}>
                  <Text style={{ fontSize: 12, fontFamily: fonts.regular, color: colors.foreground, lineHeight: 18 }}>
                    {invoice.notes}
                  </Text>
                </Card>
              </>
            ) : null}

            {invoice.termsConditions || invoice.terms ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Terms & Conditions</Text>
                <Card style={{ padding: 12 }}>
                  <Text style={{ fontSize: 12, fontFamily: fonts.regular, color: colors.foreground, lineHeight: 18 }}>
                    {invoice.termsConditions || invoice.terms}
                  </Text>
                </Card>
              </>
            ) : null}

            {/* Custom Fields */}
            {invoice.customFields && typeof invoice.customFields === 'object' && Object.keys(invoice.customFields).length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Custom Fields</Text>
                <Card style={{ padding: 12, gap: 8 }}>
                  {Object.entries(invoice.customFields).map(([k, v], idx, arr) => (
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

    <InvoicePreviewModal
      visible={previewVisible}
      invoice={invoice}
      onClose={() => setPreviewVisible(false)}
    />

    {isFeatureEnabled('creditNotes') ? (
      <CreateCreditNoteModal
        visible={creditNoteVisible}
        onClose={() => setCreditNoteVisible(false)}
        onSuccess={() => {
          setCreditNoteVisible(false);
          if (onRefresh) onRefresh();
        }}
        initialCreditNote={{
          customerId: invoice.customerId || invoice.customer_id,
          customer: clientName,
          referenceInvoiceId: invoice.id,
          referenceNumber: invoiceNum,
          items: lineItems.map((item: any) => ({
            id: item.id || String(Math.random()),
            name: item.name || item.itemName || 'Item',
            description: item.description || '',
            quantity: Number(item.quantity) || 1,
            rate: Number(item.rate) || 0,
          })),
          notes: `Credit Note issued against invoice ${invoiceNum}`,
        }}
      />
    ) : null}
    </>
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
});

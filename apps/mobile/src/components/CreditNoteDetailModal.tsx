import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Ban,
  FileText,
  Link,
  Pencil,
  Share2,
  Trash,
  Users,
  X,
} from 'lucide-react-native';
import { formatCurrency } from '@accountiva/shared';
import {
  fetchCreditNote,
  useCreditNote,
  useDeleteCreditNote,
  useUpdateCreditNoteStatus,
} from '@accountiva/api';
import { toast, confirm } from '../context/FeedbackContext';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fonts } from '../theme/typography';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';
import { ApplyCreditNoteModal } from './ApplyCreditNoteModal';

interface CreditNoteDetailModalProps {
  visible: boolean;
  creditNote: any | null;
  onClose: () => void;
  onRefresh?: () => void | Promise<void>;
  onEdit?: (creditNote: any) => void;
}

export function CreditNoteDetailModal({
  visible,
  creditNote,
  onClose,
  onRefresh,
  onEdit,
}: CreditNoteDetailModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';
  const detailQuery = useCreditNote(visible && creditNote?.id ? creditNote.id : '');
  const updateStatusMutation = useUpdateCreditNoteStatus();
  const deleteMutation = useDeleteCreditNote();
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    if (!visible) setApplyOpen(false);
  }, [visible]);

  if (!visible || !creditNote) return null;

  const detail: any = detailQuery.data || creditNote;
  const amount = Number(detail.amount) || 0;
  const remainingAmount = Number(
    detail.remainingAmount ?? (String(detail.status || '').toLowerCase() === 'closed' ? 0 : amount),
  ) || 0;
  const status = String(detail.status || 'Draft').toUpperCase();
  const items: any[] = Array.isArray(detail.items) ? detail.items : [];
  const applications: any[] = Array.isArray(detail.applications) ? detail.applications : [];
  const subtotal = Number(detail.subtotal) || items.reduce(
    (sum, item) => sum + Number(item.amount ?? (Number(item.quantity) * Number(item.rate))),
    0,
  );

  const clientName = typeof detail.customer === 'string'
    ? detail.customer
    : detail.customer?.name || detail.customerName || detail.customers?.name || 'Client Entity';
  const noteNumber = String(detail.creditNoteNumber || detail.number || 'CN-000');
  const customerId = String(detail.customerId || detail.customer_id || '');
  const isDraft = status === 'DRAFT';
  const isOpen = status === 'OPEN';
  const hasFullDetail = Boolean(detailQuery.data);
  const isUntouchedOpen = isOpen && remainingAmount >= amount && applications.length === 0;
  const variant = status === 'CLOSED'
    ? 'success'
    : status === 'VOID'
      ? 'destructive'
      : status === 'OPEN'
        ? 'warning'
        : 'outline';

  const handleShare = async () => {
    try {
      await Share.share({
        title: `Credit Note ${noteNumber}`,
        message: `Accountiva Credit Note ${noteNumber} for ${clientName} - Credit Amount: ${formatCurrency(amount, currency)}`,
      });
    } catch (error: any) {
      toast.error('Share Failed', error.message || 'Could not share this credit note.');
    }
  };

  const changeStatus = (nextStatus: 'Open' | 'Void') => {
    confirm({
      title: nextStatus === 'Open' ? 'Open Credit Note' : 'Void Credit Note',
      message: nextStatus === 'Open'
        ? `Issue ${noteNumber} and make its credit available?`
        : `Void ${noteNumber}? Its unused credit will no longer be available.`,
      confirmText: nextStatus === 'Open' ? 'Open' : 'Void',
      destructive: nextStatus === 'Void',
      icon: nextStatus === 'Void' ? 'alert' : 'check',
      onConfirm: async () => {
        try {
          await updateStatusMutation.mutateAsync({ id: detail.id, status: nextStatus });
          toast.success('Status Updated', `${noteNumber} is now ${nextStatus}.`);
          await detailQuery.refetch();
          await onRefresh?.();
        } catch (error: any) {
          toast.error(
            'Status Update Failed',
            error.response?.data?.error || error.response?.data?.message || error.message || 'Could not update the credit note.',
          );
        }
      },
    });
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete Credit Note',
      message: applications.length > 0
        ? `Delete ${noteNumber}? Existing applications will be released and invoice balances may change.`
        : `Delete ${noteNumber}? It will be moved to trash.`,
      confirmText: 'Delete',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(detail.id);
          toast.success('Credit Note Deleted', `${noteNumber} was moved to trash.`);
          await onRefresh?.();
          onClose();
        } catch (error: any) {
          toast.error('Delete Failed', error.response?.data?.error || error.message || 'Failed to delete credit note.');
        }
      },
    });
  };

  const refreshCreditBalance = async () => {
    const refreshed: any = await fetchCreditNote(detail.id);
    await detailQuery.refetch();
    await onRefresh?.();
    return Number(refreshed.remainingAmount) || 0;
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]}>{noteNumber}</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Issued on {detail.date || '—'}</Text>
              </View>
              <View style={styles.headerActions}>
                {isDraft && hasFullDetail && onEdit ? (
                  <TouchableOpacity onPress={() => { onClose(); onEdit(detail); }} style={styles.iconButton}>
                    <Pencil size={18} color={colors.foreground} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
                  <Trash size={18} color={colors.destructive} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void handleShare()} style={styles.iconButton}>
                  <Share2 size={18} color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                  <X size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {detailQuery.isLoading && !detailQuery.data ? (
                <View style={{ gap: 6, marginBottom: 12 }}>
                  <Skeleton width="100%" height={16} borderRadius={4} />
                  <Skeleton width="60%" height={12} borderRadius={4} />
                </View>
              ) : null}
              {detailQuery.isError && !detailQuery.data ? (
                <TouchableOpacity onPress={() => void detailQuery.refetch()} style={[styles.detailError, { backgroundColor: colors.card, borderColor: colors.destructive }]}>
                  <Text style={[styles.detailErrorText, { color: colors.destructive }]}>Could not load complete details. Tap to retry before taking an action.</Text>
                </TouchableOpacity>
              ) : null}

              <Card style={styles.heroCard}>
                <View style={styles.heroTop}>
                  <View>
                    <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Credit Amount</Text>
                    <Text style={[styles.heroAmount, { color: colors.foreground }]}>{formatCurrency(amount, currency)}</Text>
                    <Text style={[styles.balanceText, { color: colors.mutedForeground }]}>Remaining {formatCurrency(remainingAmount, currency)}</Text>
                  </View>
                  <Badge variant={variant}>{status}</Badge>
                </View>
              </Card>

              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Credited To</Text>
              <Card style={styles.clientCard}>
                <View style={styles.clientRow}>
                  <View style={[styles.clientIcon, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}><Users size={16} color={colors.foreground} /></View>
                  <Text style={[styles.clientName, { color: colors.foreground }]}>{clientName}</Text>
                </View>
              </Card>

              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Line Items</Text>
              <Card style={styles.itemsCard}>
                {items.length === 0 ? (
                  <Text style={[styles.helper, { color: colors.mutedForeground }]}>No line items recorded.</Text>
                ) : items.map((item, index) => (
                  <View key={item.id || index}>
                    <View style={styles.itemRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={[styles.itemName, { color: colors.foreground }]}>{item.itemName || item.name || 'Item'}</Text>
                        {item.description ? <Text style={[styles.helper, { color: colors.mutedForeground }]}>{item.description}</Text> : null}
                        <Text style={[styles.helper, { color: colors.mutedForeground }]}>{Number(item.quantity) || 0} × {formatCurrency(Number(item.rate) || 0, currency)}</Text>
                      </View>
                      <Text style={[styles.itemAmount, { color: colors.foreground }]}>{formatCurrency(Number(item.amount) || (Number(item.quantity) * Number(item.rate)), currency)}</Text>
                    </View>
                    {index < items.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
                  </View>
                ))}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <SummaryRow label="Subtotal" value={formatCurrency(subtotal, currency)} colors={colors} />
                {Number(detail.discountAmount) > 0 ? <SummaryRow label="Discount" value={`-${formatCurrency(Number(detail.discountAmount), currency)}`} colors={colors} /> : null}
                {Number(detail.taxAmount) > 0 ? <SummaryRow label="Tax" value={formatCurrency(Number(detail.taxAmount), currency)} colors={colors} /> : null}
                {Number(detail.adjustment) !== 0 ? <SummaryRow label="Adjustment" value={formatCurrency(Number(detail.adjustment), currency)} colors={colors} /> : null}
                <SummaryRow label="Total" value={formatCurrency(amount, currency)} colors={colors} strong />
              </Card>

              {detail.notes ? (
                <><Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Reason / Notes</Text><Card style={styles.textCard}><Text style={[styles.bodyText, { color: colors.foreground }]}>{detail.notes}</Text></Card></>
              ) : null}

              {detail.referenceInvoiceId || detail.referenceNumber ? (
                <><Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>References</Text><Card style={styles.textCard}>{detail.referenceNumber ? <SummaryRow label="Reference" value={String(detail.referenceNumber)} colors={colors} /> : null}{detail.referenceInvoiceId ? <SummaryRow label="Invoice ID" value={String(detail.referenceInvoiceId)} colors={colors} /> : null}</Card></>
              ) : null}

              {applications.length > 0 ? (
                <><Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Application History</Text><Card style={styles.itemsCard}>{applications.map((application, index) => <View key={application.id || index}><View style={styles.applicationRow}><FileText size={15} color={colors.foreground} /><View style={{ flex: 1 }}><Text style={[styles.itemName, { color: colors.foreground }]}>{application.invoiceNumber || 'Invoice'}</Text><Text style={[styles.helper, { color: colors.mutedForeground }]}>{application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : ''}</Text></View><Text style={[styles.itemAmount, { color: colors.success }]}>{formatCurrency(Number(application.amountApplied) || 0, currency)}</Text></View>{index < applications.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}</View>)}</Card></>
              ) : null}

              {detail.customFields && Object.keys(detail.customFields).length > 0 ? (
                <><Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Custom Fields</Text><Card style={styles.textCard}>{Object.entries(detail.customFields).map(([key, value]) => <SummaryRow key={key} label={key} value={String(value)} colors={colors} />)}</Card></>
              ) : null}

              <View style={styles.actionRow}>
                {isDraft && hasFullDetail ? (
                  <TouchableOpacity onPress={() => changeStatus('Open')} disabled={updateStatusMutation.isPending} style={[styles.primaryAction, { backgroundColor: colors.primary }]}><Text style={[styles.actionText, { color: colors.primaryForeground }]}>Open Credit Note</Text></TouchableOpacity>
                ) : null}
                {isOpen && hasFullDetail && remainingAmount > 0 ? (
                  <TouchableOpacity onPress={() => setApplyOpen(true)} style={[styles.primaryAction, { backgroundColor: colors.primary }]}><Link size={15} color={colors.primaryForeground} /><Text style={[styles.actionText, { color: colors.primaryForeground }]}>Apply to Invoice</Text></TouchableOpacity>
                ) : null}
                {hasFullDetail && isUntouchedOpen ? (
                  <TouchableOpacity onPress={() => changeStatus('Void')} disabled={updateStatusMutation.isPending} style={[styles.secondaryAction, { borderColor: colors.destructive }]}><Ban size={15} color={colors.destructive} /><Text style={[styles.actionText, { color: colors.destructive }]}>Void</Text></TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ApplyCreditNoteModal
        visible={applyOpen}
        creditNote={customerId ? { id: detail.id, creditNoteNumber: noteNumber, customerId, amount, remainingAmount } : null}
        onClose={() => setApplyOpen(false)}
        onApplied={async () => { await detailQuery.refetch(); await onRefresh?.(); }}
        refreshCreditBalance={refreshCreditBalance}
      />
    </>
  );
}

function SummaryRow({ label, value, colors, strong = false }: { label: string; value: string; colors: any; strong?: boolean }) {
  return <View style={styles.summaryRow}><Text style={[strong ? styles.strongLabel : styles.summaryLabel, { color: strong ? colors.foreground : colors.mutedForeground }]}>{label}</Text><Text style={[strong ? styles.strongValue : styles.summaryValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 16, fontFamily: fonts.display, fontWeight: '700' },
  subtitle: { fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { padding: 4 },
  content: { padding: 16, paddingBottom: 36, gap: 12 },
  loading: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 8 },
  detailError: { borderWidth: 1, borderRadius: 10, padding: 10 },
  detailErrorText: { fontSize: 11, fontFamily: fonts.medium, textAlign: 'center' },
  helper: { fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  heroCard: { padding: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { fontSize: 11, fontFamily: fonts.semiBold, textTransform: 'uppercase' },
  heroAmount: { fontSize: 22, fontFamily: fonts.display, fontWeight: '800', marginTop: 4 },
  balanceText: { fontSize: 11, fontFamily: fonts.regular, marginTop: 4 },
  sectionTitle: { fontSize: 11, fontFamily: fonts.semiBold, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  clientCard: { padding: 12 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clientIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  clientName: { fontSize: 13, fontFamily: fonts.semiBold },
  itemsCard: { padding: 14, gap: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  itemName: { fontSize: 12, fontFamily: fonts.semiBold },
  itemAmount: { fontSize: 12, fontFamily: fonts.bold },
  divider: { height: 1, marginVertical: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 3 },
  summaryLabel: { fontSize: 12, fontFamily: fonts.regular },
  summaryValue: { fontSize: 12, fontFamily: fonts.semiBold, maxWidth: '65%' },
  strongLabel: { fontSize: 14, fontFamily: fonts.bold },
  strongValue: { fontSize: 14, fontFamily: fonts.bold },
  textCard: { padding: 12, gap: 6 },
  bodyText: { fontSize: 12, fontFamily: fonts.regular, lineHeight: 18 },
  applicationRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 2 },
  actionRow: { gap: 8, marginTop: 4 },
  primaryAction: { minHeight: 43, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  secondaryAction: { minHeight: 43, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  actionText: { fontSize: 12, fontFamily: fonts.bold },
});

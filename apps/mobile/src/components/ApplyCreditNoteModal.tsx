import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, FileText, Link, X } from 'lucide-react-native';
import { formatCurrency } from '@accountiva/shared';
import { useApplyCreditNote, useInvoices } from '@accountiva/api';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/FeedbackContext';
import { fonts } from '../theme/typography';

interface ApplicableCreditNote {
  id: string;
  creditNoteNumber: string;
  customerId: string;
  amount: number;
  remainingAmount: number;
}

interface ApplyCreditNoteModalProps {
  visible: boolean;
  creditNote: ApplicableCreditNote | null;
  onClose: () => void;
  onApplied: () => void | Promise<void>;
  refreshCreditBalance: () => Promise<number>;
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  outstandingAmount: number;
}

function reportedOutstandingAmount(invoice: any): number {
  const explicitBalance = [
    invoice.remainingAmount,
    invoice.outstandingAmount,
    invoice.balanceDue,
  ].map(Number).find(Number.isFinite);
  if (explicitBalance !== undefined) return Math.max(0, explicitBalance);

  const applications = invoice.creditNoteApplications || invoice.credit_note_applications || [];
  const applied = Array.isArray(applications)
    ? applications.reduce(
        (sum: number, application: any) =>
          sum + Number(application.amountApplied ?? application.amount_applied ?? 0),
        0,
      )
    : 0;
  return Math.max(0, Number(invoice.amount) - applied);
}

export function ApplyCreditNoteModal({
  visible,
  creditNote,
  onClose,
  onApplied,
  refreshCreditBalance,
}: ApplyCreditNoteModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [availableCredit, setAvailableCredit] = useState(0);
  const { data: apiInvoices, refetch: refetchInvoices, isLoading } = useInvoices({
    status: 'Outstanding',
    limit: 100,
  });
  const applyMutation = useApplyCreditNote();

  const invoices = useMemo<InvoiceOption[]>(() => {
    const raw = Array.isArray(apiInvoices)
      ? apiInvoices
      : Array.isArray(apiInvoices?.data)
        ? apiInvoices.data
        : Array.isArray(apiInvoices?.invoices)
          ? apiInvoices.invoices
          : [];

    return raw
      .filter(
        (invoice: any) =>
          creditNote &&
          invoice.customerId === creditNote.customerId &&
          String(invoice.status || '').toLowerCase() !== 'paid',
      )
      .map((invoice: any): InvoiceOption => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber || 'Invoice',
        outstandingAmount: reportedOutstandingAmount(invoice),
      }))
      .filter((invoice: InvoiceOption) => invoice.outstandingAmount > 0);
  }, [apiInvoices, creditNote]);

  const selectedInvoice = invoices.find((invoice: InvoiceOption) => invoice.id === selectedInvoiceId);
  const maximumAmount = selectedInvoice
    ? Math.min(availableCredit, selectedInvoice.outstandingAmount)
    : availableCredit;

  useEffect(() => {
    if (!visible || !creditNote) return;
    setSelectedInvoiceId('');
    setAmount('');
    setAvailableCredit(Number(creditNote.remainingAmount) || 0);
  }, [creditNote, visible]);

  const selectInvoice = (invoice: InvoiceOption) => {
    setSelectedInvoiceId(invoice.id);
    setAmount(String(Math.min(availableCredit, invoice.outstandingAmount)));
  };

  const handleApply = async () => {
    if (!creditNote || !selectedInvoice) {
      toast.error('Invoice Required', 'Select an outstanding invoice for this customer.');
      return;
    }

    const amountApplied = Number(amount);
    if (!Number.isFinite(amountApplied) || amountApplied <= 0) {
      toast.error('Invalid Amount', 'Enter a positive credit amount.');
      return;
    }
    if (amountApplied > maximumAmount) {
      toast.error('Amount Too High', `The maximum available amount is ${formatCurrency(maximumAmount, currency)}.`);
      return;
    }

    try {
      await applyMutation.mutateAsync({
        id: creditNote.id,
        payload: { invoiceId: selectedInvoice.id, amountApplied },
      });
      toast.success('Credit Applied', `${formatCurrency(amountApplied, currency)} was applied successfully.`);
      await onApplied();
      onClose();
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to apply credit note.';
      if (error.response?.status === 409) {
        const [, refreshedBalance] = await Promise.all([
          refetchInvoices(),
          refreshCreditBalance(),
        ]);
        setAvailableCredit(Number(refreshedBalance) || 0);
        toast.warning('Balances Changed', `${message} Review the retained amount and try again.`);
        return;
      }
      toast.error('Application Failed', message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>Apply Credit to Invoice</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{creditNote?.creditNoteNumber}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Available Credit</Text>
              <Text style={[styles.balanceValue, { color: colors.foreground }]}>{formatCurrency(availableCredit, currency)}</Text>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Outstanding invoice *</Text>
            {isLoading ? (
              <View style={styles.loadingRow}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.helper, { color: colors.mutedForeground }]}>Loading invoices...</Text></View>
            ) : invoices.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FileText size={22} color={colors.mutedForeground} />
                <Text style={[styles.helper, { color: colors.mutedForeground }]}>No outstanding invoices found for this customer.</Text>
              </View>
            ) : (
              <FlatList
                data={invoices}
                keyExtractor={(invoice) => invoice.id}
                style={styles.invoiceList}
                renderItem={({ item }) => {
                  const selected = item.id === selectedInvoiceId;
                  return (
                    <TouchableOpacity
                      onPress={() => selectInvoice(item)}
                      style={[styles.invoiceRow, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]}
                    >
                      <View><Text style={[styles.invoiceNumber, { color: colors.foreground }]}>{item.invoiceNumber}</Text><Text style={[styles.helper, { color: colors.mutedForeground }]}>Outstanding {formatCurrency(item.outstandingAmount, currency)}</Text></View>
                      {selected ? <Check size={18} color={colors.primary} /> : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {selectedInvoice ? (
              <View style={styles.amountGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Amount to apply *</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.amountInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                />
                <Text style={[styles.helper, { color: colors.mutedForeground }]}>Maximum {formatCurrency(maximumAmount, currency)} based on both available balances.</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose} disabled={applyMutation.isPending} style={[styles.cancelButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleApply()}
                disabled={!selectedInvoice || maximumAmount <= 0 || applyMutation.isPending}
                style={[styles.applyButton, { backgroundColor: colors.primary }, !selectedInvoice || maximumAmount <= 0 || applyMutation.isPending ? styles.disabled : null]}
              >
                {applyMutation.isPending ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <><Link size={15} color={colors.primaryForeground} /><Text style={[styles.applyText, { color: colors.primaryForeground }]}>Apply Credit</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 15, fontFamily: fonts.bold },
  subtitle: { fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  closeButton: { padding: 4 },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  balanceCard: { borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 11, fontFamily: fonts.semiBold, textTransform: 'uppercase' },
  balanceValue: { fontSize: 15, fontFamily: fonts.bold },
  label: { fontSize: 11, fontFamily: fonts.semiBold, textTransform: 'uppercase', letterSpacing: 0.4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 22 },
  emptyState: { borderWidth: 1, borderRadius: 10, padding: 18, alignItems: 'center', gap: 8 },
  helper: { fontSize: 11, fontFamily: fonts.regular },
  invoiceList: { maxHeight: 210 },
  invoiceRow: { minHeight: 58, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invoiceNumber: { fontSize: 13, fontFamily: fonts.semiBold, marginBottom: 2 },
  amountGroup: { gap: 6 },
  amountInput: { height: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 11, fontSize: 13, fontFamily: fonts.medium },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelButton: { flex: 1, height: 42, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 12, fontFamily: fonts.semiBold },
  applyButton: { flex: 1, height: 42, borderRadius: 10, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontSize: 12, fontFamily: fonts.bold },
  disabled: { opacity: 0.55 },
});

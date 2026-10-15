import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { toast, confirm } from '../context/FeedbackContext';
import {
  X,
  Users,
  Mail,
  Phone,
  MapPin,
  FileText,
  Building,
  Trash,
  Pencil,
  Plus,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import { useDeleteCustomer, useInvoices } from '@accountiva/api';
import { fonts } from '../theme/typography';

interface CustomerDetailModalProps {
  visible: boolean;
  customer: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onEdit?: (customer: any) => void;
  onCreateInvoice?: (customerName: string) => void;
  onViewInvoice?: (invoice: any) => void;
}

export function formatAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') {
    const trimmed = addr.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return formatAddress(parsed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (typeof addr === 'object') {
    const parts = [
      addr.street || addr.address || addr.addressLine1 || addr.address_line1 || addr.line1,
      addr.addressLine2 || addr.address_line2 || addr.line2,
      addr.city,
      addr.state,
      addr.postalCode || addr.postal_code || addr.zip || addr.zipCode,
      addr.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  }
  return String(addr);
}

export function CustomerDetailModal({
  visible,
  customer,
  onClose,
  onRefresh,
  onEdit,
  onCreateInvoice,
  onViewInvoice,
}: CustomerDetailModalProps) {
  const { colors } = useTheme();
  const deleteCustomerMutation = useDeleteCustomer();
  const { data: apiInvoices } = useInvoices();

  const safeName = typeof customer?.name === 'string' ? customer.name : String(customer?.name || 'Unnamed Customer');
  const safeCompany = typeof customer?.company === 'string' ? customer.company : '';
  const safeEmail = typeof customer?.email === 'string' ? customer.email : '';
  const safePhone = typeof customer?.phone === 'string' ? customer.phone : '';
  const safeStatus = typeof customer?.status === 'string' ? customer.status : 'Active';
  const safeGst = typeof customer?.gstNumber === 'string' ? customer.gstNumber : String(customer?.gstNumber || customer?.gstin || '');
  const safePan = typeof customer?.pan === 'string' ? customer.pan : String(customer?.pan || '');
  const safeGstTreatment = typeof customer?.gstTreatment === 'string' ? customer.gstTreatment : '';
  const safeBillingAddress = formatAddress(customer?.billingAddress || customer?.address);
  const outstanding = Number(customer?.outstanding) || 0;

  // Filter invoices for this customer (Unconditionally called on every render to obey Rules of Hooks)
  const customerInvoices = useMemo(() => {
    if (!customer) return [];

    const rawList: any[] = Array.isArray(apiInvoices)
      ? apiInvoices
      : Array.isArray(apiInvoices?.data)
      ? apiInvoices.data
      : [];

    const custName = safeName.toLowerCase();
    const custId = customer.id ? String(customer.id) : '';

    return rawList
      .filter((inv) => {
        if (!inv || typeof inv !== 'object') return false;

        const invCust = (
          typeof inv.customer === 'string'
            ? inv.customer
            : typeof inv.customer?.name === 'string'
            ? inv.customer.name
            : typeof inv.customerName === 'string'
            ? inv.customerName
            : typeof inv.customers?.name === 'string'
            ? inv.customers.name
            : ''
        ).toLowerCase();

        const invCustId = String(
          inv.customerId || inv.customer_id || inv.customer?.id || inv.customers?.id || ''
        );

        return (custName && invCust.includes(custName)) || (custId && invCustId === custId);
      })
      .map((inv) => ({
        id: String(inv.id || Math.random()),
        number: String(inv.number || inv.invoiceNumber || inv.invoice_number || 'INV-000'),
        date: String(inv.date || inv.issueDate || inv.issue_date || 'Recent'),
        dueDate: inv.dueDate || inv.due_date,
        amount: Number(inv.amount) || Number(inv.total) || 0,
        status: String(inv.status || 'Draft').toUpperCase(),
        customer:
          typeof inv.customer === 'string'
            ? inv.customer
            : typeof inv.customer?.name === 'string'
            ? inv.customer.name
            : typeof inv.customerName === 'string'
            ? inv.customerName
            : typeof inv.customers?.name === 'string'
            ? inv.customers.name
            : safeName,
        raw: inv,
      }));
  }, [apiInvoices, customer, safeName]);

  if (!visible || !customer) return null;

  const handleCall = () => {
    if (safePhone) {
      Linking.openURL(`tel:${safePhone}`).catch(() => {
        toast.error('Call Failed', 'Unable to initiate phone call on this device.');
      });
    }
  };

  const handleEmail = () => {
    if (safeEmail) {
      Linking.openURL(`mailto:${safeEmail}`).catch(() => {
        toast.error('Email Failed', 'Unable to open mail client on this device.');
      });
    }
  };

  const handleCreateInvoice = () => {
    onClose();
    if (onCreateInvoice) {
      onCreateInvoice(safeName);
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete Customer',
      message: `Are you sure you want to delete ${safeName}? This will remove them from your customer list.`,
      confirmText: 'Delete',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          await deleteCustomerMutation.mutateAsync(customer.id);
          toast.success('Customer Deleted', `${safeName} has been removed.`);
          if (onRefresh) onRefresh();
          onClose();
        } catch (err: any) {
          toast.error('Error', err?.message || 'Failed to delete customer');
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
            <Text style={[styles.title, { color: colors.foreground }]}>Customer Details</Text>
            <View style={styles.headerRight}>
              {onEdit && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onEdit(customer);
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
              <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Hero Profile Card */}
            <Card style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                  ]}
                >
                  <Users size={24} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.customerName, { color: colors.foreground }]}>
                    {safeName}
                  </Text>
                  {safeCompany ? (
                    <Text style={[styles.companyName, { color: colors.mutedForeground }]}>
                      {safeCompany}
                    </Text>
                  ) : null}
                  <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                    <Badge variant={safeStatus === 'Active' || safeStatus === 'GST Registered' ? 'success' : 'outline'}>
                      {safeStatus}
                    </Badge>
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.actionRow}>
                {safePhone ? (
                  <TouchableOpacity
                    style={[styles.quickActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                    onPress={handleCall}
                    activeOpacity={0.7}
                  >
                    <Phone size={15} color={colors.foreground} />
                    <Text style={[styles.quickActionText, { color: colors.foreground }]}>Call</Text>
                  </TouchableOpacity>
                ) : null}

                {safeEmail ? (
                  <TouchableOpacity
                    style={[styles.quickActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                    onPress={handleEmail}
                    activeOpacity={0.7}
                  >
                    <Mail size={15} color={colors.foreground} />
                    <Text style={[styles.quickActionText, { color: colors.foreground }]}>Email</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.quickActionBtnPrimary, { backgroundColor: colors.primary }]}
                  onPress={handleCreateInvoice}
                  activeOpacity={0.8}
                >
                  <FileText size={15} color={colors.primaryForeground} />
                  <Text style={[styles.quickActionTextPrimary, { color: colors.primaryForeground }]}>
                    + Invoice
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Financial Overview */}
            <Card style={styles.detailCard}>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>
                  Outstanding Receivables
                </Text>
                <Text
                  style={[
                    styles.balanceValue,
                    { color: outstanding > 0 ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  {formatCurrency(outstanding, 'INR')}
                </Text>
              </View>
            </Card>

            {/* Invoices History Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                Invoices Issued ({customerInvoices.length})
              </Text>
              <TouchableOpacity onPress={handleCreateInvoice} activeOpacity={0.7}>
                <Text style={[styles.addInvoiceLink, { color: colors.primary }]}>+ New</Text>
              </TouchableOpacity>
            </View>

            {customerInvoices.length === 0 ? (
              <Card style={styles.emptyInvoicesCard}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No invoices issued to this customer yet.
                </Text>
              </Card>
            ) : (
              <View style={styles.invoicesList}>
                {customerInvoices.map((inv) => {
                  const isPaid = inv.status === 'PAID';
                  const isOverdue = inv.status === 'OVERDUE';
                  const badgeVariant = isPaid ? 'success' : isOverdue ? 'destructive' : 'warning';

                  return (
                    <TouchableOpacity
                      key={inv.id}
                      style={[styles.invoiceItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => {
                        if (onViewInvoice) {
                          onClose();
                          onViewInvoice(inv.raw || inv);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.invoiceLeft}>
                        <View style={[styles.invIconWrap, { backgroundColor: colors.surfaceSubtle }]}>
                          <FileText size={14} color={colors.foreground} />
                        </View>
                        <View>
                          <Text style={[styles.invNumber, { color: colors.foreground }]}>{inv.number}</Text>
                          <Text style={[styles.invDate, { color: colors.mutedForeground }]}>{inv.date}</Text>
                        </View>
                      </View>

                      <View style={styles.invoiceRight}>
                        <Text style={[styles.invAmount, { color: colors.foreground }]}>
                          {formatCurrency(inv.amount, 'INR')}
                        </Text>
                        <Badge variant={badgeVariant}>{inv.status}</Badge>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Tax & Legal Info */}
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Tax & Compliance</Text>
            <Card style={styles.detailCard}>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>GSTIN</Text>
                <Text style={[styles.dataValue, { color: colors.foreground, fontFamily: fonts.semiBold }]}>
                  {safeGst || 'Unregistered'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>PAN</Text>
                <Text style={[styles.dataValue, { color: colors.foreground }]}>
                  {safePan || 'N/A'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>GST Treatment</Text>
                <Text style={[styles.dataValue, { color: colors.foreground }]}>
                  {safeGstTreatment || 'Consumer / B2C'}
                </Text>
              </View>
            </Card>

            {/* Address */}
            {safeBillingAddress ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  Billing Address
                </Text>
                <Card style={styles.detailCard}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <MapPin size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                    <Text style={[styles.addressText, { color: colors.foreground }]}>
                      {safeBillingAddress}
                    </Text>
                  </View>
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
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 36,
  },
  profileCard: {
    padding: 16,
    gap: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  companyName: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  quickActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
  },
  quickActionTextPrimary: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addInvoiceLink: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  emptyInvoicesCard: {
    padding: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  invoicesList: {
    gap: 8,
  },
  invoiceItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  invIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invNumber: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  invDate: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
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
  balanceValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontFamily: fonts.regular,
  },
});

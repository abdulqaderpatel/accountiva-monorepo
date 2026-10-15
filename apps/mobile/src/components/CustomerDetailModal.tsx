import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
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

  if (!customer) return null;

  const handleCall = () => {
    if (customer.phone) {
      Linking.openURL(`tel:${customer.phone}`).catch(() => {
        Alert.alert('Error', 'Unable to initiate phone call on this device.');
      });
    }
  };

  const handleEmail = () => {
    if (customer.email) {
      Linking.openURL(`mailto:${customer.email}`).catch(() => {
        Alert.alert('Error', 'Unable to open mail client on this device.');
      });
    }
  };

  const handleCreateInvoice = () => {
    onClose();
    if (onCreateInvoice) {
      onCreateInvoice(customer.name);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.name}? This will remove them from your customer list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomerMutation.mutateAsync(customer.id);
              Alert.alert('Customer Deleted', `${customer.name} has been removed.`);
              if (onRefresh) onRefresh();
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete customer');
            }
          },
        },
      ]
    );
  };

  const outstanding = Number(customer.outstanding) || 0;

  // Filter invoices for this customer
  const customerInvoices = useMemo(() => {
    const rawList: any[] = Array.isArray(apiInvoices)
      ? apiInvoices
      : Array.isArray(apiInvoices?.data)
      ? apiInvoices.data
      : [];

    const custName = String(customer.name || '').toLowerCase();
    const custId = customer.id;

    return rawList
      .filter((inv) => {
        const invCust = (
          typeof inv.customer === 'string'
            ? inv.customer
            : inv.customer?.name || inv.customerName || inv.customers?.name || ''
        ).toLowerCase();
        const invCustId = inv.customerId || inv.customer_id || inv.customer?.id || inv.customers?.id;
        return (custName && invCust.includes(custName)) || (custId && invCustId === custId);
      })
      .map((inv) => ({
        id: inv.id,
        number: inv.number || inv.invoiceNumber || inv.invoice_number || 'INV-000',
        date: inv.date || inv.issueDate || inv.issue_date || 'Recent',
        dueDate: inv.dueDate || inv.due_date,
        amount: Number(inv.amount) || Number(inv.total) || 0,
        status: (inv.status || 'Draft').toUpperCase(),
        customer:
          typeof inv.customer === 'string'
            ? inv.customer
            : inv.customer?.name || inv.customerName || inv.customers?.name || customer.name,
        raw: inv,
      }));
  }, [apiInvoices, customer]);

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
                    {customer.name}
                  </Text>
                  {customer.company ? (
                    <Text style={[styles.companyName, { color: colors.mutedForeground }]}>
                      {customer.company}
                    </Text>
                  ) : null}
                  <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                    <Badge variant={customer.status === 'Active' ? 'success' : 'outline'}>
                      {customer.status || 'Active'}
                    </Badge>
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.actionRow}>
                {customer.phone ? (
                  <TouchableOpacity
                    style={[styles.quickActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                    onPress={handleCall}
                    activeOpacity={0.7}
                  >
                    <Phone size={15} color={colors.foreground} />
                    <Text style={[styles.quickActionText, { color: colors.foreground }]}>Call</Text>
                  </TouchableOpacity>
                ) : null}

                {customer.email ? (
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
                  {customer.gstNumber || customer.gstin || 'Unregistered'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>PAN</Text>
                <Text style={[styles.dataValue, { color: colors.foreground }]}>
                  {customer.pan || 'N/A'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.mutedForeground }]}>GST Treatment</Text>
                <Text style={[styles.dataValue, { color: colors.foreground }]}>
                  {customer.gstTreatment || 'Consumer / B2C'}
                </Text>
              </View>
            </Card>

            {/* Address */}
            {customer.billingAddress || customer.address ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  Billing Address
                </Text>
                <Card style={styles.detailCard}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <MapPin size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                    <Text style={[styles.addressText, { color: colors.foreground }]}>
                      {customer.billingAddress || customer.address}
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

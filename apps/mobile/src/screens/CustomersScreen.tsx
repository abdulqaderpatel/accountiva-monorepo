import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Search, Plus, Mail, Phone, Users, Upload } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/Skeleton';
import { formatCurrency } from '@accountiva/shared';
import { useCustomers } from '@accountiva/api';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';

import { AddCustomerModal } from '../components/AddCustomerModal';
import { CustomerDetailModal, formatAddress } from '../components/CustomerDetailModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { useAuth } from '../context/AuthContext';

interface CustomersScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

interface CustomerRecord {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  gstNumber?: string;
  pan?: string;
  billingAddress?: string;
  shippingAddress?: string;
  customFields?: any;
  notes?: string;
  gstTreatment?: string;
  status: string;
  outstanding: number;
  variant: 'default' | 'warning' | 'destructive' | 'outline' | 'success';
  [key: string]: any;
}

export type CustomerFilterType = 'all' | 'balance' | 'active' | 'registered';

export function CustomersScreen({ onNavigate }: CustomersScreenProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currentOrgId = currentOrg?.id;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CustomerFilterType>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  // Reset screen-level selections and modals when switching workspace
  React.useEffect(() => {
    setSelectedCustomer(null);
    setEditingCustomer(null);
    setIsAddModalOpen(false);
    setIsImportModalOpen(false);
    setSearch('');
    setFilter('all');
  }, [currentOrgId]);

  const { data: apiCustomers, isLoading, refetch, isRefetching } = useCustomers({
    search: search || undefined,
  });

  const rawList: any[] = Array.isArray(apiCustomers)
    ? apiCustomers
    : Array.isArray(apiCustomers?.data)
    ? apiCustomers.data
    : [];

  const customers: CustomerRecord[] = rawList.map((c: any) => ({
    ...c,
    id: String(c.id || ''),
    name: String(c.name || 'Unnamed Customer'),
    company: typeof c.company === 'string' ? c.company : '',
    email: typeof c.email === 'string' ? c.email : '',
    phone: typeof c.phone === 'string' ? c.phone : '',
    gstNumber: typeof c.gstNumber === 'string' ? c.gstNumber : typeof c.gstin === 'string' ? c.gstin : typeof c.gst_number === 'string' ? c.gst_number : '',
    pan: typeof c.pan === 'string' ? c.pan : '',
    billingAddress: formatAddress(c.billingAddress || c.billing_address || c.address),
    shippingAddress: formatAddress(c.shippingAddress || c.shipping_address),
    customFields: c.customFields || c.custom_fields,
    notes: typeof c.notes === 'string' ? c.notes : '',
    gstTreatment: typeof c.gstTreatment === 'string' ? c.gstTreatment : typeof c.gst_treatment === 'string' ? c.gst_treatment : '',
    status: c.gstTreatment === 'Registered' || c.gst_treatment === 'Registered' ? 'GST Registered' : String(c.gstTreatment || c.gst_treatment || 'Regular'),
    outstanding: Number(c.outstanding) || Number(c.outstandingBalance) || Number(c.opening_balance) || 0,
    variant: c.gstTreatment === 'Registered' || c.gst_treatment === 'Registered' ? 'warning' : 'default',
  }));

  const counts = React.useMemo(() => ({
    all: customers.length,
    balance: customers.filter((c) => c.outstanding > 0).length,
    active: customers.filter((c) => c.status !== 'Inactive').length,
    registered: customers.filter((c) => c.status === 'GST Registered' || Boolean(c.gstNumber)).length,
  }), [customers]);

  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filter === 'balance') return c.outstanding > 0;
      if (filter === 'registered') return c.status === 'GST Registered' || Boolean(c.gstNumber);
      if (filter === 'active') return c.status !== 'Inactive';
      return true;
    });
  }, [customers, search, filter]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Customers</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setIsImportModalOpen(true)}
            style={[styles.importBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.7}
          >
            <Upload size={14} color={colors.foreground} />
            <Text style={[styles.importBtnText, { color: colors.foreground }]}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsAddModalOpen(true)}
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Plus size={16} color={colors.primaryForeground} strokeWidth={2.5} />
            <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search clients, email..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'balance', label: `With Balance (${counts.balance})` },
            { id: 'active', label: `Active (${counts.active})` },
            { id: 'registered', label: `GST Registered (${counts.registered})` },
          ].map((tab) => {
            const isSelected = filter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setFilter(tab.id as CustomerFilterType)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected ? colors.primaryForeground : colors.mutedForeground,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Customer List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {isLoading && !isRefetching ? (
          <SkeletonList count={5} />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'No clients found' : 'No customers yet'}
            description={
              search
                ? 'No customer matches your search query. Try a different name, phone, or email.'
                : 'Add your first customer to your client list to start issuing invoices and estimates.'
            }
            actionLabel={search ? 'Clear search' : 'Add Customer'}
            actionIcon={search ? undefined : Plus}
            onAction={() => {
              if (search) {
                setSearch('');
              } else {
                setIsAddModalOpen(true);
              }
            }}
          />
        ) : (
          filteredCustomers.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setSelectedCustomer(c)}
              activeOpacity={0.7}
            >
              <View style={styles.topRow}>
                <View style={styles.clientAvatarRow}>
                  <View style={[styles.clientAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Users size={16} color={colors.foreground} />
                  </View>
                  <View>
                    <Text style={[styles.clientName, { color: colors.foreground }]}>{c.name}</Text>
                    {c.email ? (
                      <View style={styles.infoRow}>
                        <Mail size={12} color={colors.mutedForeground} />
                        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{c.email}</Text>
                      </View>
                    ) : null}
                    {c.phone ? (
                      <View style={styles.infoRow}>
                        <Phone size={12} color={colors.mutedForeground} />
                        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{c.phone}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Badge variant={c.variant}>{c.status}</Badge>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.bottomRow}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Outstanding Balance</Text>
                <Text
                  style={[
                    styles.balance,
                    { color: c.outstanding > 0 ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  {formatCurrency(c.outstanding, 'INR')}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add / Edit Customer Modal */}
      <AddCustomerModal
        visible={isAddModalOpen || Boolean(editingCustomer)}
        initialCustomer={editingCustomer}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCustomer(null);
        }}
        onSuccess={() => {
          refetch();
          setEditingCustomer(null);
        }}
      />

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        visible={Boolean(selectedCustomer)}
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onRefresh={() => refetch()}
        onEdit={(cust) => setEditingCustomer(cust)}
        onCreateInvoice={() => onNavigate('create_invoice')}
      />

      {/* Bulk CSV Import Modal */}
      <BulkImportModal
        visible={isImportModalOpen}
        entity="customers"
        title="Import Customers"
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          refetch();
          setIsImportModalOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  importBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterWrapper: {
    paddingBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
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
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    fontFamily: fonts.display,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  infoText: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  balance: {
    fontSize: 15,
    fontWeight: '800',
  },
});

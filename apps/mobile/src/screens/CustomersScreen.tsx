import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Search, Plus, Mail, Phone, Users, Building2 } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import { useCustomers } from '@accountiva/api';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';

import { AddCustomerModal } from '../components/AddCustomerModal';

interface CustomersScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  outstanding: number;
  variant: 'default' | 'warning' | 'destructive' | 'outline' | 'success';
}

const FALLBACK_CUSTOMERS: CustomerRecord[] = [
  {
    id: '1',
    name: 'Delta Retail Corp',
    email: 'delta@retailcorp.in',
    phone: '+91 98201 23456',
    status: 'Regular',
    outstanding: 0,
    variant: 'default',
  },
  {
    id: '2',
    name: 'Zephyr Logistics Pvt Ltd',
    email: 'billing@zephyr.co',
    phone: '+91 99123 45678',
    status: 'GST Registered',
    outstanding: 78250,
    variant: 'warning',
  },
  {
    id: '3',
    name: 'Horizon Software Systems',
    email: 'accounts@horizonsoft.com',
    phone: '+91 98450 11223',
    status: 'Overdue',
    outstanding: 42800,
    variant: 'destructive',
  },
];

export function CustomersScreen({ onNavigate }: CustomersScreenProps) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: apiCustomers, isLoading, refetch, isRefetching } = useCustomers({
    search: search || undefined,
  });

  const rawList = Array.isArray(apiCustomers) && apiCustomers.length > 0
    ? apiCustomers
    : (Array.isArray(apiCustomers?.data) && apiCustomers.data.length > 0
        ? apiCustomers.data
        : FALLBACK_CUSTOMERS);

  const customers: CustomerRecord[] = rawList.map((c: any) => ({
    id: c.id,
    name: c.name || 'Unnamed Customer',
    email: c.email || '',
    phone: c.phone || '',
    status: c.gstTreatment === 'Registered' ? 'GST Registered' : (c.gstTreatment || 'Regular'),
    outstanding: Number(c.outstanding) || Number(c.opening_balance) || 0,
    variant: c.gstTreatment === 'Registered' ? 'warning' : 'default',
  }));

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Customers</Text>
        <TouchableOpacity
          onPress={() => setIsAddModalOpen(true)}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.primaryForeground} strokeWidth={2.5} />
          <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>Add</Text>
        </TouchableOpacity>
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading customers...</Text>
          </View>
        ) : filteredCustomers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={32} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No customers found.</Text>
          </View>
        ) : (
          filteredCustomers.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
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

      {/* Add Customer Modal */}
      <AddCustomerModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => refetch()}
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.display,
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
    paddingVertical: 12,
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

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Search, Plus, Mail, Phone } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';

interface CustomersScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export function CustomersScreen({ onNavigate }: CustomersScreenProps) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const customers = [
    {
      id: '1',
      name: 'Delta Retail Corp',
      email: 'delta@retailcorp.in',
      phone: '+91 98201 23456',
      status: 'Regular',
      outstanding: 0,
      variant: 'default' as const,
    },
    {
      id: '2',
      name: 'Zephyr Logistics Pvt Ltd',
      email: 'billing@zephyr.co',
      phone: '+91 99123 45678',
      status: 'GST Registered',
      outstanding: 78250,
      variant: 'warning' as const,
    },
    {
      id: '3',
      name: 'Horizon Software Systems',
      email: 'accounts@horizonsoft.com',
      phone: '+91 98450 11223',
      status: 'Overdue',
      outstanding: 42800,
      variant: 'destructive' as const,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Customers</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.primaryForeground} strokeWidth={2.5} />
          <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={[styles.searchSection, { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            placeholder="Search customer name, email..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>
      </View>

      {/* Customer List Feed */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {customers.map((c) => (
          <View
            key={c.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.customerName, { color: colors.foreground }]}>{c.name}</Text>
                <View style={styles.contactRow}>
                  <Mail size={12} color={colors.mutedForeground} />
                  <Text style={[styles.contactText, { color: colors.mutedForeground }]}>{c.email}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Phone size={12} color={colors.mutedForeground} />
                  <Text style={[styles.contactText, { color: colors.mutedForeground }]}>{c.phone}</Text>
                </View>
              </View>
              <Badge variant={c.variant}>{c.status}</Badge>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.cardFooter}>
              <Text style={[styles.outstandingLabel, { color: colors.mutedForeground }]}>
                Outstanding Receivable
              </Text>
              <Text
                style={[
                  styles.outstandingValue,
                  {
                    color:
                      c.outstanding === 0
                        ? colors.success
                        : c.variant === 'destructive'
                        ? colors.destructive
                        : colors.warning,
                  },
                ]}
              >
                {c.outstanding === 0 ? '₹0.00 (All Paid)' : formatCurrency(c.outstanding, 'INR')}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.bold,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  contactText: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outstandingLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  outstandingValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});


import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Search, Plus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '@accountiva/shared';
import { ScreenType } from '../components/BottomNav';
import { fonts } from '../theme/typography';

interface InvoicesScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export function InvoicesScreen({ onNavigate }: InvoicesScreenProps) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid' | 'overdue'>('all');
  const [search, setSearch] = useState('');

  const invoices = [
    {
      id: '1',
      customer: 'Delta Retail Corp',
      number: 'INV-2026-042',
      date: '12 Oct 2026',
      amount: 35400,
      status: 'PAID',
      variant: 'success' as const,
    },
    {
      id: '2',
      customer: 'Zephyr Logistics Pvt Ltd',
      number: 'INV-2026-041',
      date: 'Due 15 Oct 2026',
      amount: 78250,
      status: 'SENT',
      variant: 'warning' as const,
    },
    {
      id: '3',
      customer: 'Horizon Software Systems',
      number: 'INV-2026-039',
      date: 'Overdue 5d',
      amount: 42800,
      status: 'OVERDUE',
      variant: 'destructive' as const,
    },
    {
      id: '4',
      customer: 'Sterling Media Group',
      number: 'INV-2026-038',
      date: '28 Sep 2026',
      amount: 18000,
      status: 'DRAFT',
      variant: 'outline' as const,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Invoices</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => onNavigate('create_invoice')}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.primaryForeground} strokeWidth={2.5} />
          <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Bar */}
      <View style={[styles.filterSection, { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            placeholder="Search customer, number..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          {(['all', 'unpaid', 'paid', 'overdue'] as const).map((key) => {
            const isSelected = filter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setFilter(key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? colors.primaryForeground : colors.foreground,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Invoice Cards List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {invoices.map((inv) => (
          <TouchableOpacity
            key={inv.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.cardTopRow}>
              <View>
                <Text style={[styles.customerName, { color: colors.foreground }]}>{inv.customer}</Text>
                <Text style={[styles.invoiceMeta, { color: colors.mutedForeground }]}>
                  {inv.number} • {inv.date}
                </Text>
              </View>
              <Badge variant={inv.variant}>{inv.status}</Badge>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.cardBottomRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Amount</Text>
              <Text style={[styles.totalAmount, { color: inv.status === 'OVERDUE' ? colors.destructive : colors.foreground }]}>
                {formatCurrency(inv.amount, 'INR')}
              </Text>
            </View>
          </TouchableOpacity>
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
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
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
  filterChips: {
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
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
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  invoiceMeta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});


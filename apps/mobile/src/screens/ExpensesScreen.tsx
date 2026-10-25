import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Search, Plus, Receipt, Calendar, CreditCard, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/Skeleton';
import { formatCurrency } from '@accountiva/shared';
import { fonts } from '../theme/typography';
import { ScreenType } from '../components/BottomNav';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { ExpenseDetailModal } from '../components/ExpenseDetailModal';
import api from '@accountiva/api';

interface ExpensesScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export function ExpensesScreen({ onNavigate }: ExpensesScreenProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';
  const currentOrgId = currentOrg?.id;

  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);

  const fetchExpenses = useCallback(async (isRefresh = false) => {
    if (!currentOrgId) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data } = await api.get('/expenses');
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.expenses)
        ? data.expenses
        : [];
      setExpenses(list);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    setSelectedExpense(null);
    setEditingExpense(null);
    setIsAddModalOpen(false);
    setSearch('');
    fetchExpenses();
  }, [currentOrgId, fetchExpenses]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      const cat = e.expenseAccount || e.category;
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [expenses]);

  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const cat = e.expenseAccount || e.category || '';
      if (selectedCategory !== 'all' && cat.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const payee = (e.payee || e.merchant || e.vendorName || '').toLowerCase();
        const ref = (e.referenceNumber || e.reference || '').toLowerCase();
        const note = (e.notes || e.description || '').toLowerCase();
        if (!cat.toLowerCase().includes(q) && !payee.includes(q) && !ref.includes(q) && !note.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [expenses, selectedCategory, search]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Expenses</Text>
        <TouchableOpacity
          onPress={() => setIsAddModalOpen(true)}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.primaryForeground} strokeWidth={2.5} />
          <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>+ Expense</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Overview Banner */}
      <View style={styles.kpiWrapper}>
        <Card style={styles.kpiCard}>
          <View style={styles.kpiLeft}>
            <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>Total Expenses</Text>
            <Text style={[styles.kpiAmount, { color: colors.foreground }]}>
              {formatCurrency(totalAmount, currency)}
            </Text>
          </View>
          <View style={[styles.kpiBadge, { backgroundColor: colors.surfaceSubtle }]}>
            <Receipt size={16} color={colors.foreground} />
            <Text style={[styles.kpiBadgeText, { color: colors.foreground }]}>
              {expenses.length} Records
            </Text>
          </View>
        </Card>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search payee, category, ref..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>
      </View>

      {/* Category Filter Chips */}
      {categories.length > 0 ? (
        <View style={styles.filterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              onPress={() => setSelectedCategory('all')}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedCategory === 'all' ? colors.primary : colors.card,
                  borderColor: selectedCategory === 'all' ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: selectedCategory === 'all' ? colors.primaryForeground : colors.mutedForeground,
                    fontWeight: selectedCategory === 'all' ? '700' : '500',
                  },
                ]}
              >
                All ({expenses.length})
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
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
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Expense List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchExpenses(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <SkeletonList count={5} />
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={search ? 'No expenses match search' : 'No expenses recorded'}
            description={
              search
                ? 'Try a different keyword or clear filters.'
                : 'Keep your ledger organized by tracking vendor payments, office supplies, and business costs.'
            }
            actionLabel={search ? 'Clear search' : 'Record Expense'}
            actionIcon={search ? undefined : Plus}
            onAction={() => {
              if (search) setSearch('');
              else setIsAddModalOpen(true);
            }}
          />
        ) : (
          filteredExpenses.map((expense) => {
            const raw = Number(expense.amount) || 0;
            const category = expense.expenseAccount || expense.category || 'General';
            const payee = expense.payee || expense.merchant || expense.vendorName || '';

            return (
              <TouchableOpacity
                key={expense.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setSelectedExpense(expense)}
                activeOpacity={0.7}
              >
                <View style={styles.topRow}>
                  <View style={styles.expenseIconWrap}>
                    <View style={[styles.avatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                      <Receipt size={16} color={colors.foreground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.expenseTitle, { color: colors.foreground }]} numberOfLines={1}>
                        {payee || category}
                      </Text>
                      <Text style={[styles.expenseSub, { color: colors.mutedForeground }]}>
                        {category} • {expense.date || 'Recent'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.expenseAmount, { color: colors.foreground }]}>
                      {formatCurrency(raw, currency)}
                    </Text>
                    <Text style={[styles.paymentMethod, { color: colors.mutedForeground }]}>
                      {expense.paidThrough || 'Cash'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Expense Modal */}
      <AddExpenseModal
        visible={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingExpense(null);
        }}
        onSuccess={() => fetchExpenses()}
        initialExpense={editingExpense}
      />

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        visible={!!selectedExpense}
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onRefresh={() => fetchExpenses()}
        onEdit={(exp) => {
          setSelectedExpense(null);
          setEditingExpense(exp);
          setIsAddModalOpen(true);
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  newBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  kpiWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  kpiCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  kpiLeft: {
    gap: 2,
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    textTransform: 'uppercase',
  },
  kpiAmount: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  kpiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  kpiBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
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
    gap: 10,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
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
    alignItems: 'center',
  },
  expenseIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  expenseSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: fonts.bold,
  },
  paymentMethod: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
});


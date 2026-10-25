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
import { Search, Plus, Building2, Phone, Mail, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/Skeleton';
import { fonts } from '../theme/typography';
import { ScreenType } from '../components/BottomNav';
import { AddVendorModal } from '../components/AddVendorModal';
import { VendorDetailModal } from '../components/VendorDetailModal';
import api from '@accountiva/api';

interface VendorsScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectVendorForBill?: (vendor: any) => void;
}

export function VendorsScreen({ onNavigate, onSelectVendorForBill }: VendorsScreenProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currentOrgId = currentOrg?.id;

  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'registered'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [editingVendor, setEditingVendor] = useState<any | null>(null);

  const fetchVendors = useCallback(async (isRefresh = false) => {
    if (!currentOrgId) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data } = await api.get('/vendors');
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.vendors)
        ? data.vendors
        : [];
      setVendors(list);
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    setSelectedVendor(null);
    setEditingVendor(null);
    setIsAddModalOpen(false);
    setSearch('');
    fetchVendors();
  }, [currentOrgId, fetchVendors]);

  const counts = useMemo(() => ({
    all: vendors.length,
    registered: vendors.filter((v) => Boolean(v.gst_number || v.gstNumber || v.gstin)).length,
  }), [vendors]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const q = search.trim().toLowerCase();
      const name = (v.name || '').toLowerCase();
      const comp = (v.company || '').toLowerCase();
      const email = (v.email || '').toLowerCase();
      const phone = (v.phone || '').toLowerCase();

      if (q && !name.includes(q) && !comp.includes(q) && !email.includes(q) && !phone.includes(q)) {
        return false;
      }

      if (filter === 'registered') {
        return Boolean(v.gst_number || v.gstNumber || v.gstin);
      }
      return true;
    });
  }, [vendors, search, filter]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Vendors</Text>
        <TouchableOpacity
          onPress={() => setIsAddModalOpen(true)}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.primaryForeground} strokeWidth={2.5} />
          <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>+ Vendor</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search suppliers, email, phone..."
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
            { id: 'all', label: `All Vendors (${counts.all})` },
            { id: 'registered', label: `GST Registered (${counts.registered})` },
          ].map((tab) => {
            const isSelected = filter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setFilter(tab.id as 'all' | 'registered')}
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

      {/* Vendor List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchVendors(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <SkeletonList count={5} />
        ) : filteredVendors.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={search ? 'No vendors found' : 'No vendors registered'}
            description={
              search
                ? 'No supplier matched your search query. Try another keyword.'
                : 'Add suppliers and service providers to track vendor bills and payables.'
            }
            actionLabel={search ? 'Clear search' : 'Add Vendor'}
            actionIcon={search ? undefined : Plus}
            onAction={() => {
              if (search) setSearch('');
              else setIsAddModalOpen(true);
            }}
          />
        ) : (
          filteredVendors.map((vendor) => {
            const gst = vendor.gst_number || vendor.gstNumber || vendor.gstin;

            return (
              <TouchableOpacity
                key={vendor.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setSelectedVendor(vendor)}
                activeOpacity={0.7}
              >
                <View style={styles.topRow}>
                  <View style={styles.vendorAvatarRow}>
                    <View style={[styles.avatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                      <Building2 size={16} color={colors.foreground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.vendorName, { color: colors.foreground }]} numberOfLines={1}>
                        {vendor.name}
                      </Text>
                      {vendor.company ? (
                        <Text style={[styles.companyText, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {vendor.company}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <Badge variant={gst ? 'warning' : 'outline'}>
                    {gst ? 'GST' : 'Regular'}
                  </Badge>
                </View>

                {(vendor.email || vendor.phone) ? (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.infoRow}>
                      {vendor.email ? (
                        <View style={styles.contactItem}>
                          <Mail size={12} color={colors.mutedForeground} />
                          <Text style={[styles.contactText, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {vendor.email}
                          </Text>
                        </View>
                      ) : null}

                      {vendor.phone ? (
                        <View style={styles.contactItem}>
                          <Phone size={12} color={colors.mutedForeground} />
                          <Text style={[styles.contactText, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {vendor.phone}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Vendor Modal */}
      <AddVendorModal
        visible={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingVendor(null);
        }}
        onSuccess={() => fetchVendors()}
        initialVendor={editingVendor}
      />

      {/* Vendor Detail Modal */}
      <VendorDetailModal
        visible={!!selectedVendor}
        vendor={selectedVendor}
        onClose={() => setSelectedVendor(null)}
        onRefresh={() => fetchVendors()}
        onEdit={(v) => {
          setSelectedVendor(null);
          setEditingVendor(v);
          setIsAddModalOpen(true);
        }}
        onCreateBill={
          onSelectVendorForBill
            ? (v) => {
                setSelectedVendor(null);
                onSelectVendorForBill(v);
              }
            : undefined
        }
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
  vendorAvatarRow: {
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
  vendorName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  companyText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  contactText: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
});


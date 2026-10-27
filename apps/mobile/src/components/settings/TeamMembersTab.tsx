import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Users, Plus, Mail, Shield, Trash2, X, Check, Search } from 'lucide-react-native';
import api from '@accountiva/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { toast, confirm } from '../../context/FeedbackContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/Skeleton';
import { fonts } from '../../theme/typography';

export interface MobileMember {
  id: string;
  userId?: string;
  user_id?: string;
  email: string;
  name?: string;
  role: 'owner' | 'admin' | 'member' | 'accountant';
  createdAt?: string;
}

const ROLES: Array<{ id: 'admin' | 'member' | 'accountant'; label: string; desc: string }> = [
  { id: 'admin', label: 'Admin', desc: 'Full access to invoicing, team, and settings' },
  { id: 'member', label: 'Member', desc: 'Can create and view invoices and customers' },
  { id: 'accountant', label: 'Accountant', desc: 'Read-only financial access and reports' },
];

export function TeamMembersTab() {
  const { colors } = useTheme();
  const { currentOrg, user } = useAuth();

  const [members, setMembers] = useState<MobileMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'accountant'>('member');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const fetchMembers = useCallback(async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/organizations/${currentOrg.id}/members`);
      const list = Array.isArray(data) ? data : data?.data || [];
      setMembers(list);
    } catch {
      // Fallback display active user
      if (user) {
        setMembers([
          {
            id: 'mem-self',
            email: user.email,
            name: user.name || 'You',
            role: 'owner',
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentOrg?.id, user]);

  useEffect(() => {
    setMembers([]);
    fetchMembers();
  }, [fetchMembers]);

  const roleCounts = useMemo(() => ({
    all: members.length,
    owner: members.filter((m) => m.role === 'owner').length,
    admin: members.filter((m) => m.role === 'admin').length,
    member: members.filter((m) => m.role === 'member' || (m.role as any) === 'staff').length,
    accountant: members.filter((m) => m.role === 'accountant').length,
  }), [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (selectedRole !== 'all') {
        if (selectedRole === 'member') {
          if (m.role !== 'member' && (m.role as any) !== 'staff') return false;
        } else if (m.role !== selectedRole) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = (m.name || '').toLowerCase().includes(q);
        const emailMatch = (m.email || '').toLowerCase().includes(q);
        const roleMatch = (m.role || '').toLowerCase().includes(q);
        return nameMatch || emailMatch || roleMatch;
      }
      return true;
    });
  }, [members, selectedRole, searchQuery]);

  const handleSendInvite = async () => {
    if (!currentOrg?.id || !inviteEmail.trim()) {
      toast.error('Validation Error', 'Please enter a valid email address');
      return;
    }

    try {
      setSendingInvite(true);
      await api.post(`/organizations/${currentOrg.id}/invitations`, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });

      toast.success('Invitation Sent', `Invitation email sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setIsInviteModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      toast.error(
        'Invite Failed',
        err.response?.data?.error || err.response?.data?.message || err.message || 'Could not send invitation'
      );
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRemoveMember = (member: MobileMember) => {
    if (!currentOrg?.id) return;
    if (member.role === 'owner') {
      toast.error('Action Restricted', 'The workspace owner cannot be removed');
      return;
    }

    confirm({
      title: 'Remove Teammate',
      message: `Are you sure you want to remove ${member.name || member.email} from ${currentOrg.name}? They will lose all access.`,
      confirmText: 'Remove',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          await api.delete(`/organizations/${currentOrg.id}/members/${member.id}`);
          toast.success('Member Removed', `${member.name || member.email} was removed`);
          setMembers((prev) => prev.filter((m) => m.id !== member.id));
        } catch (err: any) {
          toast.error(
            'Failed',
            err.response?.data?.error || err.response?.data?.message || err.message || 'Could not remove member'
          );
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Team Members</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {members.length} {members.length === 1 ? 'member' : 'members'} with workspace access
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
          onPress={() => setIsInviteModalOpen(true)}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 4 }} />
          <Text style={[styles.inviteBtnText, { color: colors.primaryForeground }]}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Role Filter Pills */}
      <View style={{ paddingHorizontal: 16, marginBottom: 10, gap: 10 }}>
        {/* Search Input */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={15} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search members by name or email..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Role Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
          {[
            { id: 'all', label: `All (${roleCounts.all})` },
            { id: 'owner', label: `Owner (${roleCounts.owner})` },
            { id: 'admin', label: `Admin (${roleCounts.admin})` },
            { id: 'member', label: `Member (${roleCounts.member})` },
            { id: 'accountant', label: `Accountant (${roleCounts.accountant})` },
          ].map((pill) => {
            const active = selectedRole === pill.id;
            return (
              <TouchableOpacity
                key={pill.id}
                onPress={() => setSelectedRole(pill.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: active ? colors.primaryForeground : colors.foreground,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Members List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {loading && members.length === 0 ? (
          <SkeletonList count={3} />
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Teammates Yet"
            description="Invite colleagues, managers, or your accountant to collaborate on invoices."
            actionLabel="Invite Member"
            onAction={() => setIsInviteModalOpen(true)}
          />
        ) : filteredMembers.length === 0 ? (
          <View style={{ paddingVertical: 36, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.mutedForeground }}>
              No members matching "{searchQuery || selectedRole}"
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSelectedRole('all');
              }}
              style={{ paddingVertical: 6, paddingHorizontal: 12 }}
            >
              <Text style={{ fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary }}>
                Reset Filters
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredMembers.map((m) => {
            const isOwner = m.role === 'owner';
            const initial = (m.name || m.email || 'U')[0].toUpperCase();

            return (
              <Card key={m.id} style={styles.memberCard}>
                <View style={styles.memberRow}>
                  <View style={[styles.avatar, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
                  </View>

                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
                      {m.name || m.email}
                    </Text>
                    <Text style={[styles.memberEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {m.email}
                    </Text>
                  </View>

                  <View style={styles.memberRight}>
                    <Badge variant={isOwner ? 'default' : 'outline'}>
                      {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </Badge>

                    {!isOwner ? (
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(m)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Invite Member Modal */}
      <Modal
        visible={isInviteModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsInviteModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Invite Teammate</Text>
                <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
                  Send an email invite to join {currentOrg?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsInviteModalOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email Address *</Text>
                <TextInput
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="colleague@company.com"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                />
              </View>

              {/* Role Selection */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Assign Role</Text>
                <View style={styles.roleList}>
                  {ROLES.map((r) => {
                    const isSelected = inviteRole === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => setInviteRole(r.id)}
                        style={[
                          styles.roleOption,
                          {
                            backgroundColor: isSelected ? colors.surfaceSubtle : colors.card,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.roleOptionTitle,
                              { color: colors.foreground, fontWeight: isSelected ? '700' : '600' },
                            ]}
                          >
                            {r.label}
                          </Text>
                          <Text style={[styles.roleOptionDesc, { color: colors.mutedForeground }]}>
                            {r.desc}
                          </Text>
                        </View>
                        {isSelected ? <Check size={18} color={colors.primary} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSendInvite}
                disabled={sendingInvite}
                activeOpacity={0.8}
              >
                {sendingInvite ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <>
                    <Mail size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                    <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                      Send Invitation
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  memberCard: {
    padding: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  memberEmail: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  modalSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  modalBody: {
    padding: 16,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  roleList: {
    gap: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleOptionTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  roleOptionDesc: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  submitBtn: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
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
    fontSize: 12,
    fontFamily: fonts.regular,
    paddingVertical: 0,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
});

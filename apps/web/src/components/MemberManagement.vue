<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useMemberStore } from '@/stores/memberStore';
import api from '@/lib/api';
import { toast } from 'vue-sonner';
import {
  Users,
  User,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  Crown,
  MoreHorizontal,
  Loader2,
  Trash2,
  UserMinus,
  Search,
  Clock,
  X,
  Send,
  Check,
  ChevronDown,
  Filter,
} from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import MemberPermissionsModal from './MemberPermissionsModal.vue';
import UpgradePlanModal from '@/components/UpgradePlanModal.vue';
import PlanUpgradeCard from '@/components/ui/PlanUpgradeCard.vue';

const authStore = useAuthStore();
const memberStore = useMemberStore();
const isUpgradeModalOpen = ref(false);
const invitePlanError = ref<string | null>(null);

const loading = ref(!authStore.currentOrganization?.id || !memberStore.members[authStore.currentOrganization.id]);
const inviteLoading = ref(false);
const isInviteModalOpen = ref(false);

const memberSearchQuery = ref('');
const selectedRoleFilter = ref<string>('all');

const inviteForm = ref({
  email: '',
  role: 'staff' as 'admin' | 'staff',
});

const isPermissionsModalOpen = ref(false);
const selectedMember = ref<any>(null);
const resendingId = ref<string | null>(null);

const isRemoveModalOpen = ref(false);
const memberToRemove = ref<any>(null);
const removeLoading = ref(false);

const isDeleteInviteModalOpen = ref(false);
const inviteToDelete = ref<any>(null);
const deleteInviteLoading = ref(false);

const openPermissions = (member: any) => {
  selectedMember.value = member;
  isPermissionsModalOpen.value = true;
};

const openRemoveModal = (member: any) => {
  memberToRemove.value = member;
  isRemoveModalOpen.value = true;
};

const openDeleteInviteModal = (inv: any) => {
  inviteToDelete.value = inv;
  isDeleteInviteModalOpen.value = true;
};

const confirmDeleteInvite = async () => {
  if (!inviteToDelete.value) return;
  deleteInviteLoading.value = true;
  try {
    await api.delete(`/organizations/invitations/${inviteToDelete.value.id}`);
    toast.success('Invitation deleted successfully');
    isDeleteInviteModalOpen.value = false;
    inviteToDelete.value = null;
    await memberStore.fetchInvitations(authStore.currentOrganization?.id || '', true);
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete invitation');
  } finally {
    deleteInviteLoading.value = false;
  }
};

const confirmRemoveMember = async () => {
  if (!authStore.currentOrganization || !memberToRemove.value) return;

  removeLoading.value = true;
  try {
    await api.delete(`/organizations/${authStore.currentOrganization.id}/members/${memberToRemove.value.id}`);
    toast.success('Member removed successfully');
    isRemoveModalOpen.value = false;
    memberToRemove.value = null;
    await fetchMembers(true);
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to remove member');
  } finally {
    removeLoading.value = false;
  }
};

const getProfile = (member: any) => {
  const profileData = member.profiles || member.profile || member.user_profiles || member.user_profile;
  if (Array.isArray(profileData)) return profileData[0] || null;
  return profileData || null;
};

const fetchMembers = async (force = false) => {
  if (!authStore.currentOrganization) return;
  loading.value = !memberStore.members[authStore.currentOrganization.id];
  try {
    const promises: Promise<any>[] = [
      memberStore.fetchMembers(authStore.currentOrganization.id, force),
    ];
    if (authStore.currentOrganization.role !== 'staff') {
      promises.push(memberStore.fetchInvitations(authStore.currentOrganization.id, force));
    }
    await Promise.all(promises);
  } catch (error) {
    console.error('Failed to fetch members', error);
  } finally {
    loading.value = false;
  }
};

const handleResendInvite = async (invitationId: string) => {
  resendingId.value = invitationId;
  try {
    await api.post(`/organizations/invitations/${invitationId}/resend`);
    toast.success('Invitation resent successfully');
    await memberStore.fetchInvitations(authStore.currentOrganization?.id || '', true);
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to resend invitation');
  } finally {
    resendingId.value = null;
  }
};

const handleInvite = async () => {
  if (!authStore.currentOrganization) return;
  if (!inviteForm.value.email) {
    toast.error('Email is required');
    return;
  }

  inviteLoading.value = true;
  try {
    await api.post(`/organizations/${authStore.currentOrganization.id}/invite`, {
      email: inviteForm.value.email.trim(),
      role: inviteForm.value.role,
    });
    toast.success(`Invitation sent to ${inviteForm.value.email}`);
    isInviteModalOpen.value = false;
    inviteForm.value.email = '';
    inviteForm.value.role = 'staff';
    invitePlanError.value = null;
    await fetchMembers(true);
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || 'Failed to send invitation';
    const isPlanLimit = error.response?.status === 403 && (error.response?.data?.code === 'LIMIT_REACHED' || errorMsg.toLowerCase().includes('upgrade') || errorMsg.toLowerCase().includes('limit') || errorMsg.toLowerCase().includes('seat'));

    if (isPlanLimit) {
      invitePlanError.value = errorMsg;
      isInviteModalOpen.value = false;
      isUpgradeModalOpen.value = true;
    } else {
      invitePlanError.value = null;
      toast.error(errorMsg);
    }
  } finally {
    inviteLoading.value = false;
  }
};

const sortedMembers = computed(() => {
  const members = memberStore.members[authStore.currentOrganization?.id || ''] || [];
  const roleOrder: Record<string, number> = { owner: 1, admin: 2, staff: 3 };
  return [...members].sort((a, b) => {
    return (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4);
  });
});

const currentInvitations = computed(() => {
  return memberStore.invitations[authStore.currentOrganization?.id || ''] || [];
});

interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  isSelf: boolean;
  date: string;
  raw: any;
}

const activeMembers = computed<MemberItem[]>(() => {
  return sortedMembers.value.map((m) => {
    const prof = getProfile(m);
    return {
      id: m.id,
      name: prof?.full_name || 'Team Member',
      email: prof?.email || '',
      role: m.role,
      avatarUrl: prof?.profile_picture || prof?.avatar_url,
      isSelf: prof?.id === authStore.user?.id,
      date: m.created_at,
      raw: m,
    };
  });
});

const filteredMembers = computed(() => {
  const q = memberSearchQuery.value.trim().toLowerCase();
  return activeMembers.value.filter((item) => {
    // Role filter
    if (selectedRoleFilter.value !== 'all' && item.role !== selectedRoleFilter.value) {
      return false;
    }

    // Search query
    if (q) {
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchEmail = (item.email || '').toLowerCase().includes(q);
      const matchRole = (item.role || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRole) return false;
    }

    return true;
  });
});

const roleFilterTabs = [
  { id: 'all', label: 'All Roles' },
  { id: 'owner', label: 'Owners' },
  { id: 'admin', label: 'Admins' },
  { id: 'staff', label: 'Staff' },
] as const;

const selectedRoleLabel = computed(() => {
  return roleFilterTabs.find((r) => r.id === selectedRoleFilter.value)?.label || 'All Roles';
});

const canRemoveMember = (member: any) => {
  const myRole = authStore.currentOrganization?.role;
  const targetRole = member.role;
  const isSelf = getProfile(member)?.id === authStore.user?.id;

  if (isSelf) return false;
  if (myRole === 'owner') return true;
  if (myRole === 'admin' && targetRole === 'staff') return true;

  return false;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

watch(
  () => authStore.currentOrganization?.id,
  async (newId) => {
    if (newId) {
      await fetchMembers();
    }
  },
);

onMounted(async () => {
  await fetchMembers();
});
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <h3 class="text-base font-semibold text-foreground tracking-tight">Team Members</h3>
        <p class="text-xs text-muted-foreground">
          Manage your organization's team directory, roles, and permissions.
        </p>
      </div>

      <Button
        v-if="authStore.currentOrganization?.role !== 'staff'"
        type="button"
        @click="isInviteModalOpen = true"
        class="gap-1.5 shadow-xs cursor-pointer shrink-0"
      >
        <UserPlus class="w-4 h-4" />
        <span>Invite Member</span>
      </Button>
    </div>

    <!-- Team Members Card -->
    <Card class="border-border/60 shadow-xs overflow-hidden py-0 gap-0">
      <!-- Toolbar: Role Filter + Search -->
      <div class="p-3.5 border-b border-border/60 bg-muted/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <!-- Role Filter Dropdown -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="outline"
              size="sm"
              class="h-8 px-2.5 text-xs font-medium gap-2 border-border/60 bg-background text-foreground hover:bg-muted/50 cursor-pointer shrink-0 justify-between sm:justify-start shadow-none"
            >
              <div class="flex items-center gap-1.5">
                <Filter class="w-3.5 h-3.5 text-muted-foreground" />
                <span>{{ selectedRoleLabel }}</span>
              </div>
              <ChevronDown class="w-3 h-3 text-muted-foreground ml-1 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-40">
            <DropdownMenuItem
              v-for="role in roleFilterTabs"
              :key="role.id"
              @click="selectedRoleFilter = role.id"
              class="text-xs flex items-center justify-between cursor-pointer py-1.5"
            >
              <span>{{ role.label }}</span>
              <Check v-if="selectedRoleFilter === role.id" class="w-3.5 h-3.5 text-primary" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- Search Input -->
        <div class="flex items-center justify-end gap-2 flex-1">
          <div class="relative w-full sm:w-56">
            <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              v-model="memberSearchQuery"
              placeholder="Search members..."
              class="pl-8 pr-7 h-8 text-xs bg-background shadow-none"
            />
            <button
              v-if="memberSearchQuery"
              type="button"
              @click="memberSearchQuery = ''"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <!-- Table Content -->
      <CardContent class="p-0">
        <!-- Loading State -->
        <div
          v-if="loading && sortedMembers.length === 0"
          class="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground"
        >
          <Loader2 class="w-7 h-7 animate-spin text-primary" />
          <p class="text-xs font-medium">Loading team members...</p>
        </div>

        <!-- Empty State (No Matches) -->
        <div
          v-else-if="filteredMembers.length === 0"
          class="p-12 text-center space-y-2.5"
        >
          <div class="w-10 h-10 bg-muted/60 border border-border/60 rounded-xl flex items-center justify-center mx-auto text-muted-foreground">
            <Users class="w-4 h-4" />
          </div>
          <h4 class="text-sm font-semibold text-foreground">No members found</h4>
        </div>

        <!-- Active Members Table -->
        <div v-else class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow class="hover:bg-transparent bg-muted/20 border-b border-border/60">
                <TableHead class="w-[280px] text-xs font-semibold text-foreground">Member</TableHead>
                <TableHead class="w-[120px] text-xs font-semibold text-foreground">Role</TableHead>
                <TableHead class="text-xs font-semibold text-foreground">Permissions</TableHead>
                <TableHead class="w-[140px] text-xs font-semibold text-foreground">Date Joined</TableHead>
                <TableHead class="w-[80px] text-right text-xs font-semibold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="item in filteredMembers"
                :key="item.id"
                class="hover:bg-muted/30 transition-colors group"
              >
                <!-- Member Avatar & Info -->
                <TableCell class="py-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-border/70 bg-primary/10 text-primary font-bold text-xs">
                      <img
                        v-if="item.avatarUrl"
                        :src="item.avatarUrl"
                        :alt="item.name"
                        class="w-full h-full object-cover"
                      />
                      <span v-else class="text-xs font-bold uppercase">
                        {{ ((item.name || item.email)?.[0] || 'U').toUpperCase() }}
                      </span>
                    </div>

                    <div class="min-w-0 flex-1 space-y-0.5">
                      <div class="font-medium text-xs text-foreground truncate flex items-center gap-1.5">
                        <span>{{ item.name }}</span>
                        <span
                          v-if="item.isSelf"
                          class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-primary/15 text-primary"
                        >
                          You
                        </span>
                      </div>
                      <p class="text-[11px] text-muted-foreground truncate">
                        {{ item.email }}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <!-- Role Badge -->
                <TableCell class="py-3">
                  <Badge
                    v-if="item.role === 'owner'"
                    variant="warning"
                    size="sm"
                    class="gap-1 capitalize font-semibold shadow-xs"
                  >
                    <Crown class="w-3 h-3 text-white" />
                    <span>Owner</span>
                  </Badge>
                  <Badge
                    v-else-if="item.role === 'admin'"
                    variant="info"
                    size="sm"
                    class="gap-1 capitalize font-semibold shadow-xs"
                  >
                    <ShieldCheck class="w-3 h-3 text-white" />
                    <span>Admin</span>
                  </Badge>
                  <Badge
                    v-else
                    variant="secondary"
                    size="sm"
                    class="gap-1 capitalize font-semibold shadow-xs border border-border/60"
                  >
                    <User class="w-3 h-3 text-secondary-foreground" />
                    <span>Staff</span>
                  </Badge>
                </TableCell>

                <!-- Permissions / Access Summary -->
                <TableCell class="py-3">
                  <div v-if="item.role === 'owner' || item.role === 'admin'" class="text-xs text-muted-foreground">
                    Full Workspace Access
                  </div>
                  <div v-else class="flex items-center gap-1.5">
                    <button
                      type="button"
                      @click="openPermissions(item.raw)"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/70 text-muted-foreground border border-border/50 hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                    >
                      <Shield class="w-3 h-3 text-primary" />
                      <span>Manage Access</span>
                    </button>
                  </div>
                </TableCell>

                <!-- Date Joined -->
                <TableCell class="py-3 text-xs text-muted-foreground">
                  {{ formatDate(item.date) }}
                </TableCell>

                <!-- Actions Column -->
                <TableCell class="py-3 text-right">
                  <DropdownMenu v-if="authStore.currentOrganization?.role !== 'staff' && !item.isSelf">
                    <DropdownMenuTrigger as-child>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Member options"
                      >
                        <MoreHorizontal class="w-4 h-4" />
                        <span class="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-44">
                      <DropdownMenuItem
                        @click="openPermissions(item.raw)"
                        class="gap-2 cursor-pointer text-xs"
                      >
                        <Shield class="w-3.5 h-3.5" />
                        <span>Manage Permissions</span>
                      </DropdownMenuItem>

                      <template v-if="canRemoveMember(item.raw)">
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          @click="openRemoveModal(item.raw)"
                          class="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
                        >
                          <UserMinus class="w-3.5 h-3.5" />
                          <span>Remove Member</span>
                        </DropdownMenuItem>
                      </template>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span v-else class="text-xs text-muted-foreground/40 pr-2">—</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Invited Members Section -->
    <div v-if="currentInvitations.length > 0" class="space-y-3 pt-2">
      <div class="space-y-0.5">
        <h4 class="text-sm font-semibold text-foreground tracking-tight">Invited Members</h4>
        <p class="text-xs text-muted-foreground">
          Pending invitations sent to people who haven't accepted yet.
        </p>
      </div>

      <Card class="border-border/60 shadow-xs overflow-hidden py-0 gap-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow class="hover:bg-transparent bg-muted/20 border-b border-border/60">
                <TableHead class="w-[280px] text-xs font-semibold text-foreground">Invitee</TableHead>
                <TableHead class="w-[120px] text-xs font-semibold text-foreground">Role</TableHead>
                <TableHead class="text-xs font-semibold text-foreground">Permissions</TableHead>
                <TableHead class="w-[140px] text-xs font-semibold text-foreground">Date Invited</TableHead>
                <TableHead class="w-[100px] text-right text-xs font-semibold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="inv in currentInvitations"
                :key="inv.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <!-- Invitee Info -->
                <TableCell class="py-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-dashed border-border/80 bg-muted/40 text-muted-foreground">
                      <Mail class="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div class="min-w-0 flex-1 space-y-0.5">
                      <div class="font-medium text-xs text-foreground truncate">
                        {{ inv.full_name || inv.email }}
                      </div>
                      <p v-if="inv.full_name" class="text-[11px] text-muted-foreground truncate">
                        {{ inv.email }}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <!-- Role Badge -->
                <TableCell class="py-3">
                  <Badge
                    v-if="inv.role === 'owner'"
                    variant="warning"
                    size="sm"
                    class="gap-1 capitalize font-semibold shadow-xs"
                  >
                    <Crown class="w-3 h-3 text-white" />
                    <span>Owner</span>
                  </Badge>
                  <Badge
                    v-else-if="inv.role === 'admin'"
                    variant="info"
                    size="sm"
                    class="gap-1 capitalize font-semibold shadow-xs"
                  >
                    <ShieldCheck class="w-3 h-3 text-white" />
                    <span>Admin</span>
                  </Badge>
                  <Badge
                    v-else
                    variant="secondary"
                    size="sm"
                    class="gap-1 capitalize font-semibold shadow-xs border border-border/60"
                  >
                    <User class="w-3 h-3 text-secondary-foreground" />
                    <span>Staff</span>
                  </Badge>
                </TableCell>

                <!-- Permissions -->
                <TableCell class="py-3 text-xs text-muted-foreground">
                  {{ inv.role === 'admin' ? 'Full Workspace Access' : 'Standard Staff Access' }}
                </TableCell>

                <!-- Date Invited -->
                <TableCell class="py-3 text-xs text-muted-foreground">
                  {{ formatDate(inv.created_at) }}
                </TableCell>

                <!-- Actions Column -->
                <TableCell class="py-3 text-right">
                  <DropdownMenu v-if="authStore.currentOrganization?.role !== 'staff'">
                    <DropdownMenuTrigger as-child>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Invitation options"
                      >
                        <MoreHorizontal class="w-4 h-4" />
                        <span class="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-44">
                      <DropdownMenuItem
                        @click="handleResendInvite(inv.id)"
                        :disabled="resendingId === inv.id"
                        class="gap-2 cursor-pointer text-xs text-blue-600 dark:text-blue-400 focus:text-blue-600 dark:focus:text-blue-400 focus:bg-blue-500/10"
                      >
                        <Loader2 v-if="resendingId === inv.id" class="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <Send v-else class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{{ resendingId === inv.id ? 'Sending...' : 'Resend Invite' }}</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        @click="openDeleteInviteModal(inv)"
                        class="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span v-else class="text-xs text-muted-foreground/40 pr-2">—</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>

    <!-- Permissions Modal -->
    <MemberPermissionsModal
      v-if="isPermissionsModalOpen"
      :member="selectedMember"
      :organizationId="authStore.currentOrganization?.id"
      @close="isPermissionsModalOpen = false"
      @updated="fetchMembers(true)"
    />

    <!-- Remove Member Confirmation Dialog -->
    <Dialog :open="isRemoveModalOpen" @update:open="isRemoveModalOpen = $event">
      <DialogContent class="sm:max-w-md p-6 gap-4">
        <DialogHeader class="flex flex-col items-center text-center space-y-2">
          <div class="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shrink-0 mb-1">
            <UserMinus class="size-5" />
          </div>
          <DialogTitle class="text-base font-semibold text-foreground">
            Remove Team Member
          </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            Are you sure you want to remove <span class="font-semibold text-foreground">"{{ getProfile(memberToRemove)?.full_name || 'this member' }}"</span> from this workspace?
          </DialogDescription>
        </DialogHeader>

        <div class="p-3.5 rounded-lg bg-destructive/5 border border-destructive/15 flex items-start gap-3">
          <Trash2 class="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p class="text-xs text-destructive/90 leading-relaxed">
            The user will immediately lose access to all invoices, customers, banking records, and settings in this workspace.
          </p>
        </div>

        <DialogFooter class="flex sm:justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            @click="isRemoveModalOpen = false"
            :disabled="removeLoading"
            class="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            @click="confirmRemoveMember"
            :disabled="removeLoading"
            class="gap-1.5 cursor-pointer"
          >
            <Loader2 v-if="removeLoading" class="w-3.5 h-3.5 animate-spin" />
            <UserMinus v-else class="w-3.5 h-3.5" />
            <span>{{ removeLoading ? 'Removing...' : 'Remove Member' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Invitation Confirmation Dialog -->
    <Dialog :open="isDeleteInviteModalOpen" @update:open="isDeleteInviteModalOpen = $event">
      <DialogContent class="sm:max-w-md p-6 gap-4">
        <DialogHeader class="flex flex-col items-center text-center space-y-2">
          <div class="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shrink-0 mb-1">
            <Trash2 class="size-5" />
          </div>
          <DialogTitle class="text-base font-semibold text-foreground">
            Delete Invitation
          </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            Are you sure you want to delete the pending invitation for <span class="font-semibold text-foreground">"{{ inviteToDelete?.email }}"</span>?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="flex sm:justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            @click="isDeleteInviteModalOpen = false"
            :disabled="deleteInviteLoading"
            class="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            @click="confirmDeleteInvite"
            :disabled="deleteInviteLoading"
            class="gap-1.5 cursor-pointer"
          >
            <Loader2 v-if="deleteInviteLoading" class="w-3.5 h-3.5 animate-spin" />
            <Trash2 v-else class="w-3.5 h-3.5" />
            <span>{{ deleteInviteLoading ? 'Deleting...' : 'Delete' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Clean, Streamlined Invite Modal -->
    <Dialog :open="isInviteModalOpen" @update:open="isInviteModalOpen = $event">
      <DialogContent class="sm:max-w-md p-6 gap-5">
        <DialogHeader class="space-y-1.5 text-left border-b border-border/60 pb-3">
          <DialogTitle class="text-base font-semibold text-foreground flex items-center gap-2">
            <UserPlus class="w-4 h-4 text-primary" />
            <span>Invite Team Member</span>
          </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            Send an email invitation to collaborate in this workspace.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <!-- Plan Limit Card -->
          <PlanUpgradeCard
            v-if="invitePlanError"
            title="Team Seat Limit Reached"
            :description="invitePlanError"
            :dismissible="true"
            @dismiss="invitePlanError = null"
          />

          <!-- Email Input -->
          <div class="space-y-1.5">
            <Label for="inviteEmail" class="text-xs font-medium text-foreground flex items-center gap-1">
              <span>Email Address</span>
              <span class="text-destructive">*</span>
            </Label>
            <div class="relative">
              <Mail class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                id="inviteEmail"
                v-model="inviteForm.email"
                type="email"
                placeholder="colleague@company.com"
                class="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <!-- Role Selection Cards -->
          <div class="space-y-1.5">
            <Label class="text-xs font-medium text-foreground">
              Assign Role
            </Label>
            <div
              class="grid gap-2.5"
              :class="authStore.currentOrganization?.role === 'owner' ? 'grid-cols-2' : 'grid-cols-1'"
            >
              <!-- Staff Role -->
              <button
                type="button"
                @click="inviteForm.role = 'staff'"
                :class="[
                  'p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-1',
                  inviteForm.role === 'staff'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30 shadow-2xs'
                    : 'border-border/70 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                ]"
              >
                <div class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-1.5">
                    <User class="w-3.5 h-3.5" :class="inviteForm.role === 'staff' ? 'text-primary' : 'text-muted-foreground'" />
                    <span class="text-xs font-semibold text-foreground">Staff</span>
                  </div>
                  <Badge variant="outline" size="sm" class="text-[10px] px-1.5 py-0">Customizable</Badge>
                </div>
                <p class="text-[11px] text-muted-foreground leading-normal mt-0.5">
                  Controlled access to specific accounting modules.
                </p>
              </button>

              <!-- Admin Role (Owner only) -->
              <button
                v-if="authStore.currentOrganization?.role === 'owner'"
                type="button"
                @click="inviteForm.role = 'admin'"
                :class="[
                  'p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-1',
                  inviteForm.role === 'admin'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30 shadow-2xs'
                    : 'border-border/70 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                ]"
              >
                <div class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-1.5">
                    <ShieldCheck class="w-3.5 h-3.5" :class="inviteForm.role === 'admin' ? 'text-primary' : 'text-muted-foreground'" />
                    <span class="text-xs font-semibold text-foreground">Admin</span>
                  </div>
                  <Badge variant="secondary" size="sm" class="text-[10px] px-1.5 py-0">Full Access</Badge>
                </div>
                <p class="text-[11px] text-muted-foreground leading-normal mt-0.5">
                  Can manage records, settings, and team members.
                </p>
              </button>
            </div>
          </div>

          <!-- Helpful note -->
          <div class="p-2.5 rounded-lg bg-muted/40 border border-border/50 flex items-start gap-2">
            <Check class="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p class="text-[11px] text-muted-foreground leading-relaxed">
              Fine-grained module permissions can be easily adjusted anytime from the member directory.
            </p>
          </div>
        </div>

        <DialogFooter class="border-t border-border/60 pt-3 flex sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            @click="isInviteModalOpen = false"
            class="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            @click="handleInvite"
            :disabled="inviteLoading || !inviteForm.email"
            class="gap-1.5 cursor-pointer"
          >
            <Loader2 v-if="inviteLoading" class="w-3.5 h-3.5 animate-spin" />
            <UserPlus v-else class="w-3.5 h-3.5" />
            <span>Send Invitation</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <UpgradePlanModal
      v-model:open="isUpgradeModalOpen"
      feature="member"
      title="Team Seat Limit Reached"
      :description="invitePlanError || 'Your Free plan allows 1 user seat. Upgrade to Professional to invite team members and assign custom permissions.'"
    />
  </div>
</template>

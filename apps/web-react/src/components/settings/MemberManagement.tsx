import React, { useState, useEffect, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MemberPermissionsModal } from "./MemberPermissionsModal";

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

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export function MemberManagement() {
  const { currentOrganization, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);

  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");

  // Permissions modal
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedMemberForPermissions, setSelectedMemberForPermissions] = useState<MemberItem | null>(null);

  // Invite modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "staff">("staff");
  const [inviteLoading, setInviteLoading] = useState(false);

  // Remove member modal
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<MemberItem | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Delete invite modal
  const [isDeleteInviteModalOpen, setIsDeleteInviteModalOpen] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState<InvitationItem | null>(null);
  const [deleteInviteLoading, setDeleteInviteLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!currentOrganization?.id) return;
    try {
      setLoading(true);
      const [membersRes, invitesRes] = await Promise.allSettled([
        api.get(`/organizations/${currentOrganization.id}/members`),
        api.get(`/organizations/${currentOrganization.id}/invitations`),
      ]);

      if (membersRes.status === "fulfilled") {
        const data = membersRes.value.data;
        setMembers(Array.isArray(data) ? data : data?.data || []);
      }
      if (invitesRes.status === "fulfilled") {
        const data = invitesRes.value.data;
        setInvitations(Array.isArray(data) ? data : data?.data || []);
      }
    } catch {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    setMembers([]);
    setInvitations([]);
    fetchMembers();
  }, [fetchMembers]);

  const activeMembers = useMemo<MemberItem[]>(() => {
    const roleOrder: Record<string, number> = { owner: 1, admin: 2, staff: 3, member: 3 };
    const sorted = [...members].sort(
      (a, b) => (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4)
    );

    return sorted.map((m) => {
      const prof = m.user || m.profile || m;
      return {
        id: m.id,
        name: prof.full_name || prof.name || "Team Member",
        email: prof.email || m.email || "",
        role: m.role || "staff",
        avatarUrl: prof.profile_picture || prof.avatar_url || prof.image,
        isSelf: prof.id === user?.id || prof.email === user?.email,
        date: m.created_at,
        raw: m,
      };
    });
  }, [members, user]);

  const filteredMembers = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    return activeMembers.filter((item) => {
      if (selectedRoleFilter !== "all" && item.role !== selectedRoleFilter) {
        return false;
      }
      if (q) {
        const matchName = (item.name || "").toLowerCase().includes(q);
        const matchEmail = (item.email || "").toLowerCase().includes(q);
        const matchRole = (item.role || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRole) return false;
      }
      return true;
    });
  }, [activeMembers, selectedRoleFilter, memberSearchQuery]);

  const canRemoveMember = (item: MemberItem) => {
    const myRole = currentOrganization?.role;
    if (item.isSelf) return false;
    if (myRole === "owner") return true;
    if (myRole === "admin" && (item.role === "staff" || item.role === "member")) return true;
    return false;
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization?.id || !inviteEmail.trim()) return;

    try {
      setInviteLoading(true);
      await api.post(`/organizations/${currentOrganization.id}/invitations`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      setIsInviteModalOpen(false);
      await fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (inv: InvitationItem) => {
    if (!currentOrganization?.id) return;
    try {
      setResendingId(inv.id);
      await api.post(`/organizations/${currentOrganization.id}/invitations/${inv.id}/resend`);
      toast.success(`Invitation resent to ${inv.email}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to resend invitation");
    } finally {
      setResendingId(null);
    }
  };

  const handleDeleteInvite = async () => {
    if (!currentOrganization?.id || !inviteToDelete) return;
    try {
      setDeleteInviteLoading(true);
      await api.delete(`/organizations/${currentOrganization.id}/invitations/${inviteToDelete.id}`);
      toast.success("Invitation revoked successfully");
      setIsDeleteInviteModalOpen(false);
      setInviteToDelete(null);
      await fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to revoke invitation");
    } finally {
      setDeleteInviteLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!currentOrganization?.id || !memberToRemove) return;
    try {
      setRemoveLoading(true);
      await api.delete(`/organizations/${currentOrganization.id}/members/${memberToRemove.id}`);
      toast.success(`${memberToRemove.name} removed from organization`);
      setIsRemoveModalOpen(false);
      setMemberToRemove(null);
      await fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to remove member");
    } finally {
      setRemoveLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground tracking-tight">Team Members</h3>
          <p className="text-xs text-muted-foreground">
            Manage your organization's team directory, roles, and permissions.
          </p>
        </div>

        {currentOrganization?.role !== "staff" && currentOrganization?.role !== "member" && (
          <Button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="gap-1.5 shadow-xs cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </Button>
        )}
      </div>

      {/* Team Members Card */}
      <Card className="border-border/60 shadow-xs overflow-hidden py-0 gap-0">
        {/* Toolbar: Role Filter + Search */}
        <div className="p-3.5 border-b border-border/60 bg-muted/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Role Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-medium gap-2 border-border/60 bg-background text-foreground hover:bg-muted/50 cursor-pointer shrink-0 justify-between sm:justify-start shadow-none"
              >
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="capitalize">{selectedRoleFilter === "all" ? "All Roles" : selectedRoleFilter}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {["all", "owner", "admin", "staff"].map((role) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => setSelectedRoleFilter(role)}
                  className="capitalize text-xs cursor-pointer"
                >
                  {role === "all" ? "All Roles" : role}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="h-8 pl-8 pr-7 text-xs bg-background border-border/60"
            />
            {memberSearchQuery && (
              <button
                type="button"
                onClick={() => setMemberSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-foreground">No team members found</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {memberSearchQuery ? "Try refining your search query." : "Invite people to join your organization."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/10 border-border/60">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5">User</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5">Role</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5 hidden sm:table-cell">Joined</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((item) => (
                  <TableRow key={item.id} className="border-border/50 hover:bg-muted/20">
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground truncate">{item.name}</span>
                            {item.isSelf && (
                              <span className="rounded px-1.5 py-0.2 bg-muted text-[9px] font-bold text-muted-foreground uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground truncate block">{item.email}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-2.5">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border">
                        {item.role === "owner" ? (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Crown className="w-3 h-3" /> Owner
                          </span>
                        ) : item.role === "admin" ? (
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-3 h-3" /> Staff
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                      {formatDate(item.date)}
                    </TableCell>

                    <TableCell className="py-2.5 text-right">
                      {item.role !== "owner" && !item.isSelf ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMemberForPermissions(item);
                                setIsPermissionsModalOpen(true);
                              }}
                              className="cursor-pointer text-xs"
                            >
                              <Shield className="w-3.5 h-3.5 mr-2 text-primary" />
                              Manage Permissions
                            </DropdownMenuItem>
                            {canRemoveMember(item) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setMemberToRemove(item);
                                    setIsRemoveModalOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive cursor-pointer text-xs"
                                >
                                  <UserMinus className="w-3.5 h-3.5 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Pending Invitations ({invitations.length})</h4>
          </div>

          <Card className="border-border/60 shadow-xs overflow-hidden py-0 gap-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/10 border-border/60">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5">Invited Email</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5">Assigned Role</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5 hidden sm:table-cell">Sent Date</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id} className="border-border/50 hover:bg-muted/20">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-foreground">{inv.email}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border/60 capitalize">
                          {inv.role}
                        </span>
                      </TableCell>

                      <TableCell className="py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                        {formatDate(inv.created_at)}
                      </TableCell>

                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 cursor-pointer"
                            disabled={resendingId === inv.id}
                            onClick={() => handleResendInvite(inv)}
                          >
                            {resendingId === inv.id ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <Send className="w-3 h-3 mr-1" />
                            )}
                            Resend
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10 cursor-pointer"
                            onClick={() => {
                              setInviteToDelete(inv);
                              setIsDeleteInviteModalOpen(true);
                            }}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Revoke
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl bg-card border border-border">
          <form onSubmit={handleSendInvite}>
            <div className="p-6 border-b border-border/40 bg-muted/20">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Invite Team Member</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Send an email invitation to collaborate within this organization.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-xs font-semibold">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Organization Role</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteRole("staff")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      inviteRole === "staff"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/60 hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Staff</span>
                      {inviteRole === "staff" && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Standard access to create and manage operational documents.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRole("admin")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      inviteRole === "admin"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/60 hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Admin</span>
                      {inviteRole === "admin" && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Full workspace administration, invitations, and financial control.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 bg-muted/15 border-t border-border/40 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={inviteLoading || !inviteEmail.trim()}
                className="text-xs font-bold gap-1.5"
              >
                {inviteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={isRemoveModalOpen} onOpenChange={setIsRemoveModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl bg-card border border-border">
          <div className="p-6 border-b border-border/40 bg-muted/20">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <UserMinus className="w-4 h-4" />
                Remove Team Member
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Are you sure you want to remove{" "}
                <span className="text-foreground font-bold">{memberToRemove?.name}</span> ({memberToRemove?.email})?
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-5 text-xs text-muted-foreground">
            They will immediately lose access to this workspace and all associated financial records. This action can be undone by re-inviting the user.
          </div>

          <DialogFooter className="p-4 bg-muted/15 border-t border-border/40 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsRemoveModalOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={removeLoading}
              onClick={handleRemoveMember}
              className="text-xs font-bold gap-1.5"
            >
              {removeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Invite Confirmation Dialog */}
      <Dialog open={isDeleteInviteModalOpen} onOpenChange={setIsDeleteInviteModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl bg-card border border-border">
          <div className="p-6 border-b border-border/40 bg-muted/20">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-destructive">Revoke Invitation</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Are you sure you want to revoke the pending invitation for{" "}
                <span className="text-foreground font-bold">{inviteToDelete?.email}</span>?
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-5 text-xs text-muted-foreground">
            The link sent to their email will immediately expire.
          </div>

          <DialogFooter className="p-4 bg-muted/15 border-t border-border/40 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteInviteModalOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteInviteLoading}
              onClick={handleDeleteInvite}
              className="text-xs font-bold gap-1.5"
            >
              {deleteInviteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Revoke Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Permissions Modal */}
      {currentOrganization?.id && (
        <MemberPermissionsModal
          isOpen={isPermissionsModalOpen}
          member={selectedMemberForPermissions}
          organizationId={currentOrganization.id}
          onClose={() => {
            setIsPermissionsModalOpen(false);
            setSelectedMemberForPermissions(null);
          }}
          onUpdated={fetchMembers}
        />
      )}
    </div>
  );
}


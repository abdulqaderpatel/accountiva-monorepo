import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Users,
  Palette,
  Trash2,
  ShieldCheck,
  Plus,
  Mail,
  Check,
  RotateCcw,
  AlertTriangle,
  UploadCloud,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  SlidersHorizontal,
  Search,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth, Organization } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/Select";
import { CustomFieldsManagement } from "@/components/settings/CustomFieldsManagement";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type OrgTab = "general" | "branding" | "members" | "custom-fields" | "trash" | "audit";

interface Member {
  id: string;
  userId: string;
  email: string;
  name?: string;
  role: "owner" | "admin" | "member" | "accountant";
  createdAt: string;
}

interface TrashItem {
  id: string;
  entity_type: string;
  title: string;
  deleted_at: string;
}

interface AuditLog {
  id: string;
  action: string;
  user_email: string;
  created_at: string;
  details?: string;
}

export function OrganizationSettings() {
  const { currentOrganization, fetchOrganizations } = useAuth();
  const { accentColor } = useTheme();

  const getInitialTab = (): OrgTab => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p === "members") return "members";
      if (p === "branding") return "branding";
      if (p === "custom-fields" || p === "custom_fields") return "custom-fields";
      if (p === "trash" || p === "recently-deleted") return "trash";
      if (p === "audit" || p === "audit-logs") return "audit";
    }
    return "general";
  };

  const [activeTab, setActiveTab] = useState<OrgTab>(getInitialTab);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // General Form
  const [name, setName] = useState(currentOrganization?.name || "");
  const [currency, setCurrency] = useState(currentOrganization?.currency || "INR");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Members State
  const [members, setMembers] = useState<Member[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "accountant">("member");
  const [isInviting, setIsInviting] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");

  // Trash State
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [isTrashLoading, setIsTrashLoading] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  // Load existing org details
  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name);
      setCurrency(currentOrganization.currency || "INR");
      // Fetch full org metadata
      api.get(`/organizations/${currentOrganization.id}`).then(({ data }) => {
        if (data) {
          setName(data.name || currentOrganization.name);
          setCurrency(data.currency || "INR");
          setGstin(data.gstin || "");
          setPan(data.pan || "");
          setAddress(data.address_line1 || data.address || "");
          setCity(data.city || "");
          setState(data.state || "");
          setPostalCode(data.postal_code || "");
        }
      }).catch(() => {});
    }
  }, [currentOrganization]);

  // Load members when members tab active
  useEffect(() => {
    if (activeTab === "members" && currentOrganization?.id) {
      setIsMembersLoading(true);
      api.get(`/organizations/${currentOrganization.id}/members`)
        .then(({ data }) => {
          setMembers(Array.isArray(data) ? data : data?.data || []);
        })
        .catch(() => {
          // Fallback member representation
          setMembers([
            {
              id: "mem-1",
              userId: "u-1",
              email: "owner@accountiva.com",
              name: "Administrator (You)",
              role: "owner",
              createdAt: new Date().toISOString(),
            },
          ]);
        })
        .finally(() => setIsMembersLoading(false));
    }
  }, [activeTab, currentOrganization?.id]);

  // Load trash items
  useEffect(() => {
    if (activeTab === "trash") {
      setIsTrashLoading(true);
      api.get("/trash")
        .then(({ data }) => {
          setTrashItems(Array.isArray(data) ? data : data?.data || []);
        })
        .catch(() => setTrashItems([]))
        .finally(() => setIsTrashLoading(false));
    }
  }, [activeTab]);

  // Load audit logs
  useEffect(() => {
    if (activeTab === "audit" && currentOrganization?.id) {
      setIsAuditLoading(true);
      api.get(`/organizations/${currentOrganization.id}/audit-logs`)
        .then(({ data }) => {
          setAuditLogs(Array.isArray(data) ? data : data?.data || []);
        })
        .catch(() => setAuditLogs([]))
        .finally(() => setIsAuditLoading(false));
    }
  }, [activeTab, currentOrganization?.id]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization?.id) return;

    try {
      setIsSavingGeneral(true);
      await api.put(`/organizations/${currentOrganization.id}`, {
        name: name.trim(),
        currency,
        gstin: gstin.trim(),
        pan: pan.trim(),
        address_line1: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
      });

      await fetchOrganizations();
      toast.success("Organization profile updated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update organization");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization?.id || !inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      await api.post(`/organizations/${currentOrganization.id}/invitations`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      toast.success(`Invitation sent to ${inviteEmail.trim()}!`);
      setInviteEmail("");
      setIsInviteOpen(false);
      // Reload members
      const { data } = await api.get(`/organizations/${currentOrganization.id}/members`);
      setMembers(Array.isArray(data) ? data : data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRestoreTrash = async (item: TrashItem) => {
    try {
      await api.post("/trash/restore", {
        id: item.id,
        entity_type: item.entity_type,
      });
      toast.success(`Restored ${item.title || item.entity_type}!`);
      setTrashItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to restore record");
    }
  };

  const tabs = [
    { id: "general" as OrgTab, label: "Organization Details", icon: Building2 },
    { id: "branding" as OrgTab, label: "Branding & Logos", icon: Palette },
    { id: "members" as OrgTab, label: "Team & Invites", icon: Users },
    { id: "custom-fields" as OrgTab, label: "Custom Fields", icon: SlidersHorizontal },
    { id: "trash" as OrgTab, label: "Recently Deleted", icon: Trash2 },
    { id: "audit" as OrgTab, label: "Audit Trail", icon: ShieldCheck },
  ];

  return (
    <div className="px-8 pt-4 md:pt-5 pb-8 max-w-5xl mx-auto space-y-6 flex-1 w-full flex flex-col">
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Link to="/settings" className="hover:text-foreground">Settings</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Organization</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
          Workspace & Organization Administration
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure company identity, team permissions, branding templates, and data retention.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap text-left cursor-pointer",
                activeTab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          {/* 1. General Profile */}
          {activeTab === "general" && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Organization Profile</CardTitle>
                <CardDescription className="text-xs">
                  Legal company identity, tax compliance codes, and base billing currency.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveGeneral} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="orgAdminName">Legal Business Name *</Label>
                      <Input
                        id="orgAdminName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="orgAdminCurrency">Base Currency</Label>
                      <Select
                        value={currency}
                        onChange={setCurrency}
                        options={[
                          { id: "INR", name: "INR (₹ - Indian Rupee)" },
                          { id: "USD", name: "USD ($ - US Dollar)" },
                          { id: "EUR", name: "EUR (€ - Euro)" },
                          { id: "GBP", name: "GBP (£ - British Pound)" },
                          { id: "AED", name: "AED (د.إ - UAE Dirham)" },
                        ]}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="orgAdminGstin">GSTIN</Label>
                      <Input
                        id="orgAdminGstin"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        maxLength={15}
                        className="font-mono uppercase text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="orgAdminPan">PAN</Label>
                      <Input
                        id="orgAdminPan"
                        value={pan}
                        onChange={(e) => setPan(e.target.value.toUpperCase())}
                        maxLength={10}
                        className="font-mono uppercase text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="orgAdminPostal">Postal Code</Label>
                      <Input
                        id="orgAdminPostal"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        maxLength={6}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="orgAdminAddress">Registered Office Address</Label>
                      <Input
                        id="orgAdminAddress"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="orgAdminCity">City</Label>
                      <Input
                        id="orgAdminCity"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="orgAdminState">State</Label>
                      <Input
                        id="orgAdminState"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button type="submit" disabled={isSavingGeneral} className="font-semibold shadow-xs">
                      {isSavingGeneral ? "Saving Changes..." : "Save Organization"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 2. Branding & Logos */}
          {activeTab === "branding" && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Branding & Visuals</CardTitle>
                <CardDescription className="text-xs">
                  Upload company logo for printed invoices and configure digital signatures.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border border-dashed border-border/80 bg-muted/20">
                  <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center font-black text-2xl text-primary shadow-xs">
                    {name ? name.charAt(0).toUpperCase() : "A"}
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="text-xs font-bold text-foreground">Organization Primary Logo</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Recommended: High resolution PNG or SVG with transparent background (under 5MB).
                    </p>
                    <div className="pt-2">
                      <Button variant="outline" size="sm" onClick={() => toast.info("Select a logo file from disk")}>
                        <UploadCloud className="size-3.5 mr-1.5" />
                        <span>Upload Logo</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                  <h4 className="text-xs font-bold text-foreground">Invoice Document Palette</h4>
                  <p className="text-xs text-muted-foreground">
                    Invoices and public views use your current workspace accent theme ({accentColor}).
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3. Team & Members */}
          {activeTab === "members" && (() => {
            const roleCounts = {
              all: members.length,
              owner: members.filter((m) => m.role === "owner").length,
              admin: members.filter((m) => m.role === "admin").length,
              member: members.filter((m) => m.role === "member" || (m.role as any) === "staff").length,
              accountant: members.filter((m) => m.role === "accountant").length,
            };

            const filteredMembers = members.filter((m) => {
              if (selectedRoleFilter !== "all") {
                if (selectedRoleFilter === "member") {
                  if (m.role !== "member" && (m.role as any) !== "staff") return false;
                } else if (m.role !== selectedRoleFilter) {
                  return false;
                }
              }
              if (memberSearch.trim()) {
                const q = memberSearch.trim().toLowerCase();
                const nameMatch = (m.name || "").toLowerCase().includes(q);
                const emailMatch = (m.email || "").toLowerCase().includes(q);
                const roleMatch = (m.role || "").toLowerCase().includes(q);
                return nameMatch || emailMatch || roleMatch;
              }
              return true;
            });

            const rolesList: Array<{ id: string; label: string }> = [
              { id: "all", label: `All (${roleCounts.all})` },
              { id: "owner", label: `Owner (${roleCounts.owner})` },
              { id: "admin", label: `Admin (${roleCounts.admin})` },
              { id: "member", label: `Member (${roleCounts.member})` },
              { id: "accountant", label: `Accountant (${roleCounts.accountant})` },
            ];

            return (
              <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Workspace Members</CardTitle>
                    <CardDescription className="text-xs">
                      Manage team access, invite accountants, and assign operational roles.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setIsInviteOpen(true)} className="gap-1.5 font-semibold shadow-xs">
                    <Plus className="size-3.5" />
                    <span>Invite Member</span>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters & Search Toolbar */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    {/* Role Filter Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {rolesList.map((rf) => {
                        const active = selectedRoleFilter === rf.id;
                        return (
                          <button
                            key={rf.id}
                            type="button"
                            onClick={() => setSelectedRoleFilter(rf.id)}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border",
                              active
                                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                                : "bg-card/70 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >
                            {rf.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full sm:w-64">
                      <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search members..."
                        className="h-8 pl-8 text-xs bg-card/60"
                      />
                    </div>
                  </div>

                  {isMembersLoading ? (
                    <div className="py-12 flex justify-center">
                      <Spinner size="md" />
                    </div>
                  ) : members.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No teammates yet"
                      description="Invite collaborators, project managers, or your chartered accountant."
                      actionLabel="Invite Member"
                      onAction={() => setIsInviteOpen(true)}
                    />
                  ) : filteredMembers.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <p className="text-xs text-muted-foreground">
                        No members found matching "{memberSearch || selectedRoleFilter}".
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMemberSearch("");
                          setSelectedRoleFilter("all");
                        }}
                        className="text-xs text-primary"
                      >
                        Reset Filters
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40 text-xs">
                      {filteredMembers.map((m) => (
                        <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                              {(m.name || m.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{m.name || m.email}</div>
                              <div className="text-[11px] text-muted-foreground">{m.email}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={m.role === "owner" ? "default" : "secondary"}
                              className="capitalize text-[10px]"
                            >
                              {m.role}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* 4. Custom Fields */}
          {activeTab === "custom-fields" && <CustomFieldsManagement />}

          {/* 5. Recently Deleted / Trash */}
          {activeTab === "trash" && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Recently Deleted Items</CardTitle>
                <CardDescription className="text-xs">
                  Restore mistakenly deleted invoices, quotes, and catalog products within 30 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isTrashLoading ? (
                  <div className="py-12 flex justify-center">
                    <Spinner size="md" />
                  </div>
                ) : trashItems.length === 0 ? (
                  <EmptyState
                    icon={Trash2}
                    title="Recycle bin is empty"
                    description="Any soft-deleted billing records will appear here for recovery."
                  />
                ) : (
                  <div className="divide-y divide-border/40 text-xs">
                    {trashItems.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-foreground">{item.title || item.entity_type}</div>
                          <div className="text-[11px] text-muted-foreground">
                            Type: {item.entity_type} • Deleted {item.deleted_at}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreTrash(item)}
                          className="gap-1.5 text-xs text-primary"
                        >
                          <RotateCcw className="size-3.5" />
                          <span>Restore</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 5. Audit Trail */}
          {activeTab === "audit" && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Security & Audit Timeline</CardTitle>
                <CardDescription className="text-xs">
                  Immutable record of user events, billing modifications, and permission shifts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAuditLoading ? (
                  <div className="py-12 flex justify-center">
                    <Spinner size="md" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <EmptyState
                    icon={ShieldCheck}
                    title="No security events recorded"
                    description="Administrative activities will be logged here automatically."
                  />
                ) : (
                  <div className="space-y-3 text-xs">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3 rounded-xl border border-border/40 bg-muted/10 flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-foreground">{log.action}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            By {log.user_email} {log.details ? `• ${log.details}` : ""}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {log.created_at}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Team Member"
        description="Send an email invitation to join this workspace with defined access."
        maxWidth="md"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inviteEmail">Colleague Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="inviteEmail"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inviteRole">Workspace Role</Label>
            <Select
              value={inviteRole}
              onChange={(val) => setInviteRole(val as any)}
              options={[
                { id: "member", name: "Member (Create and manage invoices)" },
                { id: "accountant", name: "Accountant (Read-only financials and exports)" },
                { id: "admin", name: "Admin (Full operational control)" },
              ]}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isInviting} className="gap-1.5 font-bold shadow-xs">
              <span>{isInviting ? "Sending..." : "Send Invitation"}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default OrganizationSettings;

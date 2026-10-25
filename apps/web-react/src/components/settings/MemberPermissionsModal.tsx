import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  FileText,
  Users,
  Package,
  Receipt,
  CreditCard,
  BarChart3,
  BookOpen,
  Landmark,
  Settings,
  Eye,
  CircleSlash,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { isFeatureEnabled, FeatureFlags } from "@accountiva/shared";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MemberPermissionsModalProps {
  isOpen: boolean;
  member: any | null;
  organizationId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

const moduleFeatureMap: Record<string, keyof FeatureFlags> = {
  invoices: "invoices",
  estimates: "estimates",
  customers: "customers",
  items: "items",
  expenses: "expenses",
  reports: "reports",
  journals: "journals",
  banking: "banking",
};

const allModules = [
  { id: "invoices", name: "Invoices", icon: FileText, description: "Manage billing and payments" },
  { id: "estimates", name: "Estimates", icon: Receipt, description: "Quotes and proposals" },
  { id: "customers", name: "Customers", icon: Users, description: "Client directory and details" },
  { id: "items", name: "Items & Services", icon: Package, description: "Product and service catalog" },
  { id: "expenses", name: "Expenses", icon: CreditCard, description: "Track business spending" },
  { id: "reports", name: "Reports", icon: BarChart3, description: "Financial analytics and exports" },
  { id: "journals", name: "Journal Entries", icon: BookOpen, description: "Double-entry accounting records" },
  { id: "banking", name: "Banking", icon: Landmark, description: "Bank sync and reconciliation" },
];

export function MemberPermissionsModal({
  isOpen,
  member,
  organizationId,
  onClose,
  onUpdated,
}: MemberPermissionsModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});

  const modules = useMemo(() => {
    return allModules.filter((m) => {
      const feat = moduleFeatureMap[m.id];
      return !feat || isFeatureEnabled(feat);
    });
  }, []);

  useEffect(() => {
    if (member) {
      const initial: Record<string, string[]> = {};
      const rawPerms = member.permissions || member.raw?.permissions || {};
      allModules.forEach((m) => {
        initial[m.id] = Array.isArray(rawPerms[m.id]) ? [...rawPerms[m.id]] : [];
      });
      setSelectedPermissions(initial);
    }
  }, [member]);

  if (!member) return null;

  const getPermissionLevel = (moduleId: string): "None" | "View" | "Manage" => {
    const perms = selectedPermissions[moduleId] || [];
    if (perms.includes("create") || perms.includes("edit") || perms.includes("delete")) {
      return "Manage";
    }
    if (perms.includes("view")) {
      return "View";
    }
    return "None";
  };

  const setPermissionLevel = (moduleId: string, level: "None" | "View" | "Manage") => {
    setSelectedPermissions((prev) => {
      const updated = { ...prev };
      if (level === "None") {
        updated[moduleId] = [];
      } else if (level === "View") {
        updated[moduleId] = ["view"];
      } else if (level === "Manage") {
        updated[moduleId] = ["view", "create", "edit", "delete"];
      }
      return updated;
    });
  };

  const setAllPermissions = (level: "None" | "View" | "Manage") => {
    setSelectedPermissions((prev) => {
      const updated = { ...prev };
      modules.forEach((m) => {
        if (level === "None") updated[m.id] = [];
        else if (level === "View") updated[m.id] = ["view"];
        else if (level === "Manage") updated[m.id] = ["view", "create", "edit", "delete"];
      });
      return updated;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.patch(`/organizations/${organizationId}/members/${member.id}`, {
        permissions: selectedPermissions,
      });
      toast.success("Permissions updated successfully");
      onUpdated?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update permissions");
    } finally {
      setLoading(false);
    }
  };

  const memberName =
    member.name ||
    member.profiles?.full_name ||
    member.user?.name ||
    member.email ||
    "Team Member";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-6 gap-5 bg-card border-border">
        {/* Header */}
        <DialogHeader className="space-y-1 text-left border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <Shield className="size-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Manage Granular Permissions
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure module-level access and restrictions for {memberName}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Non-staff warning */}
        {member.role !== "staff" && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-center text-xs text-amber-700 dark:text-amber-400 font-medium">
            <AlertCircle className="size-4 text-amber-500 shrink-0" />
            <p>
              This user has the <strong>{member.role}</strong> role. Owners and Admins have full access to all features regardless of these granular settings.
            </p>
          </div>
        )}

        {/* Quick Presets Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60">
          <span className="text-xs font-medium text-muted-foreground pl-1">Quick Presets:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAllPermissions("Manage")}
              className="h-7 px-2.5 text-xs gap-1 cursor-pointer bg-background"
            >
              <Settings className="size-3 text-primary" />
              <span>Full Access</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAllPermissions("View")}
              className="h-7 px-2.5 text-xs gap-1 cursor-pointer bg-background"
            >
              <Eye className="size-3 text-sky-600 dark:text-sky-400" />
              <span>View Only</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAllPermissions("None")}
              className="h-7 px-2.5 text-xs gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <CircleSlash className="size-3" />
              <span>Revoke All</span>
            </Button>
          </div>
        </div>

        {/* Modules List */}
        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
          {modules.map((module) => {
            const Icon = module.icon;
            const currentLevel = getPermissionLevel(module.id);

            return (
              <div
                key={module.id}
                className="p-3 rounded-xl border border-border/60 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-border hover:bg-muted/20 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-colors shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-foreground truncate">
                      {module.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {module.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-lg border border-border/60 shrink-0 self-end sm:self-center">
                  {(["None", "View", "Manage"] as const).map((level) => {
                    const isSelected = currentLevel === level;
                    const LevelIcon =
                      level === "None" ? CircleSlash : level === "View" ? Eye : Settings;

                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setPermissionLevel(module.id, level)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                          isSelected
                            ? "bg-background text-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <LevelIcon
                          className={cn(
                            "size-3",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <span>{level}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border/60 pt-4 flex sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="gap-1.5 cursor-pointer"
          >
            {loading && <Loader2 className="size-3.5 animate-spin mr-1" />}
            <span>Save Permissions</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

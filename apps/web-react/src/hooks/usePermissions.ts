import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

export type Module =
  | "invoices"
  | "estimates"
  | "customers"
  | "items"
  | "creditNotes"
  | "expenses"
  | "reports"
  | "banking"
  | "journals"
  | "settings";

export type Action = "view" | "create" | "edit" | "delete";

export function usePermissions() {
  const { currentOrganization } = useAuth();

  const isOwner = currentOrganization?.role === "owner";
  const isAdmin = currentOrganization?.role === "admin";
  const isStaff = currentOrganization?.role === "staff";

  /**
   * Check if the current user has permission to perform an action in a module.
   * Owners and Admins always have full access.
   */
  const can = useMemo(() => {
    return (module: Module, action: Action = "view"): boolean => {
      // Owners and Admins bypass all checks
      if (isOwner || isAdmin) return true;

      // Settings module (view only) is accessible to everyone
      if (module === "settings" && action === "view") return true;

      // For Staff, check the permissions object on currentOrganization
      const permissions = currentOrganization?.permissions;
      if (!permissions || typeof permissions !== "object") return false;

      const modulePermissions = (permissions as Record<string, string[]>)[module];
      if (!Array.isArray(modulePermissions)) return false;

      return modulePermissions.includes(action);
    };
  }, [isOwner, isAdmin, currentOrganization?.permissions]);

  const canView = (module: Module) => can(module, "view");
  const canManage = (module: Module) =>
    can(module, "create") || can(module, "edit") || can(module, "delete");

  return {
    isOwner,
    isAdmin,
    isStaff,
    can,
    canView,
    canManage,
  };
}

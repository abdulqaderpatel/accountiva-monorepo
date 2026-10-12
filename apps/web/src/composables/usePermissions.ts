import { computed } from 'vue';
import { useAuthStore } from '@/stores/authStore';

export type Module = 'invoices' | 'estimates' | 'customers' | 'items' | 'expenses' | 'reports' | 'banking' | 'journals' | 'settings';
export type Action = 'view' | 'create' | 'edit' | 'delete';

export function usePermissions() {
  const authStore = useAuthStore();
  
  const isOwner = computed(() => authStore.currentOrganization?.role === 'owner');
  const isAdmin = computed(() => authStore.currentOrganization?.role === 'admin');
  const isStaff = computed(() => authStore.currentOrganization?.role === 'staff');

  /**
   * Check if the current user has permission to perform an action in a module.
   * Owners and Admins always have full access.
   */
  const can = (module: Module, action: Action = 'view'): boolean => {
    // Owners and Admins bypass all checks
    if (isOwner.value || isAdmin.value) return true;
    
    // Settings module (view only) is accessible to everyone
    if (module === 'settings' && action === 'view') return true;

    // For Staff, check the permissions object
    const permissions = authStore.currentOrganization?.permissions;
    if (!permissions || typeof permissions !== 'object') return false;

    const modulePermissions = (permissions as any)[module];
    if (!Array.isArray(modulePermissions)) return false;

    return modulePermissions.includes(action);
  };

  /**
   * Check if the current user can view a module.
   */
  const canView = (module: Module) => can(module, 'view');
  
  /**
   * Check if the current user can manage (create/edit/delete) in a module.
   */
  const canManage = (module: Module) => can(module, 'create') || can(module, 'edit') || can(module, 'delete');

  return {
    isOwner,
    isAdmin,
    isStaff,
    can,
    canView,
    canManage
  };
}

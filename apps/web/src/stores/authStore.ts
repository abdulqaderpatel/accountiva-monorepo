import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner';
import { authBaseURL, authClient } from '@/lib/auth-client';
import { useCustomerStore } from './customerStore';
import { useEstimateStore } from './estimateStore';
import { useExpenseStore } from './expenseStore';
import { useInvoiceStore } from './invoiceStore';
import { useItemStore } from './itemStore';
// import { useProjectStore } from './projectStore';
import { useReportStore } from './reportStore';
// import { useTimeEntryStore } from './timeEntryStore';
import { useTransactionStore } from './transactionStore';
import { useJournalStore } from './journalStore';
import { useAuditLogStore } from './auditLogStore';
import { useCreditNoteStore } from './creditNoteStore';
import { useBillStore } from './billStore';
import { useVendorStore } from './vendorStore';
import { useNotificationStore } from './notificationStore';
import { useMemberStore } from './memberStore';
import { useBookmarkStore } from './bookmarkStore';
import { useTrashStore } from './trashStore';
import api, { cancelOrganizationRequests } from '@/lib/api';
import { isFeatureEnabled } from '@/config/features';

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string;
  [key: string]: any;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  user: User;
  [key: string]: any;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const loading = ref(true);
  const initialized = ref(false);

  const profile = ref<any | null>(null);
  const profileLoading = ref(false);

  const organizations = ref<any[]>([]);
  const currentOrganization = ref<any | null>(null);
  const hasCompletedTour = ref(false);
  const orgsLoading = ref(false);
  const isAdmin = ref(false);

  const isAuthenticated = computed(() => !!session.value);
  const hasOrganizations = computed(() => organizations.value.length > 0);
  const ownedOrganizationsCount = computed(() => {
    return organizations.value.filter((org: any) => org.role === 'owner').length;
  });

  // Set session and user (for UI state only; auth is cookie-based)
  const setSession = (newSession: Session | null) => {
    session.value = newSession;
    user.value = newSession?.user ?? null;

    localStorage.removeItem('accountiva_session');
    if (!newSession) {
      localStorage.removeItem('accountiva_org_id');
      localStorage.removeItem('accountiva_org_currency');
      currentOrganization.value = null;
      organizations.value = [];
      hasCompletedTour.value = false;
    }
  };

  // Fetch Organizations
  const fetchOrganizations = async () => {
    try {
      orgsLoading.value = true;
      const { data } = await api.get('/organizations');
      organizations.value = data;

      // Auto-select first organization if none selected or current one not in list
      const storedOrgId = localStorage.getItem('accountiva_org_id');
      if (data.length > 0) {
        const found = data.find((o: any) => o.id === storedOrgId);
        if (found) {
          setCurrentOrganization(found);
        } else {
          setCurrentOrganization(data[0]);
        }
      } else {
        setCurrentOrganization(null);
      }
    } catch (err) {
      console.error('Organizations fetch error:', err);
    } finally {
      orgsLoading.value = false;
    }
  };

  const setCurrentOrganization = (org: any) => {
    const previousOrganizationId = currentOrganization.value?.id as string | undefined;
    const nextOrganizationId = org?.id as string | undefined;
    if (previousOrganizationId === nextOrganizationId) {
      currentOrganization.value = org;
      if (org) {
        localStorage.setItem('accountiva_org_currency', org.currency || 'INR');
      }
      return;
    }

    cancelOrganizationRequests(previousOrganizationId);
    currentOrganization.value = org;
    if (org) {
      localStorage.setItem('accountiva_org_id', org.id);
      localStorage.setItem('accountiva_org_currency', org.currency || 'INR');
    } else {
      localStorage.removeItem('accountiva_org_id');
      localStorage.removeItem('accountiva_org_currency');
    }

    // Refresh data stores when org changes
    if (org) {
      const customerStore = useCustomerStore();
      const invoiceStore = useInvoiceStore();
      const estimateStore = useEstimateStore();
      const expenseStore = useExpenseStore();
      const itemStore = useItemStore();
      // const projectStore = useProjectStore();
      // const timeEntryStore = useTimeEntryStore();
      const transactionStore = useTransactionStore();
      const reportStore = useReportStore();
      const journalStore = useJournalStore();
      const auditLogStore = useAuditLogStore();
      const creditNoteStore = useCreditNoteStore();
      const billStore = useBillStore();
      const vendorStore = useVendorStore();
      const notificationStore = useNotificationStore();
      const memberStore = useMemberStore();
      const bookmarkStore = useBookmarkStore();
      const trashStore = useTrashStore();

      // Reset and Refetch
      customerStore.reset();
      invoiceStore.reset();
      estimateStore.reset();
      expenseStore.reset();
      itemStore.reset();
      // projectStore.reset();
      // timeEntryStore.reset();
      transactionStore.setOrganization(org.id);
      transactionStore.reset();
      reportStore.reset();
      journalStore.reset();
      auditLogStore.reset();
      creditNoteStore.reset();
      billStore.reset();
      vendorStore.reset();
      notificationStore.reset();
      bookmarkStore.reset();
      trashStore.reset();
      memberStore.clearCache();

      // Trigger refetches together; only for enabled modules
      const refetchPromises: Promise<any>[] = [];
      if (isFeatureEnabled('customers')) refetchPromises.push(customerStore.fetchCustomers(true));
      if (isFeatureEnabled('invoices')) refetchPromises.push(invoiceStore.fetchInvoices(true));
      if (isFeatureEnabled('estimates')) refetchPromises.push(estimateStore.fetchEstimates(true));
      if (isFeatureEnabled('expenses')) refetchPromises.push(expenseStore.fetchExpenses(true));
      if (isFeatureEnabled('items')) refetchPromises.push(itemStore.fetchItems(true));
      if (isFeatureEnabled('transactions')) refetchPromises.push(transactionStore.fetchTransactions(true));
      if (isFeatureEnabled('reports')) refetchPromises.push(reportStore.fetchReports(true));
      if (isFeatureEnabled('journals')) refetchPromises.push(journalStore.fetchJournals(1, 10, "", true));
      if (isFeatureEnabled('creditNotes')) refetchPromises.push(creditNoteStore.fetchCreditNotes(1, 10, "", "All", true));
      if (isFeatureEnabled('bills')) refetchPromises.push(billStore.fetchBills(1, 10, "", "All", true));
      if (isFeatureEnabled('vendors')) refetchPromises.push(vendorStore.fetchVendors(true));
      refetchPromises.push(notificationStore.fetchNotifications(true));
      refetchPromises.push(bookmarkStore.fetchBookmarks(true));

      void Promise.allSettled(refetchPromises);
    } else {
      useTransactionStore().setOrganization(null);
      useCustomerStore().reset();
      useInvoiceStore().reset();
      useEstimateStore().reset();
      useExpenseStore().reset();
      useItemStore().reset();
      useReportStore().reset();
      useJournalStore().reset();
      useAuditLogStore().reset();
      useCreditNoteStore().reset();
      useBillStore().reset();
      useVendorStore().reset();
      useNotificationStore().reset();
      useBookmarkStore().reset();
      useTrashStore().reset();
      useMemberStore().clearCache();
    }
  };

  const updateCurrentOrgPlan = (planData: {
    plan: string;
    plan_id?: string;
    plan_expires_at?: string;
    billing_cycle?: string;
  }) => {
    if (!currentOrganization.value) return;
    const updated = {
      ...currentOrganization.value,
      plan: planData.plan,
      plan_id: planData.plan_id || (planData.plan === 'pro' ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001'),
      plan_expires_at: planData.plan_expires_at,
      billing_cycle: planData.billing_cycle || currentOrganization.value.billing_cycle,
      subscription_status: 'active',
    };
    currentOrganization.value = updated;
    organizations.value = organizations.value.map((org: any) =>
      org.id === updated.id ? { ...org, ...updated } : org
    );
  };

  const createOrganization = async (formData: FormData) => {
    try {
      const { data } = await api.post('/organizations', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      organizations.value.push(data);
      setCurrentOrganization(data);
      return data;
    } catch (err) {
      console.error('Create organization error:', err);
      throw err;
    }
  };

  const updateOrganization = async (id: string, formData: FormData) => {
    try {
      const { data } = await api.put(`/organizations/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update in local list
      const index = organizations.value.findIndex((o) => o.id === id);
      if (index !== -1) {
        organizations.value[index] = { ...organizations.value[index], ...data };
      }

      // Update current org if it's the one being edited
      if (currentOrganization.value?.id === id) {
        currentOrganization.value = { ...currentOrganization.value, ...data };
      }

      return data;
    } catch (err) {
      console.error('Update organization error:', err);
      throw err;
    }
  };

  const updateOrganizationBranding = async (id: string, formData: FormData) => {
    try {
      const { data } = await api.put(`/organizations/${id}/branding`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const index = organizations.value.findIndex((organization) => organization.id === id);
      if (index !== -1) {
        organizations.value[index] = { ...organizations.value[index], ...data };
      }
      if (currentOrganization.value?.id === id) {
        currentOrganization.value = { ...currentOrganization.value, ...data };
      }

      return data;
    } catch (err) {
      console.error('Update organization branding error:', err);
      throw err;
    }
  };

  // Fetch Profile (using backend API)
  const fetchProfile = async () => {
    try {
      if (!user.value) return;
      profileLoading.value = true;
      const { data } = await api.get('/profile');
      profile.value = data;
      const localCompleted = localStorage.getItem(`accountiva_tour_completed_${user.value.id}`) === 'true';
      hasCompletedTour.value = Boolean(data?.has_completed_tour || localCompleted);
      if (data?.has_completed_tour && !localCompleted) {
        localStorage.setItem(`accountiva_tour_completed_${user.value.id}`, 'true');
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      profileLoading.value = false;
    }
  };

  const fetchAdminAccess = async () => {
    try {
      const { data } = await api.get('/admin/access');
      isAdmin.value = data?.isAdmin === true;
    } catch {
      isAdmin.value = false;
    }
  };

  // Update Profile
  const updateProfile = async (formData: FormData) => {
    try {
      const { data } = await api.put('/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      profile.value = data;
      hasCompletedTour.value = data.has_completed_tour || false;
      return data;
    } catch (err) {
      console.error('Profile update error:', err);
      throw err;
    }
  };

  const completeTour = async () => {
    try {
      hasCompletedTour.value = true;
      if (user.value?.id) {
        localStorage.setItem(`accountiva_tour_completed_${user.value.id}`, 'true');
      }
      const { data } = await api.patch('/profile', { has_completed_tour: true });
      profile.value = data;
    } catch (err) {
      console.error('Complete tour error:', err);
    }
  };

  const refreshSession = async () => {
    try {
      const { data: betterSession } = await authClient.getSession();
      if (betterSession) {
        const mappedSession: Session = {
          access_token: 'cookie-managed',
          refresh_token: '',
          user: betterSession.user as any,
        };
        setSession(mappedSession);
        return mappedSession;
      }
      return null;
    } catch (err) {
      console.error('[AuthStore] Session refresh failed:', err);
      setSession(null);
      return null;
    }
  };

  let initPromise: Promise<void> | null = null;

  // Initialize session
  const init = async () => {
    if (initialized.value) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      loading.value = true;
      try {
        const sess = await refreshSession();
        if (sess) {
          const defaultOrgId = localStorage.getItem('accountiva_default_org_id');
          if (defaultOrgId) {
            localStorage.setItem('accountiva_org_id', defaultOrgId);
          }
          await Promise.all([fetchProfile(), fetchOrganizations(), fetchAdminAccess()]);
        }
      } catch (err) {
        console.error('[AuthStore] Init error:', err);
      } finally {
        initialized.value = true;
        loading.value = false;
        initPromise = null;
      }
    })();

    return initPromise;
  };

  // Add a clearInit method to reset the initialization state
  const clearInit = () => {
    initialized.value = false;
    initPromise = null;
  };

  const signIn = async (email: string, password: string) => {
    const { data: res, error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Failed to sign in');
    }

    if (res) {
      // Check for our custom interceptor response
      if ((res as any).error === 'EMAIL_NOT_VERIFIED') {
        return res;
      }

      // Session cookie is set automatically by Better Auth
      const mappedSession: Session = {
        access_token: 'cookie-managed',
        refresh_token: '',
        user: res.user as any,
      };
      setSession(mappedSession);
      await fetchProfile();
      await fetchOrganizations();
      return { user: res.user, session: mappedSession };
    }
  };

  const signUp = async (signupData: any) => {
    const verificationUrl = new URL('/verify-email', window.location.origin);
    if (signupData.redirect) {
      verificationUrl.searchParams.set('redirect', signupData.redirect);
    }
    if (signupData.email) {
      verificationUrl.searchParams.set('email', signupData.email);
    }

    const { data: res, error } = await authClient.signUp.email({
      email: signupData.email,
      password: signupData.password,
      name: signupData.name,
      callbackURL: verificationUrl.toString(),
    });

    if (error) {
      if (error.code === 'USER_ALREADY_EXISTS') {
        throw new Error(
          "This email is already registered. If you haven't verified it, please check your inbox or try logging in.",
        );
      }
      throw new Error(error.message || 'Failed to sign up');
    }

    return { user: res?.user };
  };

  const signInWithSocial = async (provider: 'google') => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || '/dashboard';
    const callbackURL = window.location.origin + (redirect.startsWith('/') ? redirect : `/${redirect}`);
    const errorCallbackURL = window.location.origin + '/login';

    const { error } = await authClient.signIn.social({
      provider,
      callbackURL,
      errorCallbackURL,
    });

    if (error) {
      throw new Error(error.message || `Failed to sign in with ${provider}`);
    }
  };

  const forgotPassword = async (email: string) => {
    const { error } = await authClient.forgetPassword({
      email,
      callbackURL: window.location.origin + '/reset-password',
    });

    if (error) {
      throw new Error(error.message || 'Failed to send reset email');
    }
  };

  const resetPassword = async (password: string, token?: string) => {
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: token,
    });
    if (error) throw new Error(error.message);
    return { message: 'Password updated successfully' };
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
      setSession(null);
      profile.value = null;
      isAdmin.value = false;
      initialized.value = false;

      const stores = [
        useCustomerStore(),
        useEstimateStore(),
        useExpenseStore(),
        useInvoiceStore(),
        useItemStore(),
        // useProjectStore(),
        useReportStore(),
        // useTimeEntryStore(),
        useTransactionStore(),
        useAuditLogStore(),
        useJournalStore(),
        useCreditNoteStore(),
        useBillStore(),
        useVendorStore(),
        useNotificationStore(),
      ];
      stores.forEach((s) => s.reset());
      useMemberStore().clearCache();

      if (window.location.hash || window.location.search) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return {
    user,
    profile,
    profileLoading,
    organizations,
    currentOrganization,
    hasCompletedTour,
    orgsLoading,
    session,
    loading,
    initialized,
    isAuthenticated,
    isAdmin,
    hasOrganizations,
    ownedOrganizationsCount,
    init,
    fetchProfile,
    updateProfile,
    completeTour,
    fetchOrganizations,
    updateCurrentOrgPlan,
    setCurrentOrganization,
    createOrganization,
    updateOrganization,
    updateOrganizationBranding,
    signIn,
    signUp,
    signInWithSocial,
    signOut,
    forgotPassword,
    resetPassword,
  };
});

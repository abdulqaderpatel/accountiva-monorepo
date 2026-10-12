import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/Login.vue'),
    meta: { title: 'Login' },
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('../views/auth/Signup.vue'),
    meta: { title: 'Sign Up' },
  },
  {
    path: '/check-email',
    name: 'CheckEmail',
    component: () => import('../views/auth/CheckEmail.vue'),
    meta: { title: 'Check Your Email' },
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: () => import('../views/auth/VerifyEmail.vue'),
    meta: { title: 'Verify Email' },
  },
  {
    path: '/',
    name: 'Landing',
    component: () => import('../views/Landing.vue'),
    meta: { title: 'AI-Powered Invoicing & Accounting' },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true, title: 'Dashboard' },
  },
  {
    path: '/banking',
    name: 'Banking',
    component: () => import('../views/Banking.vue'),
    meta: { requiresAuth: true, title: 'Banking & Reconciliation', feature: 'banking' },
  },
  {
    path: '/transactions',
    name: 'Transactions',
    component: () => import('../views/Transactions.vue'),
    meta: { requiresAuth: true, title: 'Transactions', feature: 'transactions' },
  },
  {
    path: '/invoices',
    name: 'Invoices',
    component: () => import('../views/Invoices.vue'),
    meta: { requiresAuth: true, title: 'Invoices' },
  },
  {
    path: '/invoices/view/:id',
    alias: '/invoices/:id',
    name: 'PublicInvoiceView',
    component: () => import('../views/PublicInvoiceView.vue'),
    meta: { requiresAuth: false, title: 'Invoice' },
  },
  {
    path: '/sales/credit-notes',
    name: 'CreditNotes',
    component: () => import('../views/CreditNotes.vue'),
    meta: { requiresAuth: true, title: 'Credit Notes' },
  },
  {
    path: '/estimates',
    name: 'Estimates',
    component: () => import('../views/Estimates.vue'),
    meta: { requiresAuth: true, title: 'Estimates' },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/auth/ForgotPassword.vue'),
    meta: { title: 'Forgot Password' },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/auth/ResetPassword.vue'),
    meta: { title: 'Reset Password' },
  },
  {
    path: '/projects',
    redirect: '/dashboard',
  },
  {
    path: '/expenses',
    name: 'Expenses',
    component: () => import('../views/Expenses.vue'),
    meta: { requiresAuth: true, title: 'Expenses', feature: 'expenses' },
  },
  {
    path: '/bills',
    name: 'Bills',
    component: () => import('../views/Bills.vue'),
    meta: { requiresAuth: true, title: 'Bills', feature: 'bills' },
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('../views/Reports.vue'),
    meta: { requiresAuth: true, title: 'Reports', feature: 'reports' },
  },
  {
    path: '/journals',
    name: 'ManualJournals',
    component: () => import('../views/ManualJournals.vue'),
    meta: { requiresAuth: true, title: 'Journal Entries', feature: 'journals' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true, title: 'Settings' },
  },
  {
    path: '/settings/notifications',
    redirect: '/settings?tab=Notifications',
  },
  {
    path: '/settings/team',
    redirect: '/organization-settings?tab=members',
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('../views/Notifications.vue'),
    meta: { requiresAuth: true, title: 'Notification Center' },
  },
  {
    path: '/organization-settings',
    name: 'OrganizationSettings',
    component: () => import('../views/OrganizationSettings.vue'),
    meta: { requiresAuth: true, title: 'Organization Settings' },
  },
  {
    path: '/trash',
    redirect: '/organization-settings?tab=recently-deleted',
  },
  {
    path: '/customers',
    name: 'Customers',
    component: () => import('../views/Customers.vue'),
    meta: { requiresAuth: true, title: 'Customers' },
  },
  {
    path: '/customers/:id',
    name: 'CustomerDetail',
    component: () => import('../views/CustomerDetail.vue'),
    meta: { requiresAuth: true, title: 'Customer Profile' },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('../views/Onboarding.vue'),
    meta: { requiresAuth: true, title: 'Setup Your Workspace' },
  },
  {
    path: '/products-and-services/items',
    name: 'Items',
    component: () => import('../views/Items.vue'),
    meta: { requiresAuth: true, title: 'Products & Services' },
  },
  {
    path: '/items',
    redirect: '/products-and-services/items',
  },
  {
    path: '/vendors',
    name: 'Vendors',
    component: () => import('../views/Vendors.vue'),
    meta: { requiresAuth: true, title: 'Vendors', feature: 'vendors' },
  },
  {
    path: '/invite/:token',
    name: 'AcceptInvitation',
    component: () => import('../views/auth/AcceptInvitation.vue'),
    meta: { title: 'Accept Invitation' },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/AdminPanel.vue'),
    meta: { requiresAuth: true, isAdmin: true, title: 'Admin Panel' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

import { useAuthStore } from '@/stores/authStore';
import { isFeatureEnabled, type FeatureFlags } from '@/config/features';

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  if (!authStore.initialized) {
    await authStore.init();
  }

  const isAuthenticated = !!authStore.session;
  const hasOrganizations = authStore.organizations.length > 0;

  // Check if route requires an active feature
  const requiredFeature = to.meta.feature as keyof FeatureFlags | undefined;
  if (requiredFeature && !isFeatureEnabled(requiredFeature)) {
    next('/dashboard');
    return;
  }

  if (to.path === '/' && isAuthenticated) {
    next(hasOrganizations ? '/dashboard' : '/onboarding');
  } else if (to.meta.requiresAuth && !isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else if (to.meta.isAdmin) {
    if (authStore.isAdmin) {
      next();
    } else {
      next(hasOrganizations ? '/dashboard' : '/onboarding');
    }
  } else if ((to.path === '/login' || to.path === '/signup' || to.path === '/check-email') && isAuthenticated) {
    next(hasOrganizations ? '/dashboard' : '/onboarding');
  } else if (isAuthenticated && !hasOrganizations && to.path !== '/onboarding' && to.name !== 'AcceptInvitation' && to.name !== 'PublicInvoiceView') {
    // Force onboarding if no organizations, unless accepting an invite
    next('/onboarding');
  } else if (isAuthenticated && hasOrganizations && to.path === '/onboarding') {
    next('/dashboard');
  } else {
    next();
  }
});

router.afterEach((to) => {
  const baseTitle = 'Accountiva™';
  const pageTitle = to.meta.title ? `${to.meta.title} | ${baseTitle}` : baseTitle;
  document.title = pageTitle;

  // Silently cleanup OAuth URL parameters (state, code, scope, etc.) 
  // after navigation is complete to ensure a clean address bar.
  const oauthParams = ['state', 'code', 'iss', 'scope', 'authuser', 'prompt', 'error'];
  const hasOauthParams = oauthParams.some(param => to.query[param]);

  if (hasOauthParams) {
    const url = new URL(window.location.href);
    oauthParams.forEach(param => url.searchParams.delete(param));
    // Replace the URL without triggering a new navigation or page refresh
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }
});

export default router;

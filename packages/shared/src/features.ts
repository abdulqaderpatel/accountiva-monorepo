/**
 * Application Feature Flags
 *
 * Controls module visibility across navigation, routing, permissions,
 * custom fields, quick actions, and search.
 *
 * For the initial release, Accountiva operates as an Invoice-Only platform.
 * Modules can be re-enabled individually as they are completed by toggling
 * the flags below or setting environment variables (e.g. VITE_FEATURE_EXPENSES=true).
 */

export interface FeatureFlags {
  // Core Invoice-Only MVP Modules
  dashboard: boolean;
  items: boolean;
  customers: boolean;
  estimates: boolean;
  invoices: boolean;
  creditNotes: boolean;

  // Staged Modules (temporarily disabled for MVP)
  vendors: boolean;
  bills: boolean;
  expenses: boolean;
  banking: boolean;
  transactions: boolean;
  journals: boolean;
  reports: boolean;
}

const envBool = (key: string, defaultValue: boolean): boolean => {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const procEnv = typeof process !== 'undefined' ? (process as any).env : undefined;
  const val = metaEnv?.[key] ?? metaEnv?.[`EXPO_PUBLIC_${key}`] ?? procEnv?.[key] ?? procEnv?.[`EXPO_PUBLIC_${key}`];
  if (val === undefined || val === '') return defaultValue;
  return val === 'true' || val === '1';
};

export const APP_FEATURES: FeatureFlags = {
  // Active Invoice-Only Features
  dashboard: envBool('VITE_FEATURE_DASHBOARD', true),
  items: envBool('VITE_FEATURE_ITEMS', true),
  customers: envBool('VITE_FEATURE_CUSTOMERS', true),
  estimates: envBool('VITE_FEATURE_ESTIMATES', true),
  invoices: envBool('VITE_FEATURE_INVOICES', true),
  creditNotes: envBool('VITE_FEATURE_CREDIT_NOTES', true),

  // Inactive / Staged Features (default false for MVP)
  vendors: envBool('VITE_FEATURE_VENDORS', false),
  bills: envBool('VITE_FEATURE_BILLS', false),
  expenses: envBool('VITE_FEATURE_EXPENSES', false),
  banking: envBool('VITE_FEATURE_BANKING', false),
  transactions: envBool('VITE_FEATURE_TRANSACTIONS', false),
  journals: envBool('VITE_FEATURE_JOURNALS', false),
  reports: envBool('VITE_FEATURE_REPORTS', false),
};

export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return APP_FEATURES[feature] ?? false;
};

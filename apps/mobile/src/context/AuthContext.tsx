import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { AxiosResponse } from 'axios';
import api from '@accountiva/api';
import { extractAuthToken } from '../auth/session';

export interface MobileUser {
  id: string;
  email: string;
  name: string;
}

export interface MobileOrganization {
  id: string;
  name: string;
  currency?: string;
  role?: string;
}

interface AuthContextType {
  user: MobileUser | null;
  currentOrg: MobileOrganization | null;
  organizations: MobileOrganization[];
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  signup: (name: string, email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (password: string, token: string) => Promise<any>;
  resendVerification: (email: string) => Promise<any>;
  verifyEmail: (token: string) => Promise<any>;
  logout: () => Promise<void>;
  setCurrentOrg: (org: MobileOrganization | null) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  createOrganization: (name: string, currency?: string) => Promise<any>;
  deleteOrganization: (orgId: string) => Promise<void>;
  joinOrganization: (token: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeAuthenticatedUser(value: unknown): MobileUser | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { id?: unknown; email?: unknown; name?: unknown };
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const email = typeof candidate.email === 'string' ? candidate.email.trim() : '';
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  if (!id || !email) return null;
  return { id, email, name: name || email.split('@')[0] || email };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [currentOrg, setCurrentOrgState] = useState<MobileOrganization | null>(null);
  const [organizations, setOrganizations] = useState<MobileOrganization[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshOrganizations = useCallback(async () => {
    try {
      const { data: orgs } = await api.get('/organizations');
      const list = Array.isArray(orgs) ? orgs : (Array.isArray(orgs?.data) ? orgs.data : []);
      setOrganizations(list);
      await AsyncStorage.setItem('accountiva_organizations', JSON.stringify(list));
      if (list.length > 0) {
        setCurrentOrgState((prev) => {
          if (!prev) return list[0];
          const matched = list.find((o: any) => o.id === prev.id);
          return matched || list[0];
        });
      } else {
        setCurrentOrgState(null);
        await AsyncStorage.removeItem('accountiva_org_id');
        await AsyncStorage.removeItem('accountiva_current_org');
      }
      return list;
    } catch {
      return [];
    }
  }, []);

  // Restore stored session on mount
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await AsyncStorage.getItem('accountiva_token');
        const storedUser = await AsyncStorage.getItem('accountiva_user');
        const storedOrg = await AsyncStorage.getItem('accountiva_current_org');
        const storedOrgs = await AsyncStorage.getItem('accountiva_organizations');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }

        if (storedOrg) {
          setCurrentOrgState(JSON.parse(storedOrg));
        }

        if (storedOrgs) {
          setOrganizations(JSON.parse(storedOrgs));
        }

        // Fetch fresh organization list if authenticated
        if (storedToken) {
          refreshOrganizations().catch(() => {});
        }
      } catch (err) {
        console.error('Failed to restore mobile auth:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStoredAuth();
  }, [refreshOrganizations]);

  const setCurrentOrg = useCallback(async (org: MobileOrganization | null) => {
    setCurrentOrgState(org);
    if (org) {
      await AsyncStorage.setItem('accountiva_org_id', org.id);
      await AsyncStorage.setItem('accountiva_current_org', JSON.stringify(org));
    } else {
      await AsyncStorage.removeItem('accountiva_org_id');
      await AsyncStorage.removeItem('accountiva_current_org');
    }
  }, []);

  const persistAuthenticatedSession = useCallback(async (
    response: AxiosResponse<any>,
    fallbackUser?: unknown,
  ) => {
    const authToken = extractAuthToken(response);
    const authUser = normalizeAuthenticatedUser(response.data?.user ?? fallbackUser);

    if (!authToken) {
      throw new Error(response.data?.message || 'Authentication did not return a session token.');
    }
    if (!authUser) {
      throw new Error(response.data?.message || 'Authentication did not return a valid user.');
    }

    await Promise.all([
      AsyncStorage.setItem('accountiva_token', authToken),
      AsyncStorage.setItem('accountiva_user', JSON.stringify(authUser)),
    ]);
    setToken(authToken);
    setUser(authUser);

    const list = await refreshOrganizations();
    await setCurrentOrg(list[0] || null);
    return response.data;
  }, [refreshOrganizations, setCurrentOrg]);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/sign-in/email', {
      email,
      password,
    });
    return persistAuthenticatedSession(response);
  };

  // Configure GoogleSignin on mount
  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId:
          process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
          '971420250309-1509bhvqfo791mfhqlmpp9bgq48ksohe.apps.googleusercontent.com',
        scopes: ['email', 'profile'],
      });
    } catch (e) {
      console.warn('Failed to configure GoogleSignin:', e);
    }
  }, []);

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();

      if (signInResult.type === 'cancelled') {
        return null;
      }

      const idToken = signInResult.data?.idToken;
      if (!idToken) {
        throw new Error('Google Sign-In did not return an ID token.');
      }

      const response = await api.post('/auth/sign-in/social', {
        provider: 'google',
        idToken: {
          token: idToken,
        },
      });
      return persistAuthenticatedSession(response, signInResult.data?.user);
    } catch (err: any) {
      if (err?.code === 'SIGN_IN_CANCELLED' || err?.code === '12501') {
        return null;
      }
      throw err;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/sign-up/email', {
      name,
      email,
      password,
    });

    return data;
  };

  const forgotPassword = async (email: string) => {
    const { data } = await api.post('/auth/request-password-reset', {
      email,
    });
    return data;
  };

  const resetPassword = async (password: string, token: string) => {
    const { data } = await api.post('/auth/reset-password', {
      newPassword: password,
      token,
    });
    return data;
  };

  const resendVerification = async (email: string) => {
    const { data } = await api.post('/auth/send-verification-email', {
      email,
    });
    return data;
  };

  const verifyEmail = async (token: string) => {
    const { data } = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    return data;
  };

  const createOrganization = async (name: string, currency = 'INR') => {
    const isIndia = currency.trim().toUpperCase() === 'INR';
    const { data } = await api.post('/organizations', {
      name: name.trim(),
      currency: currency.trim().toUpperCase(),
      country: isIndia ? 'India' : 'Other',
      region: isIndia ? 'India' : 'Other',
    });
    const newOrg = data?.organization || data?.data || data;
    const list = await refreshOrganizations();
    if (newOrg?.id) {
      await setCurrentOrg(newOrg);
    } else if (list.length > 0) {
      await setCurrentOrg(list[0]);
    }
    return newOrg;
  };

  const deleteOrganization = async (orgId: string) => {
    await api.delete(`/organizations/${orgId}`);
    const list = await refreshOrganizations();
    if (!list || list.length === 0) {
      await setCurrentOrg(null);
    } else {
      await setCurrentOrg(list[0]);
    }
  };

  const joinOrganization = async (token: string) => {
    const cleanToken = token.trim();
    const { data } = await api.post(`/organizations/invitations/${encodeURIComponent(cleanToken)}/accept`);
    const list = await refreshOrganizations();
    if (list.length > 0) {
      await setCurrentOrg(list[0]);
    }
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/sign-out');
    } catch {
      // Local sign-out must still complete if the server session is already gone.
    } finally {
      try {
        await GoogleSignin.signOut();
      } catch {}
      setUser(null);
      setToken(null);
      setCurrentOrgState(null);
      setOrganizations([]);
      await Promise.allSettled([
        AsyncStorage.removeItem('accountiva_token'),
        AsyncStorage.removeItem('accountiva_user'),
        AsyncStorage.removeItem('accountiva_org_id'),
        AsyncStorage.removeItem('accountiva_current_org'),
        AsyncStorage.removeItem('accountiva_organizations'),
      ]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrg,
        organizations,
        token,
        loading,
        isAuthenticated: Boolean(user || token),
        login,
        signup,
        signInWithGoogle,
        forgotPassword,
        resetPassword,
        resendVerification,
        verifyEmail,
        logout,
        setCurrentOrg,
        refreshOrganizations,
        createOrganization,
        deleteOrganization,
        joinOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

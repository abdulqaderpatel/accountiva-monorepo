import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@accountiva/api';

export interface MobileUser {
  id: string;
  email: string;
  name: string;
}

export interface MobileOrganization {
  id: string;
  name: string;
  currency?: string;
}

interface AuthContextType {
  user: MobileUser | null;
  currentOrg: MobileOrganization | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  signup: (name: string, email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  setCurrentOrg: (org: MobileOrganization | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [currentOrg, setCurrentOrgState] = useState<MobileOrganization | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore stored session on mount
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await AsyncStorage.getItem('accountiva_token');
        const storedUser = await AsyncStorage.getItem('accountiva_user');
        const storedOrg = await AsyncStorage.getItem('accountiva_current_org');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }

        if (storedOrg) {
          setCurrentOrgState(JSON.parse(storedOrg));
        }
      } catch (err) {
        console.error('Failed to restore mobile auth:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStoredAuth();
  }, []);

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

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/sign-in/email', {
      email,
      password,
    });

    if (data?.token || data?.session?.token) {
      const authToken = data.token || data.session.token;
      const authUser = data.user || { id: 'usr-1', email, name: email.split('@')[0] };

      setToken(authToken);
      setUser(authUser);
      await AsyncStorage.setItem('accountiva_token', authToken);
      await AsyncStorage.setItem('accountiva_user', JSON.stringify(authUser));

      // Attempt to load user organizations
      try {
        const { data: orgs } = await api.get('/organizations');
        if (Array.isArray(orgs) && orgs.length > 0) {
          await setCurrentOrg(orgs[0]);
        }
      } catch {
        // Fallback default org if backend has none
        await setCurrentOrg({ id: 'org-demo', name: 'Primary Organization', currency: 'INR' });
      }

      return data;
    }

    throw new Error(data?.message || 'Invalid credentials');
  };

  const signup = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/sign-up/email', {
      name,
      email,
      password,
    });

    return data;
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setCurrentOrgState(null);
    await AsyncStorage.removeItem('accountiva_token');
    await AsyncStorage.removeItem('accountiva_user');
    await AsyncStorage.removeItem('accountiva_org_id');
    await AsyncStorage.removeItem('accountiva_current_org');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrg,
        token,
        loading,
        isAuthenticated: Boolean(user || token),
        login,
        signup,
        logout,
        setCurrentOrg,
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

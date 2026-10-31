import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import api, { cancelOrganizationRequests } from "@/lib/api";
import {
  clearLogoutPending,
  isLogoutPending,
  logoutAndRedirect,
} from "@/lib/logout";
import { setActiveOrganizationId, cancelOrganizationRequests as apiCancelRequests } from "@accountiva/api";

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string;
  plan_id?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  role?: string;
  currency?: string;
  logo?: string;
  logo_url?: string;
  small_logo_url?: string;
  large_logo_url?: string;
  plan?: string;
  plan_id?: string;
  plan_expires_at?: string;
  billing_cycle?: string;
  subscription_status?: string;
  gstin?: string;
  is_gst_registered?: boolean;
  address?: string;
  created_at?: string;
  permissions?: Record<string, string[]>;
}

export interface UserProfileData {
  full_name?: string;
  profile_picture?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfileData | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPro: boolean;
  ownedOrganizationsCount: number;
  login: (email: string, password: string) => Promise<any>;
  signup: (signupData: { name: string; email: string; password: string; redirect?: string }) => Promise<any>;
  socialLogin: (provider: "google") => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (password: string, token: string) => Promise<any>;
  logout: (search?: Record<string, string | undefined>) => Promise<void>;
  signOut: (search?: Record<string, string | undefined>) => Promise<void>;
  setCurrentOrganization: (org: Organization | null) => void;
  fetchOrganizations: () => Promise<void>;
  updateCurrentOrgPlan: (planData: {
    plan: string;
    plan_id?: string;
    plan_expires_at?: string;
    billing_cycle?: string;
  }) => void;
  createOrganization: (formData: any) => Promise<any>;
  updateOrganization: (id: string, formData: FormData | Record<string, any>) => Promise<any>;
  updateOrganizationBranding: (id: string, formData: FormData) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchAdminAccess = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/access");
      setIsAdmin(data?.isAdmin === true);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const setCurrentOrganization = useCallback((org: Organization | null) => {
    setCurrentOrganizationState((prev) => {
      const prevId = prev?.id;
      const nextId = org?.id;

      if (prevId === nextId) {
        if (org) {
          localStorage.setItem("accountiva_org_currency", org.currency || "INR");
        }
        return org;
      }

      // 1. Cancel in-flight HTTP requests for previous organization
      cancelOrganizationRequests(prevId);
      apiCancelRequests(prevId);

      // 2. Abort running TanStack Query requests and clear cached queries
      queryClient.cancelQueries();
      queryClient.clear();

      // 3. Update active organization in storage and client state synchronously
      if (org) {
        localStorage.setItem("accountiva_org_id", org.id);
        localStorage.setItem("accountiva_org_currency", org.currency || "INR");
        setActiveOrganizationId(org.id);
      } else {
        localStorage.removeItem("accountiva_org_id");
        localStorage.removeItem("accountiva_org_currency");
        setActiveOrganizationId(null);
      }

      return org;
    });
  }, [queryClient]);

  const fetchOrganizations = useCallback(async () => {
    try {
      const { data } = await api.get<Organization[]>("/organizations");
      setOrganizations(data);

      const storedOrgId = localStorage.getItem("accountiva_org_id");
      if (data && data.length > 0) {
        const found = data.find((o) => o.id === storedOrgId);
        setCurrentOrganization(found || data[0]);
      } else {
        setCurrentOrganization(null);
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
    }
  }, [setCurrentOrganization]);

  const createOrganization = useCallback(async (formData: any) => {
    const isFormData = typeof FormData !== "undefined" && formData instanceof FormData;
    const { data } = await api.post("/organizations", formData, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    await fetchOrganizations();
    if (data?.id) {
      setCurrentOrganization(data);
    }
    return data;
  }, [fetchOrganizations, setCurrentOrganization]);

  const updateOrganization = useCallback(async (id: string, formData: FormData | Record<string, any>) => {
    const isFormData = typeof FormData !== "undefined" && formData instanceof FormData;
    const { data } = await api.put(`/organizations/${id}`, formData, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    setOrganizations((prev) =>
      prev.map((org) => (org.id === id ? { ...org, ...data } : org))
    );
    setCurrentOrganizationState((prev) => (prev?.id === id ? { ...prev, ...data } : prev));
    return data;
  }, []);

  const updateOrganizationBranding = useCallback(async (id: string, formData: FormData) => {
    const { data } = await api.put(`/organizations/${id}/branding`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setOrganizations((prev) =>
      prev.map((org) => (org.id === id ? { ...org, ...data } : org))
    );
    setCurrentOrganizationState((prev) => (prev?.id === id ? { ...prev, ...data } : prev));
    return data;
  }, []);

  const isPro = Boolean(
    currentOrganization?.plan === "pro" ||
      currentOrganization?.plan_id === "00000000-0000-0000-0000-000000000002"
  );

  const ownedOrganizationsCount = organizations.filter(
    (org) => org.role === "owner"
  ).length;

  const updateCurrentOrgPlan = useCallback(
    (planData: {
      plan: string;
      plan_id?: string;
      plan_expires_at?: string;
      billing_cycle?: string;
    }) => {
      if (!currentOrganization) return;
      const updated: Organization = {
        ...currentOrganization,
        plan: planData.plan,
        plan_id:
          planData.plan_id ||
          (planData.plan === "pro"
            ? "00000000-0000-0000-0000-000000000002"
            : "00000000-0000-0000-0000-000000000001"),
        plan_expires_at: planData.plan_expires_at,
        billing_cycle: planData.billing_cycle || currentOrganization.billing_cycle,
        subscription_status: "active",
      };
      setCurrentOrganizationState(updated);
      setOrganizations((prev) =>
        prev.map((org) => (org.id === updated.id ? { ...org, ...updated } : org))
      );
    },
    [currentOrganization]
  );

  // Restore session on mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isLogoutPending()) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Auth session check timed out")), 8000)
        );
        const sessionPromise = (authClient.getSession as any)();
        const session = await Promise.race([sessionPromise, timeoutPromise]);
        if (session?.data?.user) {
          setUser(session.data.user as User);
          try {
            await Promise.race([
              Promise.allSettled([fetchOrganizations(), fetchAdminAccess()]),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Org fetch timed out")), 4000)),
            ]);
          } catch (orgErr) {
            console.warn("Organization/admin access fetch timed out:", orgErr);
          }
        }
      } catch (err) {
        console.error("Session restore error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    clearLogoutPending();
    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      throw new Error(result.error.message || "Failed to sign in");
    }

    if (result.data?.user) {
      setUser(result.data.user as User);
      await Promise.all([fetchOrganizations(), fetchAdminAccess()]);
    }
    return result.data;
  };

  const signup = async (signupData: { name: string; email: string; password: string; redirect?: string }) => {
    clearLogoutPending();
    const verificationUrl = new URL("/verify-email", window.location.origin);
    if (signupData.redirect) {
      verificationUrl.searchParams.set("redirect", signupData.redirect);
    }
    if (signupData.email) {
      verificationUrl.searchParams.set("email", signupData.email);
    }

    const result = await authClient.signUp.email({
      name: signupData.name,
      email: signupData.email,
      password: signupData.password,
      callbackURL: verificationUrl.toString(),
    });

    if (result.error) {
      if ((result.error as any).code === "USER_ALREADY_EXISTS") {
        throw new Error("This email is already registered. If you haven't verified it, please check your inbox or try logging in.");
      }
      throw new Error(result.error.message || "Failed to sign up");
    }

    return result.data;
  };

  const socialLogin = async (provider: "google") => {
    clearLogoutPending();
    const params = new URLSearchParams(window.location.search);
    let redirect = params.get("redirect") || "/dashboard";

    if (redirect.includes("?")) {
      const [path, query] = redirect.split("?");
      const q = new URLSearchParams(query);
      q.delete("code");
      q.delete("state");
      q.delete("scope");
      q.delete("authuser");
      q.delete("prompt");
      const remaining = q.toString();
      redirect = path + (remaining ? `?${remaining}` : "");
    }

    if (!redirect || redirect === "/" || redirect === "/login") {
      redirect = "/dashboard";
    }

    const callbackURL = window.location.origin + (redirect.startsWith("/") ? redirect : `/${redirect}`);
    const errorCallbackURL = window.location.origin + "/login";

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
    const { error } = await (authClient as any).forgetPassword({
      email,
      callbackURL: window.location.origin + "/reset-password",
    });

    if (error) {
      throw new Error(error.message || "Failed to send reset email");
    }
  };

  const resetPassword = async (password: string, token: string) => {
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (error) {
      throw new Error(error.message || "Failed to reset password");
    }
  };

  const logout = async (search: Record<string, string | undefined> = {}) => {
    await logoutAndRedirect({
      signOut: (signal) =>
        (authClient.signOut as any)({ fetchOptions: { signal } }),
      clearPersistentState: () => {
        const organizationId = currentOrganization?.id;
        cancelOrganizationRequests(organizationId);
        apiCancelRequests(organizationId);
        setActiveOrganizationId(null);
        localStorage.removeItem("accountiva_org_id");
        localStorage.removeItem("accountiva_org_currency");
      },
      search,
    });
  };

  const isAuthenticated = Boolean(user);
  const profile = user ? {
    full_name: user.name,
    profile_picture: user.image,
    email: user.email,
  } : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        organizations,
        currentOrganization,
        loading,
        isAuthenticated,
        isAdmin,
        isPro,
        ownedOrganizationsCount,
        login,
        signup,
        socialLogin,
        forgotPassword,
        resetPassword,
        logout,
        signOut: logout,
        setCurrentOrganization,
        fetchOrganizations,
        updateCurrentOrgPlan,
        createOrganization,
        updateOrganization,
        updateOrganizationBranding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

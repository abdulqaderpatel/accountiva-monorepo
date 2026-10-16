import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import api, { cancelOrganizationRequests } from "@/lib/api";

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
  plan?: string;
  plan_id?: string;
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
  login: (email: string, password: string) => Promise<any>;
  signup: (signupData: { name: string; email: string; password: string; redirect?: string }) => Promise<any>;
  socialLogin: (provider: "google") => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (password: string, token: string) => Promise<any>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  setCurrentOrganization: (org: Organization | null) => void;
  fetchOrganizations: () => Promise<void>;
  createOrganization: (formData: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
      if (prevId === org?.id) {
        if (org) {
          localStorage.setItem("accountiva_org_currency", org.currency || "INR");
        }
        return org;
      }

      cancelOrganizationRequests(prevId);
      if (org) {
        localStorage.setItem("accountiva_org_id", org.id);
        localStorage.setItem("accountiva_org_currency", org.currency || "INR");
      } else {
        localStorage.removeItem("accountiva_org_id");
        localStorage.removeItem("accountiva_org_currency");
      }
      return org;
    });
  }, []);

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

  // Restore session on mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
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
        setLoading(false);
      }
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
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

  const logout = async () => {
    try {
      await (authClient.signOut as any)();
    } finally {
      setUser(null);
      setIsAdmin(false);
      setOrganizations([]);
      setCurrentOrganization(null);
      localStorage.removeItem("accountiva_org_id");
      localStorage.removeItem("accountiva_org_currency");
    }
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
        login,
        signup,
        socialLogin,
        forgotPassword,
        resetPassword,
        logout,
        signOut: logout,
        setCurrentOrganization,
        fetchOrganizations,
        createOrganization,
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

import React from "react";
import { Navigate, useLocation, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({
  children,
}: {
  children?: React.ReactNode;
}) {
  const {
    isAuthenticated,
    loading,
    organizations,
    isOrganizationsLoaded,
    orgFetchFailed,
    hasCompletedOnboarding,
  } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const searchStr = location.searchStr ? `?${location.searchStr}` : "";
    const redirectUrl = `${location.pathname}${searchStr}`;
    return <Navigate to="/login" search={{ redirect: redirectUrl }} replace />;
  }

  // If user already completed onboarding or has organizations, never allow onboarding page
  if (hasCompletedOnboarding && location.pathname === "/onboarding") {
    return <Navigate to="/dashboard" replace />;
  }

  // Only force onboarding if:
  // 1. User has ZERO organizations
  // 2. User has never completed onboarding previously (!hasCompletedOnboarding)
  // 3. Organization check successfully completed from server and didn't fail with network error
  // 4. Not currently on /onboarding
  if (
    !hasCompletedOnboarding &&
    organizations.length === 0 &&
    isOrganizationsLoaded &&
    !orgFetchFailed &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export function GuestRoute({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated, loading, hasCompletedOnboarding } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Loading session...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={hasCompletedOnboarding ? "/dashboard" : "/onboarding"} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

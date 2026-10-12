import React from "react";
import { Navigate, useLocation, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
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
    const redirectUrl = `${location.pathname}${location.searchStr || ""}`;
    return <Navigate to="/login" search={{ redirect: redirectUrl }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

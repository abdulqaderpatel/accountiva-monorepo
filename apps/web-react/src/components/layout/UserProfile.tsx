import React from "react";
import { Link } from "@tanstack/react-router";
import { LogOut, Settings, Building2, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { redirectToLogin } from "@/lib/logout";
import { toast } from "sonner";

interface UserProfileProps {
  variant?: "topbar" | "sidebar";
  collapsed?: boolean;
}

export function UserProfile({ variant = "topbar", collapsed = false }: UserProfileProps) {
  const { user, profile, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      redirectToLogin();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign out");
    }
  };

  const displayName = profile?.full_name || user?.name || "User";
  const displayEmail = user?.email || profile?.email || "";
  const initial = (displayName.charAt(0) || "U").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center cursor-pointer transition-all duration-200 group outline-none",
            variant === "topbar"
              ? "p-0.5 rounded-full border border-border/40 hover:border-primary/50 hover:bg-muted/50 bg-background/50"
              : collapsed
              ? "justify-center px-0 py-2.5 rounded-xl hover:bg-muted"
              : "gap-3 pl-1 pr-2 py-1 rounded-xl hover:bg-muted"
          )}
          title={displayName}
        >
          <div
            className={cn(
              "rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center font-bold text-xs select-none transition-colors",
              variant === "topbar"
                ? "w-8 h-8"
                : "w-8 h-8 border-2 border-border group-hover:border-primary/50"
            )}
          >
            {profile?.profile_picture ? (
              <img
                src={profile.profile_picture}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xs">
                {initial}
              </div>
            )}
          </div>

          {variant === "sidebar" && !collapsed && (
            <div className="flex flex-col min-w-0 flex-1 text-left">
              <span className="text-xs font-bold truncate text-foreground leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                {displayEmail}
              </span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={variant === "topbar" ? "end" : "start"}
        className="w-64 rounded-2xl p-1.5 shadow-2xl border-border bg-card text-card-foreground animate-in fade-in slide-in-from-top-2 duration-200"
      >
        {/* User Info Header */}
        <div className="px-3.5 py-3 border-b border-border/50 mb-1 flex items-center gap-3 bg-muted/20 rounded-xl">
          <div className="w-10 h-10 rounded-full border border-border overflow-hidden bg-muted flex-shrink-0 shadow-inner flex items-center justify-center">
            {profile?.profile_picture ? (
              <img
                src={profile.profile_picture}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm">
                {initial}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1 text-left">
            <span className="text-xs font-bold text-foreground truncate">{displayName}</span>
            <span className="text-[10px] text-muted-foreground truncate">{displayEmail}</span>
          </div>
        </div>

        {/* Links */}
        <DropdownMenuItem asChild>
          <Link
            to="/settings"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium cursor-pointer rounded-lg hover:bg-muted/80 text-foreground transition-colors"
          >
            <Settings className="size-3.5 text-muted-foreground" />
            <span>Account Settings</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 bg-border/50" />

        {/* Sign Out Action */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-colors"
        >
          <LogOut className="size-3.5" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import React from "react";
import { Link } from "@tanstack/react-router";
import { LogOut, Settings, Building2, Sun, Moon, Monitor, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useTheme, Theme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

interface UserProfileProps {
  variant?: "topbar" | "sidebar";
  collapsed?: boolean;
}

export function UserProfile({ variant = "topbar", collapsed = false }: UserProfileProps) {
  const { user, profile, currentOrganization, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.warn("Sign-out error:", error);
      setLoggingOut(false);
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
            "flex items-center cursor-pointer transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            variant === "topbar"
              ? "gap-1.5 p-0.5 pr-1.5 rounded-full border border-border/60 hover:border-primary/50 hover:bg-muted/60 bg-background/60 shadow-2xs"
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
                ? "w-7 h-7 ring-1 ring-border/50"
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
              <div className="w-full h-full flex items-center justify-center bg-primary/15 text-primary font-bold text-xs">
                {initial}
              </div>
            )}
          </div>

          {variant === "topbar" && (
            <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors hidden sm:block" />
          )}

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
        sideOffset={8}
        className="w-68 rounded-2xl p-1.5 shadow-xl border-border bg-card text-card-foreground animate-in fade-in slide-in-from-top-2 duration-150"
      >
        {/* User Info Header */}
        <div className="px-3 py-3 border border-border/50 mb-1.5 flex items-center gap-3 bg-muted/30 rounded-xl">
          <div className="w-10 h-10 rounded-full border border-border/80 overflow-hidden bg-muted flex-shrink-0 shadow-2xs flex items-center justify-center">
            {profile?.profile_picture ? (
              <img
                src={profile.profile_picture}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/15 text-primary font-bold text-sm">
                {initial}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1 text-left">
            <span className="text-xs font-bold text-foreground truncate">{displayName}</span>
            <span className="text-[11px] text-muted-foreground truncate">{displayEmail}</span>
            {currentOrganization?.name && (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-primary/90 truncate">
                <Building2 className="size-2.5 shrink-0" />
                <span className="truncate">{currentOrganization.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <DropdownMenuItem asChild>
          <Link
            to="/settings"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium cursor-pointer rounded-lg hover:bg-muted/80 text-foreground transition-colors"
          >
            <Settings className="size-3.5 text-muted-foreground" />
            <span>Account Settings</span>
          </Link>
        </DropdownMenuItem>

        {currentOrganization && (
          <DropdownMenuItem asChild>
            <Link
              to="/organization-settings"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium cursor-pointer rounded-lg hover:bg-muted/80 text-foreground transition-colors"
            >
              <Building2 className="size-3.5 text-muted-foreground" />
              <span>Organization Settings</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-1.5 bg-border/50" />

        {/* Quick Theme Switcher */}
        <div className="px-2 py-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground pl-1">Theme</span>
          <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
            {(
              [
                { id: "light", icon: Sun, label: "Light" },
                { id: "dark", icon: Moon, label: "Dark" },
                { id: "system", icon: Monitor, label: "System" },
              ] as Array<{ id: Theme; icon: React.ComponentType<{ className?: string }>; label: string }>
            ).map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  title={`${opt.label} theme`}
                  aria-label={`${opt.label} theme`}
                  className={cn(
                    "flex items-center justify-center size-6 rounded-md transition-all cursor-pointer",
                    active
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                </button>
              );
            })}
          </div>
        </div>

        <DropdownMenuSeparator className="my-1.5 bg-border/50" />

        {/* Sign Out Action */}
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-colors"
        >
          {loggingOut ? (
            <div className="size-3.5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
          ) : (
            <LogOut className="size-3.5" />
          )}
          <span>{loggingOut ? "Signing Out..." : "Sign Out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

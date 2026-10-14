import React, { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Search,
  Sun,
  Moon,
  Building2,
  Plus,
  Check,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  organizationName?: string;
  onOpenSearch?: () => void;
}

export function TopBar({ organizationName, onOpenSearch }: TopBarProps) {
  const { isDark, toggleTheme } = useTheme();
  const { currentOrganization, organizations, setCurrentOrganization, user } = useAuth();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOrgName = organizationName || currentOrganization?.name || "Acme Technologies";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Org Selector with Dropdown */}
      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOrgDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent/50 text-foreground transition-colors text-sm font-semibold shadow-2xs cursor-pointer"
        >
          <Building2 className="size-4 text-muted-foreground" />
          <span>{activeOrgName}</span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>

        {isOrgDropdownOpen && (
          <div className="absolute top-11 left-0 w-64 bg-card border border-border rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60">
              Workspaces & Orgs
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {organizations.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No organizations found
                </div>
              ) : (
                organizations.map((org) => {
                  const isSelected = (currentOrganization?.id || "org-demo") === org.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => {
                        setCurrentOrganization(org);
                        setIsOrgDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                        <span className={`truncate ${isSelected ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                          {org.name}
                        </span>
                      </div>
                      {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-border/60 pt-1 mt-1">
              <Link
                to="/settings"
                onClick={() => setIsOrgDropdownOpen(false)}
                className="block px-3 py-1.5 text-xs text-primary hover:underline font-medium"
              >
                + Manage Organizations in Settings
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Quick Create Invoice CTA */}
        <Link to="/invoices">
          <Button size="sm" className="gap-1.5 font-bold shadow-xs">
            <Plus className="size-3.5" />
            <span>New Invoice</span>
          </Button>
        </Link>

        {/* Global Search Shortcut */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors shadow-2xs cursor-pointer"
          onClick={onOpenSearch}
        >
          <Search className="size-3.5" />
          <span>Search...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border rounded text-muted-foreground">
            Ctrl K
          </kbd>
        </button>

        {/* Theme Switcher Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          title="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-emerald-500" />
        </Button>

        {/* User Avatar */}
        <Link to="/settings">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-foreground cursor-pointer ml-1 hover:ring-2 hover:ring-primary/20 transition-all">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "AQ"}
          </div>
        </Link>
      </div>
    </header>
  );
}

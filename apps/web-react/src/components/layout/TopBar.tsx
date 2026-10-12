import React from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Search,
  Sun,
  Moon,
  Building2,
  Plus,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  organizationName?: string;
}

export function TopBar({ organizationName = "Acme Technologies" }: TopBarProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Org Selector Indicator */}
      <div className="flex items-center gap-3">
        <Link
          to="/organization-settings"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent/50 text-foreground transition-colors text-sm font-semibold shadow-2xs"
        >
          <Building2 className="size-4 text-muted-foreground" />
          <span>{organizationName}</span>
          <span className="text-xs text-muted-foreground">▾</span>
        </Link>
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
          onClick={() => {}}
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
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-foreground cursor-pointer ml-1">
          AQ
        </div>
      </div>
    </header>
  );
}


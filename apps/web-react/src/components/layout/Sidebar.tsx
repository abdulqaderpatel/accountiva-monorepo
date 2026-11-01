import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  Calculator,
  FileMinus,
  Settings,
  Building2,
  ChevronRight,
  Landmark,
  ArrowLeftRight,
  BookOpen,
  BarChart3,
  Receipt,
} from "lucide-react";
import { isFeatureEnabled, FeatureFlags } from "@accountiva/shared";
import { cn } from "@/lib/utils";
import { OrganizationSwitcher } from "./OrganizationSwitcher";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  shortcut?: string;
  feature?: keyof FeatureFlags;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();

  const sections: NavSection[] = [
    {
      title: "General",
      items: [
        { name: "Dashboard", icon: LayoutDashboard, route: "/dashboard", shortcut: "G D", feature: "dashboard" },
      ],
    },
    {
      title: "Products & Services",
      items: [
        { name: "Items", icon: Package, route: "/items", shortcut: "G P", feature: "items" },
      ],
    },
    {
      title: "Sales",
      items: [
        { name: "Customers", icon: Users, route: "/customers", shortcut: "G C", feature: "customers" },
        { name: "Estimates", icon: Calculator, route: "/estimates", shortcut: "G E", feature: "estimates" },
        { name: "Invoices", icon: FileText, route: "/invoices", shortcut: "G I", feature: "invoices" },
        { name: "Credit Notes", icon: FileMinus, route: "/sales/credit-notes", shortcut: "G N", feature: "creditNotes" },
      ],
    },
  ];

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.feature || isFeatureEnabled(item.feature)
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      id="sidebar"
      className={cn(
        "relative flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out shrink-0 select-none h-full",
        isCollapsed ? "w-20" : "w-56"
      )}
    >
      {/* Collapse Toggle (Desktop only) positioned at top-20 matching Vue */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className={cn(
          "absolute -right-3 top-20 w-6 h-6 bg-sidebar border border-sidebar-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground z-50 transition-transform duration-300 shadow-2xs cursor-pointer",
          isCollapsed && "rotate-180"
        )}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Organization Switcher at the top of Sidebar */}
      <div id="org-switcher" className="py-2 px-2 border-b border-sidebar-border/80 transition-all duration-300 shrink-0">
        <OrganizationSwitcher isCollapsed={isCollapsed} />
      </div>

      {/* Navigation List */}
      <nav id="sidebar-nav" className="flex-1 overflow-y-auto px-2 py-2 space-y-5 custom-scrollbar">
        {visibleSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed ? (
              <h3 className="px-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mb-2 transition-opacity duration-300">
                {section.title}
              </h3>
            ) : (
              <div className="h-px bg-sidebar-border/80 mx-2 my-4" />
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.route ||
                (item.route !== "/dashboard" && location.pathname.startsWith(item.route));

              return (
                <Link
                  key={item.name}
                  to={item.route}
                  className={cn(
                    "w-full flex items-center rounded-xl group text-left transition-all duration-200 border cursor-pointer",
                    isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-2.5 py-2",
                    isActive
                      ? "bg-primary/12 text-primary border-primary/25 font-semibold shadow-2xs"
                      : "border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                  )}
                  title={isCollapsed ? `${item.name}${item.shortcut ? ` (${item.shortcut})` : ""}` : undefined}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                    )}
                  />
                  {!isCollapsed && (
                    <span className="text-sm font-medium truncate transition-opacity duration-200">
                      {item.name}
                    </span>
                  )}
                  {isActive && !isCollapsed && (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary/70 shrink-0 transition-opacity duration-200" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

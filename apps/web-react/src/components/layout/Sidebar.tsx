import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  Calculator,
  FileMinus,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { isFeatureEnabled, FeatureFlags } from "@accountiva/shared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
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
        { name: "Dashboard", icon: LayoutDashboard, route: "/dashboard", feature: "dashboard" },
      ],
    },
    {
      title: "Inventory",
      items: [
        { name: "Items", icon: Package, route: "/products-and-services/items", feature: "items" },
      ],
    },
    {
      title: "Sales",
      items: [
        { name: "Customers", icon: Users, route: "/customers", feature: "customers" },
        { name: "Estimates", icon: Calculator, route: "/estimates", feature: "estimates" },
        { name: "Invoices", icon: FileText, route: "/invoices", feature: "invoices" },
        { name: "Credit Notes", icon: FileMinus, route: "/sales/credit-notes", feature: "creditNotes" },
      ],
    },
    {
      title: "Settings",
      items: [
        { name: "Settings", icon: Settings, route: "/settings" },
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
      className={cn(
        "h-screen sticky top-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 flex flex-col z-30 select-none",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shadow-xs">
              A
            </div>
            <span className="font-display font-bold text-base tracking-tight text-foreground truncate">
              Accountiva
            </span>
          </div>
        )}

        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-sm mx-auto shadow-xs">
            A
          </div>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleCollapse}
          className={cn("text-muted-foreground hover:text-foreground", isCollapsed && "hidden")}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {visibleSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                {section.title}
              </h4>
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
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                    isCollapsed && "justify-center px-0"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className="size-4.5 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Toggle (if collapsed) */}
      {isCollapsed && (
        <div className="p-3 border-t border-sidebar-border flex justify-center">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            className="text-muted-foreground hover:text-foreground"
            title="Expand Sidebar"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </aside>
  );
}

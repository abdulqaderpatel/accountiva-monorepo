import React from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Building2, ChevronsUpDown, Check, Plus, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, Organization } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface OrganizationSwitcherProps {
  isCollapsed?: boolean;
}

export function OrganizationSwitcher({ isCollapsed = false }: OrganizationSwitcherProps) {
  const { organizations, currentOrganization, setCurrentOrganization } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (org: Organization) => {
    setCurrentOrganization(org);
  };

  return (
    <div className="w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center rounded-xl transition-all duration-200 group border select-none h-10 outline-none cursor-pointer",
              isCollapsed
                ? "justify-center px-0 py-0 border-transparent hover:bg-muted/80"
                : "gap-2.5 px-2.5 py-1.5 bg-card/60 border-border/60 hover:bg-muted/60 hover:border-border/90 shadow-2xs"
            )}
            title={isCollapsed ? "Switch Workspace" : "Click to switch organization"}
          >
            <div
              className={cn(
                "shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-105 transition-all duration-200 overflow-hidden",
                isCollapsed ? "w-8 h-8" : "w-7 h-7"
              )}
            >
              {currentOrganization?.small_logo_url || currentOrganization?.logo_url ? (
                <img
                  src={currentOrganization?.small_logo_url || currentOrganization?.logo_url}
                  alt={currentOrganization.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className={cn("text-primary", isCollapsed ? "size-4" : "size-3.5")} />
              )}
            </div>

            {!isCollapsed && (
              <>
                <div className="flex flex-col items-start min-w-0 flex-1 text-left">
                  <span className="text-xs font-bold leading-tight truncate w-full text-foreground">
                    {currentOrganization?.name || "Select Workspace"}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-extrabold uppercase tracking-wider leading-none mt-0.5">
                    {currentOrganization?.role || "Organization"}
                  </span>
                </div>
                <ChevronsUpDown className="size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors shrink-0" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="w-60 rounded-xl p-1.5 shadow-lg border-border/40 bg-popover text-popover-foreground animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <DropdownMenuLabel className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
            My Organizations
          </DropdownMenuLabel>

          <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {organizations.length === 0 ? (
              <div className="px-2.5 py-2 text-xs text-muted-foreground">
                No organizations found
              </div>
            ) : (
              organizations.map((org) => {
                const isSelected = currentOrganization?.id === org.id;
                return (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => handleSelect(org)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors outline-none",
                      isSelected
                        ? "bg-primary/5 text-primary font-semibold"
                        : "hover:bg-muted/80 text-foreground/80 hover:text-foreground"
                    )}
                  >
                    <div className="shrink-0 size-7 rounded-md bg-muted flex items-center justify-center overflow-hidden border border-border/50">
                      {org.small_logo_url || org.logo_url ? (
                        <img
                          src={org.small_logo_url || org.logo_url}
                          alt={org.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Building2 className="size-3.5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <span className="text-xs font-semibold truncate leading-normal">
                        {org.name}
                      </span>
                      <span className="text-[9px] opacity-60 capitalize leading-none mt-0.5">
                        {org.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isSelected && <Check className="size-3.5 text-primary" />}
                      <button
                        type="button"
                        className="size-6 rounded hover:bg-muted-foreground/15 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center p-0 cursor-pointer"
                        title="Organization Settings"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (currentOrganization?.id !== org.id) {
                            setCurrentOrganization(org);
                          }
                          navigate({ to: "/organization-settings" });
                        }}
                      >
                        <Settings className="size-3" />
                      </button>
                    </div>
                  </DropdownMenuItem>
                );
              })
            )}
          </div>

          <DropdownMenuSeparator className="my-1 bg-border/60" />

          {/* Create New Organization */}
          <DropdownMenuItem asChild>
            <Link
              to="/onboarding"
              className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 rounded-md cursor-pointer transition-colors outline-none"
            >
              <div className="shrink-0 size-7 rounded bg-primary/10 flex items-center justify-center text-primary">
                <Plus className="size-3.5" />
              </div>
              <span>Create New Organization</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}


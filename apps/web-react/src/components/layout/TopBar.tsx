import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Search,
  Keyboard,
  HelpCircle,
  Bell,
  Settings,
  ChevronRight,
  ChevronDown,
  FileText,
  Users,
  Calculator,
  Bug,
  Lightbulb,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, useNotifications } from "@accountiva/api";
import { toast } from "sonner";
import { isFeatureEnabled } from "@accountiva/shared";
import { useTheme } from "@/context/ThemeContext";
import { useI18n } from "@/i18n";
import { quickCreate } from "@/lib/quickCreate";
import { UserProfile } from "./UserProfile";
import { BookmarksCenter } from "./BookmarksCenter";
import { accountivaLogoUrl as lightLogo, accountivaDarkLogoUrl as darkLogo } from "@/lib/brand";

interface TopBarProps {
  isCollapsed?: boolean;
  onOpenSearch?: () => void;
  onOpenShortcuts?: () => void;
}

export function TopBar({
  isCollapsed = false,
  onOpenSearch,
  onOpenShortcuts,
}: TopBarProps) {
  const { isDark } = useTheme();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | null>(null);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackType) return;
    if (!feedbackTitle.trim() || !feedbackDescription.trim()) {
      toast.error("Please provide both a title and description.");
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      await api.post("/profile/feedback", {
        type: feedbackType,
        title: feedbackTitle.trim(),
        description: feedbackDescription.trim(),
        pageUrl: window.location.href,
      });
      toast.success(
        feedbackType === "bug"
          ? "Bug report submitted! Thank you for helping us improve."
          : "Feature request submitted! We appreciate your feedback."
      );
      setFeedbackType(null);
      setFeedbackTitle("");
      setFeedbackDescription("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to submit feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleQuickCreate = (action: "invoice" | "customer" | "estimate", path: string) => {
    quickCreate.trigger(action);
    navigate({ to: path });
  };

  const handleHelpTour = async () => {
    if (location.pathname !== "/dashboard") {
      await navigate({ to: "/dashboard" });
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("start-product-tour"));
    }, 150);
  };

  // Compute dynamic breadcrumbs from URL
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path.startsWith("/invoices")) {
      return [{ category: "Sales", label: "Invoices", route: "/invoices" }];
    }
    if (path.startsWith("/estimates")) {
      return [{ category: "Sales", label: "Estimates", route: "/estimates" }];
    }
    if (path.startsWith("/sales/credit-notes")) {
      return [{ category: "Sales", label: "Credit Notes", route: "/sales/credit-notes" }];
    }
    if (path.startsWith("/customers/")) {
      return [
        { category: "Sales", label: "Customers", route: "/customers" },
        { category: "", label: "Profile", route: "" },
      ];
    }
    if (path.startsWith("/customers")) {
      return [{ category: "Sales", label: "Customers", route: "/customers" }];
    }
    if (path.startsWith("/items") || path.startsWith("/products-and-services/items")) {
      return [{ category: "Inventory", label: "Items", route: "/products-and-services/items" }];
    }
    if (path.startsWith("/admin")) {
      return [{ category: "Admin", label: "Admin Panel", route: "/admin" }];
    }
    if (path.startsWith("/settings")) {
      return [{ category: "Settings", label: "Preferences", route: "/settings" }];
    }
    if (path.startsWith("/organization-settings")) {
      return [{ category: "Settings", label: "Organization", route: "/organization-settings" }];
    }
    if (path.startsWith("/notifications")) {
      return [{ category: "Workspace", label: "Notifications", route: "/notifications" }];
    }
    return [{ category: "General", label: "Dashboard", route: "/dashboard" }];
  };

  const breadcrumbs = getBreadcrumbs();
  const logoSrc = isDark ? darkLogo : lightLogo;

  return (
    <header data-slot="topbar" className="h-14 w-full border-b border-sidebar-border bg-sidebar flex items-center justify-between z-40 relative select-none shrink-0 print:hidden">
      {/* Logo Box matching Sidebar width for seamless alignment */}
      <div
        className={`h-full flex items-center shrink-0 overflow-hidden justify-center transition-all duration-300 ease-in-out ${
          isCollapsed
            ? "w-20 border-r border-sidebar-border"
            : "w-20 md:w-56 border-r border-sidebar-border md:justify-start md:pl-5 gap-3"
        }`}
      >
        <Link to="/dashboard" className="flex items-center gap-3 outline-none">
          <div className="size-8 shrink-0 flex items-center justify-center">
            <img src={logoSrc} alt="Accountiva" className="size-8 object-contain" />
          </div>
          {!isCollapsed && (
            <span
              className="hidden md:inline truncate pr-3 text-sm font-extrabold uppercase tracking-[0.08em] text-foreground/95 select-none"
              style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
            >
              Accountiva
            </span>
          )}
        </Link>
      </div>

      {/* Dynamic Breadcrumbs */}
      <div className="flex items-center gap-1.5 ml-3 md:ml-4 text-xs font-semibold text-muted-foreground select-none">
        {breadcrumbs.map((b, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <ChevronRight className="hidden sm:inline-block size-3.5 text-muted-foreground/30 shrink-0" />
            )}
            {b.category && (
              <>
                <span className="hidden sm:inline text-muted-foreground/50 font-bold">
                  {b.category}
                </span>
                <ChevronRight className="hidden sm:inline-block size-3.5 text-muted-foreground/30 shrink-0" />
              </>
            )}
            {b.route && idx < breadcrumbs.length - 1 ? (
              <Link
                to={b.route}
                className="text-muted-foreground hover:text-foreground font-bold text-[13px] tracking-tight transition-colors"
              >
                {b.label}
              </Link>
            ) : (
              <span className="text-foreground font-black text-[13px] tracking-tight">
                {b.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Flexible Spacer */}
      <div className="flex-1" />

      {/* Right Controls */}
      <div className="flex-shrink-0 h-full flex items-center justify-end px-3 md:px-4 gap-1 md:gap-1.5">
        {/* Quick Create Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id="quick-create-btn"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="size-3.5 shrink-0" />
              <span className="hidden md:inline tracking-tight text-[11.5px] font-bold">{t("topbar.new", "New")}</span>
              <ChevronDown className="size-3 opacity-55 shrink-0 hidden md:inline -ml-0.5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-52 rounded-xl p-1.5 shadow-lg border-border bg-popover text-popover-foreground animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <DropdownMenuLabel className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("topbar.quickActions", "Quick Actions")}
            </DropdownMenuLabel>

            {isFeatureEnabled("invoices") && (
              <DropdownMenuItem
                onClick={() => handleQuickCreate("invoice", "/invoices")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-accent text-xs font-medium transition-colors"
              >
                <div className="size-6 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center text-primary shrink-0">
                  <FileText className="size-3.5" />
                </div>
                <span>Create Invoice</span>
              </DropdownMenuItem>
            )}

            {isFeatureEnabled("customers") && (
              <DropdownMenuItem
                onClick={() => handleQuickCreate("customer", "/customers")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-accent text-xs font-medium transition-colors"
              >
                <div className="size-6 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0">
                  <Users className="size-3.5" />
                </div>
                <span>Add Customer</span>
              </DropdownMenuItem>
            )}

            {isFeatureEnabled("estimates") && (
              <DropdownMenuItem
                onClick={() => handleQuickCreate("estimate", "/estimates")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-accent text-xs font-medium transition-colors"
              >
                <div className="size-6 rounded-lg bg-sky-500/10 border border-sky-500/15 flex items-center justify-center text-sky-600 shrink-0">
                  <Calculator className="size-3.5" />
                </div>
                <span>New Estimate</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden md:block w-px h-4 bg-sidebar-border mx-0.5" />

        {/* Search Trigger */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
          title="Search Workspace (Ctrl+K)"
          onClick={onOpenSearch}
        >
          <Search className="size-4" />
        </Button>

        {/* Keyboard Shortcuts Trigger */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 hidden sm:flex cursor-pointer"
          title="Keyboard Shortcuts (?)"
          onClick={onOpenShortcuts}
        >
          <Keyboard className="size-4" />
        </Button>

        {/* Bookmarks Center Trigger & Popover */}
        <BookmarksCenter />

        {/* Help Menu Trigger (Tour, Shortcuts, Report a Bug, Request a Feature) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
              title="Help & Feedback"
            >
              <HelpCircle className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Help &amp; Support
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={handleHelpTour} className="cursor-pointer gap-2 text-xs font-medium">
              <Compass className="size-3.5 text-muted-foreground" />
              <span>Start Product Tour</span>
            </DropdownMenuItem>
            {onOpenShortcuts && (
              <DropdownMenuItem onClick={onOpenShortcuts} className="cursor-pointer gap-2 text-xs font-medium">
                <Keyboard className="size-3.5 text-muted-foreground" />
                <span>Keyboard Shortcuts</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setFeedbackType("bug")}
              className="cursor-pointer gap-2 text-xs font-medium"
            >
              <Bug className="size-3.5 text-rose-500" />
              <span>Report a Bug</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFeedbackType("feature")}
              className="cursor-pointer gap-2 text-xs font-medium"
            >
              <Lightbulb className="size-3.5 text-amber-500" />
              <span>Request a Feature</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications Trigger */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 relative cursor-pointer"
          title="Notifications"
          onClick={() => navigate({ to: "/notifications" })}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center px-0.5 ring-2 ring-sidebar select-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {/* Settings Trigger */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
          title="Settings"
          onClick={() => navigate({ to: "/settings" })}
        >
          <Settings className="size-4" />
        </Button>

        {/* User Profile Avatar with Dropdown & Sign Out Button */}
        <div id="user-profile">
          <UserProfile variant="topbar" />
        </div>
      </div>

      {/* Report a Bug / Request a Feature Modal */}
      <Modal
        open={Boolean(feedbackType)}
        onClose={() => {
          if (!isSubmittingFeedback) {
            setFeedbackType(null);
            setFeedbackTitle("");
            setFeedbackDescription("");
          }
        }}
        maxWidthClass="max-w-md"
        title={feedbackType === "bug" ? "Report a Bug" : "Request a Feature"}
        description={
          feedbackType === "bug"
            ? "Describe what went wrong so we can investigate and fix it."
            : "Tell us what feature or improvement would make Accountiva better for you."
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmittingFeedback}
              onClick={() => setFeedbackType(null)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              loading={isSubmittingFeedback}
              onClick={(e) => void handleSubmitFeedback(e)}
              className="font-semibold cursor-pointer"
            >
              {feedbackType === "bug" ? "Submit Bug Report" : "Submit Request"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="feedbackTitle" className="text-xs font-semibold">
              {feedbackType === "bug" ? "Summary *" : "Feature Title *"}
            </Label>
            <Input
              id="feedbackTitle"
              value={feedbackTitle}
              onChange={(e) => setFeedbackTitle(e.target.value)}
              placeholder={
                feedbackType === "bug"
                  ? "e.g. PDF preview fails on Safari"
                  : "e.g. Recurring invoice reminders"
              }
              className="text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="feedbackDesc" className="text-xs font-semibold">
              Details *
            </Label>
            <Textarea
              id="feedbackDesc"
              value={feedbackDescription}
              onChange={(e) => setFeedbackDescription(e.target.value)}
              placeholder={
                feedbackType === "bug"
                  ? "Steps to reproduce, expected vs actual behavior..."
                  : "How would this feature help your workflow?"
              }
              rows={4}
              className="text-xs resize-none"
              required
            />
          </div>
        </form>
      </Modal>
    </header>
  );
}

import React, { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  FileText,
  Building2,
  Users,
  Store,
  Package,
  UserPlus,
  Info,
  Check,
  Settings,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  NotificationItem,
} from "@accountiva/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "activity" | "invitations";

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Notifications() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const { data: notifications = [], isLoading } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const activityCount = notifications.filter((n) => n.category !== "invitation").length;
  const invitationCount = notifications.filter((n) => n.category === "invitation").length;

  const filtered = notifications.filter((n) => {
    if (activeFilter === "activity") return n.category !== "invitation";
    if (activeFilter === "invitations") return n.category === "invitation";
    return true;
  });

  const handleAction = async (notif: NotificationItem) => {
    try {
      if (!notif.is_read) {
        await markReadMutation.mutateAsync({ id: notif.id, isRead: true });
      }
      if (notif.toast_message) {
        toast.success(notif.toast_message);
      }
      if (notif.action_route) {
        navigate({ to: notif.action_route as any });
      }
    } catch {
      toast.error("Failed to perform action");
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await markReadMutation.mutateAsync({ id, isRead: true });
      toast.success("Marked as read");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "invoice":
        return FileText;
      case "bill":
        return Building2;
      case "customer":
        return Users;
      case "vendor":
        return Store;
      case "item":
        return Package;
      case "invitation":
        return UserPlus;
      default:
        return Info;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "error":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "success":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Notification Center
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            {unreadCount} unread &middot; {notifications.length} total
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
              className="gap-2 font-semibold text-xs"
            >
              <Check className="size-3.5" />
              <span>Mark all as read</span>
            </Button>
          )}

          <Link to="/settings" search={{ tab: "profile" } as any}>
            <Button
              variant="outline"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              title="Notification Settings"
            >
              <Settings className="size-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border/60 pb-px">
        {[
          { id: "all" as FilterTab, label: "All", count: notifications.length },
          { id: "activity" as FilterTab, label: "Activity", count: activityCount },
          { id: "invitations" as FilterTab, label: "Invitations", count: invitationCount },
        ].map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveFilter(id)}
            className={cn(
              "pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer",
              activeFilter === id
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{label}</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                activeFilter === id
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-muted-foreground font-medium">Loading notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center space-y-4 max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center mx-auto text-muted-foreground">
            <Bell className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">All caught up!</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No new notifications under this filter.
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-border/60 divide-y divide-border/40 bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xs">
          {filtered.map((notif) => {
            const Icon = getCategoryIcon(notif.category);
            const severityStyle = getSeverityStyle(notif.severity);

            return (
              <div
                key={notif.id}
                onClick={() => handleAction(notif)}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 transition-colors cursor-pointer",
                  !notif.is_read
                    ? "bg-primary/[0.03] hover:bg-muted/50"
                    : "hover:bg-muted/30 opacity-85"
                )}
              >
                {/* Category Icon */}
                <div
                  className={cn(
                    "size-9 rounded-xl border flex items-center justify-center shrink-0",
                    severityStyle
                  )}
                >
                  <Icon className="size-4" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-bold leading-tight truncate",
                        !notif.is_read ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {notif.title}
                    </span>
                    {!notif.is_read && (
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                </div>

                {/* Meta & Actions */}
                <div className="flex flex-col items-end shrink-0 gap-1.5 pl-2">
                  <span className="text-[10px] text-muted-foreground/70 font-mono">
                    {timeAgo(notif.created_at)}
                  </span>

                  <div className="flex items-center gap-2">
                    {Boolean(notif.action_route || notif.action_label) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(notif);
                        }}
                        className="h-6 rounded-lg px-2 text-[10px] font-medium gap-1 text-foreground"
                      >
                        <span>View</span>
                        <ArrowRight className="size-3 text-muted-foreground" />
                      </Button>
                    )}

                    {!notif.is_read && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(e, notif.id)}
                        className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 cursor-pointer"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Notifications;

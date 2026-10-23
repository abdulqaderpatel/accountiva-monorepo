import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Calendar,
  Activity,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AuditLog {
  id: string;
  action: string;
  user_email?: string;
  user_name?: string;
  entity_type?: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
}

export function AuditLogs() {
  const { currentOrganization } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!currentOrganization?.id) return;
    try {
      setLoading(true);
      const params: any = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();
      if (actionFilter !== "all") params.action = actionFilter;
      if (entityFilter !== "all") params.entity_type = entityFilter;

      const { data } = await api.get(`/organizations/${currentOrganization.id}/audit-logs`, { params });
      if (Array.isArray(data)) {
        setLogs(data);
        setTotalPages(1);
        setTotalCount(data.length);
      } else {
        setLogs(data?.logs || data?.data || []);
        setTotalPages(data?.totalPages || 1);
        setTotalCount(data?.total || data?.count || 0);
      }
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, page, search, actionFilter, entityFilter]);

  useEffect(() => {
    setLogs([]);
    setPage(1);
    setExpandedLogId(null);
  }, [currentOrganization?.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const resetFilters = () => {
    setSearch("");
    setActionFilter("all");
    setEntityFilter("all");
    setPage(1);
  };

  const getActionBadgeClass = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CREATE")) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    if (act.includes("UPDATE")) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    if (act.includes("DELETE") || act.includes("REMOVE")) return "bg-destructive/10 text-destructive border-destructive/20";
    return "bg-primary/10 text-primary border-primary/20";
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <Card className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
        <CardHeader className="p-5 md:p-6 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-sm md:text-base font-bold text-foreground">
              Audit Logs
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Track sensitive security events, record modifications, and user access history across your workspace.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs()}
            disabled={loading}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-border/70 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>

        {/* Filters Toolbar */}
        <div className="p-4 border-b border-border/50 bg-muted/5 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, action, or entity..."
              className="h-8 pl-8 pr-7 text-xs bg-background border-border/60"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5 border-border/60">
                <Filter className="w-3 h-3 text-muted-foreground" />
                <span>Action: {actionFilter === "all" ? "All Actions" : actionFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {["all", "CREATE", "UPDATE", "DELETE", "SEND_EMAIL", "STATUS_CHANGE"].map((act) => (
                <DropdownMenuItem key={act} onClick={() => setActionFilter(act)} className="text-xs">
                  {act === "all" ? "All Actions" : act}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {(search || actionFilter !== "all" || entityFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Reset Filters
            </Button>
          )}
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-foreground">No audit events recorded</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Audit trail entries are logged automatically as administrative actions take place.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/10 border-border/60">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5">Date & Time</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5">Actor</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5">Action</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5">Entity</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5 text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <TableRow className="border-border/50 hover:bg-muted/20">
                        <TableCell className="py-2.5 text-xs text-muted-foreground font-mono">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs font-medium text-foreground">
                          {log.user_email || log.user_name || "System"}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getActionBadgeClass(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-muted-foreground capitalize">
                          {log.entity_type || "—"}
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          {log.details ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            >
                              {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              {isExpanded ? "Hide" : "Inspect"}
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {isExpanded && log.details && (
                        <TableRow className="bg-muted/10 border-border/40">
                          <TableCell colSpan={5} className="p-4">
                            <div className="bg-background rounded-xl border border-border/60 p-3 font-mono text-[11px] overflow-x-auto text-muted-foreground">
                              <pre>{typeof log.details === "string" ? log.details : JSON.stringify(log.details, null, 2)}</pre>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {totalPages > 1 && (
          <div className="p-3 border-t border-border/50 bg-muted/5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 px-2"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}


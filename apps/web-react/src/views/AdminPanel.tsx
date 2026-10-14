import React, { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  Building2,
  Share2,
  Calendar,
  ShieldCheck,
  AlertCircle,
  UserCircle,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@accountiva/shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SearchResult {
  user: {
    id: string;
    name?: string;
    full_name?: string;
    email: string;
    createdAt?: string;
    profile_picture?: string;
    emailVerified?: boolean;
  };
  organizations: Array<{
    id: string;
    name: string;
    role: string;
    joined_at?: string;
    logo_url?: string;
    is_deleted?: boolean;
  }>;
}

export function AdminPanel() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<Record<string, boolean>>({});
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users/search?query=${encodeURIComponent(query)}`);
      setSearchResult(data);
      toast.success("User retrieved successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "User not found");
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleShareData = async (orgId: string) => {
    if (!searchResult?.user?.id) return;

    setSharing((prev) => ({ ...prev, [orgId]: true }));
    try {
      await api.post(`/admin/organizations/${orgId}/share`, {
        userId: searchResult.user.id,
      });
      toast.success("Organization data shared successfully via email");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to share data");
    } finally {
      setSharing((prev) => ({ ...prev, [orgId]: false }));
    }
  };

  if (!authLoading && !isAdmin) {
    return (
      <div className="py-24 max-w-md mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
          <ShieldAlert className="size-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You do not have administrative privileges to view or manage platform users.
          </p>
        </div>
        <Link to="/dashboard">
          <Button variant="outline" size="sm" className="mt-2">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
          Admin Panel
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Platform-level user lookup, organization memberships, and administrative dispatches.
        </p>
      </div>

      {/* Search Bar */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by User ID or Email address..."
                className="pl-10 h-10 bg-background/50 text-xs"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="w-full sm:w-auto h-10 px-6 font-semibold text-xs gap-2"
            >
              {loading && <Spinner size="sm" />}
              <span>{loading ? "Searching..." : "Search User"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Results Display */}
      {searchResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* User Details Card */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm lg:col-span-1 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 flex flex-col items-center text-center space-y-3">
                <div className="size-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                  {searchResult.user.profile_picture ? (
                    <img
                      src={searchResult.user.profile_picture}
                      alt="Profile"
                      className="size-full object-cover"
                    />
                  ) : (
                    <UserCircle className="size-10 text-primary" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {searchResult.user.name || searchResult.user.full_name || "Account User"}
                  </h2>
                  <p className="text-xs text-primary font-medium flex items-center justify-center gap-1.5 mt-0.5">
                    <ShieldCheck className="size-3.5" />
                    <span>{searchResult.user.email}</span>
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4 border-t border-border/60 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Global User ID
                  </span>
                  <p className="font-mono text-[11px] bg-muted/40 p-2 rounded-lg border border-border/50 break-all select-all">
                    {searchResult.user.id}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Member Since
                    </span>
                    <span className="font-medium text-foreground">
                      {formatDate(searchResult.user.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Organizations
                    </span>
                    <span className="font-medium text-foreground">
                      {searchResult.organizations.length} connected
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Email Verification
                  </span>
                  <Badge variant={searchResult.user.emailVerified ? "success" : "secondary"}>
                    {searchResult.user.emailVerified ? "Verified" : "Pending Verification"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organizations Table Card */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm lg:col-span-2 overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-border/60 bg-muted/10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Associated Organizations</CardTitle>
                <CardDescription className="text-xs">
                  Workspaces this user has access to or owns.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">
                {searchResult.organizations.length} Workspaces
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {searchResult.organizations.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No organizations found for this user.
                </div>
              ) : (
                <div className="divide-y divide-border/40 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-muted/20 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-3 px-5">Organization</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Joined Date</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {searchResult.organizations.map((org) => {
                        const isSharing = Boolean(sharing[org.id]);
                        return (
                          <tr key={org.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-muted border border-border/60 flex items-center justify-center shrink-0">
                                  {org.logo_url ? (
                                    <img
                                      src={org.logo_url}
                                      alt={org.name}
                                      className="size-full object-cover rounded-lg"
                                    />
                                  ) : (
                                    <Building2 className="size-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <span className="font-bold text-foreground block">
                                    {org.name}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold uppercase tracking-tight",
                                      org.is_deleted ? "text-destructive" : "text-emerald-500"
                                    )}
                                  >
                                    {org.is_deleted ? "Deleted" : "Active"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant="outline" className="capitalize text-[10px]">
                                {org.role}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                              {formatDate(org.joined_at)}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleShareData(org.id)}
                                disabled={isSharing}
                                className="h-7 text-[10px] gap-1.5"
                              >
                                {isSharing ? (
                                  <Spinner size="sm" />
                                ) : (
                                  <Share2 className="size-3 text-muted-foreground" />
                                )}
                                <span>{isSharing ? "Sharing..." : "Share via Email"}</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State before search */}
      {!searchResult && !loading && (
        <div className="py-20 text-center space-y-3">
          <div className="size-14 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center mx-auto text-muted-foreground">
            <Search className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Find User Account</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Enter a registered email address or global user ID to look up connected workspaces.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;


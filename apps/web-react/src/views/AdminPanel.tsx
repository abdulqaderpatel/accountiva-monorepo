import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Building2,
  Share2,
  ShieldCheck,
  Loader2,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@accountiva/shared";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

interface AdminUserResult {
  user: {
    id: string;
    name?: string;
    full_name?: string;
    email: string;
    profile_picture?: string;
    createdAt?: string;
    emailVerified?: boolean;
  };
  organizations: Array<{
    id: string;
    name: string;
    role: string;
    is_deleted?: boolean;
    joined_at?: string;
    logo_url?: string;
  }>;
}

export function AdminPanel() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<Record<string, boolean>>({});
  const [searchResult, setSearchResult] = useState<AdminUserResult | null>(null);

  // If not admin, redirect away
  React.useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Unauthorized: Admin privileges required");
      navigate({ to: "/dashboard" });
    }
  }, [isAdmin, authLoading, navigate]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data } = await api.get<AdminUserResult>(
        `/admin/users/search?query=${encodeURIComponent(searchQuery.trim())}`
      );
      setSearchResult(data);
      toast.success("User retrieved successfully");
    } catch (err: any) {
      console.error("Search error:", err);
      toast.error(err.response?.data?.error || "User not found");
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  const shareData = async (orgId: string) => {
    if (!searchResult?.user?.id) return;

    setSharing((prev) => ({ ...prev, [orgId]: true }));
    try {
      await api.post(`/admin/organizations/${orgId}/share`, {
        userId: searchResult.user.id,
      });
      toast.success("Organization data shared successfully via email");
    } catch (err: any) {
      console.error("Share error:", err);
      toast.error(err.response?.data?.error || "Failed to share data");
    } finally {
      setSharing((prev) => ({ ...prev, [orgId]: false }));
    }
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-background custom-scrollbar">
      <div className="px-8 pt-4 md:pt-5 pb-8 max-w-7xl mx-auto space-y-8 flex-1 w-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Admin Panel
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              System administration and user management.
            </p>
          </div>
        </div>

        {/* Search Card */}
        <Card className="bg-card border-border/50 shrink-0">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by User ID or Email address..."
                  className="w-full pl-10 h-11 bg-muted/20 border-border focus:border-primary rounded-xl text-xs"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="h-11 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px] w-full lg:w-auto cursor-pointer"
              >
                {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                <span>{loading ? "Searching..." : "Search User"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Display Area */}
        <div className="flex-1 min-h-0">
          {searchResult && !loading ? (
            <div className="h-full animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-stretch">
                {/* User Details Card */}
                <Card className="lg:col-span-1 bg-card border-border/50 overflow-hidden flex flex-col">
                  <CardContent className="p-0 flex-1 flex flex-col">
                    <div className="p-8 flex flex-col items-center text-center space-y-4 shrink-0">
                      <div className="size-28 rounded-4xl bg-muted border border-border flex items-center justify-center overflow-hidden relative">
                        {searchResult.user.profile_picture ? (
                          <img
                            src={searchResult.user.profile_picture}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCircle className="size-12 text-muted-foreground/30" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-foreground tracking-tight">
                          {searchResult.user.name || searchResult.user.full_name || "Anonymous"}
                        </h2>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1.5 flex items-center justify-center gap-1.5">
                          <ShieldCheck className="size-3.5" />
                          <span>{searchResult.user.email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 px-8 py-6 space-y-6 border-t border-border/50">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          Global Identifier
                        </p>
                        <p className="text-[11px] font-mono font-bold text-foreground break-all bg-muted/30 p-2 rounded-lg border border-border/50">
                          {searchResult.user.id}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Member Since
                          </p>
                          <p className="text-xs font-bold text-foreground">
                            {formatDate(searchResult.user.createdAt)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Organizations
                          </p>
                          <p className="text-xs font-bold text-foreground">
                            {searchResult.organizations.length} connected
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1 pt-2">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          Verification Status
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${
                              searchResult.user.emailVerified ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <span className="text-xs font-bold">
                            {searchResult.user.emailVerified
                              ? "Email verified"
                              : "Email verification pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-muted/5 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground font-medium italic text-center">
                        User profiles are managed at the global account level.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Organizations Table Card */}
                <Card className="lg:col-span-2 bg-card border-border/50 overflow-hidden flex flex-col">
                  <div className="px-6 py-5 border-b border-border/50 bg-muted/10 flex items-center justify-between shrink-0">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                      Associated Organizations
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                      {searchResult.organizations.length} Results
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 z-10 bg-card border-b border-border/50">
                        <tr className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/5">
                          <th className="py-4 px-6">Organization</th>
                          <th className="py-4 px-6">Role</th>
                          <th className="py-4 px-6">Joined Date</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {searchResult.organizations.map((org) => (
                          <tr key={org.id} className="hover:bg-muted/10 transition-colors group">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-muted border border-border/50 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-primary/30 transition-colors">
                                  {org.logo_url ? (
                                    <img src={org.logo_url} alt="" className="size-full object-cover" />
                                  ) : (
                                    <Building2 className="size-5 text-muted-foreground/40" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                    {org.name}
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-[9px] font-bold uppercase tracking-widest ${
                                        org.is_deleted ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                                      }`}
                                    >
                                      {org.is_deleted ? "Deleted" : "Active"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider border border-border bg-muted/40 group-hover:bg-accent transition-colors">
                                {org.role}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              {formatDate(org.joined_at)}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <Button
                                onClick={() => shareData(org.id)}
                                disabled={sharing[org.id]}
                                variant="ghost"
                                size="sm"
                                className="h-9 px-4 rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                              >
                                {sharing[org.id] ? (
                                  <Loader2 className="size-3 animate-spin mr-2" />
                                ) : (
                                  <Share2 className="size-3 mr-2" />
                                )}
                                <span>{sharing[org.id] ? "Sharing..." : "Share Data"}</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            /* Loading or Empty State */
            <div className="flex-1 h-full flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
              <div className="size-16 rounded-2xl bg-muted/20 border border-border/50 flex items-center justify-center mb-6">
                {loading ? (
                  <Loader2 className="size-6 text-primary animate-spin" />
                ) : (
                  <Search className="size-6 text-muted-foreground/40" />
                )}
              </div>

              {loading ? (
                <>
                  <h3 className="text-xl font-bold text-foreground tracking-tight">
                    Querying system records
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs text-center mt-2 font-medium">
                    Please wait while we fetch the account and organization details.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-foreground tracking-tight">
                    Search for a user
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs text-center mt-2 font-medium">
                    Enter a user&apos;s email address or unique ID in the search bar above to view their details and organizations.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;

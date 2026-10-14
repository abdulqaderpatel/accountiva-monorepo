import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { UserPlus, Building2, Shield, ArrowRight, LogIn, UserCircle } from "lucide-react";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  };
}

export function AcceptInvitation() {
  const params = useParams({ strict: false });
  const token = (params as any).token as string;
  const navigate = useNavigate();
  const { user, isAuthenticated, fetchOrganizations, setCurrentOrganization, logout } = useAuth();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invitation token is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    api
      .get(`/organizations/invitations/${token}`)
      .then(({ data }) => {
        setInvitation(data);
      })
      .catch((err: any) => {
        setError(err.response?.data?.error || err.response?.data?.message || "Invalid or expired invitation");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const isWrongAccount = Boolean(
    isAuthenticated &&
      user &&
      invitation &&
      user.email?.toLowerCase() !== invitation.email?.toLowerCase()
  );

  const handleAccept = async () => {
    if (!isAuthenticated) {
      navigate({
        to: "/signup" as any,
        search: { email: invitation?.email, redirect: `/invite/${token}` } as any,
      });
      return;
    }

    if (isWrongAccount) {
      toast.error("Account mismatch", {
        description: `This invitation was sent to ${invitation?.email}. Please switch accounts to accept.`,
      });
      return;
    }

    setAccepting(true);
    try {
      await api.post(`/organizations/invitations/${token}/accept`);
      toast.success("Invitation accepted!", {
        description: `You are now a member of ${invitation?.organizations?.name || "the workspace"}.`,
      });

      await fetchOrganizations();
      navigate({ to: "/dashboard" as any });
    } catch (err: any) {
      toast.error("Failed to accept invitation", {
        description: err.response?.data?.error || err.response?.data?.message || "Please try again later.",
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    navigate({
      to: "/login" as any,
      search: { email: invitation?.email, redirect: `/invite/${token}` } as any,
    });
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-8">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--color-primary-foreground),var(--background))] opacity-20 -z-10" />

      {/* Branding */}
      <div className="mb-8 flex items-center gap-3 cursor-default">
        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-base shadow-xs">
          A
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">Accountiva</h1>
      </div>

      <Card className="w-full max-w-md shrink-0 overflow-hidden border-border/60 bg-card/70 text-foreground shadow-none backdrop-blur-xl">
        {/* Loading State */}
        {loading && (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground animate-pulse font-medium">Validating invitation...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <UserPlus className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl font-bold">Invitation Error</CardTitle>
              <CardDescription className="text-sm">{error}</CardDescription>
            </div>
            <Button
              onClick={() => navigate({ to: "/login" as any })}
              variant="outline"
              className="w-full h-10 rounded-xl"
            >
              Back to Login
            </Button>
          </div>
        )}

        {/* Success / Accept State */}
        {!loading && !error && invitation && (
          <>
            <CardHeader className="pb-4 text-center bg-muted/30 border-b border-border/50">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-primary/20">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">Organization Invitation</CardTitle>
              <CardDescription className="text-xs">
                You've been invited to join{" "}
                <span className="text-foreground font-bold">{invitation.organizations.name}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Assigned Role
                    </span>
                    <span className="text-xs font-bold capitalize">{invitation.role}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <LogIn className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Invited Email
                    </span>
                    <span className="text-xs font-bold">{invitation.email}</span>
                  </div>
                </div>
              </div>

              {/* Account Mismatch Warning */}
              {isWrongAccount && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 space-y-1">
                  <p className="text-xs text-destructive font-bold flex items-center gap-1.5 uppercase tracking-tight">
                    <UserCircle className="w-3.5 h-3.5" />
                    Account Mismatch
                  </p>
                  <p className="text-[11px] text-destructive/90 leading-relaxed">
                    You are logged in as <span className="font-bold">{user?.email}</span>. Please switch to{" "}
                    <span className="font-bold underline">{invitation.email}</span> to accept this invitation.
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pb-6">
              {isAuthenticated ? (
                <>
                  <Button
                    onClick={handleAccept}
                    disabled={accepting || isWrongAccount}
                    className="w-full h-10 rounded-xl font-bold text-xs group"
                  >
                    {accepting && <Spinner size="sm" className="mr-2" />}
                    <span>Accept & Join Organization</span>
                    {!accepting && <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />}
                  </Button>

                  {isWrongAccount && (
                    <Button
                      variant="outline"
                      onClick={handleSwitchAccount}
                      className="w-full h-10 rounded-xl text-xs font-bold"
                    >
                      Sign Out & Switch Account
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={() =>
                      navigate({
                        to: "/signup" as any,
                        search: { email: invitation.email, redirect: `/invite/${token}` } as any,
                      })
                    }
                    className="w-full h-10 rounded-xl font-bold text-xs group"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-2" />
                    Create Account & Accept
                    <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate({
                        to: "/login" as any,
                        search: { email: invitation.email, redirect: `/invite/${token}` } as any,
                      })
                    }
                    className="w-full h-10 rounded-xl text-xs font-bold"
                  >
                    <LogIn className="w-3.5 h-3.5 mr-2" />
                    Sign In Instead
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Use the invited email above so we can match your account.
                  </p>
                </>
              )}
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { useAccountivaLogo } from "@/lib/brand";
import { toast } from "sonner";

export default function VerifyEmail() {
  const searchParams = new URLSearchParams(window.location.search);
  const { accountivaLogoSrc } = useAccountivaLogo();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setErrorMessage("Verification token is missing.");
      return;
    }

    async function verify() {
      try {
        const { error } = await authClient.verifyEmail({
          query: {
            token: token!,
          },
        });

        if (error) {
          setStatus("error");
          setErrorMessage(error.message || "Failed to verify email.");
          toast.error("Verification failed", {
            description: error.message || "Failed to verify email.",
          });
        } else {
          setStatus("success");
          toast.success("Email verified!", {
            description: "You can now sign in to your account.",
          });
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message || "An unexpected error occurred.");
      }
    }

    verify();
  }, [searchParams]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--color-primary-foreground),var(--background))] opacity-20 -z-10"></div>

      {/* Branding */}
      <div className="mb-10 flex items-center gap-3 group cursor-default">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110">
          <img src={accountivaLogoSrc} alt="Accountiva Logo" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Accountiva</h1>
      </div>

      <Card className="w-full max-w-md shrink-0 border-border/60 bg-card/70 text-foreground shadow-none backdrop-blur-xl">
        <CardHeader className="space-y-4 flex flex-col items-center text-center">
          {status === "loading" && (
            <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
              <Spinner size="lg" />
            </div>
          )}
          {status === "success" && (
            <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          )}
          {status === "error" && (
            <div className="p-4 rounded-full bg-destructive/10 border border-destructive/20 text-destructive">
              <XCircle className="h-10 w-10" />
            </div>
          )}

          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {status === "loading" && "Verifying your email..."}
              {status === "success" && "Email verified!"}
              {status === "error" && "Verification failed"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-2">
              {status === "loading" && "Please wait while we confirm your email address."}
              {status === "success" && "Your email has been verified successfully. You can now access your account."}
              {status === "error" && errorMessage}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="text-center">
          {status === "error" && (
            <p className="text-xs text-muted-foreground">
              The link may be invalid or has expired. You can request a new verification link from the login page.
            </p>
          )}
        </CardContent>

        <CardFooter>
          {status !== "loading" && (
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <Link to="/login">
                Continue to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}


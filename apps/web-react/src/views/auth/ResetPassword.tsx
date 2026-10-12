import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAccountivaLogo } from "@/lib/brand";
import { useAuth } from "@/context/AuthContext";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { accountivaLogoSrc } = useAccountivaLogo();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    let queryToken = searchParams.get("token") || "";
    if (!queryToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      queryToken = hashParams.get("access_token") || "";
    }

    if (queryToken) {
      setToken(queryToken);
    } else {
      toast.error("Invalid link", {
        description: "This password reset link is invalid or has expired.",
      });
      navigate("/login");
    }
  }, [searchParams, navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password too short", {
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    setLoading(true);
    try {
      await resetPassword(password, token);
      setSuccess(true);
      toast.success("Password updated!", {
        description: "Your password has been successfully reset.",
      });
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || "Failed to reset password";
      toast.error("Error", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

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
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Reset your password</CardTitle>
          <CardDescription className="text-sm text-muted-foreground text-center">
            {success ? "Your password has been reset" : "Enter a new password for your account"}
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          {!success ? (
            <form onSubmit={handleReset} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-muted-foreground">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 pr-10 bg-background/50 border-border focus:border-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword" className="text-muted-foreground">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-9 pr-10 bg-background/50 border-border focus:border-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl mt-2 group flex items-center justify-center relative overflow-hidden uppercase tracking-widest text-[10px]"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 flex items-center justify-center">
                    {loading && <Spinner size="sm" />}
                  </div>
                  <span>{loading ? "Resetting..." : "Reset Password"}</span>
                  <div className="w-5 h-5 flex items-center justify-center">
                    {!loading && (
                      <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    )}
                  </div>
                </div>
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 space-y-3 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-in zoom-in" />
              <p className="text-sm text-muted-foreground">
                Password updated successfully. Redirecting to login in a few seconds...
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border/40 pt-4">
          <Link
            to="/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}


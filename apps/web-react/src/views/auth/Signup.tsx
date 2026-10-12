import React, { useState } from "react";
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
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAccountivaLogo } from "@/lib/brand";
import { useAuth } from "@/context/AuthContext";

export default function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signup, socialLogin } = useAuth();
  const { accountivaLogoSrc } = useAccountivaLogo();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) return;

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long");
      toast.error("Invalid password", { description: "Password must be at least 8 characters long" });
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      toast.error("Sign up failed", { description: "Passwords do not match" });
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      await signup({
        name: fullName,
        email,
        password,
        redirect: searchParams.get("redirect") || undefined,
      });

      toast.success("Account created!", {
        description: "Please check your email to verify your account.",
      });

      navigate(
        `/check-email?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(
          searchParams.get("redirect") || ""
        )}`
      );
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || "Failed to sign up";
      setErrorMessage(message);
      toast.error("Registration failed", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google") => {
    try {
      setSocialLoading(provider);
      setErrorMessage("");
      await socialLogin(provider);
      toast.success("Success", {
        description: "Signed in with Google.",
      });
    } catch (error: any) {
      console.error(`Error signing in with ${provider}:`, error.message);
      setErrorMessage(error.message);
      toast.error("Authentication failed", {
        description: error.message,
      });
      setSocialLoading(null);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,var(--color-primary-foreground),var(--background))] opacity-20 -z-10"></div>

      {/* Branding */}
      <div className="relative mb-4 flex items-center gap-2 cursor-default group sm:mb-5">
        <div className="relative z-10 flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105">
          <img src={accountivaLogoSrc} alt="Accountiva Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="relative z-10 text-2xl font-bold tracking-tight text-foreground">Accountiva™</h1>
      </div>

      <Card className="w-full max-w-md shrink-0 gap-4 overflow-hidden border-border/60 bg-card/70 py-5 text-foreground shadow-none backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold tracking-tight">Create account</CardTitle>
          <CardDescription className="text-sm text-muted-foreground text-center">
            Join us today to start your journey
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Button
                variant="outline"
                className="border-border hover:bg-muted hover:text-foreground group flex items-center justify-center gap-2"
                onClick={() => handleSocialLogin("google")}
                disabled={Boolean(socialLoading)}
              >
                {socialLoading === "google" ? (
                  <Spinner size="sm" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                <span>{socialLoading === "google" ? "Connecting..." : "Google"}</span>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">Or sign up with email</span>
              </div>
            </div>

            <form onSubmit={handleSignup} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName" className="text-muted-foreground">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="pl-9 bg-background/50 border-border focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 bg-background/50 border-border focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password" className="text-muted-foreground">
                  Password
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
                  Confirm Password
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
                    aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
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
                  <span>{loading ? "Processing..." : "Continue"}</span>
                  <div className="w-5 h-5 flex items-center justify-center">
                    {!loading && (
                      <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    )}
                  </div>
                </div>
              </Button>

              {errorMessage && (
                <p className="text-sm text-destructive text-center font-medium mt-2">{errorMessage}</p>
              )}
            </form>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link
              to={{
                pathname: "/login",
                search: searchParams.toString(),
              }}
              className="text-primary hover:text-primary/80 font-medium ml-1"
            >
              Log in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}


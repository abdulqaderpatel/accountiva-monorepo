import React, { useState } from "react";
import { Link } from "react-router-dom";
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
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAccountivaLogo } from "@/lib/brand";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { forgotPassword } = useAuth();
  const { accountivaLogoSrc } = useAccountivaLogo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
      toast.success("Reset link sent!", {
        description: "Check your email for instructions to reset your password.",
      });
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || "Failed to send reset link";
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
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Forgot password?</CardTitle>
          <CardDescription className="text-sm text-muted-foreground text-center">
            {submitted
              ? "Check your inbox for the reset link"
              : "Enter your email to receive a password reset link"}
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-muted-foreground">
                  Email address
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl mt-2 group flex items-center justify-center relative overflow-hidden uppercase tracking-widest text-[10px]"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 flex items-center justify-center">
                    {loading && <Spinner size="sm" />}
                  </div>
                  <span>{loading ? "Sending..." : "Send Reset Link"}</span>
                  <div className="w-5 h-5 flex items-center justify-center">
                    {!loading && (
                      <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    )}
                  </div>
                </div>
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                We've sent a password reset link to <strong className="text-foreground">{email}</strong>. Please check your inbox and follow the link to set a new password.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border/40 pt-4">
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}


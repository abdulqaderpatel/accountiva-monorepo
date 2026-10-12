import { Link, useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft } from "lucide-react";
import { useAccountivaLogo } from "@/lib/brand";

export default function CheckEmail() {
  const [searchParams] = useSearchParams();
  const { accountivaLogoSrc } = useAccountivaLogo();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,var(--color-primary-foreground),var(--background))] opacity-20 -z-10"></div>

      {/* Branding */}
      <div className="mb-10 flex items-center gap-3 group cursor-default">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110">
          <img src={accountivaLogoSrc} alt="Accountiva Logo" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Accountiva™</h1>
      </div>

      <Card className="w-full max-w-md shrink-0 border-border/60 bg-card/70 text-foreground shadow-none backdrop-blur-xl">
        <CardHeader className="space-y-4 flex flex-col items-center">
          <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <div className="text-center">
            <CardTitle className="text-3xl font-bold tracking-tight">Check your email</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-2">
              We've sent a verification link to your email address.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Please click on the link in the email to confirm your account. If you don't see the email, check your spam folder.
          </p>
        </CardContent>

        <CardFooter>
          <Button asChild variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
            <Link
              to={{
                pathname: "/login",
                search: searchParams.toString(),
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


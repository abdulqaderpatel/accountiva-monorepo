import { ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const getStaffPortalUrl = () => {
  const fallback = "https://staff.accountiva.ai";
  const configured = import.meta.env.VITE_STAFF_PORTAL_URL?.trim();
  if (!configured) return fallback;

  try {
    const url = new URL(configured);
    const isLocalDevelopment =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return url.protocol === "https:" || isLocalDevelopment
      ? url.origin
      : fallback;
  } catch {
    return fallback;
  }
};

export function AdminPanel() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4">
      <Card className="w-full border-border/60 bg-card/70 shadow-sm backdrop-blur-sm">
        <CardHeader className="items-center space-y-4 pb-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <ShieldCheck className="size-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-xl">Staff tools have moved</CardTitle>
            <CardDescription className="mx-auto max-w-lg leading-relaxed">
              Support and QA access now lives in Accountiva&apos;s separate staff
              portal with mandatory MFA, role-based permissions, and audited
              customer lookups.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 pb-8">
          <a
            href={getStaffPortalUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="gap-2">
              Open staff portal
              <ExternalLink className="size-4" aria-hidden="true" />
            </Button>
          </a>
          <p className="text-center text-xs text-muted-foreground">
            Use your approved staff account. Customer accounts are not granted
            staff access automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminPanel;

import React from "react";
import { Sun, Moon, Laptop, ShieldCheck, Check } from "lucide-react";
import { useTheme, ACCENT_COLORS, Theme, AccentColor } from "@/context/ThemeContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Settings() {
  const { theme, accentColor, setTheme, setAccentColor } = useTheme();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
          Settings & Preferences
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customize your workspace appearance and application preferences.
        </p>
      </div>

      {/* Theme Mode Card */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance & Theme</CardTitle>
          <CardDescription>
            Choose how Accountiva looks to you. Select between Light, Dark, or System mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "light" as Theme, label: "Light", icon: Sun },
              { id: "dark" as Theme, label: "Dark", icon: Moon },
              { id: "system" as Theme, label: "System", icon: Laptop },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer",
                  theme === id
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <Icon className="size-5 mb-2" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>

          {/* Accent Color System */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <h4 className="text-sm font-bold text-foreground">Accent Color</h4>
              <p className="text-xs text-muted-foreground">
                Highlight buttons and rings with your chosen brand tint.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {ACCENT_COLORS.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setAccentColor(acc.id as AccentColor)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer",
                    accentColor === acc.id
                      ? "border-primary bg-primary/10 text-foreground font-bold shadow-2xs"
                      : "border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: acc.colorHex }}
                  />
                  <span>{acc.name.split(" ")[0]}</span>
                  {accentColor === acc.id && <Check className="size-3 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Architecture */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Release Architecture</CardTitle>
          <CardDescription>
            Accountiva is currently operating in Invoice-Only MVP mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-4.5 text-emerald-500" />
              <div>
                <div className="text-sm font-semibold text-foreground">Invoicing Engine</div>
                <div className="text-xs text-muted-foreground">Invoices, Estimates, Customers, Items</div>
              </div>
            </div>
            <Badge variant="success">Active (MVP)</Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <div>
                <div className="text-sm font-semibold">Banking, Bills & Expenses</div>
                <div className="text-xs">Staged for Phase 2 enablement</div>
              </div>
            </div>
            <Badge variant="outline">Staged</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


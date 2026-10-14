import React, { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Sun,
  Moon,
  FileText,
  Users,
  ShieldCheck,
  Calculator,
  PieChart,
  HelpCircle,
  CheckCircle2,
  Lock,
  FileMinus,
  Sparkles,
  ArrowUpRight,
  Clock,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@accountiva/shared";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "Is Accountiva fully GST compliant in India?",
    a: "Yes. Accountiva natively supports Indian GST regimes including automatic CGST, SGST, IGST calculations, GSTIN validation, and HSN/SAC code catalog assignment.",
  },
  {
    q: "Can I invite accountants and teammates with limited access?",
    a: "Absolutely. You can invite team members with granular role permissions (Admin, Member, Accountant) to restrict access to sensitive financial records.",
  },
  {
    q: "Can my clients view and pay invoices without creating an account?",
    a: "Yes. Each invoice generates a secure public link (`/invoices/view/:id`) that allows clients to inspect the invoice breakdown, download a styled PDF, and settle payments online.",
  },
  {
    q: "Can I convert accepted quotations directly into invoices?",
    a: "Yes! With one click on any estimate, Accountiva copies all line items, customer details, and applied discounts directly into a draft invoice.",
  },
  {
    q: "What currencies does Accountiva support?",
    a: "Accountiva supports multi-currency invoicing including INR (₹), USD ($), EUR (€), GBP (£), and AED (د.إ) with automatic symbol and localized number formatting.",
  },
];

export function Landing() {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"invoices" | "estimates" | "creditNotes">("invoices");
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const handleCta = () => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" as any });
    } else {
      navigate({ to: "/signup" as any });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 flex flex-col">
      {/* 1. Navigation Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shadow-xs">
              A
            </div>
            <span className="font-display font-bold text-base tracking-tight text-foreground">
              Accountiva
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#preview" className="hover:text-foreground transition-colors">Interactive Demo</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>

          {/* Header Controls */}
          <div className="hidden sm:flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              title={isDark ? "Light Mode" : "Dark Mode"}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="sm" className="font-semibold shadow-xs gap-1.5">
                  <span>Go to Dashboard</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Log in
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="font-semibold shadow-xs gap-1.5">
                    <span>Start Free Trial</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex sm:hidden items-center gap-2">
            <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-b border-border bg-card p-4 space-y-3 animate-in slide-in-from-top-2">
            <nav className="flex flex-col gap-2 text-sm font-semibold">
              <a
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1 text-muted-foreground hover:text-foreground"
              >
                Features
              </a>
              <a
                href="#preview"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1 text-muted-foreground hover:text-foreground"
              >
                Demo
              </a>
              <a
                href="#pricing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1 text-muted-foreground hover:text-foreground"
              >
                Pricing
              </a>
              <a
                href="#faq"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1 text-muted-foreground hover:text-foreground"
              >
                FAQ
              </a>
            </nav>
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full text-xs">
                  Log In
                </Button>
              </Link>
              <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full text-xs font-bold">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden text-center px-4">
        {/* Decorative Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 blur-[100px] rounded-full -z-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold shadow-2xs">
            <Sparkles className="size-3.5" />
            <span>Accountiva 2.0 • Modern Invoicing & Accounting</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight font-display text-foreground leading-[1.1]">
            Effortless Billing. <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Precision Accounting.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Create professional GST invoices, convert client quotations to billing, issue credit adjustments, and track receivables in real time.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button size="lg" onClick={handleCta} className="h-12 px-6 font-bold shadow-md gap-2 text-sm">
              <span>{isAuthenticated ? "Launch Dashboard" : "Start Free Trial"}</span>
              <ArrowRight className="size-4" />
            </Button>
            <a href="#preview">
              <Button size="lg" variant="outline" className="h-12 px-6 text-sm font-semibold">
                Explore Demo
              </Button>
            </a>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" /> GST & Tax Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" /> Bank-Grade Security
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="size-4 text-amber-500" /> Multi-Tenant Isolation
            </span>
          </div>
        </div>
      </section>

      {/* 3. Interactive Product Preview */}
      <section id="preview" className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 w-full">
        <div className="flex items-center justify-center gap-2 pb-6">
          {[
            { id: "invoices" as const, label: "Smart Invoicing", icon: FileText },
            { id: "estimates" as const, label: "Estimates & Bids", icon: Calculator },
            { id: "creditNotes" as const, label: "Credit Notes", icon: FileMinus },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Mock Preview Window */}
        <Card className="border-border/80 bg-card shadow-2xl overflow-hidden rounded-2xl">
          <div className="h-10 bg-muted/40 border-b border-border/60 px-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-full bg-rose-500/80" />
              <div className="size-3 rounded-full bg-amber-500/80" />
              <div className="size-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              accountiva.app/{activeTab}
            </span>
            <div className="w-12" />
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {activeTab === "invoices" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Client Billing Engine</h3>
                    <p className="text-xs text-muted-foreground">Automated sequence prefixes, GST computation, and instant delivery.</p>
                  </div>
                  <Badge variant="success">Active Feature</Badge>
                </div>
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
                  <div>
                    <span className="font-bold text-foreground">INV-2026-042</span>
                    <div className="text-[11px] text-muted-foreground">Issued to Delta Retail Corp</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="success">Paid in Full</Badge>
                    <span className="text-sm font-bold text-foreground font-mono">{formatCurrency(35400)}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "estimates" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Quotation Proposals & Conversion</h3>
                    <p className="text-xs text-muted-foreground">Submit detailed quotes with expiry dates and convert directly to invoices upon acceptance.</p>
                  </div>
                  <Badge variant="secondary">Pipeline Tool</Badge>
                </div>
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
                  <div>
                    <span className="font-bold text-foreground">EST-2026-012</span>
                    <div className="text-[11px] text-muted-foreground">Proposal for Zephyr Logistics Pvt Ltd</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="warning">Proposal Sent</Badge>
                    <span className="text-sm font-bold text-foreground font-mono">{formatCurrency(112000)}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "creditNotes" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Credit Notes & Adjustments</h3>
                    <p className="text-xs text-muted-foreground">Account for defective returns, post-sale volume discounts, and receivables write-offs.</p>
                  </div>
                  <Badge variant="outline">Tax Adjusted</Badge>
                </div>
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
                  <div>
                    <span className="font-bold text-foreground">CN-2026-004</span>
                    <div className="text-[11px] text-muted-foreground">Credit concession on INV-2026-039</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="warning">Open Balance</Badge>
                    <span className="text-sm font-bold text-foreground font-mono">{formatCurrency(5400)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* 4. Core Features Grid */}
      <section id="features" className="py-20 bg-muted/20 border-y border-border/60 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold font-display tracking-tight text-foreground">
              Everything You Need to Run Billing
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
              Engineered for precision accounting, compliance, and effortless collaboration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: "Instant Invoicing",
                desc: "Generate professional tax invoices in seconds with custom item catalogs, automated sequence prefixes, and PDF exports.",
              },
              {
                icon: Calculator,
                title: "Quotation Pipeline",
                desc: "Track client proposals with expiration timers and convert accepted bids into active invoices with a single click.",
              },
              {
                icon: FileMinus,
                title: "Credit Adjustments",
                desc: "Issue credit notes for returns or billing concessions that automatically adjust client outstanding balances.",
              },
              {
                icon: Users,
                title: "Client Directory",
                desc: "Comprehensive customer profiles with full billing history, tax identification (GSTIN/PAN), and delivery addresses.",
              },
              {
                icon: ShieldCheck,
                title: "Public Client Portal",
                desc: "Unauthenticated client payment links allow external parties to review invoices, download PDFs, and verify status.",
              },
              {
                icon: PieChart,
                title: "Live Cash Flow Stats",
                desc: "Real-time receivables overview, paid revenue totals, and overdue flags right on your financial dashboard.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="p-6 border-border/80 bg-card hover:border-primary/50 transition-colors shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto space-y-12 w-full">
        <div className="text-center space-y-3">
          <Badge variant="outline" className="text-xs font-semibold">
            Transparent Pricing
          </Badge>
          <h2 className="text-3xl font-bold font-display tracking-tight text-foreground">
            Simple Plans for Every Stage
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Start free, scale as your invoicing volume grows.
          </p>

          <div className="flex items-center justify-center gap-2 pt-2">
            <span className={`text-xs ${billingCycle === "monthly" ? "font-bold text-foreground" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
              className="w-12 h-6 rounded-full bg-muted border border-border p-0.5 transition-colors cursor-pointer flex items-center"
            >
              <div
                className={`w-5 h-5 rounded-full bg-primary transition-transform ${
                  billingCycle === "annual" ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-xs ${billingCycle === "annual" ? "font-bold text-foreground" : "text-muted-foreground"}`}>
              Annual <span className="text-[10px] text-emerald-500 font-bold">(Save 20%)</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Free Starter */}
          <Card className="p-6 border-border/80 bg-card flex flex-col justify-between shadow-2xs space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold text-muted-foreground uppercase">Starter</span>
              <div className="text-3xl font-black font-mono text-foreground">
                ₹0 <span className="text-xs font-normal text-muted-foreground">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground">Ideal for freelancers and early startups issuing initial invoices.</p>
              <ul className="space-y-2 pt-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-500" /> Up to 15 invoices / month</li>
                <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-500" /> Basic customer catalog</li>
                <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-500" /> GST PDF exports</li>
              </ul>
            </div>
            <Button variant="outline" onClick={handleCta} className="w-full text-xs font-semibold">
              Get Started Free
            </Button>
          </Card>

          {/* Professional Plan (Highlighted) */}
          <Card className="p-6 border-primary bg-primary/5 flex flex-col justify-between shadow-lg relative space-y-6">
            <div className="absolute -top-3 right-6 bg-primary text-primary-foreground text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Most Popular
            </div>
            <div className="space-y-3">
              <span className="text-xs font-bold text-primary uppercase">Professional</span>
              <div className="text-3xl font-black font-mono text-foreground">
                {billingCycle === "annual" ? "₹799" : "₹999"}{" "}
                <span className="text-xs font-normal text-muted-foreground">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground">Full invoicing, quotations, credit adjustments, and client portal.</p>
              <ul className="space-y-2 pt-2 text-xs text-foreground font-medium">
                <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-500" /> Unlimited invoices & estimates</li>
                <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-500" /> Client self-service public links</li>
                <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-500" /> Credit notes & returns</li>
                <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-500" /> 3 Team member accounts</li>
              </ul>
            </div>
            <Button onClick={handleCta} className="w-full text-xs font-bold shadow-xs">
              Start 14-Day Free Trial
            </Button>
          </Card>

          {/* Enterprise Plan */}
          <Card className="p-6 border-border/80 bg-card flex flex-col justify-between shadow-2xs space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold text-muted-foreground uppercase">Enterprise</span>
              <div className="text-3xl font-black font-mono text-foreground">
                {billingCycle === "annual" ? "₹1,999" : "₹2,499"}{" "}
                <span className="text-xs font-normal text-muted-foreground">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground">For scaling multi-currency companies requiring custom roles and audit trails.</p>
              <ul className="space-y-2 pt-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-500" /> Everything in Professional</li>
                <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-500" /> Unlimited team members</li>
                <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-500" /> Custom branding & logos</li>
                <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-500" /> Dedicated priority support</li>
              </ul>
            </div>
            <Button variant="outline" onClick={handleCta} className="w-full text-xs font-semibold">
              Contact Sales
            </Button>
          </Card>
        </div>
      </section>

      {/* 6. FAQ Accordion */}
      <section id="faq" className="py-20 bg-muted/20 border-t border-border/60 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-muted-foreground">
              Have questions about Accountiva? Find answers below.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border/80 bg-card overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 text-xs font-bold text-foreground cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`size-4 text-muted-foreground shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="mt-auto border-t border-border/80 bg-background py-8 px-4 sm:px-6 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-black text-xs">
              A
            </div>
            <span className="font-bold text-foreground">Accountiva™</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
            <a href="#privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;


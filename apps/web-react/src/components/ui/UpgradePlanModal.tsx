import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Lock, ArrowUpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { openRazorpayCheckout } from "@/lib/razorpay";

interface UpgradePlanModalProps {
  open: boolean;
  onClose: () => void;
  feature?: "invoice" | "customer" | "general" | "gstin" | "member" | "custom_fields";
  title?: string;
  description?: string;
}

export function UpgradePlanModal({
  open,
  onClose,
  feature = "general",
  title,
  description,
}: UpgradePlanModalProps) {
  const navigate = useNavigate();
  const { user, currentOrganization, fetchOrganizations } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true);

      // 1. Create Razorpay order on backend
      const { data: orderData } = await api.post("/billing/create-order", {
        billingCycle: "monthly",
      });

      if (!orderData.orderId || !orderData.keyId) {
        throw new Error("Payment session was not created.");
      }

      onClose();

      // 2. Open Razorpay Checkout modal
      await openRazorpayCheckout({
        keyId: orderData.keyId,
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Accountiva",
        description: "Accountiva Pro Plan (Monthly)",
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        onSuccess: async (response) => {
          try {
            const verifyRes = await api.post("/billing/verify-payment", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              toast.success("🎉 Welcome to Accountiva Pro!", {
                description: "Your workspace has been upgraded successfully.",
              });
              await fetchOrganizations();
            }
          } catch (verifyErr: any) {
            console.error("[Billing] Payment verification failed:", verifyErr);
            toast.error(verifyErr.response?.data?.error || "Payment verification failed");
          }
        },
        onDismiss: () => {
          toast.info("Payment window was closed.");
        },
      });
    } catch (err: any) {
      console.error("Upgrade initiation error:", err);
      toast.error(err.response?.data?.error || err.message || "Payment initiation failed");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleViewPlans = () => {
    onClose();
    navigate({ to: "/settings", search: { tab: "Billing" } } as any);
  };

  const defaultDescription =
    description ||
    (feature === "invoice"
      ? "You have reached your invoice limit on the Free plan. Upgrade to Pro for unlimited invoices."
      : feature === "customer"
      ? "You have reached your customer limit on the Free plan. Upgrade to Pro to add unlimited customers."
      : "Unlock unlimited workspaces, custom branding, and team members with Accountiva Pro.");

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-card border border-border/60 rounded-3xl">
        {/* Header Section */}
        <div className="relative bg-muted/20 p-8 text-center border-b border-border/40">
          <div className="size-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-4 border border-primary/20">
            <Lock className="size-6" />
          </div>

          <DialogTitle className="text-2xl font-black tracking-tight text-foreground mb-1">
            {title || "Upgrade to Accountiva Pro"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {defaultDescription}
          </DialogDescription>
        </div>

        {/* Feature List Section */}
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
              What's Included in Pro
            </h4>

            <div className="flex items-start gap-3">
              <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <Check className="size-3.5 font-bold" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Multi-User Collaboration</p>
                <p className="text-[10px] text-muted-foreground">Invite team members with role-based and granular permissions</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <Check className="size-3.5 font-bold" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Remove Watermark &amp; Custom Branding</p>
                <p className="text-[10px] text-muted-foreground">Send white-labeled invoices with your company logos and colors</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <Check className="size-3.5 font-bold" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Automated GST Verification</p>
                <p className="text-[10px] text-muted-foreground">Live business name and PAN auto-extraction from GSTIN numbers</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <Check className="size-3.5 font-bold" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Unlimited Custom Fields</p>
                <p className="text-[10px] text-muted-foreground">Tailor documents and invoices with custom drop-downs, dates, and text</p>
              </div>
            </div>
          </div>

          {/* Price Banner */}
          <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-0.5">
                Pro Plan
              </span>
              <span className="text-lg font-black text-foreground">
                ₹199{" "}
                <span className="text-[10px] font-medium text-muted-foreground">
                  / month
                </span>
              </span>
            </div>
            <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg uppercase tracking-wider border border-primary/20">
              Save 20% on Annual
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              disabled={isUpgrading}
              onClick={handleUpgrade}
              className="w-full h-11 rounded-2xl font-bold uppercase tracking-widest text-[10px] gap-2 cursor-pointer shadow-sm"
            >
              {isUpgrading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUpCircle className="size-4" />
              )}
              Upgrade Now
            </Button>

            <Button
              variant="outline"
              onClick={handleViewPlans}
              className="w-full h-11 rounded-2xl font-bold uppercase tracking-widest text-[10px] border-border/60 hover:bg-muted cursor-pointer"
            >
              Compare All Plans
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

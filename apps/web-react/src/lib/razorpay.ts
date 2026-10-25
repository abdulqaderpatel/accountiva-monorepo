export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  keyId: string;
  orderId: string;
  amount: number; // in paise
  currency?: string;
  name?: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  themeColor?: string;
  onSuccess: (response: RazorpayPaymentSuccessResponse) => void | Promise<void>;
  onDismiss?: () => void;
}

/**
 * Dynamically loads the Razorpay Standard Checkout script (checkout.razorpay.com/v1/checkout.js)
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("[Razorpay] Failed to load checkout script");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Launch the Razorpay Standard Checkout modal
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error("Unable to load Razorpay payment window. Please check your internet connection.");
  }

  const RazorpayConstructor = (window as any).Razorpay;
  if (!RazorpayConstructor) {
    throw new Error("Razorpay checkout is unavailable.");
  }

  const rzpOptions = {
    key: options.keyId,
    amount: options.amount,
    currency: options.currency || "INR",
    name: options.name || "Accountiva",
    description: options.description || "Accountiva Pro Plan Subscription",
    image: options.image || undefined,
    order_id: options.orderId,
    handler: async (response: RazorpayPaymentSuccessResponse) => {
      try {
        await options.onSuccess(response);
      } catch (err) {
        console.error("[Razorpay] Handler error:", err);
      }
    },
    prefill: {
      name: options.prefill?.name || "",
      email: options.prefill?.email || "",
      contact: options.prefill?.contact || "",
    },
    theme: {
      color: options.themeColor || "#2563eb",
    },
    modal: {
      ondismiss: () => {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
    },
  };

  const instance = new RazorpayConstructor(rzpOptions);
  instance.open();
}


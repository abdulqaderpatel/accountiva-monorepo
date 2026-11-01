import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const STAFF_TWO_FACTOR_EVENT = "accountiva:staff-two-factor";

export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? "http://localhost:5153" : window.location.origin,
  basePath: "/api/auth",
  fetchOptions: { credentials: "include" },
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect: () => {
        window.dispatchEvent(new Event(STAFF_TWO_FACTOR_EVENT));
      },
    }),
  ],
});

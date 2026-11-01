import { describe, expect, it } from "vitest";
import { getStaffGate, isTwoFactorRedirect, normalizeSearchQuery } from "./staffPolicy";

describe("staff portal policy", () => {
  it("keeps non-staff users out and requires enrollment or fresh MFA", () => {
    expect(getStaffGate({ hasSession: false })).toBe("signed_out");
    expect(getStaffGate({ hasSession: true, staffStatus: 403 })).toBe("denied");
    expect(getStaffGate({ hasSession: true, staffStatus: 500 })).toBe("unavailable");
    expect(
      getStaffGate({
        hasSession: true,
        staffStatus: 200,
        twoFactorEnabled: false,
        mfaVerified: false,
      }),
    ).toBe("enroll_mfa");
    expect(
      getStaffGate({
        hasSession: true,
        staffStatus: 200,
        twoFactorEnabled: true,
        mfaVerified: false,
      }),
    ).toBe("verify_mfa");
    expect(
      getStaffGate({
        hasSession: true,
        staffStatus: 200,
        twoFactorEnabled: true,
        mfaVerified: true,
      }),
    ).toBe("ready");
  });

  it("rejects broad support searches before sending them", () => {
    expect(() => normalizeSearchQuery("ab")).toThrow(/at least 3/i);
    expect(() => normalizeSearchQuery("x".repeat(121))).toThrow(/120/);
    expect(normalizeSearchQuery("  owner@example.com ")).toBe("owner@example.com");
  });

  it("keeps password sign-in on the MFA challenge when Better Auth requests it", () => {
    expect(isTwoFactorRedirect({ twoFactorRedirect: true })).toBe(true);
    expect(isTwoFactorRedirect({ twoFactorRedirect: false })).toBe(false);
    expect(isTwoFactorRedirect(null)).toBe(false);
  });
});

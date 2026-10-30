import { describe, expect, it, vi } from "vitest";
import { redirectToLogin, revokeAuthSession } from "./logout";

describe("logout", () => {
  it("waits for the server session to be revoked", async () => {
    const signOut = vi.fn().mockResolvedValue({ data: { success: true }, error: null });

    await revokeAuthSession(signOut);

    expect(signOut).toHaveBeenCalledOnce();
  });

  it("does not report success when the server rejects sign-out", async () => {
    await expect(
      revokeAuthSession(async () => ({
        data: null,
        error: { message: "Sign-out failed" },
      })),
    ).rejects.toThrow("Sign-out failed");
  });

  it("uses one canonical slash when redirecting to login", () => {
    const replace = vi.fn();

    redirectToLogin({ replace });

    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("preserves login search parameters when switching accounts", () => {
    const replace = vi.fn();

    redirectToLogin({ replace }, {
      email: "member@example.com",
      redirect: "/invite/invite-token",
    });

    expect(replace).toHaveBeenCalledWith(
      "/login?email=member%40example.com&redirect=%2Finvite%2Finvite-token",
    );
  });
});

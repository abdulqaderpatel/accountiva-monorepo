import { describe, expect, it, vi } from "vitest";
import {
  isLogoutPending,
  markLogoutPending,
  redirectToLogin,
  revokeAuthSession,
} from "./logout";

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

describe("logout", () => {
  it("aborts a stalled server revocation at the logout deadline", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let settled = false;
    let aborted = false;

    const revocation = revokeAuthSession(
      (signal) =>
        new Promise<never>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            reject(signal.reason);
          });
        }),
      1_000,
    );
    void revocation.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(revocation).resolves.toBe(false);
    expect(aborted).toBe(true);
    warn.mockRestore();
    vi.useRealTimers();
  });

  it("uses the default 3000ms deadline when no timeout is passed", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let settled = false;
    let aborted = false;

    const revocation = revokeAuthSession((signal) =>
      new Promise<never>((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          aborted = true;
          reject(signal.reason);
        });
      }),
    );
    void revocation.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(2_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(revocation).resolves.toBe(false);
    expect(aborted).toBe(true);
    warn.mockRestore();
    vi.useRealTimers();
  });

  it("reports a rejected server revocation without blocking logout", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      revokeAuthSession(async () => ({
        data: null,
        error: { message: "Sign-out failed" },
      })),
    ).resolves.toBe(false);
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());

    warn.mockRestore();
  });

  it("suppresses session restoration while logout is pending", () => {
    const storage = createStorage();

    markLogoutPending(storage, 1_000);

    expect(isLogoutPending(storage, 5_000)).toBe(true);
  });

  it("allows session restoration after the logout marker expires", () => {
    const storage = createStorage();

    markLogoutPending(storage, 1_000);

    expect(isLogoutPending(storage, 31_001)).toBe(false);
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

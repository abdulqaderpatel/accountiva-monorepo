type SignOutResult = {
  error?: { message?: string } | null;
} | void;

type LoginLocation = Pick<Location, "replace">;
type LogoutStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const LOGOUT_PENDING_KEY = "accountiva_logout_pending";
const LOGOUT_PENDING_TTL_MS = 30_000;

const getSessionStorage = (): LogoutStorage | undefined => {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
};

export function markLogoutPending(
  storage: LogoutStorage | undefined = getSessionStorage(),
  now = Date.now(),
): void {
  try {
    storage?.setItem(LOGOUT_PENDING_KEY, String(now));
  } catch {
    // Logout must still proceed when browser storage is unavailable.
  }
}

export function clearLogoutPending(
  storage: LogoutStorage | undefined = getSessionStorage(),
): void {
  try {
    storage?.removeItem(LOGOUT_PENDING_KEY);
  } catch {
    // Authentication must still proceed when browser storage is unavailable.
  }
}

export function isLogoutPending(
  storage: LogoutStorage | undefined = getSessionStorage(),
  now = Date.now(),
): boolean {
  try {
    const startedAt = Number(storage?.getItem(LOGOUT_PENDING_KEY));
    if (Number.isFinite(startedAt) && startedAt > 0 && now - startedAt <= LOGOUT_PENDING_TTL_MS) {
      return true;
    }
    storage?.removeItem(LOGOUT_PENDING_KEY);
  } catch {
    // Fall through to normal session restoration.
  }
  return false;
}

export async function revokeAuthSession(
  signOut: (signal: AbortSignal) => Promise<SignOutResult>,
  timeoutMs = 8_000,
): Promise<boolean> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const deadline = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error("Server session revocation timed out"));
      }, timeoutMs);
    });
    const result = await Promise.race([signOut(controller.signal), deadline]);
    if (result?.error) {
      console.warn(result.error.message || "Failed to revoke server session");
      return false;
    }
    return true;
  } catch (error) {
    console.warn("Failed to revoke server session", error);
    return false;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function redirectToLogin(
  location: LoginLocation = window.location,
  search: Record<string, string | undefined> = {},
): void {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  location.replace(`/login${query ? `?${query}` : ""}`);
}

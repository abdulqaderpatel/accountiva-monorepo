type SignOutResult = {
  error?: { message?: string } | null;
} | void;

type LoginLocation = Pick<Location, "replace">;

export async function revokeAuthSession(
  signOut: () => Promise<SignOutResult>,
): Promise<void> {
  const result = await signOut();
  if (result?.error) {
    throw new Error(result.error.message || "Failed to sign out");
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

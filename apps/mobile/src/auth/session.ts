import type { AxiosResponse } from 'axios';

type AuthResponse = Pick<AxiosResponse, 'headers' | 'data'>;

function normalizeToken(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const token = normalizeToken(entry);
      if (token) return token;
    }
    return null;
  }
  if (typeof value !== 'string') return null;
  const token = value.trim();
  return token || null;
}

export interface MobileUser {
  id: string;
  email: string;
  name: string;
}

export function normalizeAuthenticatedUser(value: unknown): MobileUser | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { id?: unknown; sub?: unknown; email?: unknown; name?: unknown };
  const id =
    typeof candidate.id === 'string' && candidate.id.trim()
      ? candidate.id.trim()
      : typeof candidate.sub === 'string' && candidate.sub.trim()
      ? candidate.sub.trim()
      : '';
  const email = typeof candidate.email === 'string' ? candidate.email.trim() : '';
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  if (!id || !email) return null;
  return { id, email, name: name || email.split('@')[0] || email };
}

export function extractAuthToken(response: AuthResponse): string | null {
  const headers = response.headers as unknown;
  if (headers && typeof headers === 'object') {
    const getter = (headers as { get?: unknown }).get;
    if (typeof getter === 'function') {
      const token = normalizeToken(
        getter.call(headers, 'set-auth-token'),
      );
      if (token) return token;
    }

    for (const [name, value] of Object.entries(headers)) {
      if (name.toLowerCase() === 'set-auth-token') {
        const token = normalizeToken(value);
        if (token) return token;
      }
    }
  }

  const data = response.data;
  if (!data || typeof data !== 'object') return null;
  return (
    normalizeToken((data as { token?: unknown }).token) ??
    normalizeToken((data as { session?: { token?: unknown } }).session?.token) ??
    normalizeToken((data as { sessionToken?: unknown }).sessionToken)
  );
}

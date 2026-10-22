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
    normalizeToken((data as { session?: { token?: unknown } }).session?.token)
  );
}

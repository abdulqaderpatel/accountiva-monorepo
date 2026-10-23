import { AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { extractAuthToken, normalizeAuthenticatedUser } from './session';

describe('extractAuthToken', () => {
  it('reads the lowercase Better Auth response header', () => {
    expect(
      extractAuthToken({
        headers: { 'set-auth-token': 'header-token' },
        data: {},
      }),
    ).toBe('header-token');
  });

  it('finds the response header case-insensitively in plain objects', () => {
    expect(
      extractAuthToken({
        headers: { 'Set-Auth-Token': 'mixed-case-token' },
        data: {},
      }),
    ).toBe('mixed-case-token');
  });

  it('reads the response header through AxiosHeaders.get', () => {
    const headers = new AxiosHeaders();
    headers.set('set-auth-token', 'axios-token');

    expect(extractAuthToken({ headers, data: {} })).toBe('axios-token');
  });

  it('falls back to a top-level body token', () => {
    expect(extractAuthToken({ headers: {}, data: { token: 'body-token' } })).toBe('body-token');
  });

  it('falls back to a nested session token', () => {
    expect(
      extractAuthToken({ headers: {}, data: { session: { token: 'session-token' } } }),
    ).toBe('session-token');
  });

  it('falls back to sessionToken property', () => {
    expect(
      extractAuthToken({ headers: {}, data: { sessionToken: 'alt-session-token' } }),
    ).toBe('alt-session-token');
  });

  it('ignores blank values and returns null when no real token exists', () => {
    expect(
      extractAuthToken({
        headers: { 'set-auth-token': '   ' },
        data: { token: '', session: { token: '  ' } },
      }),
    ).toBeNull();
    expect(extractAuthToken({ headers: {}, data: null })).toBeNull();
  });
});

describe('normalizeAuthenticatedUser', () => {
  it('normalizes standard user object with id, email, name', () => {
    expect(
      normalizeAuthenticatedUser({
        id: 'usr-123',
        email: 'user@example.com',
        name: 'Jane Doe',
      }),
    ).toEqual({
      id: 'usr-123',
      email: 'user@example.com',
      name: 'Jane Doe',
    });
  });

  it('normalizes Google OAuth JWT payload with sub instead of id', () => {
    expect(
      normalizeAuthenticatedUser({
        sub: 'google-sub-456',
        email: 'google@example.com',
        name: 'Google User',
      }),
    ).toEqual({
      id: 'google-sub-456',
      email: 'google@example.com',
      name: 'Google User',
    });
  });

  it('falls back to email username when name is missing or blank', () => {
    expect(
      normalizeAuthenticatedUser({
        id: 'usr-789',
        email: 'alex.smith@example.com',
        name: '',
      }),
    ).toEqual({
      id: 'usr-789',
      email: 'alex.smith@example.com',
      name: 'alex.smith',
    });
  });

  it('returns null when id/sub or email is missing', () => {
    expect(normalizeAuthenticatedUser(null)).toBeNull();
    expect(normalizeAuthenticatedUser({})).toBeNull();
    expect(normalizeAuthenticatedUser({ id: 'usr-1' })).toBeNull();
    expect(normalizeAuthenticatedUser({ email: 'test@example.com' })).toBeNull();
  });
});

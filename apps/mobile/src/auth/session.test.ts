import { AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { extractAuthToken } from './session';

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

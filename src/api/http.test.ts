import { describe, it, expect, beforeEach } from 'vitest';
import { getToken, setToken, ApiError } from './http';

describe('http token store', () => {
  beforeEach(() => localStorage.clear());

  it('sets and reads a token', () => {
    expect(getToken()).toBeNull();
    setToken('abc123');
    expect(getToken()).toBe('abc123');
  });

  it('clears the token with null', () => {
    setToken('abc');
    setToken(null);
    expect(getToken()).toBeNull();
  });

  it('ApiError carries status + message', () => {
    const e = new ApiError(403, 'forbidden');
    expect(e.status).toBe(403);
    expect(e.message).toBe('forbidden');
  });
});

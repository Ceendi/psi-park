import { describe, it, expect, vi } from 'vitest';
import type { AxiosError } from 'axios';
import type { FieldValues, UseFormSetError } from 'react-hook-form';
import { applyApiErrors, getRoleHome, getSafeNext, scorePassword } from './helpers';

function makeError(status: number | undefined, data: unknown = {}): AxiosError {
  return {
    isAxiosError: true,
    response: status === undefined ? undefined : { status, data },
  } as unknown as AxiosError;
}

describe('scorePassword', () => {
  it('returns 0 for an empty or weak password', () => {
    expect(scorePassword('')).toBe(0);
    expect(scorePassword('abc')).toBe(0);
  });

  it('climbs from 1 to 4 as the password gains length, case, digits and symbols', () => {
    expect(scorePassword('abcdefgh')).toBe(1); // length only
    expect(scorePassword('Abcdefgh')).toBe(2); // + mixed case
    expect(scorePassword('Abcdefg1')).toBe(3); // + digit
    expect(scorePassword('Abcdefg1!@')).toBe(4); // + symbol & length ≥ 10
  });
});

describe('getRoleHome', () => {
  it('routes each role to its dashboard (PLAN §16.2)', () => {
    expect(getRoleHome('client')).toBe('/panel');
    expect(getRoleHome('host')).toBe('/gospodarz');
    expect(getRoleHome('admin')).toBe('/admin');
  });
});

describe('getSafeNext', () => {
  it('keeps same-site absolute paths', () => {
    expect(getSafeNext('/panel/pupile')).toBe('/panel/pupile');
  });

  it('rejects empty, protocol-relative and absolute-URL targets (open-redirect guard)', () => {
    expect(getSafeNext(null)).toBeNull();
    expect(getSafeNext('')).toBeNull();
    expect(getSafeNext('//evil.example')).toBeNull();
    expect(getSafeNext('https://evil.example')).toBeNull();
  });
});

describe('applyApiErrors', () => {
  type Fields = FieldValues & { email: string };

  it('maps DRF field errors onto react-hook-form and returns no banner', () => {
    const setError = vi.fn() as unknown as UseFormSetError<Fields>;
    const message = applyApiErrors(
      makeError(400, { email: ['Użytkownik o tym adresie już istnieje.'] }),
      setError,
      ['email'],
    );
    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'Użytkownik o tym adresie już istnieje.',
    });
    expect(message).toBeNull();
  });

  it('uses the caller fallback on 401 without touching fields', () => {
    const setError = vi.fn() as unknown as UseFormSetError<Fields>;
    const message = applyApiErrors(
      makeError(401, { detail: 'x' }),
      setError,
      ['email'],
      'Złe dane.',
    );
    expect(message).toBe('Złe dane.');
    expect(setError).not.toHaveBeenCalled();
  });

  it('returns a throttling message on 429', () => {
    expect(applyApiErrors(makeError(429), vi.fn(), [])).toMatch(/Zbyt wiele prób/);
  });

  it('surfaces `detail` as a form-level message', () => {
    expect(applyApiErrors(makeError(400, { detail: 'Błąd ogólny.' }), vi.fn(), ['email'])).toBe(
      'Błąd ogólny.',
    );
  });

  it('folds unknown-field errors (e.g. reset token) into the banner', () => {
    expect(
      applyApiErrors(makeError(400, { token: ['Link wygasł.'] }), vi.fn(), ['new_password']),
    ).toBe('Link wygasł.');
  });

  it('reports a connection problem when there is no response', () => {
    expect(applyApiErrors(makeError(undefined), vi.fn(), [])).toMatch(/Brak połączenia/);
  });
});

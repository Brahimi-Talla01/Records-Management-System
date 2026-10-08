import { describe, it, expect } from 'vitest';
import { toAppError, toFieldErrors, codeForStatus } from './errors';

describe('codeForStatus', () => {
  it('associe les statuts HTTP à un code stable', () => {
    expect(codeForStatus(403)).toBe('forbidden');
    expect(codeForStatus(429)).toBe('too_many_requests');
    expect(codeForStatus(418)).toBe('error');
  });
});

describe('toAppError', () => {
  it('traduit un 403 inter-campus en message dédié', () => {
    const error = {
      response: {
        status: 403,
        data: { error: 'Accès inter-campus interdit.', code: 'cross_campus_access', details: {} },
      },
    };
    const result = toAppError(error);
    expect(result.code).toBe('cross_campus_access');
    expect(result.message).toMatch(/inter-campus/i);
    expect(result.retryable).toBe(false);
  });

  it('signale une erreur réseau comme réessayable', () => {
    const result = toAppError({ message: 'Network Error' });
    expect(result.code).toBe('network_error');
    expect(result.retryable).toBe(true);
  });

  it('détecte une requête annulée', () => {
    const result = toAppError({ name: 'CanceledError', code: 'ERR_CANCELED' });
    expect(result.code).toBe('request_canceled');
    expect(result.retryable).toBe(false);
  });

  it('marque un 500 comme réessayable', () => {
    const result = toAppError({ response: { status: 500, data: {} } });
    expect(result.code).toBe('internal_error');
    expect(result.retryable).toBe(true);
  });

  it('remonte le champ fautif sur validation_error', () => {
    const result = toAppError({
      response: { status: 400, data: { error: 'x', code: 'validation_error', details: { email: 'invalide' } } },
    });
    expect(result.message).toContain('email');
  });
});

describe('toFieldErrors', () => {
  it('normalise un objet en carte de champs', () => {
    expect(toFieldErrors({ email: 'invalide' })).toEqual({ email: 'invalide' });
  });

  it('normalise une liste {field,message}', () => {
    expect(toFieldErrors([{ field: 'username', message: 'requis' }])).toEqual({ username: 'requis' });
  });

  it('tolère une entrée vide', () => {
    expect(toFieldErrors(null)).toEqual({});
  });
});

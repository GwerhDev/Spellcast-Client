import { describe, it, expect, vi, afterEach } from 'vitest';
import { isQuotaExceededError, getStorageEstimate, QUOTA_WARNING_RATIO } from '../storageQuota';

describe('isQuotaExceededError', () => {
  it('recognizes a standard QuotaExceededError DOMException', () => {
    expect(isQuotaExceededError(new DOMException('no space', 'QuotaExceededError'))).toBe(true);
  });

  it('recognizes the legacy Firefox quota error name on a plain object', () => {
    expect(isQuotaExceededError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
  });

  it('rejects unrelated errors', () => {
    expect(isQuotaExceededError(new Error('network down'))).toBe(false);
    expect(isQuotaExceededError(new DOMException('nope', 'NotFoundError'))).toBe(false);
  });

  it('rejects non-error values without throwing', () => {
    expect(isQuotaExceededError(null)).toBe(false);
    expect(isQuotaExceededError(undefined)).toBe(false);
    expect(isQuotaExceededError('QuotaExceededError')).toBe(false);
  });
});

describe('getStorageEstimate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns usage/quota/ratio when the Storage API is available', async () => {
    vi.stubGlobal('navigator', { storage: { estimate: vi.fn().mockResolvedValue({ usage: 85, quota: 100 }) } });
    const estimate = await getStorageEstimate();
    expect(estimate).toEqual({ usage: 85, quota: 100, ratio: 0.85 });
  });

  it('returns null when navigator.storage.estimate is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    expect(await getStorageEstimate()).toBeNull();
  });

  it('returns null when quota is 0 (nothing to divide by)', async () => {
    vi.stubGlobal('navigator', { storage: { estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) } });
    expect(await getStorageEstimate()).toBeNull();
  });

  it('treats a missing usage as 0 instead of NaN', async () => {
    vi.stubGlobal('navigator', { storage: { estimate: vi.fn().mockResolvedValue({ quota: 100 }) } });
    expect(await getStorageEstimate()).toEqual({ usage: 0, quota: 100, ratio: 0 });
  });
});

describe('QUOTA_WARNING_RATIO', () => {
  it('is 0.85 (the >85% threshold from TCORE-117)', () => {
    expect(QUOTA_WARNING_RATIO).toBe(0.85);
  });
});

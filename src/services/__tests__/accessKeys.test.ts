import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The service with access keys on or off (ACCESS_KEYS_ENABLED), fresh each time.
const load = async (enabled: boolean) => {
  vi.resetModules();
  vi.doMock('../../config/consts', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../config/consts')>()),
    ACCESS_KEYS_ENABLED: enabled,
  }));
  return import('../accessKeys');
};

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('../../config/consts');
});

const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

describe('accessKeys', () => {
  describe('off, until the account keeps them', () => {
    it('there are none, and nothing is asked for', async () => {
      const { listAccessKeys, accessKeys } = await load(false);
      expect(await listAccessKeys()).toEqual([]);
      expect(await accessKeys()).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('none can be made or deleted', async () => {
      const { createAccessKey, deleteAccessKey, AccessKeysUnavailableError } = await load(false);
      await expect(createAccessKey('Home')).rejects.toBeInstanceOf(AccessKeysUnavailableError);
      await expect(deleteAccessKey('k1')).rejects.toBeInstanceOf(AccessKeysUnavailableError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('a download is protected only with a password; a key chosen is never left out silently', async () => {
      const { protectionFor } = await load(false);
      expect(await protectionFor({})).toBeUndefined();
      expect(await protectionFor({ password: 'pw' })).toEqual({ password: 'pw', keys: [] });
      await expect(protectionFor({ password: 'pw', keyIds: ['gone'] })).rejects.toThrow();
    });
  });

  describe('on: the account\'s', () => {
    const LIST = [{ id: 'k1', name: 'Home', createdAt: '2026-10-21T10:00:00Z' }];

    it('lists them, with the session (no key material)', async () => {
      const { listAccessKeys } = await load(true);
      fetchMock.mockResolvedValue(json(LIST));
      expect(await listAccessKeys()).toEqual(LIST);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/user\/access-keys$/);
      expect(init).toMatchObject({ credentials: 'include' });
    });

    it('makes one by name, and deletes one', async () => {
      const { createAccessKey, deleteAccessKey } = await load(true);
      fetchMock.mockResolvedValueOnce(json(LIST[0], 201)).mockResolvedValueOnce({ ok: true, status: 204, json: async () => undefined });
      expect(await createAccessKey('Home')).toEqual(LIST[0]);
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ name: 'Home' }) });
      await deleteAccessKey('k1');
      expect(fetchMock.mock.calls[1][0]).toMatch(/\/user\/access-keys\/k1$/);
      expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'DELETE' });
    });

    it('hands over the keys themselves, those asked for or all', async () => {
      const { accessKeys } = await load(true);
      const raw = new Uint8Array(32).fill(7);
      const key = btoa(String.fromCharCode(...raw));
      fetchMock.mockImplementation(async (url: string) => (url.endsWith('/access-keys') ? json(LIST) : json({ id: 'k1', key })));
      expect(await accessKeys(['k1'])).toEqual([{ id: 'k1', key: raw }]);
      expect(await accessKeys()).toEqual([{ id: 'k1', key: raw }]);
    });

    it('fails clearly when the account turns it down', async () => {
      const { listAccessKeys } = await load(true);
      fetchMock.mockResolvedValue(json({ message: 'nope' }, 500));
      await expect(listAccessKeys()).rejects.toThrow('HTTP 500');
    });
  });
});

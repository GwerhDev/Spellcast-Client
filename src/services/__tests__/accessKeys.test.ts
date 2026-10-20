import { describe, it, expect } from 'vitest';
import { accessKeys, listAccessKeys, protectionFor } from '../accessKeys';

// Until the caster's account keeps their access keys there are none: a .spell is protected
// only with a password.
describe('accessKeys', () => {
  it('there are none yet', async () => {
    expect(await listAccessKeys('user-1')).toEqual([]);
    expect(await accessKeys('user-1')).toEqual([]);
  });

  it('what a download is protected with, as chosen', async () => {
    expect(await protectionFor('user-1', {})).toBeUndefined();
    expect(await protectionFor('user-1', { password: 'pw' })).toEqual({ password: 'pw', keys: [] });
    // A key that isn't there is never left out silently (the file would be protected with less).
    await expect(protectionFor('user-1', { password: 'pw', keyIds: ['gone'] })).rejects.toThrow();
  });
});

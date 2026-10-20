import type { AccessKey, ProtectWith } from '../utils/spellProtection';

// The caster's access keys, to protect a .spell with (see utils/spellProtection and
// docs/spell-protection.md). Their account will keep them; until it does there are none, so
// a .spell is protected only with a password, and the download shows the access-key option
// disabled. Everything past here is wired already: once these return the account's keys, the
// download offers each one, and an import opens a file with any of them it has a slot for.

export interface AccessKeyInfo {
  id: string;
  name: string;
  createdAt: string;
}

/** The caster's access keys, to choose from (no key material). None yet. */
export const listAccessKeys: (userId: string) => Promise<AccessKeyInfo[]> = async () => [];

/** The caster's access keys themselves -- those with these ids, or all of them. None yet. */
export const accessKeys: (userId: string, ids?: string[]) => Promise<AccessKey[]> = async () => [];

/** What a .spell is protected with, as the caster chose it: a password and access keys (by
 * id). Undefined: neither, the file is free. */
export const protectionFor = async (userId: string, { password, keyIds = [] }: { password?: string; keyIds?: string[] }): Promise<ProtectWith | undefined> => {
  if (!password && !keyIds.length) return undefined;
  const keys = keyIds.length ? await accessKeys(userId, keyIds) : [];
  if (keys.length !== keyIds.length) throw new Error('An access key chosen is not there anymore.');
  return { password: password || undefined, keys };
};

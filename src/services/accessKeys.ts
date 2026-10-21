import { API_BASE } from '../config/api';
import { ACCESS_KEYS_ENABLED } from '../config/consts';
import type { AccessKey, ProtectWith } from '../utils/spellProtection';

// The caster's access keys, kept by their account, to protect a .spell with (see
// utils/spellProtection). The account keeps each key encrypted and hands it only to its owner;
// the caster is the session's. The API is in docs/access-keys.md.
//
// Off until the account keeps them (ACCESS_KEYS_ENABLED): there are none then, nothing is
// asked for, and a .spell is protected only with a password.

export interface AccessKeyInfo {
  id: string;
  name: string;
  createdAt: string;
}

export class AccessKeysUnavailableError extends Error {
  constructor() { super('Access keys are not available yet.'); }
}

const BASE = `${API_BASE}/user/access-keys`;

const request = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!res.ok) throw new Error(`Access keys: HTTP ${res.status}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
};

const unbase64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));

/** The caster's access keys, to choose from (no key material). None while they're off. */
export const listAccessKeys = async (): Promise<AccessKeyInfo[]> =>
  ACCESS_KEYS_ENABLED ? request<AccessKeyInfo[]>('') : [];

/** A new access key, named (the account makes the key itself). */
export const createAccessKey = async (name: string): Promise<AccessKeyInfo> => {
  if (!ACCESS_KEYS_ENABLED) throw new AccessKeysUnavailableError();
  return request<AccessKeyInfo>('', { method: 'POST', body: JSON.stringify({ name }) });
};

/** Deletes an access key: a .spell protected only with it can't be opened anymore. */
export const deleteAccessKey = async (id: string): Promise<void> => {
  if (!ACCESS_KEYS_ENABLED) throw new AccessKeysUnavailableError();
  await request<void>(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
};

/** The caster's access keys themselves -- those with these ids, or all of them. None while
 * they're off. */
export const accessKeys = async (ids?: string[]): Promise<AccessKey[]> => {
  if (!ACCESS_KEYS_ENABLED) return [];
  const wanted = ids ?? (await listAccessKeys()).map(k => k.id);
  return Promise.all(wanted.map(async (id) => {
    const { key } = await request<{ id: string; key: string }>(`/${encodeURIComponent(id)}`);
    return { id, key: unbase64(key) };
  }));
};

/**
 * The caster's own keys among these (the ones a protected .spell has a slot for): only those
 * they have, each asked for by itself -- never every key, nor for a file that isn't protected.
 * None while they're off.
 */
export const ownAccessKeys = async (ids: string[]): Promise<AccessKey[]> => {
  if (!ACCESS_KEYS_ENABLED || !ids.length) return [];
  const mine = new Set((await listAccessKeys()).map(k => k.id));
  const wanted = ids.filter(id => mine.has(id));
  return wanted.length ? accessKeys(wanted) : [];
};

/** What a .spell is protected with, as the caster chose it: a password and access keys (by
 * id). Undefined: neither, the file is free. */
export const protectionFor = async ({ password, keyIds = [] }: { password?: string; keyIds?: string[] }): Promise<ProtectWith | undefined> => {
  if (!password && !keyIds.length) return undefined;
  const keys = keyIds.length ? await accessKeys(keyIds) : [];
  if (keys.length !== keyIds.length) throw new Error('An access key chosen is not there anymore.');
  return { password: password || undefined, keys };
};

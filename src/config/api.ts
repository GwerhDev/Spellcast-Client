export const VITE_ENV = import.meta.env.VITE_ENV;
export const APP_ID = import.meta.env.VITE_APP_ID;
export const API_BASE = import.meta.env.VITE_API_URL;
export const DUMMY_ID = import.meta.env.VITE_DUMMY_ID;
export const NHEXA_API = import.meta.env.VITE_NHEXA_API_URL;
export const CLIENT_BASE = import.meta.env.VITE_CLIENT_URL;
export const CLIENT_NAME = import.meta.env.VITE_CLIENT_NAME;
export const ACCOUNT_BASE = import.meta.env.VITE_ACCOUNT_URL;
export const REDIRECT_LOGIN = import.meta.env.VITE_REDIRECT_LOGIN_URL;
export const REDIRECT_SIGNUP = import.meta.env.VITE_REDIRECT_SIGNUP_URL;

export const DB_NAME = import.meta.env.VITE_DB_NAME ?? 'spellcast';
// indexedDB.open() expects a numeric version; the env var arrives as a string, so coerce it.
// `|| 3` covers NaN/0/undefined/empty-string alike — indexedDB.open() throws on a non-positive-integer version.
// Bumped 1 -> 2 (TCORE-78): triggers onupgradeneeded to additively create the `spells` store
// (see db/index.ts) without deleting the legacy `documents` store it migrates from.
// Bumped 2 -> 3 (TCORE-78): triggers onupgradeneeded to drop the legacy `documents` store,
// after re-verifying (inside that same versionchange transaction) that every record already
// made it into `spells`.
export const DB_VERSION = Number(import.meta.env.VITE_DB_VERSION) || 3;
export const SPELLS_STORE_NAME = import.meta.env.VITE_SPELLS_STORE_NAME ?? 'spells';
// Unused: progress travels embedded on each Spell record (see SpellProgress), not in a
// separate store. Kept only for env-var back-compat with any deploy config that still sets it.
export const SPELL_PROGRESS_STORE_NAME = import.meta.env.VITE_SPELL_PROGRESS_STORE_NAME ?? 'spellProgress';
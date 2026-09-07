// TCORE-117: shared helpers for detecting/reporting browser storage quota pressure across
// every IndexedDB write path (PDF import, .spell import, audio caching).

// Browsers surface a full storage quota as a DOMException named "QuotaExceededError"
// (the modern, standard name) -- older Firefox used the legacy name below with code 22.
// Checking `.name` (not `instanceof DOMException`) also covers errors that got
// re-wrapped/rethrown as a plain object somewhere in a promise chain, which still keeps
// the original name.
export const isQuotaExceededError = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: unknown }).name;
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
};

export interface StorageEstimate {
  usage: number;
  quota: number;
  ratio: number;
}

// >85% used is the point where the next sizeable write (a PDF, a batch of TTS audio) is
// realistically at risk of hitting the quota outright.
export const QUOTA_WARNING_RATIO = 0.85;

export const getStorageEstimate = async (): Promise<StorageEstimate | null> => {
  if (!navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  if (!quota) return null;
  return { usage: usage ?? 0, quota, ratio: (usage ?? 0) / quota };
};

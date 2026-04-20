import { SelectedVoice } from '../interfaces';

const PREFS_DB_NAME = 'spellcast-preferences';
const PREFS_DB_VERSION = 1;
const VOICE_STORE = 'user_voice';

interface VoicePreferenceRecord {
  userId: string;
  selectedVoice: SelectedVoice;
}

let dbPromise: Promise<IDBDatabase> | null = null;

const openPrefsDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(PREFS_DB_NAME, PREFS_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(VOICE_STORE)) {
        db.createObjectStore(VOICE_STORE, { keyPath: 'userId' });
      }
    };
    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
  return dbPromise;
};

export const saveVoicePreference = async (userId: string, selectedVoice: SelectedVoice): Promise<void> => {
  const db = await openPrefsDB();
  const tx = db.transaction(VOICE_STORE, 'readwrite');
  const store = tx.objectStore(VOICE_STORE);
  return new Promise((resolve, reject) => {
    const request = store.put({ userId, selectedVoice } satisfies VoicePreferenceRecord);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

export const getVoicePreference = async (userId: string): Promise<SelectedVoice | null> => {
  const db = await openPrefsDB();
  const tx = db.transaction(VOICE_STORE, 'readonly');
  const store = tx.objectStore(VOICE_STORE);
  return new Promise((resolve, reject) => {
    const request = store.get(userId);
    request.onsuccess = () => {
      const record = request.result as VoicePreferenceRecord | undefined;
      resolve(record?.selectedVoice ?? null);
    };
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

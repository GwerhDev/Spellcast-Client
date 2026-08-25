import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
});

const importPrefs = () => import('../preferences');

describe('db/preferences.ts', () => {
  it('returns null for a user with no saved preference', async () => {
    const { getVoicePreference } = await importPrefs();
    expect(await getVoicePreference('user-1')).toBeNull();
  });

  it('saves and retrieves a voice preference for a user', async () => {
    const { saveVoicePreference, getVoicePreference } = await importPrefs();
    await saveVoicePreference('user-1', { type: 'ai', value: 'some-voice' });

    expect(await getVoicePreference('user-1')).toEqual({ type: 'ai', value: 'some-voice' });
  });

  it('keeps preferences isolated per user', async () => {
    const { saveVoicePreference, getVoicePreference } = await importPrefs();
    await saveVoicePreference('user-1', { type: 'ai', value: 'voice-a' });
    await saveVoicePreference('user-2', { type: 'browser', value: 'voice-b' });

    expect(await getVoicePreference('user-1')).toEqual({ type: 'ai', value: 'voice-a' });
    expect(await getVoicePreference('user-2')).toEqual({ type: 'browser', value: 'voice-b' });
  });

  it('overwrites a previously saved preference for the same user', async () => {
    const { saveVoicePreference, getVoicePreference } = await importPrefs();
    await saveVoicePreference('user-1', { type: 'ai', value: 'voice-a' });
    await saveVoicePreference('user-1', { type: 'browser', value: 'voice-b' });

    expect(await getVoicePreference('user-1')).toEqual({ type: 'browser', value: 'voice-b' });
  });
});

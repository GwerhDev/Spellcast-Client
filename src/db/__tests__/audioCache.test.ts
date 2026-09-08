import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
// See index.test.ts for why: fake-indexeddb's structuredClone-based storage only
// round-trips Node's own Blob class, not happy-dom's global `Blob`.
import { Blob } from 'node:buffer';
import type { TimelineEntry } from '../../services/tts';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
});

const importAudioCache = () => import('../audioCache');

const timeline = (text = 'hello'): TimelineEntry[] => [{ text, start: 0, end: 1 }];

describe('db/audioCache.ts', () => {
  it('returns null for a page that has never been cached', async () => {
    const { getCachedAudio } = await importAudioCache();
    expect(await getCachedAudio('spell-1', 1, 'voice-a')).toBeNull();
  });

  it('stores and retrieves audio + timeline for a specific spell/page/voice, stamped with the current cache version', async () => {
    const { setCachedAudio, getCachedAudio, AUDIO_CACHE_VERSION } = await importAudioCache();
    const blob = new Blob(['audio-bytes'], { type: 'audio/mpeg' });

    await setCachedAudio('spell-1', 1, 'voice-a', blob as unknown as globalThis.Blob, timeline());
    const cached = await getCachedAudio('spell-1', 1, 'voice-a');

    expect(cached).not.toBeNull();
    expect(cached?.timeline).toEqual(timeline());
    expect(cached?.cacheVersion).toBe(AUDIO_CACHE_VERSION);
    expect(cached?.blob).toBeInstanceOf(Blob);
  });

  it('keeps cache entries isolated by spell, page, and voice', async () => {
    const { setCachedAudio, getCachedAudio } = await importAudioCache();
    await setCachedAudio('spell-1', 1, 'voice-a', new Blob(['a']) as unknown as globalThis.Blob, timeline('a'));
    await setCachedAudio('spell-1', 2, 'voice-a', new Blob(['b']) as unknown as globalThis.Blob, timeline('b'));
    await setCachedAudio('spell-1', 1, 'voice-b', new Blob(['c']) as unknown as globalThis.Blob, timeline('c'));
    await setCachedAudio('spell-2', 1, 'voice-a', new Blob(['d']) as unknown as globalThis.Blob, timeline('d'));

    expect((await getCachedAudio('spell-1', 1, 'voice-a'))?.timeline).toEqual(timeline('a'));
    expect((await getCachedAudio('spell-1', 2, 'voice-a'))?.timeline).toEqual(timeline('b'));
    expect((await getCachedAudio('spell-1', 1, 'voice-b'))?.timeline).toEqual(timeline('c'));
    expect((await getCachedAudio('spell-2', 1, 'voice-a'))?.timeline).toEqual(timeline('d'));
  });

  it('overwrites a previous cache entry for the same spell/page/voice', async () => {
    const { setCachedAudio, getCachedAudio } = await importAudioCache();
    await setCachedAudio('spell-1', 1, 'voice-a', new Blob(['old']) as unknown as globalThis.Blob, timeline('old'));
    await setCachedAudio('spell-1', 1, 'voice-a', new Blob(['new']) as unknown as globalThis.Blob, timeline('new'));

    expect((await getCachedAudio('spell-1', 1, 'voice-a'))?.timeline).toEqual(timeline('new'));
  });

  it('defaults timeline to an empty array when none is passed to setCachedAudio', async () => {
    const { setCachedAudio, getCachedAudio } = await importAudioCache();
    await setCachedAudio('spell-1', 1, 'voice-a', new Blob(['x']) as unknown as globalThis.Blob);
    expect((await getCachedAudio('spell-1', 1, 'voice-a'))?.timeline).toEqual([]);
  });

  describe('getCachedAudioEntriesForSpell', () => {
    it('groups every cached page for a spell across voices, keyed correctly despite underscore-joined cache keys', async () => {
      const { setCachedAudio, getCachedAudioEntriesForSpell } = await importAudioCache();
      await setCachedAudio('spell-1', 1, 'alice', new Blob(['a1']) as unknown as globalThis.Blob, timeline('a1'));
      await setCachedAudio('spell-1', 2, 'alice', new Blob(['a2']) as unknown as globalThis.Blob, timeline('a2'));
      await setCachedAudio('spell-1', 1, 'bob', new Blob(['b1']) as unknown as globalThis.Blob, timeline('b1'));
      await setCachedAudio('spell-2', 1, 'alice', new Blob(['other']) as unknown as globalThis.Blob, timeline('other'));

      const entries = await getCachedAudioEntriesForSpell('spell-1');

      expect(entries).toHaveLength(3);
      expect(entries).toEqual(expect.arrayContaining([
        expect.objectContaining({ page: 1, voice: 'alice' }),
        expect.objectContaining({ page: 2, voice: 'alice' }),
        expect.objectContaining({ page: 1, voice: 'bob' }),
      ]));
      // spell-2's entry must never leak into spell-1's results.
      expect(entries.some((e) => e.timeline[0]?.text === 'other')).toBe(false);
    });

    it('excludes entries with an empty timeline (audio without its timeline is never exported)', async () => {
      const { setCachedAudio, getCachedAudioEntriesForSpell } = await importAudioCache();
      await setCachedAudio('spell-1', 1, 'alice', new Blob(['has-timeline']) as unknown as globalThis.Blob, timeline());
      await setCachedAudio('spell-1', 2, 'alice', new Blob(['no-timeline']) as unknown as globalThis.Blob, []);

      const entries = await getCachedAudioEntriesForSpell('spell-1');
      expect(entries).toHaveLength(1);
      expect(entries[0].page).toBe(1);
    });

    it('returns an empty array for a spell with nothing cached', async () => {
      const { getCachedAudioEntriesForSpell } = await importAudioCache();
      expect(await getCachedAudioEntriesForSpell('nothing-cached')).toEqual([]);
    });

    it('correctly separates spellId/page/voice even when a voice id itself contains an underscore', async () => {
      const { setCachedAudio, getCachedAudioEntriesForSpell } = await importAudioCache();
      await setCachedAudio('spell-1', 3, 'en_US_Guy', new Blob(['x']) as unknown as globalThis.Blob, timeline());

      const entries = await getCachedAudioEntriesForSpell('spell-1');
      expect(entries).toEqual([expect.objectContaining({ page: 3, voice: 'en_US_Guy' })]);
    });
  });

  describe('clearSpellAudioCache', () => {
    it('deletes every cached entry for the given spell only', async () => {
      const { setCachedAudio, getCachedAudio, clearSpellAudioCache } = await importAudioCache();
      await setCachedAudio('spell-1', 1, 'alice', new Blob(['a']) as unknown as globalThis.Blob, timeline());
      await setCachedAudio('spell-1', 2, 'alice', new Blob(['b']) as unknown as globalThis.Blob, timeline());
      await setCachedAudio('spell-2', 1, 'alice', new Blob(['c']) as unknown as globalThis.Blob, timeline());

      await clearSpellAudioCache('spell-1');

      expect(await getCachedAudio('spell-1', 1, 'alice')).toBeNull();
      expect(await getCachedAudio('spell-1', 2, 'alice')).toBeNull();
      // A different spell's cache must survive untouched.
      expect(await getCachedAudio('spell-2', 1, 'alice')).not.toBeNull();
    });

    it('does not throw when clearing a spell with nothing cached', async () => {
      const { clearSpellAudioCache } = await importAudioCache();
      await expect(clearSpellAudioCache('nothing-cached')).resolves.toBeUndefined();
    });
  });

  describe('clearAudioCacheForVoice (TCORE-118)', () => {
    it('deletes only the given spell+voice, leaving that spell\'s other voices and other spells intact', async () => {
      const { setCachedAudio, getCachedAudio, clearAudioCacheForVoice } = await importAudioCache();
      await setCachedAudio('spell-1', 1, 'alice', new Blob(['a1']) as unknown as globalThis.Blob, timeline());
      await setCachedAudio('spell-1', 2, 'alice', new Blob(['a2']) as unknown as globalThis.Blob, timeline());
      await setCachedAudio('spell-1', 1, 'bob', new Blob(['b1']) as unknown as globalThis.Blob, timeline());
      await setCachedAudio('spell-2', 1, 'alice', new Blob(['other']) as unknown as globalThis.Blob, timeline());

      await clearAudioCacheForVoice('spell-1', 'alice');

      expect(await getCachedAudio('spell-1', 1, 'alice')).toBeNull();
      expect(await getCachedAudio('spell-1', 2, 'alice')).toBeNull();
      expect(await getCachedAudio('spell-1', 1, 'bob')).not.toBeNull();
      expect(await getCachedAudio('spell-2', 1, 'alice')).not.toBeNull();
    });
  });

  describe('clearAllAudioCache (TCORE-118)', () => {
    it('wipes every cached entry regardless of spell or voice', async () => {
      const { setCachedAudio, getCachedAudio, clearAllAudioCache } = await importAudioCache();
      await setCachedAudio('spell-1', 1, 'alice', new Blob(['a']) as unknown as globalThis.Blob, timeline());
      await setCachedAudio('spell-2', 1, 'bob', new Blob(['b']) as unknown as globalThis.Blob, timeline());

      await clearAllAudioCache();

      expect(await getCachedAudio('spell-1', 1, 'alice')).toBeNull();
      expect(await getCachedAudio('spell-2', 1, 'bob')).toBeNull();
    });
  });

  describe('getCachedAudio touches lastAccessed on a real hit (TCORE-118)', () => {
    it('bumps lastAccessed forward on read, so a re-read looks more recently used to the LRU sweep', async () => {
      const { setCachedAudio, getCachedAudio, getAudioCacheSummary } = await importAudioCache();
      await setCachedAudio('spell-1', 1, 'alice', new Blob(['a']) as unknown as globalThis.Blob, timeline());
      const afterWrite = (await getAudioCacheSummary()).bySpell['spell-1'].lastAccessed;

      await new Promise((r) => setTimeout(r, 5));
      await getCachedAudio('spell-1', 1, 'alice');
      // The touch write is fire-and-forget inside getCachedAudio -- give its own
      // transaction a tick to actually land before reading the summary back.
      await new Promise((r) => setTimeout(r, 5));

      const afterRead = (await getAudioCacheSummary()).bySpell['spell-1'].lastAccessed;
      expect(afterRead).toBeGreaterThan(afterWrite);
    });

    it('does not touch anything (and does not throw) on a cache miss', async () => {
      const { getCachedAudio } = await importAudioCache();
      await expect(getCachedAudio('nothing-cached', 1, 'alice')).resolves.toBeNull();
    });
  });

  describe('getAudioCacheSummary (TCORE-118)', () => {
    it('returns an empty summary when nothing is cached', async () => {
      const { getAudioCacheSummary } = await importAudioCache();
      expect(await getAudioCacheSummary()).toEqual({ totalBytes: 0, bySpell: {} });
    });

    it('sums bytes per voice, per spell, and overall', async () => {
      const { setCachedAudio, getAudioCacheSummary } = await importAudioCache();
      await setCachedAudio('spell-1', 1, 'alice', new Blob(['aaaaa']) as unknown as globalThis.Blob, timeline()); // 5 bytes
      await setCachedAudio('spell-1', 2, 'alice', new Blob(['aaa']) as unknown as globalThis.Blob, timeline());   // 3 bytes
      await setCachedAudio('spell-1', 1, 'bob', new Blob(['bb']) as unknown as globalThis.Blob, timeline());      // 2 bytes
      await setCachedAudio('spell-2', 1, 'alice', new Blob(['c']) as unknown as globalThis.Blob, timeline());     // 1 byte

      const summary = await getAudioCacheSummary();

      expect(summary.totalBytes).toBe(11);
      expect(summary.bySpell['spell-1'].totalBytes).toBe(10);
      expect(summary.bySpell['spell-1'].byVoice).toEqual({ alice: 8, bob: 2 });
      expect(summary.bySpell['spell-2'].totalBytes).toBe(1);
    });
  });

  describe('evictLeastRecentlyUsedAudio (TCORE-118)', () => {
    it('deletes the oldest-accessed entries first until targetBytes is freed', async () => {
      const { setCachedAudio, getCachedAudio, evictLeastRecentlyUsedAudio } = await importAudioCache();
      // Written in order, so 'oldest' below (spell-1) has the smallest lastAccessed.
      await setCachedAudio('spell-1', 1, 'alice', new Blob(['aaaaa']) as unknown as globalThis.Blob, timeline()); // 5 bytes, oldest
      await new Promise((r) => setTimeout(r, 5));
      await setCachedAudio('spell-2', 1, 'alice', new Blob(['bbbbb']) as unknown as globalThis.Blob, timeline()); // 5 bytes, newest

      const freed = await evictLeastRecentlyUsedAudio(5);

      expect(freed).toBe(5);
      expect(await getCachedAudio('spell-1', 1, 'alice')).toBeNull();
      expect(await getCachedAudio('spell-2', 1, 'alice')).not.toBeNull();
    });

    it('stops once targetBytes is covered, leaving newer entries untouched', async () => {
      const { setCachedAudio, getCachedAudio, evictLeastRecentlyUsedAudio } = await importAudioCache();
      await setCachedAudio('spell-1', 1, 'alice', new Blob(['aaaaa']) as unknown as globalThis.Blob, timeline()); // 5 bytes
      await new Promise((r) => setTimeout(r, 5));
      await setCachedAudio('spell-2', 1, 'alice', new Blob(['bbbbb']) as unknown as globalThis.Blob, timeline()); // 5 bytes

      await evictLeastRecentlyUsedAudio(3); // less than any single entry's size

      expect(await getCachedAudio('spell-1', 1, 'alice')).toBeNull();
      expect(await getCachedAudio('spell-2', 1, 'alice')).not.toBeNull();
    });

    it('returns the actual bytes freed, capped by what the cache holds, when targetBytes exceeds it', async () => {
      const { setCachedAudio, evictLeastRecentlyUsedAudio } = await importAudioCache();
      await setCachedAudio('spell-1', 1, 'alice', new Blob(['aaaaa']) as unknown as globalThis.Blob, timeline()); // 5 bytes

      const freed = await evictLeastRecentlyUsedAudio(1_000_000);

      expect(freed).toBe(5);
    });

    it('does nothing and returns 0 for a non-positive target', async () => {
      const { setCachedAudio, getCachedAudio, evictLeastRecentlyUsedAudio } = await importAudioCache();
      await setCachedAudio('spell-1', 1, 'alice', new Blob(['a']) as unknown as globalThis.Blob, timeline());

      expect(await evictLeastRecentlyUsedAudio(0)).toBe(0);
      expect(await getCachedAudio('spell-1', 1, 'alice')).not.toBeNull();
    });

    it('returns 0 without throwing when the cache is empty', async () => {
      const { evictLeastRecentlyUsedAudio } = await importAudioCache();
      expect(await evictLeastRecentlyUsedAudio(100)).toBe(0);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSpellCoverUrl } from '../useSpellCoverUrl';

const mockGetSpellById = vi.fn();
const mockCachedCover = vi.fn();
vi.mock('../../db', () => ({
  getSpellById: (...args: unknown[]) => mockGetSpellById(...args),
  // Covers are read through getSpellById here, so each test's own spell (and timing) applies.
  getSpellCover: (...args: unknown[]) => Promise.resolve(mockGetSpellById(...args)).then((d) => (d as { cover?: Blob } | null | undefined)?.cover ?? null),
  getCachedSpellCover: (...args: unknown[]) => mockCachedCover(...args),
}));

beforeEach(() => {
  mockGetSpellById.mockReset();
  mockCachedCover.mockReset().mockReturnValue(undefined);
  URL.createObjectURL = vi.fn(() => 'blob:cover');
  URL.revokeObjectURL = vi.fn();
});

describe('useSpellCoverUrl', () => {
  it('is null without a spell', () => {
    const { result } = renderHook(() => useSpellCoverUrl(null, 'user-1'));
    expect(result.current).toBeNull();
    expect(mockGetSpellById).not.toHaveBeenCalled();
  });

  it("returns an object URL for the spell's cover and revokes it on unmount", async () => {
    mockGetSpellById.mockResolvedValue({ id: 's1', cover: new Blob(['x']) });
    const { result, unmount } = renderHook(() => useSpellCoverUrl('s1', 'user-1'));
    await waitFor(() => expect(result.current).toBe('blob:cover'));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cover');
  });

  it('stays null when the spell has no cover', async () => {
    mockGetSpellById.mockResolvedValue({ id: 's1' });
    const { result } = renderHook(() => useSpellCoverUrl('s1', 'user-1'));
    await waitFor(() => expect(mockGetSpellById).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('uses a cover already in memory right away, without reading the spell', () => {
    mockCachedCover.mockReturnValue(new Blob(['x']));
    const { result } = renderHook(() => useSpellCoverUrl('s1', 'user-1'));
    expect(result.current).toBe('blob:cover');
    expect(mockGetSpellById).not.toHaveBeenCalled();
  });

  it('knows from memory that a spell has no cover, without reading it', () => {
    mockCachedCover.mockReturnValue(null);
    const { result } = renderHook(() => useSpellCoverUrl('s1', 'user-1'));
    expect(result.current).toBeNull();
    expect(mockGetSpellById).not.toHaveBeenCalled();
  });
});

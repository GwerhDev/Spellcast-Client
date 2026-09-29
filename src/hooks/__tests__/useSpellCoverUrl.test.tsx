import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSpellCoverUrl } from '../useSpellCoverUrl';

const mockGetSpellById = vi.fn();
vi.mock('../../db', () => ({
  getSpellById: (...args: unknown[]) => mockGetSpellById(...args),
}));

beforeEach(() => {
  mockGetSpellById.mockReset();
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
});

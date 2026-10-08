import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { makeStore } from '../../test/renderWithProviders';
import { useSpellCoverEditor } from '../useSpellCoverEditor';
import * as db from '../../db';
import * as pdfUtils from '../../utils/pdfUtils';

const setup = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useSpellCoverEditor('doc-1'), { wrapper });
  return { store, editor: result.current };
};

describe('useSpellCoverEditor', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('saves a frame pick and announces it to the views, without refetching the lists', async () => {
    const save = vi.spyOn(db, 'updateSpellCoverFrame').mockResolvedValue(undefined);
    const { store, editor } = setup();
    const before = store.getState().spellReader.listVersion;
    await act(async () => { await editor.setFrame('grimoire'); });
    expect(save).toHaveBeenCalledWith('doc-1', 'user-1', 'grimoire');
    expect(store.getState().spellReader.coverFrameChange).toMatchObject({ spellId: 'doc-1', coverFrameId: 'grimoire' });
    expect(store.getState().spellReader.listVersion).toBe(before);
  });

  // The cover is the spell's thumbnail only: its pages stay as the PDF has them.
  it('a new cover is saved as the thumbnail, leaving the pages as they are, and refreshes the reader and the lists', async () => {
    const cover = new Blob(['img']);
    const pages = JSON.stringify([{ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Page one' }] }] }]);
    vi.spyOn(pdfUtils, 'downscaleImageBlob').mockResolvedValue(cover);
    vi.spyOn(db, 'getSpellById').mockResolvedValue({ id: 'doc-1', title: 'My Book', userId: 'user-1', createdAt: new Date(), pagesContent: pages } as never);
    const save = vi.spyOn(db, 'updateSpellFull').mockResolvedValue(undefined);
    const { store, editor } = setup();
    const { listVersion, contentVersion } = store.getState().spellReader;
    await act(async () => { await editor.setCoverFromImage(new File(['x'], 'cover.png')); });
    expect(save).toHaveBeenCalledWith('doc-1', 'user-1', expect.objectContaining({ title: 'My Book', cover, pagesContent: pages }));
    expect(store.getState().spellReader.listVersion).toBe(listVersion + 1);
    expect(store.getState().spellReader.contentVersion).toBe(contentVersion + 1);
  });
});

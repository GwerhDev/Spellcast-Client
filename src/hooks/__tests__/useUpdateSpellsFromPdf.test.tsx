import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { makeStore } from '../../test/renderWithProviders';
import { LanguageProvider } from '../../i18n';

const getOriginalPdfMock = vi.fn<(id: string) => Promise<Blob | null>>();
vi.mock('../../db/originalPdfs', () => ({ getOriginalPdf: (id: string) => getOriginalPdfMock(id) }));
const getSpellByIdMock = vi.fn<(id: string, userId: string) => Promise<{ id: string; title: string } | undefined>>();
vi.mock('../../db', () => ({ getSpellById: (id: string, userId: string) => getSpellByIdMock(id, userId) }));
vi.mock('../../utils/pdfUtils', () => ({ blobToDataUrl: () => Promise.resolve('data:application/pdf;base64,AAAA') }));

const { useUpdateSpellsFromPdf } = await import('../useUpdateSpellsFromPdf');

const setup = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}><LanguageProvider>{children}</LanguageProvider></Provider>;
  return { store, ...renderHook(() => useUpdateSpellsFromPdf(), { wrapper }) };
};

describe('useUpdateSpellsFromPdf', () => {
  beforeEach(() => {
    getOriginalPdfMock.mockImplementation(id => Promise.resolve(id === 'no-pdf' ? null : new Blob(['%PDF'])));
    getSpellByIdMock.mockImplementation(id => Promise.resolve({ id, title: `Title of ${id}` }));
  });

  it('queues each spell with a stored PDF to be read again from it, and skips the rest', async () => {
    const { store, result } = setup();
    const outcome = await act(async () => result.current(['a', 'no-pdf', 'b']));
    expect(outcome).toEqual({ queued: 2, skipped: 1 });
    const jobs = store.getState().spellUpload.queue;
    expect(jobs.map(j => j.targetDocId)).toEqual(['a', 'b']);
    jobs.forEach(job => {
      expect(job.refreshFromPdf).toBe(true);
      expect(job.fileContent.startsWith('data:application/pdf')).toBe(true);
    });
    expect(jobs[0].title).toBe('Title of a');
  });

  it('tells how many were queued and skipped', async () => {
    const { store, result } = setup();
    await act(async () => { await result.current(['a', 'no-pdf']); });
    expect(store.getState().apiResponses.responses.at(-1)?.message).toContain('1');
  });
});

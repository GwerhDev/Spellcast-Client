import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import sessionReducer from '../../store/sessionSlice';
import apiResponsesReducer from '../../store/apiResponsesSlice';
import spellReaderReducer from '../../store/spellReaderSlice';
import { LanguageProvider } from '../../i18n';
import type { PdfMetadata } from '../../utils/pdfUtils';

const getDocumentMock = vi.fn();
vi.mock('pdfjs-dist', () => ({
  getDocument: (...args: unknown[]) => getDocumentMock(...args),
  GlobalWorkerOptions: { workerSrc: '' },
}));
vi.mock('pdfjs-dist/build/pdf.worker?url', () => ({ default: '' }));

const getOriginalPdfMock = vi.fn();
vi.mock('../../db/originalPdfs', () => ({
  getOriginalPdf: (...args: unknown[]) => getOriginalPdfMock(...args),
}));

const updateSpellMetadataMock = vi.fn();
vi.mock('../../db', () => ({
  updateSpellMetadata: (...args: unknown[]) => updateSpellMetadataMock(...args),
}));

const extractPdfMetadataMock = vi.fn<() => Promise<PdfMetadata>>();
vi.mock('../../utils/pdfUtils', () => ({
  extractPdfMetadata: (...args: unknown[]) => extractPdfMetadataMock(...(args as [])),
}));

const { useRefreshSpellMetadataFromPdf } = await import('../useRefreshSpellMetadataFromPdf');

const makeStore = () => {
  const store = configureStore({
    reducer: combineReducers({
      session: sessionReducer,
      apiResponses: apiResponsesReducer,
      spellReader: spellReaderReducer,
    }),
  });
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { loader: false, id: 'user-1' } } });
  return store;
};

const renderTheHook = (store: ReturnType<typeof makeStore>) =>
  renderHook(() => useRefreshSpellMetadataFromPdf(), {
    wrapper: ({ children }) => (
      <Provider store={store}>
        <LanguageProvider>{children}</LanguageProvider>
      </Provider>
    ),
  });

const fakePdfBlob = () => new Blob(['%PDF-1.4'], { type: 'application/pdf' });

beforeEach(() => {
  vi.clearAllMocks();
  getDocumentMock.mockReturnValue({ promise: Promise.resolve({}) });
  extractPdfMetadataMock.mockResolvedValue({});
  updateSpellMetadataMock.mockResolvedValue(undefined);
});

describe('useRefreshSpellMetadataFromPdf', () => {
  describe('refreshOne', () => {
    it('returns skipped and never writes when the spell has no stored original PDF', async () => {
      getOriginalPdfMock.mockResolvedValue(null);
      const { result } = renderTheHook(makeStore());

      const outcome = await act(async () => result.current.refreshOne('spell-1'));

      expect(outcome).toEqual({ status: 'skipped' });
      expect(updateSpellMetadataMock).not.toHaveBeenCalled();
    });

    it('parses the stored PDF, extracts metadata, and persists it', async () => {
      getOriginalPdfMock.mockResolvedValue(fakePdfBlob());
      extractPdfMetadataMock.mockResolvedValue({ description: 'A tale', author: 'Jane Doe', tags: ['fantasy'], language: 'en' });
      const { result } = renderTheHook(makeStore());

      const outcome = await act(async () => result.current.refreshOne('spell-1'));

      expect(outcome.status).toBe('updated');
      expect(outcome.metadata).toEqual({ description: 'A tale', author: 'Jane Doe', tags: ['fantasy'], language: 'en' });
      expect(updateSpellMetadataMock).toHaveBeenCalledWith('spell-1', 'user-1', {
        description: 'A tale', author: 'Jane Doe', tags: ['fantasy'], language: 'en',
      });
    });

    it('passes the title through when the PDF metadata includes one', async () => {
      getOriginalPdfMock.mockResolvedValue(fakePdfBlob());
      extractPdfMetadataMock.mockResolvedValue({ title: 'Title From PDF', author: 'Jane Doe' });
      const { result } = renderTheHook(makeStore());

      const outcome = await act(async () => result.current.refreshOne('spell-1'));

      expect(outcome.metadata?.title).toBe('Title From PDF');
      expect(updateSpellMetadataMock).toHaveBeenCalledWith('spell-1', 'user-1', {
        title: 'Title From PDF', author: 'Jane Doe',
      });
    });

    it('treats an unparseable stored PDF as skipped rather than throwing', async () => {
      getOriginalPdfMock.mockResolvedValue(fakePdfBlob());
      getDocumentMock.mockReturnValue({ promise: Promise.reject(new Error('corrupt PDF')) });
      const { result } = renderTheHook(makeStore());

      const outcome = await act(async () => result.current.refreshOne('spell-1'));

      expect(outcome).toEqual({ status: 'skipped' });
      expect(updateSpellMetadataMock).not.toHaveBeenCalled();
    });
  });

  describe('refreshMany', () => {
    it('counts updated vs skipped, invalidates the spell list once, and reports the result', async () => {
      getOriginalPdfMock.mockImplementation((id: string) => Promise.resolve(id === 'has-pdf' ? fakePdfBlob() : null));
      const store = makeStore();
      const { result } = renderTheHook(store);

      const outcome = await act(async () => result.current.refreshMany(['has-pdf', 'no-pdf-1', 'no-pdf-2']));

      expect(outcome).toEqual({ updated: 1, skipped: 2 });
      expect(store.getState().spellReader.listVersion).toBe(1);
      expect(store.getState().apiResponses.responses).toHaveLength(1);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('sets isRefreshing to true while the loop is running', async () => {
      getOriginalPdfMock.mockReturnValue(new Promise(() => {})); // never resolves
      const { result } = renderTheHook(makeStore());

      act(() => { void result.current.refreshMany(['spell-1']); });

      await waitFor(() => expect(result.current.isRefreshing).toBe(true));
    });
  });
});

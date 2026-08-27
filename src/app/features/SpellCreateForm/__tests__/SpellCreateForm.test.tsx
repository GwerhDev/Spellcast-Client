import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SpellCreateForm } from '../index';

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}));

vi.mock('pdfjs-dist/build/pdf.worker?url', () => ({ default: '' }));

vi.mock('../../../../app/components/Editors/SpellEditor', () => ({
  SpellEditor: () => null,
}));

const saveSpellToDBMock = vi.fn<(payload: Record<string, unknown>) => Promise<string>>(() => Promise.resolve('new-spell-id'));
vi.mock('../../../../db', () => ({
  saveSpellToDB: (...args: [Record<string, unknown>]) => saveSpellToDBMock(...args),
}));

const setOriginalPdfMock = vi.fn<(spellId: string, blob: Blob) => Promise<void>>(() => Promise.resolve());
vi.mock('../../../../db/originalPdfs', () => ({
  setOriginalPdf: (...args: [string, Blob]) => setOriginalPdfMock(...args),
}));

beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  saveSpellToDBMock.mockResolvedValue('new-spell-id');
  setOriginalPdfMock.mockResolvedValue(undefined);
});

const loggedInState = { session: { logged: true, userData: { id: 'user-1', loader: false } } };

describe('SpellCreateForm', () => {
  it('renders the form container', () => {
    renderWithProviders(<SpellCreateForm />);
    expect(screen.getByTestId('spell-create-form')).toBeInTheDocument();
  });

  it('renders the title input', () => {
    renderWithProviders(<SpellCreateForm />);
    expect(screen.getByTestId('spell-title-input')).toBeInTheDocument();
  });

  describe('handleSaveLocal (TCORE-90 -- no synthetic PDF is generated or stored)', () => {
    it('saves the spell without a pdf/originalPdf field, and without ever saving an original PDF when none was imported', async () => {
      renderWithProviders(<SpellCreateForm />, { preloadedState: loggedInState });
      fireEvent.change(screen.getByTestId('spell-title-input'), { target: { value: 'My Spell' } });
      fireEvent.click(screen.getByTestId('spell-create-save-btn'));

      await waitFor(() => expect(saveSpellToDBMock).toHaveBeenCalled());
      const payload = saveSpellToDBMock.mock.calls[0][0] as Record<string, unknown>;
      expect(payload).not.toHaveProperty('pdf');
      expect(payload).not.toHaveProperty('originalPdf');
      expect(setOriginalPdfMock).not.toHaveBeenCalled();
    });
  });
});

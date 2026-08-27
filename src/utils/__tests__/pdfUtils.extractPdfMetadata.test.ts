import { describe, it, expect } from 'vitest';
import { extractPdfMetadata } from '../pdfUtils';
import type * as pdfjsLib from 'pdfjs-dist';

// A fake PDFDocumentProxy: extractPdfMetadata only ever touches getMetadata(), so this
// is all that's needed -- no canvas, no real pdf.js.
const fakePdf = (
  info: Record<string, unknown>,
  metadata: { get: (name: string) => string | null } | null = null,
) => ({
  getMetadata: () => Promise.resolve({ info, metadata }),
}) as unknown as pdfjsLib.PDFDocumentProxy;

describe('extractPdfMetadata', () => {
  it('maps Title/Subject/Author straight across', async () => {
    const pdf = fakePdf({ Title: 'The Book', Subject: 'A tale', Author: 'Jane Doe' });
    const meta = await extractPdfMetadata(pdf);
    expect(meta.title).toBe('The Book');
    expect(meta.description).toBe('A tale');
    expect(meta.author).toBe('Jane Doe');
  });

  it('splits Keywords on commas into tags', async () => {
    const pdf = fakePdf({ Keywords: 'fantasy, adventure, dragons' });
    const meta = await extractPdfMetadata(pdf);
    expect(meta.tags).toEqual(['fantasy', 'adventure', 'dragons']);
  });

  it('splits Keywords on semicolons into tags', async () => {
    const pdf = fakePdf({ Keywords: 'fantasy; adventure ; dragons' });
    const meta = await extractPdfMetadata(pdf);
    expect(meta.tags).toEqual(['fantasy', 'adventure', 'dragons']);
  });

  it('reads language from info.Language when present', async () => {
    const pdf = fakePdf({ Language: 'es' });
    const meta = await extractPdfMetadata(pdf);
    expect(meta.language).toBe('es');
  });

  it('falls back to XMP dc:language when info.Language is absent', async () => {
    const pdf = fakePdf({}, { get: (name) => (name === 'dc:language' ? 'en' : null) });
    const meta = await extractPdfMetadata(pdf);
    expect(meta.language).toBe('en');
  });

  it('returns an empty object for a PDF with no metadata at all', async () => {
    const pdf = fakePdf({});
    const meta = await extractPdfMetadata(pdf);
    expect(meta).toEqual({});
  });

  it('ignores blank/whitespace-only info fields', async () => {
    const pdf = fakePdf({ Title: '   ', Author: '' });
    const meta = await extractPdfMetadata(pdf);
    expect(meta.title).toBeUndefined();
    expect(meta.author).toBeUndefined();
  });

  it('never throws for a PDF whose metadata read fails, and returns an empty object', async () => {
    const pdf = { getMetadata: () => Promise.reject(new Error('corrupt metadata')) } as unknown as pdfjsLib.PDFDocumentProxy;
    await expect(extractPdfMetadata(pdf)).resolves.toEqual({});
  });
});

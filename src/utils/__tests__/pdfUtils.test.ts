// This file covers the only parts of pdfUtils.ts that are both exported and don't
// depend on a real canvas 2D rendering context: blobToDataUrl and
// injectCoverIntoPages. Everything else in pdfUtils.ts -- extractPdfPages,
// renderPageToCover, extractPageImages, and their private canvas helpers
// (resolveCssColorToRgb, cropCanvasRegion, detectHorizontalRulesCanvas,
// detectDecorativeRegionsFromCanvas) -- calls canvas.getContext('2d'), which this
// project's test environment (happy-dom) returns null for; there's no canvas
// polyfill (e.g. the `canvas` npm package) installed. That's where this file's
// riskiest logic (glyph grouping, paragraph/heading detection, decorative-region
// detection) actually lives, and it remains untested until that's set up.
import { describe, it, expect } from 'vitest';
import { blobToDataUrl, injectCoverIntoPages, emptyPageContent } from '../pdfUtils';
import type { JSONContent } from '@tiptap/core';

describe('blobToDataUrl', () => {
  it('resolves with a data: URL for the blob contents', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const url = await blobToDataUrl(blob);
    expect(url).toMatch(/^data:text\/plain;base64,/);
  });

  it('rejects when the blob cannot be read', async () => {
    // FileReader.readAsDataURL only errors for real on unreadable sources (e.g. a
    // detached/oversized blob), which is impractical to construct in a test env --
    // instead confirm the promise rejection path is wired to reader.onerror by
    // triggering it directly.
    const originalReadAsDataURL = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function () {
      this.onerror?.(new ProgressEvent('error') as unknown as ProgressEvent<FileReader>);
    };
    try {
      await expect(blobToDataUrl(new Blob(['x']))).rejects.toBeTruthy();
    } finally {
      FileReader.prototype.readAsDataURL = originalReadAsDataURL;
    }
  });
});

describe('injectCoverIntoPages', () => {
  const textPage = (text: string): JSONContent => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });

  it('returns pages unchanged when there is no cover blob', async () => {
    const pages = [textPage('hello')];
    expect(await injectCoverIntoPages(pages, null)).toBe(pages);
  });

  it('returns pages unchanged when there are no pages', async () => {
    expect(await injectCoverIntoPages([], new Blob(['x']))).toEqual([]);
  });

  it('does not inject a cover when the first page already has real text', async () => {
    const pages = [textPage('Chapter One')];
    const result = await injectCoverIntoPages(pages, new Blob(['cover'], { type: 'image/jpeg' }));
    expect(result).toBe(pages);
  });

  it('injects a cover image as the first node when the first page has no text', async () => {
    const pages = [{ ...emptyPageContent }, textPage('Chapter One')];
    const result = await injectCoverIntoPages(pages, new Blob(['cover'], { type: 'image/jpeg' }));

    expect(result[0].content?.[0]).toMatchObject({
      type: 'image',
      attrs: { alt: null, title: null },
    });
    const src = (result[0].content?.[0].attrs as { src: string }).src;
    expect(src).toMatch(/^data:image\/jpeg;base64,/);
    // The page's own (empty) paragraph content is preserved after the cover image.
    expect(result[0].content?.[1]).toEqual(emptyPageContent.content?.[0]);
    // Untouched pages are passed through as-is.
    expect(result[1]).toBe(pages[1]);
  });

  it('does not double-inject a cover if the first node is already a non-graphic image', async () => {
    const pages: JSONContent[] = [{
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'data:image/jpeg;base64,existing', alt: null, title: null } }],
    }];
    const result = await injectCoverIntoPages(pages, new Blob(['cover'], { type: 'image/jpeg' }));
    expect(result).toBe(pages);
  });

  it('still injects when the first node is a decorative "pdf-graphic" image (not a real cover)', async () => {
    const pages: JSONContent[] = [{
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'data:image/png;base64,deco', alt: null, title: 'pdf-graphic' } }],
    }];
    const result = await injectCoverIntoPages(pages, new Blob(['cover'], { type: 'image/jpeg' }));
    expect(result[0].content?.[0]).toMatchObject({ type: 'image', attrs: { title: null } });
    expect(result[0].content?.[1]).toMatchObject({ attrs: { title: 'pdf-graphic' } });
  });

  it('treats an empty paragraph (no content) as "no text" and still injects a cover', async () => {
    const pages: JSONContent[] = [
      { type: 'doc', content: [{ type: 'paragraph' }] },
      textPage('Chapter One'),
    ];
    const result = await injectCoverIntoPages(pages, new Blob(['cover'], { type: 'image/jpeg' }));
    expect(result[0].content?.[0]).toMatchObject({ type: 'image' });
  });

  it('falls back to the original pages if reading the blob fails', async () => {
    const pages = [{ ...emptyPageContent }];
    // An empty Blob with no real image bytes still resolves via FileReader (it just
    // reads whatever bytes exist), so force the failure path directly instead.
    const originalReadAsDataURL = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function () {
      this.onerror?.(new ProgressEvent('error') as unknown as ProgressEvent<FileReader>);
    };
    try {
      const result = await injectCoverIntoPages(pages, new Blob(['cover']));
      expect(result).toBe(pages);
    } finally {
      FileReader.prototype.readAsDataURL = originalReadAsDataURL;
    }
  });
});

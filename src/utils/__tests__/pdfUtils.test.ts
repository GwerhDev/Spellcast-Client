// This file covers the only parts of pdfUtils.ts that are both exported and don't
// depend on a real canvas 2D rendering context: blobToDataUrl. Everything else in pdfUtils.ts -- extractPdfPages,
// renderPageToCover, extractPageImages, and their private canvas helpers
// (resolveCssColorToRgb, cropCanvasRegion, detectHorizontalRulesCanvas,
// detectDecorativeRegionsFromCanvas) -- calls canvas.getContext('2d'), which this
// project's test environment (happy-dom) returns null for; there's no canvas
// polyfill (e.g. the `canvas` npm package) installed. That's where this file's
// riskiest logic (glyph grouping, paragraph/heading detection, decorative-region
// detection) actually lives, and it remains untested until that's set up.
import { describe, it, expect } from 'vitest';
import { blobToDataUrl } from '../pdfUtils';

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

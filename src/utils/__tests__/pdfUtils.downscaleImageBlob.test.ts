import { describe, it, expect } from 'vitest';
import { downscaleImageBlob } from '../pdfUtils';

// TCORE-122 review follow-up: this test env (happy-dom) has no createImageBitmap/canvas
// rendering support, so the actual downscale path isn't exercisable here -- see
// pdfUtils.test.ts's header comment for the same limitation on renderPageToCover. What IS
// verifiable without a real canvas is the fallback contract: a blob that can't be
// decoded/re-encoded here is returned as-is rather than the upload failing outright.
describe('downscaleImageBlob', () => {
  it('falls back to the original blob when it cannot be decoded/re-encoded in this environment', async () => {
    const original = new Blob(['not-a-real-image'], { type: 'image/png' });
    const result = await downscaleImageBlob(original);
    expect(result).toBe(original);
  });
});

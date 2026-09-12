import { describe, it, expect } from 'vitest';
import { applyCoverToPage1, downscaleImageBlob } from '../pdfUtils';
import type { JSONContent } from '@tiptap/core';

// TCORE-122 review follow-up: applyCoverToPage1 is the logic shared by SpellCreateForm and
// SpellEditForm's applyCover (previously duplicated -- and, in SpellEditForm's case,
// entirely missing -- so an edit-time cover change updated the Blob/thumbnail but left the
// reader's own page 1 image node stale). Covered directly here since it's pure and the two
// forms both depend on it doing the same thing.
describe('applyCoverToPage1', () => {
  const NEW_COVER = 'data:image/jpeg;base64,NEWCOVER';

  it('returns pages unchanged when there are no pages', () => {
    expect(applyCoverToPage1([], NEW_COVER)).toEqual([]);
  });

  it('prepends a cover image node when page 1 has none yet, keeping its existing content', () => {
    const pages: JSONContent[] = [
      { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }] },
    ];
    const result = applyCoverToPage1(pages, NEW_COVER);

    expect(result[0].content).toHaveLength(2);
    expect(result[0].content?.[0]).toEqual({ type: 'image', attrs: { src: NEW_COVER, alt: null, title: null } });
    expect(result[0].content?.[1]).toEqual(pages[0].content?.[0]);
    // The original array/page object is not mutated in place.
    expect(pages[0].content).toHaveLength(1);
  });

  it('replaces an existing cover image node in place instead of stacking a second one', () => {
    const pages: JSONContent[] = [{
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: 'data:image/jpeg;base64,OLD', alt: null, title: null } },
        { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
      ],
    }];
    const result = applyCoverToPage1(pages, NEW_COVER);

    expect(result[0].content).toHaveLength(2);
    expect(result[0].content?.[0]).toEqual({ type: 'image', attrs: { src: NEW_COVER, alt: null, title: null } });
    expect(result[0].content?.[1]).toEqual(pages[0].content?.[1]);
  });

  it('treats a decorative "pdf-graphic" image as page content, not an existing cover -- prepends instead of replacing it', () => {
    const pages: JSONContent[] = [{
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'data:image/png;base64,deco', alt: null, title: 'pdf-graphic' } }],
    }];
    const result = applyCoverToPage1(pages, NEW_COVER);

    expect(result[0].content).toHaveLength(2);
    expect(result[0].content?.[0]).toEqual({ type: 'image', attrs: { src: NEW_COVER, alt: null, title: null } });
    expect(result[0].content?.[1]).toMatchObject({ attrs: { title: 'pdf-graphic' } });
  });

  it('only touches page 1 -- other pages pass through untouched', () => {
    const otherPage: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };
    const pages: JSONContent[] = [
      { type: 'doc', content: [{ type: 'paragraph' }] },
      otherPage,
    ];
    const result = applyCoverToPage1(pages, NEW_COVER);
    expect(result[1]).toBe(otherPage);
  });
});

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

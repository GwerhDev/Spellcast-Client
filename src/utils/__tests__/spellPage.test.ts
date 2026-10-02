import { describe, it, expect } from 'vitest';
import { isCoverPage, pageFrame, DEFAULT_PAGE_MARGINS } from '../spellPage';

const image = (attrs: Record<string, unknown>) => ({ type: 'image', attrs: { src: 'data:', alt: null, title: null, ...attrs } });
const text = (t: string) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] });
const pageOf = (...content: object[]) => ({ type: 'doc', attrs: { displayWidth: 794, displayHeight: 1123, marginTop: 124, marginRight: 137, marginBottom: 20, marginLeft: 136 }, content });

describe('isCoverPage', () => {
  it('is page 1 starting with its marked cover', () => {
    expect(isCoverPage(pageOf(image({ cover: true }), { type: 'paragraph' }), 0)).toBe(true);
  });

  it('is never another page, even one starting with an image (a title page\'s logo)', () => {
    expect(isCoverPage(pageOf(image({ cover: true })), 2)).toBe(false);
    expect(isCoverPage(pageOf(image({}), text('William Shakespeare')), 2)).toBe(false);
  });

  it('is not page 1 starting with an image read from the PDF (it has a width)', () => {
    expect(isCoverPage(pageOf(image({ width: 154 }), text('Title')), 0)).toBe(false);
  });

  it('an older, unmarked cover: page 1\'s image with no width and nothing written on the page', () => {
    expect(isCoverPage(pageOf(image({}), { type: 'paragraph' }), 0)).toBe(true);
    expect(isCoverPage(pageOf(image({}), text('Some text')), 0)).toBe(false);
  });
});

describe('pageFrame', () => {
  it('is the page as on its PDF: its size and its margins', () => {
    expect(pageFrame(pageOf(text('Hi')), 2)).toEqual({
      width: 794, height: 1123, cover: false,
      margins: { marginTop: 124, marginRight: 137, marginBottom: 20, marginLeft: 136 },
    });
  });

  it('a cover page has no margins: its cover is the whole sheet', () => {
    expect(pageFrame(pageOf(image({ cover: true })), 0).margins).toEqual({ marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 });
  });

  it('a page written here gets the defaults', () => {
    expect(pageFrame({ type: 'doc', content: [] }, 0)).toEqual({ width: 800, height: 1131, cover: false, margins: DEFAULT_PAGE_MARGINS });
  });
});

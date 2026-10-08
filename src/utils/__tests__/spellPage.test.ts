import { describe, it, expect } from 'vitest';
import { isCoverPage, pageFrame, DEFAULT_PAGE_MARGINS, dropCoverOverText } from '../spellPage';

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
      width: 794, height: 1123, cover: false, whole: false,
      margins: { marginTop: 124, marginRight: 137, marginBottom: 20, marginLeft: 136 },
    });
  });

  it('a cover page has no margins: its cover is the whole sheet', () => {
    expect(pageFrame(pageOf(image({ cover: true })), 0).margins).toEqual({ marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 });
  });

  it('a page written here gets the defaults', () => {
    expect(pageFrame({ type: 'doc', content: [] }, 0)).toEqual({ width: 800, height: 1131, cover: false, whole: false, margins: DEFAULT_PAGE_MARGINS });
  });
});

describe('dropCoverOverText', () => {
  it('takes a marked cover off a page 1 with text, however nested', () => {
    const box = { type: 'box', content: [text('Nhexa')] };
    const pages = [pageOf(image({ cover: true }), box), pageOf(text('two'))];
    const result = dropCoverOverText(pages);
    expect(result[0].content).toEqual([box]);
    expect(result[1]).toBe(pages[1]);
  });

  it('keeps the cover of a page 1 with nothing written on it, and a page starting with a logo', () => {
    const coverPage = [pageOf(image({ cover: true }), { type: 'paragraph' })];
    expect(dropCoverOverText(coverPage)).toBe(coverPage);
    const logoPage = [pageOf(image({ title: 'pdf-graphic', width: 120 }), text('Title'))];
    expect(dropCoverOverText(logoPage)).toBe(logoPage);
  });
});


describe('pageFrame: a page drawn whole', () => {
  const dims = { pageWidth: 595, pageHeight: 842, displayWidth: 793, displayHeight: 1123 };
  const noMargins = { marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 };

  it('is a page with no margins whose first block is its picture, as wide as the page', () => {
    const page = { type: 'doc', attrs: { ...dims, ...noMargins }, content: [image({ width: 793 }), { type: 'paragraph' }] };
    expect(pageFrame(page, 0)).toMatchObject({ whole: true, height: 1123 });
  });

  it('a page with margins, or a smaller image, is not', () => {
    expect(pageFrame({ type: 'doc', attrs: dims, content: [image({ width: 793 })] }, 1).whole).toBe(false);
    expect(pageFrame({ type: 'doc', attrs: { ...dims, ...noMargins }, content: [image({ width: 300 })] }, 1).whole).toBe(false);
  });
});

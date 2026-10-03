import { describe, it, expect, vi } from 'vitest';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// extractPdfPages reads pdfjsLib.OPS.{transform,paintImageXObject} to scan operator
// lists for XObject images -- mocked here with known small integers instead of
// depending on pdf.js's real (larger, version-dependent) enum values.
vi.mock('pdfjs-dist', () => ({
  OPS: { transform: 1, paintImageXObject: 2, save: 3, restore: 4 },
}));

const { extractPdfPages, splitOffPageScans } = await import('../pdfUtils');

interface MockPageOptions {
  items?: TextItem[];
  pageWidth?: number;
  pageHeight?: number;
  render?: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;
  operatorList?: { fnArray: number[]; argsArray: unknown[][] };
  imageObjs?: Record<string, { width: number; height: number; data: Uint8ClampedArray }>;
}

const mkTextItem = (str: string, x: number, y: number, opts: Partial<TextItem> = {}): TextItem => ({
  str,
  dir: 'ltr',
  transform: [1, 0, 0, 1, x, y],
  width: opts.width ?? str.length * 6,
  height: opts.height ?? 12,
  fontName: opts.fontName ?? 'g1_f1',
  hasEOL: false,
});

// Minimal stand-in for pdfjsLib.PDFPageProxy -- only the members extractPdfPages
// actually calls. `render` gets the REAL canvas 2D context (backed by the `canvas`
// package via test/setup.ts), so a test can draw real pixels to drive the
// pixel-based rule/decorative-region detection, exactly like a real PDF render
// would produce them.
const mkPage = (opts: MockPageOptions = {}) => {
  const pageWidth = opts.pageWidth ?? 300;
  const pageHeight = opts.pageHeight ?? 400;
  return {
    getViewport: ({ scale }: { scale: number }) => ({ width: pageWidth * scale, height: pageHeight * scale }),
    getTextContent: async () => ({ items: opts.items ?? [], styles: {} }),
    render: ({ canvasContext, canvas }: { canvasContext: CanvasRenderingContext2D; canvas: HTMLCanvasElement }) => ({
      promise: Promise.resolve().then(() => {
        // A real PDF render always paints a white (or otherwise light) page
        // background. node-canvas's default, unpainted pixels are transparent
        // black instead, which the pixel-darkness heuristics below would
        // otherwise read as "the entire page is one giant dark region" --
        // nothing to do with the actual test content. Painting white first
        // mirrors what a real render produces before any test-supplied
        // `render` callback draws its own content on top.
        canvasContext.fillStyle = 'white';
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);
        opts.render?.(canvasContext, canvas);
      }),
    }),
    getOperatorList: async () => opts.operatorList ?? { fnArray: [], argsArray: [] },
    objs: {
      get: (key: string, cb: (data: unknown) => void) => cb(opts.imageObjs?.[key] ?? null),
    },
    commonObjs: { get: undefined },
  };
};

const mkPdf = (pages: ReturnType<typeof mkPage>[]) => ({
  numPages: pages.length,
  getPage: async (n: number) => pages[n - 1],
});

describe('extractPdfPages', () => {
  it('produces an empty page node (with page dimension attrs) when there is no text', async () => {
    const pdf = mkPdf([mkPage({ items: [], pageWidth: 200, pageHeight: 300 })]);
    const onProgress = vi.fn();
    const onPageExtracted = vi.fn();

    const pages = await extractPdfPages(pdf as never, onProgress, onPageExtracted);

    expect(pages).toHaveLength(1);
    expect(pages[0].type).toBe('doc');
    expect(pages[0].content).toEqual([{ type: 'paragraph' }]);
    expect(pages[0].attrs).toMatchObject({ pageWidth: 200, pageHeight: 300 });
    expect(onProgress).toHaveBeenCalledWith(1, 1);
    expect(onPageExtracted).toHaveBeenCalledWith(1, pages[0]);
  });

  it('extracts a single line of text as one paragraph, preserving left-to-right order', async () => {
    const items = [
      mkTextItem('Hello', 50, 300),
      mkTextItem(' world', 90, 300),
    ];
    const pdf = mkPdf([mkPage({ items })]);

    const [page] = await extractPdfPages(pdf as never);
    const paragraph = page.content?.[0];

    expect(paragraph?.type).toBe('paragraph');
    const texts = paragraph?.content?.map((n) => n.text).join('');
    expect(texts).toBe('Hello world');
  });

  it('splits into separate paragraph nodes across a large vertical gap', async () => {
    const items = [
      mkTextItem('First paragraph', 50, 380),
      mkTextItem('Second paragraph', 50, 250), // far enough below to start a new paragraph
    ];
    const pdf = mkPdf([mkPage({ items, pageHeight: 400 })]);

    const [page] = await extractPdfPages(pdf as never);
    const paragraphNodes = page.content?.filter((n) => n.type === 'paragraph' || n.type === 'heading');

    expect(paragraphNodes?.length).toBeGreaterThanOrEqual(2);
    const allText = paragraphNodes?.map((p) => p.content?.map((c) => c.text).join('')).join(' | ');
    expect(allText).toContain('First paragraph');
    expect(allText).toContain('Second paragraph');
  });

  it('classifies large-baseline lines as headings (level scales with line height)', async () => {
    // Body paragraph (normal height=12) establishes a baseline; each candidate line
    // sits far enough below the previous one to start its own one-line paragraph, so
    // firstLineHeight equals exactly that line's own height.
    const items = [
      mkTextItem('Huge Title', 50, 380, { height: 30 }),
      mkTextItem('Medium Title', 50, 320, { height: 22 }),
      mkTextItem('Small Title', 50, 270, { height: 18 }),
      mkTextItem('Body line one', 50, 230, { height: 12 }),
      mkTextItem('Body line two', 50, 218, { height: 12 }),
      mkTextItem('Body line three', 50, 206, { height: 12 }),
    ];
    const pdf = mkPdf([mkPage({ items, pageHeight: 400 })]);

    const [page] = await extractPdfPages(pdf as never);
    const byText = (needle: string) => page.content?.find((n) => n.content?.some((c) => c.text?.includes(needle)));

    expect(byText('Huge Title')).toMatchObject({ type: 'heading', attrs: { level: 1 } });
    expect(byText('Medium Title')).toMatchObject({ type: 'heading', attrs: { level: 2 } });
    expect(byText('Small Title')).toMatchObject({ type: 'heading', attrs: { level: 3 } });
    expect(byText('Body line one')).toMatchObject({ type: 'paragraph' });
  });

  it('marks bold/italic text based on the (subset-prefix-stripped) font name', async () => {
    const items = [
      mkTextItem('Plain', 50, 380, { fontName: 'ABCDEF+Georgia' }),
      mkTextItem(' BoldItalic', 100, 380, { fontName: 'ABCDEF+Georgia-BoldItalic' }),
    ];
    const pdf = mkPdf([mkPage({ items })]);

    const [page] = await extractPdfPages(pdf as never);
    const nodes = page.content?.[0]?.content ?? [];

    const plain = nodes.find((n) => n.text === 'Plain');
    const boldItalic = nodes.find((n) => n.text === ' BoldItalic');
    expect(plain?.marks?.some((m) => m.type === 'bold' || m.type === 'italic')).toBeFalsy();
    expect(boldItalic?.marks).toEqual(expect.arrayContaining([{ type: 'bold' }, { type: 'italic' }]));
  });

  it('detects a centered short line within the page\'s text-area width', async () => {
    const items = [
      // Wide body lines establish the text area (~50 to ~250).
      mkTextItem('This is a full width body line of text', 50, 380, { width: 200 }),
      mkTextItem('Another full width body line here too', 50, 368, { width: 200 }),
      // Short line, far enough below to be its own paragraph, centered around x=150.
      mkTextItem('Centered', 130, 300, { width: 40 }),
    ];
    const pdf = mkPdf([mkPage({ items })]);

    const [page] = await extractPdfPages(pdf as never);
    const centered = page.content?.find((n) => n.content?.some((c) => c.text === 'Centered'));
    expect(centered?.attrs).toMatchObject({ textAlign: 'center' });
  });

  it('detects a horizontal rule drawn on the page and reports it as a horizontalRule node', async () => {
    const pdf = mkPdf([mkPage({
      items: [mkTextItem('Above the rule', 50, 380)],
      pageWidth: 300,
      pageHeight: 400,
      render: (ctx, canvas) => {
        // A dense, wide dark bar far from the text line -- must span >25% of the
        // canvas width and be >75% dark to register as a rule. The base mkPage
        // mock already paints the page white before this callback runs.
        ctx.fillStyle = 'black';
        ctx.fillRect(20, 200, canvas.width - 40, 2);
      },
    })]);

    const [page] = await extractPdfPages(pdf as never);
    expect(page.content?.some((n) => n.type === 'horizontalRule')).toBe(true);
  });

  it('detects a decorative graphic region and emits a cropped image node for it', async () => {
    const pdf = mkPdf([mkPage({
      items: [mkTextItem('Body text far below', 50, 100)],
      pageWidth: 300,
      pageHeight: 400,
      render: (ctx) => {
        // A solid dark block well away from the text line, tall enough to clear
        // minHeightPx and dense enough (>=3% dark rows) to register as a region.
        // The base mkPage mock already paints the page white before this runs.
        ctx.fillStyle = 'black';
        ctx.fillRect(50, 20, 200, 60);
      },
    })]);

    const [page] = await extractPdfPages(pdf as never);
    const graphic = page.content?.find((n) => n.type === 'image' && (n.attrs as { title?: string })?.title === 'pdf-graphic');
    expect(graphic).toBeDefined();
    expect((graphic?.attrs as { src: string }).src).toMatch(/^data:image\/png;base64,/);
  });

  it('extracts an XObject image and positions it using the operator list\'s transform', async () => {
    const pdf = mkPdf([mkPage({
      items: [mkTextItem('Text on the page', 50, 380)],
      pageWidth: 300,
      pageHeight: 400,
      operatorList: {
        fnArray: [1 /* transform */, 2 /* paintImageXObject */],
        argsArray: [
          [1, 0, 0, 1, 0, 150], // translateY = 150
          ['img1'],
        ],
      },
      imageObjs: {
        img1: { width: 32, height: 32, data: new Uint8ClampedArray(32 * 32 * 4).fill(128) },
      },
    })]);

    const [page] = await extractPdfPages(pdf as never);
    const image = page.content?.find((n) => n.type === 'image' && (n.attrs as { title?: string })?.title === null);
    expect(image).toBeDefined();
    expect((image?.attrs as { src: string }).src).toMatch(/^data:image\/png;base64,/);
  });

  describe('a scanned page (the whole sheet one picture, its text read over it)', () => {
    // The scan drawn over the whole 300x400 sheet; the page dark grey, as a scan's paper is.
    const scanned = (items: TextItem[]) => mkPdf([mkPage({
      items,
      pageWidth: 300,
      pageHeight: 400,
      render: (ctx, canvas) => { ctx.fillStyle = '#888'; ctx.fillRect(0, 0, canvas.width, canvas.height); },
      operatorList: {
        fnArray: [1 /* transform */, 2 /* paintImageXObject */],
        argsArray: [[300, 0, 0, 400, 0, 0], ['scan']],
      },
      imageObjs: { scan: { width: 32, height: 32, data: new Uint8ClampedArray(32 * 32 * 4).fill(128) } },
    })]);

    it('is its text, without the picture of the page over it', async () => {
      const [page] = await extractPdfPages(scanned([mkTextItem('Read from the scan', 50, 300)]) as never);
      expect(page.content?.some(n => n.type === 'image')).toBe(false);
      expect(JSON.stringify(page.content)).toContain('Read from the scan');
    });

    it('takes only the images covering the sheet, and only from a page with text', () => {
      const sheet = { width: 300, height: 400 };
      const scan = { x: 0, y: 0, width: 300, height: 400 };
      const logo = { x: 20, y: 300, width: 80, height: 40 };
      const images = ['logo', 'scan'];
      const places = [logo, scan];
      expect(splitOffPageScans(images, places, sheet, true)).toEqual([scan]);
      expect(images).toEqual(['logo']);
      expect(places).toEqual([logo]);

      const untouched = ['scan'];
      expect(splitOffPageScans(untouched, [scan], sheet, false)).toEqual([]);
      expect(untouched).toEqual(['scan']);
    });
  });

  it('reports progress and extracted content once per page across a multi-page doc', async () => {
    const pdf = mkPdf([
      mkPage({ items: [mkTextItem('Page one', 50, 380)] }),
      mkPage({ items: [mkTextItem('Page two', 50, 380)] }),
    ]);
    const onProgress = vi.fn();
    const onPageExtracted = vi.fn();

    const pages = await extractPdfPages(pdf as never, onProgress, onPageExtracted);

    expect(pages).toHaveLength(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
    expect(onPageExtracted).toHaveBeenNthCalledWith(1, 1, pages[0]);
    expect(onPageExtracted).toHaveBeenNthCalledWith(2, 2, pages[1]);
  });

  // The text keeps its proportion to the page, and its place on it.
  describe('layout read from the page', () => {
    const textOf = (node: { content?: { type?: string; text?: string }[] } | undefined) =>
      (node?.content ?? []).map((c) => (c.type === 'hardBreak' ? ' ' : c.text ?? '')).join('');

    it('gives each text its own size, in the same px as the page (pt * 96/72)', async () => {
      const items = [mkTextItem('Small print', 50, 380, { height: 9 }), mkTextItem('Big title', 50, 300, { height: 18 })];
      const [page] = await extractPdfPages(mkPdf([mkPage({ items })]) as never);
      const sizeOf = (text: string) => page.content!.flatMap((n) => n.content ?? []).find((c) => c.text === text)
        ?.marks?.find((m) => m.type === 'textStyle')?.attrs?.fontSize;
      expect(sizeOf('Small print')).toBe('12px');
      expect(sizeOf('Big title')).toBe('24px');
    });

    it('keeps a space between pieces of a line drawn apart, like two columns', async () => {
      const items = [
        mkTextItem('Datos Médico', 50, 380, { width: 60 }),
        mkTextItem('Datos Paciente', 200, 380, { width: 70 }),
      ];
      const [page] = await extractPdfPages(mkPdf([mkPage({ items })]) as never);
      expect(textOf(page.content![0] as never)).toBe('Datos Médico Datos Paciente');
    });

    it('does not add one between pieces that touch', async () => {
      const items = [mkTextItem('7.415', 50, 380, { width: 30 }), mkTextItem('.604-5', 80, 380, { width: 36 })];
      const [page] = await extractPdfPages(mkPdf([mkPage({ items })]) as never);
      expect(textOf(page.content![0] as never)).toBe('7.415.604-5');
    });

    it('puts the real gap before a block instead of empty lines', async () => {
      const items = [mkTextItem('First block', 50, 380), mkTextItem('Far below', 50, 200)];
      const [page] = await extractPdfPages(mkPdf([mkPage({ items })]) as never);
      const blocks = page.content!;
      expect(blocks.filter((n) => n.type === 'paragraph' && !n.content?.length)).toHaveLength(0);
      expect(blocks[0].attrs?.spaceBefore).toBe(0);
      // Baselines 180pt apart, less the two lines' own height at line height 1.2.
      const expected = Math.round((180 - 12 * 1.2) * (96 / 72));
      expect(blocks[1].attrs?.spaceBefore).toBe(expected);
    });

    it('keeps a block\'s line spacing from the PDF', async () => {
      const items = [mkTextItem('Line one', 50, 380), mkTextItem('Line two', 50, 362)];
      const [page] = await extractPdfPages(mkPdf([mkPage({ items })]) as never);
      // 18pt between baselines over a 12pt font.
      expect(page.content![0].attrs?.lineHeight).toBe(1.5);
    });

    it('starts the page where its first block starts', async () => {
      const items = [mkTextItem('Top line', 50, 350)];
      const [page] = await extractPdfPages(mkPdf([mkPage({ items, pageHeight: 400 })]) as never);
      // 400 - (350 + 12 * (0.8 + 0.1)) = 39.2pt from the top.
      expect(page.attrs?.marginTop).toBe(Math.round(39.2 * (96 / 72)));
    });

    // As in real PDFs: a page transform flipping y, then the image's own inside save/restore.
    it('places an image by its whole transform: as wide as it is drawn on the page', async () => {
      const [page] = await extractPdfPages(mkPdf([mkPage({
        items: [mkTextItem('Text on the page', 50, 380)],
        pageWidth: 300,
        pageHeight: 400,
        operatorList: {
          fnArray: [1, 3, 1, 2, 4],
          argsArray: [
            [0.5, 0, 0, -0.5, 0, 400], // page: half scale, y flipped
            [],
            [120, 0, 0, -120, 300, 200], // the image: 120 units, i.e. 60pt on the page
            ['img1'],
            [],
          ],
        },
        imageObjs: { img1: { width: 32, height: 32, data: new Uint8ClampedArray(32 * 32 * 4).fill(128) } },
      })]) as never);
      const image = page.content?.find((n) => n.type === 'image' && (n.attrs as { title?: string })?.title === null);
      expect(image?.attrs?.width).toBe(Math.round(60 * (96 / 72)));
    });

    it('lays two columns of fields side by side, the left one read first', async () => {
      const rows = ['Name', 'Age', 'City'];
      const items = rows.flatMap((label, i) => [
        mkTextItem(`${label}: left`, 50, 380 - i * 14, { width: 60 }),
        mkTextItem(`${label}: right`, 180, 380 - i * 14, { width: 60 }),
      ]);
      const [page] = await extractPdfPages(mkPdf([mkPage({ items })]) as never);
      const columns = page.content!.find((n) => n.type === 'columns');
      expect(columns?.content).toHaveLength(2);
      const colText = (c: number) => (columns!.content![c].content ?? []).map((n) => textOf(n as never)).join(' | ');
      expect(colText(0)).toBe('Name: left Age: left City: left');
      expect(colText(1)).toBe('Name: right Age: right City: right');
    });

    it('keeps a bold label and its value on one line though their baselines differ a little', async () => {
      // As drawn by separate text operations: the value ~1pt below the label.
      const items = [mkTextItem('Rut:', 50, 380.1, { width: 20 }), mkTextItem('16.120.598-2', 74, 379, { width: 60 })];
      const [page] = await extractPdfPages(mkPdf([mkPage({ items })]) as never);
      const block = page.content![0];
      expect(block.content?.some((c) => c.type === 'hardBreak')).toBe(false);
      expect(textOf(block as never)).toBe('Rut: 16.120.598-2');
    });

    it('takes bold and the family from the loaded font, not just its name', async () => {
      const page = mkPage({ items: [mkTextItem('Label:', 50, 380, { fontName: 'g_d0_f1' })] });
      (page as { commonObjs: unknown }).commonObjs = {
        get: (name: string) => (name === 'g_d0_f1' ? { name: 'Helvetica-Bold', bold: true } : null),
      };
      const [doc] = await extractPdfPages(mkPdf([page]) as never);
      const text = doc.content![0].content![0];
      expect(text.marks).toEqual(expect.arrayContaining([{ type: 'bold' }]));
      expect(text.marks?.find((m) => m.type === 'textStyle')?.attrs?.fontFamily).toBe('Helvetica, Arial, sans-serif');
    });

    it('gives a block its text\'s own size, so its line height is a multiple of it', async () => {
      const items = [mkTextItem('Line one', 50, 380, { height: 9 }), mkTextItem('Line two', 50, 368, { height: 9 })];
      const [page] = await extractPdfPages(mkPdf([mkPage({ items })]) as never);
      expect(page.content![0].attrs?.fontSize).toBe(12);
    });

    // Prose set justified, as a book's page: lines all reaching the right edge, each new
    // paragraph's first line set in.
    const prose = () => {
      const line = (str: string, x: number, y: number, width: number) => mkTextItem(str, x, y, { width });
      return [
        line('The first paragraph runs the whole width', 50, 380, 220),
        line('of the text and wraps onto a second line', 50, 366, 220),
        line('which ends short.', 50, 352, 90),
        line('A second paragraph is set in and then', 62, 338, 208),
        line('wraps as well, all the way to the right', 50, 324, 220),
        line('edge, before it ends.', 50, 310, 100),
      ];
    };

    it('joins a wrapped paragraph\'s lines back into text that wraps again, justified', async () => {
      const [page] = await extractPdfPages(mkPdf([mkPage({ items: prose() })]) as never);
      const first = page.content![0];
      expect(first.content?.some((c) => c.type === 'hardBreak')).toBe(false);
      expect(textOf(first as never)).toBe('The first paragraph runs the whole width of the text and wraps onto a second line which ends short.');
      expect(first.attrs?.textAlign).toBe('justify');
    });

    it('starts a new paragraph at each first-line indent, keeping that indent', async () => {
      const [page] = await extractPdfPages(mkPdf([mkPage({ items: prose() })]) as never);
      const paragraphs = page.content!.filter((n) => n.type === 'paragraph');
      expect(paragraphs).toHaveLength(2);
      expect(textOf(paragraphs[1] as never)).toMatch(/^A second paragraph/);
      expect(paragraphs[1].attrs?.textIndent).toBe(Math.round(12 * (96 / 72)));
    });

    it('makes a word hyphenated at a line\'s end whole again', async () => {
      const items = [
        mkTextItem('A line of prose that ends in a hyphen-', 50, 380, { width: 220 }),
        mkTextItem('ated word and keeps going to the edge', 50, 366, { width: 220 }),
        mkTextItem('then stops.', 50, 352, { width: 60 }),
      ];
      const [page] = await extractPdfPages(mkPdf([mkPage({ items })]) as never);
      expect(textOf(page.content![0] as never)).toContain('hyphenated word');
    });

    it('keeps the breaks of rows that only look like a block (label/value fields)', async () => {
      const rows = ['Name: Ann', 'Specialty: General psychiatry', 'City: Santiago'];
      const items = rows.map((r, i) => mkTextItem(r, 50, 380 - i * 14, { width: r.length * 6 }));
      const [page] = await extractPdfPages(mkPdf([mkPage({ items })]) as never);
      expect(page.content![0].content?.filter((c) => c.type === 'hardBreak')).toHaveLength(2);
    });

    it('centers lines whose middles line up, without fake indent spaces', async () => {
      const items = [
        mkTextItem('A wider centered title', 100, 380, { width: 120 }),
        mkTextItem('Shorter', 135, 366, { width: 50 }),
      ];
      const [page] = await extractPdfPages(mkPdf([mkPage({ items })]) as never);
      const block = page.content![0];
      expect(block.attrs?.textAlign).toBe('center');
      expect(textOf(block as never)).toBe('A wider centered title Shorter');
    });

    it('keeps a text\'s color only when it has a hue', async () => {
      const items = [mkTextItem('link', 50, 380, { width: 30 }), mkTextItem('plain', 50, 300, { width: 30 })];
      const [page] = await extractPdfPages(mkPdf([mkPage({
        items,
        render: (ctx) => {
          // Glyph-like strokes where each text is drawn (canvas y down, at 96/72), over the
          // white page: one blue, one dark grey.
          const s = 96 / 72;
          const strokes = (color: string, baseline: number) => {
            ctx.fillStyle = color;
            for (let x = 50; x < 80; x += 6) ctx.fillRect(x * s, (400 - baseline - 8) * s, 2 * s, 8 * s);
          };
          strokes('#1f6fd0', 380);
          strokes('#333333', 300);
        },
      })]) as never);
      const colorOf = (text: string) => page.content!.flatMap((n) => n.content ?? []).find((c) => c.text === text)
        ?.marks?.find((m) => m.type === 'textStyle')?.attrs?.color;
      expect(colorOf('link')).toBe('#1f6fd0');
      expect(colorOf('plain')).toBeUndefined();
    });

    it('leaves ordinary full-width text alone', async () => {
      const items = [
        mkTextItem('A full width line of body text right here', 50, 380, { width: 230 }),
        mkTextItem('Another one just as wide as the first one', 50, 366, { width: 230 }),
        mkTextItem('Short last line', 50, 352, { width: 70 }),
      ];
      const [page] = await extractPdfPages(mkPdf([mkPage({ items })]) as never);
      expect(page.content!.some((n) => n.type === 'columns')).toBe(false);
    });
  });
});

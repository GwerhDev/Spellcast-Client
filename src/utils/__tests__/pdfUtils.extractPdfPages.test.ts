import { describe, it, expect, vi } from 'vitest';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// extractPdfPages reads pdfjsLib.OPS.{transform,paintImageXObject} to scan operator
// lists for XObject images -- mocked here with known small integers instead of
// depending on pdf.js's real (larger, version-dependent) enum values.
vi.mock('pdfjs-dist', () => ({
  OPS: { transform: 1, paintImageXObject: 2 },
}));

const { extractPdfPages } = await import('../pdfUtils');

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
    expect(plain?.marks).toBeUndefined();
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
});

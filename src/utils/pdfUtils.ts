import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { JSONContent } from '@tiptap/core';

export const emptyPageContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export const renderPageToCover = async (pdf: pdfjsLib.PDFDocumentProxy): Promise<Blob | null> => {
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1, 400 / viewport.width);
    const scaled = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = scaled.width;
    canvas.height = scaled.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: scaled }).promise;
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.75));
  } catch {
    return null;
  }
};

export const extractPageImages = async (page: pdfjsLib.PDFPageProxy): Promise<string[]> => {
  const dataUrls: string[] = [];
  try {
    const opList = await page.getOperatorList();
    const paintOps: number[] = [];
    for (let i = 0; i < opList.fnArray.length; i++) {
      if (opList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) paintOps.push(i);
    }
    const seen = new Set<string>();
    for (const opIdx of paintOps) {
      const key = opList.argsArray[opIdx][0] as string;
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        const imgData = await new Promise<{ width: number; height: number; [k: string]: unknown } | null>((resolve) => {
          let resolved = false;
          const done = (data: unknown) => { if (!resolved) { resolved = true; resolve(data as { width: number; height: number; [k: string]: unknown } | null); } };
          page.objs.get(key, done);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (page as any).commonObjs?.get?.(key, done);
          setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, 2000);
        });
        if (!imgData || imgData.width < 16 || imgData.height < 16) continue;
        const canvas = document.createElement('canvas');
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        const ctx = canvas.getContext('2d')!;
        const typed = imgData as { bitmap?: ImageBitmap; data?: Uint8ClampedArray; width: number; height: number };
        if (typed.bitmap instanceof ImageBitmap) {
          ctx.drawImage(typed.bitmap, 0, 0);
        } else if (imgData instanceof ImageBitmap) {
          ctx.drawImage(imgData, 0, 0);
        } else if (typed.data) {
          const iData = ctx.createImageData(imgData.width, imgData.height);
          iData.data.set(typed.data);
          ctx.putImageData(iData, 0, 0);
        } else {
          continue;
        }
        dataUrls.push(canvas.toDataURL('image/png'));
      } catch {
        // skip unrenderable image
      }
    }
  } catch {
    // skip page if operator list fails
  }
  return dataUrls;
};

export const extractPdfPages = async (pdf: pdfjsLib.PDFDocumentProxy): Promise<JSONContent[]> => {
  const allPagesContent: JSONContent[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    if (content.items.length === 0) {
      allPagesContent.push(emptyPageContent);
      continue;
    }

    const items = content.items as TextItem[];
    items.sort((a, b) => {
      if (a.transform[5] > b.transform[5]) return -1;
      if (a.transform[5] < b.transform[5]) return 1;
      return a.transform[4] - b.transform[4];
    });

    const lines: { items: TextItem[]; y: number; height: number; x: number }[] = [];
    if (items.length > 0) {
      let currentLine: TextItem[] = [];
      let lastY = items[0].transform[5];
      for (const item of items) {
        if (Math.abs(item.transform[5] - lastY) > 1) {
          currentLine.sort((a, b) => a.transform[4] - b.transform[4]);
          lines.push({ items: currentLine, y: lastY, height: currentLine.reduce((max, i) => Math.max(max, i.height), 0), x: currentLine[0]?.transform[4] || 0 });
          currentLine = [];
        }
        currentLine.push(item);
        lastY = item.transform[5];
      }
      currentLine.sort((a, b) => a.transform[4] - b.transform[4]);
      lines.push({ items: currentLine, y: lastY, height: currentLine.reduce((max, i) => Math.max(max, i.height), 0), x: currentLine[0]?.transform[4] || 0 });
    }

    const allLineHeights = lines.map(l => l.height).filter(h => h > 0);
    const avgLineHeight = allLineHeights.reduce((sum, h) => sum + h, 0) / (allLineHeights.length || 1);
    const paragraphs: { lines: typeof lines }[] = [];
    if (lines.length > 0) {
      let currentParagraph: typeof lines = [];
      if (lines[0].items.length > 0) currentParagraph.push(lines[0]);
      for (let j = 1; j < lines.length; j++) {
        const prevLine = lines[j - 1];
        const currLine = lines[j];
        const yDiff = prevLine.y - currLine.y;
        const threshold = Math.max(prevLine.height, currLine.height, avgLineHeight) * 1.5;
        if (yDiff > threshold) {
          paragraphs.push({ lines: currentParagraph });
          const numEmpty = Math.floor(yDiff / avgLineHeight) - 1;
          for (let k = 0; k < numEmpty; k++) paragraphs.push({ lines: [] });
          currentParagraph = [];
          if (currLine.items.length > 0) currentParagraph.push(currLine);
        } else {
          if (currLine.items.length > 0) currentParagraph.push(currLine);
        }
      }
      paragraphs.push({ lines: currentParagraph });
    }

    const pageContent: JSONContent = { type: 'doc', content: [] };

    for (const p of paragraphs) {
      if (p.lines.length === 0) {
        pageContent.content!.push({ type: 'paragraph' });
        continue;
      }
      const contentNodes: object[] = [];
      for (let i = 0; i < p.lines.length; i++) {
        const line = p.lines[i];
        if (i > 0) contentNodes.push({ type: 'hardBreak' });
        const indentation = line.x - (lines[0].x);
        if (indentation > 5) {
          const numSpaces = Math.round(indentation / 4);
          if (numSpaces > 0) contentNodes.push({ type: 'text', text: ' '.repeat(numSpaces) });
        }
        for (const item of line.items) {
          if (item.str.length === 0) continue;
          const textNode: { type: 'text'; text: string; marks?: object[] } = { type: 'text', text: item.str, marks: [] };
          const fontName = item.fontName.toLowerCase();
          if (fontName.includes('bold')) textNode.marks!.push({ type: 'bold' });
          if (fontName.includes('italic') || fontName.includes('oblique')) textNode.marks!.push({ type: 'italic' });
          if (textNode.marks?.length === 0) delete textNode.marks;
          contentNodes.push(textNode);
        }
      }
      if (contentNodes.length === 0) continue;

      const firstLineHeight = p.lines[0]?.height || 0;
      let nodeType = 'paragraph';
      let attrs = {};
      if (firstLineHeight > avgLineHeight * 1.8) { nodeType = 'heading'; attrs = { level: 1 }; }
      else if (firstLineHeight > avgLineHeight * 1.5) { nodeType = 'heading'; attrs = { level: 2 }; }
      else if (firstLineHeight > avgLineHeight * 1.2) { nodeType = 'heading'; attrs = { level: 3 }; }

      pageContent.content!.push({ type: nodeType, attrs, content: contentNodes });
    }

    const pageImages = await extractPageImages(page);
    for (const src of pageImages) {
      pageContent.content!.push({ type: 'image', attrs: { src, alt: null, title: null } });
    }

    if (pageNum === 1) {
      try {
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(1, 800 / viewport.width);
        const scaled = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: scaled }).promise;
        const coverDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        pageContent.content!.unshift({ type: 'image', attrs: { src: coverDataUrl, alt: null, title: null } });
      } catch {
        // skip if render fails
      }
    }

    allPagesContent.push(pageContent.content!.length > 0 ? pageContent : emptyPageContent);
  }

  return allPagesContent;
};

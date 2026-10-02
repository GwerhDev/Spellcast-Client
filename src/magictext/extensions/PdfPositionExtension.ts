import { Extension } from '@tiptap/core'

// Layout read from a PDF page, kept on its blocks so they sit where they did on the page:
// - marginLeft: how far in from the text's left edge (or its column's).
// - spaceBefore: the real space above the block, in px. Set, it replaces the block's own
//   margins, so the gap is the PDF's whatever the editor's default spacing.
// - lineHeight: the block's line spacing, as in the PDF.
// - fontSize: the block's own size, its text's most common one (px), so its line height is a
//   multiple of the text's size rather than of the tag's default one (a heading's).
// - textIndent: its first line's indent (px).
// - ruleColor / ruleThickness: a rule's own color and thickness (px).
// Columns side by side are their own nodes (see ColumnsExtension).
const px = (value: string) => {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : null
}

type Attrs = Record<string, unknown>

// The CSS for a block's space above it; shared with the reader so both draw it the same.
export const pdfLayoutStyle = (attrs: Attrs): Record<string, string> => {
  const style: Record<string, string> = {}
  if (typeof attrs.spaceBefore === 'number') {
    style['margin-top'] = `${attrs.spaceBefore}px`
    style['margin-bottom'] = '0'
  }
  return style
}

// A text block's own size and first-line indent; shared with the reader. A block read from a
// PDF (it has its own size) has its text's own weight too: a heading is bold only where its
// text is (its bold marks), not because of the tag a bigger size made it -- a page's larger,
// regular footer isn't drawn bold.
export const pdfTextStyle = (attrs: Attrs): Record<string, string> => {
  const style: Record<string, string> = {}
  if (typeof attrs.fontSize === 'number') {
    style['font-size'] = `${attrs.fontSize}px`
    style['font-weight'] = 'normal'
  }
  if (typeof attrs.textIndent === 'number') style['text-indent'] = `${attrs.textIndent}px`
  return style
}

// A rule's color and thickness; shared with the reader.
export const pdfRuleStyle = (attrs: Attrs): Record<string, string> => {
  const style: Record<string, string> = {}
  if (typeof attrs.ruleColor === 'string') style['border-top-color'] = attrs.ruleColor
  if (typeof attrs.ruleThickness === 'number') style['border-top-width'] = `${attrs.ruleThickness}px`
  return style
}

const toCss = (style: Record<string, string>) =>
  Object.entries(style).map(([k, v]) => `${k}: ${v}`).join('; ')

export const PdfPositionExtension = Extension.create({
  name: 'pdfPosition',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'image'],
        attributes: {
          marginLeft: {
            default: null,
            renderHTML: (attributes) => {
              if (!attributes.marginLeft) return {}
              return { style: `margin-left: ${attributes.marginLeft}px` }
            },
            parseHTML: (element) => {
              const val = element.style.marginLeft
              if (!val) return null
              return parseFloat(val) || null
            },
          },
        },
      },
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: {
            default: null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {}
              return { style: `line-height: ${attributes.lineHeight}` }
            },
            parseHTML: (element) => px(element.style.lineHeight),
          },
          fontSize: {
            default: null,
            renderHTML: (attributes) => {
              const css = toCss(pdfTextStyle({ fontSize: attributes.fontSize }))
              return css ? { style: css } : {}
            },
            parseHTML: (element) => px(element.style.fontSize),
          },
          textIndent: {
            default: null,
            renderHTML: (attributes) => {
              const css = toCss(pdfTextStyle({ textIndent: attributes.textIndent }))
              return css ? { style: css } : {}
            },
            parseHTML: (element) => px(element.style.textIndent),
          },
        },
      },
      {
        // The spell's cover image (see isCoverNode in the app): kept through editing, so
        // the cover page is still known to be one after it's saved.
        types: ['image'],
        attributes: {
          cover: {
            default: null,
            renderHTML: (attributes) => (attributes.cover ? { 'data-cover': 'true' } : {}),
            parseHTML: (element) => (element.dataset.cover === 'true' ? true : null),
          },
        },
      },
      {
        types: ['horizontalRule'],
        attributes: {
          ruleColor: {
            default: null,
            renderHTML: (attributes) => {
              const css = toCss(pdfRuleStyle({ ruleColor: attributes.ruleColor }))
              return css ? { style: css } : {}
            },
            parseHTML: (element) => element.style.borderTopColor || null,
          },
          ruleThickness: {
            default: null,
            renderHTML: (attributes) => {
              const css = toCss(pdfRuleStyle({ ruleThickness: attributes.ruleThickness }))
              return css ? { style: css } : {}
            },
            parseHTML: (element) => px(element.style.borderTopWidth),
          },
        },
      },
      {
        types: ['paragraph', 'heading', 'image', 'horizontalRule', 'columns', 'box'],
        attributes: {
          spaceBefore: {
            default: null,
            renderHTML: (attributes) => {
              const css = toCss(pdfLayoutStyle(attributes))
              return css ? { style: css } : {}
            },
            parseHTML: (element) => (element.style.marginTop ? px(element.style.marginTop) : null),
          },
        },
      },
    ]
  },
})

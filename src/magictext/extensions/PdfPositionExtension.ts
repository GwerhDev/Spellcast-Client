import { Extension } from '@tiptap/core'

// Layout read from a PDF page, kept on its blocks so they sit where they did on the page:
// - marginLeft: how far in from the text's left edge (or its column's).
// - spaceBefore: the real space above the block, in px. Set, it replaces the block's own
//   margins, so the gap is the PDF's whatever the editor's default spacing.
// - lineHeight: the block's line spacing, as in the PDF.
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

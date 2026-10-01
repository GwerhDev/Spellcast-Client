import { Extension } from '@tiptap/core'

// Layout read from a PDF page, kept on its blocks so they sit where they did on the page:
// - marginLeft: how far in from the text's left edge (paragraphs and headings).
// - spaceBefore: the real space above the block, in px. Set, it replaces the block's own
//   margins, so the gap is the PDF's whatever the editor's default spacing.
// - lineHeight: the block's line spacing, as in the PDF.
const px = (value: string) => {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : null
}

export const PdfPositionExtension = Extension.create({
  name: 'pdfPosition',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
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
        types: ['paragraph', 'heading', 'image', 'horizontalRule'],
        attributes: {
          spaceBefore: {
            default: null,
            renderHTML: (attributes) => {
              if (attributes.spaceBefore === null || attributes.spaceBefore === undefined) return {}
              return { style: `margin-top: ${attributes.spaceBefore}px; margin-bottom: 0` }
            },
            parseHTML: (element) => (element.style.marginTop ? px(element.style.marginTop) : null),
          },
        },
      },
    ]
  },
})

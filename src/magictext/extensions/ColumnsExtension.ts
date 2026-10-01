import { Node, mergeAttributes } from '@tiptap/core'

// Two (or more) columns side by side, as read from a PDF page laid out that way (a form's
// two columns of fields, a title with a QR beside it). A real container rather than layout
// on loose blocks, so each column's blocks stay together in reading order -- the first
// column's, then the next one's -- for everything that walks the page's blocks in order.
export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,

  addAttributes() {
    return {
      // Its width in px, as on the page; the last column takes what's left.
      width: {
        default: null,
        renderHTML: (attributes) => (attributes.width ? { style: `flex: 0 0 ${attributes.width}px; width: ${attributes.width}px` } : { style: 'flex: 1 1 0' }),
        parseHTML: (element) => (element.style.width ? parseFloat(element.style.width) || null : null),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', style: 'min-width: 0' }), 0]
  },
})

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,}',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columns', style: 'display: flex; align-items: flex-start' }), 0]
  },
})

import { Node, mergeAttributes } from '@tiptap/core'

// A colored box around blocks, as read from a PDF page (a grey details box, a colored footer
// band). A container, like columns (see ColumnsExtension), so its blocks stay in reading
// order for everything that walks the page's blocks.

// The box's color drawn for whatever theme the page is in: the page is the app's (dark, or
// a page background), not the PDF's white, so a grey box's own color could hide the text
// (which takes the theme's color there). A neutral grey becomes a light tint of the text's
// own color; a colored one is drawn as on the page, as its text keeps its own color from the
// PDF too (white on a blue band; see keepTextColors in pdfUtils).
export const boxBackground = (hex: string): string => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return 'transparent'
  const [r, g, b] = m.slice(1).map(v => parseInt(v, 16))
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const saturation = max === 0 ? 0 : (max - min) / max
  if (saturation < 0.15) return `color-mix(in srgb, currentColor ${max > 128 ? 9 : 16}%, transparent)`
  return hex
}

type Attrs = Record<string, unknown>

// Its CSS; shared with the reader so both draw it the same.
export const boxStyle = (attrs: Attrs): Record<string, string> => {
  const style: Record<string, string> = {
    // Its first block's top margin stays inside it.
    display: 'flow-root',
    'box-sizing': 'border-box',
    'border-radius': '2px',
  }
  if (typeof attrs.background === 'string') style.background = boxBackground(attrs.background)
  if (typeof attrs.marginLeft === 'number') style['margin-left'] = `${attrs.marginLeft}px`
  if (typeof attrs.width === 'number') style.width = `${attrs.width}px`
  if (typeof attrs.paddingBottom === 'number') style['padding-bottom'] = `${attrs.paddingBottom}px`
  return style
}

const toCss = (style: Record<string, string>) =>
  Object.entries(style).map(([k, v]) => `${k}: ${v}`).join('; ')

const plain = (parse: (element: HTMLElement) => unknown = () => null) => ({
  default: null,
  renderHTML: () => ({}),
  parseHTML: parse,
})

export const Box = Node.create({
  name: 'box',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      background: plain(element => element.dataset.background ?? null),
      marginLeft: plain(),
      width: plain(),
      paddingBottom: plain(),
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="box"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'box',
      ...(node.attrs.background ? { 'data-background': node.attrs.background } : {}),
      style: toCss(boxStyle(node.attrs)),
    }), 0]
  },
})

import { Extension } from '@tiptap/core'

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
        },
      },
    ]
  },
})

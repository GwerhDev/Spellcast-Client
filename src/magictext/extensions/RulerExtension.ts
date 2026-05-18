import { Extension } from '@tiptap/core'

export interface PageMargins {
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
}

export const DEFAULT_MARGINS: PageMargins = {
  marginTop: 48,
  marginRight: 64,
  marginBottom: 48,
  marginLeft: 64,
}

export interface RulerOptions {
  enabled: boolean
  defaultMargins: PageMargins
  paperWidth: number
  paperHeight: number
  onMarginsChange?: (margins: PageMargins) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ruler: {
      setPageMargins: (margins: Partial<PageMargins>) => ReturnType
    }
  }
}

export const RulerExtension = Extension.create<RulerOptions, { margins: PageMargins }>({
  name: 'ruler',

  addOptions() {
    return {
      enabled: false,
      defaultMargins: DEFAULT_MARGINS,
      paperWidth: 800,
      paperHeight: 1131,
      onMarginsChange: undefined,
    }
  },

  addStorage() {
    return {
      margins: this.options.defaultMargins,
    }
  },

  addCommands() {
    return {
      setPageMargins: (partial) => () => {
        const next = { ...this.storage.margins, ...partial }
        this.storage.margins = next
        this.options.onMarginsChange?.(next)
        return true
      },
    }
  },
})

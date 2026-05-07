import { createContext, useContext } from 'react'
import type { Translations, PartialTranslations } from './types'
import { en } from './locales/en'
import { es } from './locales/es'

const localeRegistry = new Map<string, Translations>([
  ['en', en],
  ['es', es],
])

export function registerLocale(locale: string, translations: Translations): void {
  localeRegistry.set(locale, translations)
}

function mergeTranslations(base: Translations, patch: PartialTranslations): Translations {
  return {
    toolbar:    { ...base.toolbar,    ...(patch.toolbar    ?? {}) },
    history:    { ...base.history,    ...(patch.history    ?? {}) },
    formatting: { ...base.formatting, ...(patch.formatting ?? {}) },
    headings:   { ...base.headings,   ...(patch.headings   ?? {}) },
    blocks:     { ...base.blocks,     ...(patch.blocks     ?? {}) },
    alignment:  { ...base.alignment,  ...(patch.alignment  ?? {}) },
    link:       { ...base.link,       ...(patch.link       ?? {}) },
    image:      { ...base.image,      ...(patch.image      ?? {}) },
    variables: { ...base.variables, ...(patch.variables ?? {}), typeLabels: { ...base.variables.typeLabels, ...(patch.variables?.typeLabels ?? {}) } },
    tts:          { ...base.tts,          ...(patch.tts          ?? {}) },
    variableNode: { ...base.variableNode, ...(patch.variableNode ?? {}) },
  }
}

export function resolveTranslations(locale?: string, overrides?: PartialTranslations): Translations {
  const localeTranslations = locale ? localeRegistry.get(locale) : undefined
  const withLocale = localeTranslations ? mergeTranslations(en, localeTranslations) : en
  return overrides ? mergeTranslations(withLocale, overrides) : withLocale
}

export const TranslationsContext = createContext<Translations>(en)

export function useTranslations(): Translations {
  return useContext(TranslationsContext)
}

export type { Translations, PartialTranslations } from './types'
export { en } from './locales/en'
export { es } from './locales/es'

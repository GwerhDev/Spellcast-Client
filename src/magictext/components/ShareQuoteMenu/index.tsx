import { useEffect, useRef, useState, type RefObject } from 'react'
import { useSpellQuoteSelection, type SpellQuoteSelection } from '../../hooks/useSpellQuoteSelection'
import { resolveTranslations, useTranslations, TranslationsContext } from '../../i18n'
import type { PartialTranslations } from '../../i18n/types'
import { QuoteIcon } from '../Toolbar/icons'
import s from './index.module.css'

const ICON_DELAY_MS = 500

interface Props {
  /** The element TTSSpellReader's sentence spans render into — read only, never modified. */
  containerRef: RefObject<HTMLElement | null>
  onShareQuote: (quote: SpellQuoteSelection) => void
  locale?: string
  translations?: PartialTranslations
}

function ShareQuoteMenuInner({ containerRef, onShareQuote }: Omit<Props, 'locale' | 'translations'>) {
  const t = useTranslations()
  const selection = useSpellQuoteSelection(containerRef)

  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [showIcon, setShowIcon] = useState(false)
  const [iconPos, setIconPos] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const iconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cancels the pending "show icon" timer, not just the icon's own visibility -- without
  // this, a still-pending timer from the drag that started the selection can fire later
  // and resurrect the icon after the context menu (or a share) already handled it.
  const dismissIcon = () => {
    if (iconTimerRef.current) { clearTimeout(iconTimerRef.current); iconTimerRef.current = null }
    setShowIcon(false)
  }

  // Floating icon: a delayed affordance, not immediate — only shows up if a fresh
  // selection is still there ICON_DELAY_MS later (e.g. the user paused to read what
  // they selected), never on every fleeting drag.
  useEffect(() => {
    if (iconTimerRef.current) { clearTimeout(iconTimerRef.current); iconTimerRef.current = null }
    if (!selection) { setShowIcon(false); return }
    const { endRect } = selection
    iconTimerRef.current = setTimeout(() => {
      iconTimerRef.current = null
      setIconPos({ top: endRect.top, left: endRect.right })
      setShowIcon(true)
    }, ICON_DELAY_MS)
    return () => { if (iconTimerRef.current) { clearTimeout(iconTimerRef.current); iconTimerRef.current = null } }
  }, [selection])

  // Selection went away (cleared, or moved outside the container) -- nothing left to
  // share, so both entry points close immediately rather than acting on stale data.
  useEffect(() => {
    if (!selection) { setShowIcon(false); setMenuPos(null) }
  }, [selection])

  // Right-click opens "Compartir cita" only when there's something selected to quote --
  // otherwise the native context menu is left alone.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleContextMenu = (e: MouseEvent) => {
      if (!selection) return
      e.preventDefault()
      dismissIcon()
      setMenuPos({ top: e.clientY, left: e.clientX })
    }
    container.addEventListener('contextmenu', handleContextMenu)
    return () => container.removeEventListener('contextmenu', handleContextMenu)
  }, [containerRef, selection])

  // The click that ends a drag-selection would otherwise also land on whichever
  // sentence span is under the cursor and trigger its own onClick (seek/play) --
  // swallowed here in the capture phase, before it ever reaches that span, so
  // selecting text to quote never has a side effect on playback.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleClickCapture = (e: MouseEvent) => {
      if (window.getSelection()?.isCollapsed === false) e.stopPropagation()
    }
    container.addEventListener('click', handleClickCapture, true)
    return () => container.removeEventListener('click', handleClickCapture, true)
  }, [containerRef])

  // Close the context menu on an outside click or Escape.
  useEffect(() => {
    if (!menuPos) return
    const handleMouseDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuPos(null)
    }
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuPos(null) }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuPos])

  const share = () => {
    if (!selection) return
    onShareQuote(selection)
    setMenuPos(null)
    dismissIcon()
  }

  return (
    <>
      {showIcon && selection && (
        // Reuses TTSPopover's own floating hover-icon chrome (magic-text-editor__tts-
        // hover-icon + __btn) instead of custom styling, so this looks and behaves
        // (hover state included) exactly like that other "selection -> floating icon"
        // affordance elsewhere in the same editor.
        <div className="magic-text-editor__tts-hover-icon" style={{ top: iconPos.top, left: iconPos.left }}>
          <button
            type="button"
            data-testid="share-quote-icon"
            className="magic-text-editor__btn"
            title={t.quote.shareQuote}
            aria-label={t.quote.shareQuote}
            onClick={share}
          >
            <QuoteIcon />
          </button>
        </div>
      )}
      {menuPos && selection && (
        <div
          ref={menuRef}
          data-testid="share-quote-menu"
          className={s.menu}
          style={{ top: menuPos.top, left: menuPos.left }}
          role="menu"
          onKeyDown={(e) => e.key === 'Escape' && setMenuPos(null)}
        >
          <button
            type="button"
            data-testid="share-quote-menu-item"
            className={s.menuItem}
            role="menuitem"
            onClick={share}
          >
            <QuoteIcon />
            {t.quote.shareQuote}
          </button>
        </div>
      )}
    </>
  )
}

/**
 * Read-only-reader companion to TTSSpellReader (TCORE-98): selecting text within
 * `containerRef` offers two ways to share it as a quote -- a floating icon that appears
 * shortly after the selection settles, and right-click → "Compartir cita". Deliberately
 * doesn't touch TTSSpellReader; it only reads the `data-sentence-index` attribute that
 * component already renders (see useSpellQuoteSelection) and listens on the container from
 * the outside.
 */
export function ShareQuoteMenu({ locale, translations, ...rest }: Props) {
  const t = resolveTranslations(locale, translations)
  return (
    <TranslationsContext.Provider value={t}>
      <ShareQuoteMenuInner {...rest} />
    </TranslationsContext.Provider>
  )
}

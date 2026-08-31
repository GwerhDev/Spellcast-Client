import { useEffect, useState, type RefObject } from 'react'

const SENTENCE_ATTR = 'data-sentence-index'

export interface SpellQuoteSelection {
  text: string
  fromSentenceIndex: number
  toSentenceIndex: number
  /** The selection's bounding rect, captured at the moment it was resolved -- used to
   * position the floating share icon. Captured once here rather than re-read from
   * `window.getSelection()` later (e.g. inside a delay timer), which can no longer
   * reflect this selection by the time a delayed callback runs. */
  rect: { top: number; left: number; right: number; bottom: number }
}

/** Walks up from `node` to the nearest ancestor (or self) carrying TTSSpellReader's
 * `data-sentence-index` attribute. Returns null if the node isn't inside any sentence. */
const closestSentenceIndex = (node: Node | null): number | null => {
  let el: Element | null = node instanceof Element ? node : node?.parentElement ?? null
  while (el) {
    if (el.hasAttribute(SENTENCE_ATTR)) {
      const idx = Number(el.getAttribute(SENTENCE_ATTR))
      return Number.isNaN(idx) ? null : idx
    }
    el = el.parentElement
  }
  return null
}

/**
 * Tracks the browser's current text selection, resolved to a quotable range of
 * TTSSpellReader sentences (TCORE-98) — null whenever there's nothing quotable: no
 * selection, a collapsed one, one outside `containerRef`, or one that doesn't land on any
 * `data-sentence-index` span (e.g. inside an image's alt/title, not the rendered text).
 *
 * Deliberately doesn't touch TTSSpellReader itself: it just reads the `data-sentence-index`
 * attribute that component already puts on every sentence span.
 */
export function useSpellQuoteSelection(containerRef: RefObject<HTMLElement | null>): SpellQuoteSelection | null {
  const [selection, setSelection] = useState<SpellQuoteSelection | null>(null)

  useEffect(() => {
    const resolve = () => {
      const container = containerRef.current
      const sel = window.getSelection()
      if (!container || !sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelection(null)
        return
      }

      const range = sel.getRangeAt(0)
      if (!container.contains(range.commonAncestorContainer)) {
        setSelection(null)
        return
      }

      const fromIdx = closestSentenceIndex(range.startContainer)
      const toIdx = closestSentenceIndex(range.endContainer)
      if (fromIdx === null || toIdx === null) {
        setSelection(null)
        return
      }

      const text = sel.toString().trim()
      if (!text) {
        setSelection(null)
        return
      }

      const domRect = range.getBoundingClientRect()
      setSelection({
        text,
        fromSentenceIndex: Math.min(fromIdx, toIdx),
        toSentenceIndex: Math.max(fromIdx, toIdx),
        rect: { top: domRect.top, left: domRect.left, right: domRect.right, bottom: domRect.bottom },
      })
    }

    document.addEventListener('selectionchange', resolve)
    return () => document.removeEventListener('selectionchange', resolve)
  }, [containerRef])

  return selection
}

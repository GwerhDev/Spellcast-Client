import { useState, useRef, useCallback, useEffect } from 'react'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.0
const ZOOM_STEP = 0.1

interface FitOptions {
  // The sheet's own width (px, unscaled) and the element whose content box it sits in: when
  // the sheet is wider than that space (a page on a phone), it starts scaled down to fit it,
  // instead of drawn at full size with most of it off the screen.
  contentWidth?: number
  fitRef?: React.RefObject<HTMLElement | null>
}

// The zoom of a page's sheet: the caster's own (the buttons, ctrl+wheel), on top of the fit
// to the screen's width when the sheet wouldn't fit at 100%. Reset goes back to that fit.
export function useZoom(scrollContainerRef: React.RefObject<HTMLDivElement | null>, { contentWidth, fitRef }: FitOptions = {}) {
  const [userZoom, setUserZoom] = useState(1.0)
  const [fit, setFit] = useState(1)
  const [showIndicator, setShowIndicator] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // How much room the sheet has: the fit element's content box, followed as it resizes.
  useEffect(() => {
    const el = fitRef?.current
    if (!el || !contentWidth) { setFit(1); return }
    const update = () => {
      const cs = getComputedStyle(el)
      const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      setFit(room > 0 ? Math.min(1, room / contentWidth) : 1)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fitRef, contentWidth])

  const showFor1s = useCallback(() => {
    setShowIndicator(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShowIndicator(false), 1000)
  }, [])

  // The caster's zoom only as far as the result stays within [MIN_ZOOM, MAX_ZOOM]: past it,
  // further presses would have to be undone before the next one did anything.
  const fitValue = useRef(fit)
  fitValue.current = fit
  const adjustZoom = useCallback((delta: number) => {
    const f = fitValue.current
    setUserZoom(z => Math.min(MAX_ZOOM / f, Math.max(MIN_ZOOM / f, Math.round((z + delta) * 100) / 100)))
    showFor1s()
  }, [showFor1s])

  const resetZoom = useCallback(() => {
    setUserZoom(1.0)
    showFor1s()
  }, [showFor1s])

  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      const el = scrollContainerRef.current
      if (!el || !el.contains(e.target as Node)) return
      e.preventDefault()
      adjustZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)
    }
    document.addEventListener('wheel', handler, { passive: false })
    return () => document.removeEventListener('wheel', handler)
  }, [adjustZoom, scrollContainerRef])

  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(fit * userZoom * 100) / 100))
  return { zoom, showIndicator, adjustZoom, resetZoom, ZOOM_STEP }
}

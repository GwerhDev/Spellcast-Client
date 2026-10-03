import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'

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
  // The fit element's width for the sheet (its content box), 0 until measured.
  const [room, setRoom] = useState(0)
  const [showIndicator, setShowIndicator] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The fit element itself, re-read after every render: a ref changing doesn't re-run an
  // effect, and the element isn't always there on the first one -- the reader shows a
  // spinner until the spell loads, and swaps the element when "Fit to width" toggles. State
  // only changes when the element does, so this costs nothing on an ordinary render.
  const [fitEl, setFitEl] = useState<HTMLElement | null>(null)
  // No dependency list on purpose (see above): it has to run after every render to notice
  // the ref's element changing, and it only sets state when it did, so it can't loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = fitRef?.current ?? null
    if (el !== fitEl) setFitEl(el)
  })

  // How much room the sheet has: the fit element's content box, followed as it resizes.
  useEffect(() => {
    const el = fitEl
    if (!el || !contentWidth) { setFit(1); setRoom(0); return }
    const update = () => {
      const cs = getComputedStyle(el)
      const room = el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)
      setRoom(Math.max(0, room))
      setFit(room > 0 ? Math.min(1, room / contentWidth) : 1)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fitEl, contentWidth])

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
  return { zoom, room, showIndicator, adjustZoom, resetZoom, ZOOM_STEP }
}

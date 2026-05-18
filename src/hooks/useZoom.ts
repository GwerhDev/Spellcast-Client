import { useState, useRef, useCallback, useEffect } from 'react'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.0
const ZOOM_STEP = 0.1

export function useZoom(scrollContainerRef: React.RefObject<HTMLDivElement | null>) {
  const [zoom, setZoom] = useState(1.0)
  const [showIndicator, setShowIndicator] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showFor1s = useCallback(() => {
    setShowIndicator(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShowIndicator(false), 1000)
  }, [])

  const adjustZoom = useCallback((delta: number) => {
    setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + delta) * 10) / 10)))
    showFor1s()
  }, [showFor1s])

  const resetZoom = useCallback(() => {
    setZoom(1.0)
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

  return { zoom, showIndicator, adjustZoom, resetZoom, ZOOM_STEP }
}

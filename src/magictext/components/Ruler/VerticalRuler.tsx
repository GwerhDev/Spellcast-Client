import React, { useRef, useCallback, useState, useEffect } from 'react'
import s from './Ruler.module.css'

const RULER_W = 20

interface Props {
  paperHeight: number
  marginTop: number
  marginBottom: number
  onMarginTopChange: (v: number) => void
  onMarginBottomChange: (v: number) => void
  zoom?: number
  paperOffsetTop?: number
}

export const VerticalRuler: React.FC<Props> = ({
  paperHeight, marginTop, marginBottom, onMarginTopChange, onMarginBottomChange,
  zoom = 1, paperOffsetTop = 32,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null)
  const [rulerHeight, setRulerHeight] = useState(paperHeight)

  useEffect(() => {
    const el = rulerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setRulerHeight(Math.round(entry.contentRect.height)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Screen pixel where paper coordinate 0 (paper top edge) appears on the ruler
  const offset = paperOffsetTop

  const startDrag = useCallback((onMove: (paperY: number) => void) => (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = rulerRef.current!.getBoundingClientRect()
    const move = (me: MouseEvent) => onMove(Math.round((me.clientY - rect.top - paperOffsetTop) / zoom))
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [paperOffsetTop, zoom])

  const ticks = []
  const startPy = Math.floor(-offset / zoom / 10) * 10
  const endPy = Math.ceil((rulerHeight - offset) / zoom / 10) * 10
  for (let y = startPy; y <= endPy; y += 10) {
    const sy = offset + y * zoom
    if (sy < 0 || sy > rulerHeight) continue
    const w = y % 100 === 0 ? 10 : y % 50 === 0 ? 7 : 4
    ticks.push(<line key={y} x1={RULER_W} y1={sy} x2={RULER_W - w} y2={sy} stroke="currentColor" strokeWidth="0.5" />)
    if (y % 100 === 0)
      ticks.push(
        <text key={`l${y}`} x={RULER_W - 12} y={sy - 2} fontSize="7" fill="currentColor"
          transform={`rotate(-90,${RULER_W - 12},${sy - 2})`}>{y}</text>
      )
  }

  return (
    <div className={s.vRuler} style={{ height: '100%' }} ref={rulerRef}>
      <svg width={RULER_W} height={rulerHeight} className={s.ticks}>{ticks}</svg>
      <div
        className={`${s.handle} ${s.vHandle}`}
        style={{ top: offset + marginTop * zoom }}
        title="Top margin"
        onMouseDown={startDrag(y => onMarginTopChange(Math.max(0, Math.min(y, paperHeight - marginBottom))))}
      />
      <div
        className={`${s.handle} ${s.vHandle}`}
        style={{ top: offset + (paperHeight - marginBottom) * zoom }}
        title="Bottom margin"
        onMouseDown={startDrag(y => onMarginBottomChange(Math.max(0, Math.min(paperHeight - y, paperHeight - marginTop))))}
      />
      <div className={s.vShade} style={{ top: offset, height: marginTop * zoom }} />
      <div className={s.vShade} style={{ top: offset + (paperHeight - marginBottom) * zoom, height: marginBottom * zoom }} />
    </div>
  )
}

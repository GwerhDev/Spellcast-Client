import React, { useRef, useCallback, useState, useEffect } from 'react'
import s from './Ruler.module.css'

const RULER_H = 20

interface Props {
  paperWidth: number
  marginLeft: number
  marginRight: number
  onMarginLeftChange: (v: number) => void
  onMarginRightChange: (v: number) => void
  zoom?: number
}

export const HorizontalRuler: React.FC<Props> = ({
  paperWidth, marginLeft, marginRight, onMarginLeftChange, onMarginRightChange, zoom = 1,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null)
  const [rulerWidth, setRulerWidth] = useState(paperWidth)

  useEffect(() => {
    const el = rulerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setRulerWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Screen pixel where paper coordinate 0 (paper left edge) appears on the ruler
  const offset = (rulerWidth - paperWidth * zoom) / 2

  const startDrag = useCallback((onMove: (paperX: number) => void) => (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = rulerRef.current!.getBoundingClientRect()
    const dragOffset = (rect.width - paperWidth * zoom) / 2
    const move = (me: MouseEvent) => onMove(Math.round((me.clientX - rect.left - dragOffset) / zoom))
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [paperWidth, zoom])

  const ticks = []
  const startPx = Math.floor(-offset / zoom / 10) * 10
  const endPx = Math.ceil((rulerWidth - offset) / zoom / 10) * 10
  for (let x = startPx; x <= endPx; x += 10) {
    const sx = offset + x * zoom
    if (sx < 0 || sx > rulerWidth) continue
    const h = x % 100 === 0 ? 10 : x % 50 === 0 ? 7 : 4
    ticks.push(<line key={x} x1={sx} y1={RULER_H} x2={sx} y2={RULER_H - h} stroke="currentColor" strokeWidth="0.5" />)
    if (x % 100 === 0)
      ticks.push(<text key={`l${x}`} x={sx + 2} y={RULER_H - 11} fontSize="7" fill="currentColor">{x}</text>)
  }

  return (
    <div className={s.hRuler} ref={rulerRef}>
      <svg width={rulerWidth} height={RULER_H} className={s.ticks}>{ticks}</svg>
      <div
        className={`${s.handle} ${s.hHandle}`}
        style={{ left: offset + marginLeft * zoom }}
        title="Left margin"
        onMouseDown={startDrag(x => onMarginLeftChange(Math.max(0, Math.min(x, paperWidth - marginRight))))}
      />
      <div
        className={`${s.handle} ${s.hHandle}`}
        style={{ left: offset + (paperWidth - marginRight) * zoom }}
        title="Right margin"
        onMouseDown={startDrag(x => onMarginRightChange(Math.max(0, Math.min(paperWidth - x, paperWidth - marginLeft))))}
      />
      <div className={s.hShade} style={{ left: offset, width: marginLeft * zoom }} />
      <div className={s.hShade} style={{ left: offset + (paperWidth - marginRight) * zoom, width: marginRight * zoom }} />
    </div>
  )
}

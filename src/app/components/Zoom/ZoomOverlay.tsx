import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import s from './ZoomOverlay.module.css'

interface Props {
  zoom: number
  showIndicator: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export const ZoomOverlay: React.FC<Props> = ({ zoom, showIndicator, onZoomIn, onZoomOut, onReset }) => (
  <>
    <div className={s.controls}>
      <button className={s.btn} onClick={onZoomOut} title="Zoom out">−</button>
      <button className={s.btn} onClick={onReset} title="Reset zoom (100%)">
        <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: '0.75rem' }} />
      </button>
      <button className={s.btn} onClick={onZoomIn} title="Zoom in">+</button>
    </div>
    <div className={`${s.indicator}${showIndicator ? ` ${s.indicatorVisible}` : ''}`}>
      {Math.round(zoom * 100)}%
    </div>
  </>
)

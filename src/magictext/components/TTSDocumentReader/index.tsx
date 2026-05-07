import s from './index.module.css'
import type { CSSProperties, JSX } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { TTSSegment } from '../../types'
import { useTTSSegments } from '../../hooks/useTTSSegments'

interface Props {
  content: JSONContent | null | undefined
  currentSentenceIndex: number
  onSentenceClick?: (index: number) => void
}

/**
 * Read-only document renderer that:
 * - Highlights the current sentence (via currentSentenceIndex)
 * - Shows TTS mark colors on voice-assigned sentences
 * - Fires onSentenceClick when the user clicks a sentence
 *
 * Does NOT control playback. The consuming app (Spellcast) drives currentSentenceIndex
 * from its global player state, and handles the actual audio via its own players.
 */
export function TTSDocumentReader({ content, currentSentenceIndex, onSentenceClick }: Props) {
  const segments = useTTSSegments(content)

  if (!segments.length) return null

  // Group segments by block
  const blocks = new Map<number, TTSSegment[]>()
  for (const seg of segments) {
    if (!blocks.has(seg.blockIndex)) blocks.set(seg.blockIndex, [])
    blocks.get(seg.blockIndex)!.push(seg)
  }

  const renderBlock = (blockSegs: TTSSegment[]): JSX.Element => {
    const first = blockSegs[0]
    const Tag = (first.blockType === 'heading' ? `h${first.headingLevel ?? 1}` : 'p') as keyof JSX.IntrinsicElements

    const spans = blockSegs.map(seg => {
      const isHighlighted = seg.index === currentSentenceIndex
      const hasColor = !!seg.ttsAttrs?.color
      const style: CSSProperties = hasColor ? { '--tts-sentence-color': seg.ttsAttrs!.color } as CSSProperties : {}

      let className: string
      if (seg.ttsAttrs) {
        className = isHighlighted ? s.ttsMarkedHighlight : s.ttsMarked
      } else {
        className = isHighlighted ? s.highlight : s.sentence
      }

      return (
        <span
          key={seg.index}
          className={className}
          style={style}
          onClick={() => onSentenceClick?.(seg.index)}
          data-sentence-index={seg.index}
        >
          {seg.text}{' '}
        </span>
      )
    })

    return <Tag key={first.blockIndex} className={s.block}>{spans}</Tag>
  }

  return (
    <>
      {Array.from(blocks.entries()).map(([, segs]) => renderBlock(segs))}
    </>
  )
}

import s from './index.module.css'
import { Fragment, useMemo } from 'react'
import type { CSSProperties, JSX, ReactNode } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { DocumentBlock, TextRun } from '../../types'
import { extractDocumentBlocks } from '../../utils/extractTTSSegments'

interface Props {
  content: JSONContent | null | undefined
  currentSentenceIndex: number
  onSentenceClick?: (index: number) => void
}

/** Render a sentence's inline runs, reproducing bold/italic from the editor. */
function renderRuns(runs: TextRun[] | undefined, fallback: string): ReactNode {
  if (!runs || runs.length === 0) return fallback
  return runs.map((r, i) => {
    let el: ReactNode = r.text
    if (r.bold && r.italic) el = <strong><em>{r.text}</em></strong>
    else if (r.bold) el = <strong>{r.text}</strong>
    else if (r.italic) el = <em>{r.text}</em>
    return <Fragment key={i}>{el}</Fragment>
  })
}

/**
 * Read-only document renderer that reproduces the editor's output (paragraphs,
 * headings, inline bold/italic, images, horizontal rules, block alignment) while:
 * - Highlighting the current sentence (via currentSentenceIndex)
 * - Showing TTS mark colors on voice-assigned sentences
 * - Firing onSentenceClick when the user clicks a sentence
 *
 * Does NOT control playback. The consuming app drives currentSentenceIndex from
 * its global player state and handles audio via its own players.
 */
export function TTSDocumentReader({ content, currentSentenceIndex, onSentenceClick }: Props) {
  const blocks = useMemo(() => extractDocumentBlocks(content), [content])
  if (!blocks.length) return null

  const renderText = (block: Extract<DocumentBlock, { kind: 'text' }>, key: string): JSX.Element => {
    const Tag = (block.blockType === 'heading' ? `h${block.headingLevel ?? 1}` : 'p') as keyof JSX.IntrinsicElements
    const style: CSSProperties = {
      ...(block.textAlign ? { textAlign: block.textAlign as CSSProperties['textAlign'] } : {}),
      ...(block.marginLeft ? { marginLeft: `${block.marginLeft}px` } : {}),
    }

    // Empty block — render a spacer line so vertical rhythm matches the editor.
    if (!block.segments.length) {
      return <Tag key={key} className={s.block} style={style}><br /></Tag>
    }

    const spans = block.segments.map(seg => {
      const isHighlighted = seg.index === currentSentenceIndex
      const hasColor = !!seg.ttsAttrs?.color
      const segStyle: CSSProperties = hasColor
        ? ({ '--tts-sentence-color': seg.ttsAttrs!.color } as CSSProperties)
        : {}

      const className = seg.ttsAttrs
        ? (isHighlighted ? s.ttsMarkedHighlight : s.ttsMarked)
        : (isHighlighted ? s.highlight : s.sentence)

      return (
        <span
          key={seg.index}
          className={className}
          style={segStyle}
          onClick={() => onSentenceClick?.(seg.index)}
          data-sentence-index={seg.index}
        >
          {renderRuns(seg.runs, seg.text)}{' '}
        </span>
      )
    })

    return <Tag key={key} className={s.block} style={style}>{spans}</Tag>
  }

  return (
    <>
      {blocks.map((block, i) => {
        if (block.kind === 'image') {
          return (
            <img
              key={`img-${i}`}
              className={s.image}
              src={block.src}
              alt={block.alt ?? ''}
              title={block.title ?? undefined}
            />
          )
        }
        if (block.kind === 'rule') return <hr key={`hr-${i}`} className={s.rule} />
        return renderText(block, `b-${i}`)
      })}
    </>
  )
}

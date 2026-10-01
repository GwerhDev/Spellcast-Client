import s from './index.module.css'
import { Fragment, useMemo } from 'react'
import type { CSSProperties, JSX, ReactNode } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { DocumentBlock, TextRun } from '../../types'
import { extractDocumentBlocks } from '../../utils/extractTTSSegments'
import { pdfLayoutStyle } from '../../extensions/PdfPositionExtension'
import { boxStyle } from '../../extensions/BoxExtension'

interface Props {
  content: JSONContent | null | undefined
  currentSentenceIndex: number
  onSentenceClick?: (index: number) => void
}

/** Render a sentence's inline runs, reproducing bold/italic and each text's size. */
function renderRuns(runs: TextRun[] | undefined, fallback: string): ReactNode {
  if (!runs || runs.length === 0) return fallback
  return runs.map((r, i) => {
    if (r.lineBreak) return <br key={i} />
    let el: ReactNode = r.text
    if (r.bold && r.italic) el = <strong><em>{r.text}</em></strong>
    else if (r.bold) el = <strong>{r.text}</strong>
    else if (r.italic) el = <em>{r.text}</em>
    if (r.fontSize) el = <span style={{ fontSize: r.fontSize }}>{el}</span>
    return <Fragment key={i}>{el}</Fragment>
  })
}

/** A block's PDF layout (its space above it: see PdfPositionExtension), as React styles. */
const layout = (attrs?: Record<string, unknown>): CSSProperties => (attrs ? toReactStyle(pdfLayoutStyle(attrs)) : {})

/** CSS property names to React's. */
const toReactStyle = (css: Record<string, string>): CSSProperties => {
  return Object.fromEntries(
    Object.entries(css).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v]),
  ) as CSSProperties
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
export function TTSSpellReader({ content, currentSentenceIndex, onSentenceClick }: Props) {
  const blocks = useMemo(() => extractDocumentBlocks(content), [content])
  if (!blocks.length) return null

  const renderText = (block: Extract<DocumentBlock, { kind: 'text' }>, key: string): JSX.Element => {
    const Tag = (block.blockType === 'heading' ? `h${block.headingLevel ?? 1}` : 'p') as
      | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
    const style: CSSProperties = {
      ...(block.textAlign ? { textAlign: block.textAlign as CSSProperties['textAlign'] } : {}),
      ...(block.marginLeft ? { marginLeft: `${block.marginLeft}px` } : {}),
      ...(block.lineHeight ? { lineHeight: block.lineHeight } : {}),
      ...layout(block.layout),
    }

    // Empty block — render a spacer line so vertical rhythm matches the editor.
    if (!block.segments.length) {
      return <Tag key={key} className={s.block} style={style}><br /></Tag>
    }

    const nodes: ReactNode[] = []
    for (const seg of block.segments) {
      const isHighlighted = seg.index === currentSentenceIndex
      const hasColor = !!seg.ttsAttrs?.color
      const segStyle: CSSProperties = hasColor
        ? ({ '--tts-sentence-color': seg.ttsAttrs!.color } as CSSProperties)
        : {}

      const className = seg.ttsAttrs
        ? (isHighlighted ? s.ttsMarkedHighlight : s.ttsMarked)
        : (isHighlighted ? s.highlight : s.sentence)

      nodes.push(
        <span
          key={seg.index}
          className={className}
          style={segStyle}
          onClick={() => onSentenceClick?.(seg.index)}
          data-sentence-index={seg.index}
        >
          {renderRuns(seg.runs, seg.text)}{seg.spaceAfter === false ? '' : ' '}
        </span>
      )
      if (seg.breakAfter) nodes.push(<br key={`br-${seg.index}`} />)
    }

    return <Tag key={key} className={s.block} style={style}>{nodes}</Tag>
  }

  const renderBlocks = (list: DocumentBlock[], prefix: string): ReactNode[] => list.map((block, i) => {
    const key = `${prefix}${i}`
    if (block.kind === 'image') {
      return (
        <img
          key={`img-${key}`}
          className={s.image}
          src={block.src}
          alt={block.alt ?? ''}
          title={block.title ?? undefined}
          style={{
            ...(block.width ? { width: `${block.width}px` } : {}),
            ...(block.marginLeft ? { marginLeft: `${block.marginLeft}px` } : {}),
            ...layout(block.layout),
          }}
        />
      )
    }
    if (block.kind === 'rule') return <hr key={`hr-${key}`} className={s.rule} style={layout(block.layout)} />
    if (block.kind === 'box') {
      // A colored box, as on the page (the editor's is BoxExtension's).
      return (
        <div key={`box-${key}`} style={{ ...toReactStyle(boxStyle(block.box)), ...layout(block.layout) }}>
          {renderBlocks(block.blocks, `${key}-`)}
        </div>
      )
    }
    if (block.kind === 'columns') {
      // Side by side, as on the page: the first column at its width, the last one taking
      // what's left (the editor's columns, see ColumnsExtension).
      return (
        <div key={`cols-${key}`} className={s.columns} style={layout(block.layout)}>
          {block.columns.map((column, c) => (
            <div
              key={c}
              className={s.column}
              style={column.width ? { flex: `0 0 ${column.width}px`, width: `${column.width}px` } : { flex: '1 1 0' }}
            >
              {renderBlocks(column.blocks, `${key}-${c}-`)}
            </div>
          ))}
        </div>
      )
    }
    return renderText(block, `b-${key}`)
  })

  return <>{renderBlocks(blocks, '')}</>
}

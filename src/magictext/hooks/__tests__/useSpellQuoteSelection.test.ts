import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createRef } from 'react'
import { useSpellQuoteSelection } from '../useSpellQuoteSelection'

let container: HTMLDivElement

const buildReader = () => {
  container = document.createElement('div')
  container.innerHTML = `
    <p>
      <span data-sentence-index="0">First sentence. </span><span data-sentence-index="1">Second sentence. </span><span data-sentence-index="2">Third sentence. </span>
    </p>
  `
  document.body.appendChild(container)
  return container
}

const sentenceTextNode = (index: number): Text =>
  container.querySelector(`[data-sentence-index="${index}"]`)!.firstChild as Text

/** Fakes window.getSelection() with a real jsdom Range built from the given start/end
 * points, and fires the same `selectionchange` event the hook listens for. */
const setSelection = (opts: {
  isCollapsed: boolean
  startNode?: Node
  startOffset?: number
  endNode?: Node
  endOffset?: number
  text?: string
}) => {
  const range = document.createRange()
  if (opts.startNode) range.setStart(opts.startNode, opts.startOffset ?? 0)
  if (opts.endNode) range.setEnd(opts.endNode, opts.endOffset ?? 0)

  const fakeSelection = {
    isCollapsed: opts.isCollapsed,
    rangeCount: opts.startNode ? 1 : 0,
    getRangeAt: () => range,
    toString: () => opts.text ?? '',
  } as unknown as Selection

  vi.spyOn(window, 'getSelection').mockReturnValue(fakeSelection)
  act(() => { document.dispatchEvent(new Event('selectionchange')) })
}

afterEach(() => {
  vi.restoreAllMocks()
  container?.remove()
})

describe('useSpellQuoteSelection', () => {
  it('starts as null with no selection', () => {
    buildReader()
    const ref = createRef<HTMLElement | null>()
    ;(ref as { current: HTMLElement }).current = container
    const { result } = renderHook(() => useSpellQuoteSelection(ref))
    expect(result.current).toBeNull()
  })

  it('is null while the selection is collapsed (just a cursor, nothing selected)', () => {
    buildReader()
    const ref = createRef<HTMLElement | null>()
    ;(ref as { current: HTMLElement }).current = container
    const { result } = renderHook(() => useSpellQuoteSelection(ref))

    setSelection({ isCollapsed: true, startNode: sentenceTextNode(0), startOffset: 0, endNode: sentenceTextNode(0), endOffset: 0 })

    expect(result.current).toBeNull()
  })

  it('resolves a selection within a single sentence to that sentence\'s index on both ends', () => {
    buildReader()
    const ref = createRef<HTMLElement | null>()
    ;(ref as { current: HTMLElement }).current = container
    const { result } = renderHook(() => useSpellQuoteSelection(ref))

    setSelection({
      isCollapsed: false,
      startNode: sentenceTextNode(1),
      startOffset: 0,
      endNode: sentenceTextNode(1),
      endOffset: 6,
      text: 'Second',
    })

    expect(result.current).toEqual({
      text: 'Second',
      fromSentenceIndex: 1,
      toSentenceIndex: 1,
      endRect: { top: 0, left: 0, right: 0, bottom: 0 },
    })
  })

  it('resolves a selection spanning multiple sentences to their min/max index', () => {
    buildReader()
    const ref = createRef<HTMLElement | null>()
    ;(ref as { current: HTMLElement }).current = container
    const { result } = renderHook(() => useSpellQuoteSelection(ref))

    setSelection({
      isCollapsed: false,
      startNode: sentenceTextNode(0),
      startOffset: 0,
      endNode: sentenceTextNode(2),
      endOffset: 5,
      text: 'First sentence. Second sentence. Third',
    })

    expect(result.current).toEqual({
      text: 'First sentence. Second sentence. Third',
      fromSentenceIndex: 0,
      toSentenceIndex: 2,
      endRect: { top: 0, left: 0, right: 0, bottom: 0 },
    })
  })

  it('anchors endRect on the LAST line of a selection that wraps multiple lines, not the aggregate bounding box', () => {
    buildReader()
    const ref = createRef<HTMLElement | null>()
    ;(ref as { current: HTMLElement }).current = container

    const range = document.createRange()
    range.setStart(sentenceTextNode(0), 0)
    range.setEnd(sentenceTextNode(2), 5)
    // getBoundingClientRect() would merge both lines into one aggregate box (e.g.
    // top: 0, bottom: 40) -- getClientRects() instead gives one rect per line, and only
    // the LAST one (where the selection actually ends) should be used.
    range.getClientRects = () => ([
      { top: 0, left: 10, right: 200, bottom: 20 },
      { top: 20, left: 10, right: 90, bottom: 40 },
    ] as unknown as DOMRectList)
    const fakeSelection = {
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => range,
      toString: () => 'First sentence. Second sentence. Third',
    } as unknown as Selection
    vi.spyOn(window, 'getSelection').mockReturnValue(fakeSelection)

    const { result } = renderHook(() => useSpellQuoteSelection(ref))
    act(() => { document.dispatchEvent(new Event('selectionchange')) })

    expect(result.current?.endRect).toEqual({ top: 20, left: 10, right: 90, bottom: 40 })
  })

  it('is null when the selection lands outside the given containerRef', () => {
    buildReader()
    const outside = document.createElement('div')
    outside.innerHTML = `<span data-sentence-index="0">Elsewhere</span>`
    document.body.appendChild(outside)
    const outsideText = outside.firstChild!.firstChild as Text

    const ref = createRef<HTMLElement | null>()
    ;(ref as { current: HTMLElement }).current = container
    const { result } = renderHook(() => useSpellQuoteSelection(ref))

    setSelection({ isCollapsed: false, startNode: outsideText, startOffset: 0, endNode: outsideText, endOffset: 5, text: 'Elsewhere' })

    expect(result.current).toBeNull()
    outside.remove()
  })
})

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createRef } from 'react'
import { ShareQuoteMenu } from '../index'

let container: HTMLDivElement

const Harness = ({ onShareQuote }: { onShareQuote: (q: unknown) => void }) => {
  const ref = createRef<HTMLDivElement>()
  return (
    <div>
      <div
        ref={(el) => {
          ;(ref as { current: HTMLDivElement | null }).current = el
          container = el as HTMLDivElement
        }}
        data-testid="reader-container"
      >
        <span data-sentence-index="0">First sentence. </span>
        <span data-sentence-index="1">Second sentence. </span>
      </div>
      <ShareQuoteMenu containerRef={ref} onShareQuote={onShareQuote} />
    </div>
  )
}

const sentenceTextNode = (index: number): Text =>
  container.querySelector(`[data-sentence-index="${index}"]`)!.firstChild as Text

const setSelection = (opts: { isCollapsed: boolean; startNode?: Node; startOffset?: number; endNode?: Node; endOffset?: number; text?: string }) => {
  const range = document.createRange()
  if (opts.startNode) range.setStart(opts.startNode, opts.startOffset ?? 0)
  if (opts.endNode) range.setEnd(opts.endNode, opts.endOffset ?? 0)
  // jsdom never lays anything out, so a real Range's getBoundingClientRect() is always
  // all-zero. Fake a plausible rect so tests can exercise the icon-positioning path
  // (useSpellQuoteSelection captures this once, at selection time) the same way a real
  // selection would.
  range.getBoundingClientRect = () => ({
    width: 40, height: 16, top: 100, left: 50, right: 90, bottom: 116, x: 50, y: 100, toJSON: () => {},
  })
  const fakeSelection = {
    isCollapsed: opts.isCollapsed,
    rangeCount: opts.startNode ? 1 : 0,
    getRangeAt: () => range,
    toString: () => opts.text ?? '',
  } as unknown as Selection
  vi.spyOn(window, 'getSelection').mockReturnValue(fakeSelection)
  act(() => { document.dispatchEvent(new Event('selectionchange')) })
}

const selectSecondSentence = () =>
  setSelection({
    isCollapsed: false,
    startNode: sentenceTextNode(1),
    startOffset: 0,
    endNode: sentenceTextNode(1),
    endOffset: 6,
    text: 'Second',
  })

const clearSelection = () => setSelection({ isCollapsed: true })

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('ShareQuoteMenu', () => {
  it('does not intercept right-click when there is no active selection', () => {
    const onShareQuote = vi.fn()
    render(<Harness onShareQuote={onShareQuote} />)

    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    const preventDefault = vi.spyOn(event, 'preventDefault')
    act(() => { screen.getByTestId('reader-container').dispatchEvent(event) })

    expect(preventDefault).not.toHaveBeenCalled()
    expect(screen.queryByTestId('share-quote-menu')).not.toBeInTheDocument()
  })

  it('right-click with an active selection opens the "Compartir cita" menu and prevents the native one', () => {
    const onShareQuote = vi.fn()
    render(<Harness onShareQuote={onShareQuote} />)
    selectSecondSentence()

    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 20 })
    const preventDefault = vi.spyOn(event, 'preventDefault')
    act(() => { screen.getByTestId('reader-container').dispatchEvent(event) })

    expect(preventDefault).toHaveBeenCalled()
    expect(screen.getByTestId('share-quote-menu-item')).toBeInTheDocument()
  })

  it('clicking the menu item shares the selection and closes the menu', () => {
    const onShareQuote = vi.fn()
    render(<Harness onShareQuote={onShareQuote} />)
    selectSecondSentence()
    act(() => {
      screen.getByTestId('reader-container').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    })

    fireEvent.click(screen.getByTestId('share-quote-menu-item'))

    expect(onShareQuote).toHaveBeenCalledWith({ text: 'Second', fromSentenceIndex: 1, toSentenceIndex: 1, rect: { top: 100, left: 50, right: 90, bottom: 116 } })
    expect(screen.queryByTestId('share-quote-menu')).not.toBeInTheDocument()
  })

  it('closes the menu on an outside click', () => {
    const onShareQuote = vi.fn()
    render(<Harness onShareQuote={onShareQuote} />)
    selectSecondSentence()
    act(() => {
      screen.getByTestId('reader-container').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    })
    expect(screen.getByTestId('share-quote-menu')).toBeInTheDocument()

    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })) })

    expect(screen.queryByTestId('share-quote-menu')).not.toBeInTheDocument()
  })

  it('does not show the floating icon before the delay elapses', () => {
    const onShareQuote = vi.fn()
    render(<Harness onShareQuote={onShareQuote} />)
    selectSecondSentence()

    act(() => { vi.advanceTimersByTime(200) })

    expect(screen.queryByTestId('share-quote-icon')).not.toBeInTheDocument()
  })

  it('shows the floating icon once the delay elapses if the selection is still active', () => {
    const onShareQuote = vi.fn()
    render(<Harness onShareQuote={onShareQuote} />)
    selectSecondSentence()

    act(() => { vi.advanceTimersByTime(600) })

    expect(screen.getByTestId('share-quote-icon')).toBeInTheDocument()
  })

  it('never shows the floating icon if the selection is cleared before the delay elapses', () => {
    const onShareQuote = vi.fn()
    render(<Harness onShareQuote={onShareQuote} />)
    selectSecondSentence()
    act(() => { vi.advanceTimersByTime(200) })
    clearSelection()
    act(() => { vi.advanceTimersByTime(600) })

    expect(screen.queryByTestId('share-quote-icon')).not.toBeInTheDocument()
  })

  it('opening the context menu cancels the pending icon timer, so it never resurrects the icon afterward', () => {
    const onShareQuote = vi.fn()
    render(<Harness onShareQuote={onShareQuote} />)
    selectSecondSentence()
    act(() => { vi.advanceTimersByTime(200) }) // icon timer still pending (fires at 500ms)

    act(() => {
      screen.getByTestId('reader-container').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    })
    fireEvent.click(screen.getByTestId('share-quote-menu-item'))

    // Advance well past the original timer's fire time -- it must not still be pending.
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.queryByTestId('share-quote-icon')).not.toBeInTheDocument()
  })

  it('swallows the click that ends a drag-selection so it never reaches a sentence span (no spurious seek)', () => {
    const onShareQuote = vi.fn()
    render(<Harness onShareQuote={onShareQuote} />)
    const span = container.querySelector('[data-sentence-index="1"]')!
    const spanClickSpy = vi.fn()
    span.addEventListener('click', spanClickSpy)

    selectSecondSentence()
    act(() => { span.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) })
    expect(spanClickSpy).not.toHaveBeenCalled()

    clearSelection()
    act(() => { span.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) })
    expect(spanClickSpy).toHaveBeenCalledTimes(1)
  })

  it('clicking the floating icon shares the selection directly and hides the icon', () => {
    const onShareQuote = vi.fn()
    render(<Harness onShareQuote={onShareQuote} />)
    selectSecondSentence()
    act(() => { vi.advanceTimersByTime(600) })

    fireEvent.click(screen.getByTestId('share-quote-icon'))

    expect(onShareQuote).toHaveBeenCalledWith({ text: 'Second', fromSentenceIndex: 1, toSentenceIndex: 1, rect: { top: 100, left: 50, right: 90, bottom: 116 } })
    expect(screen.queryByTestId('share-quote-icon')).not.toBeInTheDocument()
  })
})

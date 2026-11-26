import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useGlowCards } from '../useGlowCards';

const Harness = () => {
  useGlowCards();
  return (
    <div>
      <div className="glow-card" data-testid="card"><span data-testid="inside">text</span></div>
      <div data-testid="plain" />
    </div>
  );
};

const move = (target: Element, x: number, y: number, pointerType = 'mouse') => {
  const event = new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  target.dispatchEvent(event);
};

describe('useGlowCards', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 1; });
  });
  afterEach(() => vi.restoreAllMocks());

  it("writes the pointer's place within the card it's over", () => {
    const { getByTestId } = render(<Harness />);
    const card = getByTestId('card');
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 50 } as DOMRect);
    move(getByTestId('inside'), 130, 70);
    expect(card.style.getPropertyValue('--glow-x')).toBe('30px');
    expect(card.style.getPropertyValue('--glow-y')).toBe('20px');
  });

  it('leaves what is not a card alone', () => {
    const { getByTestId } = render(<Harness />);
    move(getByTestId('plain'), 10, 10);
    expect(getByTestId('plain').getAttribute('style')).toBeNull();
  });

  it('ignores a touch (no hover to light)', () => {
    const { getByTestId } = render(<Harness />);
    move(getByTestId('inside'), 130, 70, 'touch');
    expect(getByTestId('card').style.getPropertyValue('--glow-x')).toBe('');
  });

  it('stops listening once unmounted', () => {
    const { getByTestId, unmount } = render(<Harness />);
    const card = getByTestId('card');
    unmount();
    document.body.appendChild(card);
    move(card, 5, 5);
    expect(card.style.getPropertyValue('--glow-x')).toBe('');
    card.remove();
  });
});

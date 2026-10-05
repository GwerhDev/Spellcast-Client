import { describe, it, expect } from 'vitest';
import { movesFollowed } from '../usePageFrames';

// An animation as the browser lists it (document.getAnimations()): its target and keyframes.
const animation = (target: Element, ...properties: string[]) => ({
  effect: { target, getKeyframes: () => [Object.fromEntries([['offset', 0], ...properties.map(p => [p, '0'])])] },
}) as unknown as Animation;

const page = () => {
  const card = document.createElement('div');
  const cover = document.createElement('div');
  const sibling = document.createElement('span');
  card.append(cover, sibling);
  document.body.append(card);
  return { card, cover, sibling };
};

describe('movesFollowed', () => {
  it('a followed element turning, scaling or fading moves it', () => {
    const { cover } = page();
    expect(movesFollowed(animation(cover, 'transform'), [cover])).toBe(true);
    expect(movesFollowed(animation(cover, 'opacity'), [cover])).toBe(true);
  });

  // The Grimoire's deal animates the card that holds the cover, not the cover itself.
  it('so does what holds it', () => {
    const { card, cover } = page();
    expect(movesFollowed(animation(card, 'transform'), [cover])).toBe(true);
  });

  it('something beside it turning or fading does not (a pulsing indicator on the card)', () => {
    const { cover, sibling } = page();
    expect(movesFollowed(animation(sibling, 'transform', 'opacity'), [cover])).toBe(false);
  });

  it('a change that only colors it does not (a hover glow)', () => {
    const { card, cover } = page();
    expect(movesFollowed(animation(card, 'boxShadow', 'borderColor'), [cover])).toBe(false);
  });

  // A sidebar opening moves every card on the page without holding any of them.
  it('a layout change anywhere moves it', () => {
    const { cover } = page();
    const sidebar = document.createElement('aside');
    document.body.append(sidebar);
    expect(movesFollowed(animation(sidebar, 'width'), [cover])).toBe(true);
    expect(movesFollowed(animation(sidebar, 'marginLeft'), [cover])).toBe(true);
  });

  it('with nothing followed, only layout changes count', () => {
    const { card } = page();
    expect(movesFollowed(animation(card, 'transform'), [])).toBe(false);
  });
});

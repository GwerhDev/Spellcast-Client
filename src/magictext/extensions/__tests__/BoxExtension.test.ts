import { describe, it, expect } from 'vitest';
import { boxBackground, boxStyle } from '../BoxExtension';

describe('boxBackground', () => {
  it('a light grey becomes a light tint of the text color, readable on any theme', () => {
    expect(boxBackground('#e9e9e9')).toBe('color-mix(in srgb, currentColor 9%, transparent)');
  });

  it('a colored box keeps its hue, translucent', () => {
    expect(boxBackground('#33c3ff')).toBe('color-mix(in srgb, #33c3ff 32%, transparent)');
  });
});

describe('boxStyle', () => {
  it('is as wide and as far in as the box on the page, with its bottom padding', () => {
    expect(boxStyle({ background: '#33c3ff', width: 664, marginLeft: 12, paddingBottom: 6 })).toMatchObject({
      width: '664px', 'margin-left': '12px', 'padding-bottom': '6px', display: 'flow-root',
    });
  });
});

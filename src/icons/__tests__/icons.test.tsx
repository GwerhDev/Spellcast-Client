import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'fs';
import path from 'path';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { spAltar } from '../index';

const svgPathOf = (name: string) => readFileSync(path.join(__dirname, '../svg', `${name}.svg`), 'utf8').match(/ d="([^"]+)"/)![1];

describe("Spellcast's icons", () => {
  it("are Font Awesome icons: they render wherever one does", () => {
    const { container } = render(<FontAwesomeIcon icon={spAltar} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('data-icon', 'altar');
    expect(svg).toHaveAttribute('data-prefix', 'fak');
    expect(svg.getAttribute('viewBox')).toBe('0 0 512 512');
  });

  it('are drawn from their SVG source', () => {
    expect(spAltar.icon[4]).toBe(svgPathOf('altar'));
  });
});

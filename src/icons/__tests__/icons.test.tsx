import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import * as icons from '../index';

const SVG_DIR = path.join(__dirname, '../svg');
const svgOf = (name: string) => readFileSync(path.join(SVG_DIR, `${name}.svg`), 'utf8');
const all = Object.values(icons) as IconDefinition[];

describe("Spellcast's icons", () => {
  it("are Font Awesome icons: they render wherever one does", () => {
    for (const icon of all) {
      const { container, unmount } = render(<FontAwesomeIcon icon={icon} />);
      const svg = container.querySelector('svg')!;
      expect(svg).toHaveAttribute('data-icon', icon.iconName);
      expect(svg).toHaveAttribute('data-prefix', 'fak');
      expect(svg.getAttribute('viewBox')).toBe(`0 0 ${icon.icon[0]} ${icon.icon[1]}`);
      unmount();
    }
  });

  it('are each drawn from its SVG source, at its size, and every source is one of them', () => {
    for (const icon of all) {
      const source = svgOf(icon.iconName);
      expect(source).toContain(`viewBox="0 0 ${icon.icon[0]} ${icon.icon[1]}"`);
      expect(source.match(/ d="([^"]+)"/)![1]).toBe(icon.icon[4]);
    }
    const sources = readdirSync(SVG_DIR).map(file => file.replace(/\.svg$/, '')).sort();
    expect(sources).toEqual(all.map(icon => icon.iconName).sort());
  });
});

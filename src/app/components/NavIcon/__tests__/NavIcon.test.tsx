import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import { NavIcon } from '../NavIcon';
import { spAltar, spCaster, spChest, spEditor, spGrimoire } from '../../../../icons';
import {
  ALTAR_BODY, ALTAR_CANDLE_LEFT, CASTER_BODY, CASTER_BOOK, ALTAR_CANDLE_RIGHT, ALTAR_FLAME, CHEST_BODY, CHEST_HASP, CHEST_LID, CHEST_SPARKLES,
  EDITOR_BODY, EDITOR_FLAME, GRIMOIRE_BASE, GRIMOIRE_CLASP, GRIMOIRE_COVER, GRIMOIRE_PAGES,
} from '../../../../icons/animated';

const subpaths = (d: string) => d.match(/M[^M]*/g) ?? [];

describe('NavIcon', () => {
  it('draws the altar in parts: its body, and its flames apart (to catch on hover)', () => {
    render(<NavIcon icon={spAltar} />);
    const icon = screen.getByTestId('nav-icon-altar');
    expect(icon).toHaveAttribute('viewBox', '0 0 512 512');
    expect(icon).not.toHaveAttribute('data-active');
    expect(screen.getByTestId('nav-icon-altar-flame')).toHaveAttribute('d', ALTAR_FLAME);
  });

  it("stays lit while its section is open", () => {
    render(<NavIcon icon={spAltar} active />);
    expect(screen.getByTestId('nav-icon-altar')).toHaveAttribute('data-active', 'true');
  });

  it("is the library's own altar, every part of it", () => {
    // Its parts are the library icon's path, split: nothing added, nothing lost.
    const libraryPath = spAltar.icon[4] as string;
    expect([ALTAR_FLAME, ALTAR_CANDLE_LEFT, ALTAR_CANDLE_RIGHT, ALTAR_BODY].flatMap(subpaths).sort()).toEqual(subpaths(libraryPath).sort());
  });

  it('draws the grimoire shut, its pages drawn under its cover (shown as it opens)', () => {
    render(<NavIcon icon={spGrimoire} />);
    expect(screen.getByTestId('nav-icon-grimoire')).toHaveAttribute('viewBox', '0 0 448 512');
    expect(screen.getByTestId('nav-icon-grimoire-cover')).toHaveAttribute('d', GRIMOIRE_COVER);
    expect(screen.getByTestId('nav-icon-grimoire-pages')).toHaveAttribute('d', GRIMOIRE_PAGES);
  });

  it("is the library's own grimoire, every part of it, its pages added", () => {
    const libraryPath = spGrimoire.icon[4] as string;
    expect([GRIMOIRE_COVER, GRIMOIRE_CLASP, GRIMOIRE_BASE].flatMap(subpaths).sort()).toEqual(subpaths(libraryPath).sort());
  });

  it('draws the chest shut, its lid apart (to swing open) and its sparkles hidden in it', () => {
    render(<NavIcon icon={spChest} />);
    expect(screen.getByTestId('nav-icon-chest')).toHaveAttribute('viewBox', '0 0 512 512');
    expect(screen.getByTestId('nav-icon-chest-lid')).toBeInTheDocument();
    CHEST_SPARKLES.forEach((d, i) => expect(screen.getByTestId(`nav-icon-chest-sparkle-${i}`)).toHaveAttribute('d', d));
  });

  it("is the library's own chest: its lid, its hasp and its body", () => {
    const libraryPath = spChest.icon[4] as string;
    expect([CHEST_LID, CHEST_HASP, CHEST_BODY].flatMap(subpaths).sort()).toEqual(subpaths(libraryPath).sort());
  });

  it("draws the editor as the library's, its flame added (to catch on hover)", () => {
    render(<NavIcon icon={spEditor} active />);
    expect(screen.getByTestId('nav-icon-editor')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('nav-icon-editor-flame')).toHaveAttribute('d', EDITOR_FLAME);
    expect(EDITOR_BODY).toBe(spEditor.icon[4]);
  });

  it("draws the caster as the library's, a book added below its hem (to rise on hover)", () => {
    render(<NavIcon icon={spCaster} />);
    expect(screen.getByTestId('nav-icon-caster')).toHaveAttribute('viewBox', '0 0 448 512');
    expect(screen.getByTestId('nav-icon-caster-book')).toHaveAttribute('d', CASTER_BOOK);
    expect(CASTER_BODY).toBe(spCaster.icon[4]);
  });

  it('draws an icon that has no moving parts as it is', () => {
    render(<NavIcon icon={faGear} />);
    expect(screen.queryByTestId('nav-icon-altar')).toBeNull();
    expect(screen.getByTestId('nav-icon-gear')).toBeInTheDocument();
  });
});

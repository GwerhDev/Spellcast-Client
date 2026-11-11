import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import { NavIcon } from '../NavIcon';
import { spAltar, spCaster, spChest, spChronicle, spEditor, spFullscreen, spGear, spGrimoire, spInfo, spOriginal, spPages, spRaise, spSeal, spSpellEdit, spSpellSearch } from '../../../../icons';
import {
  ALTAR_BODY, ALTAR_CANDLE_LEFT, CASTER_BODY, CASTER_BOOK, ALTAR_CANDLE_RIGHT, ALTAR_FLAME, CHEST_BODY, CHEST_HASP, CHEST_LID, CHEST_SPARKLES,
  EDITOR_BODY, EDITOR_FLAME, FULLSCREEN_BL, FULLSCREEN_BR, FULLSCREEN_TL, FULLSCREEN_TR, GEAR, INFO_BODY, INFO_DOT, PAGES_BACK,
  PAGES_FRONT, PAGES_MIDDLE, PDF_CORNER, PDF_PAGE, CHRONICLE_HOUR, CHRONICLE_MINUTE, CHRONICLE_RIM, RAISE_ARROW, RAISE_CLOUD, SPELL_EDIT_QUILL, SPELL_EDIT_SCROLL, SPELL_SEARCH_GLASS, SPELL_SEARCH_SCROLL, GRIMOIRE_BASE, GRIMOIRE_CLASP, GRIMOIRE_COVER, GRIMOIRE_PAGES,
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

  it("draws the reader's icons from the library's, every part of them", () => {
    const own = (icon: { icon: unknown[] }) => subpaths(icon.icon[4] as string).sort();
    expect([SPELL_SEARCH_SCROLL, SPELL_SEARCH_GLASS].flatMap(subpaths).sort()).toEqual(own(spSpellSearch));
    expect([SPELL_EDIT_SCROLL, SPELL_EDIT_QUILL].flatMap(subpaths).sort()).toEqual(own(spSpellEdit));
    expect([PAGES_BACK, PAGES_MIDDLE, PAGES_FRONT].flatMap(subpaths).sort()).toEqual(own(spPages));
    expect([INFO_BODY, INFO_DOT].flatMap(subpaths).sort()).toEqual(own(spInfo));
    expect(GEAR).toBe(spGear.icon[4]);
    expect([FULLSCREEN_TL, FULLSCREEN_TR, FULLSCREEN_BR, FULLSCREEN_BL].flatMap(subpaths).sort()).toEqual(own(spFullscreen));
  });

  it('moves them by their parts: the glass, the quill, the pages behind, the dot, the gear, the corners', () => {
    render(<>
      <NavIcon icon={spSpellSearch} /><NavIcon icon={spSpellEdit} /><NavIcon icon={spPages} active />
      <NavIcon icon={spInfo} /><NavIcon icon={spGear} /><NavIcon icon={spFullscreen} active />
    </>);
    expect(screen.getByTestId('nav-icon-spell-search-glass')).toHaveAttribute('d', SPELL_SEARCH_GLASS);
    expect(screen.getByTestId('nav-icon-spell-edit-quill')).toHaveAttribute('d', SPELL_EDIT_QUILL);
    expect(screen.getByTestId('nav-icon-pages')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('nav-icon-info-dot')).toHaveAttribute('d', INFO_DOT);
    expect(screen.getByTestId('nav-icon-gear-wheel')).toHaveAttribute('d', GEAR);
    expect(screen.getByTestId('nav-icon-fullscreen')).toHaveAttribute('data-active', 'true');
  });

  it("draws the editor's own: the PDF's corner and the clock's hands apart, the seal whole, the cloud's arrow apart", () => {
    render(<><NavIcon icon={spOriginal} active /><NavIcon icon={spSeal} /><NavIcon icon={spChronicle} /><NavIcon icon={spRaise} /></>);
    expect(screen.getByTestId('nav-icon-original')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('nav-icon-original-corner')).toHaveAttribute('d', PDF_CORNER);
    expect(PDF_PAGE + PDF_CORNER).toBe(spOriginal.icon[4]);
    expect(screen.getByTestId('nav-icon-seal-whole')).toHaveAttribute('d', spSeal.icon[4]);
    expect(screen.getByTestId('nav-icon-chronicle-minute')).toHaveAttribute('d', CHRONICLE_MINUTE);
    expect(CHRONICLE_RIM + CHRONICLE_MINUTE + CHRONICLE_HOUR).toBe(spChronicle.icon[4]);
    expect(screen.getByTestId('nav-icon-raise-arrow')).toHaveAttribute('d', RAISE_ARROW);
    expect(RAISE_CLOUD + RAISE_ARROW).toBe(spRaise.icon[4]);
  });

  it('draws an icon that has no moving parts as it is', () => {
    render(<NavIcon icon={faGear} />);
    expect(screen.queryByTestId('nav-icon-altar')).toBeNull();
    expect(screen.getByTestId('nav-icon-gear')).toBeInTheDocument();
  });
});

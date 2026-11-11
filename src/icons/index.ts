import type { IconDefinition, IconName } from '@fortawesome/fontawesome-svg-core';

// Spellcast's own icons (and, later, Nhexa's: Spectra's too), in Font Awesome's own shape: an
// IconDefinition works wherever a Font Awesome icon does (<FontAwesomeIcon icon={...} />, the
// configs that list icons), so ours and theirs mix freely while ours replace theirs, one by one.
// Each one's source is its SVG in ./svg (what a library of our own will be made from).
//
// How they're drawn, to sit beside Font Awesome's Solid icons:
//   - a 512 × 512 grid (or 512 high, as wide as it needs), filled edge to edge as theirs are;
//   - one path, one solid silhouette; detail is cut out of it, never stroked;
//   - a cut-out runs the other way round from the shape it's cut from: Font Awesome fills with
//     the nonzero rule, not evenodd.
//   - the 'fak' prefix: Font Awesome's own for icons of one's own (a "kit").

const defineIcon = (name: string, width: number, height: number, path: string): IconDefinition => ({
  prefix: 'fak',
  iconName: name as IconName,
  icon: [width, height, [], '', path],
});

/** Home: an altar, its flame between two candles. */
export const spAltar = defineIcon('altar', 512, 512, 'M256 24C256 24 328 96 328 152A72 72 0 0 1 184 152C184 96 256 24 256 24ZM256 104C256 104 224 136 224 172A32 32 0 0 0 288 172C288 136 256 104 256 104ZM76 64C76 64 98 88 98 104A22 22 0 0 1 54 104C54 88 76 64 76 64ZM436 64C436 64 458 88 458 104A22 22 0 0 1 414 104C414 88 436 64 436 64ZM48 160A8 8 0 0 1 56 152H96A8 8 0 0 1 104 160V224H48ZM408 160A8 8 0 0 1 416 152H456A8 8 0 0 1 464 160V224H408ZM16 256A16 16 0 0 1 32 240H480A16 16 0 0 1 496 256V272A16 16 0 0 1 480 288H32A16 16 0 0 1 16 272ZM112 304H400V416H112ZM256 324L220 360L256 396L292 360ZM64 448A16 16 0 0 1 80 432H432A16 16 0 0 1 448 448V480A16 16 0 0 1 432 496H80A16 16 0 0 1 64 480Z');

/** The grimoire: a spell book, a star on its cover, its clasp shut. */
export const spGrimoire = defineIcon('grimoire', 448, 512, 'M64 16H384A32 32 0 0 1 416 48V368A32 32 0 0 1 384 400H64A32 32 0 0 1 32 368V48A32 32 0 0 1 64 16ZM80 48V368H104V48ZM260 104L232 180L156 208L232 236L260 312L288 236L364 208L288 180ZM416 160H424A24 24 0 0 1 448 184V232A24 24 0 0 1 424 256H416ZM72 424H400A16 16 0 0 1 416 440V480A16 16 0 0 1 400 496H72A36 36 0 0 1 72 424ZM400 448H112V472H400Z');

/** The editor: a quill, writing on an unrolled scroll. */
export const spEditor = defineIcon('editor', 512, 512, 'M488 24C400 32 288 96 256 208L240 272L304 256C416 216 480 128 488 24ZM460 52L288 250L278 242L450 44ZM244 270L262 288L222 336L204 318ZM48 344A24 24 0 0 1 72 320H88A24 24 0 0 1 112 344V472A24 24 0 0 1 88 496H72A24 24 0 0 1 48 472ZM400 344A24 24 0 0 1 424 320H440A24 24 0 0 1 464 344V472A24 24 0 0 1 440 496H424A24 24 0 0 1 400 472ZM112 344H400V472H112ZM144 376V392H368V376ZM144 424V440H320V424Z');

/** The Havenstore: a treasure chest, its barrel lid shut, banded, its hasp (a keyhole in it)
 *  hanging over the seam. */
export const spChest = defineIcon('chest', 512, 512, 'M40 216V176C40 112 136 56 256 56C376 56 472 112 472 176V216H300V172H212V216ZM120 83V216H136V77ZM376 77V216H392V83ZM224 184H288V268A16 16 0 0 1 272 284H240A16 16 0 0 1 224 268ZM256 204A16 16 0 0 0 248 234L244 262H268L264 234A16 16 0 0 0 256 204ZM40 240H212V276A28 28 0 0 0 240 304H272A28 28 0 0 0 300 276V240H472V424A40 40 0 0 1 432 464H80A40 40 0 0 1 40 424ZM120 240V464H136V240ZM376 240V464H392V240Z');

/** The inventory: a bag, tied shut. */
export const spBag = defineIcon('bag', 512, 512, 'M184 136L160 56L224 96L256 40L288 96L352 56L328 136ZM168 152H344A16 16 0 0 1 344 184H168A16 16 0 0 1 168 152ZM160 200H352C432 264 480 344 480 400A80 80 0 0 1 400 480H112A80 80 0 0 1 32 400C32 344 80 264 160 200ZM256 296L216 352L256 408L296 352Z');

/** The caster: a figure in a pointed hood, its face in the hood's shadow. */
export const spCaster = defineIcon('caster', 448, 512, 'M224 8C296 64 368 120 368 208C368 256 352 288 336 304C416 328 448 384 448 480H0C0 384 32 328 112 304C96 288 80 256 80 208C80 120 152 64 224 8ZM224 112C184 136 152 176 152 216C152 256 184 288 224 288C264 288 296 256 296 216C296 176 264 136 224 112Z');

/** Searching the open Spell: a scroll, a magnifying glass at its corner (the scroll cut around it). */
export const spSpellSearch = defineIcon('spell-search', 512, 512, 'M96 32H384A32 32 0 0 1 384 96H96A32 32 0 0 1 96 32ZM96 96H384V273A128 128 0 0 0 281 448H96ZM144 160V176H336V160ZM144 216V232H336V216ZM144 272V288H280V272ZM144 328V344H256V328ZM88 432H248A24 24 0 0 1 248 480H88A24 24 0 0 1 88 432ZM384 304A80 80 0 1 1 384 464A80 80 0 1 1 384 304ZM384 336A48 48 0 1 0 384 432A48 48 0 1 0 384 336ZM454 426L502 474L474 502L426 454Z');

/** A Spell, a scroll: its top and bottom rolled, its lines of text. */
export const spScroll = defineIcon('scroll', 384, 512, 'M48 32H336A32 32 0 0 1 336 96H48A32 32 0 0 1 48 32ZM48 96H336V416H48ZM96 160V176H288V160ZM96 216V232H288V216ZM96 272V288H288V272ZM96 328V344H224V328ZM48 416H336A32 32 0 0 1 336 480H48A32 32 0 0 1 48 416Z');

/** The reader: an open eye over the editor's scroll (reading it, where the editor writes it). */
export const spReader = defineIcon('reader', 512, 512, 'M256 64C352 64 432 160 448 176C432 192 352 288 256 288C160 288 80 192 64 176C80 160 160 64 256 64ZM256 104A72 72 0 1 0 256 248A72 72 0 1 0 256 104ZM256 140A36 36 0 1 1 256 212A36 36 0 1 1 256 140ZM48 344A24 24 0 0 1 72 320H88A24 24 0 0 1 112 344V472A24 24 0 0 1 88 496H72A24 24 0 0 1 48 472ZM400 344A24 24 0 0 1 424 320H440A24 24 0 0 1 464 344V472A24 24 0 0 1 440 496H424A24 24 0 0 1 400 472ZM112 344H400V472H112ZM144 376V392H368V376ZM144 424V440H320V424Z');

/** Editing a Spell: a scroll, the editor's quill at its corner (the scroll cut around it). */
export const spSpellEdit = defineIcon('spell-edit', 512, 512, 'M96 32H384A32 32 0 0 1 384 96H96A32 32 0 0 1 96 32ZM96 96H384V273A128 128 0 0 0 281 448H96ZM144 160V176H336V160ZM144 216V232H336V216ZM144 272V288H280V272ZM144 328V344H256V328ZM88 432H248A24 24 0 0 1 248 480H88A24 24 0 0 1 88 432ZM500 276C440 281 364 325 342 401L331 445L375 434C451 407 495 347 500 276ZM481 295L364 430L357 424L474 290ZM334 443L346 456L319 488L307 476Z');

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

/** The Havenstore: a chest, its lid shut, its lock's keyhole. */
export const spChest = defineIcon('chest', 512, 512, 'M48 208V160A96 96 0 0 1 144 64H368A96 96 0 0 1 464 160V208ZM128 96V200H144V96ZM368 96V200H384V96ZM48 232H464V432A48 48 0 0 1 416 480H96A48 48 0 0 1 48 432ZM128 248V464H144V248ZM368 248V464H384V248ZM264 318A24 24 0 1 0 248 318V360H264Z');

/** The inventory: a bag, tied shut. */
export const spBag = defineIcon('bag', 512, 512, 'M184 136L160 56L224 96L256 40L288 96L352 56L328 136ZM168 152H344A16 16 0 0 1 344 184H168A16 16 0 0 1 168 152ZM160 200H352C432 264 480 344 480 400A80 80 0 0 1 400 480H112A80 80 0 0 1 32 400C32 344 80 264 160 200ZM256 296L216 352L256 408L296 352Z');

/** The caster: a figure in a pointed hood, its face in the hood's shadow. */
export const spCaster = defineIcon('caster', 448, 512, 'M224 8C296 64 368 120 368 208C368 256 352 288 336 304C416 328 448 384 448 480H0C0 384 32 328 112 304C96 288 80 256 80 208C80 120 152 64 224 8ZM224 112C184 136 152 176 152 216C152 256 184 288 224 288C264 288 296 256 296 216C296 176 264 136 224 112Z');

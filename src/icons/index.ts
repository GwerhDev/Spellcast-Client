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

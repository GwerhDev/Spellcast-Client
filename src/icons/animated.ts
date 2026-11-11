// The parts of the icons that move (in the sidebar, as their section is hovered or open): the
// same drawings as ./index.ts's, split where they animate. Each part keeps the 512-high grid,
// and a cut-out stays in the path of the shape it's cut from (nonzero, see ./index.ts).

/** The altar, without its flames: its candles, its top, its pedestal (a diamond cut in it), its base. */
export const ALTAR_BODY = 'M48 160A8 8 0 0 1 56 152H96A8 8 0 0 1 104 160V224H48ZM408 160A8 8 0 0 1 416 152H456A8 8 0 0 1 464 160V224H408ZM16 256A16 16 0 0 1 32 240H480A16 16 0 0 1 496 256V272A16 16 0 0 1 480 288H32A16 16 0 0 1 16 272ZM112 304H400V416H112ZM256 324L220 360L256 396L292 360ZM64 448A16 16 0 0 1 80 432H432A16 16 0 0 1 448 448V480A16 16 0 0 1 432 496H80A16 16 0 0 1 64 480Z';
/** Its flame, a tongue cut in it; its base at (256, 224). */
export const ALTAR_FLAME = 'M256 24C256 24 328 96 328 152A72 72 0 0 1 184 152C184 96 256 24 256 24ZM256 104C256 104 224 136 224 172A32 32 0 0 0 288 172C288 136 256 104 256 104Z';
/** Its candles' flames; their bases at (76, 126) and (436, 126). */
export const ALTAR_CANDLE_LEFT = 'M76 64C76 64 98 88 98 104A22 22 0 0 1 54 104C54 88 76 64 76 64Z';
export const ALTAR_CANDLE_RIGHT = 'M436 64C436 64 458 88 458 104A22 22 0 0 1 414 104C414 88 436 64 436 64Z';

/** The grimoire's cover: its spine's band and its star cut in it; hinged at its spine (x 32). */
export const GRIMOIRE_COVER = 'M64 16H384A32 32 0 0 1 416 48V368A32 32 0 0 1 384 400H64A32 32 0 0 1 32 368V48A32 32 0 0 1 64 16ZM80 48V368H104V48ZM260 104L232 180L156 208L232 236L260 312L288 236L364 208L288 180Z';
/** Its clasp, holding the cover shut. */
export const GRIMOIRE_CLASP = 'M416 160H424A24 24 0 0 1 448 184V232A24 24 0 0 1 424 256H416Z';
/** Its pages' edges, below the cover. */
export const GRIMOIRE_BASE = 'M72 424H400A16 16 0 0 1 416 440V480A16 16 0 0 1 400 496H72A36 36 0 0 1 72 424ZM400 448H112V472H400Z';
/** Open, its pages under the cover: two, a fold between them, lines of writing on each (not in
 *  the library's closed book). */
export const GRIMOIRE_PAGES = 'M56 32H392V384H56ZM220 48V368H228V48ZM88 104V120H196V104ZM88 160V176H196V160ZM88 216V232H180V216ZM88 272V288H164V272ZM252 104V120H360V104ZM252 160V176H360V160ZM252 216V232H344V216ZM252 272V288H320V272Z';

/** The chest's lid, banded, a notch left for its hasp; hinged at its back, along its bottom (y 216). */
export const CHEST_LID = 'M40 216V176C40 112 136 56 256 56C376 56 472 112 472 176V216H300V172H212V216ZM120 83V216H136V77ZM376 77V216H392V83Z';
/** Its hasp (a keyhole in it), hanging from the lid over the seam: it opens with the lid. */
export const CHEST_HASP = 'M224 184H288V268A16 16 0 0 1 272 284H240A16 16 0 0 1 224 268ZM256 204A16 16 0 0 0 248 234L244 262H268L264 234A16 16 0 0 0 256 204Z';
/** Its body, banded, cut around the hasp; and, open (the hasp gone with the lid), the piece
 *  that fills that cut. */
export const CHEST_BODY = 'M40 240H212V276A28 28 0 0 0 240 304H272A28 28 0 0 0 300 276V240H472V424A40 40 0 0 1 432 464H80A40 40 0 0 1 40 424ZM120 240V464H136V240ZM376 240V464H392V240Z';
/** Open, what shines out of it, in the gap the lid leaves over the body: three sparkles (not in
 *  the library's shut chest). */
export const CHEST_SPARKLES = ['M256 144L267 175L298 186L267 197L256 228L245 197L214 186L245 175Z', 'M168 148L174 164L190 170L174 176L168 192L162 176L146 170L162 164Z', 'M346 140L352 158L370 164L352 170L346 188L340 170L322 164L340 158Z'] as const;
export const CHEST_PLUG = 'M209 237V276A31 31 0 0 0 240 307H272A31 31 0 0 0 303 276V237Z';
/** Open, the piece that fills the lid's notch (its hasp turned away with its front). */
export const CHEST_LID_PLUG = 'M209 169V219H303V169Z';

/** The editor: its quill and its scroll, as in the library. */
export const EDITOR_BODY = 'M488 24C400 32 288 96 256 208L240 272L304 256C416 216 480 128 488 24ZM460 52L288 250L278 242L450 44ZM244 270L262 288L222 336L204 318ZM48 344A24 24 0 0 1 72 320H88A24 24 0 0 1 112 344V472A24 24 0 0 1 88 496H72A24 24 0 0 1 48 472ZM400 344A24 24 0 0 1 424 320H440A24 24 0 0 1 464 344V472A24 24 0 0 1 440 496H424A24 24 0 0 1 400 472ZM112 344H400V472H112ZM144 376V392H368V376ZM144 424V440H320V424Z';
/** What it writes catching fire: the altar's flame, smaller, rising off the scroll beside the
 *  quill; its base at (146, 334). */
export const EDITOR_FLAME = 'M146 162C146 162 207.9 223.9 207.9 272.1A61.9 61.9 0 0 1 84.1 272.1C84.1 223.9 146 162 146 162ZM146 230.8C146 230.8 118.5 258.3 118.5 289.3A27.5 27.5 0 0 0 173.5 289.3C173.5 258.3 146 230.8 146 230.8Z';

/** The caster: its hooded figure, as in the library. */
export const CASTER_BODY = 'M224 8C296 64 368 120 368 208C368 256 352 288 336 304C416 328 448 384 448 480H0C0 384 32 328 112 304C96 288 80 256 80 208C80 120 152 64 224 8ZM224 112C184 136 152 176 152 216C152 256 184 288 224 288C264 288 296 256 296 216C296 176 264 136 224 112Z';
/** A book held open before it, its two pages rising from its spine as a V, two lines on each. */
export const CASTER_BOOK = 'M120 340L216 388V460L120 424ZM136 376V386L200 418V408ZM136 402V412L200 444V434ZM328 340V424L232 460V388ZM312 376L248 408V418L312 386ZM312 402L248 434V444L312 412Z';
/** The book's outline, wider: cut out of the figure so the book stands apart from it. */
export const CASTER_BOOK_GAP = 'M100 316L224 372L348 316V438L224 482L100 438Z';

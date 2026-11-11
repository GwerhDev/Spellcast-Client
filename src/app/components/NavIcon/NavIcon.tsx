import s from './NavIcon.module.css';
import { useId, type ReactElement, type ReactNode } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  ALTAR_BODY, ALTAR_CANDLE_LEFT, CASTER_BODY, CASTER_BOOK, CASTER_BOOK_GAP, ALTAR_CANDLE_RIGHT, ALTAR_FLAME, CHEST_BODY, CHEST_HASP, CHEST_LID, CHEST_LID_PLUG, CHEST_PLUG, CHEST_SPARKLES, EDITOR_BODY, EDITOR_FLAME,
  FULLSCREEN_BL, FULLSCREEN_BR, FULLSCREEN_TL, FULLSCREEN_TR, GEAR, GRIMOIRE_BASE, GRIMOIRE_CLASP, GRIMOIRE_COVER, GRIMOIRE_PAGES,
  INFO_BODY, INFO_DOT, PAGES_BACK, PAGES_FRONT, PAGES_MIDDLE, SPELL_EDIT_QUILL, SPELL_EDIT_SCROLL, SPELL_SEARCH_GLASS,
  SPELL_SEARCH_SCROLL, RAISE_ARROW, RAISE_CLOUD,
} from '../../../icons/animated';
import { spChronicle, spOriginal, spSeal } from '../../../icons';

interface NavIconProps {
  icon: IconDefinition;
  // Its section is open: it stays as it is on hover.
  active?: boolean;
}

interface AnimatedProps { active: boolean }

// Drawn as Font Awesome draws its icons (same size, same color), in parts that move.
const Svg = ({ name, width, active, children }: { name: string; width: number; active: boolean; children: ReactNode }) => (
  <svg
    className={`svg-inline--fa ${s.icon} ${active ? s.active : ''}`}
    viewBox={`0 0 ${width} 512`}
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    data-testid={`nav-icon-${name}`}
    data-active={active || undefined}
  >
    {children}
  </svg>
);

// A flame: it catches and goes out (the path), and flickers all along (its group: always,
// so going out it dies down flickering, never snapping still first).
const Flame = ({ d, place, testId }: { d: string; place: string; testId?: string }) => (
  <g className={`${s.flicker} ${place}`}>
    <path className={`${s.flame} ${place}`} d={d} data-testid={testId} />
  </g>
);

// The altar: unlit; hovered (or open), its flame and its candles' flames catch and flicker.
const AltarIcon = ({ active }: AnimatedProps) => (
  <Svg name="altar" width={512} active={active}>
    <path d={ALTAR_BODY} />
    <Flame d={ALTAR_FLAME} place={s.altarFlame} testId="nav-icon-altar-flame" />
    <Flame d={ALTAR_CANDLE_LEFT} place={s.candleLeft} />
    <Flame d={ALTAR_CANDLE_RIGHT} place={s.candleRight} />
  </Svg>
);

// The grimoire: shut; hovered (or open), its clasp lets go and its cover swings open on its
// spine, its pages under it.
const GrimoireIcon = ({ active }: AnimatedProps) => (
  <Svg name="grimoire" width={448} active={active}>
    <path className={s.pages} d={GRIMOIRE_PAGES} data-testid="nav-icon-grimoire-pages" />
    <path d={GRIMOIRE_BASE} />
    <path className={s.cover} d={GRIMOIRE_COVER} data-testid="nav-icon-grimoire-cover" />
    <path className={s.clasp} d={GRIMOIRE_CLASP} />
  </Svg>
);

// The Havenstore's chest: shut; hovered (or open), its lid swings up and back on its hinge (its
// front, the hasp on it, turning away out of sight), and what's in it shines out.
const ChestIcon = ({ active }: AnimatedProps) => (
  <Svg name="chest" width={512} active={active}>
    {/* Each sparkle shows and hides (its path) and twinkles all along (its group), as a flame. */}
    {CHEST_SPARKLES.map((d, i) => (
      <g key={i} className={`${s.twinkle} ${s[`sparkle${i}`]}`}>
        <path className={`${s.sparkle} ${s[`sparkle${i}`]}`} d={d} data-testid={`nav-icon-chest-sparkle-${i}`} />
      </g>
    ))}
    <path d={CHEST_BODY} />
    <path className={s.plug} d={CHEST_PLUG} />
    <g className={s.lid} data-testid="nav-icon-chest-lid">
      <path d={CHEST_LID} />
      <path className={s.plug} d={CHEST_LID_PLUG} />
      <path className={s.hasp} d={CHEST_HASP} />
    </g>
  </Svg>
);

// The editor: its quill on its scroll; hovered (or open), what it writes catches fire beside
// it, as the altar's flame.
const EditorIcon = ({ active }: AnimatedProps) => (
  <Svg name="editor" width={512} active={active}>
    <path d={EDITOR_BODY} />
    <Flame d={EDITOR_FLAME} place={s.editorFlame} testId="nav-icon-editor-flame" />
  </Svg>
);

// The caster: its hooded figure; hovered (or open), an open book rises from below its hem and
// stays held up before it, a gap cut around it in the figure so it reads apart.
const CasterIcon = ({ active }: AnimatedProps) => {
  const id = useId().replace(/:/g, '');
  const [gap, hem] = [`caster-gap-${id}`, `caster-hem-${id}`];
  return (
    <Svg name="caster" width={448} active={active}>
      <defs>
        {/* Below its hem the book is out of sight. */}
        <clipPath id={hem}><rect width={448} height={480} /></clipPath>
        <mask id={gap} maskUnits="userSpaceOnUse" x={-64} y={-64} width={576} height={640}>
          <rect x={-64} y={-64} width={576} height={640} fill="white" />
          <g clipPath={`url(#${hem})`}><path className={s.book} d={CASTER_BOOK_GAP} fill="black" /></g>
        </mask>
      </defs>
      <path d={CASTER_BODY} mask={`url(#${gap})`} />
      <g clipPath={`url(#${hem})`}>
        <path className={s.book} d={CASTER_BOOK} data-testid="nav-icon-caster-book" />
      </g>
    </Svg>
  );
};

// Searching the spell: hovered, the glass over its scroll leans in, bigger, as if to read closer.
const SpellSearchIcon = ({ active }: AnimatedProps) => (
  <Svg name="spell-search" width={512} active={active}>
    <path d={SPELL_SEARCH_SCROLL} />
    <path className={s.glass} d={SPELL_SEARCH_GLASS} data-testid="nav-icon-spell-search-glass" />
  </Svg>
);

// Editing the spell: hovered, its quill writes (back and forth on its nib) for as long as it is.
const SpellEditIcon = ({ active }: AnimatedProps) => (
  <Svg name="spell-edit" width={512} active={active}>
    <path d={SPELL_EDIT_SCROLL} />
    <path className={s.quill} d={SPELL_EDIT_QUILL} data-testid="nav-icon-spell-edit-quill" />
  </Svg>
);

// The page selector: hovered (or open), the pages behind the front one fan out.
const PagesIcon = ({ active }: AnimatedProps) => (
  <Svg name="pages" width={512} active={active}>
    <path className={`${s.page} ${s.pageBack}`} d={PAGES_BACK} data-testid="nav-icon-pages-back" />
    <path className={`${s.page} ${s.pageMiddle}`} d={PAGES_MIDDLE} />
    <path d={PAGES_FRONT} />
  </Svg>
);

// The information: hovered, the "i"'s dot hops (a hole in the disc, cut by a mask that hops).
const InfoIcon = ({ active }: AnimatedProps) => {
  const id = `info-dot-${useId().replace(/:/g, '')}`;
  return (
    <Svg name="info" width={512} active={active}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-64} y={-64} width={640} height={640}>
          <rect x={-64} y={-64} width={640} height={640} fill="white" />
          <path className={s.dot} d={INFO_DOT} fill="black" data-testid="nav-icon-info-dot" />
        </mask>
      </defs>
      <path className={s.maskedBody} d={INFO_BODY} mask={`url(#${id})`} />
    </Svg>
  );
};

// Settings: hovered (or open), the gear turns.
const GearIcon = ({ active }: AnimatedProps) => (
  <Svg name="gear" width={512} active={active}>
    <path className={s.gear} d={GEAR} data-testid="nav-icon-gear-wheel" />
  </Svg>
);

// Fullscreen: its corners point out, and spread on hover; in fullscreen (active) each turns
// on its own center to point in, and closes in on hover.
const FullscreenIcon = ({ active }: AnimatedProps) => (
  <Svg name="fullscreen" width={512} active={active}>
    <path className={`${s.corner} ${s.cornerTL}`} d={FULLSCREEN_TL} data-testid="nav-icon-fullscreen-corner" />
    <path className={`${s.corner} ${s.cornerTR}`} d={FULLSCREEN_TR} />
    <path className={`${s.corner} ${s.cornerBR}`} d={FULLSCREEN_BR} />
    <path className={`${s.corner} ${s.cornerBL}`} d={FULLSCREEN_BL} />
  </Svg>
);

// An icon that moves as one: drawn as in the library, all of it in one part.
const Whole = ({ icon, part, active }: AnimatedProps & { icon: IconDefinition; part: string }) => (
  <Svg name={icon.iconName} width={icon.icon[0]} active={active}>
    <path className={part} d={icon.icon[4] as string} data-testid={`nav-icon-${icon.iconName}-whole`} />
  </Svg>
);

// The original (the PDF's page): hovered (or shown), the page turns over.
const OriginalIcon = ({ active }: AnimatedProps) => <Whole icon={spOriginal} part={s.turn} active={active} />;

// Sealing the spell: hovered, the seal is pressed, as a stamp.
const SealIcon = ({ active }: AnimatedProps) => <Whole icon={spSeal} part={s.stamp} active={active} />;

// The chronicle: hovered, the hourglass turns over.
const ChronicleIcon = ({ active }: AnimatedProps) => <Whole icon={spChronicle} part={s.hourglass} active={active} />;

// Raising to the cloud: hovered, its arrow rises (a hole in the cloud, cut by a mask that rises).
const RaiseIcon = ({ active }: AnimatedProps) => {
  const id = `raise-arrow-${useId().replace(/:/g, '')}`;
  return (
    <Svg name="raise" width={512} active={active}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-64} y={-64} width={640} height={640}>
          <rect x={-64} y={-64} width={640} height={640} fill="white" />
          <path className={s.arrow} d={RAISE_ARROW} fill="black" data-testid="nav-icon-raise-arrow" />
        </mask>
      </defs>
      <path className={`${s.maskedBody} ${s.maskedLoop}`} d={RAISE_CLOUD} mask={`url(#${id})`} />
    </Svg>
  );
};

// The icons that move, by their name in the icon library.
const ANIMATED: Record<string, (props: AnimatedProps) => ReactElement> = {
  altar: AltarIcon,
  grimoire: GrimoireIcon,
  chest: ChestIcon,
  editor: EditorIcon,
  caster: CasterIcon,
  'spell-search': SpellSearchIcon,
  'spell-edit': SpellEditIcon,
  pages: PagesIcon,
  info: InfoIcon,
  gear: GearIcon,
  fullscreen: FullscreenIcon,
  original: OriginalIcon,
  seal: SealIcon,
  chronicle: ChronicleIcon,
  raise: RaiseIcon,
};

// A section's icon in the sidebar: one of ours that moves as it's hovered (and stays so while
// its section is open), or the icon as it is.
const animatedOf = (icon: IconDefinition) => (icon.prefix === 'fak' ? ANIMATED[icon.iconName] : undefined);

// Whether an icon is one of ours that moves (a Font Awesome one of the same name never is).
export const isAnimatedIcon = (icon: unknown): icon is IconDefinition =>
  !!icon && typeof icon === 'object' && 'iconName' in icon && !!animatedOf(icon as IconDefinition);

export const NavIcon = ({ icon, active = false }: NavIconProps) => {
  const Animated = animatedOf(icon);
  return Animated ? <Animated active={active} /> : <FontAwesomeIcon icon={icon} data-testid={`nav-icon-${icon.iconName}`} />;
};

import type { ReactNode } from 'react';
import s from './HomeStage.module.css';

// Quoted: blob: URLs can contain characters an unquoted url() rejects.
const cssUrl = (url: string) => `url("${url}")`;

interface HomeStageProps {
  // The loaded spell's cover: the whole stage takes it as its backdrop. None: a plain page.
  coverUrl: string | null;
  // The pointer has been left alone: the secondary content steps aside.
  idle: boolean;
  // The scene (the altar) and what sits below it (e.g. Last Spells).
  main: ReactNode;
  secondary: ReactNode;
}

// The home page as a stage: with a spell loaded, its cover fills the whole page (blurred,
// dimmed, glowing behind the center, the altar's own treatment at page size) and the
// secondary content below fades away while the pointer rests, leaving the scene alone.
// The backdrop is attached to the stage's frame, which doesn't scroll: the content scrolls
// over it in its own scroller, so the cover always fills the page, edge to edge.
export const HomeStage = ({ coverUrl, idle, main, secondary }: HomeStageProps) => (
  <div data-testid="home-stage" className={`${s.stage} ${coverUrl ? s.immersive : ''}`}>
    {coverUrl && (
      <div className={s.backdrop} aria-hidden="true">
        <div data-testid="home-stage-cover" className={s.cover} style={{ backgroundImage: cssUrl(coverUrl) }} />
        <div className={s.glow} style={{ backgroundImage: cssUrl(coverUrl) }} />
      </div>
    )}
    <div data-testid="home-stage-scroller" className={s.scroller}>
      {main}
      <div
        data-testid="home-stage-secondary"
        className={`${s.secondary} ${coverUrl && idle ? s.secondaryHidden : ''}`}
        aria-hidden={coverUrl && idle ? true : undefined}
      >
        {secondary}
      </div>
    </div>
  </div>
);

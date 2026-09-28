import s from '../../../components/Start/ReadOption/index.module.css';
import { PlayButton } from '../../../components/PlayButton/PlayButton';
import { useAppSelector } from '../../../../store/hooks';
import { usePlaySpell } from '../../../../hooks/usePlaySpell';
import { useLanguage } from '../../../../i18n';

interface ReadOptionProps {
  // A spell is being dragged over Start (the drop itself is handled there, so a spell can
  // be dropped anywhere on the section, whatever tab was showing).
  dragActive: boolean;
}

// The "Read" tab: the player's own PlayButton as the drop target. Dropping a spell starts
// reading it; when something is already loaded, the button plays/pauses it.
export const ReadOption = ({ dragActive }: ReadOptionProps) => {
  const { t } = useLanguage();
  const { togglePlayback } = usePlaySpell();
  const { spellId, spellTitle } = useAppSelector(state => state.spellReader);
  const audioPlaying = useAppSelector(state => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector(state => state.browserPlayer.isPlaying);
  const isPlaying = audioPlaying || browserPlaying;
  const hasSpell = !!spellId;

  const hint = dragActive
    ? t.start.readDropRelease
    : hasSpell && spellTitle
      ? t.start.readNowReading.replace('{title}', spellTitle)
      : t.start.readDropHint;

  return (
    <div data-testid="read-option" className={`${s.container} ${dragActive ? s.dragActive : ''}`}>
      <div className={s.stage}>
        <span className={s.ring} aria-hidden="true" />
        <span className={`${s.ring} ${s.ringOuter}`} aria-hidden="true" />
        <div className={s.button}>
          <PlayButton
            size="lg"
            isPlaying={isPlaying}
            active={dragActive}
            onClick={togglePlayback}
            disabled={!hasSpell && !dragActive}
          />
        </div>
      </div>
      <p data-testid="read-option-hint" className={s.hint}>{hint}</p>
    </div>
  );
};

import s from '../../../components/Start/ReadOption/index.module.css';
import { PlayButton } from '../../../components/PlayButton/PlayButton';
import spellcastLogo from '../../../../assets/spellcast-logo.svg';
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
// Quoted: Vite inlines small SVGs as data URIs containing single quotes, which an unquoted
// url() rejects.
const brandMask = `url("${spellcastLogo}")`;

export const ReadOption = ({ dragActive }: ReadOptionProps) => {
  const { t } = useLanguage();
  const { togglePlayback } = usePlaySpell();
  const { spellId, spellTitle } = useAppSelector(state => state.spellReader);
  const audioPlaying = useAppSelector(state => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector(state => state.browserPlayer.isPlaying);
  const isPlaying = audioPlaying || browserPlaying;
  const hasSpell = !!spellId;
  // Nothing loaded and nothing being dragged: the button shows the Spellcast mark and does
  // nothing on click; a spell dragged over turns it back into a play button.
  const idle = !hasSpell && !dragActive;

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
            idle={idle}
            icon={idle ? (
              <span
                data-testid="read-option-brand-icon"
                className={s.brandIcon}
                style={{ maskImage: brandMask, WebkitMaskImage: brandMask }}
                aria-hidden="true"
              />
            ) : undefined}
          />
        </div>
      </div>
      <p data-testid="read-option-hint" className={s.hint}>{hint}</p>
    </div>
  );
};

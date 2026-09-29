import s from '../../../components/Start/ReadOption/index.module.css';
import { PlayButton } from '../../../components/PlayButton/PlayButton';
import { Waveform } from '../../../components/Waveform/Waveform';
import spellcastLogo from '../../../../assets/spellcast-logo.svg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpenReader, faHandPointer } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '../../../components/Buttons/IconButton';
import { useAppSelector } from '../../../../store/hooks';
import { usePlaySpell } from '../../../../hooks/usePlaySpell';
import { useSpellCoverUrl } from '../../../../hooks/useSpellCoverUrl';
import { useLanguage } from '../../../../i18n';

interface ReadOptionProps {
  // A spell is being dragged over Start (the drop itself is handled there, so a spell can
  // be dropped anywhere on the section, whatever tab was showing).
  dragActive: boolean;
}

// Quoted: Vite inlines small SVGs as data URIs containing single quotes, which an unquoted
// url() rejects. Same for blob: URLs, quoted for consistency.
const cssUrl = (url: string) => `url("${url}")`;
const brandMask = cssUrl(spellcastLogo);

// The "Read" tab: the player's own PlayButton as the drop target. Dropping a spell starts
// reading it; when something is already loaded, the button plays/pauses it, over that
// spell's cover filling the tab's panel (same box as Write's textarea / Import's dropzone).
export const ReadOption = ({ dragActive }: ReadOptionProps) => {
  const { t } = useLanguage();
  const { togglePlayback } = usePlaySpell();
  const navigate = useNavigate();
  const { spellId, spellTitle, currentPage, totalPages, isLoaded } = useAppSelector(state => state.spellReader);
  const userId = useAppSelector(state => state.session.userData?.id);
  const audioPlaying = useAppSelector(state => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector(state => state.browserPlayer.isPlaying);
  const isPlaying = audioPlaying || browserPlaying;
  const hasSpell = !!spellId;
  const coverUrl = useSpellCoverUrl(spellId, userId);
  // Nothing loaded and nothing being dragged: the button shows the Spellcast mark and does
  // nothing on click; a spell dragged over turns it back into a play button.
  const idle = !hasSpell && !dragActive;
  const showNowReading = hasSpell && !!spellTitle && !dragActive;

  return (
    <div data-testid="read-option" className={`${s.container} ${dragActive ? s.dragActive : ''} ${coverUrl ? s.hasCover : s.noCover}`}>
      {coverUrl && (
        <>
          <div data-testid="read-option-cover" className={s.panelCover} style={{ backgroundImage: cssUrl(coverUrl) }} aria-hidden="true" />
          <div className={s.panelGlow} style={{ backgroundImage: cssUrl(coverUrl) }} aria-hidden="true" />
        </>
      )}
      {hasSpell && !dragActive && (
        <IconButton
          data-testid="read-option-open-reader"
          icon={faBookOpenReader}
          title={t.start.readOpenReader}
          className={s.openReader}
          onClick={() => navigate(`/spell/${spellId}/reader`)}
        />
      )}
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
      {showNowReading ? (
        <div data-testid="read-option-now" className={s.nowReading}>
          <span className={s.nowStatus}>
            <Waveform active={isPlaying} bars={3} height={10} />
            <span>{isPlaying ? t.start.readNowPlaying : t.start.readPaused}</span>
            {isLoaded && (
              <>
                <span className={s.nowDot} aria-hidden="true">·</span>
                <span>{t.spell.page} {currentPage} {t.spell.of} {totalPages}</span>
              </>
            )}
          </span>
          <span data-testid="read-option-title" className={s.nowTitle} title={spellTitle ?? undefined}>{spellTitle}</span>
        </div>
      ) : (
        <p data-testid="read-option-hint" className={s.hint}>
          <FontAwesomeIcon icon={faHandPointer} className={s.hintIcon} />
          <span>{dragActive ? t.start.readDropRelease : t.start.readDropHint}</span>
        </p>
      )}
    </div>
  );
};

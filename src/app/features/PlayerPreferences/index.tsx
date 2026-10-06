import s from '../../components/Modals/PlayerPreferences.module.css';
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faCheck, faMusic } from '@fortawesome/free-solid-svg-icons';
import { useLanguage, assetName } from '../../../i18n';
import { useAppSelector } from '../../../store/hooks';
import { useSpellCosmetic } from '../../../hooks/useSpellCosmetic';
import { soundBackgrounds } from '../../../config/assets';

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  soon?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, value, onChange, soon }) => (
  <div className={`${s.row} ${soon ? s.rowSoon : ''}`}>
    <div className={s.rowText}>
      <div className={s.rowLabelRow}>
        <span className={s.rowLabel}>{label}</span>
        {soon && <span className={s.soonTag}>soon</span>}
      </div>
      <span className={s.rowDescription}>{description}</span>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`${s.toggle} ${value ? s.toggleOn : ''}`}
      onClick={() => !soon && onChange(!value)}
      tabIndex={soon ? -1 : 0}
    >
      <span className={`${s.toggleThumb} ${value ? s.toggleThumbOn : ''}`} />
    </button>
  </div>
);

interface SliderRowProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  soon?: boolean;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, description, value, min, max, step, format, onChange, soon }) => (
  <div className={`${s.row} ${soon ? s.rowSoon : ''}`}>
    <div className={s.rowText}>
      <div className={s.rowLabelRow}>
        <span className={s.rowLabel}>{label}</span>
        {soon && <span className={s.soonTag}>soon</span>}
      </div>
      <span className={s.rowDescription}>{description}</span>
    </div>
    <div className={s.sliderGroup}>
      <span className={s.sliderValue}>{format(value)}</span>
      <input
        type="range"
        className={s.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={soon}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ '--slider-pct': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
      />
    </div>
  </div>
);

const SOUND_ARTWORK: Record<string, string> = {
  'rain-window':      'linear-gradient(135deg, #0e2a40 0%, #1e5a8a 100%)',
  'cafe-murmur':      'linear-gradient(135deg, #2e1808 0%, #8a4010 100%)',
  'ancient-forest':   'linear-gradient(135deg, #0a2414 0%, #145c30 100%)',
  'ocean-tides':      'linear-gradient(135deg, #082430 0%, #0e6e80 100%)',
  'crackling-hearth': 'linear-gradient(135deg, #2e0e08 0%, #a03010 100%)',
  'northern-winds':   'linear-gradient(135deg, #120a30 0%, #3a1870 100%)',
};

export const PlayerPreferences: React.FC = () => {
  const [autoplay, setAutoplay] = useState(false);
  const [continueOnPageTurn, setContinueOnPageTurn] = useState(true);
  const [rememberPosition, setRememberPosition] = useState(true);
  const [skipBlankPages, setSkipBlankPages] = useState(false);
  const [loopSpell, setLoopSpell] = useState(false);
  const [speed, setSpeed] = useState(1);
  const { t } = useLanguage();
  const { unlockedIds } = useAppSelector(state => state.casterInventory);
  const spellId = useAppSelector(state => state.spellReader.spellId);
  // The loaded spell's sound background, picked as its cover frame is: the caster's default
  // (set from the inventory), none, or one of the caster's own.
  const { choice, defaultId, pick } = useSpellCosmetic('soundBackground', spellId);
  const defaultSound = soundBackgrounds.find(bg => bg.id === defaultId);

  const unlockedSounds = soundBackgrounds.filter(bg => bg.available && unlockedIds.includes(bg.id));

  return (
    <div data-testid="player-preferences" className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.player.soundBackground}</p>
        <div className={s.soundBgList}>
          <button
            data-testid="player-sound-bg-pick-default"
            className={`${s.soundBgItem} ${choice === undefined ? s.soundBgItemActive : ''}`}
            onClick={() => pick(undefined)}
          >
            <span
              className={`${s.soundBgDot} ${defaultSound ? '' : s.soundBgDotNone}`}
              style={defaultSound ? { background: SOUND_ARTWORK[defaultSound.id] ?? 'var(--color-dark-300)' } : undefined}
            >
              <FontAwesomeIcon icon={faMusic} className={s.soundBgDotIcon} />
            </span>
            <span className={s.soundBgName}>{defaultSound ? `${t.common.default} · ${assetName(t, defaultSound)}` : t.common.default}</span>
            {choice === undefined && (
              <FontAwesomeIcon icon={faCheck} className={s.soundBgCheck} />
            )}
          </button>
          <button
            data-testid="player-sound-bg-pick-none"
            className={`${s.soundBgItem} ${choice === null ? s.soundBgItemActive : ''}`}
            onClick={() => pick(null)}
          >
            <span className={`${s.soundBgDot} ${s.soundBgDotNone}`}>
              <FontAwesomeIcon icon={faBan} className={s.soundBgDotIcon} />
            </span>
            <span className={s.soundBgName}>{t.common.none}</span>
            {choice === null && (
              <FontAwesomeIcon icon={faCheck} className={s.soundBgCheck} />
            )}
          </button>
          {unlockedSounds.map(bg => {
            const isActive = choice === bg.id;
            return (
              <button
                key={bg.id}
                data-testid={`player-sound-bg-${bg.id}`}
                className={`${s.soundBgItem} ${isActive ? s.soundBgItemActive : ''}`}
                onClick={() => pick(bg.id)}
              >
                <span
                  className={s.soundBgDot}
                  style={{ background: SOUND_ARTWORK[bg.id] ?? 'var(--color-dark-300)' }}
                >
                  <FontAwesomeIcon icon={faMusic} className={s.soundBgDotIcon} />
                </span>
                <span className={s.soundBgName}>{assetName(t, bg)}</span>
                {isActive && (
                  <FontAwesomeIcon icon={faCheck} className={s.soundBgCheck} />
                )}
              </button>
            );
          })}
          {unlockedSounds.length === 0 && (
            <p className={s.soundBgEmpty}>{t.havenStore.soundBackgrounds}</p>
          )}
        </div>
      </div>

      <div className={s.section}>
        <p className={s.sectionTitle}>{t.player.playback}</p>
        <ToggleRow soon label={t.player.autoplay} description={t.player.autoplayDesc} value={autoplay} onChange={setAutoplay} />
        <ToggleRow soon label={t.player.continueOnPageTurn} description={t.player.continueOnPageTurnDesc} value={continueOnPageTurn} onChange={setContinueOnPageTurn} />
        <ToggleRow soon label={t.player.loopSpell} description={t.player.loopSpellDesc} value={loopSpell} onChange={setLoopSpell} />
        <SliderRow soon label={t.player.readingSpeed} description={t.player.readingSpeedDesc} value={speed} min={0.5} max={2} step={0.25} format={(v) => `${v}×`} onChange={setSpeed} />
      </div>

      <div className={s.section}>
        <p className={s.sectionTitle}>{t.player.spell}</p>
        <ToggleRow soon label={t.player.rememberPosition} description={t.player.rememberPositionDesc} value={rememberPosition} onChange={setRememberPosition} />
        <ToggleRow soon label={t.player.skipBlankPages} description={t.player.skipBlankPagesDesc} value={skipBlankPages} onChange={setSkipBlankPages} />
      </div>
    </div>
  );
};

import s from '../../components/SpellReader/ReaderSettings.module.css';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { faDesktop, faPalette, faShieldHalved, faCat, faBan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { RootState } from '../../../store';
import { setShowReaderSettings, setFitToWidth, setLightningMode, setAttentionGuardEnabled, setAttentionGuardInterval } from '../../../store/spellReaderSlice';
import { unlockAsset } from '../../../store/casterInventorySlice';
import { useSpellCosmetic } from '../../../hooks/useSpellCosmetic';
import { pageBackgrounds, companions } from '../../../config/assets';
import { TabModal } from '../../components/Modals/TabModal';
import { CompanionCard } from '../../components/Cards/CompanionCard';
import { CompanionChoiceCard } from '../../components/Cards/CompanionChoiceCard';
import { NumberStepper } from '../../components/Inputs/NumberStepper';
import { ToggleRow } from '../../components/Inputs/ToggleRow';
import { useLanguage, assetName } from '../../../i18n';

const DisplayTab: React.FC = () => {
  const dispatch = useDispatch();
  const { fitToWidth, lightningMode } = useSelector((state: RootState) => state.spellReader);
  const [smoothScroll, setSmoothScroll] = useState(true);
  const [doublePageView, setDoublePageView] = useState(false);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const { t } = useLanguage();

  // localStorage persistence for these fields is centralized in a single
  // store.subscribe() (src/store/index.tsx) -- dispatching is enough here.
  const handleFitToWidth = (value: boolean) => {
    dispatch(setFitToWidth(value));
  };

  const handleLightningMode = (value: boolean) => {
    dispatch(setLightningMode(value));
  };

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.reader.layout}</p>
        <ToggleRow label={t.reader.fitToWidth} description={t.reader.fitToWidthDesc} value={fitToWidth} onChange={handleFitToWidth} />
        <ToggleRow soon label={t.reader.doublePageView} description={t.reader.doublePageViewDesc} value={doublePageView} onChange={setDoublePageView} />
      </div>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.reader.reading}</p>
        <ToggleRow label={t.reader.lightningMode} description={t.reader.lightningModeDesc} value={lightningMode} onChange={handleLightningMode} />
        <ToggleRow soon label={t.reader.smoothScrolling} description={t.reader.smoothScrollingDesc} value={smoothScroll} onChange={setSmoothScroll} />
        <ToggleRow soon label={t.reader.showPageNumbers} description={t.reader.showPageNumbersDesc} value={showPageNumbers} onChange={setShowPageNumbers} />
      </div>
    </div>
  );
};

const AppearanceTab: React.FC = () => {
  const [highContrast, setHighContrast] = useState(false);
  const [sepiaMode, setSepiaMode] = useState(false);
  const [invertColors, setInvertColors] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { t } = useLanguage();
  const { unlockedIds } = useSelector((state: RootState) => state.casterInventory);
  const spellId = useSelector((state: RootState) => state.spellReader.spellId);
  // This spell's page background, picked as its cover frame is: the caster's default (set
  // from the inventory), none (the app's own paper), or one of the caster's own.
  const { choice, defaultId, pick } = useSpellCosmetic('pageBackground', spellId);

  const unlockedPageBgs = pageBackgrounds.filter(bg => unlockedIds.includes(bg.id));
  const defaultBg = pageBackgrounds.find(bg => bg.id === defaultId);

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.reader.pageBackground}</p>
        <div className={s.bgGrid}>
          <button
            data-testid="reader-page-bg-pick-default"
            className={`${s.bgSwatch} ${s.bgSwatchDefault} ${choice === undefined ? s.bgSwatchActive : ''}`}
            style={defaultBg ? { background: defaultBg.thumbnail } : undefined}
            onClick={() => pick(undefined)}
            title={defaultBg ? `${t.common.default} · ${assetName(t, defaultBg)}` : t.common.default}
          >
            <span className={s.bgSwatchLabel}>{t.common.default}</span>
          </button>
          <button
            data-testid="reader-page-bg-pick-none"
            className={`${s.bgSwatch} ${s.bgSwatchNone} ${choice === null ? s.bgSwatchActive : ''}`}
            onClick={() => pick(null)}
            title={t.common.none}
            aria-label={t.common.none}
          >
            <FontAwesomeIcon icon={faBan} />
          </button>
          {unlockedPageBgs.map(bg => (
            <button
              key={bg.id}
              data-testid={`reader-page-bg-${bg.id}`}
              className={`${s.bgSwatch} ${choice === bg.id ? s.bgSwatchActive : ''}`}
              style={{ background: bg.thumbnail }}
              onClick={() => pick(bg.id)}
              title={assetName(t, bg)}
            />
          ))}
        </div>
      </div>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.reader.filters}</p>
        <ToggleRow soon label={t.reader.sepiaMode} description={t.reader.sepiaModeDesc} value={sepiaMode} onChange={setSepiaMode} />
        <ToggleRow soon label={t.reader.highContrast} description={t.reader.highContrastDesc} value={highContrast} onChange={setHighContrast} />
        <ToggleRow soon label={t.reader.invertColors} description={t.reader.invertColorsDesc} value={invertColors} onChange={setInvertColors} />
      </div>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.reader.motion}</p>
        <ToggleRow soon label={t.reader.reduceMotion} description={t.reader.reduceMotionDesc} value={reducedMotion} onChange={setReducedMotion} />
      </div>
    </div>
  );
};

const CompanionsTab: React.FC = () => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { unlockedIds } = useSelector((state: RootState) => state.casterInventory);
  const spellId = useSelector((state: RootState) => state.spellReader.spellId);
  // This spell's companion, picked as its cover frame is: the caster's default (set from the
  // inventory), none, or one of the caster's own -- "Use" picks it for this spell alone.
  const { choice, defaultId, pick } = useSpellCosmetic('companion', spellId);
  const defaultCompanion = companions.find(c => c.id === defaultId) ?? null;

  const isUnlocked = (id: string) => unlockedIds.includes(id);

  // Same gating as Havenstore/CasterInventoryLanding (TCORE-109): comingSoon companions
  // never count as unlocked/active regardless of unlockedIds, so the release-date gate in
  // companions.ts is respected identically across every surface.
  const handleCompanionAction = (id: string) => {
    if (!isUnlocked(id)) {
      dispatch(unlockAsset(id));
      pick(id);
      return;
    }
    pick(choice === id ? null : id);
  };

  return (
    <div className={s.container}>
      <div className={s.section}>
        <div className={s.companionGrid}>
          <CompanionChoiceCard
            kind="default"
            companion={defaultCompanion}
            isActive={choice === undefined}
            onUse={() => pick(undefined)}
            activeLabel={t.reader.companionInUse}
            useLabel={t.reader.companionUse}
          />
          <CompanionChoiceCard
            kind="none"
            isActive={choice === null}
            onUse={() => pick(null)}
            activeLabel={t.reader.companionInUse}
            useLabel={t.reader.companionUse}
          />
          {companions.map(companion => {
            const comingSoon = !!companion.comingSoon;
            const unlocked = !comingSoon && isUnlocked(companion.id);
            const isActive = !comingSoon && choice === companion.id;
            return (
              <CompanionCard
                key={companion.id}
                companion={companion}
                unlocked={unlocked}
                isActive={isActive}
                onAction={handleCompanionAction}
                activeLabel={t.reader.companionInUse}
                setActiveLabel={t.reader.companionUse}
                deactivateLabel={t.reader.companionStopUsing}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const FocusTab: React.FC = () => {
  const dispatch = useDispatch();
  const { attentionGuardEnabled, attentionGuardInterval } = useSelector((state: RootState) => state.spellReader);
  const { t } = useLanguage();

  // localStorage persistence for these fields is centralized in a single
  // store.subscribe() (src/store/index.tsx) -- dispatching is enough here.
  const handleToggle = (value: boolean) => {
    dispatch(setAttentionGuardEnabled(value));
  };

  const handleInterval = (value: number) => {
    const clamped = Math.min(30, Math.max(1, value));
    dispatch(setAttentionGuardInterval(clamped));
  };

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.reader.attentionGuardSection}</p>
        <ToggleRow
          label={t.reader.attentionGuard}
          description={t.reader.attentionGuardDesc}
          value={attentionGuardEnabled}
          onChange={handleToggle}
        >
          {attentionGuardEnabled && (
            <>
              <div className={s.rowText}>
                <div className={s.rowLabelRow}>
                  <span className={s.rowLabel}>{t.reader.attentionGuardInterval}</span>
                </div>
                <span className={s.rowDesc}>{t.reader.attentionGuardIntervalDesc}</span>
              </div>
              <NumberStepper
                value={attentionGuardInterval}
                min={1}
                max={30}
                suffix={t.reader.attentionGuardIntervalMin}
                onChange={handleInterval}
              />
            </>
          )}
        </ToggleRow>
      </div>
    </div>
  );
};

export const ReaderSettings: React.FC = () => {
  const dispatch = useDispatch();
  const { showReaderSettings } = useSelector((state: RootState) => state.spellReader);
  const { t } = useLanguage();

  return (
    <TabModal
      show={showReaderSettings}
      onClose={() => dispatch(setShowReaderSettings(false))}
      title={t.reader.readerSettings}
      tabs={[
        { id: 'display',    icon: faDesktop,      label: t.reader.displayTab,         content: <DisplayTab /> },
        { id: 'appearance', icon: faPalette,      label: t.reader.appearanceTab,      content: <AppearanceTab /> },
        { id: 'companions', icon: faCat,          label: t.reader.companions,         content: <CompanionsTab /> },
        { id: 'focus',      icon: faShieldHalved, label: t.reader.attentionGuard,     content: <FocusTab /> },
      ]}
    />
  );
};

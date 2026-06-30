import s from '../../components/DocumentReader/ReaderSettings.module.css';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { faDesktop, faPalette, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { setShowReaderSettings, setFitToWidth, setLightningMode, setAttentionGuardEnabled, setAttentionGuardInterval } from '../../../store/pdfReaderSlice';
import { setActivePageBg } from '../../../store/userLibrarySlice';
import { pageBackgrounds } from '../../../config/assets';
import { TabModal } from '../../components/Modals/TabModal';
import { NumberStepper } from '../../components/Inputs/NumberStepper';
import { ToggleRow } from '../../components/Inputs/ToggleRow';
import { useLanguage } from '../../../i18n';

const DisplayTab: React.FC = () => {
  const dispatch = useDispatch();
  const { fitToWidth, lightningMode } = useSelector((state: RootState) => state.pdfReader);
  const [smoothScroll, setSmoothScroll] = useState(true);
  const [doublePageView, setDoublePageView] = useState(false);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const { t } = useLanguage();

  const handleFitToWidth = (value: boolean) => {
    dispatch(setFitToWidth(value));
    localStorage.setItem('reader:fitToWidth', String(value));
  };

  const handleLightningMode = (value: boolean) => {
    dispatch(setLightningMode(value));
    localStorage.setItem('reader:lightningMode', String(value));
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
  const dispatch = useDispatch();
  const [highContrast, setHighContrast] = useState(false);
  const [sepiaMode, setSepiaMode] = useState(false);
  const [invertColors, setInvertColors] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { t } = useLanguage();
  const { activePageBgId, unlockedIds } = useSelector((state: RootState) => state.userLibrary);

  const unlockedPageBgs = pageBackgrounds.filter(bg => unlockedIds.includes(bg.id));

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.reader.pageBackground}</p>
        <div className={s.bgGrid}>
          {unlockedPageBgs.map(bg => {
            const isActive = activePageBgId === bg.id;
            const thumbStyle = bg.thumbnail.startsWith('var(')
              ? { background: 'var(--paper-bg)' }
              : { background: bg.thumbnail };
            return (
              <button
                key={bg.id}
                className={`${s.bgSwatch} ${isActive ? s.bgSwatchActive : ''}`}
                style={thumbStyle}
                onClick={() => dispatch(setActivePageBg(bg.id))}
                title={bg.name}
              />
            );
          })}
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

const FocusTab: React.FC = () => {
  const dispatch = useDispatch();
  const { attentionGuardEnabled, attentionGuardInterval } = useSelector((state: RootState) => state.pdfReader);
  const { t } = useLanguage();

  const handleToggle = (value: boolean) => {
    dispatch(setAttentionGuardEnabled(value));
    localStorage.setItem('reader:attentionGuard', String(value));
  };

  const handleInterval = (value: number) => {
    const clamped = Math.min(30, Math.max(1, value));
    dispatch(setAttentionGuardInterval(clamped));
    localStorage.setItem('reader:attentionGuardInterval', String(clamped));
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
  const { showReaderSettings } = useSelector((state: RootState) => state.pdfReader);
  const { t } = useLanguage();

  return (
    <TabModal
      show={showReaderSettings}
      onClose={() => dispatch(setShowReaderSettings(false))}
      title={t.reader.readerSettings}
      tabs={[
        { icon: faDesktop,      label: t.reader.displayTab,         content: <DisplayTab /> },
        { icon: faPalette,      label: t.reader.appearanceTab,      content: <AppearanceTab /> },
        { icon: faShieldHalved, label: t.reader.attentionGuard,     content: <FocusTab /> },
      ]}
    />
  );
};

import s from './SpellExportModal.module.css';
import React, { useState } from 'react';
import { CustomModal } from './CustomModal';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { ToggleRow } from '../Inputs/ToggleRow';
import { useLanguage } from '../../../i18n';

interface SpellExportModalProps {
  show: boolean;
  title: string;
  isExporting: boolean;
  onClose: () => void;
  onExport: (options: { includeSource: boolean; includeAudio: boolean }) => void;
}

export const SpellExportModal: React.FC<SpellExportModalProps> = ({ show, title, isExporting, onClose, onExport }) => {
  const { t } = useLanguage();
  const [includeSource, setIncludeSource] = useState(false);
  const [includeAudio, setIncludeAudio] = useState(false);

  if (!show) return null;

  return (
    <CustomModal compact show={show} onClose={onClose} title={t.spell.exportTitle.replace('{title}', title)}>
      <div className={s.container} data-testid="spell-export-modal">
        <div className={s.toggles}>
          <ToggleRow
            label={t.spell.exportIncludeSource}
            description={t.spell.exportIncludeSourceDesc}
            value={includeSource}
            onChange={setIncludeSource}
          />
          <ToggleRow
            label={t.spell.exportIncludeAudio}
            description={t.spell.exportIncludeAudioDesc}
            value={includeAudio}
            onChange={setIncludeAudio}
          />
        </div>
        <div className={s.buttons}>
          <SecondaryButton data-testid="spell-export-cancel-btn" onClick={onClose} disabled={isExporting}>
            {t.common.cancel}
          </SecondaryButton>
          <PrimaryButton
            data-testid="spell-export-confirm-btn"
            onClick={() => onExport({ includeSource, includeAudio })}
            disabled={isExporting}
          >
            {isExporting ? `${t.spell.exportButton}…` : t.spell.exportButton}
          </PrimaryButton>
        </div>
      </div>
    </CustomModal>
  );
};

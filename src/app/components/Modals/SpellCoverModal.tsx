import s from './SpellCoverModal.module.css';
import React from 'react';
import { CustomModal } from './CustomModal';
import { CoverPicker } from '../CoverPicker';
import { CoverFrameOptions } from '../CoverFrameOptions/CoverFrameOptions';
import type { CoverFrame } from '../../../config/assets';
import { useLanguage } from '../../../i18n';

interface SpellCoverModalProps {
  show: boolean;
  onClose: () => void;
  coverUrl: string | null;
  onUploadImage: (file: File) => void;
  // Omitted when there's no original PDF to take the cover from.
  onUseFirstPage?: () => void;
  // The caster's owned frames, and this spell's pick (see Spell.coverFrameId's states).
  frames: CoverFrame[];
  frameId: string | null | undefined;
  onPickFrame: (id: string | null | undefined) => void;
  // A frame pick being saved: shown on that option (see CoverFrameOptions' `pending`).
  pendingFrame?: { id: string | null | undefined } | null;
  // A new cover being saved: shown on the cover preview (see CoverPicker's `busy`).
  savingCover?: boolean;
}

// Everything about how a spell's cover looks, in one place: the cover image itself and the
// frame around it. Each change applies right away.
export const SpellCoverModal: React.FC<SpellCoverModalProps> = ({
  show, onClose, coverUrl, onUploadImage, onUseFirstPage, frames, frameId, onPickFrame, pendingFrame = null, savingCover = false,
}) => {
  const { t } = useLanguage();
  if (!show) return null;

  return (
    <CustomModal compact show={show} onClose={onClose} title={t.spell.editCover}>
      <div data-testid="spell-cover-modal" className={s.content}>
        <section className={s.section}>
          <p className={s.heading}>{t.spell.coverLabel}</p>
          <CoverPicker coverUrl={coverUrl} onUploadImage={onUploadImage} onUseFirstPage={onUseFirstPage} busy={savingCover} />
        </section>
        <section className={s.section}>
          <p className={s.heading}>{t.spell.coverFrameLabel}</p>
          <CoverFrameOptions borders={frames} selectedId={frameId} onPick={onPickFrame} pending={pendingFrame} disabled={savingCover} />
        </section>
      </div>
    </CustomModal>
  );
};

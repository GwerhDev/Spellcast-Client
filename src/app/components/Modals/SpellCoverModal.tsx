import s from './SpellCoverModal.module.css';
import React from 'react';
import { CustomModal } from './CustomModal';
import { CoverPicker } from '../CoverPicker';
import { CoverFrameOptions } from '../CoverFrameOptions/CoverFrameOptions';
import { Spinner } from '../Spinner';
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
  // A change is being saved: a loader over the options, which take no input meanwhile.
  busy?: boolean;
}

// Everything about how a spell's cover looks, in one place: the cover image itself and the
// frame around it. Each change applies right away.
export const SpellCoverModal: React.FC<SpellCoverModalProps> = ({
  show, onClose, coverUrl, onUploadImage, onUseFirstPage, frames, frameId, onPickFrame, busy = false,
}) => {
  const { t } = useLanguage();
  if (!show) return null;

  return (
    <CustomModal compact show={show} onClose={onClose} title={t.spell.editCover}>
      <div data-testid="spell-cover-modal" className={s.content} aria-busy={busy}>
        <section className={s.section}>
          <p className={s.heading}>{t.spell.coverLabel}</p>
          <CoverPicker coverUrl={coverUrl} onUploadImage={onUploadImage} onUseFirstPage={onUseFirstPage} />
        </section>
        <section className={s.section}>
          <p className={s.heading}>{t.spell.coverFrameLabel}</p>
          <CoverFrameOptions borders={frames} selectedId={frameId} onPick={onPickFrame} />
        </section>
        {busy && (
          <div data-testid="spell-cover-modal-busy" className={s.busy}>
            <Spinner isLoading />
          </div>
        )}
      </div>
    </CustomModal>
  );
};

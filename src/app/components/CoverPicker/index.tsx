import s from './index.module.css';
import React, { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faUpload, faFileImport, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { useLanguage } from '../../../i18n';

// TCORE-122: cover editing, shared by SpellCreateForm (creation) and SpellEditForm
// (editing an already-saved spell). Purely presentational -- callers own the actual
// cover state (Blob/data URL) and how it gets persisted (IndexedDB today, see
// db/index.ts's saveSpellToDB/updateSpellFull; a future backend swap only touches
// those call sites, never this component).
interface CoverPickerProps {
  coverUrl: string | null;
  onUploadImage: (file: File) => void;
  // Omitted entirely when there is no PDF to render a page from (e.g. editing a spell
  // that wasn't imported from a PDF, or one whose original PDF was never kept).
  onUseFirstPage?: () => void;
  // A new cover being saved: a spinner over the preview (showing the new image when there's
  // one to show already), and no other change until it's done.
  busy?: boolean;
}

export const CoverPicker: React.FC<CoverPickerProps> = ({ coverUrl, onUploadImage, onUseFirstPage, busy = false }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadImage(file);
    e.target.value = '';
  };

  return (
    <div className={s.container} data-testid="cover-picker">
      <div className={s.preview} aria-busy={busy || undefined}>
        {coverUrl
          ? <img src={coverUrl} alt="" className={s.coverImage} />
          : <FontAwesomeIcon icon={faImage} className={s.coverFallback} />
        }
        {busy && (
          <span data-testid="cover-picker-saving" className={s.saving}>
            <FontAwesomeIcon icon={faSpinner} spin />
          </span>
        )}
      </div>
      <div className={s.actions}>
        <SecondaryButton
          data-testid="cover-picker-upload-btn"
          className={s.actionBtn}
          icon={faUpload}
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          {t.spell.coverUploadImage}
        </SecondaryButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {onUseFirstPage && (
          <SecondaryButton
            data-testid="cover-picker-use-first-page-btn"
            className={s.actionBtn}
            icon={faFileImport}
            onClick={onUseFirstPage}
            disabled={busy}
          >
            {t.spell.coverUseFirstPage}
          </SecondaryButton>
        )}
      </div>
    </div>
  );
};

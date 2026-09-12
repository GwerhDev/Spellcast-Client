import s from './index.module.css';
import React, { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faUpload, faFileImport } from '@fortawesome/free-solid-svg-icons';
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
}

export const CoverPicker: React.FC<CoverPickerProps> = ({ coverUrl, onUploadImage, onUseFirstPage }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadImage(file);
    e.target.value = '';
  };

  return (
    <div className={s.container} data-testid="cover-picker">
      <div className={s.preview}>
        {coverUrl
          ? <img src={coverUrl} alt="" className={s.coverImage} />
          : <FontAwesomeIcon icon={faImage} className={s.coverFallback} />
        }
      </div>
      <div className={s.actions}>
        <button
          type="button"
          data-testid="cover-picker-upload-btn"
          className={s.actionBtn}
          title={t.spell.coverUploadImage}
          onClick={() => fileInputRef.current?.click()}
        >
          <FontAwesomeIcon icon={faUpload} />
          {t.spell.coverUploadImage}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {onUseFirstPage && (
          <button
            type="button"
            data-testid="cover-picker-use-first-page-btn"
            className={s.actionBtn}
            title={t.spell.coverUseFirstPage}
            onClick={onUseFirstPage}
          >
            <FontAwesomeIcon icon={faFileImport} />
            {t.spell.coverUseFirstPage}
          </button>
        )}
      </div>
    </div>
  );
};

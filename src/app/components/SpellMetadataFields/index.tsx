import s from './index.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';

// Presentational (Layer 4): social/feed metadata fields (TCORE-97), shared by
// SpellCreateForm (creation) and SpellEditForm (editing, TCORE-103). The optional
// onRefreshFromPdf/refreshDisabled/isRefreshing props render an extra "re-extract from
// the stored original PDF" action -- only SpellEditForm passes them, since a spell being
// created has no original PDF stored yet.
interface SpellMetadataFieldsProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  author: string;
  onAuthorChange: (value: string) => void;
  tagsInput: string;
  onTagsInputChange: (value: string) => void;
  language: string;
  onLanguageChange: (value: string) => void;
  onRefreshFromPdf?: () => void;
  refreshDisabled?: boolean;
  isRefreshing?: boolean;
}

export const SpellMetadataFields = ({
  expanded,
  onToggleExpanded,
  description,
  onDescriptionChange,
  author,
  onAuthorChange,
  tagsInput,
  onTagsInputChange,
  language,
  onLanguageChange,
  onRefreshFromPdf,
  refreshDisabled,
  isRefreshing,
}: SpellMetadataFieldsProps) => {
  const { t } = useLanguage();

  return (
    <>
      <button
        type="button"
        data-testid="spell-metadata-toggle"
        className={s.metadataToggle}
        onClick={onToggleExpanded}
      >
        <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
        {t.spell.metadataSectionTitle}
      </button>
      {expanded && (
        <div data-testid="spell-metadata-section" className={s.metadataSection}>
          {onRefreshFromPdf && (
            <div className={s.metadataHeader}>
              <button
                type="button"
                data-testid="spell-metadata-refresh-btn"
                className={s.refreshBtn}
                disabled={refreshDisabled || isRefreshing}
                title={refreshDisabled ? t.spell.refreshMetadataNoPdf : t.spell.refreshMetadataFromPdf}
                onClick={onRefreshFromPdf}
              >
                <FontAwesomeIcon icon={faArrowsRotate} />
                {t.spell.refreshMetadataFromPdf}
              </button>
            </div>
          )}
          <div className={`${s.metadataField} ${s.metadataFieldWide}`}>
            <label htmlFor="spell-metadata-description">{t.spell.descriptionLabel}</label>
            <textarea
              id="spell-metadata-description"
              data-testid="spell-metadata-description"
              rows={2}
              placeholder={t.spell.descriptionPlaceholder}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>
          <div className={s.metadataField}>
            <label htmlFor="spell-metadata-author">{t.spell.authorLabel}</label>
            <input
              id="spell-metadata-author"
              data-testid="spell-metadata-author"
              type="text"
              placeholder={t.spell.authorPlaceholder}
              value={author}
              onChange={(e) => onAuthorChange(e.target.value)}
            />
          </div>
          <div className={s.metadataField}>
            <label htmlFor="spell-metadata-language">{t.spell.languageLabel}</label>
            <input
              id="spell-metadata-language"
              data-testid="spell-metadata-language"
              type="text"
              placeholder={t.spell.languagePlaceholder}
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
            />
          </div>
          <div className={`${s.metadataField} ${s.metadataFieldWide}`}>
            <label htmlFor="spell-metadata-tags">{t.spell.tagsLabel}</label>
            <input
              id="spell-metadata-tags"
              data-testid="spell-metadata-tags"
              type="text"
              placeholder={t.spell.tagsPlaceholder}
              value={tagsInput}
              onChange={(e) => onTagsInputChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  );
};
